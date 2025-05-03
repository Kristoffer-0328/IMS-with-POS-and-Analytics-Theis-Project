import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Firebase and Services
import { useServices } from '../../FirebaseBackEndQuerry/ProductServices'; // Adjust path if needed
import {
  getFirestore,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import app from '../../FirebaseConfig'; // Adjust path if needed

// Import Components from new locations
import SearchBar from '../pos_component/SearchBar';
import ProductGrid from '../pos_component/ProductGrid';
import CustomerInfo from '../pos_component/CustomerInfo';
import Cart from '../pos_component/Cart';
import OrderSummary from '../pos_component/OrderSummary';
import PaymentSection from '../pos_component/PaymentSection';

// Import Modals from new locations
import BulkOrderChoiceModal from '../pos_component/Modals/BulkOrderChoices';
import BulkOrderDetailsModal from '../pos_component/Modals/BulkOrderDetailsModal';
import VariantSelectionModal from '../pos_component/Modals/VariantSelectionModal';
// Import utilities
import { printReceiptContent } from '../utils/ReceiptGenerator';

const db = getFirestore(app);

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

export default function Pos_NewSale() {
  // --- State Management ---

  const [currentDateTime, setCurrentDateTime] = useState(() => getFormattedDateTime());
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false); // For transaction state

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

  // Add clock update effect
  useEffect(() => {
    const updateClock = () => {
        const time = getFormattedDateTime();
        console.log("Current time data:", time); // Debug log
        setCurrentDateTime(time);
    };
    
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
}, []);

  // --- Data Fetching and Processing ---

  // Fetch Products
  useEffect(() => {
    setLoadingProducts(true);
    const unsubscribe = listenToProducts((fetchedProducts) => {
      if (JSON.stringify(products) !== JSON.stringify(fetchedProducts)) {
        setProducts(fetchedProducts || []);
      }
      setLoadingProducts(false);
    });

    // Show initial customer choice prompt
    const timer = setTimeout(() => {
      if (isBulkOrder === null) {
        setShowBulkOrderPopup(true);
      }
    }, 100);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [listenToProducts]); // Only depend on listenToProducts

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
    const query = searchQuery.trim().toLowerCase();
    if (query === '') {
        return groupedProducts;
    }
    return groupedProducts.filter(p =>
        p.name && p.name.toLowerCase().includes(query)
    );
  }, [searchQuery, groupedProducts]);


  // --- Cart Logic ---
  const addToCart = useCallback((prodToAdd) => {
    if (!prodToAdd?.variantId || !prodToAdd?.baseProductId) {
        console.error("Invalid product data:", prodToAdd);
        return;
    }

    const quantity = Number(prodToAdd.qty);
    if (isNaN(quantity) || quantity <= 0) {
        alert("Please enter a valid quantity");
        return;
    }

    setCart(currentCart => {
        const existingItem = currentCart.find(item => item.variantId === prodToAdd.variantId);
        
        if (existingItem) {
            return currentCart.map(item => 
                item.variantId === prodToAdd.variantId 
                    ? { ...item, qty: item.qty + quantity }
                    : item
            );
        }

        return [...currentCart, {
            ...prodToAdd,
            qty: quantity,
            price: Number(prodToAdd.price)
        }];
    });
}, []);

  const handleRemoveItem = useCallback((indexToRemove) => {
    setCart(currentCart => currentCart.filter((_, i) => i !== indexToRemove));
  }, []); // No external dependencies needed for setCart


  // --- Product Selection Logic ---
  const handleAddProduct = useCallback((productGroup) => {
    if (!productGroup || !productGroup.variants || isProcessing || showBulkOrderPopup) {
        console.warn("Add product blocked:", { productGroup, isProcessing, showBulkOrderPopup });
        return;
    }

    if (productGroup.hasVariants && productGroup.variants.length > 0) {
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

        // Create display name with size/unit
        const displayName = variant.size || variant.unit 
            ? `${productGroup.name} (${variant.size || ''} ${variant.unit || ''})`.trim()
            : productGroup.name;

        // Log the product data for debugging
        console.log('Adding single variant product:', {
            productGroup,
            variant,
            baseProductId: variant.baseProductId
        });

        addToCart({
            id: variant.variantId,
            name: displayName,
            baseName: productGroup.name,
            price: variant.price,
            qty: 1,
            variantId: variant.variantId,
            category: productGroup.category,
            baseProductId: variant.baseProductId // Use variant's baseProductId directly
        });
    }
}, [addToCart, isProcessing, showBulkOrderPopup]);

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

    addToCart({
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
}, [selectedProductForModal, activeVariantIndex, quantity, addToCart]);


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
       setCart([]);
       setAmountPaid('');
       setPaymentMethod('Cash');
       setIsBulkOrder(null); // Reset customer type choice
       setCustomerDetails({ name: '', phone: '', address: '' }); // Clear details
       // Reset walk-in counter? Decide based on desired behavior. Usually not reset per sale.
       // setWalkInCounter(0);
       setCustomerIdentifier('Walk-in Customer'); // Reset to default
       setCustomerDisplayName('Walk-in Customer'); // Reset to default
       setSearchQuery(''); // Clear search
       setQuantity(1); // Reset modal quantity
       setSelectedProductForModal(null); // Clear modal product
       setVariantModalOpen(false); // Close variant modal if open
       setActiveVariantIndex(0);
       setShowBulkOrderPopup(true); // IMPORTANT: Show initial choice popup for the next sale
       console.log("Sale state reset.");
   }, []); // No dependencies needed if it only uses setters


  // --- Calculations ---
  // Calculate totals using useMemo based on cart
  const { subTotal, tax, total } = useMemo(() => {
    const subTotalCalc = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxRateCalc = 0.12; // Consider making this a config/prop if it changes
    const taxCalc = subTotalCalc * taxRateCalc;
    const totalCalc = subTotalCalc + taxCalc;
    return { subTotal: subTotalCalc, tax: taxCalc, total: totalCalc };
  }, [cart]); // Dependency


  // --- Transaction Logic ---
  const handlePrintAndSave = useCallback(async () => {
    if (cart.length === 0 || isProcessing) {
        alert("Cannot process: Cart is empty or transaction in progress");
        return;
    }

    setIsProcessing(true);

    try {
        const { formattedDate, formattedTime } = getFormattedDateTime();
        const receiptNumber = `GS-${Date.now()}`;
        
        await runTransaction(db, async (transaction) => {
            // First, perform all reads and validations
            const productUpdates = [];
            
            for (const item of cart) {
                const productRef = doc(db, 'Products', item.category, 'Items', item.baseProductId);
                const productDoc = await transaction.get(productRef);
                
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

                // Store update data for later
                productUpdates.push({
                    ref: productRef,
                    data: {
                        quantity: (Number(productData.quantity) || 0) - item.qty,
                        variants: productData.variants.map((v, idx) => 
                            idx === variantIndex 
                                ? { ...v, quantity: currentQuantity - item.qty }
                                : v
                        ),
                        lastUpdated: serverTimestamp()
                    }
                });
            }

            // Create transaction record
            const transactionRef = doc(db, 'Transactions', receiptNumber);
            const transactionData = {
                id: receiptNumber,
                timestamp: serverTimestamp(),
                date: formattedDate,
                time: formattedTime,
                items: cart.map(item => ({
                    name: item.name || '',
                    category: item.category || '',
                    baseProductId: item.baseProductId || '',
                    variantId: item.variantId || '',
                    price: Number(item.price) || 0,
                    quantity: Number(item.qty) || 0,
                    total: (Number(item.price) || 0) * (Number(item.qty) || 0)
                })),
                subTotal: Number(subTotal) || 0,
                tax: Number(tax) || 0,
                total: Number(total) || 0,
                amountPaid: Number(amountPaid) || 0,
                change: (Number(amountPaid) || 0) - (Number(total) || 0),
                customerName: customerDisplayName || 'Walk-in Customer',
                customerDetails: isBulkOrder ? {...customerDetails} : null,
                paymentMethod: paymentMethod || 'Cash',
                cashierId: "Moni Roy",
                isBulkOrder: Boolean(isBulkOrder)
            };

            // Now perform all writes after reads
            await transaction.set(transactionRef, transactionData);
            
            // Update all products
            for (const update of productUpdates) {
                transaction.update(update.ref, update.data);
            }
        });

        // After successful transaction, print receipt and reset
        await printReceiptContent({
            receiptNumber,
            date: formattedDate,
            time: formattedTime,
            items: cart.map(item => ({
                name: item.name,
                quantity: item.qty,
                price: item.price,
                total: item.price * item.qty
            })),
            subTotal,
            tax,
            total,
            amountPaid: Number(amountPaid),
            change: Number(amountPaid) - total,
            customerName: customerDisplayName,
            cashierName: "Moni Roy"
        });

        resetSaleState();
        alert("Transaction completed successfully!");

    } catch (error) {
        console.error("Transaction failed:", error);
        alert(`Transaction failed: ${error.message}`);
    } finally {
        setIsProcessing(false);
    }
}, [cart, total, subTotal, tax, amountPaid, paymentMethod, customerDetails, customerDisplayName, isBulkOrder, resetSaleState]);


  // --- UI ---
  const shouldDisableInteractions = isProcessing || (showBulkOrderPopup && isBulkOrder === null) || (showBulkOrderPopup && isBulkOrder === true);

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-100/80 to-amber-100/30 rounded-xl p-4 sm:p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">New Sale</h2>
            <div className="clock-display">
              <span className="clock-time">
                {currentDateTime.formattedTime?.hours || '00'}
              </span>
              <span className="clock-separator">:</span>
              <span className="clock-time">
                {currentDateTime.formattedTime?.minutes || '00'}
              </span>
              <span className="clock-separator">:</span>
              <span className="clock-time">
                {currentDateTime.formattedTime?.seconds || '00'}
              </span>
              <span className="clock-divider">|</span>
              <span>{currentDateTime.formattedDate}</span>
            </div>
          </div>
          <div className="text-sm font-medium flex items-center bg-white px-3 py-1 rounded-full shadow-xs">
            <span className="font-semibold text-gray-800">Moni Roy</span>
            <span className="text-gray-500 ml-2">| Cashier</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-6 overflow-hidden">

        {/* Left Side: Product Selection */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            disabled={shouldDisableInteractions} // Disable search when modals are active or processing
          />
          {/* Product Grid Container */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-5 border border-gray-100 overflow-y-auto">
             <ProductGrid
                products={filteredProducts}
                onAddProduct={handleAddProduct}
                loading={loadingProducts}
                searchQuery={searchQuery}
                disabled={shouldDisableInteractions}
            />
          </div>
        </div>

        {/* Right Side: Invoice Panel */}
        <aside className="invoice-panel w-80 md:w-96 bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
            {/* Customer Info */}
            <CustomerInfo
                customerDisplayName={customerDisplayName}
                isBulkOrder={isBulkOrder}
                customerDetails={customerDetails}
                formattedDate={currentDateTime.formattedDate}
            />
            {/* Cart Items */}
            <Cart
                cartItems={cart}
                onRemoveItem={handleRemoveItem}
                isProcessing={isProcessing}
            />
            {/* Order Summary (Totals) */}
            <OrderSummary
                subTotal={subTotal}
                tax={tax}
                total={total}
            />
            {/* Payment Section */}
            <PaymentSection
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                amountPaid={amountPaid}
                setAmountPaid={setAmountPaid}
                total={total}
                isProcessing={isProcessing}
                cartIsEmpty={cart.length === 0}
                onPrintAndSave={handlePrintAndSave}
            />
        </aside>
      </div>

      {/* Modals Section - Render conditionally */}
      <>
          {/* Modal 1: Bulk Order Choice */}
          {showBulkOrderPopup && isBulkOrder === null && (
             <BulkOrderChoiceModal
                onChoice={handleBulkOrderChoice}
             />
          )}

          {/* Modal 2: Bulk Order Details */}
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

          {/* Modal 3: Variant Selection */}
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
      </>

    </div>
  );
} // End Pos_NewSale component