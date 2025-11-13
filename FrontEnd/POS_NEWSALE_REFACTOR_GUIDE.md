# Pos_NewSale.jsx Refactoring Guide

## Overview
This document outlines the step-by-step refactoring of `Pos_NewSale.jsx` to use the new POS service layer instead of complex nested logic.

## Current Issues
1. ❌ Uses `useServices()` with `listenToProducts()` - fetches ALL products in real-time
2. ❌ Has `groupedProducts` useMemo (~100 lines) - complex product grouping logic
3. ❌ Has `findAllProductLocations()` function (~235 lines) - searches all storage units
4. ❌ Has `updateInventoryQuantities()` function (~380 lines) - complex stock deduction
5. ❌ Uses generic variant IDs requiring normalization
6. ❌ Mixed stock sources (product.quantity vs variant.quantity)

## Target Architecture
1. ✅ Use `searchPOSProducts(searchQuery, selectedCategory, selectedBrand)` - optimized queries
2. ✅ Remove `groupedProducts` - use enriched product data directly from service
3. ✅ Remove `findAllProductLocations()` - no longer needed
4. ✅ Remove `updateInventoryQuantities()` - replaced by `processPOSSale()`
5. ✅ Use direct variant IDs from Firestore
6. ✅ Single source of truth: Variants collection

## Step-by-Step Refactoring Plan

### Phase 1: Update Imports ✅ COMPLETED
**Before:**
```javascript
import { useServices } from '../../../services/firebase/ProductServices';
import { runTransaction, writeBatch, setDoc } from 'firebase/firestore';
```

**After:**
```javascript
import { searchPOSProducts, getProductVariants, checkCartAvailability } from '../services/POSProductServices';
import { processPOSSale } from '../services/POSTransactionService';
// Removed: runTransaction, writeBatch, setDoc (handled by service)
```

### Phase 2: Remove Old Service Hook
**Before:**
```javascript
const { listenToProducts } = useServices();
const [products, setProducts] = useState([]);

useEffect(() => {
  const unsubscribe = listenToProducts((fetchedProducts) => {
    setLoadingProducts(false);
    setProducts(fetchedProducts);
    // validation logic...
  });
  return () => unsubscribe();
}, [addedProducts]);
```

**After:**
```javascript
const [products, setProducts] = useState([]);
const [loadingProducts, setLoadingProducts] = useState(false);

// Products are now fetched on-demand via searchPOSProducts()
// No real-time listener needed
```

### Phase 3: Remove groupedProducts useMemo
**Before:**
```javascript
const groupedProducts = useMemo(() => {
  const grouped = {};
  products.forEach(product => {
    // ~100 lines of complex grouping logic
    // Groups by name + brand + specs
    // Consolidates variants by size/unit
    // Merges locations
  });
  return Object.values(grouped);
}, [products]);
```

**After:**
```javascript
// Remove entirely - enriched data comes directly from searchPOSProducts()
```

### Phase 4: Update Product Fetching
**Before:**
```javascript
const filteredProducts = useMemo(() => {
  return groupedProducts.filter((product) => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesBrand = !selectedBrand || product.brand === selectedBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });
}, [groupedProducts, searchQuery, selectedCategory, selectedBrand]);
```

**After:**
```javascript
// Fetch products whenever search criteria changes
useEffect(() => {
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const results = await searchPOSProducts(searchQuery, selectedCategory, selectedBrand);
      setProducts(results);
    } catch (error) {
      console.error('Error searching products:', error);
      alert('Failed to load products. Please try again.');
    } finally {
      setLoadingProducts(false);
    }
  };

  fetchProducts();
}, [searchQuery, selectedCategory, selectedBrand]);

const filteredProducts = products; // Already filtered by service
```

### Phase 5: Remove findAllProductLocations() Function
**Lines to delete:** ~235 lines (line 580-815)

This function is no longer needed because:
- New architecture uses direct variant IDs
- No need to search all storage units
- Each variant document represents one location
- Services handle variant queries

**Delete entire function and replace with comment:**
```javascript
// NOTE: findAllProductLocations() removed - replaced by POSProductServices
// Services now query Variants collection directly using document IDs
```

### Phase 6: Remove updateInventoryQuantities() Function
**Lines to delete:** ~380 lines (line 815-1195)

This function is no longer needed because:
- `processPOSSale()` handles atomic stock deduction
- No multi-location complexity
- Direct updates to Variants collection
- Automatic stock movement logs

**Delete entire function and replace with comment:**
```javascript
// NOTE: updateInventoryQuantities() removed - replaced by POSTransactionService.processPOSSale()
// Service handles atomic transactions, stock deduction, and audit trails
```

### Phase 7: Update handlePrintAndSave() Function
**Current:** ~360 lines with complex stock deduction logic

**Target:** ~100 lines using service

**Before (simplified structure):**
```javascript
const handlePrintAndSave = async () => {
  // 1. Validate stock (findAllProductLocations for each item)
  // 2. Prepare productsForDeduction array
  // 3. Call updateInventoryQuantities()
  // 4. Check restocking thresholds
  // 5. Generate notifications
  // 6. Create transaction document
  // 7. Generate analytics
  // 8. Print receipt
  // 9. Reset state
};
```

**After:**
```javascript
const handlePrintAndSave = async () => {
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
    // Prepare cart items for service
    const cartItems = addedProducts.map(item => ({
      variantId: item.variantId || item.id,
      productName: item.baseName || item.name,
      variantName: item.name.includes('(') ? item.name.split('(')[1].split(')')[0].trim() : '',
      quantity: item.qty,
      unitPrice: item.price,
      category: item.category
    }));

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

    // Process sale using service (atomic transaction)
    const saleResult = await processPOSSale(cartItems, transactionDetails, currentUser);

    console.log('✅ Sale processed successfully:', saleResult);

    // Generate analytics
    collectAnalyticsData({
      transactionId: saleResult.transactionId,
      items: cartItems,
      total: finalTotal,
      paymentMethod: paymentMethod
    });

    // Print receipt
    const receiptData = {
      ...saleResult,
      items: cartItems.map((item, index) => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice
      })),
      subtotal: subTotal,
      tax: tax,
      discount: discountAmount,
      total: finalTotal,
      amountPaid: amountPaidNum,
      change: amountPaidNum - finalTotal,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };

    setReceiptTransaction(receiptData);
    setShowReceiptModal(true);

    // Show success message
    alert(`Sale completed successfully!\nTransaction ID: ${saleResult.transactionId}`);

    // Reset form
    resetSaleState();

  } catch (error) {
    console.error('❌ Error processing sale:', error);
    alert(`Failed to process sale: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};
```

### Phase 8: Update Product Selection Logic
**handleAddProduct()** - May need minor updates to work with enriched product data:

```javascript
const handleAddProduct = useCallback((productGroup) => {
  if (isProcessing) return;

  if (!productGroup || !productGroup.variants) {
    console.warn("Invalid product group:", productGroup);
    return;
  }

  // Check if product has multiple variants (different sizes/units)
  const uniqueSizeUnits = new Set(productGroup.variants.map(v => `${v.size}|${v.unit}`));
  const hasMultipleVariants = uniqueSizeUnits.size > 1;

  if (hasMultipleVariants) {
    // Show variant selection modal
    setSelectedProductForModal(productGroup);
    setVariantModalOpen(true);
  } else if (productGroup.variants.length === 1) {
    // Single variant - show quantity modal
    setSelectedProductForQuantity(productGroup);
    setQuickQuantityModalOpen(true);
  }
}, [isProcessing]);
```

### Phase 9: Update Cart Item Structure
Cart items should now use direct variant IDs:

**Before:**
```javascript
{
  id: "PROD_001_40kg_pcs", // Generic normalized ID
  name: "Portland Cement (40kg)",
  price: 250,
  qty: 10,
  variantId: "PROD_001_40kg_pcs", // Same as id
  baseProductId: "PROD_001"
}
```

**After:**
```javascript
{
  id: "abc123def456", // Real Firestore variant document ID
  variantId: "abc123def456", // Same as id
  productName: "Portland Cement",
  variantName: "40kg bag",
  quantity: 10,
  unitPrice: 250,
  category: "Cement"
}
```

## Expected Code Reduction

| Section | Before | After | Reduction |
|---------|--------|-------|-----------|
| Imports | 15 lines | 10 lines | -5 lines |
| Product Fetching | 30 lines | 20 lines | -10 lines |
| groupedProducts | 100 lines | 0 lines | **-100 lines** |
| findAllProductLocations | 235 lines | 0 lines | **-235 lines** |
| updateInventoryQuantities | 380 lines | 0 lines | **-380 lines** |
| handlePrintAndSave | 360 lines | 100 lines | **-260 lines** |
| **Total** | **~1,120 lines** | **~130 lines** | **~990 lines** |

**Code Reduction: 88.4%** 🎉

## Benefits Summary

### Performance
- ✅ No real-time listener overhead
- ✅ Fetch only filtered products
- ✅ Optimized Firestore queries
- ✅ Atomic transactions (faster, safer)

### Reliability
- ✅ No race conditions
- ✅ Guaranteed data consistency
- ✅ Proper error handling
- ✅ Audit trail built-in

### Maintainability
- ✅ 88% less code
- ✅ Clear separation of concerns
- ✅ Testable service functions
- ✅ Easy to debug

### Developer Experience
- ✅ Simpler cart structure
- ✅ No ID normalization
- ✅ Direct variant references
- ✅ Self-documenting service APIs

## Next Steps

1. **Apply Phase 2-4:** Remove old product fetching logic and add new service-based fetching
2. **Test Product Search:** Verify search, category filter, and brand filter work correctly
3. **Apply Phase 7:** Refactor handlePrintAndSave() to use processPOSSale()
4. **Test Transaction Flow:** Complete end-to-end sale and verify stock deduction
5. **Update Components:** Ensure ProductGrid, VariantSelectionModal, Cart work with new data structure
6. **Deploy to Staging:** Test with real data before production

## Migration Checklist

- [x] Phase 1: Update imports ✅
- [ ] Phase 2: Remove old service hook
- [ ] Phase 3: Remove groupedProducts useMemo
- [ ] Phase 4: Update product fetching with searchPOSProducts()
- [ ] Phase 5: Delete findAllProductLocations() function
- [ ] Phase 6: Delete updateInventoryQuantities() function
- [ ] Phase 7: Refactor handlePrintAndSave() to use processPOSSale()
- [ ] Phase 8: Update handleAddProduct() for enriched data
- [ ] Phase 9: Update cart item structure
- [ ] Test: Product search and filtering
- [ ] Test: Variant selection
- [ ] Test: Complete transaction
- [ ] Test: Stock deduction verification
- [ ] Test: Receipt generation
- [ ] Deploy: Staging environment
- [ ] Deploy: Production environment

## Troubleshooting

### Issue: Products not loading
**Solution:** Check that searchPOSProducts() is being called in useEffect with proper dependencies

### Issue: Variant selection not working
**Solution:** Verify enriched product data has `variants` array with proper structure

### Issue: Transaction fails
**Solution:** Check cart items have valid `variantId` fields and stock is available

### Issue: Stock not updating
**Solution:** Verify processPOSSale() completes successfully and check Variants collection

---

**Status:** Phase 1 complete, ready for Phase 2
**Last Updated:** 2025-11-09
**Estimated Completion Time:** 2-3 hours
