import React from 'react';
import { FiX } from 'react-icons/fi';

const formatCurrency = (number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

// Helper function to format dimensions (same as in Pos_NewSale.jsx)
const formatDimensions = (variant) => {
  if (!variant) return null;
  
  const measurementType = variant.measurementType;
  
  switch (measurementType) {
    case 'length':
      if (variant.requireDimensions || variant.length || variant.thickness || variant.width) {
        const hasLength = variant.length && parseFloat(variant.length) > 0;
        const hasWidth = variant.width && parseFloat(variant.width) > 0;
        const hasThickness = variant.thickness && parseFloat(variant.thickness) > 0;
        
        if (!hasLength && !hasThickness) return null;
        
        if (hasLength && hasThickness && !hasWidth) {
          return `${variant.length}m × ⌀${variant.thickness}mm`;
        } else if (hasLength && hasWidth && hasThickness) {
          return `${variant.length}m × ${variant.width}cm × ${variant.thickness}mm`;
        } else if (hasThickness) {
          return `${variant.thickness}mm thick`;
        } else if (hasLength) {
          return `${variant.length}m`;
        }
      }
      return null;
      
    case 'weight':
      if (variant.unitWeightKg && parseFloat(variant.unitWeightKg) > 0) {
        return `${variant.unitWeightKg}kg`;
      }
      return null;
      
    case 'volume':
      if (variant.unitVolumeLiters && parseFloat(variant.unitVolumeLiters) > 0) {
        return `${variant.unitVolumeLiters}L`;
      }
      return null;
      
    case 'count':
      if (variant.isBundle && variant.piecesPerBundle) {
        return `${variant.piecesPerBundle} ${variant.baseUnit || 'pcs'}/${variant.bundlePackagingType || 'bundle'}`;
      }
      if (variant.size && variant.size !== 'default') {
        return `${variant.size} ${variant.unit || variant.baseUnit || 'pcs'}`;
      }
      return null;
      
    default:
      const hasLength = variant.length && parseFloat(variant.length) > 0;
      const hasWidth = variant.width && parseFloat(variant.width) > 0;
      const hasThickness = variant.thickness && parseFloat(variant.thickness) > 0;
      
      if (hasLength && hasThickness && !hasWidth) {
        return `${variant.length}m × ⌀${variant.thickness}mm`;
      } else if (hasLength && hasWidth && hasThickness) {
        return `${variant.length}m × ${variant.width}cm × ${variant.thickness}mm`;
      } else if (hasThickness) {
        return `${variant.thickness}mm thick`;
      } else if (hasLength) {
        return `${variant.length}m`;
      }
      
      return null;
  }
};

export default function VariantSelectionModal({
  product,
  activeVariantIndex,
  setActiveVariantIndex,
  qty,
  setQty,
  onAddVariant,
  onClose
}) {
  // Early return if product is null or doesn't have variants
  if (!product || !product.variants || product.variants.length === 0) {
    return null;
  }

  const activeVariant = product.variants[activeVariantIndex];
  const maxQty = activeVariant?.totalQuantity || activeVariant?.quantity || 0;
  const isBundle = activeVariant?.isBundle && activeVariant?.piecesPerBundle;
  
  // For bundles, allow selecting between bundle or piece input
  const [inputMode, setInputMode] = React.useState(isBundle ? 'bundle' : 'piece');

  // Get the correct price based on input mode
  // For bundles: unitPrice is the price per bundle, so price per piece = unitPrice / piecesPerBundle
  const getEffectivePrice = () => {
    const bundlePrice = activeVariant?.unitPrice || activeVariant?.price || 0;
    if (isBundle && inputMode === 'piece') {
      // Selling by piece: divide bundle price by pieces per bundle
      return bundlePrice / activeVariant.piecesPerBundle;
    }
    // Selling by bundle or non-bundle product: use unit price as-is
    return bundlePrice;
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // Allow empty value or numbers
    if (value === '' || /^\d*$/.test(value)) {
      setQty(value);
    }
  };

  const handleQuantityBlur = () => {
    const numValue = parseInt(qty);
    if (qty === '' || isNaN(numValue) || numValue < 1) {
      setQty('1');
    } else {
      // For bundle mode, check against max bundles; for piece mode, check against max pieces
      const effectiveMax = isBundle && inputMode === 'bundle' 
        ? Math.floor(maxQty / activeVariant.piecesPerBundle)
        : maxQty;
      
      if (numValue > effectiveMax) {
        setQty(effectiveMax.toString());
      }
    }
  };

  const adjustQuantity = (amount) => {
    const currentQty = qty === '' ? 0 : parseInt(qty);
    const effectiveMax = isBundle && inputMode === 'bundle'
      ? Math.floor(maxQty / activeVariant.piecesPerBundle)
      : maxQty;
    const newValue = Math.min(effectiveMax, Math.max(1, currentQty + amount));
    setQty(newValue.toString());
  };

  // Get actual pieces quantity regardless of input mode
  const getActualPiecesQuantity = () => {
    const inputQty = qty === '' ? 0 : parseInt(qty);
    if (isBundle && inputMode === 'bundle') {
      return inputQty * activeVariant.piecesPerBundle;
    }
    return inputQty;
  };

  const quickQuantities = isBundle && inputMode === 'bundle'
    ? [1, 2, 5, 10] // Bundle quantities
    : [5, 10, 25, 50]; // Piece quantities

  const getCurrentQuantity = () => {
    return qty === '' ? 0 : parseInt(qty);
  };

  // Get the display unit based on input mode
  const getDisplayUnit = () => {
    if (isBundle) {
      if (inputMode === 'bundle') {
        return activeVariant.bundlePackagingType || 'bundle';
      } else {
        return activeVariant.baseUnit || 'pcs';
      }
    }
    // For non-bundle dimensional products, use the base unit (pcs, not meters)
    return activeVariant.baseUnit || activeVariant.unit || 'pcs';
  };

  // Toggle input mode for bundles
  const toggleInputMode = () => {
    if (!isBundle) return;
    
    const currentPieces = getActualPiecesQuantity();
    
    if (inputMode === 'bundle') {
      // Switching to piece mode
      setInputMode('piece');
      setQty(currentPieces.toString());
    } else {
      // Switching to bundle mode
      setInputMode('bundle');
      const bundles = Math.floor(currentPieces / activeVariant.piecesPerBundle);
      setQty(bundles > 0 ? bundles.toString() : '1');
    }
  };

  // Check if variants have different sizes/units
  const hasSizeOrUnitVariants = new Set(product.variants.map(v => `${v.size || ''}|${v.unit || ''}`)).size > 1;
  const hasBrandVariants = new Set(product.variants.map(v => v.brand)).size > 1;
  const hasDimensionVariants = product.variants.some(v => formatDimensions(v));
  const hasBundleProducts = product.variants.some(v => v.isBundle && v.piecesPerBundle);

  // Determine modal title based on what's different
  const getModalTitle = () => {
    if (hasBundleProducts) return 'Select Bundle';
    if (hasDimensionVariants) return 'Select Variant';
    if (hasSizeOrUnitVariants) return 'Select Size';
    if (hasBrandVariants) return 'Select Brand';
    return 'Select Variant';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[400px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">
            {getModalTitle()}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4">
          {/* Product Info */}
          <div className="mb-4">
            <p className="text-gray-600 mb-1">Product:</p>
            <p className="font-medium">{product.name}</p>
          </div>

          {/* Variant Selection */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {product.variants.map((variant, index) => {
              const dimensionInfo = formatDimensions(variant);
              const isBundle = variant.isBundle && variant.piecesPerBundle;
              
              return (
                <button
                  key={variant.variantId || index}
                  onClick={() => setActiveVariantIndex(index)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    activeVariantIndex === index
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-200'
                  }`}
                >
                  <div className="text-center w-full">
                    {/* Bundle Badge */}
                    {isBundle && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          Bundle
                        </span>
                      </div>
                    )}
                    
                    {/* Dimension Info (Priority) */}
                    {dimensionInfo && (
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {dimensionInfo}
                      </p>
                    )}
                    
                    {/* Show brand if different brands exist */}
                    {hasBrandVariants && variant.brand && !dimensionInfo && (
                      <p className="font-medium text-gray-900 mb-1">{variant.brand}</p>
                    )}
                    
                    {/* Show size/specifications if different sizes exist and no dimensions */}
                    {!dimensionInfo && hasSizeOrUnitVariants && (variant.size || variant.variantName || variant.specifications) && (
                      <p className="text-sm text-gray-600">
                        {variant.size || variant.variantName || variant.specifications}
                        {variant.unit && ` ${variant.unit}`}
                      </p>
                    )}
                    
                    {/* If no distinguishing features shown yet, show variant name or default */}
                    {!dimensionInfo && !hasBrandVariants && !hasSizeOrUnitVariants && (
                      <p className="text-sm text-gray-600">
                        {variant.size || variant.variantName || variant.unit || 'Standard'}
                      </p>
                    )}
                    
                    {/* Price */}
                    <p className="text-sm font-medium text-orange-600 mt-1">
                      ₱{formatCurrency(variant.unitPrice || variant.price || 0)} / {variant.bundlePackagingType || 'bundle'}
                      {isBundle && (
                        <span className="block text-xs text-gray-500 mt-0.5">
                          (₱{formatCurrency((variant.unitPrice || variant.price || 0) / variant.piecesPerBundle)} / {variant.baseUnit || 'pc'})
                        </span>
                      )}
                    </p>
                    
                    {/* Stock Info */}
                    <div className="text-xs mt-2 space-y-1">
                      <p className="text-gray-700 font-medium">
                        Stock: {variant.totalQuantity || variant.quantity} { 'pcs'}
                      </p>
                      {isBundle && (
                        <p className="text-purple-600">
                          {Math.floor((variant.totalQuantity || variant.quantity) / variant.piecesPerBundle)} {variant.bundlePackagingType || 'bundles'}
                          {(variant.totalQuantity || variant.quantity) % variant.piecesPerBundle > 0 && (
                            <span>
                              {' '}+ {(variant.totalQuantity || variant.quantity) % variant.piecesPerBundle} {variant.baseUnit || 'pcs'}
                            </span>
                          )}
                        </p>
                      )}
                  
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Select */}
          <div className="mb-4">
            {isBundle && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    if (inputMode !== 'bundle') toggleInputMode();
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'bundle'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Bundle
                </button>
                <button
                  onClick={() => {
                    if (inputMode !== 'piece') toggleInputMode();
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'piece'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Piece
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-4 gap-2">
              {quickQuantities.map((quickQty) => {
                const effectiveMax = isBundle && inputMode === 'bundle'
                  ? Math.floor(maxQty / activeVariant.piecesPerBundle)
                  : maxQty;
                
                return (
                  <button
                    key={quickQty}
                    onClick={() => setQty(Math.min(quickQty, effectiveMax).toString())}
                    disabled={quickQty > effectiveMax}
                    className={`py-2 rounded-lg text-sm ${
                      quickQty <= effectiveMax
                        ? getCurrentQuantity() === quickQty
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {quickQty}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Quantity */}
          <div className="mb-6">
            <p className="text-gray-600 mb-2">
              Custom Quantity
              {isBundle && (
                <span className="ml-2 text-xs text-purple-600">
                  ({inputMode === 'bundle' ? 'Selling by bundle' : 'Selling by piece'})
                </span>
              )}
            </p>
            <div className="flex items-center">
              <button
                onClick={() => adjustQuantity(-1)}
                className="px-4 py-2 border rounded-l-lg bg-gray-50"
                disabled={getCurrentQuantity() <= 1}
              >
                −
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={qty}
                  onChange={handleQuantityChange}
                  onBlur={handleQuantityBlur}
                  className="w-full px-3 py-2 border-y text-center"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {getDisplayUnit()}
                </span>
              </div>
              <button
                onClick={() => adjustQuantity(1)}
                className="px-4 py-2 border rounded-r-lg bg-gray-50"
                disabled={
                  isBundle && inputMode === 'bundle'
                    ? getCurrentQuantity() >= Math.floor(maxQty / activeVariant.piecesPerBundle)
                    : getCurrentQuantity() >= maxQty
                }
              >
                +
              </button>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            {/* Show dimension/bundle info if available */}
            {formatDimensions(activeVariant) && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Variant:</span>
                <span className="font-medium">
                  {activeVariant?.isBundle && activeVariant?.piecesPerBundle ? (
                    <span className="text-purple-600">
                       {formatDimensions(activeVariant)}
                    </span>
                  ) : (
                    <span>   {formatDimensions(activeVariant)}</span>
                  )}
                </span>
              </div>
            )}
            
            <div className="flex justify-between py-1">
              <span className="text-gray-600">
                {hasBrandVariants && !formatDimensions(activeVariant) 
                  ? 'Selected Brand:' 
                  : formatDimensions(activeVariant) 
                    ? 'Price:' 
                    : 'Selected Size:'}
              </span>
              <span className="font-medium">
                {hasBrandVariants && !formatDimensions(activeVariant)
                  ? (activeVariant?.brand || 'Unknown')
                  : formatDimensions(activeVariant)
                    ? (
                      isBundle && inputMode === 'piece' 
                        ? `₱${formatCurrency(getEffectivePrice())} / ${activeVariant.baseUnit || 'pc'}`
                        : `₱${formatCurrency(getEffectivePrice())} / ${isBundle ? (activeVariant.bundlePackagingType || 'bundle') : (activeVariant.baseUnit || 'pcs')}`
                    )
                    : (activeVariant?.size || activeVariant?.variantName || activeVariant?.specifications || 
                       `${activeVariant?.unit || 'pcs'}`)
                }
              </span>
            </div>
            
            {!formatDimensions(activeVariant) && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Price per {activeVariant?.unit || 'pcs'}:</span>
                <span>₱{formatCurrency(getEffectivePrice())}</span>
              </div>
            )}
            
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Quantity:</span>
              <span>
                {isBundle && inputMode === 'bundle' ? (
                  // Showing bundles
                  <>
                    {qty || 0} {activeVariant.bundlePackagingType || 'bundles'}
                    <span className="ml-1 text-purple-600 text-xs">
                      (= {getActualPiecesQuantity()} {activeVariant.baseUnit || 'pcs'})
                    </span>
                  </>
                ) : isBundle && inputMode === 'piece' ? (
                  // Showing pieces for bundle product
                  <>
                    {qty || 0} {activeVariant.baseUnit || 'pcs'}
                    {getCurrentQuantity() > 0 && getCurrentQuantity() >= activeVariant.piecesPerBundle && (
                      <span className="ml-1 text-purple-600 text-xs">
                        ({Math.floor(getCurrentQuantity() / activeVariant.piecesPerBundle)} {activeVariant.bundlePackagingType || 'bundles'}
                        {getCurrentQuantity() % activeVariant.piecesPerBundle > 0 && 
                          ` + ${getCurrentQuantity() % activeVariant.piecesPerBundle} ${activeVariant.baseUnit || 'pcs'}`
                        })
                      </span>
                    )}
                  </>
                ) : (
                  // Regular product
                  <>{qty || 0} {activeVariant?.baseUnit || activeVariant?.unit || 'pcs'}</>
                )}
              </span>
            </div>
            
            <div className="flex justify-between py-1 text-orange-500 font-medium mt-2 pt-2 border-t">
              <span>Total:</span>
              <span>₱{formatCurrency(getEffectivePrice() * getCurrentQuantity())}</span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={() => {
              // Get actual pieces quantity
              const actualQty = getActualPiecesQuantity();
              // Call onAddVariant with actual pieces quantity directly
              onAddVariant(actualQty);
            }}
            disabled={!qty || getCurrentQuantity() < 1 || getActualPiecesQuantity() > maxQty}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
