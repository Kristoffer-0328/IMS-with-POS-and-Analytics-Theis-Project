# Supplier UOM and Pricing Implementation Summary

**Date:** November 11, 2025

## Overview
Implemented comprehensive supplier-specific pricing, UOM (Unit of Measure), and conversion factor support throughout the supplier-product linking, purchase order creation, and receiving workflows.

---

## 1. Core Service Layer Updates

### `src/services/firebase/ProductServices.jsx`

#### `linkProductToSupplier()` Function (Lines 536-651)
**Added Fields to Supplier-Product Mapping:**
```javascript
// NEW ARCHITECTURE (Variants collection)
Suppliers/{supplierId}/products/{variantId} = {
    // Pricing
    supplierPrice: number,
    lastPurchasePrice: number,
    lastPurchaseDate: timestamp,
    
    // UOM and Conversion
    supplierUOM: string,              // ✅ NEW: 'bag', 'kg', 'piece', etc.
    systemBaseUnit: string,           // ✅ NEW: System's base unit
    conversionFactor: number,         // ✅ NEW: e.g., 1 bag = 40 kg → 40
    
    // Supplier-specific constraints
    minimumOrderQuantity: number,     // ✅ NEW: MOQ
    supplierLeadTime: number,         // ✅ NEW: Override general lead time
    supplierProductCode: string,      // ✅ NEW: Supplier's product code
}
```

**Default Values:**
- `supplierUOM`: Falls back to variant's `baseUnit` or 'pcs'
- `conversionFactor`: Defaults to 1 (1:1 conversion)
- `minimumOrderQuantity`: Defaults to 1
- `supplierLeadTime`: Null (uses general supplier lead time)

---

## 2. UI Layer Updates

### `src/features/inventory/components/Supplier/SupplierProducts.jsx`

#### Link Product Modal
**New State Variables (Line 806):**
```javascript
const [supplierUOMs, setSupplierUOMs] = useState({});
const [conversionFactors, setConversionFactors] = useState({});
const [minimumOrderQuantities, setMinimumOrderQuantities] = useState({});
```

**New Input Fields (Lines 1107-1170):**
- Supplier UOM (text input with helper text)
- Conversion Factor (number input with dynamic label showing conversion)
- Minimum Order Quantity (number input)

**UI Example:**
```
Supplier UOM: [bag        ] 
Unit supplier uses

Conversion: [40      ]
1 bag = ? kg

Min Order Qty: [1   ]
Minimum quantity to order
```

#### Edit Product Modal
**Updated `editData` State (Line 22):**
```javascript
const [editData, setEditData] = useState({ 
    supplierPrice: '', 
    supplierSKU: '', 
    unitPrice: '',
    supplierUOM: '',           // ✅ NEW
    conversionFactor: '',      // ✅ NEW
    minimumOrderQuantity: '',  // ✅ NEW
    supplierProductCode: ''    // ✅ NEW
});
```

**Display Fields When Not Editing (Lines 625-640):**
- Shows supplier UOM and conversion factor: `bag (×40)`
- Shows minimum order quantity if > 1

#### Data Retrieval
**Updated `fetchSupplierProducts()` (Lines 70-80):**
- Retrieves `supplierUOM`, `conversionFactor`, `minimumOrderQuantity`, `supplierProductCode`
- Propagates these fields to product display

---

## 3. Variant Creation Updates

### `src/features/inventory/components/Inventory/CategoryModal/NewVariantForm.jsx`

**Updated Supplier Linking (Lines 496-507):**
```javascript
await linkProductToSupplier(newVariant.id, supplier.id, {
    supplierPrice: parseFloat(supplierPrices[supplier.id]) || 0,
    supplierSKU: newVariant.id,
    supplierUOM: baseUnit,              // ✅ NEW: Use variant's base unit
    conversionFactor: 1,                 // ✅ NEW: Default 1:1
    minimumOrderQuantity: 1,             // ✅ NEW: Default MOQ
    supplierProductCode: newVariant.id,  // ✅ NEW
    lastUpdated: new Date().toISOString()
});
```

---

## 4. Purchase Order Creation Updates

### `src/features/inventory/components/PurchaseOrder/CreatePOModal.jsx`

**Updated `findSuppliersForVariant()` (Lines 177-252):**
- Extracts and includes `supplierUOM`, `conversionFactor`, `minimumOrderQuantity` in supplier data

**Updated `handleSupplierSelect()` (Lines 254-276):**
- Adds UOM fields to item when initializing:
```javascript
supplierUOM: supplier.supplierUOM || 'pcs',
conversionFactor: supplier.conversionFactor || 1,
systemBaseUnit: selectedProduct.unit || 'pcs',
minimumOrderQuantity: supplier.minimumOrderQuantity || 1
```

**Updated `handleSubmit()` (Lines 333-372):**
- Includes UOM fields in PO items:
```javascript
items: items.filter(item => item.productId).map(item => ({
    // ... existing fields
    supplierUOM: item.supplierUOM || 'pcs',
    conversionFactor: item.conversionFactor || 1,
    systemBaseUnit: item.systemBaseUnit || 'pcs'
}))
```

### `src/features/inventory/components/PurchaseOrder/SupplierPOModal.jsx`

**Added Supplier Pricing Retrieval (Lines 175-213):**
```javascript
// Fetch supplier-specific pricing from mapping
const productsWithSupplierPricing = await Promise.all(
    filteredProducts.map(async (product) => {
        const supplierProductRef = doc(db, 'Suppliers', selectedSupplier.id, 'products', product.productId);
        const supplierProductDoc = await getDoc(supplierProductRef);
        
        if (supplierProductDoc.exists()) {
            const supplierData = supplierProductDoc.data();
            return {
                ...product,
                unitPrice: supplierData.supplierPrice || product.unitPrice,
                supplierUOM: supplierData.supplierUOM || 'pcs',
                conversionFactor: supplierData.conversionFactor || 1,
                systemBaseUnit: supplierData.systemBaseUnit || 'pcs',
                minimumOrderQuantity: supplierData.minimumOrderQuantity || 1
            };
        }
        return product;
    })
);
```

**Updated PO Data Creation (Lines 256-285):**
- Includes UOM fields in each item sent to PO service

---

## 5. Receiving Process Updates

### `src/services/firebase/PurchaseOrderServices.js`

#### `processReceiving()` Function (Lines 485-545)
**Added UOM Conversion Logic:**

1. **Retrieves Conversion Factor:**
   - First checks PO item data
   - Falls back to supplier-product mapping
   - Defaults to 1 if not found

2. **Converts Quantities:**
   ```javascript
   const receivedInSupplierUOM = Number(item.receivedQuantity);
   const receivedInSystemUnits = receivedInSupplierUOM * conversionFactor;
   ```

3. **Logs Conversion:**
   ```javascript
   console.log(`📦 Receiving: ${receivedInSupplierUOM} ${supplierUOM || 'units'} 
                = ${receivedInSystemUnits} ${systemBaseUnit || 'pcs'} 
                (conversion: ${conversionFactor})`);
   ```

4. **Updates Stock in System Units:**
   ```javascript
   const newQty = currentQty + receivedInSystemUnits;
   ```

5. **Creates Detailed Receipt:**
   ```javascript
   batch.set(receiptRef, {
       receivedQuantitySupplierUOM: receivedInSupplierUOM,
       supplierUOM: supplierUOM || 'pcs',
       receivedQuantitySystemUnits: receivedInSystemUnits,
       systemBaseUnit: systemBaseUnit || 'pcs',
       conversionFactor: conversionFactor,
       quantity: receivedInSystemUnits, // Backward compatibility
       // ... other fields
   });
   ```

---

## 6. Data Flow Summary

### Product-Supplier Linking Flow
```
1. User links product to supplier in SupplierProducts.jsx
   ↓
2. User enters:
   - Supplier Price (₱)
   - Supplier UOM (e.g., "bag")
   - Conversion Factor (e.g., 40 for 1 bag = 40 kg)
   - Minimum Order Quantity (e.g., 10 bags)
   ↓
3. linkProductToSupplier() stores in Firestore:
   Suppliers/{supplierId}/products/{variantId}
```

### Purchase Order Creation Flow
```
1. CreatePOModal fetches products needing restock
   ↓
2. findSuppliersForVariant() retrieves supplier data INCLUDING UOM fields
   ↓
3. User selects supplier → item initialized with UOM data
   ↓
4. PO created with items containing:
   - unitPrice (from supplierPrice mapping)
   - supplierUOM
   - conversionFactor
   - systemBaseUnit
```

### Receiving Flow
```
1. User receives items via PendingReceipts.jsx
   ↓
2. processReceiving() retrieves conversion factor from:
   a. PO item data, OR
   b. Suppliers/{supplierId}/products/{variantId} mapping
   ↓
3. Converts: receivedQty × conversionFactor = systemUnits
   ↓
4. Updates inventory in system base units
   ↓
5. Logs receipt with both UOM quantities for audit
```

---

## 7. Critical Fix Points Addressed

✅ **Fix 1:** linkProductToSupplier() now stores UOM fields  
✅ **Fix 2:** SupplierProducts UI collects UOM data during linking  
✅ **Fix 3:** Edit forms include UOM fields  
✅ **Fix 4:** NewVariantForm includes UOM when linking  
✅ **Fix 5:** SupplierPOModal retrieves supplier-specific pricing from mapping  
✅ **Fix 6:** CreatePOModal propagates UOM data through item creation  
✅ **Fix 7:** PO items include UOM fields when sent to service  
✅ **Fix 8:** processReceiving() applies conversion factor to update inventory correctly  

---

## 8. Database Schema Changes

### New Fields in `Suppliers/{supplierId}/products/{variantId}`

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `supplierPrice` | number | Price from supplier | 0 |
| `lastPurchasePrice` | number | Last price paid | null |
| `lastPurchaseDate` | timestamp | When last ordered | null |
| `supplierUOM` | string | Supplier's unit | variant.baseUnit or 'pcs' |
| `systemBaseUnit` | string | System's base unit | variant.baseUnit or 'pcs' |
| `conversionFactor` | number | Conversion multiplier | 1 |
| `minimumOrderQuantity` | number | MOQ | 1 |
| `supplierLeadTime` | number | Days (optional) | null |
| `supplierProductCode` | string | Supplier's code | '' |

### New Fields in `stock_receipts` Collection

| Field | Type | Description |
|-------|------|-------------|
| `receivedQuantitySupplierUOM` | number | Qty in supplier's units |
| `supplierUOM` | string | Supplier's unit used |
| `receivedQuantitySystemUnits` | number | Qty in system units |
| `systemBaseUnit` | string | System unit |
| `conversionFactor` | number | Conversion applied |
| `quantity` | number | System qty (backward compat) |

---

## 9. Usage Examples

### Example 1: Cement Supplier (Bags → Kilograms)
```javascript
// Linking cement to supplier
linkProductToSupplier(cementVariantId, supplierId, {
    supplierPrice: 220,           // ₱220 per bag
    supplierUOM: 'bag',
    conversionFactor: 40,         // 1 bag = 40 kg
    systemBaseUnit: 'kg',
    minimumOrderQuantity: 50      // Min 50 bags
});

// When receiving 100 bags
processReceiving(poId, [{
    productId: cementVariantId,
    receivedQuantity: 100         // 100 bags
}]);
// → Adds 4000 kg to inventory (100 × 40)
```

### Example 2: Steel (Pieces → Meters)
```javascript
// Linking steel to supplier
linkProductToSupplier(steelVariantId, supplierId, {
    supplierPrice: 850,           // ₱850 per 6m piece
    supplierUOM: 'piece',
    conversionFactor: 6,          // 1 piece = 6 meters
    systemBaseUnit: 'm',
    minimumOrderQuantity: 20      // Min 20 pieces
});

// When receiving 50 pieces
processReceiving(poId, [{
    productId: steelVariantId,
    receivedQuantity: 50          // 50 pieces
}]);
// → Adds 300 m to inventory (50 × 6)
```

---

## 10. Backward Compatibility

✅ **Existing supplier-product links without UOM data:**
- `conversionFactor` defaults to 1 (1:1)
- `supplierUOM` defaults to system base unit
- No conversion applied → works as before

✅ **Old receipts:**
- New `quantity` field maintains backward compatibility
- Old fields still readable

✅ **Legacy POs:**
- Will be processed without conversion if UOM data missing
- System gracefully handles missing fields

---

## 11. Testing Checklist

### Link Product to Supplier
- [ ] Enter supplier price
- [ ] Set supplier UOM different from system unit
- [ ] Set conversion factor
- [ ] Set minimum order quantity
- [ ] Verify data saved in Firestore
- [ ] Verify display shows UOM info

### Create Purchase Order
- [ ] Select supplier with UOM-configured products
- [ ] Verify unit price uses supplier price from mapping
- [ ] Verify UOM fields present in PO items
- [ ] Create PO successfully

### Receive Items
- [ ] Receive items with UOM conversion
- [ ] Verify console shows conversion log
- [ ] Verify inventory updated with converted quantity
- [ ] Verify receipt document has both UOM quantities
- [ ] Check stock levels match expected converted values

### Edge Cases
- [ ] Product with no supplier UOM (should use 1:1)
- [ ] Multiple locations for same product
- [ ] Partial receiving with conversion
- [ ] Edit supplier UOM after linking

---

## 12. Future Enhancements

1. **Price History Tracking:**
   - Store `priceHistory: [{price, date, poId}]` array
   - Track supplier price changes over time

2. **Multiple UOM Support:**
   - Allow suppliers to provide multiple UOMs
   - Example: Same product sold by piece, box, or pallet

3. **Automatic Conversion in PO UI:**
   - Show real-time conversion in PO creation
   - Display: "Order 50 bags (= 2000 kg)"

4. **MOQ Validation:**
   - Warn if quantity below minimum order
   - Suggest rounding up to MOQ

5. **Lead Time Tracking:**
   - Use `supplierLeadTime` for delivery estimates
   - Show expected delivery dates

---

## Files Modified

1. `src/services/firebase/ProductServices.jsx`
2. `src/features/inventory/components/Supplier/SupplierProducts.jsx`
3. `src/features/inventory/components/Inventory/CategoryModal/NewVariantForm.jsx`
4. `src/features/inventory/components/PurchaseOrder/CreatePOModal.jsx`
5. `src/features/inventory/components/PurchaseOrder/SupplierPOModal.jsx`
6. `src/features/inventory/components/PurchaseOrder/ViewPOModal.jsx`
7. `src/services/firebase/PurchaseOrderServices.js`

---

## UI Display Updates Summary

### 1. Supplier Products Modal (`SupplierProducts.jsx`)

**Link Product Form:**
- ✅ Shows Supplier Price input
- ✅ Shows Supplier UOM input with helper text
- ✅ Shows Conversion Factor with dynamic label (e.g., "1 bag = ? kg")
- ✅ Shows Minimum Order Quantity input

**Product Cards (Non-Editing View):**
- ✅ Displays supplier price
- ✅ Displays unit price
- ✅ Shows "Supplier UOM: bag (×40)" if UOM conversion exists
- ✅ Shows "Min Order: 50 bags" if MOQ > 1

**Edit Form:**
- ✅ All UOM fields editable
- ✅ Shows current values
- ✅ Grid layout for UOM and conversion fields

### 2. Purchase Order View Modal (`ViewPOModal.jsx`)

**Items Table:**
- ✅ Product name shows UOM info below: "📦 UOM: bag (×40 = kg)"
- ✅ Quantity column shows unit: "100 bags"
- ✅ Receiving input shows supplier UOM label: "50 bags"
- ✅ Real-time conversion preview: "= 2000 kg" (in green)

**Received Products Section:**
- ✅ Shows received quantity with UOM: "100 bags"
- ✅ Shows converted system units (green): "System Units: 4000 kg"
- ✅ Displays both UOM quantities for audit trail

### 3. Supplier PO Modal (`SupplierPOModal.jsx`)

**Product Items:**
- ✅ Fetches supplier-specific pricing from mapping
- ✅ Uses `supplierPrice` instead of retail `unitPrice`
- ✅ Includes UOM data in each item
- ✅ Data propagated to PO creation

### 4. Create PO Modal (`CreatePOModal.jsx`)

**Supplier Selection:**
- ✅ UOM data included in supplier objects
- ✅ Conversion factor passed through
- ✅ MOQ information available

**Order Items:**
- ✅ Items initialized with UOM fields
- ✅ All UOM data sent to backend service

---

## Visual Examples

### Example 1: Linking Cement Product to Supplier
```
┌─────────────────────────────────────────────┐
│ Link Product to Supplier                   │
├─────────────────────────────────────────────┤
│                                             │
│ Supplier Price (₱)                          │
│ ┌─────────────────────────────────────┐    │
│ │ 220.00                              │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ Supplier UOM     │  Conversion             │
│ ┌──────────────┐ │ ┌──────────────┐       │
│ │ bag          │ │ │ 40           │       │
│ └──────────────┘ │ └──────────────┘       │
│ Unit supplier uses│ 1 bag = ? kg          │
│                                             │
│ Minimum Order Qty                           │
│ ┌─────────────────────────────────────┐    │
│ │ 50                                  │    │
│ └─────────────────────────────────────┘    │
│ Minimum quantity to order                   │
│                                             │
│         [Link Product]  [Cancel]            │
└─────────────────────────────────────────────┘
```

### Example 2: Viewing PO with Conversion
```
┌──────────────────────────────────────────────────────────────┐
│ Purchase Order: PO-2025-001                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Product              │ Quantity    │ Unit Price  │ Total    │
│─────────────────────────────────────────────────────────────│
│ Portland Cement      │ 100 bags    │ ₱220       │ ₱22,000  │
│ 📦 UOM: bag (×40=kg) │             │            │          │
│                                                              │
│ Steel Rebar 10mm     │ 50 pieces   │ ₱850       │ ₱42,500  │
│ 📦 UOM: piece (×6=m) │             │            │          │
└──────────────────────────────────────────────────────────────┘
```

### Example 3: Receiving with Live Conversion
```
┌──────────────────────────────────────────────────────────────┐
│ Receive Items                                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Portland Cement                                              │
│ Ordered: 100 bags                                            │
│                                                              │
│ Received: ┌────┐ bags                                       │
│           │ 98 │                                             │
│           └────┘                                             │
│ = 3920 kg ← Real-time conversion in green                  │
│                                                              │
│ [Confirm Receipt]  [Cancel]                                 │
└──────────────────────────────────────────────────────────────┘
```

### Example 4: Product Card Display
```
┌─────────────────────────────────────┐
│ 🏗️ Portland Cement                  │
│ Brand: Holcim                       │
│ ──────────────────────────────────  │
│ Supplier Price: ₱220               │
│ Unit Price: ₱250                    │
│ Supplier UOM: bag (×40)            │
│ Min Order: 50 bags                  │
│                                     │
│ [Edit] [Unlink]                     │
└─────────────────────────────────────┘
```

---

## Conclusion

The supplier UOM and pricing system is now fully integrated across:
- ✅ Supplier-product linking
- ✅ Purchase order creation
- ✅ Receiving workflow
- ✅ Inventory updates with proper conversion

All data is stored in Firestore with proper structure, and the system gracefully handles missing UOM data for backward compatibility.
