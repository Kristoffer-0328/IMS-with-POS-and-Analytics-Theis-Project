import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { FiBox, FiTrendingDown, FiTrendingUp, FiDollarSign, FiPackage, FiAlertTriangle, FiShoppingCart, FiInfo } from 'react-icons/fi';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const db = getFirestore(app);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [restockRequests, setRestockRequests] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [showChartInfo, setShowChartInfo] = useState(false);
  
  const [stats, setStats] = useState({
    lowStockCount: 0,
    totalSales: 0,
    salesChange: 0,
    restockRequests: 0,
    restockChange: 0,
    totalProducts: 0
  });

  // Fetch all dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProducts(),
        fetchStockMovements(),
        fetchTransactions(),
        fetchRestockRequests()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all products from inventory
  const fetchProducts = async () => {
    try {
      const allProducts = [];
      const storageRef = collection(db, 'Products');
      const storageSnapshot = await getDocs(storageRef);

      // UPDATED for nested structure: Products/{unit}/products/{productId}
      for (const storageDoc of storageSnapshot.docs) {
        const storageLocation = storageDoc.id;
        
        // NEW: Fetch products directly from the products subcollection
        const productsRef = collection(db, 'Products', storageLocation, 'products');
        const productsSnapshot = await getDocs(productsRef);

        productsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          allProducts.push({
            id: doc.id,
            ...data,
            storageLocation: data.storageLocation || storageLocation,
            shelfName: data.shelfName || 'Unknown',
            rowName: data.rowName || 'Unknown',
            columnIndex: data.columnIndex || 0
          });
        });
      }

      setProducts(allProducts);

    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch recent stock movements
  const fetchStockMovements = async () => {
    try {
      const movementsRef = collection(db, 'stock_movements');
      const q = query(movementsRef, orderBy('movementDate', 'desc'), limit(10));
      const snapshot = await getDocs(q);

      const movements = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          productName: data.productName || 'Unknown Product',
          type: data.movementType || 'OUT',
          from: data.movementType === 'IN' ? (data.supplier || 'Supplier') : (data.storageLocation || 'Storage'),
          to: data.movementType === 'OUT' ? (data.customer || 'Customer') : (data.storageLocation || 'Storage'),
          quantity: `${data.quantity || 0} ${data.unit || 'pcs'}`,
          date: data.movementDate?.toDate ? data.movementDate.toDate().toLocaleDateString() : new Date().toLocaleDateString(),
          status: data.status || 'completed',
          reason: data.reason || 'Unknown'
        };
      });

      setStockMovements(movements);

    } catch (error) {
      console.error('Error fetching stock movements:', error);
    }
  };

  // Fetch recent POS transactions for sales data
  const fetchTransactions = async () => {
    try {
      const transactionsRef = collection(db, 'posTransactions');
      const q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(30));
      const snapshot = await getDocs(q);

      const txns = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          total: data.totals?.total || 0,
          date: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          items: data.items || []
        };
      });

      setTransactions(txns);
      
      // Generate sales chart data (last 8 days)
      generateSalesChartData(txns);

    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Fetch restock requests
  const fetchRestockRequests = async () => {
    try {
      const requestsRef = collection(db, 'RestockRequests');
      const q = query(requestsRef, where('Status', '==', 'Pending'));
      const snapshot = await getDocs(q);

      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRestockRequests(requests);

    } catch (error) {
      console.error('Error fetching restock requests:', error);
    }
  };

  // Generate sales chart data - Compare this week vs last week
  const generateSalesChartData = (txns) => {
    const last8Days = [];
    const today = new Date();
    
    // Create array of last 8 days (current week)
    for (let i = 7; i >= 0; i--) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() - i);
      
      // Calculate the same day last week (7 days before)
      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - 7);
      
      last8Days.push({
        currentDate: currentDate,
        previousDate: previousDate,
        name: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        currentWeekSales: 0,
        lastWeekSales: 0
      });
    }

    // Aggregate sales by day
    txns.forEach(txn => {
      const txnDateStr = txn.date.toDateString();
      
      // Check if transaction matches any day in current week
      const currentWeekDay = last8Days.find(d => d.currentDate.toDateString() === txnDateStr);
      if (currentWeekDay) {
        currentWeekDay.currentWeekSales += txn.total;
      }
      
      // Check if transaction matches any day in previous week
      const previousWeekDay = last8Days.find(d => d.previousDate.toDateString() === txnDateStr);
      if (previousWeekDay) {
        previousWeekDay.lastWeekSales += txn.total;
      }
    });

    // Convert to thousands for better chart display
    const chartData = last8Days.map(day => ({
      name: `${day.name} (${day.dayName})`,
      thisWeek: parseFloat((day.currentWeekSales / 1000).toFixed(2)),
      lastWeek: parseFloat((day.lastWeekSales / 1000).toFixed(2)),
      // Store actual values for tooltip
      thisWeekActual: day.currentWeekSales,
      lastWeekActual: day.lastWeekSales
    }));

    setSalesData(chartData);
  };

  // Calculate stats whenever data changes
  useEffect(() => {
    if (products.length > 0 || transactions.length > 0 || restockRequests.length > 0) {
      calculateStats();
    }
  }, [products, transactions, restockRequests]);

  const calculateStats = () => {
    // Low stock items (quantity <= 60)
    const lowStockItems = products.filter(p => (p.quantity || 0) <= 60);
    
    // Today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTxns = transactions.filter(t => {
      const txnDate = new Date(t.date);
      txnDate.setHours(0, 0, 0, 0);
      return txnDate.getTime() === today.getTime();
    });
    const todaySales = todayTxns.reduce((sum, t) => sum + t.total, 0);

    // Yesterday's sales for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTxns = transactions.filter(t => {
      const txnDate = new Date(t.date);
      txnDate.setHours(0, 0, 0, 0);
      return txnDate.getTime() === yesterday.getTime();
    });
    const yesterdaySales = yesterdayTxns.reduce((sum, t) => sum + t.total, 0);
    
    const salesChange = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales * 100) 
      : 0;

    // Restock requests change (mock data - would need historical tracking)
    const restockChange = 2;

    setStats({
      lowStockCount: lowStockItems.length,
      totalSales: todaySales,
      salesChange: salesChange,
      restockRequests: restockRequests.length,
      restockChange: restockChange,
      totalProducts: products.length
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600 text-sm mt-1">Overview of inventory, sales, and stock movements</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Products */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Products</p>
              <h3 className="text-2xl font-bold mb-2">{stats.totalProducts}</h3>
              <div className="flex items-center text-blue-500 text-sm">
                <FiPackage className="mr-1" />
                <span>In Inventory</span>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <FiPackage className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Low Stock Items</p>
              <h3 className="text-2xl font-bold mb-2">{stats.lowStockCount} Items</h3>
              <div className="flex items-center text-red-500 text-sm">
                <FiAlertTriangle className="mr-1" />
                <span>Critical Stock</span>
              </div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <FiBox className="text-amber-600 text-xl" />
            </div>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Today's Sales</p>
              <h3 className="text-2xl font-bold mb-2">₱{stats.totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</h3>
              <div className={`flex items-center text-sm ${stats.salesChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.salesChange >= 0 ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                <span>{Math.abs(stats.salesChange).toFixed(1)}% {stats.salesChange >= 0 ? 'Up' : 'Down'} from yesterday</span>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <FiDollarSign className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        {/* Restocking Requests */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Pending Restocks</p>
              <h3 className="text-2xl font-bold mb-2">{stats.restockRequests} Requests</h3>
              <div className="flex items-center text-green-500 text-sm">
                <FiTrendingUp className="mr-1" />
                <span>+{stats.restockChange} From Yesterday</span>
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <FiShoppingCart className="text-red-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Overview Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Sales Overview</h2>
            <p className="text-sm text-gray-600 mt-1">Week-over-week comparison (in thousands)</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-800 rounded"></div>
              <span className="text-gray-600">This Week</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span className="text-gray-600">Last Week</span>
            </div>
            {/* Info Icon with Tooltip */}
            <div className="relative">
              <button
                onMouseEnter={() => setShowChartInfo(true)}
                onMouseLeave={() => setShowChartInfo(false)}
                className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-gray-400 text-gray-400 hover:border-gray-600 hover:text-gray-600 transition-colors"
              >
                <FiInfo size={12} />
              </button>
              
              {/* Tooltip */}
              {showChartInfo && (
                <div className="absolute right-0 top-8 w-80 bg-white text-gray-800 text-xs rounded-lg shadow-2xl border border-gray-200 p-4 z-10">
                  <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                  <h4 className="font-semibold mb-3 text-sm text-gray-900">How This Chart Works</h4>
                  <div className="space-y-2.5">
                    <p className="leading-relaxed">
                      <span className="font-medium text-gray-900">Dark bars (This Week):</span>
                      <span className="text-gray-600"> Sales for each day in the current week (Oct 2-9, 2025)</span>
                    </p>
                    <p className="leading-relaxed">
                      <span className="font-medium text-gray-900">Light bars (Last Week):</span>
                      <span className="text-gray-600"> Sales for the same day last week (Sept 25-Oct 2, 2025)</span>
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-600 leading-relaxed">
                        <strong className="text-gray-900">Example:</strong> For Oct 7 (Tue), the dark bar shows Monday sales this week, and the light bar shows Monday sales last week.
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-gray-600 leading-relaxed">
                        <strong className="text-gray-900">Insight:</strong> Compare same days to see if your sales are improving week-over-week!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={salesData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                label={{ value: 'Sales (₱K)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
              />
              <Tooltip 
                formatter={(value, name, props) => {
                  // Use the Bar component's name prop instead of dataKey
                  const displayName = props.dataKey === 'thisWeek' ? 'This Week' : 'Last Week';
                  return [`₱${(value * 1000).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, displayName];
                }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="lastWeek" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Last Week" />
              <Bar dataKey="thisWeek" fill="#1f2937" radius={[4, 4, 0, 0]} name="This Week" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stock Movement Log */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Recent Stock Movements</h2>
            <p className="text-sm text-gray-600 mt-1">Latest inventory changes and transactions</p>
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent">
            <option>All Types</option>
            <option>IN - Receiving</option>
            <option>OUT - Sales</option>
            <option>OUT - Release</option>
          </select>
        </div>
        
        {stockMovements.length === 0 ? (
          <div className="text-center py-12">
            <FiBox className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No stock movements found</p>
            <p className="text-gray-400 text-sm mt-1">Recent inventory changes will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                  <th className="pb-4 font-medium">Product Name</th>
                  <th className="pb-4 font-medium">Type</th>
                  <th className="pb-4 font-medium">From</th>
                  <th className="pb-4 font-medium">To</th>
                  <th className="pb-4 font-medium">Quantity</th>
                  <th className="pb-4 font-medium">Reason</th>
                  <th className="pb-4 font-medium">Date</th>
                  <th className="pb-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {stockMovements.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-medium text-gray-900">{item.productName}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.type === 'IN' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {item.type === 'IN' ? '↓ IN' : '↑ OUT'}
                      </span>
                    </td>
                    <td className="py-4 text-gray-600">{item.from}</td>
                    <td className="py-4 text-gray-600">{item.to}</td>
                    <td className="py-4 text-gray-900 font-medium">{item.quantity}</td>
                    <td className="py-4 text-gray-600">{item.reason}</td>
                    <td className="py-4 text-gray-600">{item.date}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
