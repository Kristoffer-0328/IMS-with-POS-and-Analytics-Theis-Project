import React, { useState, useEffect } from 'react';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { FiInfo } from 'react-icons/fi';
import InfoModal from '../Dashboard/InfoModal';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const POAnalytics = () => {
  const poServices = usePurchaseOrderServices();
  const [timeframe, setTimeframe] = useState('month');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeInfoModal, setActiveInfoModal] = useState(null);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadAnalytics();
  }, [timeframe, customDateRange, selectedStatus]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      let endDate = new Date();
      let startDate = new Date();

      // Handle custom date range
      if (timeframe === 'custom' && customDateRange.start && customDateRange.end) {
        startDate = new Date(customDateRange.start);
        endDate = new Date(customDateRange.end);
      } else {
        // Predefined timeframes
        switch (timeframe) {
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          default:
            startDate.setMonth(startDate.getMonth() - 1);
        }
      }

      const result = await poServices.getAnalytics(startDate, endDate);
      if (result.success) {
        setAnalytics(result.metrics);
      } else {
        throw new Error(result.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-medium">Error loading analytics</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Prepare data for charts
  const statusData = Object.entries(analytics.statusBreakdown).map(([status, count]) => ({
    name: status.replace('_', ' ').toUpperCase(),
    value: count
  }));

  // Filter status data if a specific status is selected
  const filteredStatusData = selectedStatus === 'all' 
    ? statusData 
    : statusData.filter(item => item.name.toLowerCase().replace(' ', '_') === selectedStatus);

  const supplierData = Object.values(analytics.supplierMetrics)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)
    .map(supplier => ({
      name: supplier.name,
      orders: supplier.totalOrders,
      value: supplier.totalValue
    }));

  const productData = analytics.topProducts
    .slice(0, 5)
    .map(product => ({
      name: product.name,
      quantity: product.totalQuantity,
      value: product.totalValue
    }));

  // Calculate insights
  const totalOrders = analytics.totalPOs;
  const completedOrders = analytics.statusBreakdown.completed || 0;
  const pendingOrders = analytics.statusBreakdown.pending_approval || 0;
  const approvedOrders = analytics.statusBreakdown.approved || 0;
  const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0;
  const avgOrderValue = totalOrders > 0 ? (analytics.totalValue / totalOrders).toFixed(2) : 0;
  
  // Get top supplier
  const topSupplier = supplierData.length > 0 ? supplierData[0] : null;

  // Chart information content
  const chartInfo = {
    totalPOs: {
      title: "Total Purchase Orders",
      content: (
        <div className="space-y-4">
          <p>This metric shows the total number of purchase orders created during the selected time period:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Includes all POs regardless of status</li>
            <li>Helps track purchasing activity volume</li>
            <li>Can be compared across different time periods</li>
          </ul>
          <p>A significant change in this number may indicate shifts in business activity or purchasing patterns.</p>
        </div>
      )
    },
    totalValue: {
      title: "Total Purchase Value",
      content: (
        <div className="space-y-4">
          <p>The total monetary value of all purchase orders in the selected period:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Represents total purchasing commitment</li>
            <li>Helps track spending patterns</li>
            <li>Key indicator for budget monitoring</li>
          </ul>
          <p>Use this to monitor spending trends and make budget forecasts.</p>
        </div>
      )
    },
    processingTime: {
      title: "Average Processing Time",
      content: (
        <div className="space-y-4">
          <p>Shows the average time taken from PO creation to completion:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Measured in days</li>
            <li>Includes approval and receiving time</li>
            <li>Key efficiency indicator</li>
          </ul>
          <p>Lower processing times generally indicate more efficient operations.</p>
        </div>
      )
    },
    statusDistribution: {
      title: "Understanding PO Status Distribution",
      content: (
        <div className="space-y-4">
          <p>The pie chart shows the distribution of purchase orders by their current status:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="text-yellow-600 font-medium">Pending Approval:</span> Orders awaiting authorization</li>
            <li><span className="text-green-600 font-medium">Approved:</span> Orders cleared for processing</li>
            <li><span className="text-blue-600 font-medium">Completed:</span> Fully received orders</li>
            <li><span className="text-red-600 font-medium">Rejected:</span> Orders not approved</li>
            <li><span className="text-gray-600 font-medium">Draft:</span> Orders in preparation</li>
          </ul>
          <p>Use this to monitor order processing efficiency and identify bottlenecks.</p>
        </div>
      )
    },
    supplierMetrics: {
      title: "Supplier Performance Metrics",
      content: (
        <div className="space-y-4">
          <p>The bar chart shows key metrics by supplier:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Total value of orders placed</li>
            <li>Number of orders placed</li>
            <li>Helps identify key suppliers</li>
            <li>Shows supplier relationship strength</li>
          </ul>
          <p>Use this to evaluate supplier relationships and optimize purchasing strategies.</p>
        </div>
      )
    },
    topProducts: {
      title: "Top Products Analysis",
      content: (
        <div className="space-y-4">
          <p>This chart shows the most frequently ordered products:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Total value of orders per product</li>
            <li>Quantity ordered per product</li>
            <li>Helps identify high-value items</li>
            <li>Useful for inventory planning</li>
          </ul>
          <p>Use this information to optimize stock levels and negotiate better terms for frequently ordered items.</p>
        </div>
      )
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Filters Section */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Analytics Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Time Frame Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Time Period
            </label>
            <select
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value);
                if (e.target.value !== 'custom') {
                  setCustomDateRange({ start: '', end: '' });
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter (3 Months)</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft Only</option>
              <option value="pending_approval">Pending Approval Only</option>
              <option value="approved">Approved Only</option>
              <option value="rejected">Rejected Only</option>
              <option value="completed">Completed Only</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {timeframe === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-300">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-sm font-medium text-blue-900">Completion Rate</h4>
            <button
              onClick={() => setActiveInfoModal('totalPOs')}
              className="p-1 hover:bg-blue-200 rounded-full transition-colors"
            >
              <FiInfo className="w-4 h-4 text-blue-600" />
            </button>
          </div>
          <p className="text-3xl font-bold text-blue-900">{completionRate}%</p>
          <p className="text-xs text-blue-700 mt-1">{completedOrders} of {totalOrders} orders completed</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-sm font-medium text-green-900">Avg Order Value</h4>
            <button
              onClick={() => setActiveInfoModal('totalValue')}
              className="p-1 hover:bg-green-200 rounded-full transition-colors"
            >
              <FiInfo className="w-4 h-4 text-green-600" />
            </button>
          </div>
          <p className="text-3xl font-bold text-green-900">₱{Number(avgOrderValue).toLocaleString()}</p>
          <p className="text-xs text-green-700 mt-1">Per purchase order</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl border border-yellow-200">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-sm font-medium text-yellow-900">Pending Approval</h4>
            <button
              onClick={() => setActiveInfoModal('processingTime')}
              className="p-1 hover:bg-yellow-200 rounded-full transition-colors"
            >
              <FiInfo className="w-4 h-4 text-yellow-600" />
            </button>
          </div>
          <p className="text-3xl font-bold text-yellow-900">{pendingOrders}</p>
          <p className="text-xs text-yellow-700 mt-1">Awaiting authorization</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-sm font-medium text-purple-900">Processing Time</h4>
            <button
              onClick={() => setActiveInfoModal('processingTime')}
              className="p-1 hover:bg-purple-200 rounded-full transition-colors"
            >
              <FiInfo className="w-4 h-4 text-purple-600" />
            </button>
          </div>
          <p className="text-3xl font-bold text-purple-900">{analytics?.averageProcessingTime.toFixed(1)}</p>
          <p className="text-xs text-purple-700 mt-1">Days average</p>
        </div>
      </div>

      {/* Summary Cards with Total Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Total Orders</h3>
            <button
              onClick={() => setActiveInfoModal('totalPOs')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-4xl font-bold text-gray-900">{analytics?.totalPOs}</p>
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
            <p className="text-sm text-gray-600">Approved: <span className="font-semibold text-green-600">{approvedOrders}</span></p>
            <p className="text-sm text-gray-600">Completed: <span className="font-semibold text-blue-600">{completedOrders}</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Total Value</h3>
            <button
              onClick={() => setActiveInfoModal('totalValue')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-4xl font-bold text-green-600">₱{analytics?.totalValue.toLocaleString()}</p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">Average per order: <span className="font-semibold">₱{Number(avgOrderValue).toLocaleString()}</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Top Supplier</h3>
            <button
              onClick={() => setActiveInfoModal('supplierMetrics')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          {topSupplier ? (
            <>
              <p className="text-2xl font-bold text-gray-900 truncate">{topSupplier.name}</p>
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                <p className="text-sm text-gray-600">Orders: <span className="font-semibold">{topSupplier.orders}</span></p>
                <p className="text-sm text-gray-600">Value: <span className="font-semibold text-green-600">₱{topSupplier.value.toLocaleString()}</span></p>
              </div>
            </>
          ) : (
            <p className="text-gray-400">No data available</p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Status Distribution</h3>
              <p className="text-sm text-gray-500 mt-1">Order status breakdown</p>
            </div>
            <button
              onClick={() => setActiveInfoModal('statusDistribution')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {filteredStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Top 5 Suppliers</h3>
              <p className="text-sm text-gray-500 mt-1">By total order value</p>
            </div>
            <button
              onClick={() => setActiveInfoModal('supplierMetrics')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'value') return [`₱${value.toLocaleString()}`, 'Total Value'];
                    return [value, 'Number of Orders'];
                  }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="value" name="Total Value (₱)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" name="Number of Orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Top 5 Products Ordered</h3>
              <p className="text-sm text-gray-500 mt-1">Most frequently purchased items</p>
            </div>
            <button
              onClick={() => setActiveInfoModal('topProducts')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'value') return [`₱${value.toLocaleString()}`, 'Total Value'];
                    return [value, 'Total Quantity'];
                  }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="value" name="Total Value (₱)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quantity" name="Quantity Ordered" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <InfoModal
        isOpen={!!activeInfoModal}
        onClose={() => setActiveInfoModal(null)}
        title={activeInfoModal ? chartInfo[activeInfoModal].title : ''}
        content={activeInfoModal ? chartInfo[activeInfoModal].content : ''}
      />
    </div>
  );
};

export default POAnalytics; 