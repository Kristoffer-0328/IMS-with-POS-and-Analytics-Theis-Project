import { openDB } from 'idb';

const DB_NAME = 'pos_offline_db';
const DB_VERSION = 1;

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('products')) {
        const store = db.createObjectStore('products', { keyPath: 'id' });
        store.createIndex('name', 'name');
        store.createIndex('category', 'category');
      }
      if (!db.objectStoreNames.contains('pendingTransactions')) {
        const store = db.createObjectStore('pendingTransactions', { 
          keyPath: 'id',
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp');
      }
      // Add stock levels store
      if (!db.objectStoreNames.contains('stockLevels')) {
        const store = db.createObjectStore('stockLevels', { keyPath: 'productId' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
  });
}

// Product Operations
export async function saveProducts(products) {
  const db = await initDB();
  const tx = db.transaction('products', 'readwrite');
  const store = tx.objectStore('products');

  // Clear existing products
  await store.clear();

  // Add new products
  for (const product of products) {
    await store.put(product);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProducts() {
  const db = await initDB();
  const tx = db.transaction('products', 'readonly');
  const store = tx.objectStore('products');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getProductsByCategory(category) {
  const db = await openDB(DB_NAME);
  const tx = db.transaction('products', 'readonly');
  const index = tx.store.index('category');
  return index.getAll(category);
}

// Transaction Operations
export async function savePendingTransaction(transaction) {
  const db = await initDB();
  const tx = db.transaction('pendingTransactions', 'readwrite');
  const store = tx.objectStore('pendingTransactions');

  const transactionWithTimestamp = {
    ...transaction,
    timestamp: new Date().toISOString(),
    synced: false
  };

  return new Promise((resolve, reject) => {
    const request = store.add(transactionWithTimestamp);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingTransactions() {
  const db = await initDB();
  const tx = db.transaction('pendingTransactions', 'readonly');
  const store = tx.objectStore('pendingTransactions');

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingTransaction(id) {
  const db = await initDB();
  const tx = db.transaction('pendingTransactions', 'readwrite');
  const store = tx.objectStore('pendingTransactions');

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Customer Operations
export async function saveCustomer(customer) {
  const db = await openDB(DB_NAME);
  await db.put('customers', customer);
}

export async function getCustomers() {
  const db = await openDB(DB_NAME);
  return db.getAll('customers');
}

// Sync Status
export async function checkSyncStatus() {
  const pendingTransactions = await getPendingTransactions();
  return {
    hasPendingTransactions: pendingTransactions.length > 0,
    pendingCount: pendingTransactions.length
  };
}

// Data Sync
export async function syncData() {
  const pendingTransactions = await getPendingTransactions();
  
  for (const transaction of pendingTransactions) {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });

      if (!response.ok) {
        throw new Error(`Failed to sync transaction ${transaction.id}`);
      }

      await removePendingTransaction(transaction.id);
    } catch (error) {
      console.error('Sync failed for transaction:', transaction.id, error);
      throw error; // Re-throw to be handled by retry logic
    }
  }
}

// Stock Level Operations
export async function updateStockLevel(productId, quantity) {
  const db = await initDB();
  const tx = db.transaction('stockLevels', 'readwrite');
  const store = tx.objectStore('stockLevels');

  await store.put({
    productId,
    quantity,
    updatedAt: new Date().toISOString()
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStockLevel(productId) {
  const db = await initDB();
  const tx = db.transaction('stockLevels', 'readonly');
  const store = tx.objectStore('stockLevels');

  return new Promise((resolve, reject) => {
    const request = store.get(productId);
    request.onsuccess = () => resolve(request.result?.quantity ?? 0);
    request.onerror = () => reject(request.error);
  });
}

export async function validateStock(items) {
  const db = await initDB();
  const tx = db.transaction(['products', 'stockLevels'], 'readonly');
  const productsStore = tx.objectStore('products');
  const stockStore = tx.objectStore('stockLevels');

  const validationResults = await Promise.all(
    items.map(async (item) => {
      const product = await productsStore.get(item.id);
      const stockLevel = await stockStore.get(item.id);
      
      if (!product) {
        return {
          valid: false,
          productId: item.id,
          error: 'Product not found'
        };
      }

      const currentStock = stockLevel?.quantity ?? 0;
      if (currentStock < item.quantity) {
        return {
          valid: false,
          productId: item.id,
          productName: product.name,
          requested: item.quantity,
          available: currentStock,
          error: 'Insufficient stock'
        };
      }

      return {
        valid: true,
        productId: item.id,
        productName: product.name
      };
    })
  );

  const invalidItems = validationResults.filter(result => !result.valid);
  if (invalidItems.length > 0) {
    throw {
      type: 'StockValidationError',
      message: 'Some items have insufficient stock',
      items: invalidItems
    };
  }

  return true;
} 
