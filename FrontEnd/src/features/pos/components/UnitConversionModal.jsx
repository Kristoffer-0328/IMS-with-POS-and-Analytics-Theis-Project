import React, { useState, useEffect } from 'react';
import { FiBox, FiPackage, FiX } from 'react-icons/fi';

const UnitConversionModal = ({
  product,
  onClose,
  onAddToCart
}) => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [quantity, setQuantity] = useState(1);
  
  // Get available units from variants
  const availableUnits = product.variants.reduce((units, variant) => {
    if (!units.some(u => u.unit === variant.unit)) {
      units.push({
        unit: variant.unit,
        price: variant.unitPrice || variant.price || 0,
        inStock: variant.quantity,
        variantId: variant.id
      });
    }
    return units;
  }, []);

  const handleQuantityChange = (e) => {
    const value = Math.max(1, parseInt(e.target.value) || 1);
    setQuantity(value);
  };

  const handleAddToCart = () => {
    if (!selectedUnit) return;
    
    const variant = product.variants.find(v => v.id === selectedUnit.variantId);
    onAddToCart({
      ...product,
      variantId: variant.id,
      unit: selectedUnit.unit,
      price: selectedUnit.price,
      qty: quantity
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium text-gray-900">Select Unit</h3>
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
          </div>

          {/* Unit Selection */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {availableUnits.map((unitOption) => (
              <button
                key={unitOption.variantId}
                onClick={() => setSelectedUnit(unitOption)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                  selectedUnit?.variantId === unitOption.variantId
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-200'
                }`}
              >
                <FiPackage 
                  size={24} 
                  className={selectedUnit?.variantId === unitOption.variantId ? 'text-orange-500' : 'text-gray-400'} 
                />
                <div className="text-center mt-2">
                  <p className="font-medium">{unitOption.unit}</p>
                  <p className="text-sm text-gray-600">₱{unitOption.price.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{unitOption.inStock} in stock</p>
                </div>
              </button>
            ))}
          </div>

          {/* Quantity Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={handleQuantityChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Total */}
          {selectedUnit && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price per {selectedUnit.unit}:</span>
                <span className="font-medium">₱{selectedUnit.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{quantity} {selectedUnit.unit}</span>
              </div>
              <div className="flex justify-between text-base font-medium mt-2 pt-2 border-t">
                <span>Total:</span>
                <span className="text-orange-600">₱{(selectedUnit.price * quantity).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={handleAddToCart}
            disabled={!selectedUnit}
            className={`w-full py-2.5 rounded-lg font-medium ${
              selectedUnit
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnitConversionModal; 
