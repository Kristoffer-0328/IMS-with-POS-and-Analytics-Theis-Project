import React, { useState, useEffect } from 'react';
import InventoryHeader from '../components/Inventory/InventoryHeader';
import InventoryChart from '../components/Inventory/InventoryChart';
import InventoryTrendChart from '../components/Inventory/InventoryTrendChart';
import InventoryTable from '../components/Inventory/InventoryTable';
import InventoryFilters from '../components/Inventory/InventoryFilters';
import AddProductModal from '../components/Inventory/AddProductPopUpOld';
import ViewProductModal from '../components/Inventory/ViewProductModal';
import { useServices } from '../../FirebaseBackEndQuerry/ProductServices';
import { FiPlusCircle, FiUpload, FiSearch } from 'react-icons/fi';
import ImportCVGModal from '../components/Inventory/ImportCVGModal';
import ProductChoice from '../components/Inventory/ProductChoices';
import CategoryMOdalIndex from '../components/Inventory/CategoryModal/CategoryModalIndex';
const Inventory = () => {
  const [currentFilter, setCurrentFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStorageRoom, setSelectedStorageRoom] = useState('all');
  const [selectedChart, setSelectedChart] = useState('Stock Level');
  const [currentMonth, setCurrentMonth] = useState('October');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [open, setopen] = useState(false);
  const [isImportModalOpen, setImportIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const { listenToProducts } = useServices();
  const [products, setProduct] = useState([]);
  const [categorymodal, setcategorymodal] = useState(false);
  
  // New state for the ViewProductModal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Function to handle opening the view product modal
  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  useEffect(() => {
    const unsubscribe = listenToProducts(setProduct);
    return () => unsubscribe();
  }, []);

  // Debounce effect (wait 400ms after user stops typing)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLowerCase());
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const monthlyInventoryData = [
    { name: 'Jan', value: 1250 },
    { name: 'Feb', value: 1320 },
    { name: 'Mar', value: 800 },
    { name: 'Apr', value: 1400 },
    { name: 'May', value: 1345 },
    { name: 'Jun', value: 950 },
    { name: 'Jul', value: 1420 },
    { name: 'Aug', value: 1380 },
    { name: 'Sep', value: 1440 },
    { name: 'Oct', value: 1555 },
    { name: 'Nov', value: 720 },
    { name: 'Dec', value: 1600 },
  ];

  const getFilteredData = () => {
    let filtered = [...products];

    // Map the products to include the correct price field and status
    filtered = filtered.map(item => {
        const quantity = item.quantity || 0;
        const restockLevel = item.restockLevel || 0;
        let status = 'in-stock';

        // Calculate status based on quantity and restock level
        if (quantity <= 0) {
            status = 'out-of-stock';
        } else if (quantity <= restockLevel) {
            status = 'low-stock';
        }

        return {
            ...item,
            unitPrice: item.unitPrice || (item.variants && item.variants[0]?.unitPrice) || 0,
            totalvalue: (quantity) * (item.unitPrice || (item.variants && item.variants[0]?.unitPrice) || 0),
            status: status // Add calculated status
        };
    });

    // Apply filters
    if (debouncedSearchQuery !== '') {
        filtered = filtered.filter((item) =>
            item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        );
    }

    if (selectedCategory !== 'all') {
        filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Use the calculated status for filtering
    if (currentFilter === 'low-stock') {
        filtered = filtered.filter((item) => item.status === 'low-stock');
    } else if (currentFilter === 'out-of-stock') {
        filtered = filtered.filter((item) => item.status === 'out-of-stock');
    }

    if (selectedStorageRoom !== 'all') {
        filtered = filtered.filter((item) => item.location === selectedStorageRoom);
    }

    return filtered;
  };

  const totalValue = getFilteredData().reduce((sum, p) => sum + (parseFloat(p.totalvalue) || 0), 0);

  const chartData = getFilteredData().map((p) => {
    let color = '#4779FF';
    if (p.quantity <= 40) color = '#FF4D4D';
    else if (p.quantity <= 60) color = '#FFC554';

    return {
      name: p.name,
      value: p.quantity,
      color,
    };
  });

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 bg-gray-50 min-h-screen">
      <InventoryHeader />

      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-orange-100/80 to-amber-100/30 rounded-xl p-6 mb-6 shadow-sm border border-orange-100">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
            <p className="text-gray-600">View & Update Stock Levels</p>
          </div>
          <div className="w-full md:w-auto">
            <InventoryFilters
              currentFilter={currentFilter}
              setCurrentFilter={setCurrentFilter}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedStorageRoom={selectedStorageRoom}
              setSelectedStorageRoom={setSelectedStorageRoom}
              selectedChart={selectedChart}
              setSelectedChart={setSelectedChart}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Overview Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="space-y-2">
            <h3 className="text-gray-800 font-semibold text-lg">Glory Star Hardware</h3>
            <div className="flex flex-wrap gap-6 text-xl font-bold">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm font-normal">Total Stock:</span>
                <span className="text-gray-900">{getFilteredData().reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm font-normal">Total Value:</span>
                <span className="text-green-600">₱{totalValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-gray-50/50 rounded-xl p-4">
          {selectedChart === 'Stock Level' ? (
            <InventoryChart data={chartData} />
          ) : selectedChart === 'Stock Trend' ? (
            <InventoryTrendChart data={monthlyInventoryData} />
          ) : null}
        </div>
      </div>

      {/* Enhanced Table Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-gray-800 font-semibold text-lg">Inventory Table</h3>

          {/* Search and Actions Group */}
          <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
            {/* Enhanced Search Input */}
            <div className="relative flex-1 sm:flex-none min-w-[240px]">
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-shadow"
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setImportIsModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 whitespace-nowrap hover:shadow-md"
            >
              <FiUpload size={18} />
              <span>Import Excel</span>
            </button>
            <button
              onClick={() => setcategorymodal(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 whitespace-nowrap hover:shadow-md"
            >
              <FiPlusCircle size={18} />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="w-full rounded-xl overflow-hidden border border-gray-200">
          <InventoryTable 
            data={getFilteredData()} 
            onViewProduct={handleViewProduct} 
          />
        </div>
      </div>

      {/* Modals - keeping existing functionality */}
      <ImportCVGModal isOpen={isImportModalOpen} onClose={() => setImportIsModalOpen(false)} />
      <CategoryMOdalIndex CategoryOpen={categorymodal} CategoryClose={() => setcategorymodal(false)} />
      <ViewProductModal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        product={selectedProduct} 
      />
    </div>
  );
};

export default Inventory;