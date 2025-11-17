import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import { AnalyticsService } from '../../../services/firebase/AnalyticsService';
import { listenToMergedProducts } from '../../../services/firebase/ProductServices';
import { applyProductFilters } from '../../../models/MergedProduct';

// Import new POS Services
import { 
  searchPOSProducts, 
  getProductVariants,
  checkCartAvailability 
} from '../services/POSProductServices';
import { processPOSSale } from '../services/POSTransactionService';

// Import Components
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';
import ProductList from '../components/Cart';
import OrderSummary from '../components/OrderSummary';
import PaymentSection from '../components/PaymentSection';
import ProductFilters from '../components/ProductFilters';
import VariantSelectionModal from '../components/Modals/VariantSelectionModal';
import ReceiptModal from '../components/Modals/ReceiptModal';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';
import ErrorModal from '../../../components/modals/ErrorModal';

const db = getFirestore(app);

// Helper function to format currency
const formatCurrency = (number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

// Helper function to format Date/Time
const getFormattedDateTime = () => {
  const now = new Date();
  
  const formattedDate = now.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/,/g, '').toUpperCase();

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return {
    formattedDate,
    formattedTime: { hours, minutes, seconds }
  };
};

export default function Pos_NewSale_V2() {
  // --- User Authentication ---
  const { currentUser, loading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
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

  // Don't render if user is not authenticated
  if (!currentUser) {
    return null;
  }

  // --- State Management ---
  const [currentDateTime, setCurrentDateTime] = useState(() => getFormattedDateTime());
  const [addedProducts, setAddedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  
  // Payment State
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [isProcessing, setIsProcessing] = useState(false);

  // Product State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Modal State
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState(null);
  // Success / feedback modal for product added
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalData, setAddModalData] = useState(null);

  // Customer State
  const [customerDetails, setCustomerDetails] = useState({ 
    name: 'Walk-in Customer', 
    phone: '', 
    address: '',
    email: '' 
  });
  const [customerDisplayName, setCustomerDisplayName] = useState('Walk-in Customer');

  // Add Load Quotation State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [loadingQuotation, setLoadingQuotation] = useState(false);

  // --- Clock Update ---
  useEffect(() => {
    const updateClock = () => {
      setCurrentDateTime(getFormattedDateTime());
    };
    
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Fetch Products from Master + Variants + Suppliers Collections ---
  useEffect(() => {
    setLoadingProducts(true);
    
    console.log('🔄 Setting up merged product listener with filters:', {
      searchQuery,
      selectedCategory,
      selectedBrand
    });

    // Use the centralized merging function from ProductServices
    const unsubscribe = listenToMergedProducts((mergedProducts) => {
      console.log(`📦 Received ${mergedProducts.length} merged products from service`);
      
      // Apply filters using the model's filter functions
      const filtered = applyProductFilters(mergedProducts, {
        searchQuery,
        category: selectedCategory,
        brand: selectedBrand
      });
      
      console.log(`✅ After filtering: ${filtered.length} products`);
      
      setProducts(filtered);
      setLoadingProducts(false);
    });
    
    // Cleanup listener on unmount
    return () => {
      console.log('🧹 Cleaning up merged product listener');
      unsubscribe();
    };
  }, [searchQuery, selectedCategory, selectedBrand]);

  // Products are merged from Master + Variants collections
  const filteredProducts = products;

  // --- Cart Management ---
  const addProductToCart = useCallback((cartItem) => {

    
    setAddedProducts(prev => {
      // Check if variant already in cart
      const existing = prev.find(item => item.variantId === cartItem.variantId);
      
      if (existing) {
        // Update quantity
        return prev.map(item =>
          item.variantId === cartItem.variantId
            ? { ...item, qty: item.qty + cartItem.qty }
            : item
        );
      }
      
      // Add new item
      return [...prev, cartItem];
    });
  }, []);

  const handleRemoveProduct = useCallback((indexToRemove) => {
    setAddedProducts(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  // --- Product Selection Logic ---
  const handleAddProduct = useCallback(async (wrappedProduct) => {
    if (isProcessing) return;



    if (!wrappedProduct || !wrappedProduct.variants || wrappedProduct.variants.length === 0) {
      console.warn("Invalid product:", wrappedProduct);
      alert('This product is not available.');
      return;
    }

    // Always show VariantSelectionModal for all products (single or multiple variants)
    setQuantity(1);
    setSelectedProductForModal(wrappedProduct);
    setActiveVariantIndex(0);
    setVariantModalOpen(true);
  }, [isProcessing]);

  const handleAddVariant = useCallback(async (selectedQuantity) => {
    if (!selectedProductForModal) return;

    const variant = selectedProductForModal.variants[activeVariantIndex];


    // Check if adding this quantity would exceed available stock
    const existingQuantityForVariant = addedProducts
      .filter(item => item.variantId === variant.variantId)
      .reduce((total, item) => total + item.qty, 0);
    
    const totalQuantityAfterAdd = existingQuantityForVariant + selectedQuantity;
    const availableStock = variant.totalQuantity || variant.quantity || 0;
    
    if (totalQuantityAfterAdd > availableStock) {
      // Show error modal - insufficient stock
      setAddModalData({
        title: 'Insufficient Stock',
        message: `Cannot add ${selectedQuantity} ${variant.baseUnit || variant.unit || 'pcs'} of ${selectedProductForModal.name}.`,
        type: 'error',
        details: `Available stock: ${availableStock} ${variant.baseUnit || variant.unit || 'pcs'}\nAlready in cart: ${existingQuantityForVariant} ${variant.baseUnit || variant.unit || 'pcs'}`
      });
      setShowAddModal(true);
      return; // Don't add to cart
    }

    // Compute effective unit price
    let effectiveUnitPrice = variant.price || variant.unitPrice || 0;
    
    // Apply sale price if variant is on sale
    if (variant.onSale && variant.salePrice) {
      effectiveUnitPrice = variant.salePrice;
    }
    
    // If variant represents a bundle, convert price to per-piece for cart consistency
    if (variant.isBundle && variant.piecesPerBundle) {
      const pieces = Number(variant.piecesPerBundle) || 1;
      effectiveUnitPrice = effectiveUnitPrice / pieces;
    }

    // Add to cart with proper structure (quantity is in pieces)
    const cartItem = {
      variantId: variant.variantId,
      productId: selectedProductForModal.id,
      name: `${selectedProductForModal.name}${variant.size ? ` (${variant.size} ${variant.unit || ''})`.trim() : ''}`,
      baseName: selectedProductForModal.name,
      variantName: variant.variantName,
      price: effectiveUnitPrice,
      qty: selectedQuantity,
      unit: variant.unit || variant.baseUnit || 'pcs',
      category: selectedProductForModal.category,
      image: variant.image || selectedProductForModal.image,
      // Include variant details for display
      size: variant.size,
      brand: selectedProductForModal.brand,
      // Bundle information
      isBundle: variant.isBundle,
      piecesPerBundle: variant.piecesPerBundle,
      bundlePackagingType: variant.bundlePackagingType,
      bundlePrice: variant.unitPrice || variant.price,
      // Sale/Discount information
      onSale: variant.onSale || false,
      originalPrice: variant.originalPrice || (variant.unitPrice || variant.price || 0),
      discountPercentage: variant.discountPercentage || 0
    };

    addProductToCart(cartItem);

    // Close modal
    setVariantModalOpen(false);
    setSelectedProductForModal(null);
    setActiveVariantIndex(0);
    setQuantity(1);

    // Open success modal feedback
    setAddModalData({
      title: 'Product Added',
      message: `Added ${cartItem.name} x${selectedQuantity} to cart.`,
      type: 'success',
      details: ''
    });
    setShowAddModal(true);
  }, [selectedProductForModal, activeVariantIndex, addProductToCart, addedProducts]);

  // --- Calculate Totals ---
  const { subTotal, tax, total, discountAmount, finalTotal } = useMemo(() => {
    const subTotal = addedProducts.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subTotal * 0.12; // 12% VAT
    
    let discountAmount = 0;
    if (discount) {
      const discountValue = Number(discount) || 0;
      if (discountType === 'percentage') {
        discountAmount = (subTotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
    }
    
    const total = subTotal + tax;
    const finalTotal = total - discountAmount;
    
    return { subTotal, tax, total, discountAmount, finalTotal };
  }, [addedProducts, discount, discountType]);

  // --- Analytics Data Collection ---
  const collectAnalyticsData = useCallback((transactionData) => {
    try {
      const analyticsData = {
        transactionId: transactionData.transactionId,
        timestamp: new Date(),
        totalAmount: transactionData.total,
        itemCount: transactionData.items.length,
        paymentMethod: transactionData.paymentMethod,
        categories: [...new Set(transactionData.items.map(item => item.category))],
        discount: transactionData.discount || 0,
        cashier: currentUser?.name || currentUser?.email || 'Unknown'
      };

      AnalyticsService.recordSale(analyticsData);``

    } catch (error) {
      console.error('Error collecting analytics:', error);
    }
  }, [currentUser]);

  // --- ROP/EOQ Helpers ---
  const computeROP = useCallback((variantData) => {
    const safetyStock = Number(variantData?.safetyStock ?? variantData?.minSafetyStock ?? 0) || 0;
    const leadTimeDays = Number(variantData?.leadTimeDays ?? 3) || 3;
    const dailyDemand = Number(variantData?.avgDailySales ?? variantData?.dailyDemand ?? 0) || 0;
    const ropFromField = Number(variantData?.rop ?? variantData?.reorderPoint);
    if (!Number.isNaN(ropFromField) && ropFromField > 0) return Math.ceil(ropFromField);
    return Math.max(0, Math.ceil(dailyDemand * leadTimeDays + safetyStock));
  }, []);

  const computeEOQ = useCallback((variantData) => {
    const eoqField = Number(variantData?.eoq ?? variantData?.EOQ);
    if (!Number.isNaN(eoqField) && eoqField > 0) return Math.ceil(eoqField);
    // Try to compute EOQ if data present: sqrt((2DS)/H)
    const annualDemand = Number(variantData?.annualDemand ?? variantData?.demandAnnual);
    const orderCost = Number(variantData?.orderCost ?? variantData?.setupCost);
    const holdingCost = Number(variantData?.holdingCostPerUnit ?? variantData?.holdingCost);
    if (
      [annualDemand, orderCost, holdingCost].every((v) => typeof v === 'number' && !Number.isNaN(v) && v > 0)
    ) {
      const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCost);
      return Math.max(1, Math.ceil(eoq));
    }
    return 0;
  }, []);

  const classifyPriority = useCallback((newQty, rop) => {
    if (newQty <= 0) return 'critical';
    if (newQty <= Math.max(1, Math.floor(rop * 0.5))) return 'critical';
    if (newQty <= rop) return 'urgent';
    return 'normal';
  }, []);

  // Create/ensure Restocking Requests after sale if stock dips below ROP
  const ensureRestockingRequests = useCallback(async (stockMovements) => {
    try {
      console.log('🔔 ensureRestockingRequests called with:', stockMovements);
      if (!stockMovements || stockMovements.length === 0) return;
      for (const mv of stockMovements) {
        const variantId = mv.variantId;
        const newQty = Number(mv.newQty ?? 0);
        console.log('➡️ Processing variant:', variantId, 'newQty:', newQty);
        if (!variantId) continue;

        const variantRef = doc(db, 'Variants', variantId);
        const snap = await getDoc(variantRef);
        if (!snap.exists()) {
          console.log('❌ Variant not found:', variantId);
          continue;
        }

        const v = snap.data();
        const rop = computeROP(v);
        const priority = classifyPriority(newQty, rop); 
        console.log('🔎 ROP:', rop, 'Priority:', priority);
        if (priority === 'normal') {
          console.log('✅ Priority is normal, skipping restocking request for', variantId);
          continue; // only create when below ROP
        }

        // Avoid duplicate open requests
        const rrRef = collection(db, 'RestockingRequests');
        const qRef = query(
          rrRef,
          where('variantId', '==', variantId),
          where('status', 'in', ['pending', 'acknowledged'])
        );
        console.log('🔍 Querying RestockingRequests for variant:', variantId);
        const existing = await getDocs(qRef);
        console.log('🔍 Existing requests found:', existing.size);
        if (!existing.empty) {
          console.log(`🚫 Skipping variant ${variantId} as it already has an open request`);
          continue;
        }

        // Compute suggested reorder quantity
        const eoq = computeEOQ(v);
        const safetyStock = Number(v?.safetyStock ?? 0) || 0;
        const targetLevel = Math.max(rop + safetyStock, rop);
        let suggestedQty = eoq > 0 ? eoq : Math.max(1, Math.ceil(targetLevel - newQty));

        const requestDoc = {
          productId: v.parentProductId || v.productId || mv.productId || '',
          variantId: variantId,
          productName: v.productName || mv.productName || '',
          variantName: v.variantName || mv.variantName || '',
          unit: v.unit || v.baseUnit || 'pcs',
          currentQty: newQty,
          reorderPoint: rop,
          suggestedQty,
          eoq: eoq || null,
          safetyStock,
          priority,
          status: 'pending',
          reason: 'Below ROP after sale',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentUser?.uid || 'system',
          createdByName: currentUser?.displayName || currentUser?.email || 'Unknown',
        };

        console.log('📝 Creating new restocking request:', requestDoc);
        await addDoc(rrRef, requestDoc);
        console.log(`📨 Created restocking request for ${requestDoc.productName} - ${requestDoc.variantName}`);
      }
    } catch (err) {
      console.warn('⚠️ Failed to create restocking requests:', err);
    }
  }, [computeEOQ, computeROP, classifyPriority, currentUser]);

  // --- Reset Sale State ---
  const resetSaleState = useCallback(() => {
    setAddedProducts([]);
    setAmountPaid('');
    setPaymentReference('');
    setDiscount('');
    setPaymentMethod('Cash');
    setCustomerDisplayName('Walk-in Customer');
  }, []);

  // --- Transaction Processing ---
  const handlePrintAndSave = useCallback(async () => {
    if (addedProducts.length === 0) {
      alert('No products in cart');
      return;
    }

    // Validate payment
    const amountPaidNum = Number(amountPaid) || 0;
    if (paymentMethod === 'Cash' && amountPaidNum < finalTotal) {
      alert(`Insufficient payment. Total: ₱${finalTotal.toFixed(2)}, Paid: ₱${amountPaidNum.toFixed(2)}`);
      return;
    }

    setIsProcessing(true);

    try {
     

      // Prepare cart items for service (ensure qty field exists as expected by service)
      const cartItems = addedProducts.map(item => ({
        variantId: item.variantId,
        parentProductId: item.productId,
        productName: item.baseName || item.name,
        variantName: item.variantName || (item.size ? `${item.size} ${item.unit || ''}`.trim() : ''),
        qty: item.qty,
        unitPrice: item.price,
        category: item.category || 'Uncategorized',
        storageLocation: item.storageLocation || '',
        shelfName: item.shelfName || '',
        rowName: item.rowName || '',
        // Include sale/discount info for receipt
        onSale: item.onSale || false,
        originalPrice: item.originalPrice || item.price,
        discountPercentage: item.discountPercentage || 0
      }));



      // Prepare transaction details
      const transactionDetails = {
        customerId: customerDetails?.id || 'WALK_IN_CUSTOMER',
        customerName: customerDisplayName,
        customerPhone: customerDetails.phone || '',
        customerAddress: customerDetails.address || '',
        customerEmail: customerDetails.email || '',
        subTotal: subTotal,
        tax: tax,
        discount: discountAmount,
        discountType: discountType,
        total: finalTotal,
        amountPaid: amountPaidNum,
        change: amountPaidNum - finalTotal,
        paymentMethod: paymentMethod,
        paymentReference: paymentReference,
        notes: ''
      };

    
      const saleResult = await processPOSSale(cartItems, transactionDetails, currentUser);


      // Generate analytics
      collectAnalyticsData({
        transactionId: saleResult.transactionId,
        items: cartItems,
        total: finalTotal,
        discount: discountAmount,
        paymentMethod: paymentMethod
      });

      // After successful sale, ensure restocking requests when needed
      if (saleResult?.stockMovements && Array.isArray(saleResult.stockMovements)) {
        
        await ensureRestockingRequests(saleResult.stockMovements);
      }

      // Prepare receipt data
      const receiptData = {
        ...saleResult,
        items: cartItems.map((item) => {
          // Combine product name and variant name for clear display
          let displayName = item.productName;
          if (item.variantName) {
            displayName = `${item.productName} - ${item.variantName}`;
          }
          
          return {
            ...item,
            name: displayName, // Combined name for display
            productName: item.productName, // Keep master product name for reference
            variantName: item.variantName, // Keep variant name for reference
            quantity: item.qty,
            qty: item.qty,
            price: item.unitPrice,
            unitPrice: item.unitPrice,
            totalPrice: item.qty * item.unitPrice,
            onSale: item.onSale || false,
            originalPrice: item.originalPrice || item.unitPrice,
            discountPercentage: item.discountPercentage || 0
          };
        }),
        subTotal: subTotal,
        subtotal: subTotal,
        tax: tax,
        discount: discountAmount,
        total: finalTotal,
        amountPaid: amountPaidNum,
        change: amountPaidNum - finalTotal,
        customerName: customerDisplayName,
        cashierName: currentUser?.name || 'Unknown',
        date: currentDateTime.formattedDate,
        time: `${currentDateTime.formattedTime.hours}:${currentDateTime.formattedTime.minutes}:${currentDateTime.formattedTime.seconds}`
      };

      // Show receipt modal
      setReceiptTransaction(receiptData);
      setShowReceiptModal(true);

      // Show success feedback modal
      setAddModalData({
        title: 'Sale Completed',
        message: `Transaction ID: ${saleResult.transactionId}`,
        type: 'success',
        details: ''
      });
      setShowAddModal(true);

      // Reset form
      resetSaleState();

    } catch (error) {
      console.error('❌ Error processing sale:', error);
      // Show error feedback modal
      setAddModalData({
        title: 'Sale Failed',
        message: `Failed to process sale: ${error.message}`,
        type: 'error',
        details: ''
      });
      setShowAddModal(true);
    } finally {
      setIsProcessing(false);
    }
  }, [
    addedProducts,
    finalTotal,
    subTotal,
    tax,
    discountAmount,
    discount,
    discountType,
    amountPaid,
    paymentMethod,
    paymentReference,
    customerDetails,
    customerDisplayName,
    currentUser,
    currentDateTime,
    resetSaleState,
    collectAnalyticsData
  ]);

  // --- Load Quotation Handler ---
  const handleLoadQuotation = useCallback(async () => {
    if (!quotationNumber.trim()) {
      setAddModalData({
        title: 'Quotation Number Required',
        message: 'Please enter a quotation number',
        type: 'warning',
        details: ''
      });
      setShowAddModal(true);
      return;
    }

    setLoadingQuotation(true);
    try {
      const quotationRef = doc(db, 'quotations', quotationNumber.trim());
      const quotationSnap = await getDoc(quotationRef);

      if (!quotationSnap.exists()) {
        setAddModalData({
          title: 'Quotation Not Found',
          message: `Quotation ${quotationNumber} not found`,
          type: 'error',
          details: ''
        });
        setShowAddModal(true);
        setLoadingQuotation(false);
        return;
      }

      const quotationData = quotationSnap.data();

      // Load customer information
      if (quotationData.customer) {
        setCustomerDetails({
          name: quotationData.customer.name || '',
          phone: quotationData.customer.phone || '',
          address: quotationData.customer.address || '',
          email: quotationData.customer.email || ''
        });
      }

      // Load products from quotation
      if (quotationData.items && Array.isArray(quotationData.items)) {
        const loadedProducts = quotationData.items.map((item, index) => ({
          variantId: item.variantId || `quotation-${Date.now()}-${index}`,
          productId: item.baseProductId || item.productId || '',
          name: item.description || item.name || 'Unknown Product',
          baseName: item.productName || item.name || 'Unknown Product',
          variantName: item.variantName || '',
          price: Number(item.unitPrice || item.price || 0),
          qty: Number(item.quantity || item.qty || 0),
          unit: item.unit || 'pcs',
          category: item.category || '',
          size: item.size || '',
          brand: item.brand || '',
          fromQuotation: quotationNumber.trim()
        }));

        setAddedProducts(loadedProducts);

        setAddModalData({
          title: 'Quotation Loaded',
          message: `Quotation ${quotationNumber} loaded successfully!`,
          type: 'success',
          details: `${loadedProducts.length} items added to quotation.`
        });
        setShowAddModal(true);
      } else {
        setAddModalData({
          title: 'No Items Found',
          message: 'No items found in this quotation',
          type: 'warning',
          details: ''
        });
        setShowAddModal(true);
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
      setAddModalData({
        title: 'Load Failed',
        message: 'Failed to load quotation. Please try again.',
        type: 'error',
        details: error.message
      });
      setShowAddModal(true);
    } finally {
      setLoadingQuotation(false);
    }
  }, [quotationNumber, db]);

  // --- UI Rendering ---
  const shouldDisableInteractions = isProcessing;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200">
        <DashboardHeader />
        
        {/* Search and Filters */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  disabled={shouldDisableInteractions}
                  placeholder="Search products by name, category, or brand..."
                  className="bg-white shadow-sm border-gray-200"
                />
              </div>
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

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <ProductGrid
              products={filteredProducts}
              onProductSelect={handleAddProduct}
              loading={loadingProducts}
              disabled={shouldDisableInteractions}
            />
          </div>
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className="w-[480px] flex flex-col bg-white shadow-lg">
        {/* Customer Info */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
          <div className="p-4">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Customer:</span>
                <span className="text-sm text-gray-800 font-medium">{customerDisplayName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Date:</span>
                <span className="text-sm text-gray-800">{currentDateTime.formattedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Load Quotation Form */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Load from Quotation</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                placeholder="Enter quotation number"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={loadingQuotation}
                onKeyPress={(e) => e.key === 'Enter' && handleLoadQuotation()}
              />
              <button
                onClick={handleLoadQuotation}
                disabled={loadingQuotation || !quotationNumber.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingQuotation ? 'Loading...' : 'Load'}
              </button>
            </div>
            {addedProducts.some(p => p.fromQuotation) && (
              <p className="text-xs text-blue-600 mt-2">
                📄 Loaded from: <span className="font-semibold">{addedProducts[0].fromQuotation}</span>
              </p>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Cart Items</h3>
              <span className="text-sm text-gray-500">
                {addedProducts.length} {addedProducts.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {addedProducts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-base font-medium">Your cart is empty</p>
                <p className="text-sm mt-1">Select products from the left to get started</p>
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
                isProcessing={isProcessing}
              />
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50">
          <OrderSummary
            subTotal={subTotal}
            tax={tax}
            total={total}
            discount={discountAmount}
            discountType={discountType}
            finalTotal={finalTotal}
            itemCount={addedProducts.length}
          />
        </div>

        {/* Payment Section */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          <PaymentSection
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            amountPaid={amountPaid}
            setAmountPaid={setAmountPaid}
            paymentReference={paymentReference}
            setPaymentReference={setPaymentReference}
            discount={discount}
            setDiscount={setDiscount}
            discountType={discountType}
            setDiscountType={setDiscountType}
            total={finalTotal}
            formattedTotal={formatCurrency(finalTotal)}
            formattedChange={formatCurrency(Number(amountPaid) - finalTotal)}
            onPrintAndSave={handlePrintAndSave}
            onClearCart={resetSaleState}
            isProcessing={isProcessing}
            disabled={shouldDisableInteractions || addedProducts.length === 0}
            hasProducts={addedProducts.length > 0}
            checkoutButtonText="Complete Sale"
          />
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

        {showReceiptModal && receiptTransaction && (
          <ReceiptModal
            transaction={receiptTransaction}
            onClose={() => {
              setShowReceiptModal(false);
              setReceiptTransaction(null);
            }}
          />
        )}

        {showAddModal && addModalData && (
          <ErrorModal
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setAddModalData(null);
            }}
            title={addModalData.title}
            message={addModalData.message}
            type={addModalData.type}
            details={addModalData.details}
          />
        )}
      </div>
    </div>
  );
}
