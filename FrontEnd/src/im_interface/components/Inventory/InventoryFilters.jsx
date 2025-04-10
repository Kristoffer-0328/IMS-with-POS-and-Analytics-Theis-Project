import React from 'react';
import { FiFilter } from 'react-icons/fi';

const InventoryFilters = ({
  currentFilter,
  setCurrentFilter,
  selectedCategory,
  setSelectedCategory,
  selectedStorageRoom,
  setSelectedStorageRoom,
}) => {
  const categories = [
    'all',
    'Tools',
    'Building',
    'Finishing',
    'Electrical',
    'Plumbing',
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
      
      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-sm whitespace-nowrap">
          Filter By:
        </span>
        
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 min-w-[120px]"
            value={currentFilter}
            onChange={(e) => setCurrentFilter(e.target.value)}>
            <option value="all">All Items</option>
            <option value="low-stock">Low Stock</option>
            <option value="expiring-soon">Expiring Soon</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <FiFilter size={14} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        
        <span className="text-gray-600 text-sm whitespace-nowrap">
          Category:
        </span>
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 min-w-[120px]"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.slice(1).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
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
      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-sm whitespace-nowrap">
          Storage Room:
        </span>
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 min-w-[120px]"
            value={selectedStorageRoom}
            onChange={(e) => setSelectedStorageRoom(e.target.value)}>
            <option value="all">All Rooms</option>
            <option value="STR A1">STR A1</option>
            <option value="STR A2">STR A2</option>
            <option value="STR A3">STR A3</option>
            <option value="STR B1">STR B1</option>
            <option value="STR B2">STR B2</option>
            <option value="STR B3">STR B3</option>
            <option value="STR C1">STR C1</option>
            <option value="STR C2">STR C2</option>
            <option value="STR C3">STR C3</option>
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
    </div>
  );
};

export default InventoryFilters;
