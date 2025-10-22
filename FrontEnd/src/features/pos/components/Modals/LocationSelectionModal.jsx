import React, { useState, useMemo } from 'react';
import { FiX, FiMapPin, FiMap } from 'react-icons/fi';
import ShelfViewModal from '../../../inventory/components/Inventory/ShelfViewModal';
import { getStorageUnitConfig } from '../../../inventory/config/StorageUnitsConfig';

const formatCurrency = (number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

export default function LocationSelectionModal({
  product,
  selectedVariant,
  qty,
  onSelectLocation,
  onClose
}) {
  const [shelfViewOpen, setShelfViewOpen] = useState(false);
  const [selectedStorageUnit, setSelectedStorageUnit] = useState(null);
  const [selectedLocations, setSelectedLocations] = useState([]);

  // Early return if no product or variant
  if (!product || !selectedVariant) {
    return null;
  }

  // Get all locations for this specific variant from allLocations
  const variantLocations = useMemo(() => {
    if (!product.allLocations || !Array.isArray(product.allLocations)) {
      return [];
    }
    
    return product.allLocations.filter(loc => 
      loc.size === selectedVariant.size && loc.unit === selectedVariant.unit
    );
  }, [product.allLocations, selectedVariant]);

  // Group locations by storage unit
  const locationsByUnit = useMemo(() => {
    const grouped = {};
    variantLocations.forEach(loc => {
      const unitName = loc.storageLocation;
      if (!grouped[unitName]) {
        grouped[unitName] = [];
      }
      grouped[unitName].push(loc);
    });
    return grouped;
  }, [variantLocations]);

  // Calculate total allocated quantity - use allocatedQuantity, not quantity!
  const totalAllocated = selectedLocations.reduce((sum, loc) => sum + (loc.allocatedQuantity || 0), 0);
  const remainingQty = Number(qty) - totalAllocated;

  const handleLocationSelect = (locationVariant) => {
    if (locationVariant.quantity < Number(qty)) {
      alert(`Insufficient stock at this location. Only ${locationVariant.quantity} available.`);
      return;
    }
    onSelectLocation(locationVariant);
  };

  // Handle opening shelf view for a specific unit
  const handleOpenShelfView = (unitName) => {
    const unitConfig = getStorageUnitConfig(unitName);
    if (unitConfig) {
      setSelectedStorageUnit(unitConfig);
      setSelectedLocations([]); // Reset selections
      setShelfViewOpen(true);
    }
  };

  // Handle location selection from shelf view (multi-select with auto-allocation)
  const handleShelfLocationSelect = (shelfName, rowName, columnIndex, quantityToAllocate) => {
    console.log('📥 ===== LOCATION SELECTION HANDLER =====');
    console.log('📍 Received:', { shelfName, rowName, columnIndex, quantityToAllocate });
    
    // If quantityToAllocate is -1, remove this location
    if (quantityToAllocate === -1) {
      const locationKey = `${selectedStorageUnit.title.split(' - ')[0]}-${shelfName}-${rowName}-${columnIndex}`;
      console.log('🗑️ Removing location:', locationKey);
      console.log('📊 Before removal:', {
        selectedCount: selectedLocations.length,
        totalAllocated: selectedLocations.reduce((sum, loc) => sum + (loc.allocatedQuantity || 0), 0)
      });
      
      setSelectedLocations(prev => {
        const updated = prev.filter(loc => loc.id !== locationKey);
        console.log('📊 After removal:', {
          selectedCount: updated.length,
          totalAllocated: updated.reduce((sum, loc) => sum + (loc.allocatedQuantity || 0), 0)
        });
        return updated;
      });
      console.log('===== END REMOVAL =====\n');
      return;
    }

    console.log('🔍 Looking for matching variant location...');
    console.log('Available variant locations:', variantLocations.map(v => ({
      storageLocation: v.storageLocation,
      shelfName: v.shelfName,
      rowName: v.rowName,
      columnIndex: v.columnIndex,
      quantity: v.quantity
    })));
    
    // Find the location variant that matches this cell
    const locationVariant = variantLocations.find(loc => 
      loc.storageLocation === selectedStorageUnit.title.split(' - ')[0] &&
      loc.shelfName === shelfName &&
      loc.rowName === rowName &&
      (loc.columnIndex === columnIndex || loc.columnIndex === String(columnIndex))
    );

    if (!locationVariant) {
      console.log('❌ No matching variant found for this location');
      alert('This location does not contain the selected product variant.');
      return;
    }
    
    console.log('✅ Found variant:', {
      variantId: locationVariant.variantId,
      availableQty: locationVariant.quantity,
      price: locationVariant.price
    });

    // Check if already selected
    const locationKey = `${selectedStorageUnit.title.split(' - ')[0]}-${shelfName}-${rowName}-${columnIndex}`;
    const existingIndex = selectedLocations.findIndex(loc => loc.id === locationKey);

    if (existingIndex >= 0) {
      console.log('⚠️ Location already selected (should not reach here - handled above)');
      setSelectedLocations(prev => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      // Calculate remaining quantity needed
      const currentAllocated = selectedLocations.reduce((sum, loc) => sum + (loc.allocatedQuantity || 0), 0);
      const remainingNeeded = Number(qty) - currentAllocated;
      
      // Only allocate what's actually needed, not more than available in this cell
      const actualAllocation = Math.min(remainingNeeded, locationVariant.quantity, quantityToAllocate);
      
      console.log('📊 Allocation Calculation:', {
        currentAllocated,
        remainingNeeded,
        cellAvailable: locationVariant.quantity,
        requested: quantityToAllocate,
        actualAllocation
      });

      // Don't allocate if nothing is needed
      if (actualAllocation <= 0) {
        console.log('🚫 No allocation needed - remaining quantity satisfied');
        return;
      }

      // Add new selection with calculated quantity
      const newSelection = {
        id: locationKey,
        ...locationVariant,
        allocatedQuantity: actualAllocation,
        fullPath: `${locationVariant.storageLocation} - ${shelfName} - ${rowName} - Column ${columnIndex}`
      };
      
      console.log('➕ Adding new selection:', {
        locationKey,
        allocatedQuantity: actualAllocation,
        fullPath: newSelection.fullPath
      });
      
      setSelectedLocations(prev => {
        const updated = [...prev, newSelection];
        const newTotal = updated.reduce((sum, loc) => sum + (loc.allocatedQuantity || 0), 0);
        
        console.log('📊 Updated Allocation Status:', {
          totalLocations: updated.length,
          totalAllocated: newTotal,
          remaining: Number(qty) - newTotal,
          targetQuantity: qty,
          allocationComplete: newTotal === Number(qty)
        });
        
        return updated;
      });
    }
    console.log('===== END LOCATION SELECTION =====\n');
  };

  // Confirm multi-location allocation
  const handleConfirmMultiAllocation = () => {
    if (selectedLocations.length === 0) {
      alert('Please select at least one location.');
      return;
    }

    const qtyNum = Number(qty);
    if (totalAllocated !== qtyNum) {
      alert(`Total allocated (${totalAllocated}) must equal quantity needed (${qtyNum}).`);
      return;
    }

    // Call parent with multi-location allocation
    onSelectLocation(selectedLocations);
    setShelfViewOpen(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-[500px] mx-4 max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h3 className="text-lg font-medium">Select Location</h3>
              <p className="text-sm text-gray-500 mt-1">
                Choose location or use visual map
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <FiX size={20} />
            </button>
          </div>

          {/* Product Info */}
          <div className="p-4 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">Product:</p>
            <p className="font-medium text-gray-900">{product.name}</p>
            {selectedVariant.size && (
              <p className="text-sm text-gray-600 mt-1">
                Size: {selectedVariant.size} {selectedVariant.unit}
              </p>
            )}
            <p className="text-sm text-orange-600 mt-1">
              Quantity needed: <span className="font-bold">{qty} {selectedVariant.unit}</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Found in <span className="font-semibold">{Object.keys(locationsByUnit).length}</span> storage unit(s)
            </p>
          </div>

          {/* Location Selection Options - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Quick Select - Single Location (if one has enough stock) */}
              {variantLocations.some(loc => loc.quantity >= Number(qty)) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs">1</span>
                    Quick Select - Single Location
                  </h4>
                  {variantLocations.filter(loc => loc.quantity >= Number(qty)).map((locationVariant, index) => (
                    <button
                      key={`single-${locationVariant.variantId}-${index}`}
                      onClick={() => handleLocationSelect(locationVariant)}
                      className="w-full p-3 rounded-lg border-2 border-green-200 hover:border-green-500 hover:bg-green-50 text-left transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FiMapPin className="text-green-500" size={16} />
                            <span className="font-medium text-gray-900">
                              {locationVariant.storageLocation}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {locationVariant.shelfName} • {locationVariant.rowName} • Col {locationVariant.columnIndex}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-semibold text-green-600">
                            {locationVariant.quantity}
                          </div>
                          <div className="text-xs text-green-600">Available</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Visual Map - Multiple Locations */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs">2</span>
                  Visual Map - Pick Multiple Locations
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Use visual warehouse map to auto-allocate from multiple cells
                </p>
                {Object.entries(locationsByUnit).map(([unitName, locations]) => {
                  const totalQtyInUnit = locations.reduce((sum, loc) => sum + loc.quantity, 0);
                  return (
                    <button
                      key={unitName}
                      onClick={() => handleOpenShelfView(unitName)}
                      className="w-full p-3 rounded-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 text-left transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FiMap className="text-blue-600" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{unitName}</p>
                            <p className="text-xs text-gray-600">
                              {locations.length} location{locations.length > 1 ? 's' : ''} • {totalQtyInUnit} pcs total
                            </p>
                          </div>
                        </div>
                        <div className="text-blue-600">→</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              <p className="mb-1">💡 <strong>Tip:</strong> Use visual map for auto-allocation across cells</p>
              <p className="text-xs text-gray-500">
                Total available: {' '}
                <span className="font-semibold text-gray-700">
                  {variantLocations.reduce((sum, v) => sum + v.quantity, 0)} {selectedVariant.unit}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shelf View Modal for Visual Selection */}
      {shelfViewOpen && selectedStorageUnit && (
        <div className="relative z-[60]">
          <ShelfViewModal
            isOpen={shelfViewOpen}
            onClose={() => {
              setShelfViewOpen(false);
              setSelectedLocations([]);
            }}
            selectedUnit={selectedStorageUnit}
            onLocationSelect={handleShelfLocationSelect}
            highlightedProduct={{
              name: product.name,
              locations: variantLocations
                .filter(loc => loc.storageLocation === selectedStorageUnit.title.split(' - ')[0])
                .map(loc => ({
                  shelfName: loc.shelfName,
                  rowName: loc.rowName,
                  columnIndex: loc.columnIndex,
                  quantity: loc.quantity,
                  location: loc.fullLocation
                }))
            }}
            multiSelect={true}
            selectedLocations={selectedLocations}
            totalQuantity={qty}
            allocatedQuantity={totalAllocated}
          />
          
          {/* Confirm Button Overlay for Multi-Selection */}
          {selectedLocations.length > 0 && (
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[90] animate-in slide-in-from-bottom-4">
              <div className="bg-white rounded-xl shadow-2xl border-2 border-orange-500 p-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">
                      {selectedLocations.length} location{selectedLocations.length > 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-gray-600">
                      Allocated: <span className={totalAllocated === Number(qty) ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                        {totalAllocated}/{qty}
                      </span> {selectedVariant.unit}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedLocations([])}
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleConfirmMultiAllocation}
                      disabled={totalAllocated !== Number(qty)}
                      className={`px-6 py-2 text-sm rounded-lg font-medium transition-all ${
                        totalAllocated === Number(qty)
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Confirm Selection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
