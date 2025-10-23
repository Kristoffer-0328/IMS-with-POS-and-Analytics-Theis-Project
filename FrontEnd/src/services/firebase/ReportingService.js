import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import moment from 'moment';
import app from '../../FirebaseConfig';

const db = getFirestore(app);

export const ReportingService = {
  async getInventoryTurnover(startDate, endDate) {
    try {

      // Ensure dates are in YYYYMMDD format
      const start = moment(startDate).format('YYYYMMDD');
      const end = moment(endDate).format('YYYYMMDD');

      // Get inventory snapshots for the period
      const snapshotsRef = collection(db, 'inventory_snapshots');
      const snapshotsQuery = query(
        snapshotsRef,
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date')
      );

      // Get sales aggregates for the period
      const salesRef = collection(db, 'sales_aggregates');
      const salesQuery = query(
        salesRef,
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date')
      );

      // Fetch data
      const [snapshotsSnapshot, salesSnapshot] = await Promise.all([
        getDocs(snapshotsQuery),
        getDocs(salesQuery)
      ]);

      

      // Process snapshots
      const snapshots = snapshotsSnapshot.docs.map(doc => ({
        date: doc.id,
        ...doc.data()
      }));

      // Process sales
      const sales = salesSnapshot.docs.map(doc => ({
        date: doc.id,
        ...doc.data()
      }));

      // Calculate monthly metrics within the date range
      const monthlyData = [];
      let totalSales = 0;
      let totalInventoryValue = 0;
      let inventoryCount = 0;

      // Product-level data aggregation
      const productMap = new Map();

      // Group by month
      const startMoment = moment(startDate);
      const endMoment = moment(endDate);
      const monthsDiff = endMoment.diff(startMoment, 'months') + 1;

      for (let i = 0; i < monthsDiff; i++) {
        const currentMonth = startMoment.clone().add(i, 'months');
        const monthStart = currentMonth.startOf('month').format('YYYYMMDD');
        const monthEnd = currentMonth.endOf('month').format('YYYYMMDD');

        // Get snapshots for this month
        const monthSnapshots = snapshots.filter(s => 
          s.date >= monthStart && s.date <= monthEnd
        );

        // Get sales for this month
        const monthSales = sales.filter(s => 
          s.date >= monthStart && s.date <= monthEnd
        );

        const avgInventory = monthSnapshots.reduce((sum, s) => sum + (s.totalValue || 0), 0) / 
          (monthSnapshots.length || 1);

        const monthlySales = monthSales.reduce((sum, s) => sum + (s.total_sales || 0), 0);

        // Aggregate product-level data
        monthSales.forEach(sale => {
          if (sale.products && Array.isArray(sale.products)) {
            sale.products.forEach(product => {
              const key = product.productId || product.name;
              if (!productMap.has(key)) {
                productMap.set(key, {
                  productName: product.name || 'Unknown Product',
                  category: product.category || 'Uncategorized',
                  totalSales: 0,
                  totalQuantity: 0,
                  inventoryValues: []
                });
              }
              const prodData = productMap.get(key);
              prodData.totalSales += product.sales || 0;
              prodData.totalQuantity += product.quantity || 0;
            });
          }
        });

        // Aggregate inventory per product
        monthSnapshots.forEach(snapshot => {
          if (snapshot.products && Array.isArray(snapshot.products)) {
            snapshot.products.forEach(product => {
              const key = product.productId || product.name;
              if (productMap.has(key)) {
                productMap.get(key).inventoryValues.push(product.value || 0);
              }
            });
          }
        });

        monthlyData.push({
          month: currentMonth.format('MMMM YYYY'),
          sales: monthlySales,
          avgInventory: avgInventory,
          turnoverRate: avgInventory === 0 ? 0 : (monthlySales / avgInventory)
        });

        totalSales += monthlySales;
        totalInventoryValue += avgInventory;
        if (monthSnapshots.length > 0) inventoryCount++;
      }

      const averageInventory = totalInventoryValue / (inventoryCount || 1);
      const averageTurnoverRate = averageInventory === 0 ? 0 : (totalSales / averageInventory);

      // Calculate product-level turnover
      const productData = Array.from(productMap.entries()).map(([key, data]) => {
        const avgInventory = data.inventoryValues.length > 0 
          ? data.inventoryValues.reduce((sum, val) => sum + val, 0) / data.inventoryValues.length 
          : 0;
        const turnoverRate = avgInventory === 0 ? 0 : (data.totalSales / avgInventory);
        
        return {
          productName: data.productName,
          category: data.category,
          sales: data.totalSales,
          quantitySold: data.totalQuantity,
          averageInventory: avgInventory,
          turnoverRate: turnoverRate
        };
      });

      const result = {
        averageTurnoverRate,
        totalSales,
        averageInventory,
        chartData: monthlyData.map(data => ({
          name: moment(data.month, 'MMMM YYYY').format('MMM YYYY'),
          value: data.turnoverRate
        })),
        monthlyData: monthlyData.map(data => ({
          month: data.month,
          sales: data.sales.toLocaleString(),
          avgInventory: data.avgInventory.toLocaleString(),
          turnoverRate: data.turnoverRate.toFixed(2)
        })),
        productData: productData
      };

      return result;
    } catch (error) {
      console.error('Error calculating inventory turnover:', error);
      throw error;
    }
  }
}; 
