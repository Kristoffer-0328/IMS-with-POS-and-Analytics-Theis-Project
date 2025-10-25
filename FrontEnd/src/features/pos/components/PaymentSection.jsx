import React from 'react';
import { FiCreditCard } from 'react-icons/fi';

// Add this helper function at the top after imports
const formatMoney = (amount) => {
  const number = parseFloat(amount);
  return isNaN(number) ? '0.00' : number.toLocaleString('en-PH', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const PaymentSection = ({
  paymentMethod,
  setPaymentMethod,
  amountPaid,
  setAmountPaid,
  paymentReference,
  setPaymentReference,
  total,
  formattedTotal,
  formattedChange,
  isProcessing,
  hasProducts,
  onPrintAndSave,
  transactionType,
  checkoutButtonText
}) => {
  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmountPaid(value);
  };

  const handleReferenceChange = (e) => {
    const value = e.target.value.toUpperCase();
    setPaymentReference(value);
  };

  const change = Number(amountPaid) - total;
  
  // For digital payments (GCash, Online Banking), require reference number
  const needsReference = (paymentMethod === 'GCash' || paymentMethod === 'Online Banking');
  const hasValidReference = !needsReference || (paymentReference && paymentReference.trim().length > 0);
  
  // Since this is always an invoice (walk-in) page, always require payment validation
  const canComplete = hasProducts && !isProcessing && Number(amountPaid) >= total && hasValidReference;
  
  const insufficientAmount = Number(amountPaid) < total;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Payment Method</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setPaymentMethod('Cash')}
            disabled={isProcessing}
            className={`py-2 px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
              paymentMethod === 'Cash'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="text-lg font-semibold">₱</span>
            <span className="text-xs font-medium">Cash</span>
          </button>
          
          <button
            onClick={() => setPaymentMethod('GCash')}
            disabled={isProcessing}
            className={`py-2 px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
              paymentMethod === 'GCash'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.89-8.9L15 13.21 12.89 16H11l2.11-2.79-2.1-2.11H13z"/>
            </svg>
            <span className="text-xs font-medium">GCash</span>
          </button>

          <button
            onClick={() => setPaymentMethod('Online Banking')}
            disabled={isProcessing}
            className={`py-2 px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
              paymentMethod === 'Online Banking'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-xs font-medium">Online</span>
          </button>
        </div>
      </div>

      {/* Transaction Reference - Show for digital payments */}
      {needsReference && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Transaction Reference</h3>
          <input
            type="text"
            value={paymentReference}
            onChange={handleReferenceChange}
            disabled={isProcessing}
            placeholder="Transaction Reference # "
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500">
            Enter the reference number from your {paymentMethod} transaction
          </p>
        </div>
      )}

      {/* Amount Paid - Always show for invoice transactions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Amount Paid</h3>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
          <input
            type="text"
            value={amountPaid}
            onChange={handleAmountChange}
            disabled={isProcessing}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <span>Total Amount:</span>
        <span className="font-medium">{formattedTotal}</span>
      </div>

      {paymentMethod === 'Cash' && (
        <div className="flex justify-between text-sm">
          <span>Change:</span>
          <span className={`font-medium ${change < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {formattedChange}
          </span>
        </div>
      )}

      <button
        onClick={onPrintAndSave}
        disabled={!canComplete}
        className={`
          w-full py-3 px-4 rounded-lg font-medium
          transition-colors duration-200
          ${canComplete
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : !hasProducts ? (
          'No Products Added'
        ) : insufficientAmount ? (
          'Insufficient Amount'
        ) : needsReference && !hasValidReference ? (
          'Enter Transaction Reference'
        ) : (
          checkoutButtonText
        )}
      </button>
    </div>
  );
};

export default PaymentSection;
