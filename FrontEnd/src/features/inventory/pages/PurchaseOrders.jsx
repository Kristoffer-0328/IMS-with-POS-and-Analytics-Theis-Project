import React, { useState, useEffect } from 'react';
import { FiPlus, FiFilter, FiRefreshCw, FiPieChart, FiTruck } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../services/firebase/PurchaseOrderServices';
import { useAuth } from '../../auth/services/FirebaseAuth';
import CreatePOModal from '../components/PurchaseOrder/CreatePOModal';
import ViewPOModal from '../components/PurchaseOrder/ViewPOModal';
import POAnalytics from '../components/PurchaseOrder/POAnalytics';
import DashboardHeader from '../components/Dashboard/DashboardHeader';

const PurchaseOrders = () => {
  const { currentUser } = useAuth();
  const poServices = usePurchaseOrderServices();
  
  // State
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
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
    if (selectedStatus !== 'all' && po.status !== selectedStatus) return false;
    if (selectedSupplier !== 'all' && (po.supplierPrimaryCode || po.supplierId) !== selectedSupplier) return false;
    if (dateRange.start && new Date(po.createdAt?.toDate()) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(po.createdAt?.toDate()) > new Date(dateRange.end)) return false;
    return true;
  });

  // Get unique suppliers for filter
  const suppliers = [...new Set(purchaseOrders.map(po => 
    JSON.stringify({ 
      id: po.supplierPrimaryCode || po.supplierId, 
      name: `${po.supplierName} (${po.supplierPrimaryCode || po.supplierId})`
    })
  ))].map(str => JSON.parse(str));

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

  // Receiving status badge renderer
  const renderReceivingStatus = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      partial: { bg: 'bg-blue-100', text: 'text-blue-800' },
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Handle PO click
  const handlePOClick = (po) => {
    setSelectedPO(po);
    setShowViewModal(true);
  };

  // Navigate to receiving
  const handleReceivingClick = (po) => {
    // Navigate to receiving page with PO details
    window.location.href = `/im/receiving?po=${po.id}`;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 bg-gray-50">
      <DashboardHeader />

      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-gray-600 mt-1">Manage and track all purchase orders</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Analytics Toggle */}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <FiPieChart size={18} />
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </button>
            
            {/* Create PO Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2.5 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-sm"
              title="Create a new Purchase Order"
            >
              <FiPlus size={18} />
              Create Purchase Order
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <div className="mb-6">
          <POAnalytics />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {/* Clear Filters Button */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setSelectedStatus('all');
              setSelectedSupplier('all');
              setDateRange({ start: '', end: '' });
            }}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* PO List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Receiving Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FiRefreshCw className="animate-spin text-blue-500" size={24} />
                      <span className="text-gray-500 font-medium">Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FiPlus className="text-gray-300" size={32} />
                      <span className="text-gray-500 font-medium">No purchase orders found</span>
                      <p className="text-gray-400 text-sm">Try adjusting your filters or create a new purchase order</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{po.poNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{po.supplierName}</div>
                      <div className="text-xs text-gray-500">({po.supplierPrimaryCode || po.supplierId})</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">₱{po.totalAmount?.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(po.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderReceivingStatus(po.receivingStatus || 'pending')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{po.createdAt?.toDate().toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{po.createdAt?.toDate().toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePOClick(po)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                        >
                          View Details
                        </button>
                        {po.status === 'approved' && (!po.receivingStatus || po.receivingStatus !== 'completed') && (
                          <button
                            onClick={() => handleReceivingClick(po)}
                            className="text-green-600 hover:text-green-800 flex items-center gap-1 font-medium text-sm transition-colors"
                          >
                            <FiTruck size={16} />
                            Receive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePOModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // Refresh will happen automatically due to listener
          }}
        />
      )}

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

export default PurchaseOrders; 