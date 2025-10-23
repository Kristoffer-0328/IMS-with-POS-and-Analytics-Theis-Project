import { getFirestore, collection, doc, setDoc, query, where, getDocs, getDoc, serverTimestamp } from 'firebase/firestore';
import moment from 'moment';
import app from '../../FirebaseConfig';

const db = getFirestore(app);

// Helper function to format date
const formatDate = (date) => {
  return moment(date).format('YYYYMMDD');
};

// Helper function to calculate product value
const calculateProductValue = (product) => {
  if (!product.variants || product.variants.length === 0) {
    return (product.quantity || 0) * (product.unitPrice || 0);
  }
  return product.variants.reduce((total, variant) => 
    total + ((variant.quantity || 0) * (variant.unitPrice || 0)), 0);
};

export const AnalyticsService = {
  // Create inventory snapshot
  async createInventorySnapshot() {
    try {
      const snapshot = {};
      let totalValue = 0;
      let totalQuantity = 0;

      // Get all categories
      const categoriesSnapshot = await getDocs(collection(db, 'Products'));

      for (const categoryDoc of categoriesSnapshot.docs) {
        const productsSnapshot = await getDocs(
          collection(db, 'Products', categoryDoc.id, 'Items')
        );

        // Process each product
        productsSnapshot.forEach(doc => {
          const product = doc.data();
          const productValue = calculateProductValue(product);
          
          snapshot[doc.id] = {
            name: product.name,
            category: categoryDoc.id,
            quantity: product.quantity || 0,
            value: productValue,
            variants: (product.variants || []).map(variant => ({
              variantId: variant.id,
              quantity: variant.quantity || 0,
              value: (variant.quantity || 0) * (variant.unitPrice || 0)
            }))
          };

          totalValue += productValue;
          totalQuantity += (product.quantity || 0);
        });
      }

      // Create the snapshot document
      const dateId = formatDate(new Date());
      await setDoc(doc(db, 'inventory_snapshots', dateId), {
        timestamp: serverTimestamp(),
        date: dateId,
        products: snapshot,
        totalValue,
        totalQuantity,
        snapshot_type: 'daily'
      });

      return { dateId, totalValue, totalQuantity };
    } catch (error) {
      console.error('Error creating inventory snapshot:', error);
      throw error;
    }
  },

  // Create sales aggregation
  async createSalesAggregation(date = new Date()) {
    try {
      const startOfDay = moment(date).startOf('day').toDate();
      const endOfDay = moment(date).endOf('day').toDate();

      // Get transactions for the specified day
      const transactionsRef = collection(db, 'Transactions');
      const q = query(
        transactionsRef,
        where('timestamp', '>=', startOfDay),
        where('timestamp', '<=', endOfDay)
      );
      const transactionsSnapshot = await getDocs(q);

      const salesData = {
        total_sales: 0,
        total_quantity: 0,
        products_sold: {}
      };

      // Process each transaction
      transactionsSnapshot.forEach(doc => {
        const transaction = doc.data();
        
        if (!transaction.items) return; // Skip if no items

        transaction.items.forEach(item => {
          if (!salesData.products_sold[item.baseProductId]) {
            salesData.products_sold[item.baseProductId] = {
              name: item.name,
              category: item.category,
              quantity_sold: 0,
              total_value: 0,
              variants: []
            };
          }

          const variantIndex = salesData.products_sold[item.baseProductId].variants
            .findIndex(v => v.variantId === item.variantId);

          if (variantIndex === -1) {
            salesData.products_sold[item.baseProductId].variants.push({
              variantId: item.variantId,
              quantity_sold: item.quantity,
              total_value: item.total
            });
          } else {
            const variant = salesData.products_sold[item.baseProductId].variants[variantIndex];
            variant.quantity_sold += item.quantity;
            variant.total_value += item.total;
          }

          salesData.products_sold[item.baseProductId].quantity_sold += item.quantity;
          salesData.products_sold[item.baseProductId].total_value += item.total;
          salesData.total_sales += item.total;
          salesData.total_quantity += item.quantity;
        });
      });

      // Save the aggregated data
      const dateId = formatDate(date);
      await setDoc(doc(db, 'sales_aggregates', dateId), {
        ...salesData,
        date: dateId,
        timestamp: serverTimestamp()
      });

      return { dateId, ...salesData };
    } catch (error) {
      console.error('Error creating sales aggregation:', error);
      throw error;
    }
  },

  // Check and create daily records if needed
  async checkAndCreateDailyRecords() {
    const today = new Date();
    const dateId = formatDate(today);

    try {
      // Check if we already have records for today
      const snapshotDocRef = doc(db, 'inventory_snapshots', dateId);
      const aggregateDocRef = doc(db, 'sales_aggregates', dateId);
      
      const [snapshotDoc, aggregateDoc] = await Promise.all([
        getDoc(snapshotDocRef),
        getDoc(aggregateDocRef)
      ]);

      const results = {};

      // Create records if they don't exist
      if (!snapshotDoc.exists()) {
        results.inventory = await this.createInventorySnapshot();
      }
      
      if (!aggregateDoc.exists()) {
        results.sales = await this.createSalesAggregation(today);
      }

      return results;
    } catch (error) {
      console.error('Error checking daily records:', error);
      throw error;
    }
  },

  // Test function to create sample inventory snapshots
  async createTestInventorySnapshots() {
    try {
      const testData = [
        {
          date: '20240101',  // January
          totalValue: 50000,
          totalQuantity: 100,
          products: {
            'test-product-1': {
              name: 'Test Product 1',
              category: 'Test Category',
              quantity: 50,
              value: 25000
            },
            'test-product-2': {
              name: 'Test Product 2',
              category: 'Test Category',
              quantity: 50,
              value: 25000
            }
          }
        },
        {
          date: '20240201',  // February
          totalValue: 60000,
          totalQuantity: 120,
          products: {
            'test-product-1': {
              name: 'Test Product 1',
              category: 'Test Category',
              quantity: 60,
              value: 30000
            },
            'test-product-2': {
              name: 'Test Product 2',
              category: 'Test Category',
              quantity: 60,
              value: 30000
            }
          }
        },
        {
          date: '20240301',  // March
          totalValue: 75000,
          totalQuantity: 150,
          products: {
            'test-product-1': {
              name: 'Test Product 1',
              category: 'Test Category',
              quantity: 75,
              value: 37500
            },
            'test-product-2': {
              name: 'Test Product 2',
              category: 'Test Category',
              quantity: 75,
              value: 37500
            }
          }
        }
      ];

      // Save each snapshot
      for (const snapshot of testData) {
        await setDoc(doc(db, 'inventory_snapshots', snapshot.date), {
          ...snapshot,
          date: snapshot.date,  // Add date field for querying
          timestamp: serverTimestamp(),
          snapshot_type: 'daily'
        });

      }

      return testData;
    } catch (error) {
      console.error('Error creating test inventory snapshots:', error);
      throw error;
    }
  },

  // Update inventory snapshot after receiving products
  async updateInventorySnapshotAfterReceiving(receivedItems) {
    try {

      // Get today's date in YYYYMMDD format
      const dateId = formatDate(new Date());
      const snapshotRef = doc(db, 'inventory_snapshots', dateId);
      
      // Check if we already have a snapshot for today
      const snapshotDoc = await getDoc(snapshotRef);
      
      if (snapshotDoc.exists()) {
        // Update existing snapshot
        const existingData = snapshotDoc.data();
        const updatedProducts = { ...existingData.products };
        let newTotalValue = existingData.totalValue || 0;
        let newTotalQuantity = existingData.totalQuantity || 0;

        // Update each received item
        for (const item of receivedItems) {
          const { productId, quantity, unitPrice, variantId } = item;
          
          if (!updatedProducts[productId]) {
            // If product doesn't exist in snapshot, create it
            updatedProducts[productId] = {
              name: item.productName,
              category: item.category,
              quantity: 0,
              value: 0,
              variants: []
            };
          }

          if (variantId) {
            // Handle variant
            const variantIndex = updatedProducts[productId].variants.findIndex(
              v => v.variantId === variantId
            );

            if (variantIndex === -1) {
              // Add new variant
              updatedProducts[productId].variants.push({
                variantId,
                quantity: quantity,
                value: quantity * unitPrice
              });
            } else {
              // Update existing variant
              const variant = updatedProducts[productId].variants[variantIndex];
              const oldValue = variant.value;
              variant.quantity += quantity;
              variant.value = variant.quantity * unitPrice;
              newTotalValue = newTotalValue - oldValue + variant.value;
            }
          } else {
            // Handle base product
            const oldValue = updatedProducts[productId].value;
            updatedProducts[productId].quantity += quantity;
            updatedProducts[productId].value = updatedProducts[productId].quantity * unitPrice;
            newTotalValue = newTotalValue - oldValue + updatedProducts[productId].value;
          }

          newTotalQuantity += quantity;
        }

        // Update the snapshot
        await setDoc(snapshotRef, {
          ...existingData,
          products: updatedProducts,
          totalValue: newTotalValue,
          totalQuantity: newTotalQuantity,
          lastUpdated: serverTimestamp()
        }, { merge: true });

      } else {
        // If no snapshot exists for today, create a new one
        await this.createInventorySnapshot();
      }

      return dateId;
    } catch (error) {
      console.error('Error updating inventory snapshot after receiving:', error);
      throw error;
    }
  },

  // Record sale transaction for analytics
  async recordSale(saleData) {
    try {

      // Create a simplified analytics record
      const analyticsRecord = {
        transactionId: saleData.transactionId,
        timestamp: serverTimestamp(),
        totalAmount: saleData.totalAmount || 0,
        itemCount: saleData.itemCount || 0,
        paymentMethod: saleData.paymentMethod || 'Cash',
        items: saleData.items || [],
        salesPerformance: saleData.salesPerformance || {
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          month: new Date().getMonth()
        },
        recordedAt: new Date().toISOString()
      };

      // Save to analytics collection
      const analyticsRef = doc(db, 'salesAnalytics', saleData.transactionId);
      await setDoc(analyticsRef, analyticsRecord);

      return true;
    } catch (error) {
      console.error('Error recording sale analytics:', error);
      // Don't throw error to prevent transaction failure
      return false;
    }
  }
}; 
