import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { getFormattedDateTime } from '../utils/DateTimeFormatter';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import { listenToMergedProducts } from '../../../services/firebase/ProductServices';
import { applyProductFilters } from '../../../Models/MergedProduct';

// Import Components
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';
import ProductList from '../components/Cart';
import ProductFilters from '../components/ProductFilters';
import VariantSelectionModal from '../components/Modals/VariantSelectionModal';
import CustomerInfoModal from '../components/quotation/CustomerInfoModal';
import QuotationGenerator from '../components/quotation/QuotationGenerator';
import QuotationUtils from '../utils/quotationUtils';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';
import ErrorModal from '../../../components/modals/ErrorModal';
const Pos_Quotation = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const db = getFirestore(app);
  
  // Product State
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [addedProducts, setAddedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Modal States
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [customerInfoModalOpen, setCustomerInfoModalOpen] = useState(false);
  
  // Variant Modal States
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  // Feedback Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalData, setAddModalData] = useState(null);

  // Customer Info State
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  
  // Date Time
  const { formattedDate, formattedTime } = getFormattedDateTime();

  // Fetch Products from Master + Variants + Suppliers Collections
  useEffect(() => {
    setLoadingProducts(true);
    
    console.log('🔄 Setting up merged product listener for Quotation with filters:', {
      searchQuery,
      selectedCategory,
      selectedBrand
    });

    // Use the centralized merging function from ProductServices (same as V2)
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

  // Calculate totals (coerce numeric values)
  const { subTotal, tax, total } = useMemo(() => {
    const subTotal = addedProducts.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);
    const tax = subTotal * 0.12; // 12% VAT
    const total = subTotal + tax;
    
    return { subTotal, tax, total };
  }, [addedProducts]);

  // Helper: Add product to cart (normalize price/qty)
  const addProductToCart = useCallback((cartItem) => {
    const normalized = {
      ...cartItem,
      price: Number(cartItem.price ?? cartItem.unitPrice ?? 0),
      qty: Number(cartItem.qty ?? cartItem.quantity ?? 0),
    };

    setAddedProducts(prev => {
      const existing = prev.find(item => item.variantId === normalized.variantId);
      if (existing) {
        return prev.map(item =>
          item.variantId === normalized.variantId
            ? { ...item, qty: item.qty + normalized.qty, price: normalized.price }
            : item
        );
      }
      return [...prev, normalized];
    });
  }, []);

  // Handle product click - Always show VariantSelectionModal (like V2)
  const handleProductClick = useCallback((productGroup) => {
    // Require customer info before adding products
    if (!customerDetails.name) {
      setAddModalData({
        title: 'Customer Information Required',
        message: 'Please fill in customer information first.',
        type: 'warning',
        details: 'Customer details are required to create a quotation.'
      });
      setShowAddModal(true);
      setCustomerInfoModalOpen(true);
      return;
    }

    if (!productGroup || !productGroup.variants || productGroup.variants.length === 0) {
      console.warn("Invalid product group:", productGroup);
      setAddModalData({
        title: 'Product Unavailable',
        message: 'This product is not available.',
        type: 'error',
        details: ''
      });
      setShowAddModal(true);
      return;
    }

    // Always show VariantSelectionModal for all products (single or multiple variants)
    setQuantity(1);
    setSelectedProductForModal(productGroup);
    setActiveVariantIndex(0);
    setVariantModalOpen(true);
  }, [customerDetails.name]);

  // Handle variant selection from modal
  const handleAddVariant = useCallback(async (selectedQuantity) => {
    if (!selectedProductForModal) return;

    const variant = selectedProductForModal.variants[activeVariantIndex];

    // For quotations, we don't check stock availability - just add the requested quantity
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
      discountPercentage: variant.discountPercentage || 0,
      // Dimension information
      measurementType: variant.measurementType,
      length: variant.length,
      width: variant.width,
      thickness: variant.thickness,
      unitWeightKg: variant.unitWeightKg,
      unitVolumeLiters: variant.unitVolumeLiters
    };

    addProductToCart(cartItem);

    // Close modal
    setVariantModalOpen(false);
    setSelectedProductForModal(null);
    setActiveVariantIndex(0);
    setQuantity(1);

    // Show success feedback
    setAddModalData({
      title: 'Product Added',
      message: `Added ${cartItem.name} x${selectedQuantity} to quotation.`,
      type: 'success',
      details: ''
    });
    setShowAddModal(true);
  }, [selectedProductForModal, activeVariantIndex, addProductToCart]);

  // Handle remove from cart
  const handleRemoveFromCart = useCallback((indexToRemove) => {
    setAddedProducts(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  // Handle customer info submit
  const handleCustomerInfoSubmit = useCallback((info) => {
    setCustomerDetails(info);
    setCustomerInfoModalOpen(false);
  }, []);

  // Handle generate quotation
  const handleGenerateQuotation = useCallback(async () => {
    if (addedProducts.length === 0) {
      setAddModalData({
        title: 'No Products',
        message: 'Please add at least one product to generate a quotation.',
        type: 'warning',
        details: ''
      });
      setShowAddModal(true);
      return;
    }
    
    if (!customerDetails.name) {
      setAddModalData({
        title: 'Customer Information Required',
        message: 'Please enter customer information.',
        type: 'warning',
        details: ''
      });
      setShowAddModal(true);
      setCustomerInfoModalOpen(true);
      return;
    }

    try {
      // Create quotation data using utility
      const quotationData = QuotationUtils.createQuotationData(
        customerDetails,
        addedProducts,
        currentUser,
        {
          discountPercent: 0,
          deliveryFee: 150
        }
      );

      // Helper function to remove undefined values
      const cleanData = (obj) => {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
              cleaned[key] = cleanData(value);
            } else if (Array.isArray(value)) {
              cleaned[key] = value.map(item => 
                typeof item === 'object' ? cleanData(item) : item
              );
            } else {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      };

      // Prepare quotation document with enhanced product info
      const quotationDoc = {
        quotationNumber: quotationData.quotationNumber || '',
        quotationDate: quotationData.formattedDate || '',
        validUntilDate: quotationData.validUntilDate || '',
        
        // Customer Information
        customer: {
          name: quotationData.customer?.name || '',
          company: quotationData.customer?.company || '',
          address: quotationData.customer?.address || '',
          phone: quotationData.customer?.phone || '',
          email: quotationData.customer?.email || '',
          projectName: quotationData.customer?.projectName || ''
        },
        
        // Items with enhanced bundle/sale/dimension information
        items: (quotationData.items || []).map(item => ({
          description: item.name || item.description || '',
          productName: item.baseName || item.name || '',
          variantName: item.variantName || '',
          category: item.category || '',
          unit: item.unit || 'pcs',
          quantity: Number(item.qty || item.quantity) || 0,
          unitPrice: Number(item.price || item.unitPrice) || 0,
          amount: Number((item.price || item.unitPrice) * (item.qty || item.quantity)) || 0,
          variantDetails: item.variantDetails || {},
          // Bundle information
          isBundle: item.isBundle || false,
          piecesPerBundle: item.piecesPerBundle || null,
          bundlePackagingType: item.bundlePackagingType || '',
          bundlePrice: item.bundlePrice || null,
          // Sale/Discount information
          onSale: item.onSale || false,
          originalPrice: item.originalPrice || (item.price || item.unitPrice || 0),
          discountPercentage: item.discountPercentage || 0,
          // Dimension information
          measurementType: item.measurementType || '',
          length: item.length || '',
          width: item.width || '',
          thickness: item.thickness || '',
          unitWeightKg: item.unitWeightKg || '',
          unitVolumeLiters: item.unitVolumeLiters || '',
          size: item.size || '',
          // IDs
          variantId: item.variantId || '',
          baseProductId: item.baseProductId || ''
        })),
        
        // Totals
        totals: {
          subtotal: Number(quotationData.totals?.subtotal) || 0,
          vat: Number(quotationData.totals?.vat) || 0,
          deliveryFee: Number(quotationData.totals?.deliveryFee) || 0,
          discount: Number(quotationData.totals?.discount) || 0,
          grandTotal: Number(quotationData.totals?.grandTotal) || 0
        },
        
        // Sales Representative
        salesRep: {
          name: quotationData.salesRep?.name || currentUser?.displayName || currentUser?.email || 'Unknown',
          position: quotationData.salesRep?.position || 'Sales Representative',
          contact: quotationData.salesRep?.contact || currentUser?.email || ''
        },
        
        // Metadata
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid || 'unknown',
        createdByName: currentUser?.displayName || currentUser?.email || 'Unknown User',
        lastUpdated: serverTimestamp()
      };

      // Clean the data to remove any remaining undefined values
      const cleanedDoc = cleanData(quotationDoc);

      // Save quotation to Firebase
      const quotationRef = doc(db, 'quotations', quotationData.quotationNumber);
      await setDoc(quotationRef, cleanedDoc);

      // Generate HTML content
      const htmlContent = QuotationGenerator.generate(quotationData);

      // Print quotation
      QuotationGenerator.print(htmlContent);

      // Reset state
      setAddedProducts([]);
      setCustomerDetails({ name: '', phone: '', email: '', address: '' });
      setQuotationNumber('');
      
      setAddModalData({
        title: 'Quotation Generated',
        message: `Quotation ${quotationData.quotationNumber} generated and saved successfully!`,
        type: 'success',
        details: ''
      });
      setShowAddModal(true);
    } catch (error) {
      console.error('Error generating quotation:', error);
      setAddModalData({
        title: 'Generation Failed',
        message: 'Failed to generate quotation. Please try again.',
        type: 'error',
        details: error.message
      });
      setShowAddModal(true);
    }
  }, [addedProducts, customerDetails, currentUser, db]);

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
                  disabled={false}
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
              onProductSelect={handleProductClick}
              loading={loadingProducts}
              disabled={false}
            />
          </div>
        </div>
      </div>

      {/* Right Side - Cart & Customer Info */}
      <div className="w-[480px] flex flex-col bg-white shadow-lg">
        {/* Customer Info Section */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Information</h3>
            {customerDetails.name ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{customerDetails.name}</p>
                    {customerDetails.phone && (
                      <p className="text-sm text-gray-600">{customerDetails.phone}</p>
                    )}
                    {customerDetails.email && (
                      <p className="text-sm text-gray-600">{customerDetails.email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setCustomerInfoModalOpen(true)}
                    className="text-xs text-orange-600 hover:text-orange-700 underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCustomerInfoModalOpen(true)}
                className="w-full px-4 py-3 bg-orange-50 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors font-medium"
              >
                + Add Customer Info
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Quotation Items</h3>
              <span className="text-sm text-gray-500">
                {addedProducts.length} {addedProducts.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {addedProducts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base font-medium">No products added</p>
                <p className="text-sm mt-1">Select products to add to quotation</p>
              </div>
            ) : (
              <ProductList
                cartItems={addedProducts}
                onRemoveItem={handleRemoveFromCart}
                isProcessing={false}
              />
            )}
          </div>
        </div>

        {/* Summary & Generate Button */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50">
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₱{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (12%):</span>
                <span className="font-medium">₱{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-green-600">₱{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleGenerateQuotation}
              disabled={addedProducts.length === 0 || !customerDetails.name}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Generate Quotation
            </button>
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

        <CustomerInfoModal
          isOpen={customerInfoModalOpen}
          onClose={() => setCustomerInfoModalOpen(false)}
          onCancel={() => setCustomerInfoModalOpen(false)}
          onSubmit={handleCustomerInfoSubmit}
          initialData={customerDetails}
        />

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
};

export default Pos_Quotation;
