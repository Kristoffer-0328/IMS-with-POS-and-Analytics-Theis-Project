
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import LocationSelectionModal from '../components/Modals/LocationSelectionModal';
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
  const [customerInfoModalOpen, setCustomerInfoModalOpen] = useState(false); // Closed by default

  // Variant Modal States
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // QuickQuantityModal states for location selection
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [selectedVariantForLocation, setSelectedVariantForLocation] = useState(null);
  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

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

  // Group Products (Memoized) - match Pos_NewSale.jsx logic
  const groupedProducts = useMemo(() => {
    const grouped = {};

    products.forEach(product => {
      if (!product || !product.id || !product.name) return;

      // Group by base identity (name, brand, specifications, category)
      const groupKey = `${product.name || 'unknown'}_${product.brand || 'generic'}_${product.specifications || ''}_${product.category || ''}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          id: product.id, // Add id for cart logic
          name: product.name,
          brand: product.brand || 'Generic',
          category: product.category,
          specifications: product.specifications || '',
          image: product.image || product.imageUrl || null,
          variants: [],
          hasVariants: false,
          allLocations: [],
        };
      }

      // Consolidate variants by size/unit
      const variantKey = `${product.size || ''}_${product.unit || ''}`;
      let variant = grouped[groupKey].variants.find(v => v.size === product.size && v.unit === product.unit);
      if (!variant) {
        // Always set both price and unitPrice, fallback to 0 if missing
        const resolvedPrice = Number(product.unitPrice ?? product.price ?? 0);
        variant = {
          variantId: product.id,
          baseProductId: product.parentProductId || product.id,
          size: product.size || '',
          unit: product.unit || 'pcs',
          price: resolvedPrice,
          unitPrice: Number(product.unitPrice ?? product.price ?? 0),
          quantity: 0,
          image: product.image || product.imageUrl || null,
          locations: [],
          storageLocation: product.storageLocation,
          shelfName: product.shelfName,
          rowName: product.rowName,
          columnIndex: product.columnIndex,
          fullLocation: product.fullLocation,
        };
        grouped[groupKey].variants.push(variant);
      }
      // Always update price and unitPrice in case product data changes
      variant.price = Number(product.unitPrice ?? product.price ?? variant.price ?? 0);
      variant.unitPrice = Number(product.unitPrice ?? product.price ?? variant.unitPrice ?? 0);
      variant.quantity += Number(product.quantity) || 0;
      variant.locations.push({
        storageLocation: product.storageLocation,
        shelfName: product.shelfName,
        rowName: product.rowName,
        columnIndex: product.columnIndex,
        fullLocation: product.fullLocation,
        quantity: Number(product.quantity) || 0,
      });

      // Collect all locations for the group
      grouped[groupKey].allLocations.push({
        size: product.size || '',
        unit: product.unit || 'pcs',
        storageLocation: product.storageLocation,
        shelfName: product.shelfName,
        rowName: product.rowName,
        columnIndex: product.columnIndex,
        fullLocation: product.fullLocation,
        quantity: Number(product.quantity) || 0,
      });
    });

    // Mark hasVariants if more than 1 variant
    Object.values(grouped).forEach(group => {
      group.hasVariants = group.variants.length > 1;
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
      setSelectedProductForQuantity(productGroup);
      setQuickQuantityModalOpen(true);
    }
  };

  // Handle variant selection
  const handleAddVariant = () => {
    if (!selectedProduct || !selectedProduct.variants) return;
    
    const variant = selectedProduct.variants[activeVariantIndex];
    
    // Check if this variant exists in multiple locations
    const variantLocations = selectedProduct.allLocations?.filter(loc => 
      loc.size === variant.size && loc.unit === variant.unit
    ) || [];
    
    // Close variant modal first
    setVariantModalOpen(false);
    
    if (variantLocations.length > 1) {
      // Multiple locations - show location picker
      setPendingQuantity(quantity);
      setSelectedProductForModal(selectedProduct);
      setSelectedVariantForLocation(variant);
      setLocationModalOpen(true);
    } else {
      // Single location - add directly
      const locationVariant = variantLocations[0] || variant;
      const cartQty = getCartItemQuantity(selectedProduct.id, locationVariant.variantId);
      const availableQty = locationVariant.quantity - cartQty;

      if (availableQty < quantity) {
          alert(`Cannot add ${quantity} items. Only ${availableQty} available.`);
          setVariantModalOpen(true); // Reopen modal
          return;
      }

      const displayName = locationVariant.size || locationVariant.unit 
        ? `${selectedProduct.name} (${locationVariant.size || ''} ${locationVariant.unit || ''})`.trim()
        : selectedProduct.name;

      addProduct({
        id: locationVariant.variantId,
        name: displayName,
        baseName: selectedProduct.name,
        price: locationVariant.price,
        qty: quantity,
        variantId: locationVariant.variantId,
        category: selectedProduct.category,
        baseProductId: locationVariant.baseProductId,
        storageLocation: locationVariant.storageLocation,
        shelfName: locationVariant.shelfName,
        rowName: locationVariant.rowName,
        columnIndex: locationVariant.columnIndex,
        fullLocation: locationVariant.fullLocation
      });

      setSelectedProduct(null);
      setActiveVariantIndex(0);
      setQuantity(1);
    }
  };

  // Handle add to cart from QuickQuantityModal
  // Helper: Add product to cart
  const addProduct = (cartItem) => {
    setAddedProducts(prev => {
      const existing = prev.find(item => item.id === cartItem.id);
      if (existing) {
        return prev.map(item =>
          item.id === cartItem.id
            ? { ...item, qty: item.qty + cartItem.qty }
            : item
        );
      }
      return [...prev, cartItem];
    });
  };

  // Helper: Get cart item quantity for a variant
  const getCartItemQuantity = (productId, variantId) => {
    const item = addedProducts.find(item => item.productId === productId && item.id === variantId);
    return item ? item.qty : 0;
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

  // Handle location selection from LocationSelectionModal
  const handleSelectLocation = useCallback((locationData) => {
    if (!selectedProductForModal) {
      console.error("Invalid location selection - no product selected");
      return;
    }

    // Check if locationData is an array (multi-location) or single object
    if (Array.isArray(locationData)) {
      // Multi-location allocation
      console.log('Multi-location selection:', locationData);
      
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

      {quickQuantityModalOpen && selectedProductForQuantity && (
        <QuickQuantityModal
          product={selectedProductForQuantity}
          maxQuantity={selectedProductForQuantity.maxAvailableQty || selectedProductForQuantity.variants[0].quantity}
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
              // Always show location selection modal for multi-location products
              setQuickQuantityModalOpen(false);
              setPendingQuantity(quantity);
              setSelectedProductForModal(selectedProductForQuantity);
              setSelectedVariantForLocation(variant);
              setLocationModalOpen(true);
            } else {
              // Single location - add directly
              const locationVariant = variantLocations[0] || variant;
              const cartQty = getCartItemQuantity(selectedProductForQuantity.id, locationVariant.variantId || locationVariant.id);
              if (cartQty + quantity > locationVariant.quantity) {
                alert(`Cannot add ${quantity} items. Only ${locationVariant.quantity - cartQty} available.`);
                return;
              }
              const displayName = locationVariant.size || locationVariant.unit
                ? `${selectedProductForQuantity.name} (${locationVariant.size || ''} ${locationVariant.unit || ''})`.trim()
                : selectedProductForQuantity.name;
              addProduct({
                id: locationVariant.variantId || locationVariant.id,
                name: displayName,
                baseName: selectedProductForQuantity.name,
                price: Number(locationVariant?.price ?? locationVariant?.unitPrice ?? variant?.price ?? variant?.unitPrice ?? 0),
                qty: quantity,
                variantId: locationVariant.variantId || locationVariant.id,
                unit: locationVariant.unit,
                category: selectedProductForQuantity.category,
                baseProductId: locationVariant.baseProductId || selectedProductForQuantity.id,
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

      {/* Location Selection Modal for multi-location products */}
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

      <CustomerInfoModal
        isOpen={customerInfoModalOpen}
        onClose={() => setCustomerInfoModalOpen(false)}
        onCancel={() => setCustomerInfoModalOpen(false)}
        onSubmit={handleCustomerInfoSubmit}
        initialData={customerDetails}
      />
    </div>
  );
};

export default Pos_Quotation;
