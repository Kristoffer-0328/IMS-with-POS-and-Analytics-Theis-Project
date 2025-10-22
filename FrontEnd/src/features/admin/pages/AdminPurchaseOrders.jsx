import React, { useState, useEffect } from 'react';
import { FiFilter, FiRefreshCw, FiBarChart2, FiList } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../services/firebase/PurchaseOrderServices';
import { useAuth } from '../../auth/services/FirebaseAuth';
import ViewPOModal from '../../inventory/components/PurchaseOrder/ViewPOModal';
import POAnalytics from '../../inventory/components/PurchaseOrder/POAnalytics';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';

const AdminPurchaseOrders = () => {
  const { currentUser } = useAuth();
  const poServices = usePurchaseOrderServices();
  
  // State
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'analytics'
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('pending_approval');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Load POs
  useEffect(() => {

    const unsubscribe = poServices.listenToPurchaseOrders((pos) => {

      setPurchaseOrders(pos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter POs
  const filteredPOs = purchaseOrders.filter(po => {

    if (selectedStatus !== 'all' && po.status !== selectedStatus) {

      return false;
    }
    if (dateRange.start && new Date(po.createdAt?.toDate()) < new Date(dateRange.start)) {

      return false;
    }
    if (dateRange.end && new Date(po.createdAt?.toDate()) > new Date(dateRange.end)) {

      return false;
    }

    return true;
  });

  // Status badge renderer
  const renderStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800' },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      approved: { bg: 'bg-green-100', text: 'text-green-800' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // Handle PO click
  const handlePOClick = (po) => {
    setSelectedPO(po);
    setShowViewModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="">
      <DashboardHeader />
     

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiList size={20} />
              <span>Purchase Orders</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiBarChart2 size={20} />
              <span>Analytics</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'orders' ? (
          <>
            {/* Filters */}
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FiFilter className="text-gray-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Clear Filters Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedStatus('pending_approval');
                    setDateRange({ start: '', end: '' });
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* PO Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Purchase Orders</h3>
                  <span className="text-sm text-gray-500">
                    Showing {filteredPOs.length} of {purchaseOrders.length} orders
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PO Number</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created By</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPOs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <FiRefreshCw className="text-gray-300" size={32} />
                            <span className="text-gray-500 font-medium">No purchase orders found</span>
                            <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPOs.map((po) => (
                        <tr
                          key={po.id}
                          onClick={() => handlePOClick(po)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{po.poNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{po.supplierName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{po.createdBy?.name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">₱{po.totalAmount?.toLocaleString() || '0'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatusBadge(po.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{po.createdAt?.toDate().toLocaleDateString() || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{po.createdAt?.toDate().toLocaleTimeString() || ''}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <POAnalytics />
          </div>
        )}

        {/* View PO Modal */}
        {showViewModal && selectedPO && (
          <ViewPOModal
            poId={selectedPO.id}
            onClose={() => {
              setShowViewModal(false);
              setSelectedPO(null);
            }}
          />
        )}
  
    </div>
  );
};

export default AdminPurchaseOrders; 