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
  total,
  formattedTotal,
  formattedChange,
  isProcessing,
  hasProducts,
  onPrintAndSave
}) => {
  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmountPaid(value);
  };

  const change = Number(amountPaid) - total;
  const insufficientAmount = Number(amountPaid) < total;
  const canComplete = hasProducts && !isProcessing && Number(amountPaid) >= total;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Payment Method</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPaymentMethod('Cash')}
            disabled={isProcessing}
            className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 ${
              paymentMethod === 'Cash'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="text-lg font-semibold">₱</span>
            Cash
          </button>
          <button
            onClick={() => setPaymentMethod('Card')}
            disabled={isProcessing}
            className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 ${
              paymentMethod === 'Card'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FiCreditCard />
            Card
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Amount Paid</h3>
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

      <div className="flex justify-between text-sm">
        <span>Change:</span>
        <span className={`font-medium ${change < 0 ? 'text-red-500' : 'text-green-500'}`}>
          {formattedChange}
        </span>
      </div>

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
        ) : (
          'Complete Sale'
        )}
      </button>
    </div>
  );
};

export default PaymentSection;