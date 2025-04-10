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
  const { getData,  } = useServices(); 
 useEffect(() => {
    const fetchData = async () => {
      const res = await getData();  
    
      if (res.success) {
        
        setProduct(res.product);

      } else {
        console.error('Failed to fetch products:', res.error);
      }
    };

    fetchData();
  }, [getData]);

  const summaryData = {
    totalStock: {
      value: '2,940 Items',
      change: -4.3,
      period: 'yesterday',
    },
    lowStock: {
      value: '10 Items',
      isCritical: true,
    },
    pendingRestocks: {
      value: '8 Requests',
      change: 2,
      period: 'Yesterday',
      isPositive: true,
    },
    totalSales: {
      value: '3 Ongoing Transfers',
      change: -4.3,
      period: 'yesterday',
    },
  };

  const movementLogs = [
    // {
    //   id: 1,
    //   productName: 'Hammer',
    //   from: 'Receiving',
    //   to: 'STR A1',
    //   date: '12.05.23',
    //   quantity: '50 pcs',
    //   status: 'completed',
    // },
    // {
    //   id: 2,
    //   productName: 'Nails',
    //   from: 'STR B2',
    //   to: 'STR C1',
    //   date: '09.20.23',
    //   quantity: '100 pcs',
    //   status: 'pending',
    // },
    // {
    //   id: 3,
    //   productName: 'Paint',
    //   from: 'STR B1',
    //   to: 'STR A1',
    //   date: '12.31.23',
    //   quantity: '50 pcs',
    //   status: 'completed',
    // },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Stock Transfer</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <FiBell size={20} className="text-gray-500" />
            <span className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
              2
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">I love Toff</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
              IT
            </div>
          </div>
        </div>
      </div>

      {/* Background gradient design element */}
      <div className="relative mb-6">
        <div className="absolute top-10 bottom-5 inset-0 bg-gradient-to-r from-amber-100/60 to-amber-300/40 rounded-3xl transform -skew-y-3"></div>

        {/* Summary Cards */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 py-6 px-2">
          {/* Total Stock */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-1">Total Stock</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {/* {summaryData.totalStock.value} */}
                </h3>
                <div className="flex items-center text-red-500 text-xs mt-1">
                  <FiTrendingDown className="mr-1" />
                  <span>
                    {/* {Math.abs(summaryData.totalStock.change)}% Down from{' '}
                    {summaryData.totalStock.period} */}
                  </span>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <FiPackage className="text-green-500" size={24} />
              </div>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-1">Low - Stock Items</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {summaryData.lowStock.value}
                </h3>
                {summaryData.lowStock.isCritical && (
                  <div className="flex items-center text-red-500 text-xs mt-1">
                    <FiAlertTriangle className="mr-1" />
                    <span className="font-medium">Critical Stock</span>
                  </div>
                )}
              </div>
              <div className="bg-amber-50 p-3 rounded-lg">
                <FiAlertTriangle className="text-amber-500" size={24} />
              </div>
            </div>
          </div>

          {/* Pending Restocks */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-1">Pending Restocks</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {summaryData.pendingRestocks.value}
                </h3>
                <div className="flex items-center text-green-500 text-xs mt-1">
                  <FiTrendingUp className="mr-1" />
                  <span>
                    +{summaryData.pendingRestocks.change} From{' '}
                    {summaryData.pendingRestocks.period}
                  </span>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <FiBell className="text-blue-500" size={24} />
              </div>
            </div>
          </div>

          {/* Total Sales */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-1">Total Sales</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {summaryData.totalSales.value}
                </h3>
                <div className="flex items-center text-red-500 text-xs mt-1">
                  <FiTrendingDown className="mr-1" />
                  <span>
                    {Math.abs(summaryData.totalSales.change)}% Down from{' '}
                    {summaryData.totalSales.period}
                  </span>
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <FiRefreshCw className="text-purple-500" size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Stock Movement Log */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Stock Movement Log
          </h2>
          <button
            className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <FiPlusCircle size={18} />
            <span>Transfer Form</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {movementLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.from}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.to}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full capitalize
                        ${
                          log.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : log.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
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

export default StockTransfer;
