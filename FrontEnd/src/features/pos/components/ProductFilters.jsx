import React, { useMemo, useState } from 'react';
import { FiFilter, FiX, FiBox, FiTag, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const ProductFilters = ({ 
  products, 
  selectedCategory, 
  setSelectedCategory,
  selectedBrand,
  setSelectedBrand 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique categories and brands
  const categories = useMemo(() => {
    return [...new Set(products.map(product => product.category))].sort();
  }, [products]);

  // Get brands based on selected category
  const brands = useMemo(() => {
    let brandSet = new Set();
    products.forEach(product => {
      if (!selectedCategory || product.category === selectedCategory) {
        brandSet.add(product.brand || 'Generic');
      }
    });
    return [...brandSet].sort();
  }, [products, selectedCategory]);

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FiFilter className="text-orange-500" size={18} />
          <span className="font-medium text-gray-700">Quick Filters</span>
          {(selectedCategory || selectedBrand) && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
              Active filters
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(selectedCategory || selectedBrand) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearFilters();
              }}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 flex items-center gap-1.5 transition-colors"
            >
              <FiX size={14} />
              <span>Clear</span>
            </button>
          )}
          {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-2 divide-x border-t">
          {/* Categories Column */}
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <FiBox className="text-gray-400" />
              <h3 className="text-sm font-medium text-gray-600">Categories</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto p-1">
              <button
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                  !selectedCategory 
                    ? 'bg-orange-500 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCategory(null)}
              >
                <FiBox size={18} className="mb-1" />
                <span className="text-xs font-medium text-center">All</span>
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                    selectedCategory === category 
                      ? 'bg-orange-500 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <FiBox size={18} className="mb-1" />
                  <span className="text-xs font-medium text-center line-clamp-2">{category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brands Column */}
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <FiTag className="text-gray-400" />
              <h3 className="text-sm font-medium text-gray-600">Brands</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto p-1">
              <button
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                  !selectedBrand 
                    ? 'bg-orange-500 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedBrand(null)}
              >
                <FiTag size={18} className="mb-1" />
                <span className="text-xs font-medium text-center">All</span>
              </button>
              {brands.map((brand) => (
                <button
                  key={brand}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                    selectedBrand === brand 
                      ? 'bg-orange-500 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedBrand(brand)}
                >
                  <FiTag size={18} className="mb-1" />
                  <span className="text-xs font-medium text-center line-clamp-2">{brand}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters; 