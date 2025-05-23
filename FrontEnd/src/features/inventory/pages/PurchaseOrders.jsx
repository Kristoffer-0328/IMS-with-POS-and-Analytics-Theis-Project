import React, { useState, useEffect } from 'react';
import { FiPlus, FiFilter, FiRefreshCw, FiPieChart, FiTruck } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../services/firebase/PurchaseOrderServices';
import { useAuth } from '../../auth/services/FirebaseAuth';
import CreatePOModal from '../components/PurchaseOrder/CreatePOModal';
import SupplierPOModal from '../components/PurchaseOrder/SupplierPOModal';
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
  const [showSupplierModal, setShowSupplierModal] = useState(false);
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
    if (selectedSupplier !== 'all' && po.supplierId !== selectedSupplier) return false;
    if (dateRange.start && new Date(po.createdAt?.toDate()) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(po.createdAt?.toDate()) > new Date(dateRange.end)) return false;
    return true;
  });

  // Get unique suppliers for filter
  const suppliers = [...new Set(purchaseOrders.map(po => 
    JSON.stringify({ id: po.supplierId, name: po.supplierName })
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

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPieChart />
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </button>
          <button
            onClick={() => setShowSupplierModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <FiPlus />
            Create PO by Supplier
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <FiPlus />
            Create PO by Product
          </button>
        </div>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <div className="mb-6">
          <POAnalytics />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* PO List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receiving Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <FiRefreshCw className="animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {po.poNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.supplierName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₱{po.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(po.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderReceivingStatus(po.receivingStatus || 'pending')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.createdAt?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePOClick(po)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        {po.status === 'approved' && (!po.receivingStatus || po.receivingStatus !== 'completed') && (
                          <button
                            onClick={() => handleReceivingClick(po)}
                            className="text-green-600 hover:text-green-800 flex items-center gap-1"
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
      {showSupplierModal && (
        <SupplierPOModal
          onClose={() => setShowSupplierModal(false)}
          onSuccess={() => {
            setShowSupplierModal(false);
            // Refresh will happen automatically due to listener
          }}
        />
      )}
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