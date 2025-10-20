import React, { useState, useEffect, useMemo } from 'react';
import InventoryChart from '../components/Inventory/InventoryChart';
import InventoryTrendChart from '../components/Inventory/InventoryTrendChart';
import InventoryTable from '../components/Inventory/InventoryTable';
import InventoryFilters from '../components/Inventory/InventoryFilters';

import ViewProductModal from '../components/Inventory/ViewProductModal';
import { useServices } from '../../../services/firebase/ProductServices';
import { FiPlusCircle, FiUpload, FiSearch, FiInfo, FiGrid, FiList, FiPackage, FiLayers, FiTrendingDown, FiTruck, FiRefreshCw, FiSend } from 'react-icons/fi';
import ImportCVGModal from '../components/Inventory/ImportCVGModal';
import ProductChoice from '../components/Inventory/ProductChoices';
import CategoryMOdalIndex from '../components/Inventory/CategoryModal/CategoryModalIndex';
import InfoModal from '../components/Dashboard/InfoModal';
import StorageFacilityInteractiveMap from '../components/Inventory/StorageFacilityInteractiveMap';
import DashboardHeader from '../components/Dashboard/DashboardHeader';

// Import components for tabs
import RestockingRequest from './RestockingRequest';
import ReceivingManagement from './ReceivingManagement';
import StockTransfer from './StockTransfer';
import ReleaseManagement from './ReleaseManagement';


const Inventory = () => {
  // Read tab from URL query string and set activeTab
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['stock', 'restock', 'receiving', 'transfer', 'release'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);
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

  // New state for tabs
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'restock', 'receiving', 'transfer', 'release'

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

  // Function to handle product updates (e.g., image upload)
  const handleProductUpdate = () => {
    // The listenToProducts will automatically pick up the changes
    // But we can also force a refresh if needed

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

  const filteredData = useMemo(() => {
    let filtered = [...products];

    // Step 1: Group products by their base identity (name + brand + specifications)
    const productGroups = {};
    
    filtered.forEach(item => {
      // Create a unique key for grouping (excluding location-specific fields)
      const groupKey = `${item.name || 'unknown'}_${item.brand || 'generic'}_${item.specifications || ''}_${item.category || ''}`;
      
      if (!productGroups[groupKey]) {
        productGroups[groupKey] = {
          baseProduct: { ...item },
          locations: [],
          totalQuantity: 0,
          totalValue: 0,
          allIds: []
        };
      }
      
      // Add this product instance to the group
      productGroups[groupKey].locations.push({
        id: item.id,
        location: item.fullLocation || item.location || 'Unknown',
        storageLocation: item.storageLocation,
        shelfName: item.shelfName,
        rowName: item.rowName,
        columnIndex: item.columnIndex,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0
      });
      
      productGroups[groupKey].totalQuantity += Number(item.quantity) || 0;
      productGroups[groupKey].totalValue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      productGroups[groupKey].allIds.push(item.id);
    });

    // Step 2: Convert grouped products back to array
    filtered = Object.values(productGroups).map(group => {
      const baseProduct = group.baseProduct;
      
      // Check if product has variants (can be array or object)
      const hasVariants = baseProduct.variants && (
          (Array.isArray(baseProduct.variants) && baseProduct.variants.length > 0) ||
          (typeof baseProduct.variants === 'object' && Object.keys(baseProduct.variants).length > 0)
      );
      
      // Calculate average unit price
      const averageUnitPrice = group.totalQuantity > 0 ? group.totalValue / group.totalQuantity : (Number(baseProduct.unitPrice) || 0);
      
      // Calculate status based on total quantity and restock level
      const restockLevel = baseProduct.restockLevel || 0;
      let status = 'in-stock';
      if (group.totalQuantity <= 0) {
        status = 'out-of-stock';
      } else if (group.totalQuantity < restockLevel) {
        status = 'low-stock';
      }

      return {
        ...baseProduct,
        id: baseProduct.id, // Keep the first product's ID as primary
        allIds: group.allIds, // Store all IDs for reference
        quantity: group.totalQuantity, // Use aggregated quantity from all locations
        unitPrice: averageUnitPrice, // Use average unit price
        totalvalue: group.totalValue, // Use calculated total value
        status: status,
        locations: group.locations, // Store all locations
        locationCount: group.locations.length, // Number of locations
        location: group.locations.length > 1 
          ? `${group.locations.length} locations` 
          : (group.locations[0]?.location || 'Unknown'),
        hasVariants: hasVariants,
        variantCount: hasVariants ? (Array.isArray(baseProduct.variants) ? baseProduct.variants.length : Object.keys(baseProduct.variants).length) : 0
      };
    });

    // Apply filters
    if (debouncedSearchQuery !== '') {
        filtered = filtered.filter((item) =>
            item.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            item.brand?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            item.storageLocation?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            item.fullLocation?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            item.shelfName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            item.rowName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            (typeof item.supplier?.name === 'string' && item.supplier.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
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
        // Filter by storage location (new nested structure)
        filtered = filtered.filter((item) => {
            // Check multiple fields for storage location matching
            const storageLocation = item.storageLocation || '';
            const location = item.location || '';
            const fullLocation = item.fullLocation || '';
            
            // Match if any location field contains the selected unit name
            return storageLocation.includes(selectedStorageRoom) || 
                   location.includes(selectedStorageRoom) ||
                   fullLocation.includes(selectedStorageRoom);
        });
    }

    return filtered;
  }, [products, debouncedSearchQuery, selectedCategory, currentFilter, selectedStorageRoom]);

  const totalValue = useMemo(() => {
    return filteredData.reduce((sum, p) => sum + (parseFloat(p.totalvalue) || 0), 0);
  }, [filteredData]);

  const chartData = useMemo(() => {
    return filteredData.map((p) => {
      let color = '#4779FF';
      if (p.quantity < p.restockLevel) color = '#FF4D4D';
      else if (p.quantity <= 40) color = '#FFC554';

      return {
        name: p.name,
        value: p.quantity,
        color,
      };
    });
  }, [filteredData]);

  return (
    <div>     
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'stock'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiPackage size={20} />
              <span>Stock Management</span>
            </button>
              
            <button
              onClick={() => setActiveTab('restock')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'restock'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiTrendingDown size={20} />
              <span>Restock Requests</span>
            </button>
            <button
              onClick={() => setActiveTab('receiving')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'receiving'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiTruck size={20} />
              <span>Receiving</span>
            </button>
            <button
              onClick={() => setActiveTab('release')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                activeTab === 'release'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FiSend size={20} />
              <span>Release </span>
            </button>
          </div>
        </div>

    {/* Tab Content */}
      {activeTab === 'stock' && (
        <>
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
                    <span className="text-gray-900">{filteredData.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm font-normal">Total Value:</span>
                    <span className="text-green-600">₱{totalValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50/50 rounded-xl p-4">
              <StorageFacilityInteractiveMap viewOnly={true} />
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
                  data={filteredData} 
                  onViewProduct={handleViewProduct} 
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredData.map((product) => (
                  <div key={product.id} className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border-2 ${
                    product.isVariant 
                      ? 'border-purple-200 bg-purple-50/30' 
                      : 'border-gray-100'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-sm font-medium inline-block px-2 py-1 rounded-md ${getCategoryColor(product.category)}`}>
                            {product.name} 
                            {product.brand && <span className="ml-1 text-gray-600">({product.brand})</span>}
                          </h4>
                          {product.isVariant && (
                            <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                              <FiLayers size={10} />
                              VARIANT
                            </span>
                          )}
                          {!product.isVariant && product.hasVariants && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                              <FiPackage size={10} />
                              BASE
                            </span>
                          )}
                        </div>
                        {product.isVariant && product.variantName && (
                          <p className="text-xs text-purple-700 font-medium mt-1">
                            Variant: {product.variantName || product.size || 'Standard'}
                          </p>
                        )}
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
                        {product.hasVariants && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({product.variantCount} variant{product.variantCount !== 1 ? 's' : ''})
                          </span>
                        )}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Unit Price:</span> ₱{product.unitPrice?.toLocaleString()}
                        {product.hasVariants && (
                          <span className="ml-2 text-xs text-gray-500">(avg)</span>
                        )}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Location:</span> {product.location}
                        {product.locationCount > 1 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                            {product.locationCount} locations
                          </span>
                        )}
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
        </>
      )}

      {/* Restock Requests Tab Content */}
      {activeTab === 'restock' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <RestockingRequest />
        </div>
      )}

      {/* Receiving Tab Content */}
      {activeTab === 'receiving' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ReceivingManagement />
        </div>
      )}

      {/* Stock Transfer Tab Content */}
      {activeTab === 'transfer' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <StockTransfer />
        </div>
      )}

      {/* Release / Outgoing Tab Content */}
      {activeTab === 'release' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ReleaseManagement />
        </div>
      )}

      {/* Modals */}
      <ImportCVGModal isOpen={isImportModalOpen} onClose={() => setImportIsModalOpen(false)} />
      <CategoryMOdalIndex CategoryOpen={categorymodal} CategoryClose={() => setcategorymodal(false)} />
      <ViewProductModal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        product={selectedProduct}
        onProductUpdate={handleProductUpdate}
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