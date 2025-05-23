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

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const endDate = new Date();
      let startDate = new Date();

      switch (timeframe) {
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
          throw new Error('Invalid timeframe');
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

  const supplierData = Object.values(analytics.supplierMetrics)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)
    .map(supplier => ({
      name: supplier.name,
      orders: supplier.totalOrders,
      value: supplier.totalValue
    }));

  const productData = analytics.topProducts.map(product => ({
    name: product.name,
    quantity: product.totalQuantity,
    value: product.totalValue
  }));

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
    <div className="p-6">
      {/* Time Frame Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Frame
        </label>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium mb-2">Total Purchase Orders</h3>
            <button
              onClick={() => setActiveInfoModal('totalPOs')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about total POs"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-3xl font-bold">{analytics?.totalPOs}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium mb-2">Total Value</h3>
            <button
              onClick={() => setActiveInfoModal('totalValue')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about total value"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-3xl font-bold">₱{analytics?.totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium mb-2">Avg. Processing Time</h3>
            <button
              onClick={() => setActiveInfoModal('processingTime')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about processing time"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-3xl font-bold">{analytics?.averageProcessingTime.toFixed(1)} days</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Status Distribution</h3>
            <button
              onClick={() => setActiveInfoModal('statusDistribution')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about status distribution"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Top Suppliers by Value</h3>
            <button
              onClick={() => setActiveInfoModal('supplierMetrics')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about supplier metrics"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Total Value" fill="#8884d8" />
                <Bar dataKey="orders" name="Number of Orders" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Top Products by Value</h3>
            <button
              onClick={() => setActiveInfoModal('topProducts')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about top products"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Total Value" fill="#8884d8" />
                <Bar dataKey="quantity" name="Quantity" fill="#82ca9d" />
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