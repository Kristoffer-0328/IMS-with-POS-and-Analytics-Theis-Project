import React, { useState } from 'react';
import { FiMinus, FiPlus, FiX } from 'react-icons/fi';

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

const QuickQuantityModal = ({
  product,
  onClose,
  onAdd,
  maxQuantity
}) => {
  
  // Early return if product is null
  if (!product) {
    console.warn('QuickQuantityModal: No product provided');
    return null;
  }

  if (!product.variants || product.variants.length === 0) {
    console.error('QuickQuantityModal: No variants found in product', product);
    return null;
  }

  const [quantity, setQuantity] = useState('1');
  
  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // Allow empty value or numbers
    if (value === '' || /^\d*$/.test(value)) {
      if (value === '') {
        setQuantity('');
      } else {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
          if (numValue > maxQuantity) {
            setQuantity(maxQuantity.toString());
          } else {
            setQuantity(value);
          }
        }
      }
    }
  };

  const handleQuantityBlur = () => {
    if (quantity === '' || parseInt(quantity) < 1) {
      setQuantity('1');
    }
  };

  const adjustQuantity = (amount) => {
    const currentQty = quantity === '' ? 0 : parseInt(quantity);
    const newValue = Math.min(maxQuantity, Math.max(1, currentQty + amount));
    setQuantity(newValue.toString());
  };

  const quickQuantities = [5, 10, 25, 50];

  const getDisplayQuantity = () => {
    return quantity === '' ? '0' : quantity;
  };

  const getCurrentQuantity = () => {
    return quantity === '' ? 0 : parseInt(quantity);
  };

  const firstVariant = product.variants?.[0] || {};
  const variantUnit = firstVariant.unit || 'pcs';
  const bundlePrice = firstVariant.unitPrice || firstVariant.price || 0;
  const isBundle = firstVariant.isBundle && firstVariant.piecesPerBundle;
  
  // For bundles: unitPrice is price per bundle, so price per piece = unitPrice / piecesPerBundle
  // For regular products: use unitPrice as-is
  const pricePerPiece = isBundle ? bundlePrice / firstVariant.piecesPerBundle : bundlePrice;
  
  const dimensionInfo = formatDimensions(firstVariant);


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium text-gray-900">Select Quantity</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Product:</p>
            <p className="font-medium text-gray-900">{product.name}</p>
            
            {/* Show bundle or dimension info */}
            {isBundle && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  📦 Bundle
                </span>
                <span className="text-sm text-gray-600">
                  {firstVariant.piecesPerBundle} {firstVariant.baseUnit || 'pcs'} per {firstVariant.bundlePackagingType || 'bundle'}
                </span>
              </div>
            )}
            
            {dimensionInfo && !isBundle && (
              <p className="text-sm text-gray-600 mt-2">
                📏 {dimensionInfo}
              </p>
            )}
            
            <p className="text-sm text-gray-500 mt-2">
              Available Stock: {maxQuantity} {isBundle ? (firstVariant.baseUnit || 'pcs') : variantUnit}
              {isBundle && maxQuantity >= firstVariant.piecesPerBundle && (
                <span className="ml-1 text-purple-600">
                  ({Math.floor(maxQuantity / firstVariant.piecesPerBundle)} {firstVariant.bundlePackagingType || 'bundles'}
                  {maxQuantity % firstVariant.piecesPerBundle > 0 && 
                    ` + ${maxQuantity % firstVariant.piecesPerBundle} ${firstVariant.baseUnit || 'pcs'}`
                  })
                </span>
              )}
            </p>
          </div>

          {/* Quick Quantity Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {quickQuantities.map((qty) => (
              <button
                key={qty}
                onClick={() => setQuantity(Math.min(qty, maxQuantity).toString())}
                disabled={qty > maxQuantity}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all
                  ${qty <= maxQuantity
                    ? parseInt(quantity) === qty
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {qty}
              </button>
            ))}
          </div>

          {/* Quantity Input with +/- Buttons */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustQuantity(-1)}
                disabled={getCurrentQuantity() <= 1}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiMinus size={18} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity}
                onChange={handleQuantityChange}
                onBlur={handleQuantityBlur}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center"
              />
              <button
                onClick={() => adjustQuantity(1)}
                disabled={getCurrentQuantity() >= maxQuantity}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus size={18} />
              </button>
            </div>
          </div>

          {/* Total Calculation */}
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            {isBundle && (
              <div className="flex justify-between text-sm mb-2 pb-2 border-b">
                <span className="text-gray-600">Bundle Price:</span>
                <span className="font-medium">₱{bundlePrice.toLocaleString()} / {firstVariant.bundlePackagingType || 'bundle'}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price per {firstVariant.baseUnit || 'pc'}:</span>
              <span className="font-medium">₱{pricePerPiece.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-medium">
                {getDisplayQuantity()} {isBundle ? (firstVariant.baseUnit || 'pcs') : variantUnit}
                {isBundle && getCurrentQuantity() > 0 && (
                  <span className="ml-1 text-purple-600 text-xs">
                    ({Math.floor(getCurrentQuantity() / firstVariant.piecesPerBundle)} {firstVariant.bundlePackagingType || 'bundles'}
                    {getCurrentQuantity() % firstVariant.piecesPerBundle > 0 && 
                      ` + ${getCurrentQuantity() % firstVariant.piecesPerBundle} ${firstVariant.baseUnit || 'pcs'}`
                    })
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-base font-medium mt-2 pt-2 border-t">
              <span>Total:</span>
              <span className="text-orange-600">
                ₱{(pricePerPiece * getCurrentQuantity()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={() => onAdd(parseInt(quantity))}
            disabled={quantity === '' || parseInt(quantity) < 1}
            className="w-full py-2.5 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickQuantityModal; 
