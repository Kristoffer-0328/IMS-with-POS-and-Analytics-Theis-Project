import React from 'react';
import { FiBell, FiSearch } from 'react-icons/fi';

const InventoryHeader = () => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-700">
          <FiBell size={20} />
          <span className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
            2
          </span>
        </button>

        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">I love Toff</p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium shadow-sm">
            IT
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryHeader;
