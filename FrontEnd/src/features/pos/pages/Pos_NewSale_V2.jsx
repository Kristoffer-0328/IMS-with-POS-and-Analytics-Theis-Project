import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import { AnalyticsService } from '../../../services/firebase/AnalyticsService';

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

  // --- Clock Update ---
  useEffect(() => {
    const updateClock = () => {
      setCurrentDateTime(getFormattedDateTime());
    };
    
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Fetch Products from Master + Variants Collections ---
  useEffect(() => {
    setLoadingProducts(true);
    
    const productsRef = collection(db, 'Master');
    const variantsRef = collection(db, 'Variants');
    
    let productsData = [];
    let variantsData = [];
    let unsubscribeProducts = null;
    let unsubscribeVariants = null;
    
    const mergeAndSetProducts = () => {
      console.log('🔄 Merging products and variants...');
      console.log('📦 Master:', productsData.length);
      console.log('📦 Variants:', variantsData.length);
      
      // Group variants by parentProductId
      const variantsByProduct = {};
      variantsData.forEach(variant => {
        const productId = variant.parentProductId || variant.productId;
        if (!variantsByProduct[productId]) {
          variantsByProduct[productId] = [];
        }
        variantsByProduct[productId].push(variant);
      });
      
      console.log('🔗 Variants grouped by product:', Object.keys(variantsByProduct).length, 'products');
      
      // Merge product info with variants
      const mergedProducts = productsData.map(product => {
        const productVariants = variantsByProduct[product.id] || [];
        
        return {
          id: product.id,
          name: product.name,
          image: product.image || product.imageUrl,
          category: product.category || 'Uncategorized',
          brand: product.brand || 'Generic',
          description: product.description,
          // Wrap variants with proper structure
          variants: productVariants.map(v => ({
            // Identity
            variantId: v.id,
            variantName: v.variantName || v.name,
            brand: v.brand || product.brand || 'Generic',
            image: v.image || v.imageUrl || product.image,

            // Pricing & stock
            unitPrice: v.unitPrice || v.price || 0,
            price: v.unitPrice || v.price || 0,
            quantity: v.quantity || 0,
            totalQuantity: v.quantity || 0,

            // Units & sizing
            size: v.size,
            unit: v.unit || v.baseUnit || 'pcs',
            baseUnit: v.baseUnit || v.unit || 'pcs',

            // Bundle info
            isBundle: !!v.isBundle,
            piecesPerBundle: v.piecesPerBundle,
            bundlePackagingType: v.bundlePackagingType,

            // Dimensional/spec info
            measurementType: v.measurementType,
            length: v.length,
            width: v.width,
            thickness: v.thickness,
            unitWeightKg: v.unitWeightKg,
            unitVolumeLiters: v.unitVolumeLiters,
            specifications: v.specifications,

            // Storage info
            storageLocation: v.storageLocation,
            shelfName: v.shelfName,
            rowName: v.rowName
          }))
        };
      }).filter(p => p.variants.length > 0); // Only show products with variants
      
      console.log('✅ Merged products (with variants):', mergedProducts.length);
      
      // Apply filters
      let filtered = mergedProducts;
      
      // Category filter
      if (selectedCategory) {
        filtered = filtered.filter(p => p.category === selectedCategory);
      }
      
      // Brand filter
      if (selectedBrand) {
        filtered = filtered.filter(p => p.brand === selectedBrand);
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
          p.name?.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
        );
      }
      
      console.log('✅ Filtered products:', filtered.length);
      setProducts(filtered);
      setLoadingProducts(false);
    };
    
    // Listen to Master collection (product info)
    unsubscribeProducts = onSnapshot(
      productsRef,
      (snapshot) => {
        console.log('📦 Master loaded:', snapshot.size);
        productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        mergeAndSetProducts();
      },
      (error) => {
        console.error('❌ Error loading Master:', error);
        alert('Failed to load products from Master collection.');
        setLoadingProducts(false);
      }
    );
    
    // Listen to Variants collection (stock & price)
    unsubscribeVariants = onSnapshot(
      variantsRef,
      (snapshot) => {
        console.log('📦 Variants loaded:', snapshot.size);
        variantsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        mergeAndSetProducts();
      },
      (error) => {
        console.error('❌ Error loading Variants:', error);
        alert('Failed to load Variants.');
        setLoadingProducts(false);
      }
    );
    
    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeVariants) unsubscribeVariants();
    };
  }, [searchQuery, selectedCategory, selectedBrand]);

  // Products are merged from Master + Variants collections
  const filteredProducts = products;

  // --- Cart Management ---
  const addProductToCart = useCallback((cartItem) => {
    console.log('➕ Adding to cart:', cartItem);
    
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

  const handleUpdateCartQuantity = useCallback((itemIndex, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveProduct(itemIndex);
      return;
    }

    setAddedProducts(prev =>
      prev.map((item, index) =>
        index === itemIndex ? { ...item, qty: newQuantity } : item
      )
    );
  }, [handleRemoveProduct]);

  // --- Product Selection Logic ---
  const handleAddProduct = useCallback(async (wrappedProduct) => {
    if (isProcessing) return;

    console.log('🎯 Product clicked:', wrappedProduct);

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
    
    console.log('✅ Adding variant to cart:', {
      product: selectedProductForModal.name,
      variant: variant,
      quantity: selectedQuantity
    });

    // Compute effective unit price
    let effectiveUnitPrice = variant.price || variant.unitPrice || 0;
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
      price: effectiveUnitPrice,
      qty: selectedQuantity,
      unit: variant.unit || variant.baseUnit || 'pcs',
      category: selectedProductForModal.category,
      image: variant.image || selectedProductForModal.image,
      // Include variant details for display
      size: variant.size,
      brand: selectedProductForModal.brand
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
  }, [selectedProductForModal, activeVariantIndex, addProductToCart]);

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
      console.log('📊 Analytics recorded:', analyticsData);
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
      if (!stockMovements || stockMovements.length === 0) return;
      for (const mv of stockMovements) {
        const variantId = mv.variantId;
        const newQty = Number(mv.newQty ?? 0);
        if (!variantId) continue;

        const variantRef = doc(db, 'Variants', variantId);
        const snap = await getDoc(variantRef);
        if (!snap.exists()) continue;
        const v = snap.data();
        const rop = computeROP(v);
        const priority = classifyPriority(newQty, rop);
        if (priority === 'normal') continue; // only create when below ROP

        // Avoid duplicate open requests
        const rrRef = collection(db, 'RestockingRequests');
        const qRef = query(
          rrRef,
          where('variantId', '==', variantId),
          where('status', 'in', ['pending', 'acknowledged'])
        );
        const existing = await getDocs(qRef);
        if (!existing.empty) {
          // Optionally could update existing doc here; for now, skip duplicates
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
      console.log('💳 Processing sale...');

      // Prepare cart items for service (ensure qty field exists as expected by service)
      const cartItems = addedProducts.map(item => ({
        variantId: item.variantId,
        parentProductId: item.productId,
        productName: item.baseName || item.name,
        variantName: item.size ? `${item.size} ${item.unit || ''}`.trim() : '',
        qty: item.qty,
        unitPrice: item.price,
        category: item.category || 'Uncategorized',
        storageLocation: item.storageLocation || '',
        shelfName: item.shelfName || '',
        rowName: item.rowName || ''
      }));

      console.log('🛒 Cart items:', cartItems);

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

      console.log('💰 Transaction details:', transactionDetails);

      // Process sale using service (atomic transaction)
      const saleResult = await processPOSSale(cartItems, transactionDetails, currentUser);

      console.log('✅ Sale processed successfully:', saleResult);

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
        items: cartItems.map((item) => ({
          ...item,
          name: item.productName,
          variantName: item.variantName,
          totalPrice: item.quantity * item.unitPrice
        })),
        subtotal: subTotal,
        tax: tax,
        discount: discountAmount,
        total: finalTotal,
        amountPaid: amountPaidNum,
        change: amountPaidNum - finalTotal,
        customerName: customerDisplayName,
        cashierName: currentUser?.name ||  'Unknown',
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
                onUpdateQuantity={handleUpdateCartQuantity}
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
