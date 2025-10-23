import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import app from './FirebaseConfig';

const db = getFirestore(app);

/**
 * Creates a daily inventory snapshot by calculating total inventory value
 * This should be run daily (e.g., via a scheduled function or cron job)
 */
export const createDailyInventorySnapshot = async (targetDate = new Date()) => {
  try {
    const date = new Date(targetDate);
    const dateString = date.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format

    let totalInventoryValue = 0;
    let totalProducts = 0;

    // Query all storage units
    const productsRef = collection(db, "Products");
    const storageUnitsSnapshot = await getDocs(productsRef);

    // Iterate through each storage unit
    for (const storageUnitDoc of storageUnitsSnapshot.docs) {
      const unitId = storageUnitDoc.id;

      // Skip non-storage unit documents
      if (!unitId.startsWith('Unit ')) {
        continue;
      }

      // Get products in this storage unit
      const productsSubcollectionRef = collection(db, "Products", unitId, "products");
      const productsSnapshot = await getDocs(productsSubcollectionRef);

      // Calculate total value for this unit
      productsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const unitPrice = typeof data.unitPrice === 'number' ? data.unitPrice : parseFloat(data.unitPrice) || 0;
        const quantity = typeof data.quantity === 'number' ? data.quantity : parseInt(data.quantity) || 0;

        totalInventoryValue += unitPrice * quantity;
        totalProducts += quantity;
      });
    }

    // Store the snapshot
    const snapshotRef = doc(db, 'inventory_snapshots', dateString);
    await setDoc(snapshotRef, {
      date: dateString,
      totalValue: totalInventoryValue,
      totalProducts: totalProducts,
      createdAt: date.toISOString(),
      unit: 'PHP' // Currency unit
    });

    console.log(`Inventory snapshot created for ${dateString}: ₱${totalInventoryValue.toLocaleString()}`);
    return { success: true, totalValue: totalInventoryValue };

  } catch (error) {
    console.error('Error creating inventory snapshot:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Creates sales aggregate for a specific date
 * This aggregates POS transactions into daily totals
 */
export const createDailySalesAggregate = async (targetDate) => {
  try {
    const dateString = targetDate.toISOString().split('T')[0].replace(/-/g, '');

    // Query POS transactions for the target date
    const posTransactionsRef = collection(db, 'posTransactions');
    const transactionsSnapshot = await getDocs(posTransactionsRef);

    let totalSales = 0;
    let transactionCount = 0;
    const paymentMethods = {};

    transactionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);

      // Check if transaction is within target date by comparing date strings
      const transactionDate = createdAt.toISOString().split('T')[0].replace(/-/g, '');
      if (transactionDate === dateString) {
        const amount = data.amountPaid || data.totals?.total || 0;
        totalSales += amount;
        transactionCount++;

        const paymentMethod = data.paymentMethod || 'Unknown';
        paymentMethods[paymentMethod] = (paymentMethods[paymentMethod] || 0) + 1;
      }
    });

    // Only create aggregate if there were transactions
    if (transactionCount > 0) {
      // Store the aggregate
      const aggregateRef = doc(db, 'sales_aggregates', dateString);
      await setDoc(aggregateRef, {
        date: dateString,
        total_sales: totalSales,
        transaction_count: transactionCount,
        payment_methods: paymentMethods,
        createdAt: new Date().toISOString()
      });

      console.log(`Sales aggregate created for ${dateString}: ₱${totalSales.toLocaleString()} (${transactionCount} transactions)`);
      return { success: true, totalSales, transactionCount };
    } else {
      console.log(`No transactions found for ${dateString}, skipping aggregate creation`);
      return { success: true, totalSales: 0, transactionCount: 0, skipped: true };
    }

  } catch (error) {
    console.error('Error creating sales aggregate:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Backfills historical data for a date range
 * Useful for populating missing historical snapshots
 */
export const backfillHistoricalData = async (startDate, endDate) => {
  try {
    const results = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Create inventory snapshot (always try, as inventory exists every day)
      const inventoryResult = await createDailyInventorySnapshot(currentDate);
      
      // Create sales aggregate (only if there were transactions)
      const salesResult = await createDailySalesAggregate(currentDate);

      results.push({
        date: currentDate.toISOString().split('T')[0],
        inventory: inventoryResult,
        sales: salesResult
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { success: true, results };

  } catch (error) {
    console.error('Error backfilling historical data:', error);
    return { success: false, error: error.message };
  }
};