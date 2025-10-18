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
  setDoc,
} from 'firebase/firestore';
import app from  '../../../FirebaseConfig';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { AnalyticsService } from '../../../services/firebase/AnalyticsService';

// Import Components from new locations
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';
import ProductList from '../components/Cart';
import OrderSummary from '../components/OrderSummary';
import PaymentSection from '../components/PaymentSection';
import ProductFilters from '../components/ProductFilters';
import UnitConversionModal from '../components/UnitConversionModal';

// Import Modals from new locations
import VariantSelectionModal from '../components/Modals/VariantSelectionModal';
import QuickQuantityModal from '../components/QuickQuantityModal';
import LocationSelectionModal from '../components/Modals/LocationSelectionModal';
import ReceiptModal from '../components/Modals/ReceiptModal';

// Import utilities
import { printReceiptContent } from '../utils/ReceiptGenerator';

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

// Helper function to generate sale notification
  const generateSaleNotification = async (transactionData, currentUser) => {
    try {
      if (!transactionData) return null;
      
      const notificationId = `SALE-NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const notification = {
        notificationId,
        type: 'sale_completed',
        priority: 'normal',
        title: '�Sale Completed',
        message: `Sale ${transactionData.transactionId} completed for ₱${transactionData.total.toLocaleString()}`,
        details: {
          transactionId: transactionData.transactionId,
          totalAmount: transactionData.total,
          itemCount: transactionData.items.length,
          paymentMethod: transactionData.paymentMethod,
          customerInfo: transactionData.customerInfo,
          items: transactionData.items.map(item => ({
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            category: item.category
          }))
        },
        targetRoles: ['InventoryManager', 'Admin'], // Who should see this notification
        triggeredBy: currentUser?.uid || 'system',
        triggeredByName: currentUser?.displayName || currentUser?.email || 'POS System',
        relatedTransactionId: transactionData.transactionId,
        isRead: false,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Save to notifications collection
      await addDoc(collection(db, 'Notifications'), notification);

      return notification;
    } catch (error) {
      console.error('Error generating sale notification:', error);
      return null;
    }
  };

export default function Pos_NewSale() {
  // --- User Authentication ---
  const { currentUser, loading: authLoading } = useAuth();

  // Redirect to login if not authenticated and auth state is loaded
  useEffect(() => {
    if (!authLoading && !currentUser) {
      // User is not authenticated, redirect to login
      window.location.href = '/auth/login';
    }
  }, [currentUser, authLoading]);

  // Show loading screen while authentication is being determined
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!currentUser) {
    return null;
  }

  // --- State Management ---

  const [currentDateTime, setCurrentDateTime] = useState(() => getFormattedDateTime());
  const [addedProducts, setAddedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
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

  // Location Modal State
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedVariantForLocation, setSelectedVariantForLocation] = useState(null);
  const [pendingQuantity, setPendingQuantity] = useState(1);

  // Customer State
  const [customerDetails, setCustomerDetails] = useState({ 
    name: 'Walk-in Customer', 
    phone: '', 
    address: '',
    email: '' 
  });
  const [customerDisplayName, setCustomerDisplayName] = useState('Walk-in Customer');

  // Quotation Lookup State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [loadingQuotation, setLoadingQuotation] = useState(false);

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

  // Add state for receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState(null);

  // Function to load quotation from Firebase
  const handleLoadQuotation = async () => {
    if (!quotationNumber.trim()) {
      alert('Please enter a quotation number');
      return;
    }

    setLoadingQuotation(true);
    try {
      const quotationRef = doc(db, 'quotations', quotationNumber.trim());
      const quotationSnap = await getDoc(quotationRef);

      if (!quotationSnap.exists()) {
        alert(`Quotation ${quotationNumber} not found`);
        setLoadingQuotation(false);
        return;
      }

      const quotationData = quotationSnap.data();

      // Load customer information
      if (quotationData.customer) {
        setCustomerDetails({
          name: quotationData.customer.name || 'Walk-in Customer',
          phone: quotationData.customer.phone || '',
          address: quotationData.customer.address || '',
          email: quotationData.customer.email || '',
          company: quotationData.customer.company || '',
          projectName: quotationData.customer.projectName || ''
        });
        setCustomerDisplayName(quotationData.customer.name || 'Walk-in Customer');
      }

      // Load products from quotation
      if (quotationData.items && Array.isArray(quotationData.items)) {
        const loadedProducts = [];
        
        for (const item of quotationData.items) {
           // Debug log
          
          // Extract price and quantity - handle both old format (price/qty) and new format (unitPrice/quantity)
          const itemPrice = Number(item.unitPrice || item.price || 0);
          const itemQty = Number(item.quantity || item.qty || 1);
          const itemName = item.description || item.name || 'Unknown Product';
          
          // Try to find the product in the current products list
          const productMatch = products.find(p => 
            p.name.toLowerCase() === itemName.toLowerCase()
          );

          if (productMatch) {
            // Add to cart with quotation details
            loadedProducts.push({
              id: productMatch.id || `temp-${Date.now()}-${Math.random()}`,
              name: itemName,
              baseName: productMatch.name,
              price: itemPrice,
              qty: itemQty,
              category: item.category || productMatch.category,
              unit: item.unit || 'pcs',
              variantDetails: item.variantDetails || {},
              fromQuotation: quotationNumber.trim(),
              originalProductId: productMatch.id // Store original product ID for inventory tracking
            });
          } else {
            // Product not found in inventory, still add it for reference
            console.warn(`Product "${itemName}" not found in current inventory`);
            loadedProducts.push({
              id: `quotation-${Date.now()}-${Math.random()}`,
              name: itemName,
              baseName: itemName,
              price: itemPrice,
              qty: itemQty,
              category: item.category || 'Other',
              unit: item.unit || 'pcs',
              variantDetails: item.variantDetails || {},
              fromQuotation: quotationNumber.trim(),
              notInInventory: true // Flag for products not in current inventory
            });
          }
        }

         // Debug log
        setAddedProducts(loadedProducts);
        alert(`Quotation ${quotationNumber} loaded successfully!\n${loadedProducts.length} items added to cart.`);
      } else {
        alert('No items found in this quotation');
      }

      // Update quotation status to 'processing' or 'converted'
      await setDoc(quotationRef, {
        ...quotationData,
        status: 'processing',
        convertedToInvoice: true,
        convertedAt: serverTimestamp(),
        convertedBy: currentUser?.uid || 'unknown',
        lastUpdated: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error('Error loading quotation:', error);
      alert('Failed to load quotation. Please try again.');
    } finally {
      setLoadingQuotation(false);
    }
  };

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

  // Walk-in customers have default name
  // No need for transaction type logic as this is invoice-only page

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

        // Safe check for variants array
        if (!product.variants || !Array.isArray(product.variants)) return item;

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

  // Group Products (Memoized)
  // Group products by base identity (name + brand + specs)
  // Then consolidate variants by size/unit (combining different locations)
  const groupedProducts = useMemo(() => {
    const grouped = {};

    products.forEach(product => {
      if (!product || !product.id || !product.name) {
        console.warn("Skipping invalid product data:", product);
        return;
      }
  
      // Create a unique key based on product identity (not storage location)
      const uniqueKey = `${product.name}_${product.brand || 'generic'}_${product.specifications || ''}_${product.category || ''}`;
  
      if (!grouped[uniqueKey]) {
        grouped[uniqueKey] = {
          id: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand || 'Generic',
          quantity: 0,
          variants: [],
          image: product.image || product.imageUrl || null,
          hasVariants: false,
          allLocations: [] // Store all location instances
        };
      }
      
      // Add this product instance to allLocations
      grouped[uniqueKey].allLocations.push({
        variantId: product.id,
        baseProductId: product.parentProductId || product.id,
        category: product.category,
        brand: product.brand || 'Generic',
        size: product.size || product.variantName || '',
        unit: product.unit || 'pcs',
        price: Number(product.unitPrice) || 0,
        quantity: Number(product.quantity) || 0,
        image: product.image || product.imageUrl || null,
        storageLocation: product.storageLocation,
        shelfName: product.shelfName,
        rowName: product.rowName,
        columnIndex: product.columnIndex,
        fullLocation: product.fullLocation,
        isVariant: product.isVariant || false
      });
      
      // Add to total quantity
      grouped[uniqueKey].quantity += Number(product.quantity) || 0;
    });

    // Now consolidate by variant (size/unit) - combining different locations
    Object.values(grouped).forEach(group => {
      const variantMap = {};
      
      // Ensure allLocations exists and is an array
      if (!group.allLocations || !Array.isArray(group.allLocations)) {
        console.warn('Group missing allLocations:', group);
        group.allLocations = [];
      }
      
      group.allLocations.forEach(location => {
        // Create key by size and unit to group same variants from different locations
        const variantKey = `${location.size || ''}_${location.unit || 'pcs'}`;
        
        if (!variantMap[variantKey]) {
          variantMap[variantKey] = {
            ...location,
            totalQuantity: location.quantity,
            locationCount: 1
          };
        } else {
          // Same variant exists in another location - just add to quantity count
          variantMap[variantKey].totalQuantity += location.quantity;
          variantMap[variantKey].locationCount += 1;
        }
      });
      
      group.variants = Object.values(variantMap);
      
      // Determine if product has actual variants (different sizes/units)
      group.hasVariants = group.variants.length > 1;
    });

    return Object.values(grouped);
  }, [products]);  // Filter Products (Memoized)
  const filteredProducts = useMemo(() => {
    let filtered = groupedProducts;
    
    // First filter by category if one is selected
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);

    }
    
    // Then filter by brand if one is selected
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);

    }
    
    // Then apply search query if exists
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query)
      );

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

    // If product has variants (different sizes/units), show variant selection
    if (productGroup.hasVariants && productGroup.variants.length > 1) {
        setQuantity(1);
        setSelectedProductForModal(productGroup);
        setActiveVariantIndex(0);
        setVariantModalOpen(true);
    } 
    // If only one variant, proceed directly to location selection or quick add
    else if (productGroup.variants.length === 1) {
        const variant = productGroup.variants[0];
        
        // Check if this variant exists in multiple locations
        const variantLocations = productGroup.allLocations?.filter(loc => 
          loc.size === variant.size && loc.unit === variant.unit
        ) || [];
        
        if (variantLocations.length > 1) {
          // Multiple locations - show location picker after quantity selection
          setPendingQuantity(1);
          setSelectedProductForModal(productGroup); // For location modal later
          setSelectedVariantForLocation(variant); // For location modal later
          setSelectedProductForQuantity({ // For quick quantity modal NOW
            ...productGroup,
            maxAvailableQty: variant.totalQuantity
          });
          setQuickQuantityModalOpen(true); // First ask quantity
        } else {
          // Single location - show quick quantity modal
          const cartQty = getCartItemQuantity(productGroup.id, variant.variantId);
          const availableQty = (variant.totalQuantity || variant.quantity) - cartQty;

          if (availableQty <= 0) {
              alert(`Maximum quantity already in cart for ${productGroup.name}`);
              return;
          }

          setSelectedProductForQuantity({
              ...productGroup,
              maxAvailableQty: availableQty
          });
          setQuickQuantityModalOpen(true);
        }
    } else {
        console.error('Unexpected state - no variants found');
    }
  }, [isProcessing, getCartItemQuantity]);

  const handleAddVariant = useCallback(() => {
    if (!selectedProductForModal?.variants?.[activeVariantIndex]) {
        console.error("Invalid variant selection");
        setVariantModalOpen(false);
        return;
    }

    const variant = selectedProductForModal.variants[activeVariantIndex];
    
    // Check if this variant exists in multiple locations
    const variantLocations = selectedProductForModal.allLocations.filter(loc => 
      loc.size === variant.size && loc.unit === variant.unit
    );
    
    // Close variant modal first
    setVariantModalOpen(false);
    
    if (variantLocations.length > 1) {
      // Multiple locations - show location picker
      setPendingQuantity(quantity);
      setSelectedVariantForLocation(variant);
      setLocationModalOpen(true);
    } else {
      // Single location - add directly
      const locationVariant = variantLocations[0];
      const cartQty = getCartItemQuantity(selectedProductForModal.id, locationVariant.variantId);
      const availableQty = locationVariant.quantity - cartQty;

      if (availableQty < quantity) {
          alert(`Cannot add ${quantity} items. Only ${availableQty} available.`);
          setVariantModalOpen(true); // Reopen modal
          return;
      }

      const displayName = locationVariant.size || locationVariant.unit 
          ? `${selectedProductForModal.name} (${locationVariant.size || ''} ${locationVariant.unit || ''})`.trim()
          : selectedProductForModal.name;

      addProduct({
          id: locationVariant.variantId,
          name: displayName,
          baseName: selectedProductForModal.name,
          price: locationVariant.price,
          qty: quantity,
          variantId: locationVariant.variantId,
          category: selectedProductForModal.category,
          baseProductId: locationVariant.baseProductId,
          storageLocation: locationVariant.storageLocation,
          shelfName: locationVariant.shelfName,
          rowName: locationVariant.rowName,
          columnIndex: locationVariant.columnIndex,
          fullLocation: locationVariant.fullLocation
      });

      setSelectedProductForModal(null);
      setActiveVariantIndex(0);
      setQuantity(1);
    }
  }, [selectedProductForModal, activeVariantIndex, quantity, addProduct, getCartItemQuantity]);

  // Handle location selection from LocationSelectionModal
  const handleSelectLocation = useCallback((locationData) => {
    if (!selectedProductForModal) {
      console.error("Invalid location selection - no product selected");
      return;
    }

    // Check if locationData is an array (multi-location) or single object
    if (Array.isArray(locationData)) {
      // Multi-location allocation
      
      locationData.forEach(locationVariant => {
        const displayName = locationVariant.size || locationVariant.unit 
          ? `${selectedProductForModal.name} (${locationVariant.size || ''} ${locationVariant.unit || ''})`.trim()
          : selectedProductForModal.name;

        addProduct({
          id: locationVariant.variantId,
          name: displayName,
          baseName: selectedProductForModal.name,
          price: locationVariant.price,
          qty: locationVariant.allocatedQuantity, // Use the allocated quantity for this location
          variantId: locationVariant.variantId,
          category: selectedProductForModal.category,
          baseProductId: locationVariant.baseProductId,
          storageLocation: locationVariant.storageLocation,
          shelfName: locationVariant.shelfName,
          rowName: locationVariant.rowName,
          columnIndex: locationVariant.columnIndex,
          fullLocation: locationVariant.fullLocation,
          isMultiLocationAllocation: true // Flag to indicate this is part of multi-location order
        });
      });
    } else {
      // Single location selection
      const locationVariant = locationData;
      const displayName = locationVariant.size || locationVariant.unit 
        ? `${selectedProductForModal.name} (${locationVariant.size || ''} ${locationVariant.unit || ''})`.trim()
        : selectedProductForModal.name;

      addProduct({
        id: locationVariant.variantId,
        name: displayName,
        baseName: selectedProductForModal.name,
        price: locationVariant.price,
        qty: pendingQuantity,
        variantId: locationVariant.variantId,
        category: selectedProductForModal.category,
        baseProductId: locationVariant.baseProductId,
        storageLocation: locationVariant.storageLocation,
        shelfName: locationVariant.shelfName,
        rowName: locationVariant.rowName,
        columnIndex: locationVariant.columnIndex,
        fullLocation: locationVariant.fullLocation
      });
    }

    // Reset all modals
    setLocationModalOpen(false);
    setSelectedProductForModal(null);
    setSelectedVariantForLocation(null);
    setPendingQuantity(1);
    setQuantity(1);
  }, [selectedProductForModal, pendingQuantity, addProduct]);

  // --- Sale Reset Logic ---
  const resetSaleState = useCallback(() => {
       setAddedProducts([]); // This line clears the cart
       setAmountPaid('');
       setPaymentMethod('Cash');
       setPaymentReference('');
       setCustomerDetails({ name: '', phone: '', address: '', email: '' });
       setCustomerDisplayName('Walk-in Customer');
       setSearchQuery('');
       setQuantity(1);
       setSelectedProductForModal(null);
       setVariantModalOpen(false);
       setActiveVariantIndex(0);
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

    } catch (error) {
      console.error('Error collecting analytics:', error);
    }
  }, []);

  // --- Transaction Logic ---
  const validateStockBeforeTransaction = async () => {
    const invalidItems = [];
    
    for (const item of addedProducts) {
        try {
            // Check if item has the necessary fields
            if (!item.storageLocation) {
                console.warn('Item missing storage location:', item);
                invalidItems.push(`${item.name} - Missing storage location information`);
                continue;
            }

            // Use the new nested structure path: Products/{storageLocation}/products/{productId}
            // For variants, variantId IS the product ID (variants are separate product documents)
            const productId = item.variantId || item.id;
            const productRef = doc(db, 'Products', item.storageLocation, 'products', productId);
            const productDoc = await getDoc(productRef);
            
            if (!productDoc.exists()) {
                invalidItems.push(`${item.name} - Product not found in inventory`);
                console.warn(`Product not found at: Products/${item.storageLocation}/products/${productId}`);
                continue;
            }

            const productData = productDoc.data();
            
            // In flat structure, each product (including variants) has its own quantity field
            const currentQuantity = Number(productData.quantity) || 0;
            
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
    validateStockBeforeTransaction().catch(error => {
        alert(error.message);
        return;
    });
    setIsProcessing(true);

    try {
        const { formattedDate, formattedTime } = getFormattedDateTime();
        const receiptNumber = `GS-${Date.now()}`;

        // Calculate change
        const paidAmount = Number(amountPaid) || 0;
        const changeAmount = paidAmount > 0 ? paidAmount - total : 0;

        const transactionData = {
          transactionId: receiptNumber,
          customerId: `CUST-${Date.now()}`,
          customerInfo: cleanFirebaseData(customerDetails),
          customerName: customerDetails?.name || customerDisplayName || 'Walk-in Customer',
          items: addedProducts.map(item => cleanFirebaseData({
            productId: item.baseProductId || item.id,
            variantId: item.variantId || item.id,
            productName: item.baseName || item.name,
            variantName: item.name,
            name: item.name, // For receipt modal
            quantity: item.qty,
            price: item.price, // For receipt modal
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
          subTotal: subTotal,
          tax: tax,
          total: total,
          amountPaid: paidAmount,
          change: changeAmount,
          paymentMethod,
          paymentReference: paymentReference || null,
          status: 'completed',
          releaseStatus: 'pending_release', // Add release status for inventory tracking
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || 'unknown',
          saleDate: formattedDate,
          saleTime: formattedTime,
          cashierName: currentUser?.name  || currentUser?.email || "Cashier",
        };

        // Save transaction to Firestore
        // NOTE: Inventory deduction will happen in Release Management when items are actually released
        const transactionRef = doc(db, 'posTransactions', receiptNumber);
        await setDoc(transactionRef, transactionData);

        // Generate sale notification for inventory manager
        try {
          await generateSaleNotification(transactionData, currentUser); 
        } catch (notificationError) {
          console.error('Failed to generate sale notification:', notificationError);
          // Don't fail the transaction if notification fails
        }

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
          // Show receipt modal for preview before printing
          setReceiptTransaction(transactionData);
          setShowReceiptModal(true);
        } catch (printError) {
          console.error('Error preparing receipt:', printError);
          alert('Receipt preparation failed, but transaction was completed successfully!');
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
  }, [addedProducts, products, total, subTotal, tax, amountPaid, paymentMethod, customerDetails, customerDisplayName, resetSaleState, currentUser, collectAnalyticsData]);

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
              Invoice
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
                  Create a new invoice transaction
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
          {/* Header Section - Fixed at top */}
          <div className="flex-shrink-0 pt-[73px] border-b border-gray-200">
            <div className="p-4 space-y-4">
              {/* Quotation Lookup Section - Compact */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Load from Quotation</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quotationNumber}
                    onChange={(e) => setQuotationNumber(e.target.value.toUpperCase())}
                    placeholder="GS-20251006-XXXX"
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loadingQuotation || isProcessing}
                    onKeyPress={(e) => e.key === 'Enter' && handleLoadQuotation()}
                  />
                  <button
                    onClick={handleLoadQuotation}
                    disabled={loadingQuotation || isProcessing || !quotationNumber.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingQuotation ? '...' : 'Load'}
                  </button>
                </div>
                {addedProducts.some(p => p.fromQuotation) && (
                  <div className="mt-2 text-xs text-blue-700">
                    📄 <span className="font-semibold">{addedProducts[0].fromQuotation}</span>
                  </div>
                )}
              </div>

              {/* Customer Info - Compact */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-gray-600">Customer:</span>
                  <span className="text-xs text-gray-800 font-medium">{customerDisplayName || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">Date:</span>
                  <span className="text-xs text-gray-800">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Product List - Takes remaining space */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Added Products</h3>
                <span className="text-xs text-gray-500">
                  {addedProducts.length} {addedProducts.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              {addedProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="text-sm">No products added yet</p>
                  <p className="text-xs mt-1">Select products from the left</p>
                </div>
              ) : (
                <ProductList
                  cartItems={addedProducts.map((item, index) => ({
                      ...item,
                      originalIndex: index,
                      formattedPrice: formatCurrency(item.price),
                      formattedTotal: formatCurrency(item.price * item.qty)
                  }))}
                  onRemoveItem={handleRemoveProduct}
                  onUpdateQuantity={handleUpdateCartQuantity}
                  isProcessing={isProcessing}
                />
              )}
            </div>
          </div>

          {/* Order Summary - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white">
            <OrderSummary
              subTotal={subTotal}
              tax={tax}
              total={total}
              itemCount={addedProducts.length}
            />
          </div>

          {/* Payment Section - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
            <PaymentSection
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              paymentReference={paymentReference}
              setPaymentReference={setPaymentReference}
              total={total}
              formattedTotal={formatCurrency(total)}
              formattedChange={formatCurrency(Number(amountPaid) - total)}
              onPrintAndSave={handlePrintAndSave}
              onClearCart={resetSaleState}
              isProcessing={isProcessing}
              disabled={shouldDisableInteractions || addedProducts.length === 0}
              hasProducts={addedProducts.length > 0}
              checkoutButtonText="Complete Sale"
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <div className="relative z-50">
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
            maxQuantity={selectedProductForQuantity.maxAvailableQty || selectedProductForQuantity.variants[0].totalQuantity}
            onClose={() => {
              setQuickQuantityModalOpen(false);
              setSelectedProductForQuantity(null);
              setSelectedVariantForLocation(null);
              setPendingQuantity(1);
            }}
            onAdd={(quantity) => {
              const variant = selectedProductForQuantity.variants[0];
              
              // Check if this variant has multiple locations
              const variantLocations = selectedProductForQuantity.allLocations?.filter(loc => 
                loc.size === variant.size && loc.unit === variant.unit
              ) || [];
              
              if (variantLocations.length > 1) {
                // Close quick quantity modal and open location modal
                setQuickQuantityModalOpen(false);
                setPendingQuantity(quantity);
                setSelectedProductForModal(selectedProductForQuantity);
                setSelectedVariantForLocation(variant);
                setLocationModalOpen(true);
              } else {
                // Single location - add directly
                const locationVariant = variantLocations[0] || variant;
                const cartQty = getCartItemQuantity(selectedProductForQuantity.id, locationVariant.variantId);
                
                if (cartQty + quantity > locationVariant.quantity) {
                  alert(`Cannot add ${quantity} items. Only ${locationVariant.quantity - cartQty} available.`);
                  return;
                }

                const displayName = locationVariant.size || locationVariant.unit 
                  ? `${selectedProductForQuantity.name} (${locationVariant.size || ''} ${locationVariant.unit || ''})`.trim()
                  : selectedProductForQuantity.name;

                addProduct({
                  id: locationVariant.variantId,
                  name: displayName,
                  baseName: selectedProductForQuantity.name,
                  price: locationVariant.price,
                  qty: quantity,
                  variantId: locationVariant.variantId,
                  unit: locationVariant.unit,
                  category: selectedProductForQuantity.category,
                  baseProductId: locationVariant.baseProductId,
                  storageLocation: locationVariant.storageLocation,
                  shelfName: locationVariant.shelfName,
                  rowName: locationVariant.rowName,
                  columnIndex: locationVariant.columnIndex,
                  fullLocation: locationVariant.fullLocation
                });
                
                setQuickQuantityModalOpen(false);
                setSelectedProductForQuantity(null);
              }
            }}
          />
        )}

        {locationModalOpen && selectedProductForModal && selectedVariantForLocation && (
          <LocationSelectionModal
            product={selectedProductForModal}
            selectedVariant={selectedVariantForLocation}
            qty={pendingQuantity}
            onSelectLocation={handleSelectLocation}
            onClose={() => {
              setLocationModalOpen(false);
              setSelectedProductForModal(null);
              setSelectedVariantForLocation(null);
              setPendingQuantity(1);
            }}
          />
        )}

        {showReceiptModal && receiptTransaction && (
          <ReceiptModal
            transaction={receiptTransaction}
            onClose={() => {
              setShowReceiptModal(false);
              setReceiptTransaction(null);
              resetSaleState();
            }}
          />
        )}
      </div>
    </div>
  );
} // End Pos_NewSale component
