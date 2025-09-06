import React, { useState } from 'react';
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
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiDownload } from 'react-icons/fi';

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
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center gap-2">
            Back to Reports
          </button>
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

const StockMovementReport = ({ onBack }) => {
  const [yearFilter, setYearFilter] = useState('This year');
  const [monthFilter, setMonthFilter] = useState('October');
  const [showModal, setShowModal] = useState(false);

  // Sample data for demonstration
  const stockMovementData = {
    totalMovements: 2940,
    inbound: 1760,
    inboundChange: 8.3,
    inboundChangeIsPositive: true,
    outbound: 2350.0,
    outboundChange: 5.4,
    outboundChangeIsPositive: false,
    timeframe: '30 Days',
    movements: [
      {
        productName: '$4,500',
        from: '$4,500',
        to: '2.5',
        quantity: '2.5',
        date: 'January',
      },
      {
        productName: '$4,500',
        from: '$4,500',
        to: '2.5',
        quantity: '2.5',
        date: 'February',
      },
      {
        productName: '$4,500',
        from: '$4,500',
        to: '2.5',
        quantity: '2.5',
        date: 'March',
      },
    ],
    trendData: [
      { name: 'Jan', value: 1.5 },
      { name: 'Feb', value: 2.0 },
      { name: 'Mar', value: 1.8 },
      { name: 'Apr', value: 2.2 },
      { name: 'May', value: 2.8 },
      { name: 'Jun', value: 2.6 },
      { name: 'Jul', value: 2.4 },
      { name: 'Aug', value: 3.8 },
      { name: 'Sep', value: 3.0 },
      { name: 'Oct', value: 3.2 },
      { name: 'Nov', value: 2.8 },
      { name: 'Dec', value: 3.0 },
    ],
  };

  return (
    <>
      <div className='w-full flex justify-center items-center' style={{ minHeight: '200px' }}>
        <h1 className='text-2xl font-bold text-gray-800'>Not implemented yet</h1>
      </div>
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-lg hover:bg-blue-700 transition-colors"
        >
          Show UI Preview
        </button>
      </div>
      {showModal && <StockMovementReportModalContent onClose={() => setShowModal(false)} stockMovementData={stockMovementData} yearFilter={yearFilter} monthFilter={monthFilter} setYearFilter={setYearFilter} setMonthFilter={setMonthFilter} />}
    </>
  );
};

export default StockMovementReport;
