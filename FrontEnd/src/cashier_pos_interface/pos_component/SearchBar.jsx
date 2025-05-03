import React from 'react';
import { FiSearch } from 'react-icons/fi';

function SearchBar({ searchQuery, setSearchQuery, disabled }) {
  return (
    <div className="mb-4 relative">
      <input
        type="text"
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
        disabled={disabled}
      />
      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
    </div>
  );
}

export default SearchBar;