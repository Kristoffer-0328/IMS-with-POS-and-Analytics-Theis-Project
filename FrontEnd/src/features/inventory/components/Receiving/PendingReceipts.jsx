import React, { useState, useEffect } from 'react';
import { FiEye, FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiPackage, FiClock } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { AnalyticsService } from '../../../../services/firebase/AnalyticsService';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import ViewPOModal from '../PurchaseOrder/ViewPOModal';
import ProcessReceiptModal from './ProcessReceiptModal';
import RejectReceiptModal from './RejectReceiptModal';
import ViewReceivingTransactionModal from './ViewReceivingTransactionModal';
import { QRCodeSVG } from 'qrcode.react';

const PendingReceipts = () => {
  const [allPOs, setAllPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, receiving_in_progress, partial, completed, received
  
  const poServices = usePurchaseOrderServices();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchAllPOs = async () => {
      try {
        // Get all approved POs (pending, receiving in progress, and completed receiving)
        const unsubscribe = poServices.listenToPurchaseOrders((pos) => {
          const approved = pos.filter(po => po.status === 'approved' || po.status === 'received' || po.status === 'receiving_in_progress');
          setAllPOs(approved);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching POs:', error);
        setLoading(false);
      }
    };

    fetchAllPOs();
  }, []);

  const handleViewDetails = (po) => {
    setSelectedPO(po);
    if (po.status === 'received') {
      setShowTransactionModal(true);
    } else {
      setShowViewModal(true);
    }
  };

  const handleProcessReceipt = async (po, receivedItems) => {
    try {
      setLoading(true);
      
      // Prepare items with all necessary information
      const itemsToProcess = receivedItems.map(item => ({
        ...item,
        productId: item.productId,
        category: item.category,
        variantId: item.variantId || null,  // Add variant ID if it exists
        brand: item.brand || null,          // Add brand information
        receivedBy: {
          id: currentUser.uid,
          name: currentUser.name
        }
      }));
      
      // First, process the receiving in PO service
      const result = await poServices.processReceiving(po.id, itemsToProcess);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process receiving');
      }
      
      // Then, update the inventory snapshot
      await AnalyticsService.updateInventorySnapshotAfterReceiving(itemsToProcess);
      
      // Close modal and refresh data
      setSelectedPO(null);
      setShowProcessModal(false);
      
      // Success message
      alert('Items received successfully and inventory updated!');
    } catch (error) {
      console.error('Error receiving items:', error);
      alert('Error receiving items: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReceipt = (po) => {
    setSelectedPO(po);
    setShowRejectModal(true);
  };

  const openQRForPO = (po) => {
    setSelectedPO(po);
    // Generate QR URL for mobile receiving with PO ID
    const baseUrl = window.location.origin;
    const qrUrl = `${baseUrl}/receiving_mobile?poId=${po.id}`;
    setQrUrl(qrUrl);
    setShowQRModal(true);
  };

  // Filter POs
  const filteredPOs = allPOs.filter(po => {
    const matchesSearch = searchQuery === '' || 
      po.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.createdBy?.toLowerCase().includes(searchQuery.toLowerCase());

    const poStatus = po.status;
    const matchesStatus = statusFilter === 'all' || poStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const renderStatus = (status) => {
    const statusConfig = {
      approved: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      receiving_in_progress: { bg: 'bg-orange-100', text: 'text-orange-800' },
      partial: { bg: 'bg-blue-100', text: 'text-blue-800' },
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      received: { bg: 'bg-green-100', text: 'text-green-800' },
    };

    const config = statusConfig[status] || statusConfig.approved;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status === 'received' ? 'RECEIVED' :
         status === 'receiving_in_progress' ? 'RECEIVING' :
         status === 'approved' ? 'PENDING' :
         status.toUpperCase()}
      </span>
    );
  };

  // Calculate statistics
  const stats = {
    total: allPOs.length,
    pending: allPOs.filter(po => po.status === 'approved').length,
    receiving: allPOs.filter(po => po.status === 'receiving_in_progress').length,
    partial: allPOs.filter(po => po.receivingStatus === 'partial').length,
    completed: allPOs.filter(po => po.status === 'received' || po.receivingStatus === 'completed').length,
    totalItems: allPOs.reduce((sum, po) => sum + (po.items?.length || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">All Receipts</h2>
          <p className="text-sm text-gray-500 mt-1">Manage pending receipts and view completed transactions</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-6 border-b border-gray-200">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total POs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiPackage className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FiClock className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Receiving</p>
                <p className="text-2xl font-bold text-orange-600">{stats.receiving}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FiEye className="text-orange-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FiCheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiFilter className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by PO number, supplier, or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Status</option>
                <option value="approved">Pending</option>
                <option value="receiving_in_progress">Receiving</option>
                <option value="partial">Partial</option>
                <option value="completed">Completed</option>
                <option value="received">Received</option>
              </select>
            </div>
          </div>
        </div>

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
                  Expected Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No receipts found
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {po.poNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.supplierName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not specified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.items?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatus(po.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {po.status === 'received' ? (
                          <button
                            onClick={() => handleViewDetails(po)}
                            className="px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
                            title="View Receipt Details"
                          >
                            View Details
                          </button>
                        ) : (
                          <button
                            onClick={() => openQRForPO(po)}
                            className="px-3 py-1.5 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200"
                            title="Receive via QR"
                          >
                            Receive via QR
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

      {/* QR Modal */}
      {showQRModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Receive Items - QR Code</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiXCircle size={24} />
                </button>
              </div>

              {/* PO Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">PO Number:</span>
                    <p className="text-gray-900">{selectedPO.poNumber}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Supplier:</span>
                    <p className="text-gray-900">{selectedPO.supplierName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Delivery Date:</span>
                    <p className="text-gray-900">
                      {selectedPO.deliveryDate ? new Date(selectedPO.deliveryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Items:</span>
                    <p className="text-gray-900">{selectedPO.items?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-3">Items to Receive:</h4>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-center">Expected Qty</th>
                        <th className="px-4 py-2 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedPO.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">{item.productName}</td>
                          <td className="px-4 py-2 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">₱{(item.unitPrice * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center mb-6">
                <p className="text-sm text-gray-600 mb-4">Scan this QR code to process receiving on mobile</p>
                <div className="p-6 bg-white border-4 border-orange-500 rounded-lg">
                  <QRCodeSVG
                    value={qrUrl}
                    size={256}
                    level="H"
                  />
                </div>
           
              </div>

           
            </div>
          </div>
        </div>
      )}

      {/* Existing Modals (kept for now; not used by QR flow) */}
      {showViewModal && selectedPO && (
        <ViewPOModal
          poId={selectedPO.id}
          onClose={() => {
            setShowViewModal(false);
            setSelectedPO(null);
          }}
        />
      )}

      {showProcessModal && selectedPO && (
        <ProcessReceiptModal
          po={selectedPO}
          onClose={() => {
            setShowProcessModal(false);
            setSelectedPO(null);
          }}
          onProcess={handleProcessReceipt}
        />
      )}

      {showRejectModal && selectedPO && (
        <RejectReceiptModal
          po={selectedPO}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedPO(null);
          }}
        />
      )}

      {showTransactionModal && selectedPO && (
        <ViewReceivingTransactionModal
          poId={selectedPO.id}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedPO(null);
          }}
        />
      )}
    </>
  );
};

export default PendingReceipts;
