import React from 'react';
import { FiBell, FiSearch } from 'react-icons/fi';

const InventoryHeader = () => {
  return (
    <div className="flex justify-between items-center mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
        <span className="hidden sm:inline-block px-3 py-1 bg-orange-100 text-orange-600 text-sm font-medium rounded-full">
          Management
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Notification Button */}
        <button className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <FiBell size={20} />
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full animate-pulse">
            2
          </span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800">I love Toff</p>
            <p className="text-xs text-gray-500 font-medium">Administrator</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-medium shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            IT
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryHeader;
