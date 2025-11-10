import React, { useEffect } from 'react';
import { FiX, FiPrinter } from 'react-icons/fi';
import { printInvoiceContent } from '../../utils/ReceiptGenerator';

const ReceiptModal = ({ transaction, onClose }) => {
  if (!transaction) return null;

  // Debug: Log transaction data to see what we're receiving
  useEffect(() => {
    console.log('🧾 ReceiptModal received transaction:', transaction);
    console.log('📦 Items:', transaction.items);
    if (transaction.items && transaction.items.length > 0) {
      console.log('📋 First item structure:', transaction.items[0]);
    }
  }, [transaction]);

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
  const formatCurrency = (number) => {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  };

  // Format the timestamp when the modal opens
  const formatDateTime = (timestamp) => {
    // If no timestamp, use current date/time
    if (!timestamp) {
      const now = new Date();
      return {
        dateString: now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit'
        }),
        timeString: now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };
    }

    // Handle Firestore timestamp
    let date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // Fallback to current time if timestamp format is unexpected
      date = new Date();
    }

    return {
      dateString: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }),
      timeString: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const { dateString, timeString } = formatDateTime(transaction.createdAt);

  const handlePrintReceipt = () => {
    printInvoiceContent(transaction);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl pointer-events-auto animate-slideUp">
          {/* Enhanced Receipt Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5 flex justify-between items-center border-b border-orange-100">
            <h2 className="text-2xl font-bold text-gray-800">Receipt Details</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
            >
              <FiX className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Enhanced Receipt Content */}
          <div className="p-8 space-y-8">
            {/* Store Info with improved styling */}
            <div className="text-center space-y-3 bg-gradient-to-b from-white to-orange-50 py-6 rounded-xl">
              <h3 className="text-2xl font-bold text-gray-800">Glory Sales</h3>
              <div className="space-y-1 text-gray-600">
                <p className="text-sm font-medium">Receipt #{transaction.transactionId}</p>
                <p className="text-sm">{dateString} at {timeString}</p>
              </div>
            </div>

            {/* Enhanced Customer & Cashier Info */}
            <div className="grid grid-cols-2 gap-6 p-6 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Customer Details
                </h4>
                <p className="text-sm text-gray-600">{transaction.customerName}</p>
            
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Cashier
                </h4>
                <p className="text-sm text-gray-600">{transaction.cashierName}</p>
              </div>
            </div>

            {/* Enhanced Items Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {transaction.items.map((item, index) => {
                    // Handle multiple possible field name variations
                    const itemName = item.name || item.productName || item.variantName || 'Unknown Item';
                    const quantity = item.quantity || item.qty || 0;
                    const price = item.price || item.unitPrice || 0;
                    const total = item.totalPrice || (price * quantity);
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{itemName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">{quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                          ₱{formatCurrency(price)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                          ₱{formatCurrency(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Enhanced Totals Section */}
            <div className="space-y-3 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>₱{formatCurrency(transaction.subTotal || transaction.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax (12%)</span>
                <span>₱{formatCurrency(transaction.tax || 0)}</span>
              </div>
              <div className="h-px bg-gray-200 my-2"></div>
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>₱{formatCurrency(transaction.total || transaction.finalTotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Amount Paid</span>
                <span>₱{formatCurrency(transaction.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-green-600">
                <span>Change</span>
                <span>₱{formatCurrency(transaction.change || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Payment Method</span>
                <span className="font-medium">{transaction.paymentMethod || 'Cash'}</span>
              </div>
            </div>
          </div>

          {/* Enhanced Footer */}
          <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-4 flex justify-end gap-4">
            <button
              onClick={handlePrintReceipt}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 hover:shadow-md"
            >
              <FiPrinter className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-200 hover:shadow-md"
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
