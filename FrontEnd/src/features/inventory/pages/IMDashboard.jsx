import React, { useState, useEffect, useMemo } from 'react';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiPackage,
  FiAlertTriangle,
  FiRefreshCw,
  FiBell,
  FiInfo,
  FiDollarSign,
  FiShoppingCart,
  FiBox,
  FiBarChart2,
  FiActivity
} from 'react-icons/fi';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import {
  BarChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

import DashboardBarChart from '../components/Dashboard/DashboardBarChart';
import InfoModal from '../components/Dashboard/InfoModal';
import InventoryTrendChart from '../components/Inventory/InventoryTrendChart';
import { useServices } from '../../../services/firebase/ProductServices';
import StockMovementService from '../../../services/StockMovementService';

// Import Restocking Alert Components
import RestockingAlertModal from '../components/Admin/RestockingAlertModal';
import RestockingAlertBadge from '../components/Admin/RestockingAlertBadge';

const IMDashboard = () => {
 
  const [currentMonth, setCurrentMonth] = useState('October');
  const { listenToProducts, fetchRestockRequests } = useServices(); 
  const [products, setProduct] = useState([]);
  const [lowStock, setLowstock] = useState([]);
  const [request, setRequest] = useState([]);
  const [fastMovingProducts, setFastMovingProducts] = useState([]);
  const [loadingFastMoving, setLoadingFastMoving] = useState(true);
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [showRestockingAlerts, setShowRestockingAlerts] = useState(false);

  // Color palette for charts
  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  
  // Category colors
  const categoryColorMap = {
    'Steel & Heavy Materials': '#3B82F6',
    'Plywood & Sheet Materials': '#F59E0B',
    'Cement & Aggregates': '#10B981',
    'Electrical & Plumbing': '#8B5CF6',
    'Paint & Coatings': '#EF4444',
    'Insulation & Foam': '#6366F1',
    'Miscellaneous': '#10B981',
    'Roofing Materials': '#F97316',
    'Hardware & Fasteners': '#06B6D4',
  };

  // Chart information content
  const chartInfo = {
    inventory: {
      title: "How to Read the Inventory Chart",
      content: (
        <div className="space-y-4">
          <p>This bar chart shows the current inventory levels for each product:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="text-blue-500">Blue bars</span> indicate healthy stock levels (above 60 units)</li>
            <li><span className="text-yellow-500">Yellow bars</span> indicate moderate stock levels (between 41-60 units)</li>
            <li><span className="text-red-500">Red bars</span> indicate low stock levels (40 units or below)</li>
          </ul>
          <p>Hover over any bar to see the exact quantity for that product.</p>
        </div>
      )
    },
    turnover: {
      title: "Understanding Inventory Turnover Distribution",
      content: (
        <div className="space-y-4">
          <p>This histogram shows the distribution of products across different turnover rate ranges:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Each bar represents a turnover rate range (bin)</li>
            <li>The height shows how many products fall into that range</li>
            <li>Taller bars indicate more products with that turnover rate</li>
            <li>Helps identify patterns in inventory movement efficiency</li>
          </ul>
          <p>A well-distributed histogram suggests balanced inventory management across product categories.</p>
        </div>
      )
    },
    stockLog: {
      title: "About the Stock Movement Log",
      content: (
        <div className="space-y-4">
          <p>The stock movement log tracks all inventory transactions:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Product: The item being transferred</li>
            <li>From/To: Source and destination locations</li>
            <li>Qty: Number of units moved</li>
            <li>Date: When the transfer occurred</li>
            <li>Status: Current state of the transfer</li>
          </ul>
          <p>Use the month selector to filter movements by specific time periods.</p>
        </div>
      )
    },
    categoryDistribution: {
      title: "Category Distribution Chart",
      content: (
        <div className="space-y-4">
          <p>This pie chart shows the distribution of products across categories:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Each slice represents a product category</li>
            <li>The size indicates the percentage of total inventory</li>
            <li>Hover over slices to see exact quantities and values</li>
          </ul>
          <p>Use this to identify which categories dominate your inventory.</p>
        </div>
      )
    },
    stockValue: {
      title: "Stock Value Trends",
      content: (
        <div className="space-y-4">
          <p>This chart tracks the total value of inventory over time:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Helps monitor investment in inventory</li>
            <li>Identifies trends in stock valuation</li>
            <li>Useful for financial planning and budgeting</li>
          </ul>
        </div>
      )
    }
  };


  const turnoverHistogramData = [
    { range: '0-0.01', count: 5, minValue: 0, maxValue: 0.01 },
    { range: '0.01-0.02', count: 3, minValue: 0.01, maxValue: 0.02 },
    { range: '0.02-0.03', count: 8, minValue: 0.02, maxValue: 0.03 },
    { range: '0.03-0.04', count: 12, minValue: 0.03, maxValue: 0.04 },
    { range: '0.04-0.05', count: 7, minValue: 0.04, maxValue: 0.05 },
    { range: '0.05-0.06', count: 4, minValue: 0.05, maxValue: 0.06 },
    { range: '0.06+', count: 2, minValue: 0.06, maxValue: null }
  ];

  useEffect(() => {
    const unsubscribe = listenToProducts(setProduct);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const getRequests = async () => {
      const res = await fetchRestockRequests();
      if (res.success) {
        setRequest(res.requests);
      }
    };

    getRequests();
  }, [fetchRestockRequests]);

  // Fetch fast-moving products from stock movements (both IN and OUT)
  useEffect(() => {
    const fetchFastMovingProducts = async () => {
      setLoadingFastMoving(true);
      try {
        // Get stock movements from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Fetch both IN and OUT movements
        const [inMovements, outMovements] = await Promise.all([
          StockMovementService.getStockMovements({
            movementType: 'IN',
            startDate: thirtyDaysAgo,
            endDate: new Date()
          }),
          StockMovementService.getStockMovements({
            movementType: 'OUT',
            startDate: thirtyDaysAgo,
            endDate: new Date()
          })
        ]);

        // Combine all movements
        const allMovements = [...inMovements, ...outMovements];

        // Aggregate by product - count total movement (IN + OUT)
        const productMovements = {};
        allMovements.forEach(movement => {
          const key = movement.variantId || movement.productId;
          if (!productMovements[key]) {
            productMovements[key] = {
              productId: movement.productId,
              variantId: movement.variantId,
              productName: movement.productName,
              variantName: movement.variantName,
              category: movement.category,
              unitPrice: movement.unitPrice,
              totalQuantity: 0,
              inQuantity: 0,
              outQuantity: 0,
              totalValue: 0,
              transactionCount: 0
            };
          }
          
          const quantity = movement.quantity || 0;
          productMovements[key].totalQuantity += quantity;
          productMovements[key].totalValue += movement.totalValue || 0;
          productMovements[key].transactionCount += 1;
          
          // Track IN and OUT separately
          if (movement.movementType === 'IN') {
            productMovements[key].inQuantity += quantity;
          } else if (movement.movementType === 'OUT') {
            productMovements[key].outQuantity += quantity;
          }
        });

        // Sort by total quantity moved (IN + OUT) and get top 10
        const fastMoving = Object.values(productMovements)
          .sort((a, b) => b.totalQuantity - a.totalQuantity)
          .slice(0, 10)
          .map((item, index) => ({
            rank: index + 1,
            name: item.variantName 
              ? `${item.productName} (${item.variantName})`
              : item.productName,
            unitPrice: item.unitPrice,
            quantity: item.totalQuantity,
            inQuantity: item.inQuantity,
            outQuantity: item.outQuantity,
            value: item.totalValue,
            transactions: item.transactionCount,
            category: item.category || 'General'
          }));

        setFastMovingProducts(fastMoving);
      } catch (error) {
        console.error('Error fetching fast-moving products:', error);
        setFastMovingProducts([]);
      } finally {
        setLoadingFastMoving(false);
      }
    };

    fetchFastMovingProducts();
  }, []);
  
  const groupedProducts = useMemo(() => {
    // Group by productBrand and variantName (or id if needed)
    const productGroups = {};
    products.forEach(item => {
      const groupKey = `${item.productBrand || 'Generic'}_${item.variantName || item.id}`;
      if (!productGroups[groupKey]) {
        productGroups[groupKey] = {
          ...item,
          quantity: 0,
          locations: [],
        };
      }
      productGroups[groupKey].quantity += Number(item.quantity) || 0;
      productGroups[groupKey].locations.push(item.location || item.fullLocation || 'Unknown');
    });
    return Object.values(productGroups);
  }, [products]);

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + ((parseInt(p.quantity) || 0) * (parseFloat(p.unitPrice) || 0)), 0);
    const lowStockItems = products.filter(p => p.quantity <= 60 && p.quantity > 0).length;
    const outOfStockItems = products.filter(p => p.quantity <= 0).length;
    const uniqueProducts = groupedProducts.length;
    const totalProducts = products.length;
    
    return {
      totalStock,
      totalValue,
      lowStockItems,
      outOfStockItems,
      uniqueProducts,
      totalProducts,
      averageStockPerProduct: totalProducts > 0 ? (totalStock / totalProducts).toFixed(2) : 0
    };
  }, [products, groupedProducts]);

  // Category distribution data for pie chart
  const categoryData = useMemo(() => {
    const categoryMap = {};
    products.forEach(item => {
      const category = item.productCategory || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = {
          name: category,
          value: 0,
          count: 0,
          totalValue: 0
        };
      }
      categoryMap[category].value += Number(item.quantity) || 0;
      categoryMap[category].count += 1;
      categoryMap[category].totalValue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    });
    return Object.values(categoryMap).sort((a, b) => b.value - a.value);
  }, [products]);

  // Top products by value
  const topProductsByValue = useMemo(() => {
    return groupedProducts
      .map(p => ({
        name: p.name,
        value: (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0),
        quantity: Number(p.quantity) || 0,
        unitPrice: Number(p.unitPrice) || 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [groupedProducts]);

  // Stock status distribution (filter out zero-value categories)
  const stockStatusData = useMemo(() => {
    const inStock = products.filter(p => p.quantity > 60).length;
    const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 60).length;
    const outOfStock = products.filter(p => p.quantity <= 0).length;
    const allStatuses = [
      { name: 'In Stock', value: inStock, color: '#10B981' },
      { name: 'Low Stock', value: lowStock, color: '#F59E0B' },
      { name: 'Out of Stock', value: outOfStock, color: '#EF4444' }
    ];
    return allStatuses.filter(status => status.value > 0);
  }, [products]);

  const chartData = groupedProducts.map((p) => {
    let color = '#4779FF';
    if (p.quantity < 10) color = '#FF4D4D';
    else if (p.quantity <= 40) color = '#FFC554';

    return {
      name: p.variantName || p.productBrand || p.id,
      value: p.quantity,
      color,
    };
  });

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
 // ...existing code...
  // Place debug logging after all hooks and memoized variables are declared
  useEffect(() => {
    console.log('products:', products);
    console.log('groupedProducts:', groupedProducts);
    console.log('chartData:', chartData);
  }, [products, groupedProducts, chartData]);
  // Custom tooltip for the histogram
  const TurnoverHistogramTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-sm mb-1">Turnover Range: {label}</p>
          <p className="text-sm text-blue-600">
            <span className="font-semibold">{payload[0].value}</span> products
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-sm mb-2">{data.name}</p>
          <p className="text-xs text-gray-600">Items: <span className="font-semibold text-gray-800">{data.value}</span></p>
          <p className="text-xs text-gray-600">Products: <span className="font-semibold text-gray-800">{data.count}</span></p>
          <p className="text-xs text-gray-600">Value: <span className="font-semibold text-green-600">₱{data.totalValue.toLocaleString()}</span></p>
        </div>
      );
    }
    return null;
  };

  const stockMovements = [];
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (

    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FiRefreshCw size={16} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>


      {/* Stat Cards Grid - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Stock */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Stock</p>
              <h3 className="text-2xl font-bold mb-2">{dashboardStats.totalStock.toLocaleString()}</h3>
              <div className="flex items-center text-blue-500 text-sm">
                <FiPackage className="mr-1" />
                <span>{dashboardStats.totalProducts} product locations</span>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <FiPackage className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Inventory Value</p>
              <h3 className="text-2xl font-bold mb-2">₱{dashboardStats.totalValue.toLocaleString()}</h3>
              <div className="flex items-center text-green-500 text-sm">
                <FiDollarSign className="mr-1" />
                <span>{dashboardStats.uniqueProducts} unique products</span>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <FiDollarSign className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Low Stock Items</p>
              <h3 className="text-2xl font-bold mb-2">{dashboardStats.lowStockItems} Items</h3>
              <div className="flex items-center text-red-500 text-sm">
                <FiAlertTriangle className="mr-1" />
                <span>Critical Stock</span>
              </div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <FiAlertTriangle className="text-amber-600 text-xl" />
            </div>
          </div>
        </div>

        {/* Pending Restocks */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Pending Restocks</p>
              <h3 className="text-2xl font-bold mb-2">{request.filter(r => r.status === 'pending').length} Requests</h3>
              <div className="flex items-center text-purple-500 text-sm">
                <FiBell className="mr-1" />
                <span>Pending approval</span>
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <FiBell className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Turnover Distribution Histogram - Full Width at Top */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Inventory Turnover Distribution
              </h3>
              <p className="text-sm text-gray-500 mt-1">Distribution of products across turnover rate ranges</p>
            </div>
            <button
              onClick={() => setActiveModal('turnover')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiInfo className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={turnoverHistogramData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="range" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  label={{ value: 'Turnover Rate Range', position: 'insideBottom', offset: -5, style: { fill: '#6B7280', fontSize: 12 } }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  label={{ value: 'Number of Products', angle: -90, position: 'insideLeft', style: { fill: '#6B7280', fontSize: 12 } }}
                  allowDecimals={false}
                />
                <Tooltip content={TurnoverHistogramTooltip} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="rect"
                  formatter={() => "Product Count"}
                />
                <Bar 
                  dataKey="count" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]}
                  name="Product Count"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Level Bar Chart - Stretch to 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Stock Levels by Product
              </h3>
              <p className="text-sm text-gray-500 mt-1">Current inventory across all products</p>
            </div>
            <button
              onClick={() => setActiveModal('inventory')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="How to read this chart"
            >
              <FiInfo className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="h-[400px]">
            <DashboardBarChart data={chartData} CustomTooltip={CustomTooltip} />
          </div>
        </div>

        {/* Stock Status Distribution Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Stock Status
              </h3>
              <p className="text-sm text-gray-500 mt-1">Distribution by status</p>
            </div>
            <button
              onClick={() => setActiveModal('categoryDistribution')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiInfo className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="h-[400px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockStatusData}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  formatter={(value, entry) => (
                    <span className="text-sm text-gray-700">{`${value} (${entry.payload.value})`}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Category Distribution
              </h3>
              <p className="text-sm text-gray-500 mt-1">Stock distribution by category</p>
            </div>
            <button
              onClick={() => setActiveModal('categoryDistribution')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiInfo className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.slice(0, 8)}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={categoryColorMap[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={PieTooltip} />
                <Legend 
                  verticalAlign="bottom" 
                  height={60}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => {
                    // Truncate long category names for legend
                    return value.length > 20 ? `${value.substring(0, 20)}...` : value;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fast Moving Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Fast Moving Products
              </h3>
              <p className="text-sm text-gray-500 mt-1">Highest inventory movement in the last 30 days</p>
            </div>
            <FiBarChart2 className="w-5 h-5 text-gray-400" />
          </div>
          {loadingFastMoving ? (
            <div className="flex items-center justify-center h-[350px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading fast-moving products...</p>
              </div>
            </div>
          ) : fastMovingProducts.length === 0 ? (
            <div className="flex items-center justify-center h-[350px]">
              <div className="text-center">
                <FiBarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No movement data available</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {fastMovingProducts.map((product) => (
                <div key={product.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{
                        background:
                          product.rank === 1 ? '#FFD700' : // Gold
                          product.rank === 2 ? '#C0C0C0' : // Silver
                          product.rank === 3 ? '#CD7F32' : // Bronze
                          COLORS[(product.rank - 1) % COLORS.length]
                      }}
                    >
                      {product.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.transactions} movement{product.transactions !== 1 ? 's' : ''} · {product.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <p className="text-sm font-bold text-purple-600">
                      {product.quantity} units moved
                    </p>
                    <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
                      <span className="text-blue-600">↓{product.inQuantity} in</span>
                      <span>·</span>
                      <span className="text-green-600">↑{product.outQuantity} out</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      
    
      {/* Info Modals */}
      <InfoModal
        isOpen={activeModal === 'inventory'}
        onClose={() => setActiveModal(null)}
        title={chartInfo.inventory.title}
        content={chartInfo.inventory.content}
      />
      <InfoModal
        isOpen={activeModal === 'turnover'}
        onClose={() => setActiveModal(null)}
        title={chartInfo.turnover.title}
        content={chartInfo.turnover.content}
      />
      <InfoModal
        isOpen={activeModal === 'stockLog'}
        onClose={() => setActiveModal(null)}
        title={chartInfo.stockLog.title}
        content={chartInfo.stockLog.content}
      />
      <InfoModal
        isOpen={activeModal === 'categoryDistribution'}
        onClose={() => setActiveModal(null)}
        title={chartInfo.categoryDistribution.title}
        content={chartInfo.categoryDistribution.content}
      />
      <InfoModal
        isOpen={activeModal === 'stockValue'}
        onClose={() => setActiveModal(null)}
        title={chartInfo.stockValue.title}
        content={chartInfo.stockValue.content}
      />

     
    </div>
  );
};

export default IMDashboard;
