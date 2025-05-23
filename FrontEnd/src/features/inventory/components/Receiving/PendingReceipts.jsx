import React, { useState, useEffect } from 'react';
import { FiEye, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { AnalyticsService } from '../../../../services/firebase/AnalyticsService';
import ViewPOModal from '../PurchaseOrder/ViewPOModal';
import ProcessReceiptModal from './ProcessReceiptModal';
import RejectReceiptModal from './RejectReceiptModal';

const PendingReceipts = () => {
  const [pendingPOs, setPendingPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const poServices = usePurchaseOrderServices();

  useEffect(() => {
    const fetchPendingPOs = async () => {
      try {
        // Get POs that are approved but not yet fully received
        const unsubscribe = poServices.listenToPurchaseOrders((pos) => {
          const pending = pos.filter(po => 
            po.status === 'approved' && (!po.receivingStatus || po.receivingStatus !== 'completed')
          );
          setPendingPOs(pending);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching pending POs:', error);
        setLoading(false);
      }
    };

    fetchPendingPOs();
  }, []);

  const handleViewDetails = (po) => {
    setSelectedPO(po);
    setShowViewModal(true);
  };

  const handleProcessReceipt = async (po, receivedItems) => {
    try {
      setLoading(true);
      
      // First, process the receiving in PO service
      await poServices.processReceiving(po.id, receivedItems);
      
      // Then, update the inventory snapshot
      await AnalyticsService.updateInventorySnapshotAfterReceiving(receivedItems);
      
      // Close modal and refresh data
      setSelectedPO(null);
      setShowProcessModal(false);
      
      // Success message
      alert('Items received successfully and inventory updated!');
    } catch (error) {
      console.error('Error receiving items:', error);
      alert('Error receiving items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReceipt = (po) => {
    setSelectedPO(po);
    setShowRejectModal(true);
  };

  const renderStatus = (status) => {
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
                  Receiving Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingPOs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No pending receipts found
                  </td>
                </tr>
              ) : (
                pendingPOs.map((po) => (
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
                      {renderStatus(po.receivingStatus || 'pending')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(po)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPO(po);
                            setShowProcessModal(true);
                          }}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Process Receipt"
                        >
                          <FiCheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => handleRejectReceipt(po)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Reject"
                        >
                          <FiXCircle size={18} />
                        </button>
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
    </>
  );
};

export default PendingReceipts; 