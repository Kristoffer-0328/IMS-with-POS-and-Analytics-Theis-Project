import React, { useState, useEffect } from 'react';
import { FiEye, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { AnalyticsService } from '../../../../services/firebase/AnalyticsService';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import ViewPOModal from '../PurchaseOrder/ViewPOModal';
import ProcessReceiptModal from './ProcessReceiptModal';
import RejectReceiptModal from './RejectReceiptModal';
import { QRCodeCanvas } from 'qrcode.react';

const PendingReceipts = () => {
  const [pendingPOs, setPendingPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  
  const poServices = usePurchaseOrderServices();
  const { currentUser } = useAuth();

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

  const openQRForPO = (po) => {
    setSelectedPO(po);
    const base = 'http://192.168.18.13:5173';
    const url = `${base}/receiving_mobile?poId=${encodeURIComponent(po.id)}`;
    setQrUrl(url);
    setShowQRModal(true);
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
                          onClick={() => openQRForPO(po)}
                          className="px-3 py-1.5 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200"
                          title="Receive via QR"
                        >
                          Receive via QR
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

      {/* QR Modal */}
      {showQRModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowQRModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-sm z-10">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Scan to Receive</h3>
            <p className="text-sm text-gray-500 mb-4">Scan this QR code with your mobile device to open the receiving screen.</p>
            <div className="flex justify-center mb-4">
              <QRCodeCanvas value={qrUrl} size={220} includeMargin={true} />
            </div>
            <div className="bg-gray-50 rounded-md p-2 text-xs text-gray-600 break-all select-all mb-4">
              {qrUrl}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
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
    </>
  );
};

export default PendingReceipts; 