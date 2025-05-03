import React, { useEffect } from 'react';
import { FiX, FiPrinter } from 'react-icons/fi';
import { printReceiptContent } from '../../utils/ReceiptGenerator';

const ReceiptModal = ({ transaction, onClose }) => {
  if (!transaction) return null;

  // Add useEffect to handle body scroll
  useEffect(() => {
    // Disable scrolling on body when modal is open
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrolling when modal is closed
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Add this helper function at the top of your component
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace('PHP', '₱');
  };

  // Format the timestamp when the modal opens
  const formatDateTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return { dateString: 'N/A', timeString: 'N/A' };
    }

    const date = timestamp.toDate();
    return {
      dateString: date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(/,/g, '').toUpperCase(),
      timeString: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const { dateString, timeString } = formatDateTime(transaction.timestamp);

  const handlePrintReceipt = () => {
    printReceiptContent({
      receiptNumber: transaction.id,
      timestamp: transaction.timestamp?.toDate(),
      items: transaction.items,
      customerName: transaction.customerName,
      customerDetails: transaction.customerDetails,
      cashierName: transaction.cashierName,
      paymentMethod: transaction.paymentMethod,
      subTotal: transaction.subTotal,
      tax: transaction.tax,
      total: transaction.total,
      amountPaid: transaction.amountPaid,
      change: transaction.change,
      isBulkOrder: transaction.isBulkOrder
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-md" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-modalFadeIn pointer-events-auto">
          {/* Receipt Header */}
          <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Receipt Details</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiX className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Receipt Content */}
          <div className="p-8 space-y-8">
            {/* Store Info */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-gray-800">Glory Sales</h3>
              <div className="space-y-1 text-gray-600">
                <p className="text-sm font-medium">Receipt #{transaction.id}</p>
                <p className="text-sm">{dateString} at {timeString}</p>
              </div>
            </div>

            {/* Customer & Cashier Info */}
            <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 rounded-xl">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">Customer Details</h4>
                <p className="text-sm text-gray-600">{transaction.customerName}</p>
                {transaction.customerDetails && (
                  <>
                    <p className="text-sm text-gray-600">{transaction.customerDetails.phone || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{transaction.customerDetails.address || 'N/A'}</p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">Cashier</h4>
                <p className="text-sm text-gray-600">{transaction.cashierName}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {transaction.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-3 p-6 bg-gray-50 rounded-xl">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(transaction.subTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax (12%)</span>
                <span>{formatCurrency(transaction.tax)}</span>
              </div>
              <div className="h-px bg-gray-200 my-2"></div>
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Amount Paid</span>
                <span>{formatCurrency(transaction.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-green-600">
                <span>Change</span>
                <span>{formatCurrency(transaction.change)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Payment Method</span>
                <span className="font-medium">{transaction.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-6 py-4 flex justify-end gap-4">
            <button
              onClick={handlePrintReceipt}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiPrinter className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;