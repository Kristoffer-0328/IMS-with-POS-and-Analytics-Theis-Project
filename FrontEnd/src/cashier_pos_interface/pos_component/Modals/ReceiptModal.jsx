import React from 'react';
import { FiX } from 'react-icons/fi';

const ReceiptModal = ({ transaction, onClose }) => {
  if (!transaction) return null;

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

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/30 bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_40px_-15px_rgba(0,0,0,0.3)] animate-modalFadeIn">
        {/* Receipt Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-bold">Receipt Details</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-6 space-y-6">
          {/* Receipt Header Info */}
          <div className="text-center border-b pb-4">
            <h3 className="text-lg font-bold">Glory Sales</h3>
            <p className="text-sm text-gray-600">Receipt #{transaction.id}</p>
            <p className="text-sm text-gray-600">Date: {dateString}</p>
            <p className="text-sm text-gray-600">Time: {timeString}</p>
          </div>

          {/* Customer Info */}
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Customer:</span> {transaction.customerName}
            </p>
            {transaction.customerDetails && (
              <div className="text-sm">
                <p><span className="font-semibold">Phone:</span> {transaction.customerDetails.phone || 'N/A'}</p>
                <p><span className="font-semibold">Address:</span> {transaction.customerDetails.address || 'N/A'}</p>
              </div>
            )}
            <p className="text-sm">
              <span className="font-semibold">Cashier:</span> {transaction.cashierId}
            </p>
          </div>

          {/* Items Table */}
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead className="border-y border-gray-200">
                <tr>
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transaction.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">₱{item.price.toFixed(2)}</td>
                    <td className="py-2 text-right">₱{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₱{transaction.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (12%):</span>
              <span>₱{transaction.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>₱{transaction.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>₱{transaction.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Change:</span>
              <span>₱{transaction.change.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Payment Method:</span>
              <span>{transaction.paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* Footer with shadow */}
        <div className="border-t p-4 flex justify-end gap-4 sticky bottom-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors duration-200 shadow-sm"
          >
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;