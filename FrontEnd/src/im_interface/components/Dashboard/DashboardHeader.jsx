import React from 'react';
import { FiBell, FiCalendar, FiSearch } from 'react-icons/fi';

const DashboardHeader = () => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Inventory Manager - Dashboard
        </p>
      </div>

      <div className="flex items-center gap-4 self-end sm:self-auto">
        {/* Search bar */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 w-44"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Date picker */}
        <button className="flex items-center gap-2 text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <FiCalendar className="text-gray-500" />
          <span className="text-sm">Today</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 bg-white rounded-lg border border-gray-200">
          <FiBell size={20} />
          <span className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
            2
          </span>
        </button>

        {/* User profile */}
        <div className="flex items-center gap-3">
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

export default DashboardHeader;
