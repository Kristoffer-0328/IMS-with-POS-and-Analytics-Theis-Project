# Receipt Variant Name Display Fix

## Problem
Receipts were displaying the master product name instead of the specific variant name, making it unclear which variant was purchased (e.g., showing "Cement" instead of "Cement - 50kg Bag").

## Root Cause Analysis

### Data Flow
```
Cart Item Structure:
├── name: "Cement (50 kg)"           // Display name (Master + size)
├── baseName: "Cement"               // Master product name
├── variantName: "Cement - 50kg Bag" // Actual variant name
└── size: "50"                       // Variant size

Receipt Data Preparation (BEFORE):
└── name: item.productName           // ❌ Using master product name
    Result: "Cement" (not specific)

Receipt Data Preparation (AFTER):
└── name: item.variantName           // ✅ Using variant name
    Result: "Cement - 50kg Bag" (specific)
```

## Solution Implemented

### 1. Pos_NewSale_V2.jsx
**Location:** `handlePrintAndSave()` function

#### Change 1: Cart Items Preparation
```javascript
// BEFORE
const cartItems = addedProducts.map(item => ({
  variantId: item.variantId,
  parentProductId: item.productId,
  productName: item.baseName || item.name,
  variantName: item.size ? `${item.size} ${item.unit || ''}`.trim() : '',
  qty: item.qty,
  unitPrice: item.price,
  // ... other fields
}));

// AFTER
const cartItems = addedProducts.map(item => ({
  variantId: item.variantId,
  parentProductId: item.productId,
  productName: item.baseName || item.name,
  variantName: item.variantName || (item.size ? `${item.size} ${item.unit || ''}`.trim() : ''),
  qty: item.qty,
  unitPrice: item.price,
  // ... other fields
  onSale: item.onSale || false,           // ✅ Added
  originalPrice: item.originalPrice || item.price, // ✅ Added
  discountPercentage: item.discountPercentage || 0  // ✅ Added
}));
```

**Key Changes:**
- ✅ Use `item.variantName` directly (instead of reconstructing from size)
- ✅ Include sale/discount info for receipt display
- ✅ Fallback to size construction only if variantName is missing

#### Change 2: Receipt Data Preparation
```javascript
// BEFORE
const receiptData = {
  ...saleResult,
  items: cartItems.map((item) => ({
    ...item,
    name: item.productName,           // ❌ Wrong: uses master product name
    variantName: item.variantName,
    totalPrice: item.quantity * item.unitPrice
  })),
  // ...
};

// AFTER
const receiptData = {
  ...saleResult,
  items: cartItems.map((item) => ({
    ...item,
    name: item.variantName || item.productName, // ✅ Right: prioritize variantName
    productName: item.productName,              // Keep for reference
    quantity: item.qty,
    qty: item.qty,
    price: item.unitPrice,
    unitPrice: item.unitPrice,
    totalPrice: item.qty * item.unitPrice,
    onSale: item.onSale || false,
    originalPrice: item.originalPrice || item.unitPrice,
    discountPercentage: item.discountPercentage || 0
  })),
  // ...
};
```

**Key Changes:**
- ✅ `name` field now uses `variantName` as primary (with productName fallback)
- ✅ Keep both `productName` and `name` for backward compatibility
- ✅ Normalize all field name variations (qty/quantity, price/unitPrice)
- ✅ Ensure sale/discount info is passed to receipt

### 2. ReceiptModal.jsx
**Location:** Item name extraction logic

```javascript
// BEFORE
const itemName = item.name || item.productName || item.variantName || 'Unknown Item';

// AFTER  
const itemName = item.name || item.variantName || item.productName || 'Unknown Item';
```

**Key Changes:**
- ✅ Reordered priority: `name` (now variantName) > `variantName` > `productName`
- ✅ Ensures variant-specific names display in digital receipt

### 3. ReceiptGenerator.js
**Location:** Items table generation in HTML template

```javascript
// BEFORE
const itemName = item.name || 'Unknown Item';
const quantity = item.qty || 0;
const unitPrice = item.unitPrice || 0;

// AFTER
const itemName = item.name || item.variantName || item.productName || 'Unknown Item';
const quantity = item.qty || item.quantity || 0;
const unitPrice = item.unitPrice || item.price || 0;
```

**Key Changes:**
- ✅ Added fallback chain for item name
- ✅ Handle field name variations (qty/quantity, unitPrice/price)
- ✅ Ensures printed invoices show variant names

## Example Output Comparison

### Before Fix
```
Receipt Items:
─────────────────────────────────
Cement                    ₱300.00
Steel Rods                ₱500.00
Sand                      ₱150.00
```
❌ Problem: Can't tell which variant (50kg? 40kg? 25kg?)

### After Fix
```
Receipt Items:
─────────────────────────────────
Cement - 50kg Bag         ₱300.00
Steel Rods - 12mm x 6m    ₱500.00
Sand - Per Cubic Meter    ₱150.00
```
✅ Solution: Specific variant clearly identified

## Field Priority Logic

### Display Name Priority
```
1. item.name              (Now set to variantName in Pos_NewSale_V2)
2. item.variantName       (Direct variant name from database)
3. item.productName       (Master product name - fallback)
4. 'Unknown Item'         (Final fallback)
```

### Quantity Field Priority
```
1. item.qty               (Standard field)
2. item.quantity          (Alternative field)
3. 0                      (Fallback)
```

### Price Field Priority
```
1. item.unitPrice         (Standard field)
2. item.price             (Alternative field)
3. 0                      (Fallback)
```

## Benefits

1. **Clarity:** Customers see exactly which variant they purchased
2. **Accuracy:** Receipts match what was selected in POS
3. **Consistency:** Same variant name appears in cart, receipt modal, and printed invoice
4. **Compatibility:** Maintains backward compatibility with existing data

## Testing Checklist

- [x] Cart shows variant names correctly
- [x] Receipt modal displays variant names
- [x] Printed invoice shows variant names
- [x] Sale badges still appear correctly
- [x] Price display works with sale/original prices
- [x] No console errors
- [x] Handles missing fields gracefully

## Data Structure Reference

### Cart Item (addedProducts)
```javascript
{
  variantId: "VAR_xyz",
  productId: "PROD_abc",
  name: "Cement (50 kg)",           // Display in UI
  baseName: "Cement",               // Master product
  variantName: "Cement - 50kg Bag", // Specific variant ✅
  price: 300,
  qty: 10,
  onSale: true,
  originalPrice: 350,
  discountPercentage: 15
}
```

### Receipt Item (receiptData.items)
```javascript
{
  variantId: "VAR_xyz",
  name: "Cement - 50kg Bag",        // ✅ Now uses variantName
  productName: "Cement",            // Master reference
  variantName: "Cement - 50kg Bag", // Specific variant
  qty: 10,
  quantity: 10,
  unitPrice: 300,
  price: 300,
  totalPrice: 3000,
  onSale: true,
  originalPrice: 350,
  discountPercentage: 15
}
```

## Summary

✅ **Fixed:** Receipts now display specific variant names instead of generic master product names
✅ **Improved:** Better field name handling with fallback chains
✅ **Enhanced:** Consistent display across cart, digital receipt, and printed invoice
✅ **Maintained:** Backward compatibility with existing data structures
