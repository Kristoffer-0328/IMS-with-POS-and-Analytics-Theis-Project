import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Firebase and Services
import { useServices } from '../../../services/firebase/ProductServices';
import {
  getFirestore,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import app from  '../../../FirebaseConfig';
import { useAuth } from '../../auth/services/FirebaseAuth';

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
import BulkOrderChoiceModal from '../components/Modals/BulkOrderChoices';
import BulkOrderDetailsModal from '../components/Modals/BulkOrderDetailsModal';
import VariantSelectionModal from '../components/Modals/VariantSelectionModal';
import QuickQuantityModal from '../components/QuickQuantityModal';
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

// First, let's create a simple CategorySelector component at the top of Pos_NewSale.jsx
const CategorySelector = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 p-4 min-w-max">
        <button
          className={`px-4 py-2 rounded-lg transition-colors ${
            !selectedCategory 
              ? 'bg-orange-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          onClick={() => onSelectCategory(null)}
        >
          All Categories
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === category 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            onClick={() => onSelectCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
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

  // Product State
  const { listenToProducts } = useServices();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Variant Modal State
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Customer State
  const [showBulkOrderPopup, setShowBulkOrderPopup] = useState(false);
  const [isBulkOrder, setIsBulkOrder] = useState(null); // null, true, false
  const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', address: '' });
  const [walkInCounter, setWalkInCounter] = useState(0);
  const [customerIdentifier, setCustomerIdentifier] = useState('Walk-in Customer');
  const [customerDisplayName, setCustomerDisplayName] = useState('Walk-in Customer');

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

useEffect(() => {
  // Show bulk order choice modal on component mount
  setShowBulkOrderPopup(true);
  setIsBulkOrder(null);
}, []); // Empty dependency array means this runs once on mount

// Modal visibility debugging
useEffect(() => {
  console.log('Modal State:', {
    showBulkOrderPopup,
    isBulkOrder,
    isModalVisible: showBulkOrderPopup && isBulkOrder === null
  });
}, [showBulkOrderPopup, isBulkOrder]);

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
                    image: variant.image || product.image || null
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


  // --- Product Selection Logic ---
  const handleAddProduct = useCallback((productGroup) => {
    if (!productGroup || !productGroup.variants || isProcessing || showBulkOrderPopup) {
        console.warn("Add product blocked:", { productGroup, isProcessing, showBulkOrderPopup });
        return;
    }

    // Check if product has multiple unit options
    const uniqueUnits = new Set(productGroup.variants.map(v => v.unit));
    
    if (uniqueUnits.size > 1) {
        // Show unit conversion modal if multiple units available
        setSelectedProductForUnitModal(productGroup);
        setUnitConversionModalOpen(true);
    } else if (productGroup.hasVariants && productGroup.variants.length > 1) {
        // Show variant selection modal if multiple variants but same unit
        setQuantity(1);
        setSelectedProductForModal(productGroup);
        setActiveVariantIndex(0);
        setVariantModalOpen(true);
    } else if (productGroup.variants.length === 1) {
        const variant = productGroup.variants[0];
        if (variant.quantity <= 0) {
            alert(`${productGroup.name} is out of stock.`);
            return;
        }

        // Show quick quantity modal for single variant products
        setSelectedProductForQuantity(productGroup);
        setQuickQuantityModalOpen(true);
    }
}, [addProduct, isProcessing, showBulkOrderPopup]);

  const handleAddVariant = useCallback(() => {
    if (!selectedProductForModal?.variants?.[activeVariantIndex]) {
        console.error("Invalid variant selection");
        setVariantModalOpen(false);
        return;
    }

    const variant = selectedProductForModal.variants[activeVariantIndex];
    if (variant.quantity < quantity) {
        alert(`Insufficient stock. Only ${variant.quantity} available.`);
        return;
    }

    // Create display name with size/unit
    const displayName = variant.size || variant.unit 
        ? `${selectedProductForModal.name} (${variant.size || ''} ${variant.unit || ''})`.trim()
        : selectedProductForModal.name;

    // Log the variant data for debugging
    console.log('Adding variant:', {
        variant,
        baseProductId: variant.baseProductId,
        selectedProduct: selectedProductForModal
    });

    addProduct({
        id: variant.variantId,
        name: displayName,
        baseName: selectedProductForModal.name,
        price: variant.price,
        qty: quantity,
        variantId: variant.variantId,
        category: selectedProductForModal.category,
        baseProductId: variant.baseProductId // Use variant's baseProductId directly
    });

    setVariantModalOpen(false);
    setSelectedProductForModal(null);
    setActiveVariantIndex(0);
    setQuantity(1);
}, [selectedProductForModal, activeVariantIndex, quantity, addProduct]);


  // --- Customer Logic ---
  const handleBulkOrderChoice = useCallback((isBulk) => {
    setIsBulkOrder(isBulk);
    if (!isBulk) { // Walk-in selected
        const nextCounter = walkInCounter + 1;
        setWalkInCounter(nextCounter);
        const newIdentifier = `WalkIn-${String(nextCounter).padStart(3, '0')}`;
        setCustomerIdentifier(newIdentifier);
        setCustomerDisplayName('Walk-in Customer');
        setCustomerDetails({ name: '', phone: '', address: '' }); // Clear just in case
        setShowBulkOrderPopup(false); // Close choice modal immediately
    } else { // Bulk order selected
        setCustomerDisplayName(''); // Clear display name until details entered
        setCustomerIdentifier('');  // Clear identifier until details entered
        setCustomerDetails({ name: '', phone: '', address: '' }); // Ensure fields are empty
        // setShowBulkOrderPopup remains true to allow details modal to render
    }
  }, [walkInCounter]); // Dependency

  const handleCustomerDetailsSubmit = useCallback((e) => {
    e.preventDefault(); // Prevent default form submission
    if (!customerDetails.name.trim()) { // Check trimmed name
        alert("Please enter a customer name.");
        return;
    }
    // Generate a unique-ish identifier for the bulk customer
    const identifier = customerDetails.name.trim().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-5); // Use more of timestamp
    setCustomerIdentifier(identifier);
    setCustomerDisplayName(customerDetails.name.trim()); // Use trimmed name
    setShowBulkOrderPopup(false); // Close details modal upon successful submission
  }, [customerDetails]); // Dependency


   // --- Sale Reset Logic ---
   const resetSaleState = useCallback(() => {
       setAddedProducts([]); // This line clears the cart
       setAmountPaid('');
       setPaymentMethod('Cash');
       setIsBulkOrder(null);
       setCustomerDetails({ name: '', phone: '', address: '' });
       setCustomerIdentifier('Walk-in Customer');
       setCustomerDisplayName('Walk-in Customer');
       setSearchQuery('');
       setQuantity(1);
       setSelectedProductForModal(null);
       setVariantModalOpen(false);
       setActiveVariantIndex(0);
       setShowBulkOrderPopup(true);
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


  // --- Transaction Logic ---
  const validateStockBeforeTransaction = async () => {
    const invalidItems = [];
    
    for (const item of addedProducts) {
        try {
            const productRef = doc(db, 'Products', item.category, 'Items', item.baseProductId);
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

    setIsProcessing(true);

    try {
        await validateStockBeforeTransaction();
        const { formattedDate, formattedTime } = getFormattedDateTime();
        const receiptNumber = `GS-${Date.now()}`;

        await runTransaction(db, async (transaction) => {
            // 1. First, read all required documents
            const productReads = [];
            const restockChecks = [];

            // Read all product documents first
            for (const item of addedProducts) {
                // Create document references
                const productRef = doc(db, 'Products', item.category, 'Items', item.baseProductId);
                
                // Get document snapshots using transaction.get()
                const productDoc = await transaction.get(productRef);
                
                productReads.push({
                    item,
                    ref: productRef,
                    doc: productDoc
                });
            }

            // 2. Process reads and prepare writes
            const productUpdates = [];
            const notificationWrites = [];
            const restockWrites = [];

            for (const { item, ref, doc: productDoc } of productReads) {
                if (!productDoc.exists()) {
                    throw new Error(`Product not found: ${item.name}`);
                }

                const productData = productDoc.data();
                const variantIndex = parseInt(item.variantId.split('-').pop(), 10);
                
                if (!productData.variants?.[variantIndex]) {
                    throw new Error(`Variant not found for ${item.name}`);
                }

                const currentVariant = productData.variants[variantIndex];
                const currentQuantity = Number(currentVariant.quantity) || 0;
                
                if (currentQuantity < item.qty) {
                    throw new Error(`Insufficient stock for ${item.name}: available ${currentQuantity}`);
                }

                const newVariants = productData.variants.map((v, idx) => 
                    idx === variantIndex 
                        ? { ...v, quantity: currentQuantity - item.qty }
                        : v
                );

                const newTotalQuantity = newVariants.reduce((sum, variant) => 
                    sum + (Number(variant.quantity) || 0), 0
                );

                productUpdates.push({
                    ref,
                    data: {
                        quantity: newTotalQuantity,
                        variants: newVariants,
                        lastUpdated: new Date().toISOString()
                    }
                });

                // Check restock levels
                const restockLevel = Number(productData.restockLevel || 0);
                const maximumStockLevel = Number(productData.maximumStockLevel || 0);
                const newQuantity = currentQuantity - Number(item.qty);

                // Debug log
                console.log('Stock Check:', {
                    productName: item.name,
                    currentQuantity,
                    newQuantity,
                    restockLevel,
                    maximumStockLevel,
                    shouldNotify: newQuantity <= restockLevel
                });

                if (restockLevel > 0 && newQuantity <= restockLevel) {
                    const timestamp = Date.now();
                    // Create document references using doc()
                    const notificationRef = doc(db, 'Notifications', `Notify-${item.category}-${item.baseProductId}-${timestamp}`);
                    const restockRequestRef = doc(db, 'RestockRequests', `Restock-${item.category}-${item.baseProductId}-${timestamp}`);

                    const notificationData = {
                        message: `Low stock alert for ${item.name}`,
                        productId: item.baseProductId,
                        variantId: item.variantId,
                        currentQuantity: newQuantity,
                        restockLevel: restockLevel,
                        maximumStockLevel: maximumStockLevel,
                        category: item.category,
                        productName: item.name,
                        status: 'pending',
                        timestamp: serverTimestamp(),
                        type: 'restock_alert',
                        createdAt: new Date().toISOString()
                    };

                    notificationWrites.push({
                        ref: notificationRef,
                        data: notificationData
                    });

                    restockWrites.push({
                        ref: restockRequestRef,
                        data: {
                            ...notificationData,
                            requestedQuantity: maximumStockLevel - newQuantity,
                            type: 'restock_request'
                        }
                    });

                    // Debug log
                    console.log('Created Restock Request:', {
                        productName: item.name,
                        currentQuantity: newQuantity,
                        restockLevel,
                        maximumStockLevel,
                        requestedQuantity: maximumStockLevel - newQuantity
                    });
                }
            }

            // 3. Create transaction record
            const transactionRef = doc(db, 'Transactions', receiptNumber);
            const transactionData = {
                id: receiptNumber,
                timestamp: serverTimestamp(),
                date: formattedDate,
                time: formattedTime,
                items: addedProducts.map(item => ({
                    name: item.name || '',
                    category: item.category || '',
                    baseProductId: item.baseProductId || '',
                    variantId: item.variantId || '',
                    price: Number(item.price) || 0,
                    quantity: Number(item.qty) || 0,
                    total: (Number(item.price) || 0) * (Number(item.qty) || 0),
                    // Add formatted values for display
                    formattedPrice: formatCurrency(Number(item.price) || 0),
                    formattedTotal: formatCurrency((Number(item.price) || 0) * (Number(item.qty) || 0))
                })),
                subTotal: Number(subTotal) || 0,
                tax: Number(tax) || 0,
                total: Number(total) || 0,
                amountPaid: Number(amountPaid) || 0,
                change: (Number(amountPaid) || 0) - (Number(total) || 0),
                // Add formatted values for display
                formattedSubTotal: formatCurrency(Number(subTotal) || 0),
                formattedTax: formatCurrency(Number(tax) || 0),
                formattedTotal: formatCurrency(Number(total) || 0),
                formattedAmountPaid: formatCurrency(Number(amountPaid) || 0),
                formattedChange: formatCurrency((Number(amountPaid) || 0) - (Number(total) || 0)),
                customerName: customerDisplayName || 'Walk-in Customer',
                customerDetails: isBulkOrder ? {...customerDetails} : null,
                paymentMethod: paymentMethod || 'Cash',
                cashierId: currentUser?.uid || 'unknown',
                cashierName: currentUser?.name || 'Unknown Cashier',
                isBulkOrder: Boolean(isBulkOrder)
            };

            // 4. Perform all writes
            await transaction.set(transactionRef, transactionData);
            
            for (const { ref, data } of productUpdates) {
                await transaction.update(ref, data);
            }

            for (const { ref, data } of notificationWrites) {
                await transaction.set(ref, data);
            }

            for (const { ref, data } of restockWrites) {
                await transaction.set(ref, data);
            }
        });

        await printReceiptContent({
            receiptNumber,
            date: formattedDate,
            time: formattedTime,
            items: addedProducts.map(item => ({
                name: item.name,
                quantity: item.qty,
                price: Number(item.price),
                total: Number(item.price * item.qty)
            })),
            subTotal: Number(subTotal),
            tax: Number(tax),
            total: Number(total),
            amountPaid: Number(amountPaid),
            change: Number(amountPaid) - Number(total),
            customerName: customerDisplayName,
            cashierName: currentUser?.name || 'Unknown Cashier'
        });

        resetSaleState(); // This should clear everything including the cart
        alert("Transaction completed successfully!");

    } catch (error) {
        console.error("Transaction failed:", error);
        alert(error.message);
    } finally {
        setIsProcessing(false);
    }
}, [addedProducts, products, total, subTotal, tax, amountPaid, paymentMethod, customerDetails, customerDisplayName, isBulkOrder, resetSaleState, currentUser]);


  // --- UI ---
  const shouldDisableInteractions = isProcessing || (showBulkOrderPopup && isBulkOrder === null) || (showBulkOrderPopup && isBulkOrder === true);

  return (
    <div className="flex flex-col w-full max-w-[1920px] mx-auto bg-gray-50 min-h-screen">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-orange-200 to-amber-100 border-b border-orange-200 sticky top-0 z-30">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  New Sale
                  {isProcessing && (
                    <div className="inline-block w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </h2>
                <div className="text-sm text-gray-700">
                  Create a new sales transaction
                </div>
              </div>
              <div className="h-8 w-px bg-orange-200 hidden md:block" />
              <div className="clock-display bg-white/90 backdrop-blur px-4 py-2 rounded-lg font-mono text-gray-700 hidden md:block shadow-sm border border-orange-200">
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
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-orange-200">
                <span className="text-orange-600 font-bold">
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
        {/* Left Side: Product Selection */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200">
          <div className="sticky top-[73px] bg-white z-20 border-b border-gray-200">
            <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-orange-100 to-amber-50 border-b border-orange-200">
              <div className="relative">
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  disabled={shouldDisableInteractions}
                  placeholder="Search products by name, category, or brand..."
                  className="bg-white shadow-sm border-orange-200"
                />
              </div>
              <div className="mt-4">
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

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <ProductGrid
              products={filteredProducts}
              onAddProduct={handleAddProduct}
              loading={loadingProducts}
              disabled={shouldDisableInteractions}
            />
          </div>
        </div>

        {/* Right Side: Added Products & Payment */}
        <div className="w-[480px] flex flex-col bg-gradient-to-br from-white to-orange-100">
          <div className="p-4 sm:p-6 border-b border-orange-200 bg-gradient-to-r from-orange-200 to-amber-100">
            <CustomerInfo
              customerDisplayName={customerDisplayName}
              isBulkOrder={isBulkOrder}
              customerDetails={customerDetails}
              formattedDate={currentDateTime.formattedDate}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <ProductList
                cartItems={addedProducts.map(item => ({
                  ...item,
                  formattedPrice: formatCurrency(item.price),
                  formattedTotal: formatCurrency(item.price * item.qty)
                }))}
                onRemoveItem={handleRemoveProduct}
                isProcessing={isProcessing}
              />
            </div>

            <div className="border-t border-orange-200">
              <div className="p-4 sm:p-6 bg-gradient-to-r from-orange-100 to-amber-50">
                <OrderSummary
                  subTotal={subTotal}
                  tax={tax}
                  total={total}
                />
              </div>

              <div className="p-4 sm:p-6 bg-gradient-to-b from-orange-100 to-white border-t border-orange-200">
                <PaymentSection
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  amountPaid={amountPaid}
                  setAmountPaid={setAmountPaid}
                  total={total}
                  formattedTotal={formatCurrency(total)}
                  formattedChange={formatCurrency(Number(amountPaid) - total)}
                  isProcessing={isProcessing}
                  hasProducts={addedProducts.length > 0}
                  onPrintAndSave={handlePrintAndSave}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <div className="relative z-50">
        {showBulkOrderPopup && isBulkOrder === null && (
          <BulkOrderChoiceModal onChoice={handleBulkOrderChoice} />
        )}
        {showBulkOrderPopup && isBulkOrder === true && (
          <BulkOrderDetailsModal
            customerDetails={customerDetails}
            setCustomerDetails={setCustomerDetails}
            onSubmit={handleCustomerDetailsSubmit}
            onClose={() => {
              setShowBulkOrderPopup(false);
              resetSaleState();
            }}
          />
        )}
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
                variantId: productWithUnit.variantId,
                unit: productWithUnit.unit,
                category: productWithUnit.category,
                baseProductId: productWithUnit.id
              });
              setUnitConversionModalOpen(false);
              setSelectedProductForUnitModal(null);
            }}
          />
        )}
        {quickQuantityModalOpen && selectedProductForQuantity && (
          <QuickQuantityModal
            product={selectedProductForQuantity}
            maxQuantity={selectedProductForQuantity.variants[0].quantity}
            onClose={() => {
              setQuickQuantityModalOpen(false);
              setSelectedProductForQuantity(null);
            }}
            onAdd={(quantity) => {
              const variant = selectedProductForQuantity.variants[0];
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
                baseProductId: variant.baseProductId
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