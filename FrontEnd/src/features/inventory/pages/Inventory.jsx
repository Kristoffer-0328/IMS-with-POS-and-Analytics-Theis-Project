import { useAuth } from '../../auth/services/FirebaseAuth';
import React, { useState, useEffect, useMemo } from 'react';
import InventoryChart from '../components/Inventory/InventoryChart';
import InventoryTrendChart from '../components/Inventory/InventoryTrendChart';
import InventoryTable from '../components/Inventory/InventoryTable';
import InventoryFilters from '../components/Inventory/InventoryFilters';

import ViewProductModal from '../components/Inventory/ViewProductModal';
import { useServices } from '../../../services/firebase/ProductServices';
import { FiPlusCircle, FiUpload, FiSearch, FiInfo, FiGrid, FiList, FiPackage, FiLayers, FiTrendingDown, FiTruck, FiRefreshCw } from 'react-icons/fi';
import ImportCVGModal from '../components/Inventory/ImportCVGModal';
import ProductChoice from '../components/Inventory/ProductChoices';
import CategoryMOdalIndex from '../components/Inventory/CategoryModal/CategoryModalIndex';
import InfoModal from '../components/Dashboard/InfoModal';
import StorageFacilityInteractiveMap from '../components/Inventory/StorageFacilityInteractiveMap';
import BulkProductImport from '../components/BulkProductImport';
import { getFirestore, collection, getDocs, onSnapshot } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
// Import components for tabs
import RestockingRequest from './RestockingRequest';
import ReceivingManagement from './ReceivingManagement';
import StockTransfer from './StockTransfer';
import BulkDeleteModal from '../components/Inventory/BulkDeleteModal';


const Inventory = ({ userRole: propUserRole }) => {
  // Feature flag: Set to true to use new Product/Variant architecture with Master collection
  const USE_NEW_ARCHITECTURE = true;
  
  // Get user role from auth context or prop (prop takes precedence for Admin accessing IM page)
  const { currentUser } = useAuth();
  const userRole = propUserRole || currentUser?.role || 'InventoryManager';
  
  // Role-based permissions
  const canDelete = userRole === 'Admin';
  const canChangeStatus = userRole === 'Admin' || userRole === 'InventoryManager';
  const canAddProduct = true; // Both roles can add
  const canUpdateProduct = true; // Both roles can update
  
  const [suppliers, setSuppliers] = useState([]); // Add suppliers state
  const db = getFirestore(app);
  // Read tab from URL query string and set activeTab
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['stock', 'restock', 'receiving', 'transfer'].includes(tabParam)) {
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
  const { listenToProducts, listenToLegacyProducts } = useServices();
  const [products, setProduct] = useState([]);
  const [variants, setVariants] = useState([]);
  const [categorymodal, setcategorymodal] = useState(false);
  const [viewMode, setViewMode] = useState('card');
  
  // New state for the ViewProductModal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [initialTab, setInitialTab] = useState('overview');
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  // New state for tabs
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'restock', 'receiving', 'transfer', 'release'
  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Category color mapping
  const categoryColors = {
    'Steel & Heavy Materials': 'bg-blue-100 text-blue-900',
    'Plywood & Sheet Materials': 'bg-yellow-100 text-yellow-900',
    'Cement & Aggregates': 'bg-green-100 text-green-900',
    'Electrical & Plumbing': 'bg-purple-100 text-purple-900',
    'Paint & Coatings': 'bg-red-100 text-red-900',
    'Insulation & Foam': 'bg-indigo-100 text-indigo-900',
    'Miscellaneous': 'bg-emerald-100 text-emerald-900',
    'Roofing Materials': 'bg-orange-100 text-orange-900',
    'Hardware & Fasteners': 'bg-cyan-100 text-cyan-900',
  };

  // Function to get category color
  const getCategoryColor = (category) => {
    return categoryColors[category] || 'bg-gray-100 text-gray-900';
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
  const handleViewProduct = (product, tab = 'overview') => {
    setSelectedProduct(product);
    setInitialTab(tab);
    setViewModalOpen(true);
  };

  // Function to handle product updates (e.g., image upload)
  const handleProductUpdate = () => {
    // The listenToProducts will automatically pick up the changes
    // But we can also force a refresh if needed

  };

  // Bulk selection handlers
  const handleSelectionChange = (selectedIds) => {
    setSelectedProducts(selectedIds);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteModal(true);
  };

  useEffect(() => {
    // ARCHITECTURE NOTE:
    // NOW USING NEW ARCHITECTURE:
    // - Master/{productId} - General product info only
    // - Master/Variants/items/{variantId} - Stock, price, location, suppliers
    // 
    // Each variant is displayed as a separate inventory item
    // Products are templates that can have multiple variants
    
    if (USE_NEW_ARCHITECTURE) {
      // NEW: Fetch from flat Master collection and Master/Variants collection
      try {
        // Listen to Products from Master collection (general info)
        const productsRef = collection(db, 'Master');
        const unsubProducts = onSnapshot(productsRef, (snapshot) => {
          const productsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setProduct(productsData);
          console.log(`Fetched ${productsData.length} products from Master collection`);
        });

        // Listen to Variants (inventory items with stock/price/location)
        const variantsRef = collection(db, 'Variants');
        const unsubVariants = onSnapshot(variantsRef, (snapshot) => {
          const variantsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setVariants(variantsData);
          console.log(`Fetched ${variantsData.length} variants from Variants collection`);
        });

        // Return cleanup function that unsubscribes both listeners
        return () => {
          unsubProducts();
          unsubVariants();
        };
      } catch (error) {
        console.error('Error fetching new architecture data:', error);
      }
    } else {
      // LEGACY: Use old nested structure
      const unsubscribe = listenToLegacyProducts(setProduct);
      return () => unsubscribe();
    }
  }, [listenToLegacyProducts, listenToProducts, USE_NEW_ARCHITECTURE, db]);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const suppliersRef = collection(db, 'suppliers');
        const suppliersSnapshot = await getDocs(suppliersRef);
        const suppliersData = suppliersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSuppliers(suppliersData);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };

    fetchSuppliers();
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
    // NEW ARCHITECTURE: Show ALL products from Master collection, grouped with their variants
    if (USE_NEW_ARCHITECTURE) {
      // Group variants by parentProductId
      const productGroups = {};
      
      // First, create entries for ALL products from Master collection
      products.forEach(product => {
        productGroups[product.id] = {
          variants: [],
          totalQuantity: 0,
          totalValue: 0,
          lowestPrice: null,
          highestPrice: null,
          locations: [],
          suppliers: [] // Initialize suppliers array
        };
      });
      
      // Then, add variant data to their parent products
      variants.forEach(variant => {
        const productId = variant.parentProductId;
        if (!productGroups[productId]) {
          // Handle orphaned variants (variants without a parent product)
          productGroups[productId] = {
            variants: [],
            totalQuantity: 0,
            totalValue: 0,
            lowestPrice: null,
            highestPrice: null,
            locations: [],
            suppliers: [] // Add suppliers array
          };
        }
        
        productGroups[productId].variants.push(variant);
        productGroups[productId].totalQuantity += variant.quantity || 0;
        productGroups[productId].totalValue += (variant.quantity || 0) * (variant.unitPrice || 0);
        
        // Track price range
        if (!productGroups[productId].lowestPrice || variant.unitPrice < productGroups[productId].lowestPrice) {
          productGroups[productId].lowestPrice = variant.unitPrice;
        }
        if (!productGroups[productId].highestPrice || variant.unitPrice > productGroups[productId].highestPrice) {
          productGroups[productId].highestPrice = variant.unitPrice;
        }
        
        // Track locations
        if (variant.fullLocation && !productGroups[productId].locations.includes(variant.fullLocation)) {
          productGroups[productId].locations.push(variant.fullLocation);
        }
        
        // Aggregate suppliers from variants (NEW - handle suppliers array in variants)
        if (variant.suppliers && Array.isArray(variant.suppliers) && variant.suppliers.length > 0) {
          variant.suppliers.forEach(supplier => {
            // Check if supplier already exists (by id or name)
            const existingSupplier = productGroups[productId].suppliers.find(
              s => (s.id && s.id === supplier.id) || (s.name === supplier.name)
            );
            
            if (!existingSupplier && supplier.name) {
              // Add new supplier
              productGroups[productId].suppliers.push({
                id: supplier.id || supplier.supplierId,
                name: supplier.name || supplier.supplierName,
                code: supplier.code || supplier.supplierCode,
                price: supplier.price || supplier.supplierPrice,
                sku: supplier.sku || supplier.supplierSKU
              });
            }
          });
        }
      });
      
      // Transform grouped data into product cards (ONE card per product, even without variants)
      let filtered = Object.entries(productGroups).map(([productId, group]) => {
        // Find the parent product for general info
        const parentProduct = products.find(p => p.id === productId) || {};
        
        // Use first variant as representative (for denormalized data) if variants exist
        const firstVariant = group.variants.length > 0 ? group.variants[0] : null;
        
        // Calculate status based on total quantity across all variants
        const totalSafetyStock = group.variants.reduce((sum, v) => sum + (v.safetyStock || 0), 0);
        const status = group.totalQuantity <= 0 ? 'out-of-stock' 
                     : group.totalQuantity <= totalSafetyStock ? 'low-stock' 
                     : 'in-stock';
        
        return {
          // Product ID (parent)
          id: productId,
          
          // Product data from Master collection (ALWAYS use Master data as primary source)
          name: parentProduct.name || (firstVariant ? firstVariant.productName : 'Unnamed Product'),
          brand: parentProduct.brand || (firstVariant ? firstVariant.productBrand : 'No Brand'),
          category: parentProduct.category || (firstVariant ? firstVariant.productCategory : 'Miscellaneous'),
          imageUrl: parentProduct.imageUrl || (firstVariant ? firstVariant.productImageUrl : null),
          description: parentProduct.description || '',
          specifications: parentProduct.specifications || '',
          
          // Measurement data from product (ALWAYS from Master)
          measurementType: parentProduct.measurementType || (firstVariant ? firstVariant.measurementType : 'count'),
          baseUnit: parentProduct.baseUnit || (firstVariant ? firstVariant.baseUnit : 'pcs'),
          requireDimensions: parentProduct.requireDimensions || false,
          
          // Aggregated data from variants (0 if no variants yet)
          quantity: group.totalQuantity,
          unitPrice: group.lowestPrice || 0, // Show lowest price or 0
          totalvalue: group.totalValue,
          status: status,
          
          // Variant info
          hasVariants: group.variants.length > 0,
          variantCount: group.variants.length,
          
          // Location info (multiple locations)
          location: group.locations.length > 1 
            ? `${group.locations.length} locations` 
            : group.locations.length === 1 
              ? group.locations[0]
              : 'No variants yet',
          locations: group.locations,
          
          // Price range (if multiple variants have different prices)
          priceRange: (group.lowestPrice !== null && group.highestPrice !== null && group.lowestPrice !== group.highestPrice)
            ? `₱${group.lowestPrice?.toLocaleString()} - ₱${group.highestPrice?.toLocaleString()}`
            : null,
          
          // Additional fields from first variant (for display) - only if variant exists
          unitWeightKg: firstVariant?.unitWeightKg,
          unitVolumeLiters: firstVariant?.unitVolumeLiters,
          length: firstVariant?.length,
          width: firstVariant?.width,
          thickness: firstVariant?.thickness,
          uomConversions: firstVariant?.uomConversions,
          
          // Timestamps (prefer Master collection)
          createdAt: parentProduct.createdAt || (firstVariant?.createdAt),
          lastUpdated: parentProduct.lastUpdated || (firstVariant?.lastUpdated),
          
          // Supplier info (aggregated from variants)
          suppliers: group.suppliers || [], // Array of aggregated suppliers from all variants
          
          // Flag for new architecture
          _isNewArchitecture: true,
          _variantData: group.variants // Store all variants for ViewProductModal (empty array if no variants)
        };
      });
      
      // Apply filters (same as legacy)
      if (debouncedSearchQuery !== '') {
        filtered = filtered.filter(item => {
          const name = (item.name || '').toLowerCase();
          const brand = (item.brand || '').toLowerCase();
          const category = (item.category || '').toLowerCase();
          const location = item.locations.join(' ').toLowerCase();
          const suppliers = item.suppliers.map(s => s.name || '').join(' ').toLowerCase();
          
          return name.includes(debouncedSearchQuery) ||
                 brand.includes(debouncedSearchQuery) ||
                 category.includes(debouncedSearchQuery) ||
                 location.includes(debouncedSearchQuery) ||
                 suppliers.includes(debouncedSearchQuery) ||
                 item.id.toLowerCase().includes(debouncedSearchQuery);
        });
      }

      if (selectedCategory !== 'all') {
        filtered = filtered.filter(item => item.category === selectedCategory);
      }

      if (currentFilter === 'low-stock') {
        filtered = filtered.filter(item => item.status === 'low-stock');
      } else if (currentFilter === 'out-of-stock') {
        filtered = filtered.filter(item => item.status === 'out-of-stock');
      }

      if (selectedStorageRoom !== 'all') {
        filtered = filtered.filter(item => item.locations.some(loc => loc.toLowerCase().includes(selectedStorageRoom.toLowerCase())));
      }

      return filtered;
    }
    
    // LEGACY ARCHITECTURE: Group products by identity#
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
  }, [products, variants, debouncedSearchQuery, selectedCategory, currentFilter, selectedStorageRoom, USE_NEW_ARCHITECTURE]);

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
                <button
                onClick={() => setcategorymodal(true)}
                className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg 
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                         transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Product
              </button>
              <button
                onClick={() => setShowBulkImportModal(true)}
                className="inline-flex items-center px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg 
                         hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
                         transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <FiUpload className="w-5 h-5 mr-2" />
                Bulk Import
              </button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedProducts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-red-800">
                      {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setSelectedProducts([])}
                      className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Clear selection
                    </button>
                  </div>
                  {canDelete && (
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Selected ({selectedProducts.length})
                    </button>
                  )}
                  {!canDelete && (
                    <div className="text-xs text-gray-500 italic">
                      Only administrators can delete products
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conditional Rendering based on View Mode */}
            {viewMode === 'table' ? (
              <div className="w-full rounded-xl overflow-hidden border border-gray-200">
                <InventoryTable 
                  data={filteredData} 
                  onViewProduct={handleViewProduct}
                  selectedProducts={selectedProducts}
                  onSelectionChange={handleSelectionChange}
                  showCheckboxes={true}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredData.map((product) => (
                  <div key={product.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative ${selectedProducts.includes(product.id) ? 'ring-2 ring-orange-500' : ''}`}>
                    {/* Selection Checkbox - positioned absolutely */}
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectionChange(
                          selectedProducts.includes(product.id)
                            ? selectedProducts.filter(id => id !== product.id)
                            : [...selectedProducts, product.id]
                        )}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </div>

                    {/* Product Image */}
                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 relative">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5IDE4QzQuOSAxOCA0IDE3LjEgNCAxNlY0QzQgMi45IDQuOSAyIDYgMkgxOEMxOS4xIDIgMjAgMi45IDIwIDRWMTZDMjAgMTcuMSAxOS4xIDE4IDE4IDE4SDE0VjE2QzE0IDE0LjkgMTMuMSAxNCAxMiAxNFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                          {product.name || 'Unknown Product'}
                        </h3>
                        {product.brand && (
                          <p className="text-xs text-gray-500 mb-1">Brand: {product.brand}</p>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {product.category || 'Uncategorized'}
                        </span>
                      </div>

                      {/* Stock Info */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Stock:</span>
                          <span className="font-medium text-gray-900">
                            {product.quantity} {product.baseUnit || product.unit || 'pcs'}
                          </span>
                        </div>
                        
                        {/* Show measurement type badge */}
                        {product.measurementType && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Type:</span>
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              product.measurementType === 'length' ? 'bg-indigo-100 text-indigo-700' :
                              product.measurementType === 'weight' ? 'bg-yellow-100 text-yellow-700' :
                              product.measurementType === 'volume' ? 'bg-cyan-100 text-cyan-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {product.measurementType}
                            </span>
                          </div>
                        )}

                        {/* Show dimensions for length-based products */}
                        {product.measurementType === 'length' && product.length && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Dimensions:</span>
                            <span className="font-medium text-gray-900">
                              {product.length}m × {product.width}cm × {product.thickness}mm
                            </span>
                          </div>
                        )}

                        {/* Show weight for weight-based products */}
                        {product.measurementType === 'weight' && product.unitWeightKg && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Unit Weight:</span>
                            <span className="font-medium text-gray-900">{product.unitWeightKg} kg</span>
                          </div>
                        )}

                        {/* Show volume for volume-based products */}
                        {product.measurementType === 'volume' && product.unitVolumeLiters && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Unit Volume:</span>
                            <span className="font-medium text-gray-900">{product.unitVolumeLiters} L</span>
                          </div>
                        )}

                        {/* Show UOM conversions if available */}
                        {product.uomConversions && product.uomConversions.length > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Packages:</span>
                            <span className="font-medium text-purple-600 text-xs">
                              {product.uomConversions.length} type{product.uomConversions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                     
                        {/* Regular unit price (only show if not a bundle) */}
                        {!product.isBundle && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Unit Price:</span>
                            <span className="font-medium text-gray-900">₱{product.unitPrice?.toLocaleString()}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Location:</span>
                          <span className="font-medium text-gray-900 truncate max-w-24" title={product.location}>
                            {product.location}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Total Value:</span>
                          <span className="font-medium text-gray-900">₱{product.totalvalue?.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex justify-between items-center mb-3">
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
                        {product.hasVariants && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            {product.variantCount} variant{product.variantCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleViewProduct(product)}
                        className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition-colors"
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

      {/* Modals */}
      <ImportCVGModal isOpen={isImportModalOpen} onClose={() => setImportIsModalOpen(false)} />
      <CategoryMOdalIndex CategoryOpen={categorymodal} CategoryClose={() => setcategorymodal(false)} onOpenViewProductModal={(product, tab = 'variants') => {
        setSelectedProduct(product);
        setInitialTab(tab);
        setViewModalOpen(true);
        setcategorymodal(false); // Close the category modal
      }} />
      <ViewProductModal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        product={selectedProduct}
        onProductUpdate={handleProductUpdate}
        initialTab={initialTab}
        userRole={userRole}
        canDelete={canDelete}
        canChangeStatus={canChangeStatus}
      />
      <InfoModal
        isOpen={activeModal === 'stockLevel' || activeModal === 'stockTrend'}
        onClose={() => setActiveModal(null)}
        title={activeModal ? chartInfo[activeModal].title : ''}
        content={activeModal ? chartInfo[activeModal].content : ''}
      />
      <BulkProductImport
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        suppliers={suppliers || []}
      />

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <BulkDeleteModal
          isOpen={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          selectedProducts={selectedProducts}
          products={filteredData}
          onDeleteComplete={() => {
            setSelectedProducts([]);
            setShowBulkDeleteModal(false);
          }}
        />
      )}
      
    </div>
  );
};

export default Inventory;
