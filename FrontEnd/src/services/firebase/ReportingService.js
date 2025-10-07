import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import moment from 'moment';
import app from '../../FirebaseConfig';

const db = getFirestore(app);

export const ReportingService = {
  async getInventoryTurnover(year, month) {
    try {

      // Calculate date range
      const startDate = month 
        ? moment(`${year}-${month}-01`).format('YYYYMMDD')
        : moment(`${year}-01-01`).format('YYYYMMDD');
      
      const endDate = month
        ? moment(`${year}-${month}-01`).endOf('month').format('YYYYMMDD')
        : moment(`${year}-12-31`).format('YYYYMMDD');

      // Get inventory snapshots for the period
      const snapshotsRef = collection(db, 'inventory_snapshots');
      const snapshotsQuery = query(
        snapshotsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date')
      );

      // Get sales aggregates for the period
      const salesRef = collection(db, 'sales_aggregates');
      const salesQuery = query(
        salesRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
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

      // Calculate monthly metrics
      const monthlyData = [];
      let totalSales = 0;
      let totalInventoryValue = 0;
      let inventoryCount = 0;

      // Group by month if year view
      if (!month) {
        for (let m = 0; m < 12; m++) {
          const monthStr = (m + 1).toString().padStart(2, '0');
          const monthStart = moment(`${year}-${monthStr}-01`).format('YYYYMMDD');
          const monthEnd = moment(`${year}-${monthStr}-01`).endOf('month').format('YYYYMMDD');

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

          monthlyData.push({
            month: moment(`${year}-${monthStr}-01`).format('MMMM'),
            sales: monthlySales,
            avgInventory: avgInventory,
            turnoverRate: avgInventory === 0 ? 0 : (monthlySales / avgInventory)
          });

          totalSales += monthlySales;
          totalInventoryValue += avgInventory;
          if (monthSnapshots.length > 0) inventoryCount++;
        }
      } else {
        // Daily data for specific month
        const daysInMonth = moment(`${year}-${month}-01`).daysInMonth();
        
        for (let d = 1; d <= daysInMonth; d++) {
          const date = moment(`${year}-${month}-${d}`).format('YYYYMMDD');
          const snapshot = snapshots.find(s => s.date === date);
          const sale = sales.find(s => s.date === date);

          if (snapshot) {
            totalInventoryValue += snapshot.totalValue || 0;
            inventoryCount++;
          }

          if (sale) {
            totalSales += sale.total_sales || 0;
          }
        }

        // For month view, we'll just have one entry
        monthlyData.push({
          month: moment(`${year}-${month}-01`).format('MMMM'),
          sales: totalSales,
          avgInventory: totalInventoryValue / (inventoryCount || 1),
          turnoverRate: totalInventoryValue === 0 ? 0 : (totalSales / totalInventoryValue)
        });
      }

      const averageInventory = totalInventoryValue / (inventoryCount || 1);
      const averageTurnoverRate = averageInventory === 0 ? 0 : (totalSales / averageInventory);

      const result = {
        averageTurnoverRate,
        totalSales,
        averageInventory,
        chartData: monthlyData.map(data => ({
          name: data.month.substring(0, 3),
          value: data.turnoverRate
        })),
        monthlyData: monthlyData.map(data => ({
          month: data.month,
          sales: data.sales.toLocaleString(),
          avgInventory: data.avgInventory.toLocaleString(),
          turnoverRate: data.turnoverRate.toFixed(2)
        }))
      };

      return result;
    } catch (error) {
      console.error('Error calculating inventory turnover:', error);
      throw error;
    }
  }
}; 