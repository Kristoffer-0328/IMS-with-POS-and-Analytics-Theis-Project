import React, { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';
import ShelfViewModal from './ShelfViewModal';
import { getStorageUnits, updateStorageUnit, deleteStorageUnit, createStorageUnit } from '../../../../services/firebase/StorageServices';

const StorageFacilityInteractiveMap = ({ viewOnly = false, editMode = false, onChangesMade }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitCapacities, setUnitCapacities] = useState({});
  const [loading, setLoading] = useState(true);
  const [storageUnits, setStorageUnits] = useState([]);
  const [editingUnit, setEditingUnit] = useState(null);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [addingShelfToUnit, setAddingShelfToUnit] = useState(null);
  const db = getFirestore(app);

  // Transform storage units into a lookup object for modal display
  const shelfLayouts = useMemo(() => {
    return storageUnits.reduce((acc, unit) => {
      // Map unit-01 to unit1, unit-02 to unit2, etc. (remove hyphen and leading zero)
      const unitNumber = unit.id.split('-')[1]; // Gets "01", "02", etc.
      const unitKey = 'unit' + parseInt(unitNumber); // Converts to "unit1", "unit2", etc.
      
      // Extract name from title (e.g., "Unit 01 - Steel & Heavy Materials" -> "Steel & Heavy Materials")
      // If no title, use type as fallback
      const unitName = unit.title ? unit.title.split(' - ')[1] : (unit.name || unit.type || 'Unknown Unit');
      
      acc[unitKey] = {
        title: `Unit ${unitNumber} - ${unitName}`,
        type: unit.type,
        shelves: unit.shelves,
        info: {
          capacity: unit.capacity,
          description: `${unitName} storage area`
        }
      };
      return acc;
    }, {});
  }, [storageUnits]);

  // Fetch storage units from database
  const fetchStorageUnits = async () => {
    try {
      const result = await getStorageUnits();
      if (result.success) {
        setStorageUnits(result.data);
      } else {
        console.error('Error fetching storage units:', result.error);
      }
    } catch (error) {
      console.error('Error fetching storage units:', error);
    }
  };

  // Fetch unit capacities on component mount
  useEffect(() => {
    fetchStorageUnits();
  }, []);

  // Fetch capacities when storage units are loaded
  useEffect(() => {
    if (storageUnits.length > 0) {
      console.log('Storage units loaded:', storageUnits);
      console.log('Shelf layouts created:', shelfLayouts);
      fetchUnitCapacities();
    }
  }, [storageUnits]);

  // Calculate unit capacity based on actual products vs total slots
  const fetchUnitCapacities = async () => {
    try {
      const capacities = {};
      
      // Create a lookup for total slots from storage units data
      const unitTotalSlots = {};
      storageUnits.forEach(unit => {
        // Convert unit ID like "unit-01" to display name "Unit 01"
        const unitNumber = unit.id.split('-')[1];
        const displayName = `Unit ${unitNumber}`;
        unitTotalSlots[displayName] = unit.capacity;
      });

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
    console.log('Opening shelf view for:', unitId);
    console.log('Available shelfLayouts:', Object.keys(shelfLayouts));
    console.log('Selected unit data:', shelfLayouts[unitId]);
    console.log('Storage units data:', storageUnits);
    
    if (shelfLayouts[unitId]) {
      console.log('Setting selectedUnit to:', shelfLayouts[unitId]);
      setSelectedUnit(shelfLayouts[unitId]);
      setIsModalOpen(true);
    } else {
      console.error('Unit not found in shelfLayouts:', unitId);
      alert('Storage unit data not available. Please try again.');
    }
  };

  const closeShelfView = () => {
    setIsModalOpen(false);
    setSelectedUnit(null);
  };

  // Edit mode functions
  const handleEditUnit = (unitId) => {
    const unit = storageUnits.find(u => u.id === unitId);
    if (unit) {
      setEditingUnit(unit);
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (!confirm('Are you sure you want to delete this storage unit? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteStorageUnit(unitId);
      if (result.success) {
        // Refresh the storage units list
        await fetchStorageUnits();
        onChangesMade && onChangesMade();
        alert('Storage unit deleted successfully');
      } else {
        alert('Failed to delete storage unit: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting unit:', error);
      alert('Failed to delete storage unit');
    }
  };

  const handleAddShelf = (unitId) => {
    setAddingShelfToUnit(unitId);
  };

  const handleSaveUnit = async (unitData) => {
    try {
      let result;
      if (showAddUnit) {
        // Creating new unit
        result = await createStorageUnit(unitData);
      } else {
        // Updating existing unit
        result = await updateStorageUnit(unitData.id, unitData);
      }

      if (result.success) {
        // Refresh the storage units list
        await fetchStorageUnits();
        setEditingUnit(null);
        setShowAddUnit(false);
        onChangesMade && onChangesMade();
        alert(showAddUnit ? 'Storage unit created successfully' : 'Storage unit updated successfully');
      } else {
        alert(`Failed to ${showAddUnit ? 'create' : 'update'} storage unit: ` + result.error);
      }
    } catch (error) {
      console.error('Error saving unit:', error);
      alert(`Failed to ${showAddUnit ? 'create' : 'update'} storage unit`);
    }
  };

  const handleSaveShelf = async (shelfData) => {
    try {
      // Find the unit to add the shelf to
      const unit = storageUnits.find(u => u.id === addingShelfToUnit);
      if (!unit) {
        alert('Unit not found');
        return;
      }

      // Create the new shelf structure matching StorageUnitsConfig.js
      const newShelf = {
        name: shelfData.name,
        rows: shelfData.rows.map((row, index) => ({
          name: row.name,
          capacity: row.capacity,
          columns: row.columns
        }))
      };

      // Add the new shelf to the unit
      const updatedUnit = {
        ...unit,
        shelves: [...unit.shelves, newShelf]
      };

      const result = await updateStorageUnit(unit.id, updatedUnit);
      if (result.success) {
        // Refresh the storage units list
        await fetchStorageUnits();
        setAddingShelfToUnit(null);
        onChangesMade && onChangesMade();
        alert('Shelf added successfully');
      } else {
        alert('Failed to add shelf: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding shelf:', error);
      alert('Failed to add shelf');
    }
  };

  const handleCancelEdit = () => {
    setEditingUnit(null);
    setShowAddUnit(false);
    setAddingShelfToUnit(null);
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
            onClick={() => !editMode && openShelfView('unit1')}
            title={`Unit 01 - Steel & Heavy Materials`}
          >
            {editMode && (
              <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddShelf('unit-01'); }}
                  className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Add Shelf"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditUnit('unit-01'); }}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Edit Unit"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteUnit('unit-01'); }}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Delete Unit"
                >
                  Del
                </button>
              </div>
            )}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 01')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 01</div>
            <div className="text-sm text-gray-600 font-medium">Steel & Heavy Materials</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-red-500 bg-red-50 row-start-3 col-start-2"
            onClick={() => !editMode && openShelfView('unit2')}
            title={`Unit 02 - Lumber & Wood`}
          >
            {editMode && (
              <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddShelf('unit-02'); }}
                  className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Add Shelf"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditUnit('unit-02'); }}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Edit Unit"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteUnit('unit-02'); }}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Delete Unit"
                >
                  Del
                </button>
              </div>
            )}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 02')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 02</div>
            <div className="text-sm text-gray-600 font-medium">Lumber & Wood</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-red-500 bg-red-50 row-start-3 col-start-3"
            onClick={() => !editMode && openShelfView('unit3')}
            title={`Unit 03 - Cement & Aggregates`}
          >
            {editMode && (
              <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddShelf('unit-03'); }}
                  className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Add Shelf"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditUnit('unit-03'); }}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Edit Unit"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteUnit('unit-03'); }}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Delete Unit"
                >
                  Del
                </button>
              </div>
            )}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 03')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 03</div>
            <div className="text-sm text-gray-600 font-medium">Cement & Aggregates</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-red-500 bg-red-50 row-start-3 col-start-4"
            onClick={() => !editMode && openShelfView('unit4')}
            title={`Unit 04 - Electrical & Plumbing`}
          >
            {editMode && (
              <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddShelf('unit-04'); }}
                  className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Add Shelf"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditUnit('unit-04'); }}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Edit Unit"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteUnit('unit-04'); }}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Delete Unit"
                >
                  Del
                </button>
              </div>
            )}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 04')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 04</div>
            <div className="text-sm text-gray-600 font-medium">Electrical & Plumbing</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-orange-500 bg-orange-50 row-start-3 col-start-5"
            onClick={() => !editMode && openShelfView('unit5')}
            title={`Unit 05 - Paint & Coatings`}
          >
            {editMode && (
              <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddShelf('unit-05'); }}
                  className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Add Shelf"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditUnit('unit-05'); }}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Edit Unit"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteUnit('unit-05'); }}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Delete Unit"
                >
                  Del
                </button>
              </div>
            )}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 05')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 05</div>
            <div className="text-sm text-gray-600 font-medium">Paint & Coatings</div>
          </div>
          
          {/* Upper units */}
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-orange-500 bg-orange-50 row-start-1 col-start-6"
            onClick={() => !editMode && openShelfView('unit6')}
            title={`Unit 06 - Insulation & Foam`}
          >
            {editMode && (
              <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddShelf('unit-06'); }}
                  className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Add Shelf"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditUnit('unit-06'); }}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Edit Unit"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteUnit('unit-06'); }}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Delete Unit"
                >
                  Del
                </button>
              </div>
            )}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 06')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 06</div>
            <div className="text-sm text-gray-600 font-medium">Insulation & Foam</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-orange-500 bg-orange-50 row-start-2 col-start-6"
            onClick={() => !editMode && openShelfView('unit7')}
            title={`Unit 07 - Miscellaneous`}
          >
            {editMode && (
              <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddShelf('unit-07'); }}
                  className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Add Shelf"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditUnit('unit-07'); }}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Edit Unit"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteUnit('unit-07'); }}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Delete Unit"
                >
                  Del
                </button>
              </div>
            )}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 07')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 07</div>
            <div className="text-sm text-gray-600 font-medium">Miscellaneous</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-green-500 bg-green-50 row-start-1 col-start-7"
            onClick={() => !editMode && openShelfView('unit8')}
            title={`Unit 08 - Roofing Materials`}
          >
            {editMode && (
              <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddShelf('unit-08'); }}
                  className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Add Shelf"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditUnit('unit-08'); }}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Edit Unit"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteUnit('unit-08'); }}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Delete Unit"
                >
                  Del
                </button>
              </div>
            )}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 08')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 08</div>
            <div className="text-sm text-gray-600 font-medium">Roofing Materials</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm border-green-500 bg-green-50 row-start-2 col-start-7"
            onClick={() => !editMode && openShelfView('unit9')}
            title={`Unit 09 - Hardware & Fasteners`}
          >
            {editMode && (
              <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddShelf('unit-09'); }}
                  className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Add Shelf"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditUnit('unit-09'); }}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Edit Unit"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteUnit('unit-09'); }}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                  title="Delete Unit"
                >
                  Del
                </button>
              </div>
            )}
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

      {/* Edit Unit Modal */}
      {(editingUnit || showAddUnit) && (
        <EditUnitModal
          unit={editingUnit}
          isOpen={true}
          onClose={handleCancelEdit}
          onSave={handleSaveUnit}
          isNew={showAddUnit}
        />
      )}

      {/* Add Shelf Modal */}
      {addingShelfToUnit && (
        <AddShelfModal
          unitId={addingShelfToUnit}
          isOpen={true}
          onClose={handleCancelEdit}
          onSave={handleSaveShelf}
        />
      )}
    </div>
  );
};

// Edit Unit Modal Component
const EditUnitModal = ({ unit, isOpen, onClose, onSave, isNew }) => {
  const [formData, setFormData] = useState({
    name: unit?.name || '',
    type: unit?.type || '',
    capacity: unit?.capacity || 0,
    shelves: unit?.shelves || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...unit,
      ...formData,
      id: unit?.id || `unit-${String(storageUnits.length + 1).padStart(2, '0')}`
    });
  };

  const updateShelf = (shelfIndex, field, value) => {
    const updatedShelves = [...formData.shelves];
    if (field === 'name') {
      updatedShelves[shelfIndex] = { ...updatedShelves[shelfIndex], name: value };
    }
    setFormData({ ...formData, shelves: updatedShelves });
  };

  const updateRow = (shelfIndex, rowIndex, field, value) => {
    const updatedShelves = [...formData.shelves];
    const updatedRows = [...updatedShelves[shelfIndex].rows];
    updatedRows[rowIndex] = { 
      ...updatedRows[rowIndex], 
      [field]: field === 'name' ? value : parseInt(value) || 0 
    };
    updatedShelves[shelfIndex] = { ...updatedShelves[shelfIndex], rows: updatedRows };
    setFormData({ ...formData, shelves: updatedShelves });
  };

  const addShelf = () => {
    setFormData({
      ...formData,
      shelves: [...formData.shelves, { 
        name: `Shelf ${formData.shelves.length + 1}`, 
        rows: [{ name: 'Row 1', capacity: 96, columns: 4 }] 
      }]
    });
  };

  const addRowToShelf = (shelfIndex) => {
    const updatedShelves = [...formData.shelves];
    const shelf = updatedShelves[shelfIndex];
    const newRowNumber = shelf.rows.length + 1;
    updatedShelves[shelfIndex] = {
      ...shelf,
      rows: [...shelf.rows, { name: `Row ${newRowNumber}`, capacity: 96, columns: 4 }]
    };
    setFormData({ ...formData, shelves: updatedShelves });
  };

  const removeShelf = (index) => {
    const updatedShelves = formData.shelves.filter((_, i) => i !== index);
    setFormData({ ...formData, shelves: updatedShelves });
  };

  const removeRowFromShelf = (shelfIndex, rowIndex) => {
    const updatedShelves = [...formData.shelves];
    const shelf = updatedShelves[shelfIndex];
    if (shelf.rows.length > 1) {
      updatedShelves[shelfIndex] = {
        ...shelf,
        rows: shelf.rows.filter((_, i) => i !== rowIndex)
      };
      setFormData({ ...formData, shelves: updatedShelves });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]">
      <div className="bg-white rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-300">
        <button 
          className="absolute top-4 right-5 text-2xl cursor-pointer text-gray-500 hover:text-red-500 bg-none border-none p-1"
          onClick={onClose}
        >
          ×
        </button>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isNew ? 'Add New Storage Unit' : 'Edit Storage Unit'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isNew ? 'Create a new storage unit with shelves and configuration' : 'Modify the storage unit configuration'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Capacity</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              required
            />
          </div>

          {/* Shelves Configuration */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Shelves Configuration</h3>
              <button
                type="button"
                onClick={addShelf}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                + Add Shelf
              </button>
            </div>

            <div className="space-y-4">
              {formData.shelves.map((shelf, shelfIndex) => (
                <div key={shelfIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 mr-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Name</label>
                      <input
                        type="text"
                        value={shelf.name}
                        onChange={(e) => updateShelf(shelfIndex, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Round Tubes"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeShelf(shelfIndex)}
                      className="text-red-600 hover:text-red-800 text-sm mt-6"
                    >
                      Remove Shelf
                    </button>
                  </div>

                  {/* Rows for this shelf */}
                  <div className="ml-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900">Rows</h4>
                      <button
                        type="button"
                        onClick={() => addRowToShelf(shelfIndex)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        + Add Row
                      </button>
                    </div>

                    <div className="space-y-2">
                      {shelf.rows && shelf.rows.map((row, rowIndex) => (
                        <div key={rowIndex} className="border border-gray-300 rounded p-3 bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-700">Row {rowIndex + 1}</span>
                            {shelf.rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRowFromShelf(shelfIndex, rowIndex)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Name</label>
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => updateRow(shelfIndex, rowIndex, 'name', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Row 1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Capacity</label>
                              <input
                                type="number"
                                value={row.capacity}
                                onChange={(e) => updateRow(shelfIndex, rowIndex, 'capacity', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                min="1"
                                placeholder="96"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Columns</label>
                              <input
                                type="number"
                                value={row.columns}
                                onChange={(e) => updateRow(shelfIndex, rowIndex, 'columns', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                min="1"
                                placeholder="4"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isNew ? 'Create Unit' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Shelf Modal Component
const AddShelfModal = ({ unitId, isOpen, onClose, onSave }) => {
  const [shelfName, setShelfName] = useState('');
  const [rows, setRows] = useState([{ name: 'Row 1', capacity: 96, columns: 4 }]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!shelfName.trim()) {
      alert('Please enter a shelf name');
      return;
    }
    if (rows.length === 0) {
      alert('Please add at least one row');
      return;
    }
    onSave({
      name: shelfName.trim(),
      rows: rows
    });
  };

  const addRow = () => {
    const newRowNumber = rows.length + 1;
    setRows([...rows, { name: `Row ${newRowNumber}`, capacity: 96, columns: 4 }]);
  };

  const updateRow = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: field === 'name' ? value : parseInt(value) || 0 };
    setRows(updatedRows);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]">
      <div className="bg-white rounded-2xl p-8 max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-300">
        <button 
          className="absolute top-4 right-5 text-2xl cursor-pointer text-gray-500 hover:text-red-500 bg-none border-none p-1"
          onClick={onClose}
        >
          ×
        </button>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Add New Shelf to Unit {unitId.split('-')[1]}
          </h2>
          <p className="text-gray-600 mt-1">
            Configure the shelf name and row details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shelf Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shelf Name</label>
            <input
              type="text"
              value={shelfName}
              onChange={(e) => setShelfName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Round Tubes"
              required
            />
          </div>

          {/* Rows Configuration */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Rows Configuration</h3>
              <button
                type="button"
                onClick={addRow}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                + Add Row
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-gray-900">Row {index + 1}</h4>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Row Name</label>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Row 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                      <input
                        type="number"
                        value={row.capacity}
                        onChange={(e) => updateRow(index, 'capacity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        placeholder="96"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Columns</label>
                      <input
                        type="number"
                        value={row.columns}
                        onChange={(e) => updateRow(index, 'columns', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        placeholder="4"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Shelf
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StorageFacilityInteractiveMap;
