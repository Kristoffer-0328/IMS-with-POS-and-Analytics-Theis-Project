import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiDownload, FiArrowUp, FiArrowDown, FiPackage, FiShoppingCart } from 'react-icons/fi';
import { getFirestore, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const db = getFirestore(app);

const StockMovementReportModalContent = ({ onClose, stockMovementData, yearFilter, monthFilter, setYearFilter, setMonthFilter }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-6 relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
      {/* Original Stock Movement Report UI */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Stock Movement History
            </h1>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center gap-2">
              Back to Reports
            </button>
          )}
        </div>

        {/* Filter Section */}
        <div className="flex gap-3 justify-end mb-6">
          <div className="relative inline-block">
            <select
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}>
              <option>This year</option>
              <option>Last year</option>
              <option>All time</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <div className="relative inline-block">
            <select
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}>
              <option>October</option>
              <option>September</option>
              <option>August</option>
              <option>July</option>
              <option>June</option>
              <option>May</option>
              <option>April</option>
              <option>March</option>
              <option>February</option>
              <option>January</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <button className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Apply
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Total Movements */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-2">
              TOTAL STOCK MOVEMENT
            </h3>
            <p className="text-2xl font-bold text-gray-800">
              {stockMovementData.totalMovements}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              past {stockMovementData.timeframe}
            </p>
          </div>

          {/* Total Inbound */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-2">
              TOTAL INBOUND
            </h3>
            <p className="text-2xl font-bold text-gray-800">
              {stockMovementData.inbound}
            </p>
            <div className="flex items-center text-sm mt-1">
              <span
                className={`flex items-center ${stockMovementData.inboundChangeIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                {stockMovementData.inboundChangeIsPositive ? (
                  <FiTrendingUp className="mr-1" />
                ) : (
                  <FiTrendingDown className="mr-1" />
                )}
                {stockMovementData.inboundChange}%
              </span>
              <span className="text-gray-500 ml-1">
                vs Previous {stockMovementData.timeframe}
              </span>
            </div>
          </div>

          {/* Total Outbound */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-2">
              TOTAL OUTBOUND
            </h3>
            <p className="text-2xl font-bold text-gray-800">
              ${stockMovementData.outbound.toLocaleString()}
            </p>
            <div className="flex items-center text-sm mt-1">
              <span
                className={`flex items-center ${stockMovementData.outboundChangeIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                {stockMovementData.outboundChangeIsPositive ? (
                  <FiTrendingUp className="mr-1" />
                ) : (
                  <FiTrendingDown className="mr-1" />
                )}
                {stockMovementData.outboundChange}%
              </span>
              <span className="text-gray-500 ml-1">
                vs Prev ~{stockMovementData.timeframe}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Stock Movement Log - 3 columns wide */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <h3 className="text-gray-800 font-semibold mb-4">
              Stock Movement Log
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {stockMovementData.movements.map((movement, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {movement.productName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {movement.from}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {movement.to}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {movement.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {movement.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock Movement Trend - 2 columns wide */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-800 font-semibold">
                Stock Movement Trend
              </h3>
              <div className="flex items-center text-xs text-gray-500">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                <span>Oct - Dec</span>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stockMovementData.trendData}
                  margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4779FF" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4779FF" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f1f1"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#888', fontSize: 10 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#888', fontSize: 10 }}
                    domain={[0, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#4779FF"
                    fillOpacity={1}
                    fill="url(#colorStock)"
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      strokeWidth: 2,
                      fill: 'white',
                      stroke: '#4779FF',
                    }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#4779FF' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Generate Report
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2">
            <FiDownload size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

const StockMovementReport = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState('All Months');
  const [movementData, setMovementData] = useState([]);
  const [summary, setSummary] = useState({
    totalMovements: 0,
    totalIn: 0,
    totalOut: 0,
    netChange: 0,
    inPercentage: 0,
    outPercentage: 0
  });
  const [chartData, setChartData] = useState([]);

  const months = [
    'All Months', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    fetchMovementData();
  }, [yearFilter, monthFilter]);

  const fetchMovementData = async () => {
    setLoading(true);
    try {

      // Build query based on filters
      const movementsRef = collection(db, 'stock_movements');
      let movementQuery = movementsRef;
      
      // Apply year filter
      if (yearFilter && yearFilter !== 'All Years') {
        const year = parseInt(yearFilter);
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);
        
        movementQuery = query(
          movementsRef,
          where('movementDate', '>=', startOfYear),
          where('movementDate', '<=', endOfYear),
          orderBy('movementDate', 'desc')
        );
      } else {
        movementQuery = query(movementsRef, orderBy('movementDate', 'desc'));
      }
      
      // Fetch movements
      const movementsSnapshot = await getDocs(movementQuery);

      let movements = movementsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.movementDate?.toDate ? data.movementDate.toDate() : new Date(data.movementDate),
          type: data.movementType, // Always use movementType from Firestore
          reason: data.reason || 'Unknown',
          productName: data.productName || 'Unknown Product',
          quantity: data.quantity || 0,
          value: data.totalValue || 0,
          customer: data.customer || null,
          supplier: data.supplier || null,
          destination: data.destination || null,
          requestedBy: data.requestedBy || data.releasedByName || null,
          reference: data.transactionId || data.referenceId || doc.id,
          notes: data.notes || data.remarks || ''
        };
      });
      
      // Apply month filter if not "All Months"
      if (monthFilter && monthFilter !== 'All Months') {
        const monthIndex = months.indexOf(monthFilter) - 1; // -1 because "All Months" is index 0
        movements = movements.filter(m => m.date.getMonth() === monthIndex);
      }

      setMovementData(movements);

      // Calculate summary
      const totalIn = movements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0);
      const totalOut = movements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.quantity, 0);
      const totalMovements = movements.length;
      const netChange = totalIn - totalOut;
      setSummary({
        totalMovements,
        totalIn,
        totalOut,
        netChange,
        inPercentage: (totalIn + totalOut) > 0 ? ((totalIn / (totalIn + totalOut)) * 100).toFixed(1) : 0,
        outPercentage: (totalIn + totalOut) > 0 ? ((totalOut / (totalIn + totalOut)) * 100).toFixed(1) : 0
      });

      // Generate chart data (daily aggregation)
      const dailyData = {};
      movements.forEach(movement => {
        const day = movement.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dailyData[day]) {
          dailyData[day] = { day, in: 0, out: 0 };
        }
        if (movement.type === 'IN') {
          dailyData[day].in += movement.quantity;
        } else {
          dailyData[day].out += movement.quantity;
        }
      });

      setChartData(Object.values(dailyData));

    } catch (error) {
      console.error('Error fetching movement data:', error);
      
      // Fallback to empty data if there's an error
      setMovementData([]);
      setSummary({
        totalMovements: 0,
        totalIn: 0,
        totalOut: 0,
        netChange: 0,
        inPercentage: 0,
        outPercentage: 0
      });
      setChartData([]);
      
      // Show error to user
      alert(`Error loading stock movements: ${error.message}\n\nPlease check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const getReasonIcon = (reason) => {
    // Icons removed for cleaner UI
    return null;
  };

  const getReasonColor = (reason) => {
    const colors = {
      'Sale Transaction': 'text-blue-600 bg-blue-50',
      'Supplier Delivery': 'text-green-600 bg-green-50',
      'Project Release': 'text-orange-600 bg-orange-50',
      'Restock Request': 'text-purple-600 bg-purple-50',
      'Damaged/Shrinkage': 'text-red-600 bg-red-50',
      'Return': 'text-cyan-600 bg-cyan-50',
      'Adjustment': 'text-gray-600 bg-gray-50'
    };
    return colors[reason] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="w-full">
      {/* Header with optional back button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Stock Movement History
          </h1>
          <p className="text-gray-600">
            Track all inventory movements and changes over time
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center gap-2">
            Back to Reports
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 justify-end mb-6">
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          {months.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
        <button className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FiDownload size={16} />
          Export
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading movement data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Movements */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Total Movements</h3>
                <FiPackage className="text-gray-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {summary.totalMovements}
              </p>
              <p className="text-xs text-gray-500">All transactions</p>
            </div>

            {/* Stock IN */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-green-700 uppercase">Stock IN</h3>
                <FiArrowDown className="text-green-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-green-700 mb-1">
                {summary.totalIn}
              </p>
              <p className="text-xs text-green-600">{summary.inPercentage}% of total</p>
            </div>

            {/* Stock OUT */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border-2 border-red-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-red-700 uppercase">Stock OUT</h3>
                <FiArrowUp className="text-red-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-red-700 mb-1">
                {summary.totalOut}
              </p>
              <p className="text-xs text-red-600">{summary.outPercentage}% of total</p>
            </div>

            {/* Net Change */}
            <div className={`rounded-xl p-6 border-2 shadow-sm ${
              summary.netChange >= 0 
                ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200' 
                : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-semibold uppercase ${
                  summary.netChange >= 0 ? 'text-blue-700' : 'text-orange-700'
                }`}>
                  Net Change
                </h3>
                {summary.netChange >= 0 ? (
                  <FiTrendingUp className="text-blue-600" size={20} />
                ) : (
                  <FiTrendingDown className="text-orange-600" size={20} />
                )}
              </div>
              <p className={`text-3xl font-bold mb-1 ${
                summary.netChange >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}>
                {summary.netChange >= 0 ? '+' : ''}{summary.netChange}
              </p>
              <p className={`text-xs ${
                summary.netChange >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {summary.netChange >= 0 ? 'Inventory increased' : 'Inventory decreased'}
              </p>
            </div>
          </div>

          {/* Movement Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Movement Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 12 }} />
                <YAxis tick={{ fill: '#888', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="in" fill="url(#colorIn)" name="Stock IN" radius={[8, 8, 0, 0]} />
                <Bar dataKey="out" fill="url(#colorOut)" name="Stock OUT" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Transactions Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Detailed Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movementData.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {movement.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          movement.type === 'IN' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {movement.type === 'IN' ? <FiArrowDown size={12} /> : <FiArrowUp size={12} />}
                          {movement.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getReasonColor(movement.reason)}`}>
                          {movement.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{movement.productName}</td>
                      <td className={`px-6 py-4 text-sm text-right font-semibold ${
                        movement.type === 'IN' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.type === 'IN' ? '+' : '-'}{movement.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        ₱{movement.value.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{movement.reference}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {movement.customer && `Customer: ${movement.customer}`}
                        {movement.supplier && `Supplier: ${movement.supplier}`}
                        {movement.destination && `To: ${movement.destination}`}
                        {movement.requestedBy && `By: ${movement.requestedBy}`}
                        {movement.notes && movement.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Note */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <FiPackage className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">About Stock Movement</h4>
                <p className="text-xs text-blue-800">
                  This report tracks all inventory changes including: POS sales, supplier deliveries, project releases, restock requests, and adjustments.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  <em>Note: Currently showing example data. In production, this will pull from your actual transactions (pos_transactions, receiving_logs, release_logs, etc.)</em>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StockMovementReport;
