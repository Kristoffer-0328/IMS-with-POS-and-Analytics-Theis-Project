import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
import QuickQuantityModal from '../components/QuickQuantityModal';
import ReceiptModal from '../components/Modals/ReceiptModal';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';

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
  
  const [quickQuantityModalOpen, setQuickQuantityModalOpen] = useState(false);
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState(null);
  
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState(null);

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

  // --- Fetch Products using Variants Collection (Real-time Listener) ---
  useEffect(() => {
    setLoadingProducts(true);
    
    // Listen to Variants collection directly (like old system)
    const variantsRef = collection(db, 'Variants');
    
    const unsubscribe = onSnapshot(
      variantsRef,
      (snapshot) => {
        console.log('� Variants loaded:', snapshot.size);
        
        const variantsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Apply filters
        let filtered = variantsList;
        
        // Category filter
        if (selectedCategory) {
          filtered = filtered.filter(v => v.category === selectedCategory);
        }
        
        // Brand filter
        if (selectedBrand) {
          filtered = filtered.filter(v => v.brand === selectedBrand);
        }
        
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(v => 
            v.name?.toLowerCase().includes(query) ||
            v.brand?.toLowerCase().includes(query) ||
            v.category?.toLowerCase().includes(query) ||
            v.description?.toLowerCase().includes(query)
          );
        }
        
        console.log('✅ Filtered variants:', filtered.length);
        
        // Wrap each variant to match ProductGrid's expected structure
        // ProductGrid expects: { id, name, image, category, variants: [...] }
        const wrappedProducts = filtered.map(variant => ({
          id: variant.id,
          name: variant.name,
          image: variant.image || variant.imageUrl,
          category: variant.category || 'Uncategorized',
          brand: variant.brand || 'Generic',
          // Wrap the variant as a single-item array
          variants: [{
            variantId: variant.id,
            unitPrice: variant.unitPrice || 0,
            price: variant.unitPrice || 0,
            quantity: variant.quantity || 0,
            totalQuantity: variant.quantity || 0,
            size: variant.size,
            unit: variant.unit || variant.baseUnit || 'pcs',
            image: variant.image || variant.imageUrl,
            storageLocation: variant.storageLocation,
            shelfName: variant.shelfName,
            rowName: variant.rowName
          }]
        }));
        
        setProducts(wrappedProducts);
        setLoadingProducts(false);
      },
      (error) => {
        console.error('❌ Error loading variants:', error);
        alert('Failed to load products. Please check your connection.');
        setProducts([]);
        setLoadingProducts(false);
      }
    );
    
    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [searchQuery, selectedCategory, selectedBrand]);

  // Products are loaded directly from Variants collection - no grouping needed!
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

    // Since each wrapped product has a single variant, show quick quantity modal
    setSelectedProductForQuantity(wrappedProduct);
    setQuickQuantityModalOpen(true);
  }, [isProcessing]);

  const handleAddVariant = useCallback(async (selectedQuantity) => {
    if (!selectedProductForModal) return;

    const variant = selectedProductForModal.variants[activeVariantIndex];
    
    console.log('✅ Adding variant to cart:', {
      product: selectedProductForModal.name,
      variant: variant,
      quantity: selectedQuantity
    });

    // Add to cart with proper structure
    const cartItem = {
      variantId: variant.variantId,
      productId: selectedProductForModal.id,
      name: `${selectedProductForModal.name}${variant.size ? ` (${variant.size} ${variant.unit || ''})`.trim() : ''}`,
      baseName: selectedProductForModal.name,
      price: variant.price || variant.unitPrice || 0,
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
        cashier: currentUser?.displayName || currentUser?.email || 'Unknown'
      };

      AnalyticsService.recordSale(analyticsData);
      console.log('📊 Analytics recorded:', analyticsData);
    } catch (error) {
      console.error('Error collecting analytics:', error);
    }
  }, [currentUser]);

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

      // Prepare cart items for service
      const cartItems = addedProducts.map(item => ({
        variantId: item.variantId,
        productName: item.baseName || item.name,
        variantName: item.size ? `${item.size} ${item.unit || ''}`.trim() : '',
        quantity: item.qty,
        unitPrice: item.price,
        category: item.category || 'Uncategorized'
      }));

      console.log('🛒 Cart items:', cartItems);

      // Prepare transaction details
      const transactionDetails = {
        customerName: customerDisplayName,
        customerDetails: customerDetails,
        paymentMethod: paymentMethod,
        amountPaid: amountPaidNum,
        discount: discountAmount,
        discountType: discountType,
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
        cashierName: currentUser?.displayName || currentUser?.email || 'Unknown',
        date: currentDateTime.formattedDate,
        time: `${currentDateTime.formattedTime.hours}:${currentDateTime.formattedTime.minutes}:${currentDateTime.formattedTime.seconds}`
      };

      // Show receipt modal
      setReceiptTransaction(receiptData);
      setShowReceiptModal(true);

      // Show success message
      alert(`✅ Sale completed successfully!\nTransaction ID: ${saleResult.transactionId}`);

      // Reset form
      resetSaleState();

    } catch (error) {
      console.error('❌ Error processing sale:', error);
      alert(`Failed to process sale: ${error.message}`);
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

        {quickQuantityModalOpen && selectedProductForQuantity && (
          <QuickQuantityModal
            product={selectedProductForQuantity}
            maxQuantity={selectedProductForQuantity.variants[0]?.quantity || 0}
            onClose={() => {
              setQuickQuantityModalOpen(false);
              setSelectedProductForQuantity(null);
            }}
            onAdd={(quantity) => {
              const variant = selectedProductForQuantity.variants[0];
              const cartItem = {
                variantId: variant.variantId,
                productId: selectedProductForQuantity.id,
                name: selectedProductForQuantity.name,
                baseName: selectedProductForQuantity.name,
                price: variant.unitPrice || 0,
                qty: quantity,
                unit: variant.unit || 'pcs',
                category: selectedProductForQuantity.category || 'Uncategorized',
                image: variant.image || selectedProductForQuantity.image || '',
                size: variant.size,
                brand: selectedProductForQuantity.brand || 'Generic'
              };
              addProductToCart(cartItem);
              setQuickQuantityModalOpen(false);
              setSelectedProductForQuantity(null);
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
      </div>
    </div>
  );
}
