# Unit & Integration Test Suggestions
**IMS with POS and Analytics - Test Suite**

## Overview

This document provides comprehensive test cases to validate the critical flows and catch logical errors identified in the code review. Tests are prioritized by risk level and cover atomic operations, data integrity, and edge cases.

---

## Test Environment Setup

```javascript
// test-utils/firebase-mock.js
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

export const setupTestEnvironment = async () => {
  const testEnv = await initializeTestEnvironment({
    projectId: 'ims-test-project',
    firestore: {
      host: 'localhost',
      port: 8080,
      rules: `
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if true; // Test mode
            }
          }
        }
      `
    }
  });
  
  return testEnv;
};
```

---

## CRITICAL PRIORITY TESTS

### Test 1: Atomic Safety Stock Replenishment

**Test Name:** `test_safety_stock_replenishment_is_atomic`  
**File:** `tests/integration/RestockingAlertModal.test.js`  
**Purpose:** Verify safety stock replenishment is atomic and can't be interrupted mid-transaction  

```javascript
import { setupTestEnvironment } from '../test-utils/firebase-mock';
import { doc, setDoc, getDoc, runTransaction } from 'firebase/firestore';

describe('RestockingAlertModal - Safety Stock Replenishment', () => {
  let testEnv, db;
  
  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    db = testEnv.firestore();
  });
  
  afterAll(async () => {
    await testEnv.cleanup();
  });
  
  test('replenishment is atomic - transaction abort leaves no partial state', async () => {
    // 1. Setup initial product state
    const productRef = doc(db, 'Products', 'Unit 01', 'products', 'TEST-PROD-001');
    await setDoc(productRef, {
      id: 'TEST-PROD-001',
      name: 'Test Product',
      quantity: 5,
      safetyStock: 10,
      restockLevel: 15
    });
    
    // 2. Create restock request
    const requestRef = doc(db, 'RestockingRequests', 'REQ-001');
    await setDoc(requestRef, {
      productId: 'TEST-PROD-001',
      status: 'pending',
      currentQuantity: 5,
      safetyStock: 10
    });
    
    // 3. Simulate transaction abort mid-execution
    const replenishWithAbort = async () => {
      await runTransaction(db, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        const productData = productSnap.data();
        
        // Update product
        transaction.update(productRef, {
          quantity: productData.quantity + 10,
          safetyStock: productData.safetyStock - 10
        });
        
        // ABORT BEFORE UPDATING REQUEST
        throw new Error('Simulated transaction abort');
      });
    };
    
    // 4. Verify transaction fails cleanly
    await expect(replenishWithAbort()).rejects.toThrow('Simulated transaction abort');
    
    // 5. Verify product unchanged (no partial update)
    const productAfter = await getDoc(productRef);
    expect(productAfter.data().quantity).toBe(5); // Unchanged
    expect(productAfter.data().safetyStock).toBe(10); // Unchanged
    
    // 6. Verify request unchanged
    const requestAfter = await getDoc(requestRef);
    expect(requestAfter.data().status).toBe('pending'); // Unchanged
  });
  
  test('successful replenishment updates all related documents atomically', async () => {
    // Similar setup...
    
    // Execute full replenishment
    await runTransaction(db, async (transaction) => {
      const productSnap = await transaction.get(productRef);
      const requestSnap = await transaction.get(requestRef);
      
      // Update product
      transaction.update(productRef, {
        quantity: 15,
        safetyStock: 0
      });
      
      // Update request
      transaction.update(requestRef, {
        status: 'resolved_safety_stock',
        resolvedAt: new Date()
      });
      
      // Create movement log
      const movementRef = doc(db, 'stock_movements', 'MOV-001');
      transaction.set(movementRef, {
        movementType: 'safety_stock_replenishment',
        productId: 'TEST-PROD-001',
        quantity: 10
      });
    });
    
    // Verify all updates succeeded
    const productAfter = await getDoc(productRef);
    expect(productAfter.data().quantity).toBe(15);
    expect(productAfter.data().safetyStock).toBe(0);
    
    const requestAfter = await getDoc(requestRef);
    expect(requestAfter.data().status).toBe('resolved_safety_stock');
    
    const movementDoc = await getDoc(doc(db, 'stock_movements', 'MOV-001'));
    expect(movementDoc.exists()).toBe(true);
  });
});
```

**Expected Outcomes:**
- ✅ Transaction abort leaves no partial state
- ✅ All documents updated or none updated
- ✅ Movement log created only if replenishment succeeds

---

### Test 2: POS Sale Triggers Restock Request

**Test Name:** `test_pos_sale_creates_restock_request_at_rop`  
**File:** `tests/integration/Pos_NewSale.test.js`  
**Purpose:** Validate POS sale creates RestockingRequest when quantity drops to/below ROP  

```javascript
import { setupTestEnvironment } from '../test-utils/firebase-mock';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { checkRestockingThreshold, generateRestockingRequest } from '../../src/features/pos/pages/Pos_NewSale';

describe('POS Sale - ROP Check and Restock Request', () => {
  let testEnv, db;
  
  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    db = testEnv.firestore();
  });
  
  test('creates RestockingRequest when quantity <= ROP after sale', async () => {
    // 1. Create product with quantity above ROP
    const productRef = doc(db, 'Products', 'Unit 01', 'products', 'PROD-ROP-001');
    await setDoc(productRef, {
      id: 'PROD-ROP-001',
      name: 'ROP Test Product',
      quantity: 15,
      rop: 10,
      restockLevel: 10,
      safetyStock: 5,
      storageLocation: 'Unit 01',
      shelfName: 'Shelf A',
      rowName: 'Row 1',
      columnIndex: 0
    });
    
    // 2. Simulate sale that reduces quantity to 9 (below ROP of 10)
    const productData = (await getDoc(productRef)).data();
    productData.quantity = 9; // After sale deduction
    
    // 3. Check ROP threshold
    const ropCheck = checkRestockingThreshold(productData, -1);
    
    expect(ropCheck.needsRestock).toBe(true);
    expect(ropCheck.currentQuantity).toBe(9);
    expect(ropCheck.restockLevel).toBe(10);
    expect(ropCheck.priority).toMatch(/high|urgent|critical/);
    
    // 4. Generate restock request
    const currentUser = { uid: 'test-user', displayName: 'Test User' };
    await generateRestockingRequest(
      productData,
      -1, // variantIndex
      {
        storageLocation: 'Unit 01',
        shelfName: 'Shelf A',
        rowName: 'Row 1',
        columnIndex: 0
      },
      currentUser
    );
    
    // 5. Verify RestockingRequest created
    const requestsQuery = query(
      collection(db, 'RestockingRequests'),
      where('productId', '==', 'PROD-ROP-001'),
      where('status', '==', 'pending')
    );
    const requestsSnap = await getDocs(requestsQuery);
    
    expect(requestsSnap.size).toBe(1);
    const request = requestsSnap.docs[0].data();
    
    expect(request.currentQuantity).toBe(9);
    expect(request.restockLevel).toBe(10);
    expect(request.priority).toBeDefined();
    expect(request.suggestedOrderQuantity).toBeGreaterThan(0);
    expect(request.triggeredBy).toBe('pos_sale');
  });
  
  test('does NOT create request when quantity above ROP', async () => {
    // Setup product with quantity well above ROP
    const productRef = doc(db, 'Products', 'Unit 01', 'products', 'PROD-NO-ROP');
    await setDoc(productRef, {
      id: 'PROD-NO-ROP',
      name: 'High Stock Product',
      quantity: 50,
      rop: 10,
      restockLevel: 10
    });
    
    const productData = (await getDoc(productRef)).data();
    const ropCheck = checkRestockingThreshold(productData, -1);
    
    expect(ropCheck.needsRestock).toBe(false);
    
    // generateRestockingRequest should return null
    const request = await generateRestockingRequest(productData, -1, {}, {});
    expect(request).toBeNull();
  });
  
  test('calculates correct priority based on stock level', async () => {
    const testCases = [
      { qty: 0, rop: 10, expectedPriority: 'critical' },
      { qty: 2, rop: 10, expectedPriority: 'urgent' },
      { qty: 8, rop: 10, expectedPriority: 'high' },
      { qty: 10, rop: 10, expectedPriority: 'medium' }
    ];
    
    for (const testCase of testCases) {
      const productData = {
        quantity: testCase.qty,
        rop: testCase.rop,
        restockLevel: testCase.rop
      };
      
      const ropCheck = checkRestockingThreshold(productData, -1);
      
      if (testCase.qty <= testCase.rop) {
        expect(ropCheck.priority).toBe(testCase.expectedPriority);
      }
    }
  });
});
```

**Expected Outcomes:**
- ✅ RestockingRequest created when qty <= ROP
- ✅ No request created when qty > ROP
- ✅ Priority calculated correctly based on stock level
- ✅ Suggested order quantity matches EOQ

---

### Test 3: Concurrent Sales Race Condition

**Test Name:** `test_concurrent_sales_no_double_deduction`  
**File:** `tests/integration/inventory-deduction.test.js`  
**Purpose:** Prevent race condition when two sales deduct from same product simultaneously  

```javascript
import { setupTestEnvironment } from '../test-utils/firebase-mock';
import { doc, setDoc, getDoc, runTransaction } from 'firebase/firestore';

describe('Inventory Deduction - Concurrent Sales', () => {
  let testEnv, db;
  
  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    db = testEnv.firestore();
  });
  
  test('concurrent sales use transaction to prevent double-deduction', async () => {
    // 1. Create product with 20 units across two locations
    await setDoc(doc(db, 'Products', 'Unit 01', 'products', 'CONC-PROD-A'), {
      id: 'CONC-PROD-A',
      name: 'Concurrent Test Product',
      quantity: 15
    });
    
    await setDoc(doc(db, 'Products', 'Unit 02', 'products', 'CONC-PROD-A'), {
      id: 'CONC-PROD-A',
      name: 'Concurrent Test Product',
      quantity: 5
    });
    
    // 2. Simulate two concurrent sales
    const sale1 = async () => {
      await runTransaction(db, async (transaction) => {
        const unit01Ref = doc(db, 'Products', 'Unit 01', 'products', 'CONC-PROD-A');
        const snap = await transaction.get(unit01Ref);
        const currentQty = snap.data().quantity;
        
        // Deduct 8 units
        if (currentQty >= 8) {
          transaction.update(unit01Ref, { quantity: currentQty - 8 });
        } else {
          throw new Error('Insufficient stock');
        }
      });
    };
    
    const sale2 = async () => {
      await runTransaction(db, async (transaction) => {
        const unit01Ref = doc(db, 'Products', 'Unit 01', 'products', 'CONC-PROD-A');
        const snap = await transaction.get(unit01Ref);
        const currentQty = snap.data().quantity;
        
        // Deduct 10 units
        if (currentQty >= 10) {
          transaction.update(unit01Ref, { quantity: currentQty - 10 });
        } else {
          // Not enough in Unit 01, try Unit 02
          const unit02Ref = doc(db, 'Products', 'Unit 02', 'products', 'CONC-PROD-A');
          const snap2 = await transaction.get(unit02Ref);
          const qty2 = snap2.data().quantity;
          
          const needed = 10 - currentQty;
          if (qty2 >= needed) {
            transaction.update(unit01Ref, { quantity: 0 });
            transaction.update(unit02Ref, { quantity: qty2 - needed });
          } else {
            throw new Error('Insufficient stock across all locations');
          }
        }
      });
    };
    
    // 3. Run sales concurrently
    await Promise.all([sale1(), sale2()]);
    
    // 4. Verify total deduction is exactly 18 units (8 + 10)
    const unit01After = await getDoc(doc(db, 'Products', 'Unit 01', 'products', 'CONC-PROD-A'));
    const unit02After = await getDoc(doc(db, 'Products', 'Unit 02', 'products', 'CONC-PROD-A'));
    
    const totalRemaining = unit01After.data().quantity + unit02After.data().quantity;
    expect(totalRemaining).toBe(2); // 20 - 18 = 2
    
    // No double-deduction occurred
    expect(totalRemaining).toBeGreaterThanOrEqual(0); // Never negative
  });
  
  test('third sale fails when insufficient stock remains', async () => {
    // After previous test, only 2 units remain
    
    const sale3 = async () => {
      await runTransaction(db, async (transaction) => {
        const unit01Ref = doc(db, 'Products', 'Unit 01', 'products', 'CONC-PROD-A');
        const unit02Ref = doc(db, 'Products', 'Unit 02', 'products', 'CONC-PROD-A');
        
        const snap1 = await transaction.get(unit01Ref);
        const snap2 = await transaction.get(unit02Ref);
        
        const totalAvailable = snap1.data().quantity + snap2.data().quantity;
        
        if (totalAvailable < 5) {
          throw new Error('Insufficient stock: need 5, have ' + totalAvailable);
        }
      });
    };
    
    await expect(sale3()).rejects.toThrow('Insufficient stock');
  });
});
```

**Expected Outcomes:**
- ✅ Concurrent sales deduct correctly without double-counting
- ✅ Total deduction matches sum of individual sales
- ✅ Stock never goes negative
- ✅ Third sale fails when insufficient stock

---

### Test 4: Release Log Creation Atomicity

**Test Name:** `test_pos_sale_creates_release_log_atomically`  
**File:** `tests/integration/audit-trail.test.js`  
**Purpose:** Ensure release_logs are created atomically with sale transaction  

```javascript
import { setupTestEnvironment } from '../test-utils/firebase-mock';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

describe('POS Sale - Audit Trail Atomicity', () => {
  let testEnv, db;
  
  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    db = testEnv.firestore();
  });
  
  test('stock_movements and release_logs created in same batch', async () => {
    const batch = writeBatch(db);
    const transactionId = 'GS-TEST-12345';
    
    // Simulate sale with 3 items
    const cartItems = [
      { id: 'ITEM-1', name: 'Product A', qty: 2, price: 100 },
      { id: 'ITEM-2', name: 'Product B', qty: 1, price: 200 },
      { id: 'ITEM-3', name: 'Product C', qty: 5, price: 50 }
    ];
    
    // Create stock_movements and release_logs in same batch
    cartItems.forEach(item => {
      const movementRef = doc(collection(db, 'stock_movements'));
      const releaseLogRef = doc(collection(db, 'release_logs'));
      
      batch.set(movementRef, {
        movementType: 'OUT',
        productId: item.id,
        productName: item.name,
        quantity: item.qty,
        referenceId: transactionId,
        createdAt: new Date()
      });
      
      batch.set(releaseLogRef, {
        productId: item.id,
        productName: item.name,
        quantityReleased: item.qty,
        saleId: transactionId,
        timestamp: new Date()
      });
    });
    
    // Commit batch
    await batch.commit();
    
    // Verify both collections have exactly 3 records each
    const movementsQuery = query(
      collection(db, 'stock_movements'),
      where('referenceId', '==', transactionId)
    );
    const movementsSnap = await getDocs(movementsQuery);
    expect(movementsSnap.size).toBe(3);
    
    const releaseLogsQuery = query(
      collection(db, 'release_logs'),
      where('saleId', '==', transactionId)
    );
    const releaseLogsSnap = await getDocs(releaseLogsQuery);
    expect(releaseLogsSnap.size).toBe(3);
    
    // Verify matching data
    movementsSnap.forEach((doc, index) => {
      const movement = doc.data();
      const expectedItem = cartItems.find(item => item.id === movement.productId);
      expect(movement.quantity).toBe(expectedItem.qty);
    });
  });
  
  test('batch commit failure rolls back both movements and release logs', async () => {
    const batch = writeBatch(db);
    const transactionId = 'GS-FAIL-99999';
    
    // Add valid writes
    batch.set(doc(collection(db, 'stock_movements')), {
      movementType: 'OUT',
      productId: 'VALID-PROD',
      referenceId: transactionId
    });
    
    // Add invalid write that will cause batch to fail
    // (e.g., trying to set a document with invalid data)
    batch.set(doc(db, 'invalid_collection', 'bad_doc'), {
      badField: undefined // Firestore doesn't allow undefined values
    });
    
    // Batch should fail
    await expect(batch.commit()).rejects.toThrow();
    
    // Verify NO documents were created (atomic rollback)
    const movementsQuery = query(
      collection(db, 'stock_movements'),
      where('referenceId', '==', transactionId)
    );
    const snap = await getDocs(movementsQuery);
    expect(snap.size).toBe(0); // Rollback successful
  });
});
```

**Expected Outcomes:**
- ✅ stock_movements and release_logs both created in batch
- ✅ Batch failure rolls back all writes
- ✅ Audit trail always complete or absent (never partial)

---

## HIGH PRIORITY TESTS

### Test 5: Supplier Linking Atomicity

**Test Name:** `test_bulk_import_supplier_link_atomic`  
**File:** `tests/integration/BulkProductImport.test.js`  

```javascript
describe('Bulk Import - Supplier Linking', () => {
  test('all products linked to supplier or import fails completely', async () => {
    // Mock CSV data with 10 products
    const csvData = Array.from({ length: 10 }, (_, i) => ({
      ProductName: `Product ${i + 1}`,
      Category: 'Test Category',
      Quantity: 10,
      UnitPrice: 100,
      StorageLocation: 'Unit 01 - Shelf A - Row 1 - Column 1'
    }));
    
    // Mock invalid supplier (doesn't exist)
    const invalidSupplier = { id: 'INVALID-SUPPLIER', name: 'Non-existent Supplier' };
    
    // Attempt import
    await expect(
      bulkImportProducts(csvData, invalidSupplier)
    ).rejects.toThrow('Supplier not found');
    
    // Verify NO products created
    const productsQuery = query(
      collection(db, 'Products', 'Unit 01', 'products'),
      where('category', '==', 'Test Category')
    );
    const snap = await getDocs(productsQuery);
    expect(snap.size).toBe(0); // All-or-nothing
    
    // Verify NO supplier_products created
    const supplierProductsSnap = await getDocs(
      collection(db, 'supplier_products', 'INVALID-SUPPLIER', 'products')
    );
    expect(supplierProductsSnap.size).toBe(0);
  });
});
```

---

## MEDIUM PRIORITY TESTS

### Test 6: SafetyStock Field Validation

**Test Name:** `test_rop_calculation_handles_missing_safety_stock`  

```javascript
test('ROP calculation defaults to 0 when safetyStock undefined', () => {
  const productWithoutSafetyStock = {
    quantity: 10,
    rop: 15,
    // safetyStock: undefined (field missing)
  };
  
  const ropCheck = checkRestockingThreshold(productWithoutSafetyStock, -1);
  
  expect(ropCheck.needsRestock).toBe(true);
  expect(isNaN(ropCheck.restockLevel)).toBe(false); // No NaN errors
});
```

---

## Test Execution Plan

**Phase 1: Critical Tests (Week 1)**
- [ ] Test 1: Atomic Replenishment
- [ ] Test 2: POS Sale ROP Check
- [ ] Test 3: Concurrent Sales
- [ ] Test 4: Release Log Atomicity

**Phase 2: High Priority (Week 2)**
- [ ] Test 5: Supplier Linking
- [ ] Test 6: SafetyStock Validation
- [ ] Additional edge case tests

**Phase 3: Regression Suite (Ongoing)**
- [ ] Automate all tests in CI/CD
- [ ] Add performance benchmarks
- [ ] Add load testing for concurrent operations

---

## Running Tests

```bash
# Install dependencies
npm install --save-dev @firebase/rules-unit-testing jest

# Start Firestore emulator
firebase emulators:start --only firestore

# Run tests
npm test

# Run specific test suite
npm test -- Pos_NewSale.test.js

# Run with coverage
npm test -- --coverage
```

---

## Success Criteria

**All tests must pass before production deployment:**
- ✅ All CRITICAL tests: 100% pass rate
- ✅ All HIGH tests: 100% pass rate
- ✅ Code coverage: >80% for critical paths
- ✅ No race conditions detected in concurrent sale tests
- ✅ Audit trail completeness verified in all scenarios
