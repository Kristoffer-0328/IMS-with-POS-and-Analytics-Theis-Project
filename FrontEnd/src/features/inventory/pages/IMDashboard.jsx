import React, { useState, useEffect } from 'react';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiPackage,
  FiAlertTriangle,
  FiRefreshCw,
  FiBell,
  FiInfo
} from 'react-icons/fi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import DashboardBarChart from '../components/Dashboard/DashboardBarChart';
import InfoModal from '../components/Dashboard/InfoModal';
import InventoryTrendChart from '../components/Inventory/InventoryTrendChart';
import { useServices } from '../../../services/firebase/ProductServices';

const IMDashboard = () => {
  const [currentMonth, setCurrentMonth] = useState('October');
  const { listenToProducts, fetchRestockRequests } = useServices(); 
  const [products, setProduct] = useState([]);
  const [lowStock, setLowstock] = useState([]);
  const [request, setRequest] = useState([]);
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null);

  // Chart information content
  const chartInfo = {
    inventory: {
      title: "How to Read the Inventory Chart",
      content: (
        <div className="space-y-4">
          <p>This bar chart shows the current inventory levels for each product:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="text-blue-500">Blue bars</span> indicate healthy stock levels (above 60 units)</li>
            <li><span className="text-yellow-500">Yellow bars</span> indicate moderate stock levels (between 41-60 units)</li>
            <li><span className="text-red-500">Red bars</span> indicate low stock levels (40 units or below)</li>
          </ul>
          <p>Hover over any bar to see the exact quantity for that product.</p>
        </div>
      )
    },
    turnover: {
      title: "Understanding Inventory Turnover",
      content: (
        <div className="space-y-4">
          <p>The area chart displays inventory turnover rates throughout the year:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Higher peaks indicate faster inventory movement</li>
            <li>Lower valleys show slower turnover periods</li>
            <li>The blue gradient helps visualize the intensity of turnover activity</li>
          </ul>
          <p>A higher turnover rate generally indicates efficient inventory management and strong sales performance.</p>
        </div>
      )
    },
    stockLog: {
      title: "About the Stock Movement Log",
      content: (
        <div className="space-y-4">
          <p>The stock movement log tracks all inventory transactions:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Product: The item being transferred</li>
            <li>From/To: Source and destination locations</li>
            <li>Qty: Number of units moved</li>
            <li>Date: When the transfer occurred</li>
            <li>Status: Current state of the transfer</li>
          </ul>
          <p>Use the month selector to filter movements by specific time periods.</p>
        </div>
      )
    }
  };

  // Sample turnover data - replace with actual data later
  const turnoverData = [
    { name: 'Jan', value: 0 },
    { name: 'Feb', value: 0 },
    { name: 'Mar', value: 0 },
    { name: 'Apr', value: 0.001 },
    { name: 'May', value: 0.045 },
    { name: 'Jun', value: 0.015 },
    { name: 'Jul', value: 0 },
    { name: 'Aug', value: 0 },
    { name: 'Sep', value: 0 },
    { name: 'Oct', value: 0 },
    { name: 'Nov', value: 0 },
    { name: 'Dec', value: 0 }
  ];

  useEffect(() => {
    const unsubscribe = listenToProducts(setProduct);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const getRequests = async () => {
      const res = await fetchRestockRequests();
      if (res.success) {
        setRequest(res.requests);
      }
    };

    getRequests();
  }, [fetchRestockRequests]);
  
  const chartData = products.map((p) => {
    let color = '#4779FF';
    if (p.quantity < p.restockLevel) color = '#FF4D4D';
    else if (p.quantity <= 40) color = '#FFC554';

    return {
      name: p.name,
      value: p.quantity,
      color,
    };
  });

  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-blue-600">
            <span className="font-semibold">{payload[0].value}</span> items
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for the area chart
  const TurnoverTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-blue-600">
            <span className="font-semibold">{payload[0].value.toFixed(3)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const stockMovements = [];
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 bg-gray-50">
      <DashboardHeader />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-5">
        
        {/* Total Stock */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-xs sm:text-sm mb-1">Total Stock</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                {products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0).toLocaleString()} Items
              </h3>
              <div className="flex items-center text-red-500 text-xs mt-1">
                <FiTrendingDown className="mr-1" />
                <span>null</span>
              </div>
            </div>
            <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
              <FiPackage className="text-green-500" size={20} />
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-xs sm:text-sm mb-1">Low Stock</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{products.filter(p => p.quantity <= 60).length} Items</h3>
              <div className="flex items-center text-red-500 text-xs mt-1">
                <FiAlertTriangle className="mr-1" />
                <span>Critical</span>
              </div>
            </div>
            <div className="bg-amber-50 p-2 sm:p-3 rounded-lg">
              <FiAlertTriangle className="text-amber-500" size={20} />
            </div>
          </div>
        </div>

        {/* Pending Restocks */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-xs sm:text-sm mb-1">Restocks</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{request.filter(r => r.status === 'pending').length} Requests</h3>
              <div className="flex items-center text-green-500 text-xs mt-1">
                <FiTrendingUp className="mr-1" />
              </div>
            </div>
            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
              <FiBell className="text-blue-500" size={20} />
            </div>
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-xs sm:text-sm mb-1">Transfers</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Ongoing</h3>
              <div className="flex items-center text-red-500 text-xs mt-1">
                <FiTrendingDown className="mr-1" />
              </div>
            </div>
            <div className="bg-purple-50 p-2 sm:p-3 rounded-lg">
              <FiRefreshCw className="text-purple-500" size={20} />
            </div>
          </div>
        </div>

      </div>

      {/* Inventory Chart */}
      <div className="bg-white rounded-xl shadow-sm mb-6 p-4 sm:p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg sm:text-xl text-gray-800 font-semibold">
            Glory Star Hardware
          </h3>
          <button
            onClick={() => setActiveModal('inventory')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="How to read this chart"
          >
            <FiInfo className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <DashboardBarChart data={chartData} CustomTooltip={CustomTooltip} />
      </div>

      {/* Inventory Turnover Chart */}
      <div className="bg-white rounded-xl shadow-sm mb-6 p-4 sm:p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg sm:text-xl text-gray-800 font-semibold">
            Inventory Turnover
          </h3>
          <button
            onClick={() => setActiveModal('turnover')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="How to read this chart"
          >
            <FiInfo className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="h-[300px]">
         <InventoryTrendChart />
        </div>
      </div>

      {/* Stock Movement Log */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
              Stock Log
            </h3>
            <button
              onClick={() => setActiveModal('stockLog')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="About the stock log"
            >
              <FiInfo className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="relative w-full sm:w-auto">
            <select
              className="w-full sm:w-auto appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 text-sm"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
              <option value="all">All Time</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  From
                </th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {stockMovements.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {item.product}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                    {item.from}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                    {item.to}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                    {item.quantity}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                    {item.date}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                    {item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Modals */}
      <InfoModal
        isOpen={activeModal === 'inventory'}
        onClose={() => setActiveModal(null)}
        title={chartInfo.inventory.title}
        content={chartInfo.inventory.content}
      />
      <InfoModal
        isOpen={activeModal === 'turnover'}
        onClose={() => setActiveModal(null)}
        title={chartInfo.turnover.title}
        content={chartInfo.turnover.content}
      />
      <InfoModal
        isOpen={activeModal === 'stockLog'}
        onClose={() => setActiveModal(null)}
        title={chartInfo.stockLog.title}
        content={chartInfo.stockLog.content}
      />
    </div>
  );
};

export default IMDashboard;
