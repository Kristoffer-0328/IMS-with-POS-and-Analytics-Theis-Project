import React, { useState, useEffect } from 'react';
import { FiActivity, FiBarChart, FiFileText, FiDollarSign, FiShoppingBag } from 'react-icons/fi';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';
import InventoryTurnoverReport from '../../inventory/components/Reports/InventoryTurnOverReport';
import StockMovementReport from '../../inventory/components/Reports/StockMovementReport';
import ShrinkageReport from '../../inventory/components/Reports/ShrinkageReport';
import TestDataGenerator from '../../inventory/components/Reports/TestDataGenerator';
import POAnalytics from '../../inventory/components/PurchaseOrder/POAnalytics';
import Audit_trail from './Audit_trail';
import System_log from './System_log';
import ReceiptModal from '../../pos/components/Modals/ReceiptModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { getFirestore, collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const db = getFirestore(app);

// Collection names - Match naming convention with other services
const TRANSACTIONS_COLLECTION = 'Transactions'; // POS transactions (PascalCase)
const LEGACY_POS_TRANSACTIONS = 'posTransactions'; // Old collection name (camelCase) for backward compatibility

// Helper function to format date and time
const getFormattedDateTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
        return {
            dateString: 'N/A',
            timeString: 'N/A'
        };
    }
    
    const date = timestamp.toDate();
    
    const dateString = date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).replace(/,/g, '').toUpperCase();

    const timeString = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    return {
        dateString,
        timeString,
        time: {
            hours: date.getHours().toString().padStart(2, '0'),
            minutes: date.getMinutes().toString().padStart(2, '0'),
            seconds: date.getSeconds().toString().padStart(2, '0')
        }
    };
};

// Transaction Summary Component
const TransactionSummary = ({ transactions }) => {
  const calculateSummary = () => {
    const today = new Date().toLocaleDateString();
    const todayTransactions = transactions.filter(t => {
      if (t.createdAt && t.createdAt.toDate) {
        return t.createdAt.toDate().toLocaleDateString() === today;
      }
      return false;
    });

    const todaySales = todayTransactions.reduce((sum, t) => sum + (t.amountPaid || t.totals?.total || 0), 0);
    const avgTransaction = transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + (t.amountPaid || t.totals?.total || 0), 0) / transactions.length 
      : 0;

    const paymentMethods = transactions.reduce((acc, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + 1;
      return acc;
    }, {});

    const mostPopular = Object.entries(paymentMethods)
      .sort(([,a], [,b]) => b - a)[0] || [];

    return {
      todaySales,
      totalTransactions: transactions.length,
      avgTransaction,
      popularPayment: mostPopular[0] ? `${mostPopular[0]} (${Math.round(mostPopular[1]/transactions.length*100)}%)` : 'N/A'
    };
  };

  const summary = calculateSummary();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { 
          title: "Today's Sales", 
          value: `₱${summary.todaySales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-100"
        },
        { 
          title: "Total Transactions", 
          value: summary.totalTransactions, 
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-100"
        },
        { 
          title: "Average Transaction", 
          value: `₱${summary.avgTransaction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-100"
        },
        { 
          title: "Most Popular Payment", 
          value: summary.popularPayment, 
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-100"
        }
      ].map((stat, index) => (
        <div 
          key={index} 
          className={`${stat.bgColor} rounded-xl shadow-sm p-6 border ${stat.borderColor} hover:shadow-md transition-shadow duration-200`}
        >
          <p className="text-gray-600 text-sm font-medium mb-2">{stat.title}</p>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

// POS Transactions Tab Component
const POSTransactionsTab = () => {
  const [transactions, setTransactions] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [showChartInfo, setShowChartInfo] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        // Try new collection first (Transactions - PascalCase)
        let transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
        let q = query(transactionsRef, orderBy('createdAt', 'desc'));

        if (currentFilter !== 'all') {
          q = query(q, where('paymentMethod', '==', currentFilter));
        }

        let querySnapshot = await getDocs(q);

        const fetchedTransactions = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.transactionId || doc.id,
            transactionId: data.transactionId,
            customerName: data.customerInfo?.name || 'Unknown',
            total: data.amountPaid || data.totals?.total || 0,
            paymentMethod: data.paymentMethod || 'Unknown',
            status: data.status || 'completed',
            createdAt: data.createdAt,
            items: data.items || [],
            customerInfo: data.customerInfo || {},
            totals: data.totals || {},
            saleDate: data.saleDate,
            saleTime: data.saleTime,
            cashier: data.cashier,
      
            ...data
          };
        });

        setTransactions(fetchedTransactions);
        generateSalesChartData(fetchedTransactions);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentFilter]);

  // Generate sales chart data
  const generateSalesChartData = (txns) => {
    const last8Days = [];
    const today = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() - i);
      
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

    txns.forEach(txn => {
      const txnDate = new Date(txn.createdAt?.toDate ? txn.createdAt.toDate() : txn.createdAt);
      txnDate.setHours(0, 0, 0, 0);
      const txnTime = txnDate.getTime();
      
      const currentWeekDay = last8Days.find(d => {
        const dayDate = new Date(d.currentDate);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate.getTime() === txnTime;
      });
      if (currentWeekDay) {
        currentWeekDay.currentWeekSales += txn.total;
      }
      
      const previousWeekDay = last8Days.find(d => {
        const dayDate = new Date(d.previousDate);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate.getTime() === txnTime;
      });
      if (previousWeekDay) {
        previousWeekDay.lastWeekSales += txn.total;
      }
    });

    const chartData = last8Days.map(day => ({
      name: `${day.name} (${day.dayName})`,
      thisWeek: parseFloat((day.currentWeekSales / 1000).toFixed(2)),
      lastWeek: parseFloat((day.lastWeekSales / 1000).toFixed(2)),
      thisWeekActual: day.currentWeekSales,
      lastWeekActual: day.lastWeekSales
    }));
    setSalesData(chartData);
  };

  const filteredTransactions = transactions.filter(transaction =>
    (transaction.transactionId || transaction.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewReceipt = (transaction) => {
    // Transform transaction data to match ReceiptModal's expected format
    const formattedTransaction = {
      transactionId: transaction.transactionId || transaction.id,
      customerName: transaction.customerInfo?.name || transaction.customerName || 'Walk-in Customer',
      customerDetails: transaction.customerInfo || {},
      cashierName: transaction.cashier?.name || transaction.cashierName || 'Unknown',
      items: transaction.items || [],
      subTotal: transaction.totals?.subtotal || transaction.subTotal || 0,
      tax: transaction.totals?.tax || transaction.tax || 0,
      total: transaction.total || transaction.totals?.total || 0,
      amountPaid: transaction.amountPaid || 0,
      change: transaction.change || 0,
      paymentMethod: transaction.paymentMethod || 'Cash',
      createdAt: transaction.createdAt,
      releaseStatus: transaction.releaseStatus || 'released'
    };
    setSelectedTransaction(formattedTransaction);
    setShowReceiptModal(true);
  };

  return (
    <div>
      <TransactionSummary transactions={transactions} />

      {/* Sales Overview Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
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
            <div className="relative">
              <button
                onMouseEnter={() => setShowChartInfo(true)}
                onMouseLeave={() => setShowChartInfo(false)}
                className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-gray-400 text-gray-400 hover:border-gray-600 hover:text-gray-600 transition-colors"
              >
                <FiFileText size={12} />
              </button>
              
              {showChartInfo && (
                <div className="absolute right-0 top-8 w-80 bg-white text-gray-800 text-xs rounded-lg shadow-2xl border border-gray-200 p-4 z-10">
                  <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                  <h4 className="font-semibold mb-3 text-sm text-gray-900">How This Chart Works</h4>
                  <div className="space-y-2.5">
                    <p className="leading-relaxed">
                      <span className="font-medium text-gray-900">Dark bars (This Week):</span>
                      <span className="text-gray-600"> Sales for each day in the current week</span>
                    </p>
                    <p className="leading-relaxed">
                      <span className="font-medium text-gray-900">Light bars (Last Week):</span>
                      <span className="text-gray-600"> Sales for the same day last week</span>
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

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
          <div className="flex gap-4">
            <select 
              value={currentFilter}
              onChange={(e) => setCurrentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            >
              <option value="all">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
            </select>
            <div className="relative w-80">
              <input
                type="text"
                placeholder="Search Receipt #"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 w-full transition-shadow"
              />
              <FiFileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-xl border border-gray-100">
          {loading ? (
            <div className="text-center py-4">Loading transactions...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-4">{error}</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Receipt #', 'Date & Time', 'Customer', 'Total', 'Payment Method', 'Status'].map((h) => (
                    <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredTransactions.slice(0, 10).map((transaction) => {
                  const { dateString, timeString } = getFormattedDateTime(transaction.createdAt);
                  return (
                    <tr 
                      key={transaction.transactionId || transaction.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewReceipt(transaction)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {transaction.transactionId || transaction.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {`${dateString} ${timeString}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transaction.customerName}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ₱{transaction.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transaction.paymentMethod}
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'completed'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status === 'completed' ? 'Complete' : transaction.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedTransaction && (
        <ReceiptModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
};

const ReportsAndLogs = () => {
  const [activeTab, setActiveTab] = useState('inventory-turnover');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState(
    new Date().toLocaleString('default', { month: 'long' })
  );

  // Tabs configuration
  const tabs = [
    {
      id: 'inventory-turnover',
      label: 'Inventory Turnover',
      icon: <FiActivity size={20} />,
    },
    {
      id: 'stock-movement',
      label: 'Stock Movement',
      icon: <FiBarChart size={20} />,
    },
    {
      id: 'po-analytics',
      label: 'PO Analytics',
      icon: <FiShoppingBag size={20} />,
    },
    {
      id: 'pos-transactions',
      label: 'POS Transactions',
      icon: <FiDollarSign size={20} />,
    },
    {
      id: 'audit-trails',
      label: 'Audit Trails',
      icon: <FiFileText size={20} />,
    },  
    {
      id: 'system-logs',
      label: 'System Logs',
      icon: <FiFileText size={20} />,
    },

  ];

  // Inventory turnover data for demonstration
  const turnoverData = {
    averageTurnoverRate: 2.8,
    totalSales: 6580.0,
    averageInventory: 2350.0,
    chartData: [
      { name: 'Jan', value: 1.5 },
      { name: 'Feb', value: 2.2 },
      { name: 'Mar', value: 2.5 },
      { name: 'Apr', value: 4.8 },
      { name: 'May', value: 2.6 },
      { name: 'Jun', value: 2.4 },
      { name: 'Jul', value: 1.3 },
      { name: 'Aug', value: 2.2 },
      { name: 'Sep', value: 3.1 },
      { name: 'Oct', value: 2.8 },
      { name: 'Nov', value: 2.7 },
      { name: 'Dec', value: 2.9 },
    ],
    monthlyData: [
      {
        month: 'January',
        sales: '$420.00',
        avgInventory: '$2,100.00',
        turnoverRate: '0.2',
      },
      // ... rest of the monthly data
    ],
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'inventory-turnover':
        return (
          <InventoryTurnoverReport
            data={turnoverData}
            yearFilter={yearFilter}
            monthFilter={monthFilter}
            setYearFilter={setYearFilter}
            setMonthFilter={setMonthFilter}
            onBack={() => {}} // No back button needed in tab view
          />
        );
      case 'stock-movement':
        return <StockMovementReport onBack={() => {}} />;
      case 'po-analytics':
        return <POAnalytics />;
      case 'pos-transactions':
        return <POSTransactionsTab />;
      case 'audit-trails':
        return <Audit_trail onBack={() => {}} />;
      case 'system-logs':
        return <System_log onBack={() => {}} />;
      default:
        return null;
    }
  };

  return (
    <div className="">

     
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600 bg-orange-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {renderTabContent()}
        </div>


    </div>
  );
};

export default ReportsAndLogs;
