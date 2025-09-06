import React, { useState, useEffect } from 'react';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../services/firebase/PurchaseOrderServices';
import { useAuth } from '../../auth/services/FirebaseAuth';
import ViewPOModal from '../../inventory/components/PurchaseOrder/ViewPOModal';

const AdminPurchaseOrders = () => {
  const { currentUser } = useAuth();
  const poServices = usePurchaseOrderServices();
  
  // State
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
    console.log('Setting up PO listener...');
    const unsubscribe = poServices.listenToPurchaseOrders((pos) => {
      console.log('Received POs:', pos);
      setPurchaseOrders(pos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter POs
  const filteredPOs = purchaseOrders.filter(po => {
    console.log('Filtering PO:', po);
    if (selectedStatus !== 'all' && po.status !== selectedStatus) {
      console.log('Filtered out due to status:', po.status, 'vs', selectedStatus);
      return false;
    }
    if (dateRange.start && new Date(po.createdAt?.toDate()) < new Date(dateRange.start)) {
      console.log('Filtered out due to start date');
      return false;
    }
    if (dateRange.end && new Date(po.createdAt?.toDate()) > new Date(dateRange.end)) {
      console.log('Filtered out due to end date');
      return false;
    }
    console.log('PO passed filters');
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
    <div className="container mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
        <p className="text-gray-600">Review and approve purchase orders</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-center p-4 bg-white rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-500" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPOs.map((po) => (
                <tr
                  key={po.id}
                  onClick={() => handlePOClick(po)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {po.poNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {po.supplierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {po.createdBy?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₱{po.totalAmount?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(po.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {po.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPOs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No purchase orders found
          </div>
        )}
      </div>

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