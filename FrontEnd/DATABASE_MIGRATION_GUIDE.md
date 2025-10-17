# Database Structure Migration Guide

## Overview
We've changed from a **flat structure** to a **nested by storage unit** structure:

**OLD (Flat)**:
```
Products/{productId}
```

**NEW (Nested)**:
```
Products/{storageUnit}/products/{productId}
```

## Files That Need Updates

### ✅ COMPLETED

1. **NewProductForm.jsx** - Creates products in nested structure
2. **NewVariantForm.jsx** - Creates variants in nested structure  
3. **ProductServices.jsx** - Fetches from all storage units
4. **Pos_NewSale.jsx** - Stock validation updated
5. **STOR

AGEFacilityInteractiveMap.jsx** - Fetches from nested structure

### 🔄 NEEDS MANUAL UPDATE

#### 1. release_mobile_view.jsx
**Location**: `src/features/inventory/pages/release_mobile_view.jsx`

**What to update**:
- `findProductInInventory()` function (lines ~148-489)
- `updateInventoryQuantities()` function (lines ~493-639)

**Current issue**: Still uses old shelves/rows/columns/items structure

**Required changes**:
```javascript
// OLD PATH
doc(db, 'Products', storageLocation, 'shelves', shelfName, 'rows', rowName, 'columns', columnIndex, 'items', productId)

// NEW PATH  
doc(db, 'Products', storageLocation, 'products', productId)
```

**Action**: Replace the entire `findProductInInventory` and `updateInventoryQuantities` functions with simpler versions that use the nested structure.

---

#### 2. MobileReceive.jsx
**Location**: `src/features/inventory/pages/MobileReceive.jsx`

**What to update**:
- Product receiving logic
- Adding received items to inventory

**Required changes**:
When adding received products to inventory, save to:
```javascript
doc(db, 'Products', storageUnit, 'products', productId)
```

---

#### 3. ViewProductModal.jsx
**Location**: `src/features/inventory/components/Inventory/ViewProductModal.jsx`

**What to update**:
- Product editing/updating
- Saving changes to product details

**Required changes**:
```javascript
// When updating a product
const productRef = doc(db, 'Products', product.storageLocation, 'products', product.id);
await updateDoc(productRef, updates);
```

---

#### 4. StockTransfer.jsx  
**Location**: `src/features/inventory/pages/StockTransfer.jsx`

**What to update**:
- Moving products between storage units
- This is CRITICAL because products change storage locations

**Required changes**:
```javascript
// When transferring from Unit 01 to Unit 02:

// 1. Get product from source
const sourceRef = doc(db, 'Products', 'Unit 01', 'products', productId);
const productData = await getDoc(sourceRef);

// 2. Create in destination with updated storageLocation
const destRef = doc(db, 'Products', 'Unit 02', 'products', productId);
await setDoc(destRef, {
  ...productData.data(),
  storageLocation: 'Unit 02',
  // Update shelf, row, column as needed
});

// 3. Delete from source
await deleteDoc(sourceRef);
```

---

#### 5. RestockingRequest.jsx
**Location**: `src/features/inventory/pages/RestockingRequest.jsx`

**What to update**:
- Restocking logic when adding stock
- Product quantity updates

**Required changes**:
```javascript
// When fulfilling a restock request
const productRef = doc(db, 'Products', product.storageLocation, 'products', product.id);
await updateDoc(productRef, {
  quantity: increment(restockAmount)
});
```

---

## Key Patterns

### Reading a Product
```javascript
// You MUST know the storage location
const productRef = doc(db, 'Products', storageLocation, 'products', productId);
const productDoc = await getDoc(productRef);
```

### Updating a Product
```javascript
const productRef = doc(db, 'Products', product.storageLocation, 'products', product.id);
await updateDoc(productRef, {
  quantity: newQuantity,
  // other fields
});
```

### Searching All Products
```javascript
const allProducts = [];
const productsRef = collection(db, 'Products');
const storageUnitsSnapshot = await getDocs(productsRef);

for (const unitDoc of storageUnitsSnapshot.docs) {
  const unitId = unitDoc.id;
  if (!unitId.startsWith('Unit ')) continue;
  
  const productsSubRef = collection(db, 'Products', unitId, 'products');
  const productsSnapshot = await getDocs(productsSubRef);
  
  productsSnapshot.docs.forEach(doc => {
    allProducts.push({ ...doc.data(), id: doc.id });
  });
}
```

### Deleting a Product
```javascript
const productRef = doc(db, 'Products', product.storageLocation, 'products', product.id);
await deleteDoc(productRef);
```

## Important Notes

1. **Storage Location is Critical**: Every product operation now requires knowing the `storageLocation` field.

2. **Product Data Always Has storageLocation**: All product documents have a `storageLocation` field (e.g., "Unit 01", "Unit 02").

3. **Variants Are Separate Products**: Variants are NOT nested arrays anymore. They are separate product documents with:
   - `isVariant: true`
   - `parentProductId: {baseProductId}`
   - Same `storageLocation` as parent (or different if moved)

4. **NO MORE Shelves/Rows/Columns Collections**: The old deeply nested structure is gone. Products go directly under storage units:
   - ❌ OLD: `Products/Unit 01/shelves/Shelf A/rows/Row 1/columns/0/items/PROD001`
   - ✅ NEW: `Products/Unit 01/products/PROD001`

5. **Shelf/Row/Column are Fields**: Storage details are stored as fields in the product document:
   ```javascript
   {
     storageLocation: "Unit 01",
     shelfName: "Shelf A",
     rowName: "Row 1",
     columnIndex: 1,
     fullLocation: "Unit 01 - Shelf A - Row 1 - Column 1"
   }
   ```

## Testing Checklist

After making changes, test:

- [ ] Create new product → saves to correct path
- [ ] Create variant → saves as separate product
- [ ] Edit product → updates at correct path
- [ ] Delete product → removes from correct path
- [ ] Stock transfer → moves between units correctly
- [ ] POS sale → validates stock correctly
- [ ] Release items → deducts from correct products
- [ ] Receive items → adds to correct products
- [ ] Restocking → updates correct products
- [ ] Product search → finds products across all units

## Need Help?

If you encounter products that don't have `storageLocation` field, they're likely old data. You'll need to either:
1. Delete them and re-create
2. Manually add the `storageLocation` field in Firebase console
3. Create a migration script to move old products to the new structure
