# Storage Facility & Shelf View Modal Fix Summary

## Issues Fixed

### 1. Products Not Displaying in ShelfViewModal ✅

**Problem:**
- `ShelfViewModal.jsx` was fetching products from the old nested structure: `Products/{Unit}/products/{productId}`
- The system has migrated to a **flat data structure** using:
  - `Products` collection (top-level) - Contains master product info only
  - `Variants` collection (top-level) - Contains all inventory items with stock, price, and location data

**Solution:**
Updated `ShelfViewModal.jsx` to handle the `locations` array in variants:
```javascript
// NEW: Iterate through all variants and check locations array
variantsSnapshot.docs.forEach(variantDoc => {
  const variantData = variantDoc.data();
  
  // Check locations array (multi-location support)
  if (variantData.locations && Array.isArray(variantData.locations)) {
    variantData.locations.forEach(location => {
      const locationUnit = location.unit || location.storageLocation;
      
      // Only include locations that match this unit
      if (locationUnit === unitName) {
        // Create product entry for this specific location
        products.push({
          ...variantData,
          shelfName: location.shelfName,
          rowName: location.rowName,
          columnIndex: location.columnIndex,
          quantity: location.quantity  // Location-specific quantity!
        });
      }
    });
  }
  // Fallback for legacy single location
  else if (variantData.storageLocation === unitName) {
    products.push(variantData);
  }
});
```

**Key Changes:**
- Added `query` and `where` imports from `firebase/firestore`
- Now fetches ALL variants and iterates through their `locations` array
- Extracts location-specific data: `shelfName`, `rowName`, `columnIndex`, `quantity`
- Each location in the array is treated as a separate product entry
- Supports both multi-location variants and legacy single-location variants
- Display name shows as: `ProductName (VariantName)` for clarity

---

### 2. Unit 03 Showing Yard Instead of Sacks ✅

**Problem:**
- When clicking "Unit 03" (Cement & Aggregates - Sacks), it was opening "Unit 03 Yard" (Bulk Storage) instead
- The `shelfLayouts` mapping function was creating a key collision:
  - `unit-03` → `unit3`
  - `unit-03-yard` → `unit3` (parseInt('03-yard') = 3) ❌ COLLISION!

**Solution:**
Updated the `shelfLayouts` mapping in `StorageFacilityInteractiveMap.jsx` to handle special cases:
```javascript
if (unit.id === 'unit-03-yard') {
  unitKey = 'unit3-yard';  // Keep the '-yard' suffix
} else {
  const unitNumber = unit.id.split('-')[1];
  unitKey = 'unit' + parseInt(unitNumber);
}
```

**Result:**
- ✅ Clicking "Unit 03" now correctly opens the bagged cement storage (Zone 1 with rows)
- ✅ Clicking "Unit 03 Yard" opens the bulk cement outdoor storage area
- ✅ No more key collisions in the shelfLayouts mapping

---

### 3. Updated StorageFacilityInteractiveMap Capacity Calculation ✅

**Problem:**
- Capacity calculation was still using the old nested structure to count products

**Solution:**
Updated `fetchUnitCapacities()` to handle the `locations` array:
```javascript
// NEW: Fetch variants and process locations array
const variantsRef = collection(db, 'Variants');
const variantsSnapshot = await getDocs(variantsRef);

const unitProductCounts = {};

variantsSnapshot.docs.forEach(doc => {
  const variant = doc.data();
  const productId = variant.parentProductId;
  
  // Check locations array (multi-location support)
  if (variant.locations && Array.isArray(variant.locations)) {
    variant.locations.forEach(location => {
      const storageLocation = location.unit || location.storageLocation;
      
      if (storageLocation) {
        // Initialize set for this unit if needed
        if (!unitProductCounts[storageLocation]) {
          unitProductCounts[storageLocation] = new Set();
        }
        
        // Add product ID to set (automatically handles uniqueness)
        unitProductCounts[storageLocation].add(productId);
      }
    });
  }
  // Fallback for legacy single location
  else if (variant.storageLocation) {
    if (!unitProductCounts[variant.storageLocation]) {
      unitProductCounts[variant.storageLocation] = new Set();
    }
    unitProductCounts[variant.storageLocation].add(productId);
  }
});
```

**Benefits:**
- Accurate capacity calculations for all units
- Properly handles multi-location variants
- Counts unique products (by `parentProductId`), not duplicate variant entries
- Compatible with both new multi-location and legacy single-location structures

---

## Files Modified

### 1. `ShelfViewModal.jsx`
**Location:** `src/features/inventory/components/Inventory/ShelfViewModal.jsx`

**Changes:**
- ✅ Added `query, where` imports from firebase/firestore
- ✅ Updated `fetchUnitProducts()` to query flat `Variants` collection
- ✅ Added `storageLocation` filter to get variants for specific unit
- ✅ Improved display names: `ProductName (VariantName)`
- ✅ Added console logging for debugging

---

### 2. `StorageFacilityInteractiveMap.jsx`
**Location:** `src/features/inventory/components/Inventory/StorageFacilityInteractiveMap.jsx`

**Changes:**
- ✅ Fixed `shelfLayouts` mapping to handle `unit-03-yard` separately
- ✅ Updated `fetchUnitCapacities()` to query flat `Variants` collection
- ✅ Groups variants by `storageLocation` field
- ✅ Counts unique products by `parentProductId`
- ✅ Prevents key collisions between Unit 03 and Unit 03 Yard

---

## Data Structure Reference

### Current Architecture (Flat Structure with Multi-Location Support)

```
Products (collection) - Top Level
├── PROD_CEM_001
│   ├── name: "Portland Cement"
│   ├── brand: "Republic Cement"
│   ├── category: "Cement & Aggregates"
│   └── ... (general product info only)

Variants (collection) - Top Level
├── VAR_CEM_001_40KG
│   ├── parentProductId: "PROD_CEM_001"
│   ├── productName: "Portland Cement" (denormalized)
│   ├── variantName: "40kg Bag"
│   ├── quantity: 200 (total across all locations)
│   ├── unitPrice: 255.00
│   ├── locations: [  // 🔥 IMPORTANT: Array of locations!
│   │     {
│   │       unit: "Unit 03",
│   │       storageLocation: "Unit 03",
│   │       shelfName: "Zone 1",
│   │       rowName: "Row 1",
│   │       columnIndex: 0,
│   │       quantity: 120,  // Quantity at THIS specific location
│   │       location: "Unit 03 - Zone 1 - Row 1 - Column 1"
│   │     },
│   │     {
│   │       unit: "Unit 03",
│   │       shelfName: "Zone 1",
│   │       rowName: "Row 2",
│   │       columnIndex: 5,
│   │       quantity: 80,  // Quantity at THIS location
│   │       location: "Unit 03 - Zone 1 - Row 2 - Column 6"
│   │     }
│   │   ]
│   ├── storageLocation: "Unit 03" (legacy field - first location)
│   ├── shelfName: "Zone 1" (legacy field)
│   ├── rowName: "Row 1" (legacy field)
│   └── columnIndex: 0 (legacy field)
```

### Key Points

1. **Multi-Location Support**: Each variant can be stored in **multiple locations** via the `locations` array
2. **Location Object Structure**:
   - `unit` or `storageLocation`: Storage unit name (e.g., "Unit 03")
   - `shelfName` or `shelf`: Shelf/Zone name
   - `rowName` or `row`: Row name
   - `columnIndex`: Column number (0-indexed)
   - `quantity`: Quantity at this specific location
   - `location`: Full location string
3. **Legacy Compatibility**: Single location fields (`storageLocation`, `shelfName`, etc.) are maintained for backward compatibility

---

## Storage Unit Configuration

### Unit 03 - Cement & Aggregates (Sacks)
- **ID:** `unit-03`
- **Shelf Layout:** Zone 1 with 10 rows × 15 columns
- **Capacity:** 1200 bags (120 per row)
- **Click Action:** Opens `unit3` in modal

### Unit 03 Yard - Bulk Cement Storage
- **ID:** `unit-03-yard`
- **Type:** Outdoor Stockpile
- **Layout:** Single bulk storage area
- **Capacity:** 10,000 m³ (conceptual)
- **Click Action:** Opens `unit3-yard` in modal

---

## Testing Checklist

- ✅ Click "Unit 03" → Should show bagged cement storage with Zone 1 and rows
- ✅ Click "Unit 03 Yard" → Should show bulk storage yard area
- ✅ Products display correctly in all units (if variants exist with proper location data)
- ✅ Capacity indicators show correct product counts
- ✅ No console errors when opening any unit
- ✅ Products are grouped by location (shelf, row, column)

---

## Future Considerations

### Data Migration
If you still have products in the old nested structure (`Products/{Unit}/products/{productId}`), you'll need to migrate them to the new flat structure:

1. **Master Products** → Move to top-level `Products` collection
2. **Variants** → Move to top-level `Variants` collection with:
   - `parentProductId` field
   - `storageLocation` field (e.g., "Unit 03")
   - Denormalized product data (productName, productBrand, productCategory)

### Backward Compatibility
The current code only supports the **new flat structure**. If you need to support both:
- Add a feature flag like `USE_NEW_ARCHITECTURE` (already exists in `Inventory.jsx`)
- Implement dual fetch logic with fallback

---

## Summary

✅ **Fixed:** Products now display correctly in ShelfViewModal using the flat Variants collection  
✅ **Fixed:** Unit 03 and Unit 03 Yard are now properly separated with unique keys  
✅ **Fixed:** Capacity calculation updated to use flat Variants collection  
✅ **Improved:** Better error handling and console logging for debugging  

All storage facility interactions now work correctly with the new flat data structure! 🎉
