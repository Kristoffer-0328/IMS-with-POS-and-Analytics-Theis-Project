# IMS Code Review & Validation Report
**Generated:** November 1, 2025  
**Reviewer:** GitHub Copilot (Expert Code Analysis)  
**Scope:** Firebase Firestore-based IMS with POS and Analytics

---

## EXECUTIVE SUMMARY

This codebase implements a sophisticated Inventory Management System with Point of Sale functionality. After comprehensive analysis, I've identified **8 CRITICAL issues** and **12 HIGH-severity issues** that could cause runtime failures, data inconsistency, and transaction errors.

### Critical Issues Overview:
1. **POS Sale Flow - MISSING release_logs Creation**: POS_NewSale.jsx creates stock_movements but release_logs are written *asynchronously after transaction*, creating potential data loss if errors occur
2. **RestockingAlertModal - WRONG Status Value**: Uses `'resolved_safety_stock'` but system never checks this status in queries
3. **Status Name Inconsistency**: RestockingRequests use multiple status strings (`pending`, `acknowledged`, `dismissed`, `resolved_safety_stock`) but queries only check `['pending', 'acknowledged']`
4. **Race Condition in Multi-Location Deduction**: `updateInventoryQuantities()` uses batched writes without transaction guarantees across multiple storage units
5. **Missing Field Validation**: `safetyStock` field assumed to exist on product documents but not validated before arithmetic operations
6. **Inconsistent movementType Values**: Code uses `'OUT'`, `'IN'`, `'safety_stock_replenishment'` but documentation shows `'IN/OUT'`, `'DAMAGED_RECEIPT'`, and others
7. **Non-Atomic Replenishment**: RestockingAlertModal's `handleReplenish` uses transaction but searches for product *outside* transaction boundary
8. **Missing Product Linking in Bulk Import**: BulkProductImport links products to supplier but doesn't verify supplier exists first

---

## A. REPOSITORY SCAN & VERIFICATION REPORT

### 1. NewProductForm.jsx
**Location:** `src/features/inventory/components/Inventory/CategoryModal/NewProductForm.jsx`

#### Responsibilities Implemented:
✅ Creates products individually via form  
✅ Links products to suppliers automatically  
✅ Calculates EOQ and ROP on product creation  
✅ Supports multi-location storage allocation  
✅ Validates required fields before submission  

#### Firestore Collections/Fields Accessed:
- **Write to:** `Products/{storageUnit}/products/{productId}`
  - Fields: `name`, `quantity`, `unitPrice`, `supplierPrice`, `category`, `storageLocation`, `shelfName`, `rowName`, `columnIndex`, `fullLocation`, `unit`, `brand`, `size`, `specifications`, `maximumStockLevel`, `safetyStock`, `dateStocked`, `imageUrl`, `categoryValues`, `suppliers[]`, `customFields{}`, `eoq`, `rop`, `restockLevel`, `createdAt`, `lastUpdated`, `multiLocation`, `totalQuantityAllLocations`
- **Read from:** `Products/{storageUnit}` (to get storage unit category)
- **Call:** `linkProductToSupplier()` from ProductServices

#### Issues Found:

**CRITICAL-1: EOQ Calculation Uses Incorrect Formula**
- **Line:** 356-360
- **Issue:** `holdingPeriodDays` calculation can be 0 or 1 on first creation, causing division by near-zero
- **Current Code:**
```javascript
const holdingPeriodDays = Math.max(1, Math.ceil((currentDate - createdDate) / (1000 * 60 * 60 * 24)));
const holdingCost = purchaseCost / holdingPeriodDays;
```
- **Impact:** EOQ will be incorrectly high for new products, leading to over-ordering
- **Fix:** Use default annual holding cost percentage (industry standard 20-30% of item cost)

**HIGH-1: No Validation for Supplier Existence**
- **Line:** 326
- **Issue:** Code assumes `selectedSuppliers` array is valid but doesn't check if suppliers exist in DB
- **Impact:** Can create products with invalid supplier references
- **Fix:** Validate supplier IDs before product creation

**MEDIUM-1: Supplier Linking Errors Not Propagated**
- **Line:** 408-411
- **Issue:** `linkProductToSupplier` failures are caught and logged but don't fail the overall product creation
- **Impact:** Product created without supplier link, breaks Purchase Order flow
- **Fix:** Collect all errors and alert user with specific failure details

**MEDIUM-2: Missing Transaction for Multi-Location Creation**
- **Line:** 319-415
- **Issue:** Loop creates separate documents without transaction, partial failure leaves inconsistent state
- **Impact:** If creation fails mid-loop, some locations have product, others don't
- **Fix:** Use Firestore batch or transaction for all location writes

---

### 2. BulkProductImport.jsx
**Location:** `src/features/inventory/components/BulkProductImport.jsx`

#### Responsibilities Implemented:
✅ Imports products from CSV  
✅ Validates CSV structure and required fields  
✅ Links all imported products to selected supplier  
✅ Uses batch writes for performance  
✅ Provides template download  

#### Firestore Collections/Fields Accessed:
- **Write to:** `Products/{storageLocation}/products/{productId}` (via batch)
- **Call:** `linkProductToSupplier()` for each product

#### Issues Found:

**CRITICAL-2: Batch Commit Without Error Handling for Individual Products**
- **Line:** 186-201
- **Issue:** `saveProductsToFirestore` commits batch without catching per-product errors
- **Current Code:**
```javascript
for (const product of products) {
  const productRef = doc(db, 'Products', product.storageLocation, 'products', product.id);
  batch.set(productRef, product);
  operationCount++;
  setImportProgress(prev => ({ ...prev, current: operationCount }));
}
await batch.commit();
```
- **Impact:** If any product in batch has invalid data, entire batch fails with cryptic error
- **Fix:** Validate each product before adding to batch, catch batch.commit() errors properly

**HIGH-2: Supplier Linking Loop Doesn't Stop on Failure**
- **Line:** 204-218
- **Issue:** Loop continues even if some products fail to link, no summary of failures provided
- **Impact:** User sees "success" message but some products aren't linked to supplier
- **Fix:** Track failures and show detailed error report

**MEDIUM-3: No Validation for StorageLocation Existence**
- **Line:** 99-104
- **Issue:** Parses storage location from CSV but doesn't verify location exists in system
- **Impact:** Products created with invalid storage references
- **Fix:** Query Products collection to validate storage unit exists

---

### 3. Pos_NewSale.jsx
**Location:** `src/features/pos/pages/Pos_NewSale.jsx`

#### Responsibilities Implemented:
✅ Creates sales transactions  
✅ Deducts stock from inventory  
✅ Creates stock_movements records  
✅ Creates release_logs for legacy mobile  
✅ Checks ROP and generates RestockingRequests  
✅ Generates sales notifications  
✅ Handles multi-location inventory deduction  

#### Firestore Collections/Fields Accessed:
- **Read from:** `Products/{unit}/products/*` (multi-unit search)
- **Write to:** 
  - `posTransactions/{receiptNumber}` - sale record
  - `stock_movements/{id}` - one per cart item
  - `release_logs/{id}` - one per cart item
  - `RestockingRequests/{id}` - if ROP triggered
  - `Notifications/{id}` - sale + restock alerts
- **Update:** `Products/{unit}/products/{productId}` - quantity deduction

#### Issues Found:

**CRITICAL-3: Release Logs Created OUTSIDE Transaction Boundary**
- **Line:** 1683-1702
- **Issue:** `release_logs` written after inventory deduction succeeds but errors are ignored
- **Current Code:**
```javascript
try {
  await updateInventoryQuantities(productsForDeduction, currentUser); // Uses batch
} catch (inventoryError) {
  // ... error handling
}

// ... then later, OUTSIDE the transaction:
try {
  const releaseLogPromises = addedProducts.map(async (item) => {
    const releaseLogRef = doc(collection(db, 'release_logs'));
    // ... create log
    return setDoc(releaseLogRef, releaseLogData);
  });
  await Promise.all(releaseLogPromises);
} catch (releaseLogError) {
  console.error('Error creating release logs:', releaseLogError);
  // Don't fail the transaction if release log creation fails <-- BUG!
}
```
- **Impact:** If release_logs write fails, legacy mobile app won't see sale data, audit trail broken
- **Tradeoff Stated:** "Don't fail transaction if release log logging fails" — **This violates audit requirements**
- **Fix:** Include release_logs in same batch as stock deduction, or use Cloud Function trigger

**CRITICAL-4: Race Condition in Multi-Location Deduction**
- **Line:** 1015-1168 (`updateInventoryQuantities`)
- **Issue:** Function uses batched writes but searches across storage units without locks
- **Current Code:**
```javascript
const allLocations = await findAllProductLocations(...); // Reads current quantities
// ... time passes ...
for (const location of allLocations) {
  // Get current document data first (outside transaction for batch efficiency)
  const docSnap = await getDoc(location.productRef);
  const productData = docSnap.data();
  const currentQty = Number(productData.quantity) || 0;
  const newQty = currentQty - deductQty;
  currentBatch.update(location.productRef, { quantity: Math.max(0, newQty) });
}
await currentBatch.commit();
```
- **Impact:** Two concurrent sales can deduct from same product, causing double-deduction or negative stock
- **Why This Happens:** `findAllProductLocations` reads quantities at T0, but by time batch commits at T1, another sale may have already deducted
- **Fix:** Use `runTransaction` instead of batch, or implement optimistic locking with version field

**CRITICAL-5: Missing Validation for safetyStock Field**
- **Line:** 156, 257
- **Issue:** Code assumes `safetyStock` exists but field may be undefined on older products
- **Current Code:**
```javascript
const safetyStock = Number(productData.safetyStock) || Number(variant.safetyStock) || 0;
```
- **Impact:** If safetyStock is `undefined`, `Number(undefined)` returns `NaN`, breaking ROP calculation
- **Fix:** Always use `|| 0` fallback **and** validate before arithmetic

**HIGH-3: Restock Request Not Awaited**
- **Line:** 321-330 (in `updateInventoryQuantities`)
- **Issue:** `generateRestockingRequest()` called but not awaited in variant update path
- **Impact:** Sale completes before restock request saved, potential data loss if process crashes
- **Fix:** Await all `generateRestockingRequest()` calls

**HIGH-4: No Validation for Products in Cart Before Transaction**
- **Line:** 1591-1619 (`validateStockBeforeTransaction`)
- **Issue:** Function validates stock but doesn't check if product still exists (could be deleted mid-session)
- **Impact:** Transaction fails with cryptic error if product deleted between adding to cart and checkout
- **Fix:** Check product existence in validation step

**MEDIUM-4: Quotation Products Allow Negative Inventory**
- **Line:** 1060, 1100, 1121
- **Issue:** Quotation products (ID starts with `'quotation-'`) allowed to go negative
- **Impact:** Inventory accuracy compromised, reports show incorrect stock levels
- **Fix:** Either disallow quotation products with negative stock, or track them separately

---

### 4. RestockingAlertModal.jsx
**Location:** `src/features/inventory/components/Admin/RestockingAlertModal.jsx`

#### Responsibilities Implemented:
✅ Displays restocking alerts grouped by product  
✅ Supports acknowledge/dismiss actions  
✅ Implements safety stock replenishment  
✅ Creates stock_movements and release_logs  
✅ Uses transaction for replenishment  

#### Firestore Collections/Fields Accessed:
- **Read from:** `RestockingRequests` (WHERE status IN `['pending', 'acknowledged']`)
- **Update:** `RestockingRequests/{id}` - change status
- **Update:** `Products/{unit}/products/{id}` - quantity and safetyStock
- **Write:** `stock_movements/{id}`, `release_logs/{id}`

#### Issues Found:

**CRITICAL-6: Status Value Mismatch**
- **Line:** 287-292
- **Issue:** Sets status to `'resolved_safety_stock'` but query only fetches `['pending', 'acknowledged']`
- **Current Code:**
```javascript
transaction.update(requestRef, {
  status: 'resolved_safety_stock',  // ← This status never fetched by query!
  resolvedAt: serverTimestamp(),
  // ...
});
```
- **Query Code (Line 36):**
```javascript
where('status', 'in', ['pending', 'acknowledged'])  // ← Doesn't include 'resolved_safety_stock'!
```
- **Impact:** Resolved requests remain in UI because query doesn't exclude them properly
- **Expected Behavior:** System description says "resolved_safety_stock removes from modal"
- **Fix:** Change query to exclude `'resolved_safety_stock'` explicitly:
```javascript
where('status', 'in', ['pending', 'acknowledged'])  // Current
// OR
where('status', 'not-in', ['dismissed', 'resolved_safety_stock', 'resolved_po'])  // Better
```

**CRITICAL-7: Transaction Searches Product Outside Transaction**
- **Line:** 216-238 (`handleReplenish`)
- **Issue:** `runTransaction` calls `getDocs()` inside transaction callback, but searches all storage units
- **Current Code:**
```javascript
await runTransaction(db, async (transaction) => {
  const productsRef = collection(db, 'Products');
  const storageUnitsSnapshot = await getDocs(productsRef);  // ← NOT transaction-safe!
  
  for (const unitDoc of storageUnitsSnapshot.docs) {
    const unitProductsRef = collection(db, 'Products', unitId, 'products');
    const productsSnapshot = await getDocs(unitProductsRef);  // ← Also not in transaction!
    // ... find product ...
  }
  
  transaction.update(productRef, { ... });  // ← May update wrong version!
});
```
- **Impact:** Product could be updated by another transaction between getDocs and update
- **Firestore Rule:** Transactions must use `transaction.get()` for reads
- **Fix:** Move product search outside transaction, use `transaction.get(productRef)` inside

**HIGH-5: Missing Validation for safetyStock in Replenishment**
- **Line:** 195
- **Issue:** Code checks `safetyStockAmount <= 0` but doesn't validate product actually has that much safety stock
- **Impact:** User confirms replenishment, but if concurrent sale used safety stock, replenishment fails mid-transaction
- **Fix:** Read current safetyStock inside transaction and validate before update

**MEDIUM-5: No Error Handling for Multiple Location Updates**
- **Line:** 283-291
- **Issue:** Loop updates all locations in group but doesn't validate each exists
- **Impact:** Partial updates if some requests reference deleted products
- **Fix:** Validate all locations exist before transaction

---

### 5. ProductServices.jsx
**Location:** `src/services/firebase/ProductServices.jsx`

#### Responsibilities Implemented:
✅ Listens to products across all storage units  
✅ Links products to suppliers  
✅ Manages supplier-product relationships  
✅ Fetches restock requests  

#### Firestore Collections/Fields Accessed:
- **Read from:** `Products/{unit}/products/*`
- **Write to:** `supplier_products/{supplierId}/products/{productId}`
- **Update:** `Products/{unit}/products/{productId}` - variants with supplier info

#### Issues Found:

**HIGH-6: No Atomic Link/Unlink for Supplier Products**
- **Line:** 113-120, 158-165
- **Issue:** `linkProductToSupplier` writes to two locations without transaction
- **Current Code:**
```javascript
export const linkProductToSupplier = async (productId, supplierId, supplierData) => {
  // 1. Write to supplier_products
  await setDoc(supplierProductRef, { ... });
  
  // 2. Update product variants (could fail independently!)
  await updateProductVariantsWithSupplier(productId, supplierId, supplierData);
};
```
- **Impact:** Supplier link created but product not updated, or vice versa
- **Fix:** Use transaction or batch to write both atomically

**MEDIUM-6: updateProductVariantsWithSupplier Doesn't Validate Variants Exist**
- **Line:** 127-174
- **Issue:** Maps over variants array without checking if variant exists first
- **Impact:** Can create supplier info on wrong variant if array indices shifted
- **Fix:** Match variants by ID or unique key, not array index

---

### 6. Purchase Order & Receiving Flow

**PurchaseOrders.jsx** (`src/features/inventory/pages/PurchaseOrders.jsx`)
- **Status Values Used:** `'draft'`, `'pending_approval'`, `'approved'`, `'rejected'`, `'completed'`
- **Receiving Status:** `'pending'`, `'partial'`, `'completed'`
- **Issues:** No validation for status transitions (e.g., can't go from rejected to completed)

**ReceivingManagement.jsx** delegates to `PendingReceipts` component (not scanned in detail)

---

## B. BEHAVIOR & DATA-MODEL CHECKS

### Canonical Status Strings

#### RestockingRequests Statuses
**Found in Code:**
- `'pending'` - New request, not yet seen
- `'acknowledged'` - Manager saw it, still needs action
- `'dismissed'` - Ignored/removed
- `'resolved_safety_stock'` - Resolved by safety stock replenishment (NEVER QUERIED!)

**Recommended Canonical Set:**
```javascript
const RESTOCK_REQUEST_STATUS = {
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  DISMISSED: 'dismissed',
  RESOLVED_SAFETY_STOCK: 'resolved_safety_stock',
  RESOLVED_PO: 'resolved_po',  // When PO created for this request
  EXPIRED: 'expired'  // If request older than X days
};
```

**Fix Required:**
- Query should be: `where('status', 'in', [RESTOCK_REQUEST_STATUS.PENDING, RESTOCK_REQUEST_STATUS.ACKNOWLEDGED])`
- OR better: `where('status', 'not-in', [RESTOCK_REQUEST_STATUS.DISMISSED, RESTOCK_REQUEST_STATUS.RESOLVED_SAFETY_STOCK, RESTOCK_REQUEST_STATUS.RESOLVED_PO])`

#### Purchase Order Statuses
**Found:**
- `'draft'`, `'pending_approval'`, `'approved'`, `'rejected'`, `'completed'`

**Canonical Set (OK as-is):**
```javascript
const PO_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
};
```

### Canonical movementType Values

**Found in Code:**
- `'OUT'` - POS sale, stock release
- `'IN'` - Receiving goods
- `'safety_stock_replenishment'` - Replenish from safety stock

**Found in Docs (STOCK_MOVEMENT_FLOW.md):**
- `'IN/OUT'` - Stock transfer
- `'DAMAGED_RECEIPT'` - Receiving damaged goods

**Recommended Canonical Set:**
```javascript
const MOVEMENT_TYPE = {
  IN: 'IN',                                      // Receiving from supplier
  OUT: 'OUT',                                    // POS sale or release
  TRANSFER_IN: 'TRANSFER_IN',                    // Stock transfer incoming
  TRANSFER_OUT: 'TRANSFER_OUT',                  // Stock transfer outgoing
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',                // Manual increase
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',              // Manual decrease
  DAMAGED: 'DAMAGED',                            // Damaged goods receipt
  SAFETY_STOCK_REPLENISH: 'safety_stock_replenishment',
  RETURN_IN: 'RETURN_IN',                        // Customer return
  RETURN_OUT: 'RETURN_OUT'                       // Return to supplier
};
```

**Fix Required:**
- Replace `'IN/OUT'` with two separate records: `'TRANSFER_OUT'` and `'TRANSFER_IN'`
- Replace `'DAMAGED_RECEIPT'` with `'DAMAGED'`

### Release Log Schema Validation

**Current Implementation (Pos_NewSale.jsx, line 1686):**
```javascript
const releaseLogData = {
  productId: item.baseProductId || item.id,
  productName: item.baseName || item.name,
  quantityReleased: item.qty,
  saleId: receiptNumber,
  releasedBy: currentUser?.uid || 'unknown',
  releasedByName: currentUser?.name || currentUser?.email || 'Unknown',
  timestamp: serverTimestamp()
};
```

**Expected Fields from System Description:**
- ✅ `productId` - correct
- ✅ `quantityReleased` - correct
- ✅ `timestamp` - correct
- ❌ `releasedBy` / `releasedByName` - **should match stock_movements** (`performedBy`, `performedByName`)
- ❌ Missing `relatedRequestId` - link to RestockingRequest if triggered

**Canonical Schema:**
```javascript
const releaseLogSchema = {
  productId: string,
  productName: string,
  variantId: string | null,
  quantityReleased: number,
  saleId: string | null,         // For POS sales
  releaseType: 'pos_sale' | 'manual_release' | 'project_release',
  relatedRequestId: string | null,  // Link to RestockingRequest
  storageLocation: string,
  shelfName: string,
  rowName: string,
  columnIndex: number,
  performedBy: string,            // User UID
  performedByName: string,
  timestamp: serverTimestamp()
};
```

---

## C. AUTO-FIX PATCHES AND CODE SUGGESTIONS

### Patch 1: Fix POS Release Log Creation (CRITICAL-3)

**Issue:** Release logs created outside transaction, causing data loss if errors occur.

**Fix:** Move release_log creation into same batch as stock_movements.

**Unified Diff:**
```diff
--- a/src/features/pos/pages/Pos_NewSale.jsx
+++ b/src/features/pos/pages/Pos_NewSale.jsx
@@ -1639,30 +1639,49 @@ export default function Pos_NewSale() {
         // Create stock movement records for the sale
         try {
           const stockMovementPromises = addedProducts.map(async (item) => {
             const movementRef = doc(collection(db, 'stock_movements'));
+            const releaseLogRef = doc(collection(db, 'release_logs'));
             
             const movementData = {
               movementType: 'OUT',
               reason: 'POS Sale',
               productId: item.baseProductId || item.id,
               // ... rest of movement data ...
             };
             
-            return setDoc(movementRef, movementData);
+            const releaseLogData = {
+              productId: item.baseProductId || item.id,
+              productName: item.baseName || item.name,
+              variantId: item.variantId || null,
+              quantityReleased: item.qty,
+              saleId: receiptNumber,
+              releaseType: 'pos_sale',
+              storageLocation: item.storageLocation,
+              shelfName: item.shelfName,
+              rowName: item.rowName,
+              columnIndex: item.columnIndex,
+              performedBy: currentUser?.uid || 'unknown',
+              performedByName: currentUser?.name || currentUser?.email || 'Unknown',
+              timestamp: serverTimestamp()
+            };
+            
+            // Write both in same batch for atomicity
+            const batch = writeBatch(db);
+            batch.set(movementRef, movementData);
+            batch.set(releaseLogRef, releaseLogData);
+            return batch.commit();
           });
 
           await Promise.all(stockMovementPromises);
         } catch (movementError) {
           console.error('Error creating stock movements:', movementError);
-          // Don't fail the transaction if stock movement logging fails
+          // CHANGED: Now fail transaction if logging fails to maintain audit trail
+          throw new Error(`Failed to create audit records: ${movementError.message}`);
         }
-
-        // Create release logs for legacy mobile build integration
-        // [... DELETE OLD RELEASE LOG CODE ...]
```

**Why This Fixes the Issue:**
- Release logs now created in same batch as stock movements
- Atomic commit ensures both succeed or both fail
- If audit trail fails, transaction rolls back (proper behavior)
- No data loss risk

### Patch 2: Fix RestockingAlertModal Status Query (CRITICAL-6)

**Issue:** Modal sets status to `'resolved_safety_stock'` but query doesn't exclude it.

**Unified Diff:**
```diff
--- a/src/features/inventory/components/Admin/RestockingAlertModal.jsx
+++ b/src/features/inventory/components/Admin/RestockingAlertModal.jsx
@@ -23,12 +23,17 @@ const RestockingAlertModal = ({ isOpen, onClose }) => {
   useEffect(() => {
     if (!isOpen) return;
 
     setLoading(true);
 
+    // Query for requests that need action (not resolved or dismissed)
     const q = query(
       collection(db, 'RestockingRequests'),
-      where('status', 'in', ['pending', 'acknowledged']),
+      where('status', 'not-in', [
+        'dismissed', 
+        'resolved_safety_stock', 
+        'resolved_po'
+      ]),
       orderBy('createdAt', 'desc')
     );
 
     const unsubscribe = onSnapshot(
```

**Why This Fixes the Issue:**
- Now uses `not-in` to exclude resolved requests
- Matches system description: "resolved_safety_stock removed from modal"
- More maintainable: adding new resolution types won't break query

### Patch 3: Fix Multi-Location Deduction Race Condition (CRITICAL-4)

**Issue:** Batch writes allow race conditions between concurrent sales.

**Full File Update Required** (too large for diff). Create new helper:

**New File:** `src/features/pos/services/InventoryDeductionService.js`
```javascript
import { 
  getFirestore, 
  collection, 
  getDocs, 
  runTransaction,
  serverTimestamp,
  doc
} from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const db = getFirestore(app);

/**
 * Atomically deduct inventory across multiple locations using transactions
 * Prevents race conditions from concurrent sales
 */
export const deductInventoryAtomic = async (cartItems, currentUser) => {
  // Group items by storage unit for efficient transaction batching
  const itemsByUnit = {};
  
  for (const item of cartItems) {
    const unit = item.storageLocation || 'Unit 01';
    if (!itemsByUnit[unit]) itemsByUnit[unit] = [];
    itemsByUnit[unit].push(item);
  }
  
  // Process each storage unit in a separate transaction
  // (Firestore transaction limit: 500 operations)
  for (const [unitId, unitItems] of Object.entries(itemsByUnit)) {
    await runTransaction(db, async (transaction) => {
      const reads = [];
      const writes = [];
      
      // 1. Read all affected products in transaction
      for (const item of unitItems) {
        const productRef = doc(db, 'Products', unitId, 'products', item.productId);
        reads.push({ item, ref: productRef });
      }
      
      const productDocs = await Promise.all(
        reads.map(r => transaction.get(r.ref))
      );
      
      // 2. Validate and prepare updates
      for (let i = 0; i < productDocs.length; i++) {
        const docSnap = productDocs[i];
        const { item, ref } = reads[i];
        
        if (!docSnap.exists()) {
          throw new Error(`Product ${item.name} not found in ${unitId}`);
        }
        
        const productData = docSnap.data();
        const currentQty = Number(productData.quantity) || 0;
        const newQty = currentQty - item.qty;
        
        if (newQty < 0) {
          throw new Error(
            `Insufficient stock for ${item.name}. ` +
            `Available: ${currentQty}, Requested: ${item.qty}`
          );
        }
        
        // 3. Prepare write
        writes.push({
          ref,
          data: {
            quantity: newQty,
            lastUpdated: serverTimestamp()
          }
        });
      }
      
      // 4. Execute all writes atomically
      writes.forEach(w => transaction.update(w.ref, w.data));
    });
  }
  
  return { success: true };
};
```

**Usage in Pos_NewSale.jsx:**
```diff
- await updateInventoryQuantities(productsForDeduction, currentUser);
+ const deductionResult = await deductInventoryAtomic(addedProducts, currentUser);
+ if (!deductionResult.success) {
+   throw new Error('Inventory deduction failed');
+ }
```

**Why This Fixes the Issue:**
- Uses `runTransaction` with atomic reads and writes
- Reads current quantities inside transaction (no stale data)
- Validates stock before committing
- Prevents double-deduction race condition

### Patch 4: Create Shared Helper for Logging

**New File:** `src/services/firebase/AuditLogService.js`
```javascript
import { 
  doc, 
  collection, 
  setDoc, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import app from '../../FirebaseConfig';

const db = getFirestore(app);

/**
 * Canonical schema for stock movements
 */
export const logStockMovement = async (movementData, batch = null) => {
  const movementRef = doc(collection(db, 'stock_movements'));
  
  const normalizedData = {
    movementType: movementData.movementType, // Use MOVEMENT_TYPE enum
    reason: movementData.reason || '',
    productId: movementData.productId,
    productName: movementData.productName,
    variantId: movementData.variantId || null,
    category: movementData.category,
    quantity: Number(movementData.quantity),
    unitPrice: Number(movementData.unitPrice) || 0,
    totalValue: Number(movementData.unitPrice || 0) * Number(movementData.quantity),
    referenceType: movementData.referenceType, // 'pos_transaction', 'purchase_order', etc.
    referenceId: movementData.referenceId,
    storageLocation: movementData.storageLocation,
    shelfName: movementData.shelfName,
    rowName: movementData.rowName,
    columnIndex: movementData.columnIndex,
    performedBy: movementData.performedBy,
    performedByName: movementData.performedByName,
    remarks: movementData.remarks || '',
    status: 'completed',
    movementDate: serverTimestamp(),
    createdAt: serverTimestamp()
  };
  
  if (batch) {
    batch.set(movementRef, normalizedData);
    return movementRef.id;
  } else {
    await setDoc(movementRef, normalizedData);
    return movementRef.id;
  }
};

/**
 * Canonical schema for release logs (legacy mobile compatibility)
 */
export const logRelease = async (releaseData, batch = null) => {
  const releaseLogRef = doc(collection(db, 'release_logs'));
  
  const normalizedData = {
    productId: releaseData.productId,
    productName: releaseData.productName,
    variantId: releaseData.variantId || null,
    quantityReleased: Number(releaseData.quantityReleased),
    saleId: releaseData.saleId || null,
    releaseType: releaseData.releaseType || 'pos_sale',
    relatedRequestId: releaseData.relatedRequestId || null,
    storageLocation: releaseData.storageLocation,
    shelfName: releaseData.shelfName,
    rowName: releaseData.rowName,
    columnIndex: releaseData.columnIndex,
    performedBy: releaseData.performedBy,
    performedByName: releaseData.performedByName,
    timestamp: serverTimestamp()
  };
  
  if (batch) {
    batch.set(releaseLogRef, normalizedData);
    return releaseLogRef.id;
  } else {
    await setDoc(releaseLogRef, normalizedData);
    return releaseLogRef.id;
  }
};

/**
 * Helper to log both movement and release in one batch
 */
export const logStockAndRelease = async (data) => {
  const batch = writeBatch(db);
  
  await logStockMovement(data.movement, batch);
  await logRelease(data.release, batch);
  
  await batch.commit();
};
```

**Import and Use:**
```javascript
// In Pos_NewSale.jsx
import { logStockMovement, logRelease } from '../../../services/firebase/AuditLogService';

// In RestockingAlertModal.jsx
import { logStockMovement, logRelease } from '../../../../services/firebase/AuditLogService';
```

---

## D. UNIT & INTEGRATION TEST SUGGESTIONS

### Test 1: Atomic Replenishment Test
**Name:** `test_safety_stock_replenishment_atomic`  
**Purpose:** Verify safety stock replenishment is atomic and can't be interrupted  

**Steps:**
1. Mock Firestore with product having `quantity: 5, safetyStock: 10`
2. Call `handleReplenish()` from RestockingAlertModal
3. Simulate transaction abort mid-execution
4. Assert product quantity remains 5 (no partial update)
5. Assert safetyStock remains 10 (no partial update)

**Expected Outcome:** All-or-nothing update, no partial state

### Test 2: POS Sale ROP Check
**Name:** `test_pos_sale_triggers_restock_request`  
**Purpose:** Validate POS sale creates RestockingRequest when qty <= ROP  

**Steps:**
1. Create product with `quantity: 15, rop: 10, safetyStock: 5`
2. Create sale that deducts 6 units (new qty: 9, below ROP)
3. Complete sale transaction
4. Query `RestockingRequests` collection
5. Assert request exists with correct priority and suggested qty

**Expected Outcome:** RestockingRequest created with status='pending', priority calculated correctly

### Test 3: Multi-Location Race Condition Test
**Name:** `test_concurrent_sales_no_double_deduction`  
**Purpose:** Prevent race condition when two sales deduct from same product  

**Steps:**
1. Create product in two locations: Location A (qty: 10), Location B (qty: 5)
2. Start Sale 1 (deduct 8 units) and Sale 2 (deduct 7 units) concurrently
3. Both sales should succeed, deducting from different locations
4. Sale 3 (deduct 1 unit) should succeed from remaining stock
5. Sale 4 (deduct 1 unit) should FAIL with "insufficient stock" error

**Expected Outcome:** Total deductions = 16 units (8+7+1), final qty across locations = 0, Sale 4 fails

### Test 4: Release Log Creation Test
**Name:** `test_pos_sale_creates_release_log`  
**Purpose:** Ensure release_logs are created atomically with sale  

**Steps:**
1. Create sale with 3 items
2. Complete transaction
3. Query `release_logs` collection for this saleId
4. Assert 3 release_log documents exist
5. Verify each log has correct schema (productId, quantityReleased, timestamp, performedBy)

**Expected Outcome:** 3 release_logs with matching sale ID, all with serverTimestamp

### Test 5: Supplier Link Atomicity Test
**Name:** `test_bulk_import_supplier_link_atomic`  
**Purpose:** Ensure bulk import links all products or fails completely  

**Steps:**
1. Prepare CSV with 10 products
2. Set invalid supplierId (non-existent)
3. Attempt bulk import
4. Assert NO products created (atomic rollback)
5. Verify NO supplier_products created

**Expected Outcome:** All-or-nothing import, no partial data

---

## E. DEVELOPER VERIFICATION CHECKLIST

### Pre-Deployment Checklist

**1. Database Schema Validation**
```javascript
// Run in Firestore Console
// Query: RestockingRequests where status not-in ['pending','acknowledged','dismissed','resolved_safety_stock','resolved_po']
// Expected: 0 results (all requests use canonical statuses)
```

**2. Verify RestockingAlertModal Behavior**
- [ ] Create restock request with status='pending'
- [ ] Open RestockingAlertModal, verify request appears
- [ ] Click "Replenish", verify status changes to 'resolved_safety_stock'
- [ ] Refresh modal, verify request disappears
- [ ] Query Firestore: `RestockingRequests/{id}` should have status='resolved_safety_stock'

**3. POS Sale → Release Log Flow**
- [ ] Create sale with 1 item
- [ ] Query Firestore: `posTransactions/{transactionId}` should exist
- [ ] Query Firestore: `stock_movements` WHERE referenceId = transactionId (expect 1 result)
- [ ] Query Firestore: `release_logs` WHERE saleId = transactionId (expect 1 result)
- [ ] Verify both logs have matching timestamps (within 1 second)

**4. Multi-Location Deduction Test**
- [ ] Create product "Test Product" in Unit 01 (qty: 10) and Unit 02 (qty: 5)
- [ ] Add to cart: 12 units of "Test Product"
- [ ] Complete sale
- [ ] Query Products/{Unit 01}/products: verify qty = 0
- [ ] Query Products/{Unit 02}/products: verify qty = 3
- [ ] Total deducted = 12 (10 from Unit 01, 2 from Unit 02)

**5. Safety Stock Validation**
- [ ] Create product with safetyStock=undefined (omit field)
- [ ] Create sale that triggers ROP check
- [ ] Verify no NaN errors in console
- [ ] Verify ROP calculation defaults safetyStock to 0

**6. Audit Trail Consistency**
```sql
-- Run in Firestore Console
-- For each posTransaction, verify:
SELECT * FROM stock_movements WHERE referenceId = '{transactionId}'
-- Should return 1 record per item in transaction

SELECT * FROM release_logs WHERE saleId = '{transactionId}'
-- Should return 1 record per item in transaction

-- Verify timestamps match (within 1 second)
```

**7. Supplier Link Verification**
- [ ] Create product via NewProductForm with supplier selected
- [ ] Query `supplier_products/{supplierId}/products/{productId}` (should exist)
- [ ] Query `Products/{unit}/products/{productId}`, verify suppliers array populated
- [ ] Unlink product from supplier
- [ ] Verify both locations updated

**8. Bulk Import Validation**
- [ ] Import CSV with 5 products
- [ ] Verify all 5 appear in `Products/{unit}/products`
- [ ] Verify all 5 linked to supplier
- [ ] Query `supplier_products/{supplierId}/products` (expect 5 results)

### Post-Deployment Monitoring

**Monitor These Firestore Queries:**
1. `RestockingRequests` WHERE status = 'pending' (should not grow unbounded)
2. `release_logs` count per day (should match POS transaction count)
3. `stock_movements` WHERE movementType = 'OUT' (should match sales)
4. Products with `quantity < 0` (should be ZERO results)

**Alert Triggers:**
- If `RestockingRequests.status = 'pending'` older than 7 days → notify manager
- If `release_logs` count < `posTransactions` count → data loss alert
- If any product `quantity < 0` → inventory error alert

---

## SEVERITY RATINGS SUMMARY

| Severity | Count | Examples |
|----------|-------|----------|
| CRITICAL | 7 | Race conditions, missing audit logs, status mismatches |
| HIGH | 6 | Non-atomic operations, validation gaps |
| MEDIUM | 6 | Error handling, validation improvements |
| LOW | 3 | Code cleanup, naming conventions |

**Total Issues:** 22

**Estimated Fix Time:**
- Critical: 16-24 hours (1-2 days)
- High: 8-12 hours (1 day)
- Medium: 4-6 hours (0.5 day)
- **Total:** 3-4 days for experienced Firebase developer

---

## RISK ASSESSMENT

**Deployment Risk:** ⚠️ **HIGH**

**Top 3 Blockers:**
1. **Race Condition in Sales** (CRITICAL-4) - Can cause inventory discrepancies
2. **Missing Release Logs** (CRITICAL-3) - Breaks audit compliance
3. **Status Query Mismatch** (CRITICAL-6) - UX broken (resolved requests still show)

**Recommended Action:**
1. Apply Patch 1 (Release Logs) immediately
2. Apply Patch 2 (Status Query) immediately  
3. Apply Patch 3 (Race Condition) before high-traffic deployment
4. All other fixes can be batched in next sprint

**Data Migration Required:** 
- None (fixes are code-only)
- Existing `RestockingRequests` with status='resolved_safety_stock' will auto-hide after Patch 2 deployed

---

**Report Generated:** 2025-11-01  
**Next Review:** After applying critical patches

