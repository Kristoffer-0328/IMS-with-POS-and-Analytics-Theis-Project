import React, { useState, useEffect } from 'react';
import {
  FiTrendingDown,
  FiTrendingUp,
  FiPackage,
  FiAlertTriangle,
  FiRefreshCw,
  FiBell,
  FiPlusCircle,
} from 'react-icons/fi';
import { useServices } from '../../FirebaseBackEndQuerry/ProductServices';
import TransferFormModal from '../components/Inventory/TransferFormModal';

const StockTransfer = () => {
  const [products, setProduct] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getData } = useServices();

 

  const summaryData = {
    totalStock: { value: '2,940 Items', change: -4.3, period: 'Yesterday' },
    lowStock: { value: '10 Items', isCritical: true },
    pendingRestocks: { value: '8 Requests', change: 2, period: 'Yesterday' },
    totalSales: { value: '3 Ongoing Transfers', change: -4.3, period: 'Yesterday' },
  };

  const movementLogs = [
    {
      id: 1,
      productName: 'Hammer',
      from: 'Receiving',
      to: 'STR A1',
      date: '12.05.23',
      quantity: '50 pcs',
      status: 'completed',
    },
    {
      id: 2,
      productName: 'Nails',
      from: 'STR B2',
      to: 'STR C1',
      date: '09.20.23',
      quantity: '100 pcs',
      status: 'pending',
    },
    {
      id: 3,
      productName: 'Paint',
      from: 'STR B1',
      to: 'STR A1',
      date: '12.31.23',
      quantity: '50 pcs',
      status: 'completed',
    },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 bg-gray-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Stock Transfer</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <FiBell size={22} className="text-gray-500" />
            <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[10px] rounded-full">
              2
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold">I love Toff</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
              IT
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Section */}
      <div className="relative mb-6">
        <div className="absolute inset-0 top-10 bottom-5 bg-gradient-to-r from-amber-100/60 to-amber-300/40 rounded-3xl -skew-y-3"></div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 py-6 px-2">
          {/* Card 1 */}
          <SummaryCard
            title="Total Stock"
            value={summaryData.totalStock.value}
            icon={<FiPackage size={24} className="text-green-500" />}
            trend={<FiTrendingDown className="mr-1" />}
            trendText={`${Math.abs(summaryData.totalStock.change)}% Down from ${summaryData.totalStock.period}`}
            trendColor="text-red-500"
            bgColor="bg-green-50"
          />

          {/* Card 2 */}
          <SummaryCard
            title="Low - Stock Items"
            value={summaryData.lowStock.value}
            icon={<FiAlertTriangle size={24} className="text-amber-500" />}
            trend={
              summaryData.lowStock.isCritical && (
                <>
                  <FiAlertTriangle className="mr-1" />
                  Critical Stock
                </>
              )
            }
            trendColor="text-red-500"
            bgColor="bg-amber-50"
          />

          {/* Card 3 */}
          <SummaryCard
            title="Pending Restocks"
            value={summaryData.pendingRestocks.value}
            icon={<FiBell size={24} className="text-blue-500" />}
            trend={
              <>
                <FiTrendingUp className="mr-1" />
                +{summaryData.pendingRestocks.change} From {summaryData.pendingRestocks.period}
              </>
            }
            trendColor="text-green-500"
            bgColor="bg-blue-50"
          />

          {/* Card 4 */}
          <SummaryCard
            title="Total Sales"
            value={summaryData.totalSales.value}
            icon={<FiRefreshCw size={24} className="text-purple-500" />}
            trend={
              <>
                <FiTrendingDown className="mr-1" />
                {Math.abs(summaryData.totalSales.change)}% Down from {summaryData.totalSales.period}
              </>
            }
            trendColor="text-red-500"
            bgColor="bg-purple-50"
          />
        </div>
      </div>

      {/* Stock Movement Log */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Stock Movement Log</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <FiPlusCircle size={18} />
            Transfer Form
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Product Name</th>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-left">To</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Quantity</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movementLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-800">{log.productName}</td>
                  <td className="px-4 py-4 text-gray-600">{log.from}</td>
                  <td className="px-4 py-4 text-gray-600">{log.to}</td>
                  <td className="px-4 py-4 text-gray-600">{log.date}</td>
                  <td className="px-4 py-4 text-gray-600">{log.quantity}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${
                        log.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TransferFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

const SummaryCard = ({ title, value, icon, trend, trendText, trendColor, bgColor }) => (
  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-500 text-sm mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
        {trend && (
          <div className={`flex items-center mt-1 text-xs ${trendColor}`}>
            {trend}
            {trendText && <span>{trendText}</span>}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        {icon}
      </div>
    </div>
  </div>
);

export default StockTransfer;
