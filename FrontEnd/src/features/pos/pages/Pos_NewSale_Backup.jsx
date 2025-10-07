import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Firebase and Services
import { useServices } from '../../../services/firebase/ProductServices';
import {
  getFirestore,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
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

export default function Pos_NewSale() {
  // Get authentication context
  const { currentUser } = useAuth();
  const { listenToProducts } = useServices();

  // --- States ---
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [addedProducts, setAddedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [variant, setVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- States for Modals ---
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  
  // Customer Information State
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });

  // Transaction Type State
  const [transactionType, setTransactionType] = useState('walk-in'); // 'walk-in' or 'quotation'

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  // --- Navigation ---
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Add clock timer effect ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // --- Products loading effect ---
  useEffect(() => {

    setProductsLoading(true);
    setProductsError(null);
    
    const unsubscribe = listenToProducts((loadedProducts) => {

       // Log the first product structure
      setProducts(loadedProducts);
      setProductsLoading(false);
      setProductsError(null);
    });
    
    return () => {
      if (unsubscribe) {

        unsubscribe();
      }
    };
  }, [listenToProducts]);

  // --- Auto-set customer name for walk-in transactions ---
  useEffect(() => {
    if (transactionType === 'walk-in') {
      setCustomerInfo(prev => ({
        ...prev,
        name: 'Walk-in Customer'
      }));
    } else if (transactionType === 'quotation') {
      setCustomerInfo(prev => ({
        ...prev,
        name: ''
      }));
    }
  }, [transactionType]);

  // --- Categories ---
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

  const getCartItemQuantity = useCallback((productId, variantId) => {
    const cartItem = addedProducts.find(item => 
      item.baseProductId === productId && item.variantId === variantId
    );
    return cartItem ? cartItem.qty : 0;
  }, [addedProducts]);

  // --- Filter Logic ---
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchTerm === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === '' || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // --- Add Product Functions ---
  const addProduct = useCallback((productData) => {

    const newItem = {
      ...productData,
      cartId: `${productData.id || productData.variantId}_${Date.now()}_${Math.random()}`
    };

    setAddedProducts(prevProducts => {
      const existingIndex = prevProducts.findIndex(item => 
        item.id === newItem.id && 
        item.variantId === newItem.variantId &&
        item.name === newItem.name
      );

      if (existingIndex !== -1) {
        // Update existing item quantity
        const updatedProducts = [...prevProducts];
        updatedProducts[existingIndex] = {
          ...updatedProducts[existingIndex],
          qty: updatedProducts[existingIndex].qty + newItem.qty
        };
        return updatedProducts;
      } else {
        // Add new item
        return [...prevProducts, newItem];
      }
    });
    
    // Reset states
    setQuantity(1);
    setSelectedUnit('');

  }, []);

  // Enhanced variant handling
  const handleAddVariant = useCallback(() => {
    if (!selectedProductForModal) return;
    
    const activeVariant = selectedProductForModal.variants[activeVariantIndex];
    
    const cartItem = {
      id: activeVariant.id,
      variantId: activeVariant.id,
      baseProductId: selectedProductForModal.id,
      name: `${selectedProductForModal.name}${activeVariant.variantName ? ` - ${activeVariant.variantName}` : ''}`,
      baseName: selectedProductForModal.name,
      price: activeVariant.unitPrice || activeVariant.price || 0,
      qty: parseInt(quantity) || 1,
      unit: activeVariant.unit || 'Piece',
      category: selectedProductForModal.category,
      // Add location fields - use variant data first, then fallback to product data
      storageLocation: activeVariant.storageLocation || selectedProductForModal.storageLocation,
      shelfName: activeVariant.shelfName || selectedProductForModal.shelfName,
      rowName: activeVariant.rowName || selectedProductForModal.rowName,
      columnIndex: activeVariant.columnIndex || selectedProductForModal.columnIndex,
      fullLocation: activeVariant.fullLocation || selectedProductForModal.fullLocation
    };

    addProduct(cartItem);
    
    // Close modal
    setVariantModalOpen(false);
    setSelectedProductForModal(null);
    setActiveVariantIndex(0);
    setQuantity(1);
  }, [addProduct, quantity, selectedProductForModal, activeVariantIndex]);

  // Enhanced remove function
  const removeProduct = useCallback((cartId) => {
    setAddedProducts(prevProducts => 
      prevProducts.filter(item => item.cartId !== cartId)
    );
  }, []);

  // Enhanced update quantity function
  const updateProductQuantity = useCallback((cartId, newQty) => {
    if (newQty <= 0) {
      removeProduct(cartId);
      return;
    }
    
    setAddedProducts(prevProducts =>
      prevProducts.map(item =>
        item.cartId === cartId ? { ...item, qty: newQty } : item
      )
    );
  }, [removeProduct]);

  // Clear cart function
  const clearCart = useCallback(() => {
    setAddedProducts([]);
    setCustomerInfo({
      name: '',
      address: '',
      phone: '',
      email: ''
    });
    setPaymentMethod('cash');
    setShowPaymentSection(false);
  }, []);

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

    } catch (error) {
      console.error('Error generating quotation:', error);
      alert('Error generating quotation. Please try again.');
    }
  }, [addedProducts, currentUser]);

  // Keep the old function temporarily for compatibility
  const generateQuotation = useCallback(() => {
     if (addedProducts.length === 0) {
       alert("Cannot create quotation: Cart is empty");
       return;
     }

     const { formattedDate } = getFormattedDateTime();
     const quotationNumber = `GS-Q-${Date.now()}`;
     const validUntilDate = new Date();
     validUntilDate.setDate(validUntilDate.getDate() + 30);

     // Calculate totals
     const subtotal = addedProducts.reduce((sum, item) => sum + (item.price * item.qty), 0);
     const discount = 0; // Can be made dynamic
     const tax = subtotal * 0.12; // 12% VAT
     const deliveryFee = 150; // Can be made dynamic
     const grandTotal = subtotal - discount + tax + deliveryFee;

     // Generate HTML for quotation - simplified version
     const quotationHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Sales Quotation - Glory Star Hardware</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #f97316; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f97316; color: white; }
        .total { font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">GLORY STAR HARDWARE</div>
        <div>Construction Materials Corporation</div>
        <h2>SALES QUOTATION</h2>
        <p>Quote #: ${quotationNumber}</p>
        <p>Date: ${formattedDate}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${addedProducts.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.qty}</td>
                    <td>₱${formatCurrency(item.price)}</td>
                    <td>₱${formatCurrency(item.price * item.qty)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div style="text-align: right; margin-top: 20px;">
        <p>Subtotal: ₱${formatCurrency(subtotal)}</p>
        <p>Tax (12%): ₱${formatCurrency(tax)}</p>
        <p>Delivery Fee: ₱${formatCurrency(deliveryFee)}</p>
        <p class="total">Grand Total: ₱${formatCurrency(grandTotal)}</p>
    </div>
    
    <div style="margin-top: 40px;">
        <p><strong>Terms & Conditions:</strong></p>
        <p>• This quotation is valid for 30 days</p>
        <p>• Payment terms: 30% down payment, 70% upon delivery</p>
        <p>• Delivery: 7-10 business days</p>
    </div>
</body>
</html>
     `;

     // Create a new window to print the quotation
     const printWindow = window.open('', '_blank');
     printWindow.document.write(quotationHTML);
     printWindow.document.close();
     
     // Auto-print after a short delay
     setTimeout(() => {
       printWindow.print();
     }, 500);

     setShowQuotationModal(false);
   }, [addedProducts]);


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
  }, [addedProducts]);

  // Format currency values for display
  const formattedTotal = `₱${total.toFixed(2)}`;
  const change = Number(amountPaid) - total;
  const formattedChange = `₱${change.toFixed(2)}`;

  // Process transaction function
  const processTransaction = useCallback(async () => {
    if (addedProducts.length === 0) {
      alert('No products added to cart');
      return;
    }

    // Only require customer name for quotations, not for walk-in sales
    if (transactionType === 'quotation' && !customerInfo.name.trim()) {
      alert('Please enter customer name for quotation');
      return;
    }

    setIsProcessing(true);
    setIsPaymentProcessing(true);

    try {
      
      
      const transactionId = `TXN-${Date.now()}`;
      const { formattedDate, formattedTime } = getFormattedDateTime();
      
      const transactionData = {
        transactionId,
        customerId: `CUST-${Date.now()}`,
        customerInfo: cleanFirebaseData(customerInfo),
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

      // Update inventory and save transaction
      await runTransaction(db, async (transaction) => {
        // Update inventory quantities using the correct Firebase structure
        for (const item of addedProducts) {

          if (item.storageLocation && item.shelfName && item.rowName && item.columnIndex) {
            // Construct the correct path: Products/{storageLocation}/shelves/{shelfName}/rows/{rowName}/columns/{columnIndex}/items/{productId}
            const productRef = doc(db, 'Products', item.storageLocation, 'shelves', item.shelfName, 'rows', item.rowName, 'columns', item.columnIndex.toString(), 'items', item.variantId || item.id);

            const productDoc = await transaction.get(productRef);
            
            if (productDoc.exists()) {
              const currentQty = productDoc.data().quantity || 0;
              const newQty = Math.max(0, currentQty - item.qty);
              
              transaction.update(productRef, {
                quantity: newQty,
                lastSold: serverTimestamp(),
                totalSold: (productDoc.data().totalSold || 0) + item.qty,
                lastUpdated: serverTimestamp()
              });

            } else {
              console.warn(`Product not found at path: Products/${item.storageLocation}/shelves/${item.shelfName}/rows/${item.rowName}/columns/${item.columnIndex}/items/${item.variantId || item.id}`);
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
        const transactionRef = doc(db, 'posTransactions', transactionId);
        transaction.set(transactionRef, transactionData);
      });

      // Collect analytics
      collectAnalyticsData({
        transactionId,
        totalAmount: total,
        itemCount: addedProducts.length,
        items: addedProducts,
        paymentMethod
      });

      // Generate and print receipt
      try {
        printReceiptContent({
          transactionId,
          customerInfo,
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
      clearCart();
      alert('Transaction completed successfully!');

    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setIsPaymentProcessing(false);
    }
  }, [addedProducts, customerInfo, subTotal, tax, total, paymentMethod, currentUser, clearCart, collectAnalyticsData, transactionType]);

  // Dynamic checkout handler based on transaction type
  const handleCheckout = useCallback(() => {
    if (addedProducts.length === 0) {
      alert('No products added to cart');
      return;
    }

    if (transactionType === 'quotation') {
      // Open customer info modal for quotation
      setShowQuotationModal(true);
    } else {
      // Process normal walk-in transaction
      processTransaction();
    }
  }, [addedProducts, transactionType, processTransaction]);

  // --- UI ---
  const shouldDisableInteractions = isProcessing;

  return (
    <div className="flex flex-col w-full max-w-[1920px] mx-auto bg-white min-h-screen">
      {/* Enhanced Header with Gradient */}
      <div className="bg-orange-50 border-b border-gray-100 sticky top-0 z-30 h-[73px]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h1 className="text-lg font-semibold text-gray-900">Point of Sale</h1>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{currentTime.toLocaleTimeString()}</span>
                <span className="text-gray-400">|</span>
                <span>{currentTime.toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Search and Filters */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <SearchBar 
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  disabled={shouldDisableInteractions}
                />
              </div>
              <div className="w-full lg:w-auto">
                <ProductFilters
                  products={products}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedBrand={null}
                  setSelectedBrand={() => {}}
                  disabled={shouldDisableInteractions}
                />
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-auto">
            <ProductGrid
              products={filteredProducts}
              onProductSelect={(product) => {
                // Always open variant selection modal for quantity input

                setSelectedProductForModal(product);
                setVariantModalOpen(true);
              }}
              onUnitConversion={(product) => {
                setSelectedProductForUnitModal(product);
                setUnitConversionModalOpen(true);
              }}
              onQuickQuantity={(product) => {
                setSelectedProductForQuantity(product);
                setQuickQuantityModalOpen(true);
              }}
              getCartQuantity={getCartItemQuantity}
              disabled={shouldDisableInteractions}
            />
          </div>
        </div>

        {/* Right Panel - Cart and Checkout */}
        <div className="w-80 xl:w-96 bg-white border-l border-gray-200 flex flex-col">
          {/* Customer Info */}
          <div className="p-4 border-b border-gray-200">
            <CustomerInfo
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              disabled={shouldDisableInteractions}
              transactionType={transactionType}
              setTransactionType={setTransactionType}
            />
          </div>

          {/* Cart */}
          <div className="flex-1 overflow-auto">
            <ProductList
              cartItems={addedProducts}
              onRemoveItem={(index) => {
                const item = addedProducts[index];
                if (item && item.cartId) {
                  removeProduct(item.cartId);
                }
              }}
              isProcessing={shouldDisableInteractions}
            />
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-200">
            <OrderSummary
              subTotal={subTotal}
              tax={tax}
              total={total}
              itemCount={addedProducts.length}
            />
          </div>

          {/* Payment Section */}
          <div className="border-t border-gray-200">
            <PaymentSection
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              total={total}
              formattedTotal={formattedTotal}
              formattedChange={formattedChange}
              onPrintAndSave={handleCheckout}
              onClearCart={clearCart}
              isProcessing={isPaymentProcessing}
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
            isOpen={quickQuantityModalOpen}
            onClose={() => {
              setQuickQuantityModalOpen(false);
              setSelectedProductForQuantity(null);
            }}
            onAdd={(quantity) => {
              // Use the first variant or the product itself
              const variant = selectedProductForQuantity.variants?.[0] || selectedProductForQuantity;
              
              addProduct({
                id: variant.id || selectedProductForQuantity.id,
                name: selectedProductForQuantity.name,
                baseName: selectedProductForQuantity.name,
                price: variant.unitPrice || variant.price || selectedProductForQuantity.price || 0,
                qty: quantity,
                unit: variant.unit || selectedProductForQuantity.unit || 'Piece',
                variantId: variant.id || selectedProductForQuantity.id,
                baseProductId: selectedProductForQuantity.id,
                category: selectedProductForQuantity.category,
                // Add location fields from variant or product
                storageLocation: variant.storageLocation || selectedProductForQuantity.storageLocation,
                shelfName: variant.shelfName || selectedProductForQuantity.shelfName,
                rowName: variant.rowName || selectedProductForQuantity.rowName,
                columnIndex: variant.columnIndex || selectedProductForQuantity.columnIndex,
                fullLocation: variant.fullLocation || selectedProductForQuantity.fullLocation
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