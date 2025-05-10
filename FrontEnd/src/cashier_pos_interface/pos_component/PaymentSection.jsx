import React from 'react';
import { FiPrinter } from 'react-icons/fi';

// Add this helper function at the top after imports
const formatMoney = (amount) => {
  const number = parseFloat(amount);
  return isNaN(number) ? '0.00' : number.toLocaleString('en-PH', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

function PaymentSection({
  paymentMethod,
  setPaymentMethod,
  amountPaid,
  setAmountPaid,
  total,
  isProcessing,
  cartIsEmpty,
  onPrintAndSave
}) {
  const parsedAmountPaid = parseFloat(amountPaid);
  const isValidAmountPaid = !isNaN(parsedAmountPaid) && parsedAmountPaid >= 0; // Ensure positive amount
  const displayTotal = typeof total === 'number' ? total : 0; // Ensure total is a number

  // Calculate change only if amount paid is valid and sufficient
  const isAmountSufficient = isValidAmountPaid && parsedAmountPaid >= displayTotal;
  const change = isAmountSufficient ? parsedAmountPaid - displayTotal : 0;

  const isButtonDisabled =
    isProcessing ||
    cartIsEmpty ||
    !amountPaid || // Check if amountPaid input is empty
    !isValidAmountPaid ||
    !isAmountSufficient;

  return (
    <div className="mt-3"> {/* Use mt-3 for spacing consistent with OrderSummary */}
      {/* Payment Inputs */}
      <div className="space-y-2">
        <div>
          <label htmlFor="paymentMethodSelect" className="text-xs text-gray-600 block mb-0.5">Payment Method</label>
          <select
            id="paymentMethodSelect" // Added ID for label association
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-1.5 border border-gray-200 rounded-md text-sm bg-white focus:ring-1 focus:ring-orange-300 focus:border-orange-300" // Added focus styles
            disabled={isProcessing || cartIsEmpty}
          >
            <option value="Cash">Cash</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="GCash">GCash</option>
            <option value="Maya">Maya</option>
            {/* Add more methods as needed */}
          </select>
        </div>
        <div>
          <label htmlFor="amountPaidInput" className="text-xs text-gray-600 block mb-0.5">Amount Paid</label>
          <input
            id="amountPaidInput" // Added ID for label association
            type="number"
            required
            value={amountPaid} // Keep as number for input
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder={displayTotal > 0 ? `₱${formatMoney(displayTotal)}` : "0.00"}
            min={displayTotal > 0 ? displayTotal.toFixed(2) : "0"}
            step="0.01"
            className="w-full p-1.5 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-orange-300 focus:border-orange-300" // Added focus styles
            disabled={isProcessing || cartIsEmpty}
            aria-invalid={!cartIsEmpty && amountPaid && !isAmountSufficient} // Accessibility
          />
          {/* Basic validation message example */}
          {!cartIsEmpty && amountPaid && !isAmountSufficient && (
            <p className="text-xs text-red-500 mt-0.5">Amount must be at least ₱{formatMoney(displayTotal)}</p>
          )}
        </div>
        {/* Change/Amount Due Display */}
        {amountPaid && isValidAmountPaid && !cartIsEmpty && (
          <div className={`flex justify-between text-sm font-medium mt-1 ${isAmountSufficient ? 'text-blue-600' : 'text-red-600'}`}>
            {/* Use Amount Due only if explicitly needed, Change is more common */}
            <span>Change:</span>
            {/* Show change only if sufficient, otherwise maybe show amount still needed? */}
            <span>{isAmountSufficient ? `₱${formatMoney(change)}` : `-`}</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-4 flex justify-end items-center">
        <button
          onClick={onPrintAndSave}
          type="button" // Explicitly set type
          className={`px-6 py-2 rounded-lg transition font-medium text-sm flex items-center justify-center gap-2 min-w-[140px] ${
            isButtonDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500' // Added focus styles
          }`}
          disabled={isButtonDisabled}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <FiPrinter size={16} />
              <span>Print & Save</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default PaymentSection;