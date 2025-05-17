import React, { useState, useEffect } from 'react';
import {
  FiTrendingDown,
  FiTrendingUp,
  FiPackage,
  FiAlertTriangle,
  FiRefreshCw,
  FiBell,
  FiEye,
  FiPlus,
} from 'react-icons/fi';
import RestockRequestModal from '../components/Inventory/RequestStockModal';
import RestockingHeader from '../components/Inventory/RestockingHeader';
import { useServices } from '../../../services/firebase/ProductServices';

const RestockingRequest = () => {
  const [products, setProduct] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { listenToProducts, fetchRestockRequests } = useServices();
  const [request, setRequest] = useState([]);

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

  // Calculate summary data based on actual data
  const summaryData = {
    totalRequests: {
      value: `${request.length} Requests`,
      change: 0,
      period: 'today',
    },
    pendingRequests: {
      value: `${request.filter(r => r.status === 'pending').length} Pending`,
      isCritical: true,
    },
    approvedRequests: {
      value: `${request.filter(r => r.status === 'approved').length} Approved`,
      isPositive: true,
    },
    processingRequests: {
      value: `${request.filter(r => r.status === 'processing').length} Processing`,
      period: 'current',
    },
  };

  // Render status badge based on status type
  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return (
          <span className="px-4 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-4 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Approved
          </span>
        );
      case 'processing':
        return (
          <span className="px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Processing
          </span>
        );
      default:
        return (
          <span className="px-4 py-1.5 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 bg-gray-50">
      <RestockingHeader />

      {/* Background gradient design element */}
      <div className="relative mb-6">
        <div className="absolute top-10 bottom-5 inset-0 bg-gradient-to-r from-amber-100/60 to-amber-300/40 rounded-3xl transform -skew-y-3"></div>

        {/* Summary Cards */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 py-6 px-2">
          {/* Total Requests */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-1">Total Requests</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {summaryData.totalRequests.value}
                </h3>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <FiPackage className="text-green-500" size={24} />
              </div>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-1">Pending Requests</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {summaryData.pendingRequests.value}
                </h3>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg">
                <FiAlertTriangle className="text-amber-500" size={24} />
              </div>
            </div>
          </div>

          {/* Approved Requests */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-1">Approved Requests</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {summaryData.approvedRequests.value}
                </h3>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <FiBell className="text-blue-500" size={24} />
              </div>
            </div>
          </div>

          {/* Processing Requests */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-1">Processing</p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {summaryData.processingRequests.value}
                </h3>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <FiRefreshCw className="text-purple-500" size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Restocking Request Table */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Stock Restocking Request
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Maximum Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {request.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {request.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.currentQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.restockLevel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.maximumStockLevel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        
      </div>
      <RestockRequestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default RestockingRequest;
