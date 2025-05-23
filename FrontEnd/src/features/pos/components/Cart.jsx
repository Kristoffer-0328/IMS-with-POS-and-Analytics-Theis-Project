import React from 'react';
import { FiTrash2 } from 'react-icons/fi';

const ProductList = ({ cartItems: addedProducts, onRemoveItem, isProcessing }) => {
  if (addedProducts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No products added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-700 mb-4">Added Products</h3>
      <div className="space-y-3">
        {addedProducts.map((item, index) => (
          <div
            key={`${item.variantId}-${index}`}
            className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
              <div className="mt-1 flex items-center text-sm text-gray-500 space-x-2">
                <span>{item.qty} {item.unit}</span>
                <span>×</span>
                <span>{item.formattedPrice}</span>
              </div>
            </div>
            <div className="ml-4 flex flex-col items-end">
              <div className="font-medium text-gray-900">
                {item.formattedTotal}
              </div>
              <button
                onClick={() => onRemoveItem(index)}
                disabled={isProcessing}
                className="mt-1 text-gray-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;