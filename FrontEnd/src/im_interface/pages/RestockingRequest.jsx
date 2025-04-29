import React, { useState ,useEffect} from 'react';
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
import { useServices } from '../../FirebaseBackEndQuerry/ProductServices';
const RestockingRequest = () => {
  const [currentMonth, setCurrentMonth] = useState('October');
  const [products, setProduct] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { listenToProducts, fetchRestockRequests } = useServices(); 
  const [request , setRequest] = useState([]);
  
   useEffect(() => {
       const unsubscribe = listenToProducts(setProduct);
       return () => unsubscribe();
     }, []);
    useEffect(() => {
      const getRequests = async () => {
        const res = await fetchRestockRequests();
        if (res.success) {
          setRequest(res.requests); // you handle the state here
        }
      };
    
      getRequests();
    }, [fetchRestockRequests]);
  
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

  // Sample data for the restocking requests
  const restockingRequests = [
    {
      id: 1,
      productName: 'Bolts',
      currentStock: '5 pcs',
      requested: '50 pcs',
      status: 'pending',
      actionStatus: 'approved',
    },
    {
      id: 2,
      productName: 'Sealant',
      currentStock: '30 pcs',
      requested: '80 pcs',
      status: 'approved',
      actionStatus: 'pending',
    },
    {
      id: 3,
      productName: 'Wood Planks',
      currentStock: '20 pcs',
      requested: '100 pcs',
      status: 'ordered',
      actionStatus: null,
    },
  ];

  // Render status badge based on status type
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-4 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            Pending
          </span>
        );
      case 'Approved':
        return (
          <span className="px-4 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Approved
          </span>
        );
      case 'Ordered':
        return (
          <span className="px-4 py-1.5 bg-teal-100 text-teal-800 rounded-full text-xs font-medium">
            Ordered
          </span>
        );
      default:
        return null;
    }
  };

  // Render action button based on action status
  const renderActionButton = (actionStatus) => {
    switch (actionStatus) {
      case 'Pending':
        return (
          <button className="px-4 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            Pending
          </button>
        );
      case 'Approved':
        return (
          <button className="px-4 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Approved
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Restocking Request</h1>
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
                  {summaryData.totalStock.value}
                </h3>
                <div className="flex items-center text-red-500 text-xs mt-1">
                  <FiTrendingDown className="mr-1" />
                  <span>
                    {Math.abs(summaryData.totalStock.change)}% Down from{' '}
                    {summaryData.totalStock.period}
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

      {/* Stock Restocking Request */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Stock Restocking Request
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative inline-block">
              <select
                className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}>
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
               
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {request.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {request.Product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.currentStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.requested}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.Month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderActionButton(request.actionStatus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2">
            <FiEye size={16} />
            <span>View Details</span>
          </button>

          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          onClick={() => setIsModalOpen(true)}>
            <FiPlus size={16} />
            <span>New Request</span>
            
          </button>
        </div>
      </div>
      <RestockRequestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

    </div>
  );
};

export default RestockingRequest;
