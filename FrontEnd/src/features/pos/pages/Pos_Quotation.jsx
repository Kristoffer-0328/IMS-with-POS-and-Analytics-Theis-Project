import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../../../services/firebase/ProductServices';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { getFormattedDateTime } from '../utils/DateTimeFormatter';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import app from '../../../FirebaseConfig';

// Import Components
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';
import ProductList from '../components/Cart';
import ProductFilters from '../components/ProductFilters';
import VariantSelectionModal from '../components/Modals/VariantSelectionModal';
import QuickQuantityModal from '../components/QuickQuantityModal';
import CustomerInfoModal from '../components/quotation/CustomerInfoModal';
import QuotationGenerator from '../components/quotation/QuotationGenerator';
import QuotationUtils from '../utils/quotationUtils';

const Pos_Quotation = () => {
  const { listenToProducts } = useServices();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const db = getFirestore(app);
  
  // Product State
  const [products, setProduct] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [addedProducts, setAddedProducts] = useState([]);
  
  // Modal States
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [quickQuantityModalOpen, setQuickQuantityModalOpen] = useState(false);
  const [customerInfoModalOpen, setCustomerInfoModalOpen] = useState(true); // Open by default
  
  // Variant Modal States
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  // Customer Info State
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  
  // Date Time
  const { formattedDate, formattedTime } = getFormattedDateTime();

  // Listen to products
  useEffect(() => {
    const unsubscribe = listenToProducts(setProduct);
    return () => unsubscribe();
  }, [listenToProducts]);

  // Group Products (Memoized)
  // UPDATED: Products are now flat - variants are separate products with isVariant: true
  // Only show ONE card per product group (base product), include variants in variants array
  const groupedProducts = useMemo(() => {
    const grouped = {};

    products.forEach(product => {
      if (!product || !product.id || !product.name) {
        console.warn("Skipping invalid product data:", product);
        return;
      }
  
      // Skip variant products at the root level - they'll be added to their parent
      if (product.isVariant) {
        return;
      }
  
      // Use product ID as unique key to avoid duplicates
      const uniqueKey = product.id;
  
      if (!grouped[uniqueKey]) {
        grouped[uniqueKey] = {
          id: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand || 'Generic',
          quantity: product.quantity || 0,
          variants: [],
          image: product.image || product.imageUrl || null,
          hasVariants: false
        };
        
        // Always add base product as first variant
        grouped[uniqueKey].variants.push({
          variantId: product.id,
          baseProductId: product.id,
          category: product.category,
          brand: product.brand || 'Generic',
          size: product.size || '',
          unit: product.unit || 'pcs',
          price: Number(product.unitPrice) || 0,
          quantity: Number(product.quantity) || 0,
          image: product.image || product.imageUrl || null,
          storageLocation: product.storageLocation,
          shelfName: product.shelfName,
          rowName: product.rowName,
          columnIndex: product.columnIndex,
          fullLocation: product.fullLocation
        });
      }
    });

    // Second pass: Add variant products to their parent base products
    products.forEach(product => {
      if (product.isVariant && product.parentProductId) {
        // Find the parent base product
        const parentKey = product.parentProductId;
        
        if (grouped[parentKey]) {
          grouped[parentKey].variants.push({
            variantId: product.id,
            baseProductId: product.parentProductId,
            category: product.category,
            brand: product.brand || 'Generic',
            size: product.size || product.variantName || '',
            unit: product.unit || 'pcs',
            price: Number(product.unitPrice) || 0,
            quantity: Number(product.quantity) || 0,
            image: product.image || product.imageUrl || grouped[parentKey].image || null,
            storageLocation: product.storageLocation,
            shelfName: product.shelfName,
            rowName: product.rowName,
            columnIndex: product.columnIndex,
            fullLocation: product.fullLocation
          });
          
          // Mark as having variants if more than 1 variant exists
          grouped[parentKey].hasVariants = grouped[parentKey].variants.length > 1;
        }
      }
    });

    return Object.values(grouped);
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return groupedProducts.filter((product) => {
      const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.brand?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesBrand = !selectedBrand || product.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [groupedProducts, searchQuery, selectedCategory, selectedBrand]);

  // Calculate totals
  const subTotal = addedProducts.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subTotal * 0.12; // 12% VAT
  const total = subTotal + tax;

  // Handle product click
  const handleProductClick = (productGroup) => {
    // Require customer info before adding products
    if (!customerDetails.name) {
      alert('Please fill in customer information first.');
      setCustomerInfoModalOpen(true);
      return;
    }

    if (!productGroup || !productGroup.variants) {
      console.warn("Invalid product group:", productGroup);
      return;
    }

    // Check if variants have different sizes/units (ignoring brand differences)
    const uniqueSizeUnits = new Set(productGroup.variants.map(v => `${v.size || ''}|${v.unit || ''}`));
    const hasSizeOrUnitVariants = uniqueSizeUnits.size > 1;
    
    // Check if variants have different brands
    const uniqueBrands = new Set(productGroup.variants.map(v => v.brand));
    const hasBrandVariants = uniqueBrands.size > 1;

    if (hasSizeOrUnitVariants || hasBrandVariants) {
      // Show variant selection modal if there are different sizes/units or brands
      setQuantity(1);
      setSelectedProduct(productGroup);
      setActiveVariantIndex(0);
      setVariantModalOpen(true);
    } else if (productGroup.variants.length === 1) {
      // Show quick quantity modal for single variant products
      setSelectedProduct(productGroup);
      setQuickQuantityModalOpen(true);
    }
  };

  // Handle variant selection
  const handleAddVariant = () => {
    if (!selectedProduct || !selectedProduct.variants) return;
    
    const variant = selectedProduct.variants[activeVariantIndex];
    const price = variant?.price || 0;
    
    // Create display name with size/unit
    const displayName = variant.size || variant.unit 
      ? `${selectedProduct.name} (${variant.size || ''} ${variant.unit || ''})`.trim()
      : selectedProduct.name;
    
    const cartItem = {
      id: variant.variantId,
      name: displayName,
      baseName: selectedProduct.name,
      category: selectedProduct.category,
      price: price,
      qty: quantity,
      unit: variant?.unit || 'pcs',
      variantDetails: {
        size: variant.size,
        type: variant.type,
        unit: variant.unit
      },
      productId: selectedProduct.id,
      variantIndex: activeVariantIndex
    };

    setAddedProducts(prev => {
      const existing = prev.find(item => item.id === cartItem.id);
      if (existing) {
        return prev.map(item => 
          item.id === cartItem.id 
            ? { ...item, qty: item.qty + quantity }
            : item
        );
      }
      return [...prev, cartItem];
    });

    // Reset and close modal
    setVariantModalOpen(false);
    setSelectedProduct(null);
    setActiveVariantIndex(0);
    setQuantity(1);
  };

  // Handle add to cart from QuickQuantityModal
  const handleAddToCart = (product, quantity) => {
    if (!product || !product.variants || product.variants.length === 0) return;
    
    const variant = product.variants[0];
    const price = variant?.price || 0;
    
    const displayName = variant.size || variant.unit 
      ? `${product.name} (${variant.size || ''} ${variant.unit || ''})`.trim()
      : product.name;
    
    const cartItem = {
      id: variant.variantId,
      name: displayName,
      category: product.category,
      price: price,
      qty: quantity,
      unit: variant?.unit || 'pcs',
      variantDetails: {
        size: variant.size,
        type: variant.type,
        unit: variant.unit
      },
      productId: product.id,
      variantIndex: 0
    };

    setAddedProducts(prev => {
      const existing = prev.find(item => item.id === cartItem.id);
      if (existing) {
        return prev.map(item => 
          item.id === cartItem.id 
            ? { ...item, qty: item.qty + quantity }
            : item
        );
      }
      return [...prev, cartItem];
    });

    setQuickQuantityModalOpen(false);
    setSelectedProduct(null);
  };

  // Handle update quantity in cart
  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      setAddedProducts(prev => prev.filter(item => item.id !== itemId));
    } else {
      setAddedProducts(prev =>
        prev.map(item => item.id === itemId ? { ...item, qty: newQuantity } : item)
      );
    }
  };

  // Handle remove from cart
  const handleRemoveFromCart = (itemId) => {
    setAddedProducts(prev => prev.filter(item => item.id !== itemId));
  };

  // Handle customer info submit
  const handleCustomerInfoSubmit = (info) => {
    setCustomerDetails(info);
    setCustomerInfoModalOpen(false);
  };

  // Handle generate quotation
  const handleGenerateQuotation = async () => {
    if (addedProducts.length === 0) {
      alert('Please add at least one product to generate a quotation.');
      return;
    }
    
    if (!customerDetails.name) {
      alert('Please enter customer information.');
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

      // Prepare quotation document
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
        
        // Items
        items: (quotationData.items || []).map(item => ({
          description: item.name || item.description || '',
          category: item.category || '',
          unit: item.unit || 'pcs',
          quantity: Number(item.qty || item.quantity) || 0,
          unitPrice: Number(item.price || item.unitPrice) || 0,
          amount: Number((item.price || item.unitPrice) * (item.qty || item.quantity)) || 0,
          variantDetails: item.variantDetails || {}
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
      
      alert('Quotation generated and saved successfully!');
    } catch (error) {
      console.error('Error generating quotation:', error);
      alert('Failed to generate quotation. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quotation</h1>
            <p className="text-sm text-gray-600">Create a quotation for customer</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {formattedDate} | {formattedTime.hours}:{formattedTime.minutes}:{formattedTime.seconds}
            </div>
            <div className="text-sm font-medium text-gray-800">
              {currentUser?.displayName || currentUser?.email || 'Cashier'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Products */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4">
            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <ProductFilters
              products={products}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedBrand={selectedBrand}
              setSelectedBrand={setSelectedBrand}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <ProductGrid
              products={filteredProducts}
              onProductSelect={handleProductClick}
              loading={false}
              disabled={false}
            />
          </div>
        </div>

        {/* Right Side - Cart & Customer Info */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          {/* Customer Info Section */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Customer Information</h3>
            {customerDetails.name ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
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
                className="w-full px-4 py-3 bg-orange-50 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
              >
                + Add Customer Info
              </button>
            )}
          </div>

          {/* Cart Section */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Quotation Items</h3>
            {addedProducts.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No products added</p>
                <p className="text-sm">Select products to add to quotation</p>
              </div>
            ) : (
              <ProductList
                cartItems={addedProducts}
                onRemoveItem={(index) => handleRemoveFromCart(addedProducts[index].id)}
                onUpdateQuantity={(index, newQty) => handleUpdateQuantity(addedProducts[index].id, newQty)}
                isProcessing={false}
              />
            )}
          </div>

          {/* Summary & Generate Button */}
          <div className="border-t border-gray-200 p-4 space-y-3">
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
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {variantModalOpen && selectedProduct && (
        <VariantSelectionModal
          product={selectedProduct}
          activeVariantIndex={activeVariantIndex}
          setActiveVariantIndex={setActiveVariantIndex}
          qty={quantity}
          setQty={setQuantity}
          onAddVariant={handleAddVariant}
          onClose={() => {
            setVariantModalOpen(false);
            setSelectedProduct(null);
            setActiveVariantIndex(0);
            setQuantity(1);
          }}
        />
      )}

      {quickQuantityModalOpen && selectedProduct && (
        <QuickQuantityModal
          product={selectedProduct}
          maxQuantity={selectedProduct?.variants?.[0]?.quantity || 0}
          onClose={() => {
            setQuickQuantityModalOpen(false);
            setSelectedProduct(null);
          }}
          onAddToCart={handleAddToCart}
        />
      )}

      <CustomerInfoModal
        isOpen={customerInfoModalOpen}
        onClose={() => setCustomerInfoModalOpen(false)}
        onCancel={() => !customerDetails.name ? navigate('/pos/newsale') : setCustomerInfoModalOpen(false)}
        onSubmit={handleCustomerInfoSubmit}
        initialData={customerDetails}
      />
    </div>
  );
};

export default Pos_Quotation;
