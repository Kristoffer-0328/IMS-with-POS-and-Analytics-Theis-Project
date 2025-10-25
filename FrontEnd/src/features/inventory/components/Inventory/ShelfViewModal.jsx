

import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const ShelfViewModal = ({ 
  isOpen, 
  onClose, 
  selectedUnit, 
  onLocationSelect, 
  highlightedProduct, 
  multiSelect = false, 
  selectedLocations = [],
  totalQuantity = 0, // Total quantity to distribute
  allocatedQuantity = 0, // Already allocated quantity
  cellCapacity = 100, // Maximum items per cell (default, can be overridden per row)
  viewOnly = false // View-only mode for Inventory page
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const db = getFirestore(app);
  
 
  

  const isLocationSelected = (shelfName, rowName, columnIndex) => {
    if (!multiSelect) return false;
    const unitName = selectedUnit?.title?.split(' - ')[0] || selectedUnit?.name || 'Unknown';
    const locationKey = `${unitName}-${shelfName}-${rowName}-${columnIndex}`;
    const isSelected = selectedLocations.some(loc => loc.id === locationKey);
    
    // Debug logging
    if (isSelected) {
    }
    
    return isSelected;
  };
  
  // Calculate remaining quantity to allocate
  const getRemainingQuantity = () => {
    return Math.max(0, totalQuantity - allocatedQuantity);
  };
  
  // Handle cell click with auto-allocation
  const handleCellClick = (shelfName, rowName, columnIndex, cellCapacity) => {
    if (viewOnly || !multiSelect) return;
    
    const unitName = selectedUnit?.title?.split(' - ')[0] || selectedUnit?.name || 'Unknown';
    const locationKey = `${unitName}-${shelfName}-${rowName}-${columnIndex}`;
    const existingAllocation = selectedLocations.find(loc => loc.id === locationKey);
    
    
    if (existingAllocation) {
      // Remove allocation
      onLocationSelect(shelfName, rowName, columnIndex, -1);
    } else {
      // Add allocation
      const remainingQty = getRemainingQuantity();
      if (remainingQty > 0) {
        const allocateQty = Math.min(remainingQty, cellCapacity);
        onLocationSelect(shelfName, rowName, columnIndex, allocateQty);
      } else {
      }
    }
  };
 

  // Handle keyboard events
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch products for the selected unit
  const fetchUnitProducts = async () => {
    if (!selectedUnit?.title) return;
    
    setLoading(true);
    try {
      const unitName = selectedUnit.title.split(' - ')[0]; // Extract "Unit 01" from "Unit 01 - Steel & Heavy Materials"

      const products = [];
      
      // NESTED STRUCTURE: Products/{Unit}/products/{productId}
      // Each product document has storageLocation, shelfName, rowName, columnIndex fields
      const productsRef = collection(db, 'Products', unitName, 'products');
      const productsSnapshot = await getDocs(productsRef);


      // Fetch base products AND their variants
      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data();
        
        // Add base product if it has storage location
        if (productData.shelfName && productData.rowName) {
          const productInfo = {
            ...productData,
            id: productDoc.id,
            shelfName: productData.shelfName || '',
            rowName: productData.rowName || '',
            columnIndex: productData.columnIndex || '', // Keep as is (string or number)
            columnIndexNumber: parseInt(productData.columnIndex) || 0, // Also store as number
            locationKey: `${productData.shelfName}-${productData.rowName}-${productData.columnIndex}`,
            isVariant: false
          };

       
          products.push(productInfo);
        }
        
        // Fetch variants for this base product
        // Structure: Products/{Unit}/products/{baseProductId}/variants/{variantId}
        const variantsRef = collection(db, 'Products', unitName, 'products', productDoc.id, 'variants');
        const variantsSnapshot = await getDocs(variantsRef);
        
        if (variantsSnapshot.docs.length > 0) {
        }
        
        variantsSnapshot.docs.forEach(variantDoc => {
          const variantData = variantDoc.data();
          
          // Only add variant if it has storage location
          if (variantData.shelfName && variantData.rowName) {
            const variantInfo = {
              ...variantData,
              id: variantDoc.id,
              parentProductId: productDoc.id,
              shelfName: variantData.shelfName || '',
              rowName: variantData.rowName || '',
              columnIndex: variantData.columnIndex || '',
              columnIndexNumber: parseInt(variantData.columnIndex) || 0,
              locationKey: `${variantData.shelfName}-${variantData.rowName}-${variantData.columnIndex}`,
              isVariant: true
            };

            products.push(variantInfo);
          }
        });
      }

      setProducts(products);
    } catch (error) {
      console.error('Error fetching unit products:', error);
      alert(`Failed to load products: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products when modal opens
  useEffect(() => {
    if (isOpen && selectedUnit) {
      fetchUnitProducts();
    }
  }, [isOpen, selectedUnit]);

  // Get product for a specific location
  const getProductAtLocation = (shelfName, rowName, columnIndex) => {
    // Try matching with different column index formats
    const locationKey1 = `${shelfName}-${rowName}-${columnIndex}`;
    const locationKey2 = `${shelfName}-${rowName}-${String(columnIndex)}`;
    
    const found = products.find(product => {
      // Match by locationKey
      if (product.locationKey === locationKey1 || product.locationKey === locationKey2) {
        return true;
      }
      
      // Match by individual fields (handle empty string, string, and number formats)
      if (product.shelfName === shelfName && product.rowName === rowName) {
        // Handle empty string or missing columnIndex
        if (product.columnIndex === '' || product.columnIndex === null || product.columnIndex === undefined) {
          return columnIndex === 0; // Empty means first column (index 0)
        }
        
        // Handle string/number comparison
        return product.columnIndex === columnIndex || 
               product.columnIndex === String(columnIndex) ||
               parseInt(product.columnIndex) === columnIndex ||
               product.columnIndexNumber === columnIndex;
      }
      
      return false;
    });
    
    if (found) {
    }
    
    return found;
  };

  // Check if this is the highlighted product - supports multiple locations
  const isHighlightedLocation = (shelfName, rowName, columnIndex) => {
    if (!highlightedProduct) return false;
    
    // If the product has multiple locations, check all of them
    if (highlightedProduct.locations && Array.isArray(highlightedProduct.locations)) {
      return highlightedProduct.locations.some(loc => {
        // Extract location details from the location object
        const locShelf = loc.shelfName || extractShelfFromLocation(loc.location);
        const locRow = loc.rowName || extractRowFromLocation(loc.location);
        const locColumn = loc.columnIndex;
        
        // Match by shelf, row, and column (handle both string and number formats)
        return (
          locShelf === shelfName &&
          locRow === rowName &&
          (locColumn === columnIndex || 
           locColumn === String(columnIndex) ||
           parseInt(locColumn) === columnIndex)
        );
      });
    }
    
    // Fallback to single location check (backward compatibility)
    return (
      highlightedProduct.shelfName === shelfName &&
      highlightedProduct.rowName === rowName &&
      (highlightedProduct.columnIndex === columnIndex || 
       highlightedProduct.columnIndex === String(columnIndex) ||
       parseInt(highlightedProduct.columnIndex) === columnIndex)
    );
  };
  
  // Helper function to extract shelf name from full location string
  const extractShelfFromLocation = (location) => {
    if (!location) return '';
    // Example: "Unit 02 - Lumber & Wood Products - Row 1 - Column 1"
    const parts = location.split(' - ');
    return parts[1] || '';
  };
  
  // Helper function to extract row name from full location string
  const extractRowFromLocation = (location) => {
    if (!location) return '';
    // Example: "Unit 02 - Lumber & Wood Products - Row 1 - Column 1"
    const parts = location.split(' - ');
    return parts[2] || '';
  };
  
  // Get quantity at a specific highlighted location
  const getHighlightedLocationQuantity = (shelfName, rowName, columnIndex) => {
    if (!highlightedProduct || !highlightedProduct.locations) return 0;
    
    const location = highlightedProduct.locations.find(loc => {
      const locShelf = loc.shelfName || extractShelfFromLocation(loc.location);
      const locRow = loc.rowName || extractRowFromLocation(loc.location);
      const locColumn = loc.columnIndex;
      
      return (
        locShelf === shelfName &&
        locRow === rowName &&
        (locColumn === columnIndex || 
         locColumn === String(columnIndex) ||
         parseInt(locColumn) === columnIndex)
      );
    });
    
    return location ? location.quantity : 0;
  };

  if (!isOpen || !selectedUnit) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl p-8 max-w-7xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-5 text-2xl cursor-pointer text-gray-500 hover:text-red-500 bg-none border-none p-1"
          onClick={onClose}
        >
          ×
        </button>
        
        <div className="text-center mb-8 pb-5 border-b-2 border-gray-100">
          <h2 className="text-slate-800 text-3xl mb-2">
            {selectedUnit?.title || `${selectedUnit?.type || 'Unknown Unit'}`}
          </h2>
          <p className="text-gray-600">{selectedUnit?.type || 'Storage Unit'}</p>
          {loading ? (
            <p className="text-blue-600 text-sm mt-2">Loading products...</p>
          ) : (
            <p className="text-green-600 text-sm mt-2">
              {products.length} product{products.length !== 1 ? 's' : ''} found in this unit
            </p>
          )}
          
          {/* Show remaining quantity indicator for multi-select mode */}
          {multiSelect && totalQuantity > 0 && (
            <div className="mt-3 inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-900 rounded-lg border-2 border-purple-300 shadow-md">
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium text-purple-600 uppercase">Total Quantity</span>
                <span className="text-2xl font-bold">{totalQuantity}</span>
              </div>
              <div className="h-12 w-px bg-purple-300"></div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium text-blue-600 uppercase">Allocated</span>
                <span className="text-2xl font-bold text-blue-700">{allocatedQuantity}</span>
              </div>
              <div className="h-12 w-px bg-purple-300"></div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium text-green-600 uppercase">Remaining</span>
                <span className={`text-2xl font-bold ${getRemainingQuantity() > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                  {getRemainingQuantity()}
                </span>
              </div>
            </div>
          )}
          
          {multiSelect && selectedLocations.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg border border-blue-300">
              <span className="text-lg">✓</span>
              <span className="text-sm font-medium">
                {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''} selected - Click empty cells to auto-allocate
              </span>
            </div>
          )}
          {highlightedProduct && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg border border-orange-300">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">
                Highlighting: {highlightedProduct.name}
                {highlightedProduct.locations && highlightedProduct.locations.length > 1 ? (
                  <span className="ml-1 px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full text-xs font-bold">
                    {highlightedProduct.locations.length} locations in this unit
                  </span>
                ) : highlightedProduct.shelfName && highlightedProduct.rowName ? (
                  <span className="ml-1">at {highlightedProduct.shelfName} - {highlightedProduct.rowName}</span>
                ) : null}
              </span>
            </div>
          )}
          
       
     
        </div>
        
        {/* Layout: Display all shelves in grid */}
        <div className="mb-5">
          {(() => {
            const normalShelves = selectedUnit.shelves.filter(shelf => shelf.type !== 'large-area');
            const zones = selectedUnit.shelves.filter(shelf => shelf.type === 'large-area');
            const hasZones = zones.length > 0;
            
            // If has zones (Unit 02): 2-column layout (shelves left, zones right)
            if (hasZones) {
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Normal Shelves */}
                  <div className="space-y-6">
                    {normalShelves.map((shelf, shelfIndex) => (
                      <div key={shelfIndex} className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b-2 border-blue-500 pb-2">
                          {shelf.name}
                        </h3>
                        {shelf.rows.map((row, rowIndex) => {
                          const rowName = typeof row === 'string' ? row : row.name || row;
                          const rowCapacity = (typeof row === 'object' && row.capacity) ? row.capacity : cellCapacity;
                          const columns = (typeof row === 'object' && row.columns) ? row.columns : 4;
                          
                          // Calculate per-cell capacity (row capacity divided by number of columns)
                          const perCellCapacity = Math.floor(rowCapacity / columns);
                          
                          return (
                            <div key={rowIndex} className="mb-4 last:mb-0">
                              <h4 className="text-xs font-semibold text-gray-600 mb-2 px-2 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{rowName}</span>
                                {perCellCapacity !== cellCapacity && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    Max: {perCellCapacity} pcs/cell
                                  </span>
                                )}
                              </h4>
                              <div className={`grid gap-2 ${
                                columns === 1 ? 'grid-cols-1' :
                                columns === 2 ? 'grid-cols-2' :
                                columns === 3 ? 'grid-cols-3' :
                                columns === 4 ? 'grid-cols-4' :
                                columns === 5 ? 'grid-cols-5' :
                                columns === 6 ? 'grid-cols-6' :
                                columns === 7 ? 'grid-cols-7' :
                                columns === 8 ? 'grid-cols-8' :
                                columns === 9 ? 'grid-cols-9' :
                                columns === 10 ? 'grid-cols-10' :
                                columns === 11 ? 'grid-cols-11' :
                                columns === 12 ? 'grid-cols-12' :
                                columns === 15 ? 'grid-cols-[repeat(15,minmax(0,1fr))]' :
                                'grid-cols-4'
                              }`}>
                                {Array.from({ length: columns }).map((_, slotIndex) => {
                                  const product = products.find(p => 
                                    p.shelfName === shelf.name && 
                                    p.rowName === rowName && 
                                    (p.columnIndexNumber === slotIndex || parseInt(p.columnIndex) === slotIndex || p.columnIndex === slotIndex)
                                  );
                                  const isOccupied = !!product;
                                  const isHighlighted = highlightedProduct && 
                                    highlightedProduct.shelfName === shelf.name &&
                                    highlightedProduct.rowName === rowName &&
                                    (highlightedProduct.columnIndexNumber === slotIndex || parseInt(highlightedProduct.columnIndex) === slotIndex);
                                  const isSelected = isLocationSelected(shelf.name, rowName, slotIndex);
                                  
                                  // For cursor logic: highlighted cells should be clickable even if occupied
                                  const isClickable = !viewOnly && (isSelected || isHighlighted || !isOccupied);
                                  
                                  return (
                                    <div 
                                      key={slotIndex}
                                      onClick={() => handleCellClick(shelf.name, rowName, slotIndex, perCellCapacity)}
                                      className={`border-2 rounded-md p-1.5 text-center text-xs min-h-[50px] flex flex-col items-center justify-center transition-all duration-200 relative ${
                                        isSelected
                                          ? 'bg-blue-100 border-blue-500 border-4 shadow-lg ring-4 ring-blue-300 cursor-pointer'
                                          : isHighlighted
                                          ? 'bg-orange-100 border-orange-500 border-4 shadow-lg ring-4 ring-orange-300 animate-pulse cursor-pointer'
                                          : isOccupied 
                                          ? 'bg-green-50 border-green-300 cursor-not-allowed opacity-80' 
                                          : viewOnly
                                          ? 'bg-gray-50 border-gray-200 cursor-default'
                                          : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer hover:shadow-md'
                                      }`}
                                      title={
                                        viewOnly
                                          ? isOccupied 
                                            ? `${product.name} - Qty: ${product.quantity || 0}`
                                            : `Empty slot - ${shelf.name} - ${rowName} - Column ${slotIndex + 1}`
                                          : isSelected
                                          ? `Click to remove allocation (${selectedLocations.find(loc => loc.id === `${selectedUnit?.title?.split(' - ')[0]}-${shelf.name}-${rowName}-${slotIndex}`)?.quantity || 0} pcs)`
                                          : isOccupied 
                                          ? `${product.name} - Qty: ${product.quantity || 0} - Slot is occupied`
                                          : getRemainingQuantity() > 0
                                          ? `Click to auto-allocate ${Math.min(getRemainingQuantity(), perCellCapacity)} pcs to this cell (Max: ${perCellCapacity})`
                                          : `All products allocated - Click blue cells to remove allocations`
                                      }
                                    >
                                      {isSelected ? (
                                        <>
                                          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors">
                                            ×
                                          </div>
                                          <span className="text-blue-700 text-sm font-bold">
                                            {selectedLocations.find(loc => loc.id === `${selectedUnit?.title?.split(' - ')[0]}-${shelf.name}-${rowName}-${slotIndex}`)?.quantity || 0}
                                          </span>
                                          <span className="text-blue-600 text-[10px] font-medium">pcs</span>
                                          <span className="text-gray-500 text-[9px]">Col {slotIndex + 1}</span>
                                        </>
                                      ) : isOccupied ? (
                                        <>
                                          <span className={`text-xs font-medium truncate w-full ${isHighlighted ? 'text-orange-700' : 'text-green-700'}`}>
                                            {product.name}
                                          </span>
                                          <span className={`text-[10px] mt-1 ${isHighlighted ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>
                                            Qty: {isHighlighted && highlightedProduct?.locations 
                                              ? getHighlightedLocationQuantity(shelf.name, rowName, slotIndex) 
                                              : product.quantity || 0}
                                          </span>
                                          <span className="text-gray-400 text-[9px]">Col {slotIndex + 1}</span>
                                          {isHighlighted && (
                                            <span className="absolute -top-1 -left-1 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                                              📍
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-gray-400 text-[10px]">Col {slotIndex + 1}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  
                  {/* Right: Zones in 2x2 grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
                    {zones.map((shelf, shelfIndex) => (
                      <div key={shelfIndex} className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                        <h3 className="text-md font-bold text-slate-800 mb-3 border-b-2 border-amber-500 pb-2">
                          {shelf.name}
                          <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-100 px-2 py-1 rounded block mt-1">
                            Large Storage Area
                          </span>
                        </h3>
                        
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 text-center">
                          <div className="mb-2">
                            <svg className="w-10 h-10 mx-auto text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.828a2 2 0 0 0-.586-1.414l-4.828-4.828A2 2 0 0 0 13.172 1H7zm5 0v5h5" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-semibold text-amber-900 mb-2">{shelf.rows[0]?.name || 'Storage Area'}</h4>
                          <p className="text-xs text-amber-700 mb-2">{shelf.description}</p>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-xs font-medium text-amber-800">Capacity:</span>
                            <span className="text-lg font-bold text-amber-600">{shelf.capacity} sheets</span>
                          </div>
                          {!viewOnly && (() => {
                            const zoneLocationKey = `${selectedUnit?.title?.split(' - ')[0]}-${shelf.name}-${shelf.rows[0]?.name || 'Stack'}-0`;
                            const isZoneSelected = selectedLocations.some(loc => loc.id === zoneLocationKey);
                            const zoneAllocation = selectedLocations.find(loc => loc.id === zoneLocationKey);
                            
                            if (isZoneSelected) {
                              return (
                                <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4 text-center relative shadow-lg">
                                  <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-600 transition-colors shadow-lg animate-pulse">
                                    ×
                                  </div>
                                  <div className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg">
                                    ✓
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-medium text-blue-600 uppercase">Allocated</span>
                                    <span className="text-3xl font-bold text-blue-700">{zoneAllocation?.quantity || 0}</span>
                                    <span className="text-sm text-blue-600">pcs</span>
                                    <span className="text-xs text-gray-500 mt-1">Click × to remove</span>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <button
                                onClick={() => handleCellClick(shelf.name, shelf.rows[0]?.name || 'Stack', 0, shelf.capacity)}
                                disabled={getRemainingQuantity() <= 0}
                                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md ${
                                  getRemainingQuantity() > 0
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white hover:shadow-lg cursor-pointer'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                                title={
                                  getRemainingQuantity() > 0
                                    ? `Click to auto-allocate ${Math.min(getRemainingQuantity(), shelf.capacity)} pcs to this zone (Max: ${shelf.capacity})`
                                    : 'All products allocated - Click blue zones to remove allocations'
                                }
                              >
                                {getRemainingQuantity() > 0 ? `Add ${Math.min(getRemainingQuantity(), shelf.capacity)} pcs` : 'Fully Allocated'}
                              </button>
                            );
                          })()}
                        </div>
                        
                        {/* Show products in this zone */}
                        {products.filter(p => p.shelfName === shelf.name).length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Current Stock:</h5>
                            <div className="space-y-1">
                              {products.filter(p => p.shelfName === shelf.name).map((product, idx) => (
                                <div key={idx} className="bg-green-50 border border-green-200 rounded p-2 text-xs">
                                  <p className="font-medium text-green-900">{product.name}</p>
                                  <p className="text-xs text-green-600">Qty: {product.quantity || 0}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            
            // No zones: Display shelves in grid (2, 3, 4, or 5 columns)
            const shelfCount = normalShelves.length;
            const gridCols = shelfCount === 5 ? 'lg:grid-cols-5' : shelfCount === 4 ? 'lg:grid-cols-4' : shelfCount === 3 ? 'lg:grid-cols-3' : shelfCount === 2 ? 'lg:grid-cols-2' : 'grid-cols-1';
            
            return (
              <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
                {normalShelves.map((shelf, shelfIndex) => (
                  <div key={shelfIndex} className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b-2 border-blue-500 pb-2">
                      {shelf.name}
                    </h3>
                    {shelf.rows.map((row, rowIndex) => {
                      const rowName = typeof row === 'string' ? row : row.name || row;
                      const rowCapacity = (typeof row === 'object' && row.capacity) ? row.capacity : cellCapacity;
                      const columns = (typeof row === 'object' && row.columns) ? row.columns : 4;
                      
                      // Calculate per-cell capacity (row capacity divided by number of columns)
                      const perCellCapacity = Math.floor(rowCapacity / columns);
                      
                      return (
                        <div key={rowIndex} className="mb-4 last:mb-0">
                          <h4 className="text-xs font-semibold text-gray-600 mb-2 px-2 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{rowName}</span>
                            {perCellCapacity !== cellCapacity && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                Max: {perCellCapacity} pcs/cell
                              </span>
                            )}
                          </h4>
                          <div className={`grid gap-2 ${
                            columns === 1 ? 'grid-cols-1' :
                            columns === 2 ? 'grid-cols-2' :
                            columns === 3 ? 'grid-cols-3' :
                            columns === 4 ? 'grid-cols-4' :
                            columns === 5 ? 'grid-cols-5' :
                            columns === 6 ? 'grid-cols-6' :
                            columns === 7 ? 'grid-cols-7' :
                            columns === 8 ? 'grid-cols-8' :
                            columns === 9 ? 'grid-cols-9' :
                            columns === 10 ? 'grid-cols-10' :
                            columns === 11 ? 'grid-cols-11' :
                            columns === 12 ? 'grid-cols-12' :
                            columns === 15 ? 'grid-cols-[repeat(15,minmax(0,1fr))]' :
                            'grid-cols-4'
                          }`}>
                            {Array.from({ length: columns }).map((_, slotIndex) => {
                              const product = products.find(p => 
                                p.shelfName === shelf.name && 
                                p.rowName === rowName && 
                                (p.columnIndexNumber === slotIndex || parseInt(p.columnIndex) === slotIndex || p.columnIndex === slotIndex)
                              );
                              const isOccupied = !!product;
                              const isHighlighted = isHighlightedLocation(shelf.name, rowName, slotIndex);
                              const isSelected = isLocationSelected(shelf.name, rowName, slotIndex);
                              
                              return (
                                <div 
                                  key={slotIndex}
                                  onClick={() => handleCellClick(shelf.name, rowName, slotIndex, perCellCapacity)}
                                  className={`border-2 rounded-md p-1.5 text-center text-xs min-h-[50px] flex flex-col items-center justify-center transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-blue-100 border-blue-500 border-4 shadow-lg ring-4 ring-blue-300 cursor-pointer'
                                      : isHighlighted
                                      ? 'bg-orange-100 border-orange-500 border-4 shadow-lg ring-4 ring-orange-300 animate-pulse cursor-pointer'
                                      : isOccupied 
                                      ? 'bg-green-50 border-green-300 cursor-not-allowed opacity-80' 
                                      : viewOnly
                                      ? 'bg-gray-50 border-gray-200 cursor-default'
                                      : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer hover:shadow-md'
                                  }`}
                                  title={
                                    viewOnly
                                      ? isOccupied 
                                        ? `${product.name} - Qty: ${product.quantity || 0}`
                                        : `Empty slot - ${shelf.name} - ${rowName} - Column ${slotIndex + 1}`
                                      : isSelected
                                      ? `Click to remove allocation (${selectedLocations.find(loc => loc.id === `${selectedUnit?.title?.split(' - ')[0]}-${shelf.name}-${rowName}-${slotIndex}`)?.quantity || 0} pcs)`
                                      : isOccupied 
                                      ? `${product.name} - Qty: ${product.quantity || 0} - Slot is occupied`
                                      : getRemainingQuantity() > 0
                                      ? `Click to auto-allocate ${Math.min(getRemainingQuantity(), perCellCapacity)} pcs to this cell (Max: ${perCellCapacity})`
                                      : `All products allocated - Click blue cells to remove allocations`
                                  }
                                >
                                  {isSelected ? (
                                    <>
                                      <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-600 transition-colors shadow-lg animate-pulse">
                                        ×
                                      </div>
                                      <div className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg">
                                        ✓
                                      </div>
                                      <span className="text-blue-700 text-sm font-bold">
                                        {selectedLocations.find(loc => loc.id === `${selectedUnit?.title?.split(' - ')[0]}-${shelf.name}-${rowName}-${slotIndex}`)?.quantity || 0}
                                      </span>
                                      <span className="text-blue-600 text-[10px] font-medium">pcs</span>
                                      <span className="text-gray-500 text-[9px]">Col {slotIndex + 1}</span>
                                    </>
                                  ) : isOccupied ? (
                                    <>
                                      <span className={`text-xs font-medium truncate w-full ${isHighlighted ? 'text-orange-700' : 'text-green-700'}`}>
                                        {product.name}
                                      </span>
                                      <span className={`text-[10px] mt-1 ${isHighlighted ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>
                                        Qty: {isHighlighted && highlightedProduct?.locations 
                                          ? getHighlightedLocationQuantity(shelf.name, rowName, slotIndex) 
                                          : product.quantity || 0}
                                      </span>
                                      <span className="text-gray-400 text-[9px]">Col {slotIndex + 1}</span>
                                      {isHighlighted && (
                                        <span className="absolute -top-1 -left-1 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                                          📍
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-400 text-[10px]">Col {slotIndex + 1}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default ShelfViewModal;
