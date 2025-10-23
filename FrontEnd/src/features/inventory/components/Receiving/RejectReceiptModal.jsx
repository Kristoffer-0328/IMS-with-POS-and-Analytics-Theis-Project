import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';

const RejectReceiptModal = ({ po, onClose }) => {
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const poServices = usePurchaseOrderServices();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Update PO with rejection details
      await poServices.updatePurchaseOrder(po.id, {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date()
      });

      onClose();
    } catch (error) {
      console.error('Error rejecting receipt:', error);
      alert('Failed to reject receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Reject Receipt - PO #{po.poNumber}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this receipt..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className={`px-4 py-2 bg-red-500 text-white rounded-lg
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
            >
              {isProcessing ? 'Rejecting...' : 'Reject Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectReceiptModal; 
