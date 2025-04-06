import React, { useState } from 'react';
import InventoryHeader from '../components/Inventory/InventoryHeader';
import InventoryChart from '../components/Inventory/InventoryChart';
import InventoryTable from '../components/Inventory/InventoryTable';
import InventoryFilters from '../components/Inventory/InventoryFilters';

const Inventory = () => {
  const [currentFilter, setCurrentFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentMonth, setCurrentMonth] = useState('October');

  // Sample data for the chart
  const chartData = [
    { name: 'Hammer', value: 60, color: '#FF4C76' },
    { name: 'Concrete Nails', value: 150, color: '#4779FF' },
    { name: 'GI Sheets', value: 210, color: '#4779FF' },
    { name: 'Bolts & Nuts', value: 30, color: '#FF4C76' },
    { name: 'Steel Rebars', value: 180, color: '#4779FF' },
    { name: 'Tie Wire', value: 170, color: '#4779FF' },
    { name: 'Plywood', value: 240, color: '#4779FF' },
    { name: 'Concrete', value: 300, color: '#4779FF' },
    { name: 'Long Span Roofing', value: 210, color: '#4779FF' },
    { name: 'Sealants', value: 140, color: '#FFC554' },
    { name: 'Cyclone Wire', value: 210, color: '#4779FF' },
    { name: 'Coco Lumber', value: 240, color: '#4779FF' },
    { name: 'Electrical Conduits', value: 130, color: '#FFC554' },
  ];

  // Sample inventory data
  const inventoryData = [
    {
      id: 1,
      name: 'Hammer',
      category: 'Tools',
      stockLevel: '60 pcs',
      status: 'in-stock',
      action: 'view',
    },
    {
      id: 2,
      name: 'Nails',
      category: 'Building',
      stockLevel: '150 pcs',
      status: 'low-stock',
      action: 'restock',
    },
    {
      id: 3,
      name: 'GI Sheets',
      category: 'Building',
      stockLevel: '210 pcs',
      status: 'in-stock',
      action: 'view',
    },
    {
      id: 4,
      name: 'Bolts & Nuts',
      category: 'Tools',
      stockLevel: '30 pcs',
      status: 'low-stock',
      action: 'restock',
    },
    {
      id: 5,
      name: 'Steel Rebars',
      category: 'Building',
      stockLevel: '180 pcs',
      status: 'in-stock',
      action: 'view',
    },
    {
      id: 6,
      name: 'Tie Wire',
      category: 'Building',
      stockLevel: '170 pcs',
      status: 'in-stock',
      action: 'view',
    },
    {
      id: 7,
      name: 'Plywood',
      category: 'Building',
      stockLevel: '240 pcs',
      status: 'in-stock',
      action: 'view',
    },
    {
      id: 8,
      name: 'Concrete',
      category: 'Building',
      stockLevel: '300 pcs',
      status: 'in-stock',
      action: 'view',
    },
    {
      id: 9,
      name: 'Sealants',
      category: 'Finishing',
      stockLevel: '140 pcs',
      status: 'expiring-soon',
      action: 'view',
    },
  ];

  // Filter inventory data based on current filters
  const getFilteredData = () => {
    let filtered = [...inventoryData];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (currentFilter === 'low-stock') {
      filtered = filtered.filter((item) => item.status === 'low-stock');
    } else if (currentFilter === 'expiring-soon') {
      filtered = filtered.filter((item) => item.status === 'expiring-soon');
    }

    return filtered;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 bg-gray-50">
      <InventoryHeader />

      <div className="bg-gradient-to-r from-orange-100/80 to-amber-100/30 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Inventory Management
            </h2>
            <p className="text-gray-600">View & Update Stock Levels</p>
          </div>

          <InventoryFilters
            currentFilter={currentFilter}
            setCurrentFilter={setCurrentFilter}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-gray-800 font-semibold">Glory Star Hardware</h3>
            <p className="text-xl font-bold">2,940</p>
          </div>
        </div>

        <InventoryChart data={chartData} />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-gray-800 font-semibold">Inventory Log</h3>
          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}>
              <option>October</option>
              <option>September</option>
              <option>August</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        <InventoryTable data={getFilteredData()} />
      </div>
    </div>
  );
};

export default Inventory;
