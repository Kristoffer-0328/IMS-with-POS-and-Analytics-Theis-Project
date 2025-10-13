import React, { useMemo } from 'react';
import { FiTrash2, FiMapPin } from 'react-icons/fi';

const formatCurrency = (number) => {
  return `₱${Number(number).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const ProductList = ({ cartItems: addedProducts, onRemoveItem, isProcessing }) => {
  // Group products by product identity (name + variant), then show different locations
  const groupedByProduct = useMemo(() => {
    const groups = {};
    
    addedProducts.forEach((item) => {
      // Create a unique key for the same product (name + size + unit + price)
      const productKey = `${item.baseName || item.name}-${item.price}`;
      
      if (!groups[productKey]) {
        groups[productKey] = {
          productName: item.name,
          baseName: item.baseName || item.name,
          price: item.price,
          unit: item.unit,
          totalQuantity: 0,
          locations: []
        };
      }
      
      // Add this location to the product
      groups[productKey].locations.push({
        ...item,
        locationKey: item.fullLocation || 
                     `${item.storageLocation}/${item.shelfName}/${item.rowName}/${item.columnIndex}`,
        storageLocation: item.storageLocation || 'Unknown',
        shelfName: item.shelfName || '',
        rowName: item.rowName || '',
        columnIndex: item.columnIndex || ''
      });
      
      groups[productKey].totalQuantity += item.qty;
    });
    
    return Object.values(groups);
  }, [addedProducts]);

  if (addedProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No products added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupedByProduct.map((productGroup, groupIndex) => (
        <div key={`product-${groupIndex}`} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {/* Product Header */}
          <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1">
                  {productGroup.productName}
                </h4>
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  <span className="font-medium text-orange-600">
                    Total: {productGroup.totalQuantity} {productGroup.unit || 'pcs'}
                  </span>
                  <span>×</span>
                  <span>{formatCurrency(productGroup.price)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-orange-600 text-sm">
                  {formatCurrency(productGroup.price * productGroup.totalQuantity)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {productGroup.locations.length} {productGroup.locations.length === 1 ? 'location' : 'locations'}
                </div>
              </div>
            </div>
          </div>

          {/* Locations for this product */}
          <div className="divide-y divide-gray-100">
            {productGroup.locations.map((location, locIndex) => (
              <div
                key={`${location.variantId}-${location.originalIndex || locIndex}`}
                className="px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FiMapPin className="text-blue-500 flex-shrink-0" size={12} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {location.storageLocation}
                      </p>
                      {location.shelfName && (
                        <p className="text-xs text-gray-500 truncate">
                          {location.shelfName} → {location.rowName} → Col {location.columnIndex}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-2">
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">
                        {location.qty} {location.unit || 'pcs'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(location.price * location.qty)}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(location.originalIndex !== undefined ? location.originalIndex : locIndex)}
                      disabled={isProcessing}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 rounded flex-shrink-0"
                      title="Remove from this location"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;