import React, { useState, useEffect } from 'react';

// Single, clean component implementation
const StorageFacilityInteractiveMap = ({ viewOnly = false, editMode = false }) => {
  const [units, setUnits] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const items = Array.from({ length: 9 }).map((_, i) => ({
      id: `unit-${String(i + 1).padStart(2, '0')}`,
      name: [
        'Steel & Heavy Materials','Lumber & Wood','Cement & Aggregates','Electrical & Plumbing',
        'Paint & Coatings','Insulation & Foam','Miscellaneous','Roofing Materials','Hardware & Fasteners'
      ][i],
      capacity: 200 + i * 20,
      shelves: [{ name: 'Shelf 1', rows: [{ name: 'Row 1', capacity: 96, columns: 4 }] }]
    }));

    setUnits(items);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Storage Facility Map</h2>
      <div className="grid grid-cols-3 gap-4">
        {units.map((u, i) => (
          <div key={u.id} onClick={() => !editMode && setSelected(u)} className="p-4 rounded border cursor-pointer">
            <div className="font-bold">Unit {String(i+1).padStart(2,'0')}</div>
            <div className="text-sm text-gray-600">{u.name}</div>
            <div className="text-xs mt-2 text-gray-700">{Math.round(u.capacity * 0.6)}/{u.capacity} slots</div>
          </div>
        ))}
      </div>

      {selected && <ShelfViewModal unit={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

const ShelfViewModal = ({ unit, onClose }) => {
  if (!unit) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-3/4 max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{unit.name}</h3>
          <button onClick={onClose} className="text-xl">x</button>
        </div>
        <div>
          {unit.shelves.map((s, si) => (
            <div key={si} className="mb-3">
              <div className="font-semibold">{s.name}</div>
              {s.rows.map((r, ri) => (
                <div key={ri} className="mt-2 p-2 border rounded-sm bg-gray-50">{r.name} - Capacity {r.capacity} - Columns {r.columns}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StorageFacilityInteractiveMap;
