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
          price: item.price, // This is price per piece
          bundlePrice: item.bundlePrice, // Original bundle price if bundle product
          unit: item.unit,
          totalQuantity: 0,
          locations: [],
          isBundle: item.isBundle,
          piecesPerBundle: item.piecesPerBundle,
          bundlePackagingType: item.bundlePackagingType,
          baseUnit: item.baseUnit,
          formattedDimensions: item.formattedDimensions
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
                <div className="flex flex-col gap-1">
                  {/* Bundle or dimension info */}
                  {productGroup.isBundle && productGroup.piecesPerBundle ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          📦 Bundle
                        </span>
                        <span className="text-xs text-gray-600">
                          {productGroup.piecesPerBundle} {productGroup.baseUnit || 'pcs'} per {productGroup.bundlePackagingType || 'bundle'}
                        </span>
                      </div>
                      {/* Show pricing information for bundles */}
                      <div className="bg-purple-50 rounded px-2 py-1 text-xs space-y-0.5">
                        {productGroup.bundlePrice && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-purple-600">Bundle Price:</span>
                            <span className="font-medium text-purple-700">
                              {formatCurrency(productGroup.bundlePrice)} / {productGroup.bundlePackagingType || 'bundle'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-purple-600">Price per {productGroup.baseUnit || 'pc'}:</span>
                          <span className="font-medium text-purple-700">{formatCurrency(productGroup.price)}</span>
                        </div>
                      </div>
                    </>
                  ) : productGroup.formattedDimensions ? (
                    <span className="text-xs text-gray-600">
                      📏 {productGroup.formattedDimensions}
                    </span>
                  ) : null}
                  
                  {/* Total quantity and price per unit */}
                  <div className="flex items-center text-xs text-gray-500 space-x-2">
                    <span className="font-medium text-orange-600">
                      {productGroup.isBundle ? (
                        <>
                          Total: {Math.floor(productGroup.totalQuantity / (productGroup.piecesPerBundle || 1))} {productGroup.bundlePackagingType || 'bundles'}
                          {productGroup.totalQuantity % (productGroup.piecesPerBundle || 1) > 0 && (
                            <span className="ml-1 text-blue-600">
                              + {productGroup.totalQuantity % (productGroup.piecesPerBundle || 1)} {productGroup.baseUnit || 'pcs'}
                            </span>
                          )}
                        </>
                      ) : (
                        <>Total: {productGroup.totalQuantity} {productGroup.unit || 'pcs'}</>
                      )}
                    </span>
                    <span>×</span>
                    <span>{formatCurrency(productGroup.price)}</span>
                  </div>
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
                      {location.isBundle && location.piecesPerBundle ? (
                        <>
                          <p className="text-xs font-medium text-gray-700">
                            {Math.floor(location.qty / location.piecesPerBundle)} {location.bundlePackagingType || 'bundles'}
                            {location.qty % location.piecesPerBundle > 0 && (
                              <span className="ml-1 text-blue-600">
                                + {location.qty % location.piecesPerBundle} {location.baseUnit || 'pcs'}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-purple-600 font-medium">
                            = {location.qty} {location.baseUnit || 'pcs'}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-medium text-gray-700">
                          {location.qty} {location.unit || 'pcs'}
                        </p>
                      )}
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
