# Merged Product Architecture

## Overview

This document describes the centralized product data merging architecture that combines data from **Master**, **Variants**, and **Suppliers** collections into a unified data model.

---

## 🎯 Problem Solved

Previously, the POS component (`Pos_NewSale_V2.jsx`) contained complex merging logic to combine:
- Product info from **Master** collection
- Pricing, stock, and location from **Variants** collection

**Issues with the old approach:**
1. ❌ Merging logic duplicated across components
2. ❌ No supplier information included in merged data
3. ❌ No type consistency or standardized model
4. ❌ Difficult to maintain and extend
5. ❌ No reusability across different features

---

## ✅ New Architecture

### 1. **Centralized Model** (`src/models/MergedProduct.js`)

Defines the structure for merged product data with complete JSDoc type definitions:

```javascript
MergedProduct {
  id: string                    // Product ID from Master
  name: string                  // Product name
  image: string                 // Product image
  category: string              // Product category
  brand: string                 // Product brand
  description: string           // Product description
  variants: MergedVariant[]     // Array of merged variants
  totalStock: number            // Aggregate stock
  totalVariants: number         // Total variant count
  lowestPrice: number           // Lowest price
  highestPrice: number          // Highest price
  hasMultipleVariants: boolean  // Multi-variant flag
  isInStock: boolean            // Stock availability
  allSuppliers: string[]        // Unique supplier names
}
```

Each `MergedVariant` includes:
- ✅ Identity (variantId, variantName, brand, image)
- ✅ Pricing & Stock (unitPrice, quantity, sale info)
- ✅ Units & Sizing (size, unit, baseUnit)
- ✅ Bundle info (isBundle, piecesPerBundle)
- ✅ Dimensions (length, width, thickness)
- ✅ Storage location (storageLocation, shelfName, rowName)
- ✅ **Supplier information** (suppliers array, primarySupplier)

### 2. **Centralized Service** (`src/services/firebase/ProductServices.jsx`)

Two new functions added:

#### `listenToMergedProducts(onUpdate, filters)`
Real-time listener that merges data from all three collections:

```javascript
const unsubscribe = listenToMergedProducts((mergedProducts) => {
  // Receives merged products array with all data
  console.log(mergedProducts);
}, {
  category: 'Hardware',
  brand: 'ACME',
  searchQuery: 'cement'
});

// Cleanup
return unsubscribe;
```

**What it does:**
1. Listens to **Master** collection (product info)
2. Listens to **Variants** collection (stock, price, location)
3. Listens to **Suppliers** collection (supplier details)
4. Listens to each supplier's **products subcollection** (variant-supplier links)
5. Merges all data using the model's `createMergedVariant` and `createMergedProduct` functions
6. Returns merged data via callback

#### `getMergedProducts()`
One-time fetch (no real-time updates):

```javascript
const result = await getMergedProducts();
if (result.success) {
  console.log(result.products);
}
```

Useful for:
- Reports
- Exports
- One-off queries
- Server-side operations

### 3. **Filter Utilities**

The model provides filter helper functions:

```javascript
import { applyProductFilters } from '../models/MergedProduct';

const filtered = applyProductFilters(products, {
  searchQuery: 'hammer',
  category: 'Hardware',
  brand: 'Stanley',
  supplier: 'ACME Supply Co.'
});
```

Individual filters:
- `filterProductsBySearch()`
- `filterProductsByCategory()`
- `filterProductsByBrand()`
- `filterProductsBySupplier()`

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Collections                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Master Collection          Variants Collection              │
│  ┌──────────────┐          ┌──────────────┐                 │
│  │ Product Info │          │ Stock/Price  │                 │
│  │ - name       │          │ - quantity   │                 │
│  │ - brand      │──────────│ - unitPrice  │                 │
│  │ - category   │          │ - location   │                 │
│  │ - image      │          │ - dimensions │                 │
│  └──────────────┘          └──────────────┘                 │
│         │                         │                          │
│         │                         │                          │
│         └─────────┬───────────────┘                          │
│                   │                                          │
│  Suppliers Collection                                        │
│  ┌──────────────┐                                           │
│  │ Supplier     │                                           │
│  │ - name       │                                           │
│  │ - contact    │                                           │
│  │ - leadTime   │                                           │
│  │   products/  │ ◄── Subcollection links variants         │
│  └──────────────┘                                           │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│          ProductServices.listenToMergedProducts()            │
│                                                               │
│  1. Listen to Master (onSnapshot)                            │
│  2. Listen to Variants (onSnapshot)                          │
│  3. Listen to Suppliers (onSnapshot)                         │
│  4. Listen to each Supplier's products subcollection         │
│  5. Group variants by parentProductId                        │
│  6. Map variantId → suppliers                                │
│  7. Create MergedVariant objects (with suppliers)            │
│  8. Create MergedProduct objects                             │
│  9. Callback with merged array                               │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Component (Pos_NewSale_V2)                  │
│                                                               │
│  useEffect(() => {                                           │
│    const unsubscribe = listenToMergedProducts((products) => {│
│      // Apply filters                                        │
│      const filtered = applyProductFilters(products, {        │
│        searchQuery, category, brand                          │
│      });                                                     │
│      setProducts(filtered);                                  │
│    });                                                       │
│    return unsubscribe;                                       │
│  }, [searchQuery, category, brand]);                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Structure Example

```javascript
{
  id: "PROD_12345",
  name: "Portland Cement",
  brand: "Holcim",
  category: "Construction Materials",
  image: "https://...",
  description: "High-quality cement",
  
  // Aggregate stats
  totalStock: 500,
  totalVariants: 3,
  lowestPrice: 245.00,
  highestPrice: 975.00,
  hasMultipleVariants: true,
  isInStock: true,
  
  // All suppliers across all variants
  allSuppliers: ["ACME Supplies", "BuildMart Inc."],
  
  variants: [
    {
      variantId: "VAR_12345_001",
      variantName: "50kg Bag",
      brand: "Holcim",
      image: "https://...",
      
      // Pricing
      unitPrice: 245.00,
      price: 245.00,
      quantity: 200,
      totalQuantity: 200,
      
      // Sale info
      onSale: true,
      salePrice: 220.00,
      originalPrice: 245.00,
      discountPercentage: 10,
      
      // Units
      size: "50kg",
      unit: "bag",
      baseUnit: "kg",
      
      // Bundle
      isBundle: false,
      piecesPerBundle: null,
      
      // Storage
      storageLocation: "Unit 01",
      shelfName: "Shelf A",
      rowName: "Row 1",
      
      // SUPPLIERS (NEW!)
      suppliers: [
        {
          id: "SUP_001",
          name: "ACME Supplies",
          primaryCode: "ACME-001",
          address: "123 Main St",
          contactPerson: "John Doe",
          phone: "+63 912 345 6789",
          email: "john@acme.com",
          leadTime: 7,
          status: "active",
          supplierPrice: 230.00,
          supplierSKU: "ACME-CEMENT-50KG"
        },
        {
          id: "SUP_002",
          name: "BuildMart Inc.",
          // ... more supplier details
        }
      ],
      primarySupplier: {
        id: "SUP_001",
        name: "ACME Supplies",
        // ...
      }
    },
    // ... more variants
  ]
}
```

---

## 🚀 Usage in Components

### Before (Old Way)
```jsx
useEffect(() => {
  setLoadingProducts(true);
  
  const productsRef = collection(db, 'Master');
  const variantsRef = collection(db, 'Variants');
  
  let productsData = [];
  let variantsData = [];
  
  // Complex merging logic here...
  const mergeAndSetProducts = () => {
    // 100+ lines of code
  };
  
  const unsubscribeProducts = onSnapshot(productsRef, ...);
  const unsubscribeVariants = onSnapshot(variantsRef, ...);
  
  return () => {
    unsubscribeProducts();
    unsubscribeVariants();
  };
}, [searchQuery, selectedCategory, selectedBrand]);
```

### After (New Way)
```jsx
useEffect(() => {
  setLoadingProducts(true);
  
  const unsubscribe = listenToMergedProducts((mergedProducts) => {
    const filtered = applyProductFilters(mergedProducts, {
      searchQuery,
      category: selectedCategory,
      brand: selectedBrand
    });
    
    setProducts(filtered);
    setLoadingProducts(false);
  });
  
  return unsubscribe;
}, [searchQuery, selectedCategory, selectedBrand]);
```

**Benefits:**
- ✅ 90% less code in component
- ✅ Supplier data included automatically
- ✅ Consistent data structure
- ✅ Easy to maintain
- ✅ Reusable across all features

---

## 🔧 Extending the Architecture

### Adding a New Collection (e.g., Categories)

1. **Update the Model** (`MergedProduct.js`):
```javascript
export const createMergedProduct = (productData, variants, categoryData) => {
  return {
    // ... existing fields
    categoryDetails: categoryData,
  };
};
```

2. **Update the Service** (`ProductServices.jsx`):
```javascript
export const listenToMergedProducts = (onUpdate, filters = {}) => {
  let categoriesData = [];
  
  // Add listener for Categories
  const categoriesRef = collection(db, 'Categories');
  const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
    categoriesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    mergeAndNotify();
  });
  
  // Update cleanup
  return () => {
    unsubscribeMaster();
    unsubscribeVariants();
    unsubscribeSuppliers();
    unsubscribeCategories(); // NEW
  };
};
```

3. **Components automatically receive the new data!**

---

## 🧪 Testing

Test the merged data structure:

```javascript
import { listenToMergedProducts } from '../services/firebase/ProductServices';

const testMergedProducts = () => {
  const unsubscribe = listenToMergedProducts((products) => {
    console.log('📦 Total products:', products.length);
    
    products.forEach(product => {
      console.log(`\n🔹 ${product.name}`);
      console.log(`   Category: ${product.category}`);
      console.log(`   Brand: ${product.brand}`);
      console.log(`   Variants: ${product.totalVariants}`);
      console.log(`   Stock: ${product.totalStock}`);
      console.log(`   Price Range: ₱${product.lowestPrice} - ₱${product.highestPrice}`);
      console.log(`   Suppliers: ${product.allSuppliers.join(', ')}`);
      
      product.variants.forEach(variant => {
        console.log(`     ↳ ${variant.variantName}`);
        console.log(`       Stock: ${variant.quantity}`);
        console.log(`       Price: ₱${variant.price}`);
        console.log(`       Suppliers: ${variant.suppliers.length}`);
        variant.suppliers.forEach(supplier => {
          console.log(`         • ${supplier.name} (₱${supplier.supplierPrice})`);
        });
      });
    });
  });
  
  // Cleanup after 5 seconds
  setTimeout(unsubscribe, 5000);
};
```

---

## 📝 Files Modified/Created

### Created:
1. ✅ `src/models/MergedProduct.js` - Data model and filter utilities

### Modified:
1. ✅ `src/services/firebase/ProductServices.jsx` - Added merging functions
2. ✅ `src/features/pos/pages/Pos_NewSale_V2.jsx` - Replaced merging logic

---

## 🎓 Best Practices

### ✅ DO:
- Use `listenToMergedProducts()` for real-time UI updates
- Use `getMergedProducts()` for reports/exports
- Apply filters using `applyProductFilters()`
- Use the model's type definitions for consistency

### ❌ DON'T:
- Don't duplicate merging logic in components
- Don't manually listen to Master/Variants/Suppliers separately
- Don't create custom variant/product structures
- Don't filter products before applying the model's filters

---

## 🔮 Future Enhancements

1. **Caching Layer** - Add local caching to reduce Firebase reads
2. **Pagination** - Support for large product catalogs
3. **Sorting Options** - Add sort utilities to the model
4. **Advanced Filters** - Stock level, price range, etc.
5. **Product Bundles** - Support for complex bundle relationships
6. **Multi-supplier Comparison** - Show price comparison across suppliers

---

## 🤝 Contributing

When adding features that need product data:

1. Check if `MergedProduct` model has the data you need
2. If not, extend the model first
3. Update `listenToMergedProducts()` to include new data
4. Use the centralized function in your component
5. Add filter utilities if needed

**Never duplicate the merging logic!**

---

## 📚 Related Documentation

- `PRODUCT_VARIANT_OVERHAUL_PLAN.md` - Product/Variant architecture
- `POS_MODULE_OVERHAUL_PLAN.md` - POS system architecture
- `SUPPLIERS_MANAGEMENT.md` - Supplier relationships

---

## 📞 Support

For questions or issues with the merged product architecture:
1. Check this documentation
2. Review the model file (`MergedProduct.js`)
3. Check ProductServices implementation
4. Consult the team lead

---

**Version:** 1.0  
**Last Updated:** 2025-01-16  
**Status:** ✅ Active
