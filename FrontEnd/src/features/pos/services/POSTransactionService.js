/**
 * POSTransactionService.js
 * 
 * Service layer for POS transaction processing.
 * Handles checkout, stock deduction, and transaction recording.
 * 
 * Architecture:
 * - Atomic transactions using Firestore runTransaction
 * - Stock deduction from Variants collection
 * - Transaction recording in Transactions collection
 * - Sales history tracking in Variants
 * 
 * Flow:
 * 1. Pre-validate cart availability
 * 2. Execute Firestore transaction
 * 3. Deduct stock from each variant
 * 4. Update sales history in variants
 * 5. Create transaction document
 * 6. Return receipt data
 */

import {
  getFirestore,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  addDoc
} from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const db = getFirestore(app);

// Collection names
const VARIANTS_COLLECTION = 'Variants';
const TRANSACTIONS_COLLECTION = 'Transactions';
const STOCK_MOVEMENTS_COLLECTION = 'stock_movements';
const NOTIFICATIONS_COLLECTION = 'Notifications';

/**
 * Process POS sale transaction
 * 
 * @param {Array} cartItems - Cart items with variant IDs and quantities
 * @param {object} transactionDetails - Customer, payment, discount info
 * @param {object} currentUser - Current user object
 * @returns {Promise<object>} Transaction result with receipt data
 */
export const processPOSSale = async (cartItems, transactionDetails, currentUser) => {
  try {
    console.log('💰 Processing POS sale...');
    console.log('📦 Cart items:', cartItems.length);
    
    // 1. Validation
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty. Please add items before checkout.');
    }
    
    if (!transactionDetails) {
      throw new Error('Transaction details are required.');
    }
    
    if (!currentUser) {
      throw new Error('User authentication required.');
    }
    
    // Validate required transaction fields
    const requiredFields = ['customerId', 'customerName', 'subTotal', 'tax', 'total', 'amountPaid', 'paymentMethod'];
    for (const field of requiredFields) {
      if (transactionDetails[field] === undefined || transactionDetails[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate amount paid
    if (transactionDetails.amountPaid < transactionDetails.total) {
      throw new Error(
        `Amount paid (₱${transactionDetails.amountPaid.toFixed(2)}) is less than total (₱${transactionDetails.total.toFixed(2)})`
      );
    }
    
    console.log('✅ Validation passed');
    
    // 2. Pre-fetch all variants to check availability
    console.log('🔍 Pre-fetching variants for availability check...');
    
    const variantChecks = await Promise.all(
      cartItems.map(async (item) => {
        if (!item.variantId) {
          throw new Error(`Cart item missing variantId: ${JSON.stringify(item)}`);
        }
        
        const variantRef = doc(db, VARIANTS_COLLECTION, item.variantId);
        const variantSnap = await getDoc(variantRef);
        
        if (!variantSnap.exists()) {
          throw new Error(
            `Variant not found: ${item.variantName || item.variantId}\n` +
            `This item may have been removed from inventory.`
          );
        }
        
        const variantData = variantSnap.data();
        const available = variantData.quantity || 0;
        
        if (available < item.qty) {
          throw new Error(
            `Insufficient stock for "${variantData.productName} - ${variantData.variantName}"\n` +
            `Available: ${available} units\n` +
            `Requested: ${item.qty} units\n` +
            `Shortage: ${item.qty - available} units`
          );
        }
        
        return {
          variantRef,
          variantData,
          cartItem: item
        };
      })
    );
    
    console.log('✅ All variants available');
    
    // 3. Generate transaction ID and receipt number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    
    const transactionId = `TXN-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
    const receiptNumber = `RCP-${year}${month}${day}-${random}`;
    
    console.log(`📝 Transaction ID: ${transactionId}`);
    console.log(`🧾 Receipt Number: ${receiptNumber}`);
    
    // 4. Execute Firestore transaction (atomic operation)
    console.log('🔄 Executing Firestore transaction...');
    
    const result = await runTransaction(db, async (transaction) => {
      // Track stock movements for logging
      const stockMovements = [];
      
      // Update each variant's stock
      for (const check of variantChecks) {
        const { variantRef, variantData, cartItem } = check;
        
        // Calculate new quantity
        const currentQty = variantData.quantity || 0;
        const newQuantity = currentQty - cartItem.qty;
        
        if (newQuantity < 0) {
          throw new Error(
            `Concurrent stock update detected for ${variantData.productName} - ${variantData.variantName}. ` +
            `Please refresh and try again.`
          );
        }
        
        // Update sales history
        const salesHistory = variantData.salesHistory || [];
        salesHistory.push({
          transactionId,
          quantity: cartItem.qty,
          unitPrice: cartItem.unitPrice || variantData.unitPrice,
          timestamp: now.toISOString(),
          performedBy: currentUser.uid
        });
        
        // Keep only last 90 days of sales history
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const filteredHistory = salesHistory.filter(
          sale => new Date(sale.timestamp) >= ninetyDaysAgo
        );
        
        // Update variant document
        transaction.update(variantRef, {
          quantity: newQuantity,
          salesHistory: filteredHistory,
          lastSale: {
            transactionId,
            quantity: cartItem.qty,
            timestamp: serverTimestamp(),
            performedBy: currentUser.uid
          },
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Updated ${variantData.variantName}: ${currentQty} → ${newQuantity}`);
        
        // Track stock movement
        stockMovements.push({
          variantId: variantRef.id,
          productName: variantData.productName,
          variantName: variantData.variantName,
          previousQty: currentQty,
          newQty: newQuantity,
          deducted: cartItem.qty
        });
      }
      
      // 5. Create transaction document
      const transactionRef = doc(collection(db, TRANSACTIONS_COLLECTION));
      
      const transactionData = {
        transactionId,
        receiptNumber,
        
        // Customer info
        customerId: transactionDetails.customerId,
        customerName: transactionDetails.customerName,
        customerPhone: transactionDetails.customerPhone || '',
        customerAddress: transactionDetails.customerAddress || '',
        customerEmail: transactionDetails.customerEmail || '',
        
        // Items sold
        items: cartItems.map(item => ({
          variantId: item.variantId,
          parentProductId: item.parentProductId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.qty,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.qty,
          category: item.category || '',
          
          // Location info (for reference)
          storageLocation: item.storageLocation || '',
          shelfName: item.shelfName || '',
          rowName: item.rowName || '',
          columnIndex: item.columnIndex || ''
        })),
        
        // Financial details
        subTotal: transactionDetails.subTotal,
        tax: transactionDetails.tax,
        discount: transactionDetails.discount || 0,
        discountType: transactionDetails.discountType || 'none',
        total: transactionDetails.total,
        amountPaid: transactionDetails.amountPaid,
        change: transactionDetails.change || (transactionDetails.amountPaid - transactionDetails.total),
        
        // Payment info
        paymentMethod: transactionDetails.paymentMethod,
        paymentReference: transactionDetails.paymentReference || '',
        
        // Cashier info
        cashierId: currentUser.uid,
        cashierName: currentUser.displayName || currentUser.email || 'Unknown',
        
        // Transaction metadata
        status: 'completed',
        saleDate: now.toISOString().split('T')[0], // YYYY-MM-DD
        saleTime: `${hours}:${minutes}:${seconds}`,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      transaction.set(transactionRef, transactionData);
      
      console.log('✅ Transaction document created');
      
      // 6. Create stock movement logs (async, doesn't need to be in transaction)
      // These will be created after the transaction completes
      
      return {
        success: true,
        transactionId,
        receiptNumber,
        stockMovements,
        transactionData: {
          ...transactionData,
          timestamp: now, // Use client timestamp for receipt display
          id: transactionRef.id
        }
      };
    });
    
    console.log('✅ Firestore transaction completed successfully');
    
    // 7. Create stock movement logs (fire and forget)
    try {
      await createStockMovementLogs(result.stockMovements, transactionId, currentUser);
    } catch (error) {
      console.warn('⚠️ Failed to create stock movement logs:', error);
      // Don't fail the transaction if logging fails
    }
    
    // 8. Create notification for inventory managers (fire and forget)
    try {
      await createSaleNotification(result.transactionData, currentUser);
    } catch (error) {
      console.warn('⚠️ Failed to create sale notification:', error);
      // Don't fail the transaction if notification fails
    }
    
    console.log('💰 POS sale completed successfully!');
    
    return result;
    
  } catch (error) {
    console.error('❌ Error processing POS sale:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('Insufficient stock')) {
      throw error; // Already formatted
    } else if (error.message.includes('not found')) {
      throw error; // Already formatted
    } else if (error.message.includes('amount paid')) {
      throw error; // Already formatted
    } else {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }
};

/**
 * Create stock movement logs for audit trail
 * 
 * @param {Array} stockMovements - Stock movements to log
 * @param {string} transactionId - Transaction ID
 * @param {object} currentUser - Current user
 * @returns {Promise<void>}
 */
const createStockMovementLogs = async (stockMovements, transactionId, currentUser) => {
  try {
    const promises = stockMovements.map(movement => 
      addDoc(collection(db, STOCK_MOVEMENTS_COLLECTION), {
        movementType: 'OUT',
        referenceType: 'sale',
        referenceId: transactionId,
        variantId: movement.variantId,
        productName: movement.productName,
        variantName: movement.variantName,
        quantity: movement.deducted,
        previousQuantity: movement.previousQty,
        newQuantity: movement.newQty,
        performedBy: currentUser.uid,
        performedByName: currentUser.displayName || currentUser.email || 'Unknown',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      })
    );
    
    await Promise.all(promises);
    console.log(`✅ Created ${stockMovements.length} stock movement logs`);
  } catch (error) {
    console.error('❌ Error creating stock movement logs:', error);
    throw error;
  }
};

/**
 * Create notification for inventory managers
 * 
 * @param {object} transactionData - Transaction data
 * @param {object} currentUser - Current user
 * @returns {Promise<void>}
 */
const createSaleNotification = async (transactionData, currentUser) => {
  try {
    const totalItems = transactionData.items.reduce((sum, item) => sum + item.quantity, 0);
    
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      type: 'sale_completed',
      priority: 'normal',
      title: '💰 Sale Completed',
      message: `Sale ${transactionData.receiptNumber} - ${totalItems} items sold for ₱${transactionData.total.toLocaleString()}`,
      details: {
        transactionId: transactionData.transactionId,
        receiptNumber: transactionData.receiptNumber,
        customerName: transactionData.customerName,
        totalAmount: transactionData.total,
        totalItems,
        paymentMethod: transactionData.paymentMethod,
        items: transactionData.items,
        saleDate: transactionData.saleDate,
        saleTime: transactionData.saleTime
      },
      targetRoles: ['InventoryManager', 'Admin'],
      triggeredBy: currentUser.uid,
      triggeredByName: currentUser.displayName || currentUser.email || 'Unknown',
      relatedTransactionId: transactionData.transactionId,
      isRead: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Sale notification created');
  } catch (error) {
    console.error('❌ Error creating sale notification:', error);
    throw error;
  }
};

/**
 * Void/cancel a transaction (reverse stock deduction)
 * 
 * @param {string} transactionId - Transaction ID to void
 * @param {string} reason - Reason for voiding
 * @param {object} currentUser - Current user
 * @returns {Promise<object>} Void result
 */
export const voidTransaction = async (transactionId, reason, currentUser) => {
  try {
    console.log(`🚫 Voiding transaction: ${transactionId}`);
    
    if (!transactionId || !reason || !currentUser) {
      throw new Error('Transaction ID, reason, and user are required to void a transaction');
    }
    
    // Get transaction details
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    const transactionQuery = query(
      transactionsRef,
      where('transactionId', '==', transactionId)
    );
    const transactionSnap = await getDocs(transactionQuery);
    
    if (transactionSnap.empty) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    const transactionDoc = transactionSnap.docs[0];
    const transactionData = transactionDoc.data();
    
    if (transactionData.status === 'voided') {
      throw new Error('Transaction is already voided');
    }
    
    // Execute void operation
    await runTransaction(db, async (transaction) => {
      // Restore stock for each item
      for (const item of transactionData.items) {
        const variantRef = doc(db, VARIANTS_COLLECTION, item.variantId);
        const variantSnap = await transaction.get(variantRef);
        
        if (!variantSnap.exists()) {
          console.warn(`⚠️ Variant ${item.variantId} not found, skipping stock restoration`);
          continue;
        }
        
        const variantData = variantSnap.data();
        const currentQty = variantData.quantity || 0;
        const restoredQty = currentQty + item.quantity;
        
        transaction.update(variantRef, {
          quantity: restoredQty,
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Restored ${item.variantName}: ${currentQty} → ${restoredQty}`);
      }
      
      // Mark transaction as voided
      transaction.update(transactionDoc.ref, {
        status: 'voided',
        voidedAt: serverTimestamp(),
        voidedBy: currentUser.uid,
        voidedByName: currentUser.displayName || currentUser.email || 'Unknown',
        voidReason: reason,
        updatedAt: serverTimestamp()
      });
    });
    
    console.log('✅ Transaction voided successfully');
    
    return {
      success: true,
      transactionId,
      message: 'Transaction voided and stock restored'
    };
    
  } catch (error) {
    console.error('❌ Error voiding transaction:', error);
    throw new Error(`Failed to void transaction: ${error.message}`);
  }
};

// Export all functions
export default {
  processPOSSale,
  voidTransaction
};
