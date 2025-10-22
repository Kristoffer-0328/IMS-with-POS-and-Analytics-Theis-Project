import React, { useState, useEffect } from 'react';
import { FiX, FiDownload, FiPrinter } from 'react-icons/fi';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const db = getFirestore(app);

const ViewReceivingTransactionModal = ({ transactionId, poId, onClose }) => {
  const [transaction, setTransaction] = useState(null);
  const [poData, setPoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactionData = async () => {
      try {
        setLoading(true);

        // Fetch receiving transaction
        let transactionData = null;
        if (transactionId) {
          const transactionQuery = query(
            collection(db, 'receivingTransactions'),
            where('transactionId', '==', transactionId)
          );
          const transactionSnapshot = await getDocs(transactionQuery);
          if (!transactionSnapshot.empty) {
            transactionData = { id: transactionSnapshot.docs[0].id, ...transactionSnapshot.docs[0].data() };
          }
        } else if (poId) {
          // If no transactionId provided, find by poId
          const transactionQuery = query(
            collection(db, 'receivingTransactions'),
            where('poId', '==', poId)
          );
          const transactionSnapshot = await getDocs(transactionQuery);
          if (!transactionSnapshot.empty) {
            // Get the most recent transaction for this PO
            const transactions = transactionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            transactionData = transactions.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())[0];
          }
        }

        // Fetch PO data for additional context
        let poInfo = null;
        if (poId) {
          const poQuery = query(collection(db, 'purchase_orders'), where('__name__', '==', poId));
          const poSnapshot = await getDocs(poQuery);
          if (!poSnapshot.empty) {
            poInfo = { id: poSnapshot.docs[0].id, ...poSnapshot.docs[0].data() };
          }
        }

        setTransaction(transactionData);
        setPoData(poInfo);
      } catch (error) {
        console.error('Error fetching transaction data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (transactionId || poId) {
      fetchTransactionData();
    }
  }, [transactionId, poId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Simple text-based download for now
    const content = generateReportText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receiving-transaction-${transaction?.transactionId || 'report'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReportText = () => {
    if (!transaction) return 'No transaction data available';

    let report = `RECEIVING TRANSACTION REPORT\n`;
    report += `================================\n\n`;
    report += `Transaction ID: ${transaction.transactionId}\n`;
    report += `PO Number: ${poData?.poNumber || 'N/A'}\n`;
    report += `Status: ${transaction.status?.toUpperCase() || 'COMPLETED'}\n`;
    report += `Created: ${formatDate(transaction.createdAt)}\n\n`;

    report += `DELIVERY DETAILS\n`;
    report += `----------------\n`;
    report += `DR Number: ${transaction.deliveryDetails?.drNumber || 'N/A'}\n`;
    report += `Invoice Number: ${transaction.deliveryDetails?.invoiceNumber || 'N/A'}\n`;
    report += `Driver: ${transaction.deliveryDetails?.driverName || 'N/A'}\n`;
    report += `Delivery Date: ${formatDate(transaction.deliveryDetails?.deliveryDateTime)}\n`;
    report += `Received By: ${transaction.deliveryDetails?.receivedBy || 'N/A'}\n`;
    report += `Project Site: ${transaction.deliveryDetails?.projectSite || 'N/A'}\n\n`;

    report += `SUMMARY\n`;
    report += `-------\n`;
    report += `Total Order Value: ${formatCurrency(transaction.summary?.totalOrderValue)}\n`;
    report += `Total Received Value: ${formatCurrency(transaction.summary?.totalReceivedValue)}\n`;
    report += `Items in Order: ${transaction.summary?.itemsCount || 0}\n`;
    report += `Items Received: ${transaction.summary?.receivedItemsCount || 0}\n\n`;

    report += `RECEIVED ITEMS\n`;
    report += `--------------\n`;
    transaction.items?.forEach((item, index) => {
      report += `${index + 1}. ${item.productName}\n`;
      report += `   SKU: ${item.sku || 'N/A'}\n`;
      report += `   Expected: ${item.expectedQuantity || 0} ${item.unit || 'pcs'}\n`;
      report += `   Received: ${item.receivedQuantity || 0} ${item.unit || 'pcs'}\n`;
      report += `   Rejected: ${item.rejectedQuantity || 0} ${item.unit || 'pcs'}\n`;
      report += `   Unit Price: ${formatCurrency(item.unitPrice)}\n`;
      report += `   Total Value: ${formatCurrency((item.receivedQuantity || 0) * (item.unitPrice || 0))}\n`;
      if (item.notes) report += `   Notes: ${item.notes}\n`;
      report += `\n`;
    });

    return report;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl z-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Transaction Not Found</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600">No receiving transaction data found for this purchase order.</p>
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Receiving Transaction Details</h2>
            <p className="text-sm text-gray-500 mt-1">
              Transaction ID: {transaction.transactionId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2"
            >
              <FiDownload className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <FiPrinter className="w-4 h-4" />
              Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Status and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {transaction.status?.toUpperCase() || 'COMPLETED'}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">PO Number</h3>
              <p className="text-lg font-semibold text-gray-900">{poData?.poNumber || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Transaction Date</h3>
              <p className="text-lg font-semibold text-gray-900">{formatDate(transaction.createdAt)}</p>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">DR Number</label>
                <p className="text-sm text-gray-900">{transaction.deliveryDetails?.drNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Invoice Number</label>
                <p className="text-sm text-gray-900">{transaction.deliveryDetails?.invoiceNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Driver Name</label>
                <p className="text-sm text-gray-900">{transaction.deliveryDetails?.driverName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Delivery Date & Time</label>
                <p className="text-sm text-gray-900">{formatDate(transaction.deliveryDetails?.deliveryDateTime)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Received By</label>
                <p className="text-sm text-gray-900">{transaction.deliveryDetails?.receivedBy || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Project Site</label>
                <p className="text-sm text-gray-900">{transaction.deliveryDetails?.projectSite || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{transaction.summary?.itemsCount || 0}</p>
                <p className="text-sm text-gray-500">Items Ordered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{transaction.summary?.receivedItemsCount || 0}</p>
                <p className="text-sm text-gray-500">Items Received</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(transaction.summary?.totalOrderValue)}</p>
                <p className="text-sm text-gray-500">Order Value</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(transaction.summary?.totalReceivedValue)}</p>
                <p className="text-sm text-gray-500">Received Value</p>
              </div>
            </div>
          </div>

          {/* Received Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Received Items</h3>
            <div className="space-y-4">
              {transaction.items?.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                      <p className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Unit Price</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(item.unitPrice)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Expected</p>
                      <p className="font-medium text-gray-900">{item.expectedQuantity || 0} {item.unit || 'pcs'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Received</p>
                      <p className="font-medium text-green-600">{item.receivedQuantity || 0} {item.unit || 'pcs'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Rejected</p>
                      <p className="font-medium text-red-600">{item.rejectedQuantity || 0} {item.unit || 'pcs'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Value</p>
                      <p className="font-medium text-gray-900">{formatCurrency((item.receivedQuantity || 0) * (item.unitPrice || 0))}</p>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{item.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewReceivingTransactionModal;