import React, { useState, useEffect } from 'react';
import { FiEye, FiDownload, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const db = getFirestore(app);

const CompletedReceipts = () => {
  const [completedReceipts, setCompletedReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const fetchCompletedReceipts = async () => {
      try {
        // Fetch completed receiving transactions
        const transactionsRef = collection(db, 'receivingTransactions');
        const q = query(transactionsRef, where('status', '==', 'completed'), orderBy('createdAt', 'desc'));
        const transactionsSnapshot = await getDocs(q);

        const receipts = [];
        for (const transactionDoc of transactionsSnapshot.docs) {
          const transactionData = transactionDoc.data();

          // Get PO details if available
          let poData = null;
          if (transactionData.poId) {
            try {
              const poRef = doc(db, 'purchase_orders', transactionData.poId);
              const poDoc = await getDoc(poRef);
              if (poDoc.exists()) {
                poData = poDoc.data();
              }
            } catch (error) {
              console.error('Error fetching PO data:', error);
            }
          }

          receipts.push({
            id: transactionDoc.id,
            ...transactionData,
            poData
          });
        }

        setCompletedReceipts(receipts);
      } catch (error) {
        console.error('Error fetching completed receipts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedReceipts();
  }, []);

  const handleViewDetails = (receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <h2 className="text-xl font-semibold text-gray-900">Completed Receipts</h2>
          <p className="text-sm text-gray-500 mt-1">View completed receiving transactions and summaries</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items Received
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {completedReceipts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No completed receipts found
                  </td>
                </tr>
              ) : (
                completedReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {receipt.transactionId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.poData?.poNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.poData?.supplierName || receipt.summary?.supplier || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(receipt.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.items?.length || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ₱{receipt.summary?.totalReceivedValue?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleViewDetails(receipt)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <FiEye size={16} />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Receipt Details - {selectedReceipt.transactionId}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiXCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Transaction Summary */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Transaction Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="font-medium">{selectedReceipt.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">PO Number:</span>
                      <span className="font-medium">{selectedReceipt.poData?.poNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">{formatDate(selectedReceipt.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-green-600">Completed</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Delivery Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">DR Number:</span>
                      <span className="font-medium">{selectedReceipt.deliveryDetails?.drNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Driver:</span>
                      <span className="font-medium">{selectedReceipt.deliveryDetails?.driverName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Received By:</span>
                      <span className="font-medium">{selectedReceipt.deliveryDetails?.receivedBy || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Date:</span>
                      <span className="font-medium">{selectedReceipt.deliveryDetails?.deliveryDateTime ? formatDate(selectedReceipt.deliveryDetails.deliveryDateTime) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Received */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900">Items Received</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accepted</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejected</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReceipt.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {item.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {item.expectedQuantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-600 font-medium">
                            {item.receivedQuantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600 font-medium">
                            {item.rejectedQuantity || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            ₱{item.unitPrice?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            ₱{((item.receivedQuantity || 0) * (item.unitPrice || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="5" className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          Total Value:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600">
                          ₱{selectedReceipt.summary?.totalReceivedValue?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-blue-600 text-sm font-medium">Total Items</p>
                  <p className="text-2xl font-bold text-blue-700">{selectedReceipt.summary?.itemsCount || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-green-600 text-sm font-medium">Items Received</p>
                  <p className="text-2xl font-bold text-green-700">{selectedReceipt.summary?.receivedItemsCount || 0}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <p className="text-orange-600 text-sm font-medium">Order Value</p>
                  <p className="text-2xl font-bold text-orange-700">₱{selectedReceipt.summary?.totalOrderValue?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-purple-600 text-sm font-medium">Received Value</p>
                  <p className="text-2xl font-bold text-purple-700">₱{selectedReceipt.summary?.totalReceivedValue?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompletedReceipts;
