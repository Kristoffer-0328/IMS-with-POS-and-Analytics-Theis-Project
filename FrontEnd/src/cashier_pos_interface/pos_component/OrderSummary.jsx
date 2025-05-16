import React from 'react';

// Consider passing taxRate as a prop if it can change
const DEFAULT_TAX_RATE = 0.12;

// Helper function to format currency with commas
const formatCurrency = (number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

function OrderSummary({ subTotal, tax, total, taxRate = DEFAULT_TAX_RATE }) {
  // Ensure values are numbers for display
  const displaySubTotal = typeof subTotal === 'number' ? subTotal : 0;
  const displayTax = typeof tax === 'number' ? tax : 0;
  const displayTotal = typeof total === 'number' ? total : 0;
  const displayTaxRate = typeof taxRate === 'number' ? taxRate * 100 : DEFAULT_TAX_RATE * 100;

  return (
    <div className="border-t pt-3 text-sm space-y-1">
      <div className="flex justify-between">
        <span className="text-gray-600">Subtotal:</span>
        <span className="font-medium">₱{formatCurrency(displaySubTotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">VAT ({displayTaxRate.toFixed(0)}%):</span>
        <span className="font-medium">₱{formatCurrency(displayTax)}</span>
      </div>
      <div className="flex justify-between text-base font-semibold mt-1 pt-1 border-t">
        <span>Total:</span>
        <span className="text-green-600">₱{formatCurrency(displayTotal)}</span>
      </div>
    </div>
  );
}

export default OrderSummary;