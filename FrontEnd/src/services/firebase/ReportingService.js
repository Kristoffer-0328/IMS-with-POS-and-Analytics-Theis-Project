import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import moment from 'moment';
import app from '../../FirebaseConfig';

const db = getFirestore(app);

export const ReportingService = {
  async getInventoryTurnover(startDate, endDate, granularity = 'monthly') {
    try {
      console.log('ReportingService.getInventoryTurnover called with:', { startDate, endDate, granularity });

      // Ensure dates are in YYYYMMDD format
      const start = moment(startDate).format('YYYYMMDD');
      const end = moment(endDate).format('YYYYMMDD');
      
      console.log('Converted date range:', { start, end });

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

      console.log('Fetched snapshots:', snapshotsSnapshot.docs.length);
      console.log('Fetched sales:', salesSnapshot.docs.length);

      

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

      console.log('Sample snapshot:', snapshots[0]);
      console.log('Sample sale:', sales[0]);
      console.log('Total snapshots processed:', snapshots.length);
      console.log('Total sales processed:', sales.length);

      // Calculate metrics based on granularity (weekly or monthly)
      const periodData = [];
      let totalSales = 0;
      let totalInventoryValue = 0;
      let inventoryCount = 0;

      // Product-level data aggregation
      const productMap = new Map();

      // Determine period grouping
      const startMoment = moment(startDate);
      const endMoment = moment(endDate);
      
      let periods = [];
      
      if (granularity === 'weekly') {
        // For weekly, start the first period at the filter's start date, not the start of the week
        let periodStartMoment = startMoment.clone();
        while (periodStartMoment.isSameOrBefore(endMoment, 'day')) {
          // End of this period is either 6 days after start or the filter's end date, whichever is earlier
          let periodEndMoment = periodStartMoment.clone().add(6, 'days');
          if (periodEndMoment.isAfter(endMoment, 'day')) {
            periodEndMoment = endMoment.clone();
          }
          const periodStart = periodStartMoment.format('YYYYMMDD');
          const periodEnd = periodEndMoment.format('YYYYMMDD');
          const periodLabel = `Week of ${periodStartMoment.format('MMM DD')}`;
          periods.push({ periodStart, periodEnd, periodLabel });
          // Next period starts the day after this one ends
          periodStartMoment = periodEndMoment.clone().add(1, 'day');
        }
      } else {
        // For monthly, use the original logic
        const monthsDiff = endMoment.diff(startMoment, 'months') + 1;
        
        for (let i = 0; i < monthsDiff; i++) {
          const currentMonth = startMoment.clone().add(i, 'months');
          const periodStart = currentMonth.startOf('month').format('YYYYMMDD');
          const periodEnd = currentMonth.endOf('month').format('YYYYMMDD');
          const periodLabel = currentMonth.format('MMMM YYYY');
          
          periods.push({ periodStart, periodEnd, periodLabel });
        }
      }

      for (const period of periods) {
        const { periodStart, periodEnd, periodLabel } = period;

        // Get snapshots for this period
        const periodSnapshots = snapshots.filter(s => 
          s.date >= periodStart && s.date <= periodEnd
        );

        // Get sales for this period
        const periodSales = sales.filter(s => 
          s.date >= periodStart && s.date <= periodEnd
        );

        const avgInventory = periodSnapshots.reduce((sum, s) => sum + (s.totalValue || 0), 0) / 
          (periodSnapshots.length || 1);

        const periodTotalSales = periodSales.reduce((sum, s) => sum + (s.total_sales || 0), 0);

        // Aggregate product-level data
        periodSales.forEach(sale => {
          console.log('Processing sale:', sale.date, 'products_sold:', !!sale.products_sold);
          if (sale.products_sold && typeof sale.products_sold === 'object') {
            // Handle the products_sold structure from AnalyticsService
            Object.values(sale.products_sold).forEach(product => {
              console.log('Processing product:', product.name, 'sales:', product.total_value);
              const key = product.name || 'Unknown Product';
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
              prodData.totalSales += product.total_value || 0;
              prodData.totalQuantity += product.quantity_sold || 0;
            });
          } else if (sale.products && Array.isArray(sale.products)) {
            // Handle direct products array structure
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
        periodSnapshots.forEach(snapshot => {
          if (snapshot.products) {
            // Handle both array and object structures
            if (Array.isArray(snapshot.products)) {
              snapshot.products.forEach(product => {
                const key = product.productId || product.name;
                if (productMap.has(key)) {
                  productMap.get(key).inventoryValues.push(product.value || 0);
                }
              });
            } else if (typeof snapshot.products === 'object') {
              // Handle object structure from AnalyticsService
              Object.values(snapshot.products).forEach(product => {
                const key = product.name || 'Unknown Product';
                if (productMap.has(key)) {
                  productMap.get(key).inventoryValues.push(product.value || 0);
                }
              });
            }
          }
        });

        periodData.push({
          period: periodLabel,
          sales: periodTotalSales,
          avgInventory: avgInventory,
          turnoverRate: avgInventory === 0 ? 0 : (periodTotalSales / avgInventory)
        });

        totalSales += periodTotalSales;
        totalInventoryValue += avgInventory;
        if (periodSnapshots.length > 0) inventoryCount++;
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

      console.log('Product map size:', productMap.size);
      console.log('Product map entries:', Array.from(productMap.entries()));

      const result = {
        averageTurnoverRate,
        totalSales,
        averageInventory,
        chartData: periodData.map((data, idx) => ({
          // Use the real period start date for the x-axis
          name: periods[idx].periodStart, // e.g. '20251001'
          label: periods[idx].periodLabel, // e.g. 'Week of Oct 01'
          value: data.turnoverRate
        })),
        monthlyData: periodData.map(data => ({
          period: data.period,
          sales: data.sales.toLocaleString(),
          avgInventory: data.avgInventory.toLocaleString(),
          turnoverRate: data.turnoverRate.toFixed(2)
        })),
        productData: productData,
        granularity: granularity
      };

      console.log('Final result:', {
        averageTurnoverRate,
        totalSales,
        averageInventory,
        productDataCount: productData.length,
        chartDataCount: result.chartData.length,
        granularity: result.granularity
      });

      return result;
    } catch (error) {
      console.error('Error calculating inventory turnover:', error);
      throw error;
    }
  }
}; 
