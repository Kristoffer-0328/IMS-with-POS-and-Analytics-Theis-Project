import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Firebase and Services
import { useServices } from '../../../services/firebase/ProductServices';
import {
  getFirestore,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  addDoc,
  collection,
} from 'firebase/firestore';
import app from  '../../../FirebaseConfig';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { AnalyticsService } from '../../../services/firebase/AnalyticsService';

// Import Components from new locations
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';
import CustomerInfo from '../components/CustomerInfo';
import ProductList from '../components/Cart';
import OrderSummary from '../components/OrderSummary';
import PaymentSection from '../components/PaymentSection';
import ProductFilters from '../components/ProductFilters';
import UnitConversionModal from '../components/UnitConversionModal';

// Import Modals from new locations
import VariantSelectionModal from '../components/Modals/VariantSelectionModal';
import QuickQuantityModal from '../components/QuickQuantityModal';
import CustomerInfoModal from '../components/quotation/CustomerInfoModal';

// Import utilities
import { printReceiptContent } from '../utils/ReceiptGenerator';
import QuotationGenerator from '../components/quotation/QuotationGenerator';
import QuotationUtils from '../utils/quotationUtils';

const db = getFirestore(app);

// Add this helper function near the top of the file, after imports
const formatCurrency = (number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

// Helper function to clean Firebase data (remove undefined values)
const cleanFirebaseData = (obj) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanFirebaseData(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

// Helper function to format Date/Time (can be moved to utils)
const getFormattedDateTime = () => {
    const now = new Date();
    
    const formattedDate = now.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).replace(/,/g, '').toUpperCase();

    // Format time parts separately for better control
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return {
        formattedDate,
        formattedTime: { hours, minutes, seconds }
    };
};

// Helper function to check if product needs restocking
const checkRestockingThreshold = (productData, variantIndex) => {
  const variant = productData.variants?.[variantIndex];
  if (!variant) return false;
  
  const currentQty = variant.quantity || 0;
  const restockLevel = variant.restockLevel || productData.restockLevel || 10; // Minimum stock level
  const maximumStockLevel = variant.maximumStockLevel || productData.maximumStockLevel || 100; // Maximum stock level
  
  return {
    needsRestock: currentQty <= restockLevel,
    isLowStock: currentQty <= (restockLevel * 1.5), // Alert when 50% above restock level
    currentQuantity: currentQty,
    restockLevel,
    maximumStockLevel
  };
};

// Helper function to generate restocking request
const generateRestockingRequest = async (productData, variantIndex, locationInfo, currentUser) => {
  try {
    const variant = productData.variants?.[variantIndex];
    if (!variant) return null;
    
    const restockCheck = checkRestockingThreshold(productData, variantIndex);
    if (!restockCheck.needsRestock) return null;
    
    const requestId = `RSR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const restockingRequest = {
      requestId,
      productId: productData.id || 'unknown',
      productName: productData.name || 'Unknown Product',
      variantIndex,
      variantDetails: {
        size: variant.size || '',
        unit: variant.unit || 'pcs',
        unitPrice: variant.unitPrice || 0
      },
      currentQuantity: restockCheck.currentQuantity,
      restockLevel: restockCheck.restockLevel,
      maximumStockLevel: restockCheck.maximumStockLevel,
      suggestedOrderQuantity: Math.max(50, restockCheck.maximumStockLevel - restockCheck.currentQuantity), // Suggest ordering to reach max level
      priority: restockCheck.currentQuantity === 0 ? 'urgent' : 'normal',
      location: {
        storageLocation: locationInfo.storageLocation,
        shelfName: locationInfo.shelfName,
        rowName: locationInfo.rowName,
        columnIndex: locationInfo.columnIndex,
        fullPath: `${locationInfo.storageLocation}/${locationInfo.shelfName}/${locationInfo.rowName}/${locationInfo.columnIndex}`
      },
      triggeredBy: 'pos_sale',
      triggeredByUser: currentUser?.uid || 'unknown',
      triggeredByUserName: currentUser?.displayName || currentUser?.email || 'Unknown User',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Save to restocking requests collection
    await addDoc(collection(db, 'restockingRequests'), restockingRequest);
    console.log('Restocking request generated:', requestId);
    
    return restockingRequest;
  } catch (error) {
    console.error('Error generating restocking request:', error);
    return null;
  }
};

// Helper function to generate notification
const generateNotification = async (restockingRequest, currentUser) => {
  try {
    if (!restockingRequest) return null;
    
    const notificationId = `NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification = {
      notificationId,
      type: 'restocking_request',
      priority: restockingRequest.priority,
      title: `${restockingRequest.priority === 'urgent' ? '🚨 URGENT' : '⚠️'} Restocking Required`,
      message: `${restockingRequest.productName} is ${restockingRequest.currentQuantity === 0 ? 'out of stock' : 'running low'} (${restockingRequest.currentQuantity} remaining)`,
      details: {
        productName: restockingRequest.productName,
        currentQuantity: restockingRequest.currentQuantity,
        restockLevel: restockingRequest.restockLevel,
        maximumStockLevel: restockingRequest.maximumStockLevel,
        suggestedOrderQuantity: restockingRequest.suggestedOrderQuantity,
        location: restockingRequest.location.fullPath,
        variantDetails: restockingRequest.variantDetails
      },
      targetRoles: ['inventory_manager', 'admin', 'manager'], // Who should see this notification
      triggeredBy: restockingRequest.triggeredByUser,
      triggeredByName: restockingRequest.triggeredByUserName,
      relatedRequestId: restockingRequest.requestId,
      isRead: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Save to notifications collection
    await addDoc(collection(db, 'Notifications'), notification);
    console.log('Notification generated:', notificationId);
    
    return notification;
  } catch (error) {
    console.error('Error generating notification:', error);
    return null;
  }
};

export default function Pos_NewSale() {
  // --- User ----
  const { currentUser, loading: authLoading } = useAuth();
  const [loadingUser, setLoadingUser] = useState(true);
  // --- State Management ---

  const [currentDateTime, setCurrentDateTime] = useState(() => getFormattedDateTime());
  const [addedProducts, setAddedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [restockingAlerts, setRestockingAlerts] = useState([]); // Track restocking alerts

  // Product State
  const { listenToProducts } = useServices();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Variant Modal State
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Customer State - Enhanced for quotation support
  const [customerDetails, setCustomerDetails] = useState({ 
    name: '', 
    phone: '', 
    address: '',
    email: '' 
  });
  const [customerDisplayName, setCustomerDisplayName] = useState('Walk-in Customer');

  // Transaction Type State
  const [transactionType, setTransactionType] = useState('walk-in'); // 'walk-in' or 'quotation'

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Add this memoized value to get unique categories:
  const categories = useMemo(() => {
    return [...new Set(products.map(product => product.category))].sort();
  }, [products]);

  // Add new state for unit conversion modal
  const [unitConversionModalOpen, setUnitConversionModalOpen] = useState(false);
  const [selectedProductForUnitModal, setSelectedProductForUnitModal] = useState(null);

  // Add new state for quick quantity modal
  const [quickQuantityModalOpen, setQuickQuantityModalOpen] = useState(false);
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState(null);

  // Add new state for quotation modal
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  // Helper function to check if a product variant is low on stock
  const isLowStock = useCallback((productGroup) => {
    if (!productGroup.variants || productGroup.variants.length === 0) return false;
    
    return productGroup.variants.some(variant => {
      const currentQty = variant.quantity || 0;
      const restockLevel = variant.restockLevel || 10; // Default restock level
      return currentQty <= (restockLevel * 1.5); // Alert when 50% above restock level
    });
  }, []);

  const isOutOfStock = useCallback((productGroup) => {
    if (!productGroup.variants || productGroup.variants.length === 0) return true;
    
    return productGroup.variants.every(variant => {
      const currentQty = variant.quantity || 0;
      const restockLevel = variant.restockLevel || 10;
      return currentQty <= restockLevel; // Consider out of stock when at or below restock level
    });
  }, []);

  const getCartItemQuantity = useCallback((productId, variantId) => {
    const cartItem = addedProducts.find(item => 
      item.baseProductId === productId && item.variantId === variantId
    );
    return cartItem ? cartItem.qty : 0;
  }, [addedProducts]);

  // --- Auto-set customer name for walk-in transactions ---
  useEffect(() => {
    if (transactionType === 'walk-in') {
      setCustomerDetails(prev => ({
        ...prev,
        name: 'Walk-in Customer'
      }));
      setCustomerDisplayName('Walk-in Customer');
    } else if (transactionType === 'quotation') {
      setCustomerDetails(prev => ({
        ...prev,
        name: ''
      }));
      setCustomerDisplayName('');
    }
  }, [transactionType]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (currentUser) {
          // Current user is already available from AuthContext
          setLoadingUser(false);
        } else {
          console.error("No user found");
          // Optionally redirect to login
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [currentUser]);

  // Add clock update effect
  useEffect(() => {
    const updateClock = () => {
        const time = getFormattedDateTime();
        setCurrentDateTime(time);
    };
    
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Data Fetching and Processing ---

  // Validation function
  const validateProductQuantities = useCallback((currentProducts, updatedProducts) => {
    let productsNeedUpdate = false;
    
    const updatedProductsList = currentProducts.map(item => {
        const product = updatedProducts.find(p => p.id === item.baseProductId);
        if (!product) return item;

        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) return item;

        if (variant.quantity < item.qty) {
            productsNeedUpdate = true;
            return {
                ...item,
                qty: variant.quantity,
                invalidQuantity: true
            };
        }
        return item;
    });

    if (productsNeedUpdate) {
        setAddedProducts(updatedProductsList);
        alert("Some products have been updated due to inventory changes.");
    }
  }, []);

  // Fetch Products
  useEffect(() => {
    setLoadingProducts(true);
    const unsubscribe = listenToProducts((fetchedProducts) => {
        setProducts(prevProducts => {
            const addedProductIds = addedProducts.map(item => item.baseProductId);
            
            // Check if any added products are affected by the update
            const updatedItems = fetchedProducts.filter(p => 
                addedProductIds.includes(p.id));
            
            // Validate quantities against new stock levels
            if (updatedItems.length > 0) {
                validateProductQuantities(addedProducts, updatedItems);
            }
            
            return fetchedProducts;
        });
        setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [addedProducts]); // Updated dependency

  // Group Products (Memoized) - Ensure correct placeholder path
  const groupedProducts = useMemo(() => {
    const grouped = {};

    products.forEach(product => {
        if (!product || !product.id || !product.name) {
            console.warn("Skipping invalid product data:", product);
            return;
        }
    
        const baseProductName = product.name;
    
        if (!grouped[baseProductName]) {
            grouped[baseProductName] = {
                id: product.id, // This should be "Building-Plywood" format
                name: product.name,
                category: product.category,
                brand: product.brand || 'Generic', // Add brand information
                quantity: product.quantity || 0,
                variants: [],
                image: product.image || null,
                hasVariants: false
            };
        }
    
        if (product.variants && Array.isArray(product.variants)) {
            product.variants.forEach((variant, index) => {
                grouped[baseProductName].variants.push({
                    variantId: `${product.id}-${index}`, // e.g., "Building-Plywood-0"
                    baseProductId: product.id, // This should be "Building-Plywood"
                    category: product.category, // "Building"
                    brand: product.brand || 'Generic', // Add brand information to variants
                    size: variant.size || '',
                    unit: variant.unit || 'pcs',
                    price: Number(variant.unitPrice) || 0,
                    quantity: Number(variant.quantity) || 0,
                    image: variant.image || product.image || null,
                    // Add location fields from the parent product
                    storageLocation: product.storageLocation,
                    shelfName: product.shelfName,
                    rowName: product.rowName,
                    columnIndex: product.columnIndex,
                    fullLocation: product.fullLocation
                });
            });
    
            grouped[baseProductName].hasVariants = product.variants.length > 0;
        }
    });

    return Object.values(grouped);
  }, [products]);

  // Filter Products (Memoized)
  const filteredProducts = useMemo(() => {
    let filtered = groupedProducts;
    
    // First filter by category if one is selected
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
      console.log('After category filter:', { selectedCategory, count: filtered.length });
    }
    
    // Then filter by brand if one is selected
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);
      console.log('After brand filter:', { selectedBrand, count: filtered.length, products: filtered });
    }
    
    // Then apply search query if exists
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query)
      );
      console.log('After search filter:', { query, count: filtered.length });
    }
    
    return filtered;
  }, [groupedProducts, selectedCategory, selectedBrand, searchQuery]);

  // --- Product Management Logic ---
  const addProduct = useCallback((prodToAdd) => {
    if (!prodToAdd?.variantId || !prodToAdd?.baseProductId) {
        console.error("Invalid product data:", prodToAdd);
        return;
    }

    const quantity = Number(prodToAdd.qty);
    if (isNaN(quantity) || quantity <= 0) {
        alert("Please enter a valid quantity");
        return;
    }

    setAddedProducts(currentProducts => {
        const existingItem = currentProducts.find(item => item.variantId === prodToAdd.variantId);
        
        if (existingItem) {
            return currentProducts.map(item => 
                item.variantId === prodToAdd.variantId 
                    ? { ...item, qty: item.qty + quantity }
                    : item
            );
        }

        return [...currentProducts, {
            ...prodToAdd,
            qty: quantity,
            price: Number(prodToAdd.price)
        }];
    });
  }, []);

  const handleRemoveProduct = useCallback((indexToRemove) => {
    setAddedProducts(currentProducts => currentProducts.filter((_, i) => i !== indexToRemove));
  }, []);

  const handleUpdateCartQuantity = useCallback((itemIndex, newQuantity) => {
    setAddedProducts(currentProducts => {
      const updatedProducts = [...currentProducts];
      const item = updatedProducts[itemIndex];
      
      // Find the product in the products array to check stock
      const product = products.find(p => p.id === item.baseProductId);
      if (!product) {
        alert('Product not found');
        return currentProducts;
      }

      // Find the variant
      const variantIndex = parseInt(item.variantId.split('-').pop(), 10);
      const variant = product.variants[variantIndex];
      
      if (!variant) {
        alert('Product variant not found');
        return currentProducts;
      }

      // Validate new quantity
      if (newQuantity <= 0) {
        // If quantity is 0 or negative, remove the item
        return currentProducts.filter((_, index) => index !== itemIndex);
      }

      if (newQuantity > variant.quantity) {
        alert(`Cannot set quantity to ${newQuantity}. Only ${variant.quantity} available in stock.`);
        return currentProducts;
      }

      // Update the quantity
      updatedProducts[itemIndex] = {
        ...item,
        qty: newQuantity
      };

      return updatedProducts;
    });
  }, [products]);

  // --- Product Selection Logic ---
  const handleAddProduct = useCallback((productGroup) => {
    if (!productGroup || !productGroup.variants || isProcessing) {
        console.warn("Add product blocked:", { productGroup, isProcessing });
        return;
    }

    // Check if variants have different sizes/units (ignoring brand differences)
    const uniqueSizeUnits = new Set(productGroup.variants.map(v => `${v.size || ''}|${v.unit || ''}`));
    const hasSizeOrUnitVariants = uniqueSizeUnits.size > 1;
    
    // Check if variants have different brands
    const uniqueBrands = new Set(productGroup.variants.map(v => v.brand));
    const hasBrandVariants = uniqueBrands.size > 1;

    if (hasSizeOrUnitVariants) {
        // Show variant selection modal if there are different sizes/units
        setQuantity(1);
        setSelectedProductForModal(productGroup);
        setActiveVariantIndex(0);
        setVariantModalOpen(true);
    } else if (hasBrandVariants) {
        // Show variant selection modal for different brands
        setQuantity(1);
        setSelectedProductForModal(productGroup);
        setActiveVariantIndex(0);
        setVariantModalOpen(true);
    } else if (productGroup.variants.length === 1) {
        const variant = productGroup.variants[0];
        const cartQty = getCartItemQuantity(productGroup.id, variant.variantId);
        const availableQty = variant.quantity - cartQty;

        if (availableQty <= 0) {
            alert(`Maximum quantity already in cart for ${productGroup.name}`);
            return;
        }

        // Show quick quantity modal for single variant products
        setSelectedProductForQuantity({
            ...productGroup,
            maxAvailableQty: availableQty
        });
        setQuickQuantityModalOpen(true);
    }
  }, [addProduct, isProcessing, getCartItemQuantity]);

  const handleAddVariant = useCallback(() => {
    if (!selectedProductForModal?.variants?.[activeVariantIndex]) {
        console.error("Invalid variant selection");
        setVariantModalOpen(false);
        return;
    }

    const variant = selectedProductForModal.variants[activeVariantIndex];
    const cartQty = getCartItemQuantity(selectedProductForModal.id, variant.variantId);
    const availableQty = variant.quantity - cartQty;

    if (availableQty < quantity) {
        alert(`Cannot add ${quantity} items. Only ${availableQty} available.`);
        return;
    }

    // Create display name with size/unit
    const displayName = variant.size || variant.unit 
        ? `${selectedProductForModal.name} (${variant.size || ''} ${variant.unit || ''})`.trim()
        : selectedProductForModal.name;

    addProduct({
        id: variant.variantId,
        name: displayName,
        baseName: selectedProductForModal.name,
        price: variant.price,
        qty: quantity,
        variantId: variant.variantId,
        category: selectedProductForModal.category,
        baseProductId: variant.baseProductId,
        // Add location fields from variant
        storageLocation: variant.storageLocation,
        shelfName: variant.shelfName,
        rowName: variant.rowName,
        columnIndex: variant.columnIndex,
        fullLocation: variant.fullLocation
    });

    setVariantModalOpen(false);
    setSelectedProductForModal(null);
    setActiveVariantIndex(0);
    setQuantity(1);
  }, [selectedProductForModal, activeVariantIndex, quantity, addProduct, getCartItemQuantity]);

  // --- Sale Reset Logic ---
  const resetSaleState = useCallback(() => {
       setAddedProducts([]); // This line clears the cart
       setAmountPaid('');
       setPaymentMethod('Cash');
       setCustomerDetails({ name: '', phone: '', address: '', email: '' });
       setCustomerDisplayName('Walk-in Customer');
       setSearchQuery('');
       setQuantity(1);
       setSelectedProductForModal(null);
       setVariantModalOpen(false);
       setActiveVariantIndex(0);
       setTransactionType('walk-in');
       setShowQuotationModal(false);
       setRestockingAlerts([]); // Clear restocking alerts
  }, []);

  // --- Calculations ---
  // Calculate totals using useMemo based on added products
  const { subTotal, tax, total } = useMemo(() => {
    const totalCalc = addedProducts.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const subTotalCalc = totalCalc / 1.12; // Net of VAT
    const taxCalc = totalCalc - subTotalCalc; // VAT amount
    
    return { 
      subTotal: subTotalCalc, 
      tax: taxCalc, 
      total: totalCalc 
    };
  }, [addedProducts]); // Updated dependency

  // Enhanced analytics data collection
  const collectAnalyticsData = useCallback((transactionData) => {
    try {
      const analyticsData = {
        transactionId: transactionData.transactionId,
        timestamp: new Date(),
        totalAmount: transactionData.totalAmount,
        itemCount: transactionData.items.length,
        paymentMethod: transactionData.paymentMethod,
        items: transactionData.items.map(item => ({
          productId: item.baseProductId || item.id,
          variantId: item.variantId || item.id,
          productName: item.baseName || item.name,
          variantName: item.name,
          quantity: item.qty,
          unitPrice: item.price,
          totalPrice: item.price * item.qty,
          category: item.category
        })),
        salesPerformance: {
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          month: new Date().getMonth()
        }
      };

      // Send to analytics service
      AnalyticsService.recordSale(analyticsData);
      console.log('Analytics data collected:', analyticsData);
    } catch (error) {
      console.error('Error collecting analytics:', error);
    }
  }, []);

  // Quotation generation function
  const handleQuotationSubmit = useCallback((customerInfo) => {
    if (addedProducts.length === 0) {
      alert("Cannot create quotation: Cart is empty");
      return;
    }

    try {
      // Create quotation data using utility
      const quotationData = QuotationUtils.createQuotationData(
        customerInfo,
        addedProducts,
        currentUser,
        {
          discountPercent: 0,
          deliveryFee: 150
        }
      );

      // Generate HTML content
      const htmlContent = QuotationGenerator.generate(quotationData);

      // Print quotation
      QuotationGenerator.print(htmlContent);

      // Close modal
      setShowQuotationModal(false);
      
      console.log('Quotation generated successfully:', quotationData.quotationNumber);
    } catch (error) {
      console.error('Error generating quotation:', error);
      alert('Error generating quotation. Please try again.');
    }
  }, [addedProducts, currentUser]);

  // --- Transaction Logic ---
  const validateStockBeforeTransaction = async () => {
    const invalidItems = [];
    
    for (const item of addedProducts) {
        try {
            // Check if item has the necessary location fields
            if (!item.storageLocation || !item.shelfName || !item.rowName || item.columnIndex === undefined) {
                console.warn('Item missing location fields:', item);
                invalidItems.push(`${item.name} - Missing storage location information`);
                continue;
            }

            // Use the new nested structure path
            const productRef = doc(db, 'Products', item.storageLocation, 'shelves', item.shelfName, 'rows', item.rowName, 'columns', item.columnIndex, 'items', item.baseProductId);
            const productDoc = await getDoc(productRef);
            
            if (!productDoc.exists()) {
            invalidItems.push(`${item.name} - Product not found`);
            continue;
        }

            const productData = productDoc.data();
            const variantIndex = parseInt(item.variantId.split('-').pop(), 10);
            
            if (!productData.variants?.[variantIndex]) {
                invalidItems.push(`${item.name} - Variant not found`);
                continue;
            }

            const currentVariant = productData.variants[variantIndex];
            const currentQuantity = Number(currentVariant.quantity) || 0;
            
            if (currentQuantity < item.qty) {
                invalidItems.push(`${item.name} - Insufficient stock (Available: ${currentQuantity}, Needed: ${item.qty})`);
            }
        } catch (error) {
            console.error('Error validating stock for', item.name, error);
            invalidItems.push(`${item.name} - Error checking stock`);
        }
    }

    if (invalidItems.length > 0) {
        throw new Error(`Cannot process transaction:\n${invalidItems.join('\n')}`);
    }
};

  const handlePrintAndSave = useCallback(async () => {
    if (addedProducts.length === 0 || isProcessing) {
        alert("Cannot process: Cart is empty or transaction in progress");
        return;
    }

    // Only require customer name for quotations, not for walk-in sales
    if (transactionType === 'quotation' && !customerDetails.name.trim()) {
      alert('Please enter customer name for quotation');
      return;
    }

    if (transactionType === 'quotation') {
      // Open customer info modal for quotation
      setShowQuotationModal(true);
      return;
    }

    setIsProcessing(true);

    try {
        console.log('Processing transaction with products:', addedProducts.map(item => ({
          name: item.name,
          id: item.id,
          variantId: item.variantId,
          storageLocation: item.storageLocation,
          shelfName: item.shelfName,
          rowName: item.rowName,
          columnIndex: item.columnIndex,
          qty: item.qty,
          price: item.price
        })));

        await validateStockBeforeTransaction();
        const { formattedDate, formattedTime } = getFormattedDateTime();
        const receiptNumber = `GS-${Date.now()}`;

        const transactionData = {
          transactionId: receiptNumber,
          customerId: `CUST-${Date.now()}`,
          customerInfo: cleanFirebaseData(customerDetails),
          items: addedProducts.map(item => cleanFirebaseData({
            productId: item.baseProductId || item.id,
            variantId: item.variantId || item.id,
            productName: item.baseName || item.name,
            variantName: item.name,
            quantity: item.qty,
            unitPrice: item.price,
            unit: item.unit || 'Piece',
            totalPrice: item.price * item.qty,
            category: item.category,
            storageLocation: item.storageLocation,
            shelfName: item.shelfName,
            rowName: item.rowName,
            columnIndex: item.columnIndex,
            fullLocation: item.fullLocation
          })),
          totals: {
            subTotal: subTotal,
            tax: tax,
            total: total
          },
          paymentMethod,
          status: 'completed',
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || 'unknown',
          saleDate: formattedDate,
          saleTime: formattedTime,
          cashier: currentUser?.displayName || currentUser?.email || 'Unknown Cashier'
        };

        await runTransaction(db, async (transaction) => {
            const restockingRequestsToGenerate = []; // Track items that need restocking
            const notificationWrites = [];
            const restockWrites = [];
            
            // Update inventory quantities using the correct Firebase structure
            for (const item of addedProducts) {
              console.log('Processing inventory update for item:', {
                name: item.name,
                id: item.id,
                variantId: item.variantId,
                storageLocation: item.storageLocation,
                shelfName: item.shelfName,
                rowName: item.rowName,
                columnIndex: item.columnIndex,
                qty: item.qty
              });
              
              if (item.storageLocation && item.shelfName && item.rowName && item.columnIndex !== undefined) {
                // Construct the correct path: Products/{storageLocation}/shelves/{shelfName}/rows/{rowName}/columns/{columnIndex}/items/{baseProductId}
                const productRef = doc(db, 'Products', item.storageLocation, 'shelves', item.shelfName, 'rows', item.rowName, 'columns', item.columnIndex.toString(), 'items', item.baseProductId);
                console.log('Attempting to update product at path:', `Products/${item.storageLocation}/shelves/${item.shelfName}/rows/${item.rowName}/columns/${item.columnIndex}/items/${item.baseProductId}`);
                
                const productDoc = await transaction.get(productRef);
                
                if (productDoc.exists()) {
                  const productData = productDoc.data();
                  console.log('Current product data:', productData);
                  
                  // Update the specific variant quantity
                  let updatedVariants = [...(productData.variants || [])];
                  
                  // Find the variant index from variantId (e.g., "Building-Plywood-0" -> index 0)
                  const variantIndex = parseInt(item.variantId.split('-').pop(), 10);
                  
                  if (updatedVariants[variantIndex]) {
                    const currentVariantQty = updatedVariants[variantIndex].quantity || 0;
                    const newVariantQty = Math.max(0, currentVariantQty - item.qty);
                    updatedVariants[variantIndex].quantity = newVariantQty;
                    
                    console.log(`Updated variant ${variantIndex} for ${item.name}: ${currentVariantQty} -> ${newVariantQty}`);
                    
                    // Check if restocking is needed after the sale
                    const restockLevel = Number(productData.restockLevel || 0);
                    const maximumStockLevel = Number(productData.maximumStockLevel || 0);
                    
                    if (newVariantQty <= restockLevel) {
                      console.log(`Item ${item.name} needs restocking: Current=${newVariantQty}, Threshold=${restockLevel}`);
                      
                      // Create a deterministic restock request ID
                      const restockRequestId = `Restock-${item.category}-${item.baseProductId}-active`;
                      const restockRequestRef = doc(db, 'RestockRequests', restockRequestId);
                      
                      // Check if restock request already exists
                      const existingRestockDoc = await transaction.get(restockRequestRef);
                      
                      if (!existingRestockDoc.exists() || existingRestockDoc.data().status !== 'pending') {
                        const timestamp = Date.now();
                        
                        // Calculate suggested order quantity
                        const suggestedOrderQuantity = maximumStockLevel > 0 
                          ? maximumStockLevel - newVariantQty 
                          : Math.max(restockLevel * 2, 10);
                        
                        // Get supplier information
                        const productSupplierCode = productData.supplier?.primaryCode || productData.supplier?.code || productData.supplierCode || 'UNKNOWN';
                        const productSupplierName = typeof productData.supplier?.name === 'string' 
                          ? productData.supplier.name 
                          : (typeof productData.supplier?.name === 'object' ? productData.supplier.name?.name : 'Unknown Supplier');
                        
                        // Create notification data
                        const notificationId = `Notify-${item.category}-${item.baseProductId}-${timestamp}`;
                        const notificationRef = doc(db, 'Notifications', notificationId);
                        
                        const notificationData = {
                          message: `Low stock alert for ${item.name}`,
                          productId: item.baseProductId,
                          variantId: item.variantId,
                          currentQuantity: newVariantQty,
                          restockLevel: restockLevel,
                          maximumStockLevel: maximumStockLevel,
                          category: item.category,
                          productName: item.name,
                          status: 'pending',
                          timestamp: serverTimestamp(),
                          type: 'restock_alert',
                          createdAt: new Date().toISOString(),
                          supplierName: String(productSupplierName),
                          supplierCode: String(productSupplierCode),
                          storageLocation: item.storageLocation || 'Unknown',
                          shelfName: item.shelfName || 'Unknown',
                          rowName: item.rowName || 'Unknown',
                          columnIndex: item.columnIndex !== undefined ? item.columnIndex : 'Unknown',
                          fullLocation: item.fullLocation || 'Unknown Location'
                        };
                        
                        // Create restock request data
                        const restockData = {
                          ...notificationData,
                          requestedQuantity: suggestedOrderQuantity,
                          type: 'restock_request',
                          supplier: {
                            name: String(productSupplierName),
                            code: String(productSupplierCode),
                            primaryCode: String(productSupplierCode)
                          },
                          priority: newVariantQty <= 0 ? 'urgent' : (restockLevel > 0 && newVariantQty <= (restockLevel * 0.5)) ? 'high' : 'normal'
                        };
                        
                        // Add to write arrays for batch processing
                        notificationWrites.push({
                          ref: notificationRef,
                          data: notificationData
                        });
                        
                        restockWrites.push({
                          ref: restockRequestRef,
                          data: restockData
                        });
                        
                        console.log('Restock request and notification prepared for:', item.name);
                      }
                    }
                    
                    // Update the main product quantity as sum of all variants
                    const totalQuantity = updatedVariants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
                    
                    transaction.update(productRef, {
                      variants: updatedVariants,
                      quantity: totalQuantity,
                      lastSold: serverTimestamp(),
                      totalSold: (productData.totalSold || 0) + item.qty,
                      lastUpdated: serverTimestamp()
                    });
                    
                    console.log(`Updated total product quantity to ${totalQuantity}`);
                  } else {
                    console.warn(`Variant index ${variantIndex} not found for product ${item.name}`);
                  }
                } else {
                  console.warn(`Product not found at path: Products/${item.storageLocation}/shelves/${item.shelfName}/rows/${item.rowName}/columns/${item.columnIndex}/items/${item.baseProductId}`);
                }
              } else {
                console.warn(`Missing location data for product: ${item.name}`, {
                  storageLocation: item.storageLocation,
                  shelfName: item.shelfName,
                  rowName: item.rowName,
                  columnIndex: item.columnIndex
                });
              }
            }

            // Save transaction
            const transactionRef = doc(db, 'posTransactions', receiptNumber);
            transaction.set(transactionRef, transactionData);
            
            // Write all notifications and restock requests within the transaction
            for (const { ref, data } of notificationWrites) {
              transaction.set(ref, data);
            }
            
            for (const { ref, data } of restockWrites) {
              transaction.set(ref, data);
            }
            
            console.log(`Transaction completed with ${notificationWrites.length} notifications and ${restockWrites.length} restock requests`);
        });

        // Collect analytics
        collectAnalyticsData({
          transactionId: receiptNumber,
          totalAmount: total,
          itemCount: addedProducts.length,
          items: addedProducts,
          paymentMethod
        });

        // Generate and print receipt
        try {
          printReceiptContent({
            transactionId: receiptNumber,
            customerInfo: customerDetails,
            items: addedProducts,
            totals: { subTotal, tax, total },
            paymentMethod,
            date: formattedDate,
            time: formattedTime,
            cashier: currentUser?.displayName || currentUser?.email || 'Unknown Cashier'
          });
        } catch (printError) {
          console.error('Error printing receipt:', printError);
          alert('Receipt printing failed, but transaction was completed successfully!');
        }

        // Clear cart and reset states
        resetSaleState();
        alert('Transaction completed successfully!');

    } catch (error) {
        console.error("Transaction failed:", error);
        alert(error.message);
    } finally {
        setIsProcessing(false);
    }
  }, [addedProducts, products, total, subTotal, tax, amountPaid, paymentMethod, customerDetails, customerDisplayName, transactionType, resetSaleState, currentUser, collectAnalyticsData]);

  // --- UI ---
  const shouldDisableInteractions = isProcessing;

  return (
    <div className="flex flex-col w-full max-w-[1920px] mx-auto bg-white min-h-screen">
      {/* Enhanced Header with Gradient */}
      <div className="bg-orange-50 border-b border-gray-100 sticky top-0 z-30 h-[73px]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              New Sale
              {isProcessing && (
                    <div className="inline-block w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              )}
              {restockingAlerts.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-red-600 font-medium">
                    {restockingAlerts.filter(a => a.priority === 'urgent').length > 0 ? 'Stock Alert!' : 'Low Stock'}
                  </span>
                </div>
              )}
            </h2>
                <div className="text-sm text-gray-500">
                  Create a new sales transaction
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden md:block" />
              <div className="clock-display bg-white px-4 py-2 rounded-lg font-mono text-gray-600 hidden md:block shadow-sm border border-gray-100">
              <span className="clock-time text-lg font-semibold">
                {currentDateTime.formattedTime?.hours || '00'}
                <span className="clock-separator animate-pulse">:</span>
                {currentDateTime.formattedTime?.minutes || '00'}
                <span className="clock-separator animate-pulse">:</span>
                {currentDateTime.formattedTime?.seconds || '00'}
              </span>
                <span className="clock-divider mx-3 text-gray-500">|</span>
                <span className="text-gray-700">{currentDateTime.formattedDate}</span>
            </div>
          </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-slate-200">
                <span className="text-slate-600 font-bold">
                {currentUser?.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="text-sm">
              <p className="font-semibold text-gray-800">{currentUser?.name || 'Loading...'}</p>
                <p className="text-gray-700 text-xs">{currentUser?.role || 'User'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left Side: Product Selection - Scrollable */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-100 mr-[480px]">
          <div className="sticky top-[73px] bg-white z-20 border-b border-gray-100">
            <div className="px-4 sm:px-6 py-4 bg-gray-50">
              <div className="flex gap-4">
                {/* Search Bar Column */}
                <div className="flex-1">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                disabled={shouldDisableInteractions}
                    placeholder="Search products by name, category, or brand..."
                    className="bg-white shadow-sm border-gray-200"
              />
            </div>
                {/* Filters Column */}
                <div className="flex-1">
                  <ProductFilters
                    products={products}
              selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    selectedBrand={selectedBrand}
                    setSelectedBrand={setSelectedBrand}
                    className="bg-white"
            />
          </div>
              </div>
            </div>
          </div>
            
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <ProductGrid
              products={filteredProducts}
              onProductSelect={handleAddProduct}
              loading={loadingProducts}
              disabled={shouldDisableInteractions}
              getCartQuantity={getCartItemQuantity}
              isLowStock={isLowStock}
              isOutOfStock={isOutOfStock}
            />
          </div>
        </div>

        {/* Right Side: Fixed Panel */}
        <div className="w-[480px] fixed right-0 top-0 h-screen bg-white flex flex-col border-l border-gray-100">
          {/* Customer Info */}
          <div className="pt-[73px]">
            <div className="border-b border-gray-100 bg-gray-50">
              <div className="p-4 sm:p-6">
            <CustomerInfo
              customerInfo={customerDetails}
              setCustomerInfo={setCustomerDetails}
              disabled={shouldDisableInteractions}
              transactionType={transactionType}
              setTransactionType={setTransactionType}
            />
              </div>
            </div>
          </div>

          {/* Scrollable Product List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              <ProductList
                cartItems={addedProducts.map(item => ({
                    ...item,
                    formattedPrice: formatCurrency(item.price),
                    formattedTotal: formatCurrency(item.price * item.qty)
                }))}
                onRemoveItem={handleRemoveProduct}
                onUpdateQuantity={handleUpdateCartQuantity}
                isProcessing={isProcessing}
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-100">
            <OrderSummary
              subTotal={subTotal}
              tax={tax}
              total={total}
              itemCount={addedProducts.length}
            />
          </div>

          {/* Payment Section */}
          <div className="border-t border-gray-100">
            <PaymentSection
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              total={total}
              formattedTotal={formatCurrency(total)}
              formattedChange={formatCurrency(Number(amountPaid) - total)}
              onPrintAndSave={handlePrintAndSave}
              onClearCart={resetSaleState}
              isProcessing={isProcessing}
              disabled={shouldDisableInteractions || addedProducts.length === 0}
              hasProducts={addedProducts.length > 0}
              transactionType={transactionType}
              checkoutButtonText={transactionType === 'quotation' ? 'Generate Quotation' : 'Complete Sale'}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <div className="relative z-50">
        {/* Quotation Modal */}
        <CustomerInfoModal
          isOpen={showQuotationModal}
          onClose={() => setShowQuotationModal(false)}
          onSubmit={handleQuotationSubmit}
        />
        
        {variantModalOpen && selectedProductForModal && (
          <VariantSelectionModal
            product={selectedProductForModal}
            activeVariantIndex={activeVariantIndex}
            setActiveVariantIndex={setActiveVariantIndex}
            qty={quantity}
            setQty={setQuantity}
            onAddVariant={handleAddVariant}
            onClose={() => {
              setVariantModalOpen(false);
              setSelectedProductForModal(null);
              setActiveVariantIndex(0);
              setQuantity(1);
            }}
          />
        )}

        {unitConversionModalOpen && selectedProductForUnitModal && (
          <UnitConversionModal
            product={selectedProductForUnitModal}
            isOpen={unitConversionModalOpen}
            onClose={() => {
              setUnitConversionModalOpen(false);
              setSelectedProductForUnitModal(null);
            }}
            onAddToCart={(productWithUnit) => {
              addProduct({
                id: productWithUnit.variantId,
                name: `${productWithUnit.name} (${productWithUnit.unit})`,
                baseName: productWithUnit.name,
                price: productWithUnit.price,
                qty: productWithUnit.qty,
                unit: productWithUnit.unit,
                variantId: productWithUnit.variantId,
                baseProductId: productWithUnit.baseProductId,
                category: productWithUnit.category,
                // Add location fields from variant
                storageLocation: productWithUnit.storageLocation,
                shelfName: productWithUnit.shelfName,
                rowName: productWithUnit.rowName,
                columnIndex: productWithUnit.columnIndex,
                fullLocation: productWithUnit.fullLocation
              });
              setUnitConversionModalOpen(false);
              setSelectedProductForUnitModal(null);
            }}
          />
        )}

        {quickQuantityModalOpen && selectedProductForQuantity && (
          <QuickQuantityModal
            product={selectedProductForQuantity}
            maxQuantity={selectedProductForQuantity.maxAvailableQty || selectedProductForQuantity.variants[0].quantity}
            onClose={() => {
              setQuickQuantityModalOpen(false);
              setSelectedProductForQuantity(null);
            }}
            onAdd={(quantity) => {
              const variant = selectedProductForQuantity.variants[0];
              const cartQty = getCartItemQuantity(selectedProductForQuantity.id, variant.variantId);
              
              if (cartQty + quantity > variant.quantity) {
                alert(`Cannot add ${quantity} items. Only ${variant.quantity - cartQty} available.`);
                return;
              }

              const displayName = variant.size || variant.unit 
                ? `${selectedProductForQuantity.name} (${variant.size || ''} ${variant.unit || ''})`.trim()
                : selectedProductForQuantity.name;

              addProduct({
                id: variant.variantId,
                name: displayName,
                baseName: selectedProductForQuantity.name,
                price: variant.price,
                qty: quantity,
                variantId: variant.variantId,
                unit: variant.unit,
                category: selectedProductForQuantity.category,
                baseProductId: variant.baseProductId,
                // Add location fields from variant
                storageLocation: variant.storageLocation,
                shelfName: variant.shelfName,
                rowName: variant.rowName,
                columnIndex: variant.columnIndex,
                fullLocation: variant.fullLocation
              });
              setQuickQuantityModalOpen(false);
              setSelectedProductForQuantity(null);
            }}
          />
        )}
      </div>
    </div>
  );
} // End Pos_NewSale component