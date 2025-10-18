import React, { useState, useEffect } from 'react';

const StorageFacilityInteractiveMap = ({ viewOnly = false, editMode = false, onChangesMade }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitCapacities, setUnitCapacities] = useState({});
  const [loading, setLoading] = useState(true);
  const [storageUnits, setStorageUnits] = useState([]);
  const [editingUnit, setEditingUnit] = useState(null);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [addingShelfToUnit, setAddingShelfToUnit] = useState(null);

  // Mock data for demonstration
  const mockStorageUnits = [
    {
      id: 'unit-01',
      name: 'Steel & Heavy Materials',
      type: 'Heavy Duty',
      capacity: 384,
      shelves: [
        {
          name: 'I-Beams',
          rows: [
            { name: 'Row 1', capacity: 96, columns: 4 },
            { name: 'Row 2', capacity: 96, columns: 4 }
          ]
        },
        {
          name: 'Steel Plates',
          rows: [
            { name: 'Row 1', capacity: 96, columns: 4 },
            { name: 'Row 2', capacity: 96, columns: 4 }
          ]
        }
      ]
    },
    {
      id: 'unit-02',
      name: 'Lumber & Wood',
      type: 'Standard',
      capacity: 288,
      shelves: [
        {
          name: 'Plywood',
          rows: [{ name: 'Row 1', capacity: 144, columns: 6 }]
        },
        {
          name: '2x4 Lumber',
          rows: [{ name: 'Row 1', capacity: 144, columns: 6 }]
        }
      ]
    },
    {
      id: 'unit-03',
      name: 'Cement & Aggregates',
      type: 'Heavy Duty',
      capacity: 320,
      shelves: [
        {
          name: 'Bags',
          rows: [{ name: 'Row 1', capacity: 160, columns: 8 }, { name: 'Row 2', capacity: 160, columns: 8 }]
        }
      ]
    },
    {
      id: 'unit-04',
      name: 'Electrical & Plumbing',
      type: 'Standard',
      capacity: 256,
      shelves: [
        {
          name: 'Electrical',
          rows: [{ name: 'Row 1', capacity: 128, columns: 8 }]
        },
        {
          name: 'Plumbing',
          rows: [{ name: 'Row 1', capacity: 128, columns: 8 }]
        }
      ]
    },
    {
      id: 'unit-05',
      name: 'Paint & Coatings',
      type: 'Standard',
      capacity: 192,
      shelves: [
        {
          name: 'Paints',
          rows: [{ name: 'Row 1', capacity: 96, columns: 6 }]
        },
        {
          name: 'Coatings',
          rows: [{ name: 'Row 1', capacity: 96, columns: 6 }]
        }
      ]
    },
    {
      id: 'unit-06',
      name: 'Insulation & Foam',
      type: 'Light',
      capacity: 160,
      shelves: [
        {
          name: 'Insulation',
          rows: [{ name: 'Row 1', capacity: 160, columns: 8 }]
        }
      ]
    },
    {
      id: 'unit-07',
      name: 'Miscellaneous',
      type: 'Standard',
      capacity: 200,
      shelves: [
        {
          name: 'General',
          rows: [{ name: 'Row 1', capacity: 200, columns: 10 }]
        }
      ]
    },
    {
      id: 'unit-08',
      name: 'Roofing Materials',
      type: 'Standard',
      capacity: 240,
      shelves: [
        {
          name: 'Shingles',
          rows: [{ name: 'Row 1', capacity: 120, columns: 6 }]
        },
        {
          name: 'Metal',
          rows: [{ name: 'Row 1', capacity: 120, columns: 6 }]
        }
      ]
    },
    {
      id: 'unit-09',
      name: 'Hardware & Fasteners',
      type: 'Light',
      capacity: 180,
      shelves: [
        {
          name: 'Screws & Bolts',
          rows: [{ name: 'Row 1', capacity: 90, columns: 6 }]
        },
        {
          name: 'Nails',
          rows: [{ name: 'Row 1', capacity: 90, columns: 6 }]
        }
      ]
    }
  ];

  // Mock capacity data
  const mockCapacities = {
    'Unit 01': { productCount: 350, totalSlots: 384, occupancyRate: 0.91, status: 'full' },
    'Unit 02': { productCount: 210, totalSlots: 288, occupancyRate: 0.73, status: 'occupied' },
    'Unit 03': { productCount: 290, totalSlots: 320, occupancyRate: 0.91, status: 'full' },
    'Unit 04': { productCount: 180, totalSlots: 256, occupancyRate: 0.70, status: 'occupied' },
    'Unit 05': { productCount: 100, totalSlots: 192, occupancyRate: 0.52, status: 'available' },
    'Unit 06': { productCount: 85, totalSlots: 160, occupancyRate: 0.53, status: 'available' },
    'Unit 07': { productCount: 130, totalSlots: 200, occupancyRate: 0.65, status: 'occupied' },
    'Unit 08': { productCount: 45, totalSlots: 240, occupancyRate: 0.19, status: 'available' },
    'Unit 09': { productCount: 110, totalSlots: 180, occupancyRate: 0.61, status: 'occupied' }
  };

  useEffect(() => {
    setTimeout(() => {
      setStorageUnits(mockStorageUnits);
      setUnitCapacities(mockCapacities);
      setLoading(false);
    }, 1000);
  }, []);

  const shelfLayouts = storageUnits.reduce((acc, unit) => {
    const unitNumber = unit.id.split('-')[1];
    const unitKey = 'unit' + parseInt(unitNumber);
    acc[unitKey] = {
      title: `Unit ${unitNumber} - ${unit.name}`,
      type: unit.type,
      shelves: unit.shelves,
      info: {
        capacity: unit.capacity,
        description: `${unit.name} storage area`
      }
    };
    return acc;
  }, {});

  const openShelfView = (unitId) => {
    setSelectedUnit(shelfLayouts[unitId]);
    setIsModalOpen(true);
  };

  const closeShelfView = () => {
    setIsModalOpen(false);
    setSelectedUnit(null);
  };

  const handleEditUnit = (unitId) => {
    const unit = storageUnits.find(u => u.id === unitId);
    if (unit) {
      setEditingUnit(unit);
    }
  };

  const handleDeleteUnit = (unitId) => {
    if (!confirm('Are you sure you want to delete this storage unit?')) return;
    const updatedUnits = storageUnits.filter(u => u.id !== unitId);
    setStorageUnits(updatedUnits);
    alert('Storage unit deleted successfully');
  };

  const handleAddShelf = (unitId) => {
    setAddingShelfToUnit(unitId);
  };

  const handleSaveUnit = (unitData) => {
    if (showAddUnit) {
      setStorageUnits([...storageUnits, unitData]);
      alert('Storage unit created successfully');
    } else {
      const updatedUnits = storageUnits.map(u => u.id === unitData.id ? unitData : u);
      setStorageUnits(updatedUnits);
      alert('Storage unit updated successfully');
    }
    setEditingUnit(null);
    setShowAddUnit(false);
  };

  const handleSaveShelf = (shelfData) => {
    const unit = storageUnits.find(u => u.id === addingShelfToUnit);
    if (!unit) {
      alert('Unit not found');
      return;
    }

    const updatedUnit = {
      ...unit,
      shelves: [...unit.shelves, shelfData]
    };

    const updatedUnits = storageUnits.map(u => u.id === unit.id ? updatedUnit : u);
    setStorageUnits(updatedUnits);
    setAddingShelfToUnit(null);
    alert('Shelf added successfully');
  };

  const handleCancelEdit = () => {
    setEditingUnit(null);
    setShowAddUnit(false);
    setAddingShelfToUnit(null);
  };

  const getStatusColor = (unitName) => {
    const capacity = unitCapacities[unitName];
    if (!capacity) return 'bg-slate-400';
    
    switch (capacity.status) {
      case 'full': return 'bg-red-500';
      case 'occupied': return 'bg-amber-500';
      case 'available': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusGlow = (unitName) => {
    const capacity = unitCapacities[unitName];
    if (!capacity) return '';
    
    switch (capacity.status) {
      case 'full': return 'shadow-[0_0_15px_rgba(239,68,68,0.4)]';
      case 'occupied': return 'shadow-[0_0_15px_rgba(245,158,11,0.4)]';
      case 'available': return 'shadow-[0_0_15px_rgba(16,185,129,0.4)]';
      default: return '';
    }
  };

  const getCapacityInfo = (unitName) => {
    const capacity = unitCapacities[unitName];
    if (!capacity) return 'Loading...';
    
    const percentage = (capacity.occupancyRate * 100).toFixed(1);
    return `${capacity.productCount}/${capacity.totalSlots} slots (${percentage}%)`;
  };

  const getUnitBorderColor = (status) => {
    switch (status) {
      case 'full': return 'border-red-400 hover:border-red-500';
      case 'occupied': return 'border-amber-400 hover:border-amber-500';
      case 'available': return 'border-emerald-400 hover:border-emerald-500';
      default: return 'border-slate-300 hover:border-slate-400';
    }
  };

  const getUnitBgColor = (status) => {
    switch (status) {
      case 'full': return 'bg-red-50/80 hover:bg-red-50';
      case 'occupied': return 'bg-amber-50/80 hover:bg-amber-50';
      case 'available': return 'bg-emerald-50/80 hover:bg-emerald-50';
      default: return 'bg-white hover:bg-slate-50';
    }
  };

  const StorageUnitCard = ({ unitId, unitNumber, unitName, position }) => {
    const displayName = `Unit ${unitNumber}`;
    const capacity = unitCapacities[displayName];
    const status = capacity?.status || 'loading';
    
    return (
      <div 
        className={`relative ${getUnitBgColor(status)} border-2 ${getUnitBorderColor(status)} 
                    p-4 cursor-pointer transition-all duration-300 
                    flex flex-col justify-center items-center text-center min-h-[100px]
                    hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1
                    backdrop-blur-sm ${position} rounded-lg`}
        onClick={() => !editMode && openShelfView(`unit${parseInt(unitNumber)}`)}
        title={`${displayName} - ${getCapacityInfo(displayName)}`}
      >
        {editMode && (
          <div className="absolute top-2 right-2 flex gap-1.5 z-20">
            <button
              onClick={(e) => { e.stopPropagation(); handleAddShelf(unitId); }}
              className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg 
                       flex items-center justify-center text-xs font-semibold shadow-lg 
                       hover:shadow-xl transition-all duration-200 hover:scale-110"
              title="Add Shelf"
            >
              +
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleEditUnit(unitId); }}
              className="w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-lg 
                       flex items-center justify-center text-[10px] font-semibold shadow-lg 
                       hover:shadow-xl transition-all duration-200 hover:scale-110"
              title="Edit Unit"
            >
              ✎
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unitId); }}
              className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg 
                       flex items-center justify-center text-xs font-semibold shadow-lg 
                       hover:shadow-xl transition-all duration-200 hover:scale-110"
              title="Delete Unit"
            >
              ×
            </button>
          </div>
        )}
        
        <div className={`absolute top-2 left-2 w-4 h-4 rounded-full ${getStatusColor(displayName)} 
                        ${getStatusGlow(displayName)} animate-pulse`}></div>
        
        <div className="space-y-1">
          <div className="text-xl font-bold text-slate-800 tracking-tight">
            Unit {unitNumber}
          </div>
          <div className="text-sm text-slate-600 font-medium">
            {unitName}
          </div>
          {capacity && (
            <div className="text-xs text-slate-500 mt-2 font-semibold">
              {(capacity.occupancyRate * 100).toFixed(0)}% Full
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Storage Facility Map</h1>
        <p className="text-slate-600">Interactive storage unit management system</p>
      </div>

      <div className="flex justify-center gap-4 mb-10 flex-wrap">
        <div className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-emerald-50 to-emerald-100 
                      rounded-xl text-sm font-semibold shadow-md border border-emerald-200">
          <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          <span className="text-emerald-800">Available (&lt;60%)</span>
        </div>
        <div className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-amber-50 to-amber-100 
                      rounded-xl text-sm font-semibold shadow-md border border-amber-200">
          <div className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
          <span className="text-amber-800">Occupied (60-89%)</span>
        </div>
        <div className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-red-50 to-red-100 
                      rounded-xl text-sm font-semibold shadow-md border border-red-200">
          <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
          <span className="text-red-800">Full (90%+)</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-blue-50 to-blue-100 
                        rounded-xl text-sm font-semibold shadow-md border border-blue-200">
            <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-blue-800">Loading...</span>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-3xl p-8 
                    shadow-2xl border border-slate-200 relative min-h-[650px]">
        <div className="grid grid-cols-7 grid-rows-3 gap-3 h-[550px] relative 
                      bg-gradient-to-br from-slate-50 to-white 
                      border-4 border-slate-700 rounded-xl p-4 shadow-inner">
          
          <StorageUnitCard unitId="unit-01" unitNumber="01" unitName="Steel & Heavy Materials" position="row-start-3 col-start-1" />
          <StorageUnitCard unitId="unit-02" unitNumber="02" unitName="Lumber & Wood" position="row-start-3 col-start-2" />
          <StorageUnitCard unitId="unit-03" unitNumber="03" unitName="Cement & Aggregates" position="row-start-3 col-start-3" />
          <StorageUnitCard unitId="unit-04" unitNumber="04" unitName="Electrical & Plumbing" position="row-start-3 col-start-4" />
          <StorageUnitCard unitId="unit-05" unitNumber="05" unitName="Paint & Coatings" position="row-start-3 col-start-5" />
          <StorageUnitCard unitId="unit-06" unitNumber="06" unitName="Insulation & Foam" position="row-start-1 col-start-6" />
          <StorageUnitCard unitId="unit-07" unitNumber="07" unitName="Miscellaneous" position="row-start-2 col-start-6" />
          <StorageUnitCard unitId="unit-08" unitNumber="08" unitName="Roofing Materials" position="row-start-1 col-start-7" />
          <StorageUnitCard unitId="unit-09" unitNumber="09" unitName="Hardware & Fasteners" position="row-start-2 col-start-7" />
          
          <div className="bg-gradient-to-br from-slate-300 to-slate-400 border-2 border-slate-600 
                        p-4 relative flex flex-col justify-center items-center text-center 
                        min-h-[100px] shadow-lg rounded-lg row-start-3 col-start-6 col-span-2">
            <div className="text-lg font-bold text-slate-800 mb-1">🏢</div>
            <div className="text-sm text-slate-700 font-bold">Front Desk</div>
          </div>
        </div>
      </div>

      {isModalOpen && selectedUnit && (
        <ShelfViewModal isOpen={isModalOpen} onClose={closeShelfView} selectedUnit={selectedUnit} viewOnly={viewOnly} />
      )}

      {(editingUnit || showAddUnit) && (
        <EditUnitModal unit={editingUnit} isOpen={true} onClose={handleCancelEdit} onSave={handleSaveUnit} isNew={showAddUnit} storageUnits={storageUnits} />
      )}

      {addingShelfToUnit && (
        <AddShelfModal unitId={addingShelfToUnit} isOpen={true} onClose={handleCancelEdit} onSave={handleSaveShelf} />
      )}
    </div>
  );
};

const ShelfViewModal = ({ isOpen, onClose, selectedUnit, viewOnly }) => {
  if (!isOpen || !selectedUnit) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]">
      <div className="bg-white rounded-3xl p-8 max-w-5xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200">
        <button className="absolute top-6 right-6 text-3xl text-slate-400 hover:text-red-500 transition-colors w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-full" onClick={onClose}>×</button>
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedUnit.title}</h2>
          <p className="text-slate-600">{selectedUnit.info.description}</p>
          <div className="mt-2 text-sm text-slate-500">
            Capacity: {selectedUnit.info.capacity} slots | Type: {selectedUnit.type}
          </div>
        </div>

        <div className="space-y-6">
          {selectedUnit.shelves && selectedUnit.shelves.map((shelf, idx) => (
            <div key={idx} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-4">📚 {shelf.name}</h3>
              <div className="space-y-3">
                {shelf.rows.map((row, rowIdx) => (
                  <div key={rowIdx} className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-slate-700">{row.name}</span>
                      <span className="text-sm text-slate-500">Capacity: {row.capacity} | Columns: {row.columns}</span>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${row.columns}, 1fr)` }}>
                      {Array.from({ length: row.columns }).map((_, colIdx) => (
                        <div key={colIdx} className="h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg border border-blue-300 flex items-center justify-center text-xs font-semibold text-blue-800">
                          Col {colIdx + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const EditUnitModal = ({ unit, isOpen, onClose, onSave, isNew, storageUnits }) => {
  const [formData, setFormData] = useState({
    name: unit?.name || '',
    type: unit?.type || '',
    capacity: unit?.capacity || 0,
    shelves: unit?.shelves || []
  });

  const handleSubmit = () => {
    onSave({
      ...unit,
      ...formData,
      id: unit?.id || `unit-${String((storageUnits?.length || 0) + 1).padStart(2, '0')}`
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
      shelves: [...formData.shelves, { name: `Shelf ${formData.shelves.length + 1}`, rows: [{ name: 'Row 1', capacity: 96, columns: 4 }] }]
    });
  };

  const addRowToShelf = (shelfIndex) => {
    const updatedShelves = [...formData.shelves];
    const shelf = updatedShelves[shelfIndex];
    updatedShelves[shelfIndex] = {
      ...shelf,
      rows: [...shelf.rows, { name: `Row ${shelf.rows.length + 1}`, capacity: 96, columns: 4 }]
    };
    setFormData({ ...formData, shelves: updatedShelves });
  };

  const removeShelf = (index) => {
    setFormData({ ...formData, shelves: formData.shelves.filter((_, i) => i !== index) });
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]">
      <div className="bg-white rounded-3xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200">
        <button className="absolute top-6 right-6 text-3xl text-slate-400 hover:text-red-500 transition-colors w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-full" onClick={onClose}>×</button>
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{isNew ? '✨ Add New Storage Unit' : '✏️ Edit Storage Unit'}</h2>
          <p className="text-slate-600">{isNew ? 'Create a new storage unit with shelves and configuration' : 'Modify the storage unit configuration'}</p>
        </div>

        <div className="space-y-8">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">📋 Basic Information</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Unit Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white" placeholder="e.g., Steel & Heavy Materials" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                <input type="text" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white" placeholder="e.g., Heavy Duty" />
              </div>
            </div>
            <div className="mt-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Total Capacity</label>
              <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white" min="1" placeholder="e.g., 384" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900">📚 Shelves Configuration</h3>
              <button type="button" onClick={addShelf} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">+ Add Shelf</button>
            </div>

            <div className="space-y-5">
              {formData.shelves.map((shelf, shelfIndex) => (
                <div key={shelfIndex} className="border-2 border-slate-200 rounded-xl p-5 bg-white shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 mr-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Shelf Name</label>
                      <input type="text" value={shelf.name} onChange={(e) => updateShelf(shelfIndex, 'name', e.target.value)} className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="e.g., Round Tubes" />
                    </div>
                    <button type="button" onClick={() => removeShelf(shelfIndex)} className="text-red-600 hover:text-white hover:bg-red-500 px-3 py-2 rounded-lg text-sm font-semibold transition-all mt-7">🗑️ Remove</button>
                  </div>

                  <div className="ml-2 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-slate-900">Rows</h4>
                      <button type="button" onClick={() => addRowToShelf(shelfIndex)} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 font-semibold shadow-md hover:shadow-lg transition-all">+ Add Row</button>
                    </div>

                    <div className="space-y-3">
                      {shelf.rows && shelf.rows.map((row, rowIndex) => (
                        <div key={rowIndex} className="border border-slate-300 rounded-lg p-4 bg-slate-50">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-sm font-semibold text-slate-700">Row {rowIndex + 1}</span>
                            {shelf.rows.length > 1 && (
                              <button type="button" onClick={() => removeRowFromShelf(shelfIndex, rowIndex)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Remove</button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                              <input type="text" value={row.name} onChange={(e) => updateRow(shelfIndex, rowIndex, 'name', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white" placeholder="Row 1" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Capacity</label>
                              <input type="number" value={row.capacity} onChange={(e) => updateRow(shelfIndex, rowIndex, 'capacity', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white" min="1" placeholder="96" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Columns</label>
                              <input type="number" value={row.columns} onChange={(e) => updateRow(shelfIndex, rowIndex, 'columns', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white" min="1" placeholder="4" />
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

          <div className="flex justify-end gap-4 pt-6 border-t-2 border-slate-200">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 font-semibold transition-all hover:scale-105 shadow-md">Cancel</button>
            <button type="button" onClick={handleSubmit} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">{isNew ? '✨ Create Unit' : '💾 Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddShelfModal = ({ unitId, isOpen, onClose, onSave }) => {
  const [shelfName, setShelfName] = useState('');
  const [rows, setRows] = useState([{ name: 'Row 1', capacity: 96, columns: 4 }]);

  const handleSubmit = () => {
    if (!shelfName.trim()) {
      alert('Please enter a shelf name');
      return;
    }
    if (rows.length === 0) {
      alert('Please add at least one row');
      return;
    }
    onSave({ name: shelfName.trim(), rows: rows });
  };

  const addRow = () => {
    setRows([...rows, { name: `Row ${rows.length + 1}`, capacity: 96, columns: 4 }]);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]">
      <div className="bg-white rounded-3xl p-8 max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200">
        <button className="absolute top-6 right-6 text-3xl text-slate-400 hover:text-red-500 transition-colors w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-full" onClick={onClose}>×</button>
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">📚 Add New Shelf to Unit {unitId.split('-')[1]}</h2>
          <p className="text-slate-600">Configure the shelf name and row details</p>
        </div>

        <div className="space-y-8">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Shelf Name</label>
            <input type="text" value={shelfName} onChange={(e) => setShelfName(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white" placeholder="e.g., Round Tubes" />
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900">Rows Configuration</h3>
              <button type="button" onClick={addRow} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">+ Add Row</button>
            </div>

            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={index} className="border-2 border-slate-200 rounded-xl p-5 bg-white shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-slate-900">Row {index + 1}</h4>
                    {rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(index)} className="text-red-600 hover:text-white hover:bg-red-500 px-3 py-1 rounded-lg text-sm font-semibold transition-all">Remove</button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Row Name</label>
                      <input type="text" value={row.name} onChange={(e) => updateRow(index, 'name', e.target.value)} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white" placeholder="e.g., Row 1" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Capacity</label>
                      <input type="number" value={row.capacity} onChange={(e) => updateRow(index, 'capacity', e.target.value)} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white" min="1" placeholder="96" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Columns</label>
                      <input type="number" value={row.columns} onChange={(e) => updateRow(index, 'columns', e.target.value)} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white" min="1" placeholder="4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t-2 border-slate-200">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 font-semibold transition-all hover:scale-105 shadow-md">Cancel</button>
            <button type="button" onClick={handleSubmit} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">✨ Add Shelf</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageFacilityInteractiveMap;