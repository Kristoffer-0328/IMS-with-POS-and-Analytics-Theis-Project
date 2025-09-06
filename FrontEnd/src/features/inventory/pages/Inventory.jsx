import React, { useState, useEffect } from 'react';
import InventoryChart from '../components/Inventory/InventoryChart';
import InventoryTrendChart from '../components/Inventory/InventoryTrendChart';
import InventoryTable from '../components/Inventory/InventoryTable';
import InventoryFilters from '../components/Inventory/InventoryFilters';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import ViewProductModal from '../components/Inventory/ViewProductModal';
import { useServices } from '../../../services/firebase/ProductServices';
import { FiPlusCircle, FiUpload, FiSearch, FiInfo, FiGrid, FiList } from 'react-icons/fi';
import ImportCVGModal from '../components/Inventory/ImportCVGModal';
import ProductChoice from '../components/Inventory/ProductChoices';
import CategoryMOdalIndex from '../components/Inventory/CategoryModal/CategoryModalIndex';
import InfoModal from '../components/Dashboard/InfoModal';

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
  const [viewMode, setViewMode] = useState('card');
  
  // New state for the ViewProductModal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  // Category color mapping
  const categoryColors = {
    'Hardware': 'bg-blue-100 text-blue-900',
    'Electrical': 'bg-yellow-100 text-yellow-900',
    'Plumbing': 'bg-green-100 text-green-900',
    'Paint': 'bg-purple-100 text-purple-900',
    'Tools': 'bg-red-100 text-red-900',
    'Automotive': 'bg-indigo-100 text-indigo-900',
    'Garden': 'bg-emerald-100 text-emerald-900',
    'Safety': 'bg-orange-100 text-orange-900',
    'Lighting': 'bg-cyan-100 text-cyan-900',
    'Building Materials': 'bg-teal-100 text-teal-900',
    'default': 'bg-gray-100 text-gray-900'
  };

  // Function to get category color
  const getCategoryColor = (category) => {
    return categoryColors[category] || categoryColors.default;
  };

  // Chart information content
  const chartInfo = {
    stockLevel: {
      title: "How to Read the Stock Level Chart",
      content: (
        <div className="space-y-4">
          <p>This bar chart shows the current inventory levels for each product:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="text-blue-500">Blue bars</span> indicate healthy stock levels (above 60 units)</li>
            <li><span className="text-yellow-500">Yellow bars</span> indicate moderate stock levels (between 41-60 units)</li>
            <li><span className="text-red-500">Red bars</span> indicate low stock levels (40 units or below)</li>
          </ul>
          <p>The red dashed line indicates the low stock threshold level.</p>
          <p>Hover over any bar to see the exact quantity for that product.</p>
        </div>
      )
    },
    stockTrend: {
      title: "Understanding Stock Trends",
      content: (
        <div className="space-y-4">
          <p>This chart shows your inventory trends throughout the year:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="font-medium">Vertical Axis:</span> Number of items in stock</li>
            <li><span className="font-medium">Horizontal Axis:</span> Months of the year</li>
            <li><span className="font-medium">Red Line:</span> Low stock threshold</li>
            <li><span className="font-medium">Blue Line:</span> Actual stock levels</li>
          </ul>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-2">How to interpret:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Higher peaks indicate larger inventory levels</li>
              <li>Valleys show periods of lower stock</li>
              <li>Below red line = potential stock issues</li>
              <li>Patterns may indicate seasonal trends</li>
            </ul>
          </div>
        </div>
      )
    }
  };

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
  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-blue-600">
            <span className="font-semibold">{payload[0].value}</span> items
          </p>
        </div>
      );
    }
    return null;
  };

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
        } else if (quantity < restockLevel ) {
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
    if (p.quantity < p.restockLevel) color = '#FF4D4D';
    else if (p.quantity <= 40) color = '#FFC554';

    return {
      name: p.name,
      value: p.quantity,
      color,
    };
  });

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 bg-gray-50 min-h-screen">
      <DashboardHeader />

      {/* Enhanced Overview Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-gray-800 font-semibold text-lg">Glory Star Hardware</h3>
            </div>
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedChart === 'Stock Level' ? 'Current Stock Levels' : 'Stock Level Trends'}
            </h3>
            <button
              onClick={() => setActiveModal(selectedChart === 'Stock Level' ? 'stockLevel' : 'stockTrend')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about the chart"
            >
              <FiInfo className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          {selectedChart === 'Stock Level' ? (
            <InventoryChart data={chartData} CustomTooltip={CustomTooltip} />
          ) : selectedChart === 'Stock Trend' ? (
            <InventoryTrendChart data={monthlyInventoryData} />
          ) : null}
        </div>
      </div>

      {/* Enhanced Table Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-gray-800 font-semibold text-lg">Inventory Items</h3>

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

            {/* View Toggle Button */}
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
              className="px-4 py-2.5 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
            >
              {viewMode === 'table' ? (
                <>
                  <FiGrid size={18} />
                  <span>Card View</span>
                </>
              ) : (
                <>
                  <FiList size={18} />
                  <span>Table View</span>
                </>
              )}
            </button>
            
          </div>
        </div>

        {/* Conditional Rendering based on View Mode */}
        {viewMode === 'table' ? (
          <div className="w-full rounded-xl overflow-hidden border border-gray-200">
            <InventoryTable 
              data={getFilteredData()} 
              onViewProduct={handleViewProduct} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {getFilteredData().map((product) => (
              <div key={product.id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className={`text-sm font-medium inline-block px-2 py-1 rounded-md ${getCategoryColor(product.category)}`}>
                      {product.name} 
                      {product.brand && <span className="ml-1 text-gray-600">({product.brand})</span>}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.status === 'in-stock' 
                      ? 'bg-green-100 text-green-800'
                      : product.status === 'low-stock'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.status === 'in-stock' 
                      ? 'In Stock'
                      : product.status === 'low-stock'
                      ? 'Low Stock'
                      : 'Out of Stock'}
                  </span>
                </div>
                
                <div className="space-y-1.5 mb-3">
                  <p className="text-sm">
                    <span className="font-medium">Quantity:</span> {product.quantity} {product.unit}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Unit Price:</span> ₱{product.unitPrice?.toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Location:</span> {product.location}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Total Value:</span> ₱{product.totalvalue?.toLocaleString()}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleViewProduct(product)}
                    className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-bold bg-gray-50 hover:bg-gray-100
                      ${getCategoryColor(product.category).replace('bg-', '').replace('-100', '-600')}`}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ImportCVGModal isOpen={isImportModalOpen} onClose={() => setImportIsModalOpen(false)} />
      <CategoryMOdalIndex CategoryOpen={categorymodal} CategoryClose={() => setcategorymodal(false)} />
      <ViewProductModal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        product={selectedProduct} 
      />
      <InfoModal
        isOpen={activeModal === 'stockLevel' || activeModal === 'stockTrend'}
        onClose={() => setActiveModal(null)}
        title={activeModal ? chartInfo[activeModal].title : ''}
        content={activeModal ? chartInfo[activeModal].content : ''}
      />
    </div>
  );
};

export default Inventory;