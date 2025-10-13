import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';
import ShelfViewModal from './ShelfViewModal';
import { STORAGE_UNITS } from '../../config/StorageUnitsConfig';

const StorageFacilityInteractiveMap = ({ viewOnly = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitCapacities, setUnitCapacities] = useState({});
  const [loading, setLoading] = useState(true);
  const db = getFirestore(app);

  // Transform STORAGE_UNITS into a lookup object for modal display
  const shelfLayouts = STORAGE_UNITS.reduce((acc, unit) => {
    // Map unit-01 to unit1, unit-02 to unit2, etc. (remove hyphen and leading zero)
    const unitNumber = unit.id.split('-')[1]; // Gets "01", "02", etc.
    const unitKey = 'unit' + parseInt(unitNumber); // Converts to "unit1", "unit2", etc.
    acc[unitKey] = {
      title: unit.title,
      type: unit.type,
      shelves: unit.shelves,
      info: {
        capacity: unit.capacity,
        description: `${unit.title} storage area`
      }
    };
    return acc;
  }, {});

  // Fetch unit capacities on component mount
  useEffect(() => {
    fetchUnitCapacities();
  }, []);

  // Calculate unit capacity based on actual products vs total slots
  const fetchUnitCapacities = async () => {
    try {
      const capacities = {};
      
      // Define total slots for each unit based on shelf layout
      const unitTotalSlots = {
        'Unit 01': 4 * 8 + 4 * 12 + 4 * 7 + 4 * 8, // Round Tubes (4×8) + Square Bars (4×12) + Channels & Flat Bars (4×7) + Angle Irons & L-Beams (4×8) = 140
        'Unit 02': 4 * 8 + 6, // Shelf A (4 cols * 8 rows) + 6 Bulk Zones (6 large areas)
        'Unit 03': 15 * 10, // Zone 1 (15 cols × 10 rows) = 150 pallets
        'Unit 04': 4 * 8 * 4, // 4 Shelves (Shelf 1-2 Electrical, Shelf 3-4 Plumbing) × 8 rows × 4 cols = 128
        'Unit 05': 5 * 8 * 4, // 5 Shelves × 8 rows × 4 cols = 160
        'Unit 06': 4 * 8 * 4, // 4 Shelves (Fiberglass, Foam, Vapor Barriers, Tools) × 8 rows × 4 cols = 128
        'Unit 07': 4 * 8 * 4, // 4 Shelves (Safety, Adhesives, Accessories, Spare Materials) × 8 rows × 4 cols = 128
        'Unit 08': 4 * 8 * 4, // 4 Shelves (Roofing Sheets, Flashing, Accessories, Gutters) × 8 rows × 4 cols = 128
        'Unit 09': 4 * 8 * 4 // 4 Shelves (Screws, Nails, Hand Tools, Power Tools) × 8 rows × 4 cols = 128
      };

      // Fetch products from nested structure: Products/{storageUnit}/products/{productId}
      const productsRef = collection(db, 'Products');
      const storageUnitsSnapshot = await getDocs(productsRef);
      
      // Count products per unit (group base products + variants)
      const unitProductCounts = {};
      const processedParentIds = new Set(); // Track base products we've already counted
      
      // Iterate through each storage unit
      for (const storageUnitDoc of storageUnitsSnapshot.docs) {
        const unitId = storageUnitDoc.id;
        
        // Skip non-storage unit documents
        if (!unitId.startsWith('Unit ')) {
          continue;
        }
        
        // Fetch products subcollection for this storage unit
        const productsSubcollectionRef = collection(db, 'Products', unitId, 'products');
        const productsSnapshot = await getDocs(productsSubcollectionRef);
        
        // Initialize counter for this unit
        if (!unitProductCounts[unitId]) {
          unitProductCounts[unitId] = 0;
        }
        
        productsSnapshot.docs.forEach(doc => {
          const product = doc.data();
          
          // If it's a variant, only count if we haven't counted its parent
          if (product.isVariant && product.parentProductId) {
            const parentKey = `${unitId}_${product.parentProductId}`;
            if (!processedParentIds.has(parentKey)) {
              processedParentIds.add(parentKey);
              unitProductCounts[unitId]++;
            }
          } else if (!product.isVariant) {
            // It's a base product, count it once
            const productKey = `${unitId}_${doc.id}`;
            if (!processedParentIds.has(productKey)) {
              processedParentIds.add(productKey);
              unitProductCounts[unitId]++;
            }
          }
        });
      }
      
      // Calculate capacities for each unit
      for (const unitName in unitTotalSlots) {
        const productCount = unitProductCounts[unitName] || 0;
        const totalSlots = unitTotalSlots[unitName];
        const occupancyRate = productCount / totalSlots;
        
        capacities[unitName] = {
          productCount,
          totalSlots,
          occupancyRate,
          status: getCapacityStatus(occupancyRate)
        };
        
        console.log(`${unitName}: ${productCount} products / ${totalSlots} slots (${(occupancyRate * 100).toFixed(1)}%)`);
      }
      
      setUnitCapacities(capacities);
    } catch (error) {
      console.error('Error fetching unit capacities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine capacity status based on occupancy rate
  const getCapacityStatus = (occupancyRate) => {
    if (occupancyRate >= 0.9) return 'full';      // 90%+ = full (red)
    if (occupancyRate >= 0.6) return 'occupied';  // 60-89% = occupied (yellow/orange)
    return 'available';                           // <60% = available (green)
  };

  // Open shelf view modal
  const openShelfView = (unitId) => {
    setSelectedUnit(shelfLayouts[unitId]);
    setIsModalOpen(true);
  };

  const closeShelfView = () => {
    setIsModalOpen(false);
    setSelectedUnit(null);
  };

  const getStatusColor = (unitName) => {
    const capacity = unitCapacities[unitName];
    if (!capacity) return 'bg-gray-400'; // Loading or no data
    
    switch (capacity.status) {
      case 'full': return 'bg-red-500';      // 90%+ occupied
      case 'occupied': return 'bg-yellow-500'; // 60-89% occupied  
      case 'available': return 'bg-green-500'; // <60% occupied
      default: return 'bg-gray-400';
    }
  };

  // Get capacity info for tooltip
  const getCapacityInfo = (unitName) => {
    const capacity = unitCapacities[unitName];
    if (!capacity) return 'Loading...';
    
    const percentage = (capacity.occupancyRate * 100).toFixed(1);
    return `${capacity.productCount}/${capacity.totalSlots} slots (${percentage}%)`;
  };

  return (
    <div className="max-w-7xl mx-auto p-5">
      {/* Legend */}
      <div className="flex justify-center gap-5 mb-8 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Available (&lt;60%)</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Occupied (60-89%)</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Full (90%+)</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-sm font-medium">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            <span>Loading capacity data...</span>
          </div>
        )}
      </div>

      {/* Facility Map */}
      <div className="bg-transparent rounded-2xl p-10 relative min-h-[600px]">
        <div className="grid grid-cols-7 grid-rows-3 gap-0.5 h-[500px] relative bg-gray-50 border-4 border-slate-800 p-1 w-full">
          {/* Construction Materials Units 01-05 (Bottom row) */}
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-red-500 bg-red-50 row-start-3 col-start-1"
            onClick={() => openShelfView('unit1')}
            title={`Unit 01 - ${getCapacityInfo('Unit 01')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 01')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 01</div>
            <div className="text-sm text-gray-600 font-medium">Steel & Heavy Materials</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-red-500 bg-red-50 row-start-3 col-start-2"
            onClick={() => openShelfView('unit2')}
            title={`Unit 02 - ${getCapacityInfo('Unit 02')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 02')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 02</div>
            <div className="text-sm text-gray-600 font-medium">Lumber & Wood</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-red-500 bg-red-50 row-start-3 col-start-3"
            onClick={() => openShelfView('unit3')}
            title={`Unit 03 - ${getCapacityInfo('Unit 03')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 03')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 03</div>
            <div className="text-sm text-gray-600 font-medium">Cement & Aggregates</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-red-500 bg-red-50 row-start-3 col-start-4"
            onClick={() => openShelfView('unit4')}
            title={`Unit 04 - ${getCapacityInfo('Unit 04')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 04')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 04</div>
            <div className="text-sm text-gray-600 font-medium">Electrical & Plumbing</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-orange-500 bg-orange-50 row-start-3 col-start-5"
            onClick={() => openShelfView('unit5')}
            title={`Unit 05 - ${getCapacityInfo('Unit 05')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 05')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 05</div>
            <div className="text-sm text-gray-600 font-medium">Paint & Coatings</div>
          </div>
          
          {/* Upper units */}
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-orange-500 bg-orange-50 row-start-1 col-start-6"
            onClick={() => openShelfView('unit6')}
            title={`Unit 06 - ${getCapacityInfo('Unit 06')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 06')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 06</div>
            <div className="text-sm text-gray-600 font-medium">Insulation & Foam</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-orange-500 bg-orange-50 row-start-2 col-start-6"
            onClick={() => openShelfView('unit7')}
            title={`Unit 07 - ${getCapacityInfo('Unit 07')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 07')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 07</div>
            <div className="text-sm text-gray-600 font-medium">Miscellaneous</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-green-500 bg-green-50 row-start-1 col-start-7"
            onClick={() => openShelfView('unit8')}
            title={`Unit 08 - ${getCapacityInfo('Unit 08')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 08')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 08</div>
            <div className="text-sm text-gray-600 font-medium">Roofing Materials</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-green-500 bg-green-50 row-start-2 col-start-7"
            onClick={() => openShelfView('unit9')}
            title={`Unit 09 - ${getCapacityInfo('Unit 09')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 09')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 09</div>
            <div className="text-sm text-gray-600 font-medium">Hardware & Fasteners</div>
          </div>
          
          {/* Front Desk - Static, non-clickable */}
          <div className="bg-gray-300 border-2 border-gray-500 p-4 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm font-bold row-start-3 col-start-6 col-span-2">
            <div className="text-sm text-gray-600 font-medium">Front Desk</div>
          </div>
        </div>
      </div>

      {/* Shelf View Modal */}
      <ShelfViewModal 
        isOpen={isModalOpen}
        onClose={closeShelfView}
        selectedUnit={selectedUnit}
        viewOnly={viewOnly}
      />
    </div>
  );
};

export default StorageFacilityInteractiveMap;
