import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

const SearchBar = ({ searchQuery, setSearchQuery, disabled, placeholder }) => {
  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FiSearch className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || "Search products..."}
        className={`
          block w-full pl-10 pr-12 py-2.5
          bg-gray-50 border border-gray-200
          rounded-xl text-sm
          placeholder-gray-500
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
        `}
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          disabled={disabled}
          className={`
            absolute inset-y-0 right-0 pr-3 flex items-center
            text-gray-400 hover:text-gray-600
            transition-colors duration-200
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <FiX className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
