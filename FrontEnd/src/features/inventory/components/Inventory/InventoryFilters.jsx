import React, { useState, useEffect } from 'react';
import { FiFilter } from 'react-icons/fi';
import { getDocs, collection ,getFirestore} from 'firebase/firestore'; // Assuming you're using Firebase
import app from '../../../../FirebaseConfig';
const db = getFirestore(app);
const InventoryFilters = ({
  currentFilter,
  setCurrentFilter,
  selectedCategory,
  setSelectedCategory,
  selectedStorageRoom,
  setSelectedStorageRoom,
  selectedChart,
  setSelectedChart,
  selectedMonth, // Added for Months filter
  setSelectedMonth, // Added for Months filter
}) => {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");

  // Fetch Categories from Firestore
  const fetchCategories = async () => {
    try {
      // Since categories are now stored within products, we need to get unique categories from all products
      // This is a simplified approach - in production, you might want to maintain a separate categories collection
      const categorySet = new Set();
      
      // Note: This is a placeholder since getting all product categories from the nested structure
      // would require traversing all storage locations. For now, we'll use common categories.
      const commonCategories = [
        'Hardware', 'Electrical', 'Plumbing', 'Paint', 'Tools', 
        'Automotive', 'Garden', 'Safety', 'Lighting', 'Building Materials'
      ];
      
      const fetchedCategories = commonCategories.map(cat => ({
        id: cat.toLowerCase().replace(/\s+/g, '-'),
        name: cat
      }));
      
      setCategories(fetchedCategories);
      if (fetchedCategories.length && !category) {
        setCategory(fetchedCategories[0].name); // Default to first category
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to common categories
      const fallbackCategories = [
        'Hardware', 'Electrical', 'Plumbing', 'Paint', 'Tools'
      ].map(cat => ({
        id: cat.toLowerCase(),
        name: cat
      }));
      setCategories(fallbackCategories);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 
    'August', 'September', 'October', 'November', 'December'
  ];

  // Add new filter options
  const filterOptions = [
    { label: 'Category', field: 'category' },
    { label: 'Sub-Category', field: 'subCategory' },
    { label: 'Brand', field: 'brand' },
    { label: 'Storage Type', field: 'storageType' },
    { label: 'Location', field: 'location' },
    { label: 'Supplier', field: 'supplier.name' }
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-sm whitespace-nowrap">Chart:</span>
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 min-w-[120px]"
            value={selectedChart}
            onChange={(e) => {
              const newValue = e.target.value;
              setSelectedChart(newValue);
               // Debug log for chart change
            }}
          >
            <option value="Stock Level">Stock Level</option>
            <option value="Stock Trend">Stock Trend</option>
          </select>
        </div>
      </div>

      {/* Conditional Filter Rendering */}
      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-sm whitespace-nowrap">Filter By:</span>
        <div className="relative">
          {/* Show current filter for Stock Level */}
          {selectedChart === 'Stock Level' && (
            <select
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 min-w-[120px]"
              value={currentFilter}
              onChange={(e) => setCurrentFilter(e.target.value)}
            >
              <option value="all">All Items</option>
              <option value="low-stock">Low Stock</option>
              <option value="expiring-soon">Expiring Soon</option>
            </select>
          )}

          {/* Show months filter for Stock Trend */}
          {selectedChart === 'Stock Trend' && (
            <select
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 min-w-[120px]"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">Select Month</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          )}
          
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <FiFilter size={14} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-sm whitespace-nowrap">Category:</span>
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 min-w-[120px]"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
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
        <span className="text-gray-600 text-sm whitespace-nowrap">Storage Location:</span>
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 min-w-[120px]"
            value={selectedStorageRoom}
            onChange={(e) => setSelectedStorageRoom(e.target.value)}
          >
            <option value="all">All Storage Units</option>
            <option value="Unit 01">Unit 01</option>
            <option value="Unit 02">Unit 02</option>
            <option value="Unit 03">Unit 03</option>
            <option value="Unit 04">Unit 04</option>
            <option value="Unit 05">Unit 05</option>
            <option value="Unit 06">Unit 06</option>
            <option value="Unit 07">Unit 07</option>
            <option value="Unit 08">Unit 08</option>
            <option value="Unit 09">Unit 09</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
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
