

import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const ShelfViewModal = ({ isOpen, onClose, selectedUnit, onLocationSelect }) => {
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
      
      // Traverse the nested Firebase structure for this specific unit
      const shelvesRef = collection(db, 'Products', unitName, 'shelves');
      const shelvesSnapshot = await getDocs(shelvesRef);
      
      for (const shelfDoc of shelvesSnapshot.docs) {
        const shelfName = shelfDoc.id;
        
        const rowsRef = collection(db, 'Products', unitName, 'shelves', shelfName, 'rows');
        const rowsSnapshot = await getDocs(rowsRef);
        
        for (const rowDoc of rowsSnapshot.docs) {
          const rowName = rowDoc.id;
          
          const columnsRef = collection(db, 'Products', unitName, 'shelves', shelfName, 'rows', rowName, 'columns');
          const columnsSnapshot = await getDocs(columnsRef);
          
          for (const columnDoc of columnsSnapshot.docs) {
            const columnIndex = columnDoc.id;
            
            const itemsRef = collection(db, 'Products', unitName, 'shelves', shelfName, 'rows', rowName, 'columns', columnIndex, 'items');
            const itemsSnapshot = await getDocs(itemsRef);
            
            itemsSnapshot.docs.forEach(itemDoc => {
              const productData = itemDoc.data();
              products.push({
                ...productData,
                id: itemDoc.id,
                shelfName,
                rowName,
                columnIndex: parseInt(columnIndex),
                locationKey: `${shelfName}-${rowName}-${columnIndex}`
              });
            });
          }
        }
      }
      
      console.log('Found products:', products);
      setProducts(products);
    } catch (error) {
      console.error('Error fetching unit products:', error);
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
    const locationKey = `${shelfName}-${rowName}-${columnIndex}`;
    return products.find(product => product.locationKey === locationKey);
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
                    <h4 className="mb-2 text-slate-800 text-sm font-semibold">{row.name}</h4>
                    
                    {/* Display slots with products or empty */}
                    <div className={`grid gap-1.5 ${getGridClass(columnCount)}`}>
                      {emptySlots.map((slotIndex) => {
                        const product = getProductAtLocation(shelf.name, row.name, slotIndex);
                        const isOccupied = !!product;
                        
                        return (
                          <div 
                            key={slotIndex}
                            onClick={() => {
                              if (!isOccupied && onLocationSelect) {
                                onLocationSelect(shelf.name, row.name, slotIndex);
                              }
                            }}
                            className={`border-2 rounded-md p-1.5 text-center text-xs min-h-[50px] flex flex-col items-center justify-center transition-all duration-200 ${
                              isOccupied 
                                ? 'bg-green-50 border-green-300 cursor-not-allowed opacity-80' 
                                : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer hover:shadow-md'
                            }`}
                            title={
                              isOccupied 
                                ? `${product.name} - Qty: ${product.quantity || 0} - Slot is occupied`
                                : `Click to select ${shelf.name} - ${row.name} - Column ${slotIndex + 1}`
                            }
                          >
                            {isOccupied ? (
                              <>
                                <span className="text-green-700 text-xs font-medium truncate w-full">
                                  {product.name.length > 8 ? product.name.substring(0, 8) + '...' : product.name}
                                </span>
                                <span className="text-green-600 text-[10px] mt-1">
                                  Qty: {product.quantity || 0}
                                </span>
                                <span className="text-gray-400 text-[9px]">Col {slotIndex + 1}</span>
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
