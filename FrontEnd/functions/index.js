/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment');

// Initialize Firebase Admin
admin.initializeApp();

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

// Daily Inventory Snapshot Function
exports.createDailyInventorySnapshot = functions.pubsub
  .schedule('0 0 * * *')  // Run at midnight daily
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    try {
      const snapshot = {};
      let totalValue = 0;
      let totalQuantity = 0;

      // Get all products from all categories
      const categoriesSnapshot = await admin.firestore()
        .collection('Products')
        .get();

      for (const categoryDoc of categoriesSnapshot.docs) {
        const productsSnapshot = await admin.firestore()
          .collection('Products')
          .doc(categoryDoc.id)
          .collection('Items')
          .get();

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
      
      await admin.firestore()
        .collection('inventory_snapshots')
        .doc(dateId)
        .set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          products: snapshot,
          totalValue,
          totalQuantity,
          snapshot_type: 'daily'
        });

      console.log(`Created daily inventory snapshot for ${dateId}`);
      return null;
    } catch (error) {
      console.error('Error creating inventory snapshot:', error);
      throw error;
    }
  });

// Daily Sales Aggregation Function
exports.createDailySalesAggregation = functions.pubsub
  .schedule('5 0 * * *')  // Run at 12:05 AM daily (after inventory snapshot)
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    try {
      const yesterday = moment().subtract(1, 'days').startOf('day');
      const startOfDay = yesterday.toDate();
      const endOfDay = yesterday.endOf('day').toDate();

      // Get all transactions for yesterday
      const transactionsSnapshot = await admin.firestore()
        .collection('Transactions')
        .where('timestamp', '>=', startOfDay)
        .where('timestamp', '<=', endOfDay)
        .get();

      const salesData = {
        total_sales: 0,
        total_quantity: 0,
        products_sold: {}
      };

      // Process each transaction
      transactionsSnapshot.forEach(doc => {
        const transaction = doc.data();
        
        transaction.items.forEach(item => {
          // Update product totals
          if (!salesData.products_sold[item.baseProductId]) {
            salesData.products_sold[item.baseProductId] = {
              name: item.name,
              category: item.category,
              quantity_sold: 0,
              total_value: 0,
              variants: []
            };
          }

          // Update variant data
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

          // Update totals
          salesData.products_sold[item.baseProductId].quantity_sold += item.quantity;
          salesData.products_sold[item.baseProductId].total_value += item.total;
          salesData.total_sales += item.total;
          salesData.total_quantity += item.quantity;
        });
      });

      // Save the aggregated data
      const dateId = formatDate(yesterday);
      await admin.firestore()
        .collection('sales_aggregates')
        .doc(dateId)
        .set({
          ...salesData,
          date: dateId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

      console.log(`Created daily sales aggregation for ${dateId}`);
      return null;
    } catch (error) {
      console.error('Error creating sales aggregation:', error);
      throw error;
    }
  });
