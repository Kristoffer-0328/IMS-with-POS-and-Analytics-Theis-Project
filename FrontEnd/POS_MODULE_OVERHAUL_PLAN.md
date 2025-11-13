# POS Module Overhaul Plan - Product & Variant Architecture

## 🎯 Overview

This document outlines the complete overhaul of the POS (Point of Sale) module to align with the new **Product & Variant architecture**. The current POS system treats products and variants inconsistently, leading to confusion in stock management, pricing, and transaction recording.

**Goal:** Refactor the POS module to work seamlessly with the new flat **Products** and **Variants** collections, where:
- **Products** contain only general information (name, brand, category, description, image)
- **Variants** are separate entities with stock, location, price, and specifications
- All POS operations (search, selection, cart, checkout) reference variant IDs

---

## 📊 Current POS Architecture (Problems)

### Data Structure Issues

#### Current Product Grouping
```javascript
// Current: Products are grouped by base identity
const groupedProducts = {
  "Portland Cement_Republic Cement": {
    id: "PROD_001",
    name: "Portland Cement",
    variants: [
      { size: "40kg", quantity: 200, price: 255 },
      { size: "25kg", quantity: 150, price: 165 }
    ],
    allLocations: [...] // Mixed with variants
  }
}
```

**Problems:**
- ❌ Products and variants are nested and complex
- ❌ Stock is mixed between base product and variants
- ❌ Location data is inconsistent
- ❌ Variant selection is confusing (size vs brand vs location)
- ❌ Cart items reference generic IDs, not actual Firestore document IDs
- ❌ Inventory deduction logic is overly complex
- ❌ Multi-location handling is error-prone

#### Current Cart Structure
```javascript
// Current cart item
{
  id: "PROD_001_40kg_pcs", // Generic ID
  name: "Portland Cement (40kg Bag)",
  variantId: "PROD_001_40kg_pcs", // Generic
  actualProductId: "VAR_001", // Buried property
  price: 255,
  qty: 10,
  storageLocation: "Unit 03"
}
```

**Problems:**
- ❌ Uses generic variant IDs for matching
- ❌ Actual Firestore document ID is hidden in `actualProductId`
- ❌ Complex ID normalization required
- ❌ Difficult to track which exact variant was sold

---

## ✅ New POS Architecture (Solution)

### New Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     POS WORKFLOW                            │
└─────────────────────────────────────────────────────────────┘

1. SEARCH & BROWSE
   ├─ Search queries Products collection by name/brand/category
   ├─ Display products grouped by base product
   └─ Show variant count per product

2. PRODUCT SELECTION
   ├─ User clicks on product
   ├─ Load all variants for this product (from Variants collection)
   ├─ Display variants with:
   │  ├─ Variant name (40kg Bag, 25kg Bag, etc.)
   │  ├─ Stock available
   │  ├─ Price
   │  └─ Location (optional)
   └─ User selects specific variant

3. CART MANAGEMENT
   ├─ Cart items reference actual Variant document IDs
   ├─ Each cart item stores:
   │  ├─ variantId: "VAR_CEM_001_40KG"
   │  ├─ parentProductId: "PROD_CEM_001"
   │  ├─ variantName: "40kg Bag"
   │  ├─ quantity: 10
   │  └─ unitPrice: 255
   └─ Simple quantity validation against Variant.quantity

4. CHECKOUT & TRANSACTION
   ├─ Validate stock availability
   ├─ Create Transaction document with variant IDs
   ├─ Deduct stock from Variant documents
   └─ Update sales history in Variant documents
```

---

## 🔄 Detailed Refactoring Plan

### Phase 1: Update Data Services

#### 1.1 Create POS-Specific Services

**File: `src/features/pos/services/POSProductServices.js`**

```javascript
import { 
  collection, query, where, getDocs, getDoc, doc 
} from 'firebase/firestore';
import { db } from '../../../FirebaseConfig';

/**
 * Search products for POS
 * @param {string} searchTerm - Search query
 * @param {string} category - Filter by category (optional)
 * @returns {Promise<Array>} Products with variant count
 */
export const searchPOSProducts = async (searchTerm = '', category = null) => {
  try {
    const productsRef = collection(db, 'Products');
    let q = query(productsRef);
    
    if (category) {
      q = query(productsRef, where('category', '==', category));
    }
    
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Client-side search filtering
    const filtered = searchTerm
      ? products.filter(p => 
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : products;
    
    // Get variant counts for each product
    const productsWithCounts = await Promise.all(
      filtered.map(async (product) => {
        const variantsQuery = query(
          collection(db, 'Variants'),
          where('parentProductId', '==', product.id)
        );
        const variantsSnap = await getDocs(variantsQuery);
        
        // Calculate total stock and price range
        const variants = variantsSnap.docs.map(d => d.data());
        const totalStock = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
        const prices = variants.map(v => v.unitPrice).filter(p => p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
        
        return {
          ...product,
          variantCount: variantsSnap.size,
          totalStock,
          minPrice,
          maxPrice,
          priceRange: minPrice === maxPrice 
            ? `₱${minPrice.toFixed(2)}` 
            : `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`
        };
      })
    );
    
    return productsWithCounts;
  } catch (error) {
    console.error('Error searching POS products:', error);
    throw error;
  }
};

/**
 * Get all variants for a specific product
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} Variants for this product
 */
export const getProductVariants = async (productId) => {
  try {
    const variantsQuery = query(
      collection(db, 'Variants'),
      where('parentProductId', '==', productId)
    );
    
    const snapshot = await getDocs(variantsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      variantId: doc.id, // Use document ID as variantId
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching product variants:', error);
    throw error;
  }
};

/**
 * Get a specific variant by ID
 * @param {string} variantId - Variant document ID
 * @returns {Promise<object>} Variant data
 */
export const getVariant = async (variantId) => {
  try {
    const variantRef = doc(db, 'Variants', variantId);
    const variantSnap = await getDoc(variantRef);
    
    if (!variantSnap.exists()) {
      throw new Error(`Variant ${variantId} not found`);
    }
    
    return {
      id: variantSnap.id,
      variantId: variantSnap.id,
      ...variantSnap.data()
    };
  } catch (error) {
    console.error('Error fetching variant:', error);
    throw error;
  }
};

/**
 * Check variant stock availability
 * @param {string} variantId - Variant document ID
 * @param {number} requestedQty - Requested quantity
 * @returns {Promise<object>} Availability status
 */
export const checkVariantAvailability = async (variantId, requestedQty) => {
  try {
    const variant = await getVariant(variantId);
    const available = variant.quantity || 0;
    
    return {
      available,
      isAvailable: available >= requestedQty,
      shortage: Math.max(0, requestedQty - available)
    };
  } catch (error) {
    console.error('Error checking variant availability:', error);
    throw error;
  }
};
```

#### 1.2 Update Transaction Service

**File: `src/features/pos/services/POSTransactionService.js`**

```javascript
import {
  collection, doc, runTransaction, serverTimestamp, getDoc
} from 'firebase/firestore';
import { db } from '../../../FirebaseConfig';

/**
 * Process POS sale with new variant structure
 * @param {Array} cartItems - Cart items with variant IDs
 * @param {object} transactionDetails - Customer, payment, etc.
 * @param {object} currentUser - Current user object
 * @returns {Promise<object>} Transaction result
 */
export const processPOSSale = async (cartItems, transactionDetails, currentUser) => {
  try {
    // 1. Validate cart items
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }
    
    // 2. Pre-fetch all variants to check availability
    const variantChecks = await Promise.all(
      cartItems.map(async (item) => {
        const variantRef = doc(db, 'Variants', item.variantId);
        const variantSnap = await getDoc(variantRef);
        
        if (!variantSnap.exists()) {
          throw new Error(`Variant not found: ${item.variantName}`);
        }
        
        const variantData = variantSnap.data();
        const available = variantData.quantity || 0;
        
        if (available < item.qty) {
          throw new Error(
            `Insufficient stock for ${item.variantName}. ` +
            `Available: ${available}, Requested: ${item.qty}`
          );
        }
        
        return {
          variantRef,
          variantData,
          cartItem: item
        };
      })
    );
    
    // 3. Generate transaction ID
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const transactionId = `TXN-${year}${month}${day}-${random}`;
    
    // 4. Execute Firestore transaction
    const result = await runTransaction(db, async (transaction) => {
      // Update each variant's stock
      for (const check of variantChecks) {
        const { variantRef, variantData, cartItem } = check;
        
        const newQuantity = (variantData.quantity || 0) - cartItem.qty;
        
        // Update sales history
        const salesHistory = variantData.salesHistory || [];
        salesHistory.push({
          transactionId,
          quantity: cartItem.qty,
          timestamp: new Date().toISOString(),
          performedBy: currentUser?.uid || 'unknown'
        });
        
        // Keep only last 90 days of sales history
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const filteredHistory = salesHistory.filter(
          sale => new Date(sale.timestamp) >= ninetyDaysAgo
        );
        
        // Update variant
        transaction.update(variantRef, {
          quantity: newQuantity,
          salesHistory: filteredHistory,
          lastSale: {
            transactionId,
            quantity: cartItem.qty,
            timestamp: serverTimestamp(),
            performedBy: currentUser?.uid || 'unknown'
          },
          updatedAt: serverTimestamp()
        });
      }
      
      // Create transaction document
      const transactionRef = doc(collection(db, 'Transactions'));
      const transactionData = {
        transactionId,
        receiptNumber: `RCP-${year}${month}${day}-${random}`,
        
        // Customer info
        customerId: transactionDetails.customerId,
        customerName: transactionDetails.customerName,
        customerPhone: transactionDetails.customerPhone || '',
        customerAddress: transactionDetails.customerAddress || '',
        
        // Items sold
        items: cartItems.map(item => ({
          variantId: item.variantId,
          parentProductId: item.parentProductId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.qty,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.qty,
          category: item.category || ''
        })),
        
        // Payment details
        subTotal: transactionDetails.subTotal,
        tax: transactionDetails.tax,
        discount: transactionDetails.discount || 0,
        total: transactionDetails.total,
        amountPaid: transactionDetails.amountPaid,
        change: transactionDetails.change,
        paymentMethod: transactionDetails.paymentMethod,
        paymentReference: transactionDetails.paymentReference || '',
        
        // Cashier info
        cashierId: currentUser?.uid || 'unknown',
        cashierName: currentUser?.displayName || currentUser?.email || 'Unknown',
        
        // Timestamps
        saleDate: now.toISOString().split('T')[0],
        saleTime: now.toTimeString().split(' ')[0],
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      transaction.set(transactionRef, transactionData);
      
      return {
        success: true,
        transactionId,
        receiptNumber: transactionData.receiptNumber,
        transactionData: {
          ...transactionData,
          timestamp: now // Use client timestamp for receipt display
        }
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error processing POS sale:', error);
    throw error;
  }
};
```

---

### Phase 2: Refactor POS Components

#### 2.1 Update ProductGrid Component

**File: `src/features/pos/components/ProductGrid.jsx`**

```javascript
import React from 'react';
import { FiPackage, FiPlus } from 'react-icons/fi';

const ProductCard = ({ product, onSelect, disabled }) => {
  const hasMultipleVariants = product.variantCount > 1;
  const isOutOfStock = product.totalStock === 0;
  
  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all 
      ${isOutOfStock ? 'opacity-60' : ''}`}
    >
      {/* Image */}
      <div className="aspect-square relative overflow-hidden bg-gray-50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <FiPackage size={40} />
          </div>
        )}
        {hasMultipleVariants && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
            {product.variantCount} variants
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      
      {/* Details */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-1">{product.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-1">{product.brand}</p>
        
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-orange-600 font-medium">
              {product.priceRange}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Stock: {product.totalStock}
            </p>
          </div>
          
          <button
            onClick={() => onSelect(product)}
            disabled={disabled || isOutOfStock}
            className={`p-2 rounded-lg transition-colors ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            }`}
          >
            <FiPlus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductGrid = ({ products, onProductSelect, loading, disabled }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-xl mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
        <p className="mt-1 text-sm text-gray-500">
          No products match your search or filter.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onProductSelect}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
```

#### 2.2 Update VariantSelectionModal

**File: `src/features/pos/components/Modals/VariantSelectionModal.jsx`**

```javascript
import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

const formatCurrency = (amount) => {
  return `₱${Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const VariantSelectionModal = ({ 
  product, 
  variants, 
  onSelect, 
  onClose 
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.variantId || null
  );
  const [quantity, setQuantity] = useState(1);
  
  const selectedVariant = variants.find(v => v.variantId === selectedVariantId);
  const maxQty = selectedVariant?.quantity || 0;
  
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(Math.min(maxQty, Math.max(1, value)));
  };
  
  const handleAddToCart = () => {
    if (!selectedVariant) return;
    
    onSelect({
      variantId: selectedVariant.variantId,
      parentProductId: product.id,
      productName: product.name,
      variantName: selectedVariant.variantName,
      unitPrice: selectedVariant.unitPrice,
      quantity,
      category: product.category,
      storageLocation: selectedVariant.storageLocation,
      shelfName: selectedVariant.shelfName,
      rowName: selectedVariant.rowName,
      columnIndex: selectedVariant.columnIndex
    });
    
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-medium">{product.name}</h3>
            <p className="text-sm text-gray-500">{product.brand}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <FiX size={20} />
          </button>
        </div>

        {/* Variant List */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="space-y-2">
            {variants.map((variant) => (
              <button
                key={variant.variantId}
                onClick={() => setSelectedVariantId(variant.variantId)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  selectedVariantId === variant.variantId
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {variant.variantName}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {variant.storageLocation} - {variant.shelfName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Stock: {variant.quantity} units
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-orange-600">
                      {formatCurrency(variant.unitPrice)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Selection */}
        {selectedVariant && (
          <div className="p-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 border rounded-lg bg-gray-50"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                min="1"
                max={maxQty}
                className="flex-1 px-3 py-2 border rounded-lg text-center"
              />
              <button
                onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                className="px-4 py-2 border rounded-lg bg-gray-50"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Max: {maxQty} units available
            </p>
          </div>
        )}

        {/* Total & Add Button */}
        {selectedVariant && (
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">Total:</span>
              <span className="text-lg font-bold text-orange-600">
                {formatCurrency(selectedVariant.unitPrice * quantity)}
              </span>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={quantity < 1 || quantity > maxQty}
              className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 
                font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariantSelectionModal;
```

#### 2.3 Update Cart Component

**File: `src/features/pos/components/Cart.jsx`**

```javascript
import React from 'react';
import { FiTrash2, FiMapPin } from 'react-icons/fi';

const formatCurrency = (amount) => {
  return `₱${Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const Cart = ({ cartItems, onRemoveItem, onUpdateQuantity, isProcessing }) => {
  if (cartItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">Cart is empty</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cartItems.map((item, index) => (
        <div
          key={`${item.variantId}-${index}`}
          className="border border-gray-200 rounded-lg overflow-hidden bg-white"
        >
          <div className="p-3">
            {/* Product Name */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm">
                  {item.productName}
                </h4>
                <p className="text-xs text-gray-600">
                  {item.variantName}
                </p>
              </div>
              <button
                onClick={() => onRemoveItem(index)}
                disabled={isProcessing}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiTrash2 size={14} />
              </button>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <FiMapPin size={12} />
              <span>{item.storageLocation} - {item.shelfName}</span>
            </div>

            {/* Quantity & Price */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                  disabled={isProcessing || item.quantity <= 1}
                  className="w-6 h-6 rounded border flex items-center justify-center 
                    text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  −
                </button>
                <span className="text-sm font-medium w-8 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                  disabled={isProcessing}
                  className="w-6 h-6 rounded border flex items-center justify-center 
                    text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  +
                </button>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-gray-500">
                  {formatCurrency(item.unitPrice)} × {item.quantity}
                </div>
                <div className="font-semibold text-orange-600">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Cart;
```

---

### Phase 3: Update Main POS Page

#### 3.1 Refactor Pos_NewSale.jsx

**Key Changes:**

1. **Remove complex product grouping logic**
2. **Use new POSProductServices for search**
3. **Simplify variant selection**
4. **Use variant IDs directly in cart**
5. **Update transaction processing**

**File: `src/features/pos/pages/Pos_NewSale.jsx`**

```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/services/FirebaseAuth';

// Import new services
import { 
  searchPOSProducts, 
  getProductVariants 
} from '../services/POSProductServices';
import { processPOSSale } from '../services/POSTransactionService';

// Components
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import VariantSelectionModal from '../components/Modals/VariantSelectionModal';
import OrderSummary from '../components/OrderSummary';
import PaymentSection from '../components/PaymentSection';
import ReceiptModal from '../components/Modals/ReceiptModal';

export default function Pos_NewSale() {
  const { currentUser } = useAuth();
  
  // State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Cart state
  const [cartItems, setCartItems] = useState([]);
  
  // Modal state
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productVariants, setProductVariants] = useState([]);
  
  // Payment state
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  
  // Fetch products
  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);
  
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await searchPOSProducts('', selectedCategory);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };
  
  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name?.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);
  
  // Handle product selection
  const handleProductSelect = async (product) => {
    if (isProcessing) return;
    
    try {
      // Fetch variants for this product
      const variants = await getProductVariants(product.id);
      
      if (variants.length === 0) {
        alert('This product has no variants available');
        return;
      }
      
      if (variants.length === 1) {
        // Single variant - add directly to cart
        const variant = variants[0];
        addToCart({
          variantId: variant.variantId,
          parentProductId: product.id,
          productName: product.name,
          variantName: variant.variantName,
          unitPrice: variant.unitPrice,
          quantity: 1,
          category: product.category,
          storageLocation: variant.storageLocation,
          shelfName: variant.shelfName,
          rowName: variant.rowName,
          columnIndex: variant.columnIndex
        });
      } else {
        // Multiple variants - show selection modal
        setSelectedProduct(product);
        setProductVariants(variants);
        setVariantModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      alert('Failed to load product variants');
    }
  };
  
  // Add item to cart
  const addToCart = (item) => {
    setCartItems(prevItems => {
      // Check if variant already in cart
      const existingIndex = prevItems.findIndex(
        i => i.variantId === item.variantId
      );
      
      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity
        };
        return updated;
      }
      
      // Add new item
      return [...prevItems, item];
    });
  };
  
  // Remove from cart
  const handleRemoveFromCart = (index) => {
    setCartItems(prevItems => prevItems.filter((_, i) => i !== index));
  };
  
  // Update cart quantity
  const handleUpdateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(index);
      return;
    }
    
    setCartItems(prevItems => {
      const updated = [...prevItems];
      updated[index] = {
        ...updated[index],
        quantity: newQuantity
      };
      return updated;
    });
  };
  
  // Calculate totals
  const subTotal = cartItems.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity), 
    0
  );
  const tax = subTotal * 0.12;
  const total = subTotal + tax - discount;
  
  // Handle checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert('Cart is empty');
      return;
    }
    
    const parsedAmountPaid = parseFloat(amountPaid) || 0;
    if (parsedAmountPaid < total) {
      alert('Amount paid is less than total');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const result = await processPOSSale(
        cartItems.map(item => ({
          variantId: item.variantId,
          parentProductId: item.parentProductId,
          productName: item.productName,
          variantName: item.variantName,
          unitPrice: item.unitPrice,
          qty: item.quantity,
          category: item.category
        })),
        {
          customerId: 'WALKIN',
          customerName: 'Walk-in Customer',
          subTotal,
          tax,
          discount,
          total,
          amountPaid: parsedAmountPaid,
          change: parsedAmountPaid - total,
          paymentMethod
        },
        currentUser
      );
      
      if (result.success) {
        // Show receipt
        setReceiptData(result.transactionData);
        setShowReceiptModal(true);
        
        // Reset cart
        setCartItems([]);
        setAmountPaid('');
        setDiscount(0);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(`Checkout failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Products */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                disabled={isProcessing}
              />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <ProductGrid
                products={filteredProducts}
                onProductSelect={handleProductSelect}
                loading={loadingProducts}
                disabled={isProcessing}
              />
            </div>
          </div>
          
          {/* Right: Cart & Payment */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h2 className="text-lg font-medium mb-4">Cart</h2>
              <Cart
                cartItems={cartItems}
                onRemoveItem={handleRemoveFromCart}
                onUpdateQuantity={handleUpdateQuantity}
                isProcessing={isProcessing}
              />
            </div>
            
            <OrderSummary
              subTotal={subTotal}
              tax={tax}
              discount={discount}
              total={total}
            />
            
            <PaymentSection
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              discount={discount}
              setDiscount={setDiscount}
              total={total}
              onCheckout={handleCheckout}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </div>
      
      {/* Variant Selection Modal */}
      {variantModalOpen && (
        <VariantSelectionModal
          product={selectedProduct}
          variants={productVariants}
          onSelect={addToCart}
          onClose={() => {
            setVariantModalOpen(false);
            setSelectedProduct(null);
            setProductVariants([]);
          }}
        />
      )}
      
      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <ReceiptModal
          transaction={receiptData}
          onClose={() => {
            setShowReceiptModal(false);
            setReceiptData(null);
          }}
        />
      )}
    </div>
  );
}
```

---

## 📊 Data Migration for Existing Transactions

### Handle Backward Compatibility

Existing transactions may reference old product IDs. Add compatibility layer:

```javascript
// In transaction display/reporting
const getProductInfo = async (item) => {
  if (item.variantId && item.variantId.startsWith('VAR_')) {
    // New format - fetch from Variants collection
    const variant = await getDoc(doc(db, 'Variants', item.variantId));
    return variant.data();
  } else {
    // Old format - use legacy data in transaction
    return {
      name: item.name,
      price: item.price,
      quantity: item.qty
    };
  }
};
```

---

## ✅ Testing Checklist

### Unit Tests
- [ ] POSProductServices.searchPOSProducts()
- [ ] POSProductServices.getProductVariants()
- [ ] POSTransactionService.processPOSSale()

### Integration Tests
- [ ] Search products by name/brand/category
- [ ] Select product → show variants
- [ ] Add single variant to cart
- [ ] Add multiple variants to cart
- [ ] Update cart quantities
- [ ] Remove from cart
- [ ] Process checkout
- [ ] Verify stock deduction
- [ ] Verify transaction recording

### UI Tests
- [ ] Product grid displays correctly
- [ ] Variant modal shows all variants
- [ ] Cart updates in real-time
- [ ] Payment section calculates correctly
- [ ] Receipt displays after checkout

---

## 🚀 Rollout Plan

### Week 1: Services & Data Layer
- Create POSProductServices.js
- Create POSTransactionService.js
- Write unit tests
- Test with sample data

### Week 2: Component Refactoring
- Refactor ProductGrid
- Refactor VariantSelectionModal
- Refactor Cart
- Test component interactions

### Week 3: Main Page Integration
- Refactor Pos_NewSale.jsx
- Integrate new services
- Remove old complex logic
- End-to-end testing

### Week 4: Testing & Deployment
- User acceptance testing
- Performance testing
- Bug fixes
- Deploy to production

---

## 📈 Success Metrics

- ✅ **All POS transactions reference variant IDs**
- ✅ **No more generic ID normalization logic**
- ✅ **Cart items map directly to Firestore documents**
- ✅ **Inventory deduction is atomic and reliable**
- ✅ **Transaction processing < 2 seconds**
- ✅ **Zero stock discrepancies**
- ✅ **User feedback: "Easier to find and sell products"**

---

## 🔗 Related Documents

- [PRODUCT_VARIANT_OVERHAUL_PLAN.md](./PRODUCT_VARIANT_OVERHAUL_PLAN.md)
- [PRODUCT_VARIANT_OVERHAUL_README.md](./PRODUCT_VARIANT_OVERHAUL_README.md)
- [PRODUCT_VARIANT_API_SPECIFICATION.md](./PRODUCT_VARIANT_API_SPECIFICATION.md)
- [PRODUCT_VARIANT_MIGRATION_SCRIPT.md](./PRODUCT_VARIANT_MIGRATION_SCRIPT.md)

---

**Remember:**
- 🎯 Keep it simple - variant IDs are the source of truth
- 🔍 Search at product level, select at variant level
- 🛒 Cart items are variants, not products
- 💾 Always validate stock before transaction
- 📊 Track sales history in variants
- ✅ Test thoroughly before deployment

---

*Last Updated: January 2025*
