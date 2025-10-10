

import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const ShelfViewModal = ({ isOpen, onClose, selectedUnit, onLocationSelect, highlightedProduct }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const db = getFirestore(app);

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
      console.log('Fetching products for unit:', unitName);

      const products = [];
      
      // NEW NESTED STRUCTURE: Products/{Unit}/products/{productId}
      // Each product document has storageLocation, shelfName, rowName, columnIndex fields
      const productsRef = collection(db, 'Products', unitName, 'products');
      const productsSnapshot = await getDocs(productsRef);

      console.log(`Found ${productsSnapshot.docs.length} products in ${unitName}`);

      productsSnapshot.docs.forEach(productDoc => {
        const productData = productDoc.data();
        
        // Build product info with location data from document fields
        const productInfo = {
          ...productData,
          id: productDoc.id,
          shelfName: productData.shelfName || '',
          rowName: productData.rowName || '',
          columnIndex: productData.columnIndex || '', // Keep as is (string or number)
          columnIndexNumber: parseInt(productData.columnIndex) || 0, // Also store as number
          locationKey: `${productData.shelfName}-${productData.rowName}-${productData.columnIndex}`
        };

        console.log('Product loaded:', {
          name: productInfo.name,
          location: productInfo.locationKey,
          shelf: productInfo.shelfName,
          row: productInfo.rowName,
          column: productInfo.columnIndex
        });

        products.push(productInfo);
      });

      console.log(`Successfully loaded ${products.length} products from ${unitName}`);
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
    
    const found = products.find(product => 
      product.locationKey === locationKey1 || 
      product.locationKey === locationKey2 ||
      (product.shelfName === shelfName && 
       product.rowName === rowName && 
       (product.columnIndex === columnIndex || 
        product.columnIndex === String(columnIndex) ||
        product.columnIndexNumber === columnIndex))
    );
    
    if (found) {

    }
    
    return found;
  };

  // Check if this is the highlighted product
  const isHighlightedLocation = (shelfName, rowName, columnIndex) => {
    if (!highlightedProduct) return false;
    
    
    
    // Match by shelf, row, and column (handle both string and number formats)
    return (
      highlightedProduct.shelfName === shelfName &&
      highlightedProduct.rowName === rowName &&
      (highlightedProduct.columnIndex === columnIndex || 
       highlightedProduct.columnIndex === String(columnIndex) ||
       parseInt(highlightedProduct.columnIndex) === columnIndex)
    );
  };

  if (!isOpen || !selectedUnit) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
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
          <h2 className="text-slate-800 text-3xl mb-2">{selectedUnit.title}</h2>
          <p className="text-gray-600">{selectedUnit.type}</p>
          {loading ? (
            <p className="text-blue-600 text-sm mt-2">Loading products...</p>
          ) : (
            <p className="text-green-600 text-sm mt-2">
              {products.length} product{products.length !== 1 ? 's' : ''} found in this unit
            </p>
          )}
          {highlightedProduct && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg border border-orange-300">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">
                Highlighting: {highlightedProduct.name} at {highlightedProduct.shelfName} - {highlightedProduct.rowName}
              </span>
            </div>
          )}
          
          {/* Debug Info - Remove after fixing */}
          {products.length > 0 && (
            <details className="mt-4 text-left bg-gray-100 p-3 rounded">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">🔍 Debug: Show Products Data</summary>
              <div className="mt-2 text-xs space-y-1 max-h-40 overflow-y-auto">
                {products.map((p, i) => (
                  <div key={i} className="bg-white p-2 rounded mb-1">
                    <div><strong>Name:</strong> {p.name}</div>
                    <div><strong>Location:</strong> {p.shelfName} - {p.rowName} - Col {p.columnIndex}</div>
                    <div><strong>LocationKey:</strong> {p.locationKey}</div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
        
        {/* Side by side layout for all units */}
        <div className={`grid gap-6 mb-5 ${
          selectedUnit.shelves.length === 1 ? 'grid-cols-1' :
          selectedUnit.shelves.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
          selectedUnit.shelves.length === 3 ? 'grid-cols-1 lg:grid-cols-3' :
          'grid-cols-1 lg:grid-cols-2'
        }`}>
          {selectedUnit.shelves.map((shelf, shelfIndex) => (
            <div key={shelfIndex} className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b-2 border-blue-500 pb-2">
                {shelf.name}
              </h3>
              
              {shelf.rows.map((row, rowIndex) => {
                // Use the actual row string, not row.name
                const rowName = typeof row === 'string' ? row : row.name || row;
                
                
                // Determine the number of columns based on unit and shelf
                const getColumnCount = () => {
                  if (selectedUnit.title.includes('Unit 01')) {
                    if (shelf.name.includes('Shelf A')) return 4;
                    if (shelf.name.includes('Shelf B')) return 5;
                    if (shelf.name.includes('Shelf C')) return 6;
                    return 4;
                  } else if (selectedUnit.title.includes('Unit 02')) {
                    return 4;
                  } else if (selectedUnit.title.includes('Unit 03')) {
                    return 4;
                  } else if (selectedUnit.title.includes('Unit 04')) {
                    return 4;
                  } else if (selectedUnit.title.includes('Unit 05')) {
                    return 4;
                  } else if (selectedUnit.title.includes('Unit 06')) {
                    return 4;
                  } else if (selectedUnit.title.includes('Unit 08')) {
                    if (shelf.name.includes('Shelf A')) return 4;
                    if (shelf.name.includes('Shelf B')) return 5;
                    return 4;
                  } else if (selectedUnit.title.includes('Unit 09')) {
                    return 4;
                  }
                  return 4;
                };

                const columnCount = getColumnCount();
                const emptySlots = Array.from({ length: columnCount }, (_, index) => index);

                // Get the proper Tailwind grid class
                const getGridClass = (count) => {
                  switch (count) {
                    case 1: return 'grid-cols-1';
                    case 2: return 'grid-cols-2';
                    case 3: return 'grid-cols-3';
                    case 4: return 'grid-cols-4';
                    case 5: return 'grid-cols-5';
                    case 6: return 'grid-cols-6';
                    case 7: return 'grid-cols-7';
                    case 8: return 'grid-cols-8';
                    default: return 'grid-cols-4';
                  }
                };

                return (
                  <div key={rowIndex} className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg border-l-4 border-blue-500 mb-3">
                    <h4 className="mb-2 text-slate-800 text-sm font-semibold">{rowName}</h4>
                    
                    {/* Display slots with products or empty */}
                    <div className={`grid gap-1.5 ${getGridClass(columnCount)}`}>
                      {emptySlots.map((slotIndex) => {
                        const product = getProductAtLocation(shelf.name, rowName, slotIndex);
                        const isOccupied = !!product;
                        const isHighlighted = isHighlightedLocation(shelf.name, rowName, slotIndex);
                        
                        return (
                          <div 
                            key={slotIndex}
                            onClick={() => {
                              if (!isOccupied && onLocationSelect) {
                                onLocationSelect(shelf.name, row.name, slotIndex);
                              }
                            }}
                            className={`border-2 rounded-md p-1.5 text-center text-xs min-h-[50px] flex flex-col items-center justify-center transition-all duration-200 ${
                              isHighlighted
                                ? 'bg-orange-100 border-orange-500 border-4 shadow-lg ring-4 ring-orange-300 animate-pulse cursor-pointer'
                                : isOccupied 
                                ? 'bg-green-50 border-green-300 cursor-not-allowed opacity-80' 
                                : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer hover:shadow-md'
                            }`}
                            title={
                              isOccupied 
                                ? `${product.name} - Qty: ${product.quantity || 0} - Slot is occupied`
                                : `Click to select ${shelf.name} - ${rowName} - Column ${slotIndex + 1}`
                            }
                          >
                            {isOccupied ? (
                              <>
                                <span className={`text-xs font-medium truncate w-full ${
                                  isHighlighted ? 'text-orange-700' : 'text-green-700'
                                }`}>
                                  {product.name.length > 8 ? product.name.substring(0, 8) + '...' : product.name}
                                </span>
                                <span className={`text-[10px] mt-1 ${
                                  isHighlighted ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                  Qty: {product.quantity || 0}
                                </span>
                                <span className="text-gray-400 text-[9px]">Col {slotIndex + 1}</span>
                                {isHighlighted && (
                                  <span className="text-orange-600 text-[10px] font-bold mt-1">
                                    📍 HERE
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-gray-400 text-xs">Empty</span>
                                <span className="text-gray-300 text-[10px] mt-1">Col {slotIndex + 1}</span>
                              </>
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
      </div>
    </div>
  );
};

export default ShelfViewModal;
