import React from 'react';

function CustomerInfo({ customerDisplayName, isBulkOrder, customerDetails, formattedDate }) {
  const customerType = isBulkOrder === null ? '' : (isBulkOrder ? '(Bulk)' : '(Walk-in)');

  return (
    <div className="border-b pb-3 mb-3">
      <h3 className="text-base font-semibold text-gray-800 mb-2">Customer Information</h3>
      <div className="space-y-1 text-sm">
        <div>
          <p className="text-xs text-gray-500">Customer:</p>
          <p className="font-medium">{customerDisplayName || 'N/A'} {customerType}</p>
          {isBulkOrder && customerDetails?.phone && (
            <p className="text-xs text-gray-600">Phone: {customerDetails.phone}</p>
          )}
          {isBulkOrder && customerDetails?.address && (
            <p className="text-xs text-gray-600 line-clamp-1" title={customerDetails.address}>
              Address: {customerDetails.address}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500">Date:</p>
          <p className="font-medium">{formattedDate}</p>
        </div>
      </div>
    </div>
  );
}

export default CustomerInfo;