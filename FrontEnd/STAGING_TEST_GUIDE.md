# Staging Test Guide - Patches 1 & 2
**Date:** November 1, 2025  
**Patches:** Release Log Atomicity + Status Query Fix  
**Estimated Test Time:** 2-3 hours

---

## Prerequisites

**Before Testing:**
- [ ] Backup production Firestore data
- [ ] Deploy patches to staging environment
- [ ] Ensure Firebase emulator is running (optional but recommended)
- [ ] Have Firebase Console open for verification queries
- [ ] Clear browser cache/use incognito mode

**Required Access:**
- [ ] Staging environment URL
- [ ] Firebase Console access
- [ ] Firestore read/write permissions
- [ ] POS and Inventory Manager roles

---

## Patch 1: Release Log Atomicity Fix

### What Changed:
- `src/features/pos/pages/Pos_NewSale.jsx`
- Release logs now created in **same batch** as stock movements
- Transaction failure now properly rolls back both logs

### Test Case 1.1: Normal POS Sale with Audit Trail

**Steps:**
1. Open POS page in staging
2. Add 3 different products to cart
3. Complete sale with cash payment
4. Note the transaction ID (e.g., `GS-1730419200000`)

**Verification in Firebase Console:**

```javascript
// Query 1: Check stock_movements
Collection: stock_movements
Filter: referenceId == "GS-{your-transaction-id}"
Expected: Exactly 3 documents (one per cart item)
```

```javascript
// Query 2: Check release_logs
Collection: release_logs
Filter: saleId == "GS-{your-transaction-id}"
Expected: Exactly 3 documents (one per cart item)
```

```javascript
// Query 3: Verify timestamps match
// Both collections should have timestamps within 1 second of each other
```

**✅ Pass Criteria:**
- 3 stock_movements created
- 3 release_logs created
- All timestamps within 1 second
- No orphaned records

**❌ Fail Indicators:**
- Missing release_logs
- Count mismatch between collections
- Timestamps differ by >2 seconds

---

### Test Case 1.2: Sale with Insufficient Stock (Error Handling)

**Setup:**
1. Create test product with quantity = 5
2. Add to cart with quantity = 10 (more than available)

**Steps:**
1. Attempt to complete sale
2. Expect error: "Insufficient stock"
3. Verify NO partial records created

**Verification in Firebase Console:**

```javascript
// Query: Check for orphaned records
Collection: stock_movements
Filter: productId == "{test-product-id}"
Order by: createdAt DESC
Limit: 1

// Should NOT show a recent movement for this failed sale
```

**✅ Pass Criteria:**
- Sale fails with clear error message
- NO stock_movements created
- NO release_logs created
- Product quantity unchanged

---

### Test Case 1.3: Network Interruption Simulation

**Steps:**
1. Open browser DevTools → Network tab
2. Add products to cart
3. Click "Complete Sale"
4. **Immediately** set Network → Offline (before request completes)
5. Wait 5 seconds
6. Set Network → Online

**Verification:**
```javascript
// Check if partial writes occurred
Collection: stock_movements
Filter: referenceId == "GS-{your-transaction-id}"

Collection: release_logs  
Filter: saleId == "GS-{your-transaction-id}"

// BOTH should either exist with matching counts, OR both be empty
```

**✅ Pass Criteria:**
- Either both collections have records, or neither does
- Never have stock_movements without release_logs
- Atomicity preserved

---

## Patch 2: RestockingAlertModal Status Query Fix

### What Changed:
- `src/features/inventory/components/Admin/RestockingAlertModal.jsx`
- Query now uses `not-in` to exclude resolved statuses
- Resolved alerts properly disappear from modal

### Test Case 2.1: Replenishment Flow End-to-End

**Setup:**
1. Create product with:
   - quantity: 5
   - safetyStock: 10
   - rop: 15
   - storageLocation: Unit 01

**Steps:**

1. **Trigger Restock Alert:**
   - Go to POS
   - Create sale that reduces quantity to 4 (below ROP of 15)
   - Complete sale

2. **Verify Alert Appears:**
   - Login as Inventory Manager
   - Open Restocking Alerts modal
   - Product should appear with status "PENDING"

3. **Replenish from Safety Stock:**
   - Click "Replenish" button on the alert
   - Confirm replenishment dialog
   - Wait for success message

4. **Verify Alert Disappears:**
   - Close and reopen Restocking Alerts modal
   - Product should NO LONGER appear
   - Modal should show reduced total count

**Verification in Firebase Console:**

```javascript
// Query 1: Check RestockingRequest status
Collection: RestockingRequests
Filter: productId == "{your-product-id}"
Order by: createdAt DESC
Limit: 1

// Expected status: "resolved_safety_stock"
```

```javascript
// Query 2: Verify NOT shown in modal query
Collection: RestockingRequests
Filter: status IN ["pending", "acknowledged"]

// Should NOT include your resolved request
```

```javascript
// Query 3: Verify stock updated
Collection: Products/{Unit 01}/products
Document: {product-id}

// Expected:
// - quantity increased by safetyStock amount
// - safetyStock decreased to 0
```

**✅ Pass Criteria:**
- Alert appears initially
- Replenishment succeeds
- Alert disappears after replenishment
- Status = "resolved_safety_stock"
- Product quantity increased
- Safety stock decreased

---

### Test Case 2.2: Acknowledge Without Replenishment

**Steps:**
1. Create new restock alert (same as above)
2. Click "Acknowledge" instead of "Replenish"
3. Verify alert remains visible (but marked as acknowledged)
4. Close and reopen modal
5. Alert should still appear

**Verification:**

```javascript
// Query: Alert should still appear
Collection: RestockingRequests
Filter: status == "acknowledged"

// Should include your acknowledged request
```

**✅ Pass Criteria:**
- Acknowledged alerts remain visible
- Status badge changes to "ACKNOWLEDGED"
- Alert persists after modal reopen

---

### Test Case 2.3: Dismiss Alert

**Steps:**
1. Create new restock alert
2. Click "Dismiss"
3. Confirm dismissal
4. Alert should disappear
5. Close and reopen modal
6. Alert should NOT reappear

**Verification:**

```javascript
// Query: Dismissed alerts excluded
Collection: RestockingRequests
Filter: status == "dismissed"

// Should include your dismissed request

// Query 2: Modal query
Filter: status NOT IN ["dismissed", "resolved_safety_stock", "resolved_po"]

// Should NOT include dismissed request
```

**✅ Pass Criteria:**
- Dismissed alerts disappear immediately
- Never reappear in modal
- Status = "dismissed"

---

### Test Case 2.4: Multiple Locations Same Product

**Setup:**
1. Create same product in Unit 01 (qty: 5) and Unit 02 (qty: 3)
2. Both below ROP
3. Both trigger restock requests

**Steps:**
1. Open Restocking Alerts modal
2. Verify product shows grouped view with "2 locations"
3. Expand location breakdown
4. Replenish one location
5. Verify only that location disappears
6. Other location remains visible

**Verification:**

```javascript
// Query: Check both requests
Collection: RestockingRequests
Filter: productId == "{product-id}"
Order by: createdAt DESC

// One should be "resolved_safety_stock"
// Other should be "pending" or "acknowledged"
```

**✅ Pass Criteria:**
- Locations shown separately
- Replenishing one doesn't affect other
- Each location tracked independently

---

## Combined Test: Full Sale → Restock → Replenish Flow

**This tests both patches together**

**Steps:**

1. **Setup Product:**
   - Create product: qty=20, safetyStock=15, rop=10
   
2. **Create Sale (Tests Patch 1):**
   - Add to cart: qty=12
   - Complete sale
   - Verify stock_movements AND release_logs created (both)
   - New quantity should be 8 (below ROP of 10)

3. **Verify Restock Alert Created:**
   - Check RestockingRequests collection
   - Alert should exist with status="pending"

4. **Open Alert Modal (Tests Patch 2):**
   - Alert appears
   - Shows current qty=8, ROP=10

5. **Replenish (Tests Patch 2):**
   - Click Replenish
   - Confirm
   - Alert disappears
   - Status changes to "resolved_safety_stock"

6. **Verify Final State:**
   - Product quantity = 8 + 15 = 23
   - Safety stock = 0
   - stock_movements has new "safety_stock_replenishment" entry
   - release_logs has entry for replenishment

**Complete Verification Checklist:**

```javascript
// 1. POS Transaction exists
Collection: posTransactions
Document: GS-{transaction-id}
✓ Status: completed

// 2. Stock movements (2 entries total)
Collection: stock_movements
Filter: productId == "{product-id}"
✓ Entry 1: movementType="OUT", quantity=12 (sale)
✓ Entry 2: movementType="safety_stock_replenishment", quantity=15

// 3. Release logs (2 entries total)
Collection: release_logs
Filter: productId == "{product-id}"
✓ Entry 1: quantityReleased=12, saleId=GS-{transaction-id}
✓ Entry 2: quantityReleased=15, relatedRequestId={request-id}

// 4. Restock request resolved
Collection: RestockingRequests
Document: {request-id}
✓ Status: "resolved_safety_stock"
✓ resolvedAt: {timestamp}
✓ resolvedBy: {user-uid}

// 5. Product updated
Collection: Products/Unit 01/products
Document: {product-id}
✓ quantity: 23
✓ safetyStock: 0
```

**✅ Overall Pass Criteria:**
- All 5 Firebase collections updated correctly
- No orphaned records
- Atomic operations successful
- Alert lifecycle complete

---

## Regression Tests

**Ensure patches didn't break existing functionality:**

### Test R1: Sale Without ROP Trigger
- Sale that doesn't trigger restock
- Verify only stock_movements + release_logs created
- NO RestockingRequest created

### Test R2: Multiple Products in One Sale
- 5 products in cart
- Complete sale
- Verify 5 stock_movements + 5 release_logs
- All with same transactionId

### Test R3: Cash vs Card Payment
- Test both payment methods
- Audit logs should be identical
- Payment method only affects transaction record

---

## Performance Tests

**Batch Operations:**
1. Create sale with 20 items
2. Measure time to complete
3. Should complete in <5 seconds

**Concurrent Sales:**
1. Open 2 browser windows (different users)
2. Both add same product to cart
3. Both complete sale simultaneously
4. Verify no race condition (covered by Patch 3, but test anyway)

---

## Rollback Plan

**If tests fail:**

1. **Immediate Rollback:**
   ```bash
   git revert {commit-hash-patch-1}
   git revert {commit-hash-patch-2}
   git push origin staging
   ```

2. **Verify Rollback:**
   - Test one POS sale
   - Check if old behavior restored
   - Monitor for errors

3. **Document Failures:**
   - Which test cases failed
   - Error messages
   - Screenshots
   - Console logs

---

## Sign-Off Checklist

**Before approving patches for production:**

- [ ] All Test Case 1.x passed (Patch 1)
- [ ] All Test Case 2.x passed (Patch 2)
- [ ] Combined test passed
- [ ] All regression tests passed
- [ ] Performance acceptable (<5s for 20-item sale)
- [ ] No console errors
- [ ] No Firestore quota issues
- [ ] Team reviewed test results
- [ ] Rollback plan ready

**Tester Signature:** ___________________  
**Date:** ___________________  
**Approval for Production:** ☐ Yes ☐ No (explain): ___________________

---

## Common Issues & Troubleshooting

### Issue: "Transaction failed" error during sale

**Possible Causes:**
- Firestore quota exceeded
- Network timeout
- Concurrent update conflict

**Debug:**
1. Check Firebase Console → Usage tab
2. Look for rate limit warnings
3. Check browser Network tab for failed requests

### Issue: Alert appears but won't replenish

**Possible Causes:**
- Product not found in database
- Insufficient safety stock
- Transaction conflict

**Debug:**
```javascript
// Verify product exists
Collection: Products/{Unit}/products
Document: {product-id}

// Check current values
safetyStock: ? (should be > 0)
quantity: ?
```

### Issue: Counts don't match

**Possible Causes:**
- Old code still running (cache issue)
- Partial deployment
- Browser cache

**Fix:**
1. Clear browser cache
2. Hard refresh (Ctrl+F5)
3. Verify deployment completed
4. Check all Firebase Functions deployed

---

## Test Results Log Template

```
=== STAGING TEST RESULTS ===
Date: 2025-11-01
Tester: [Your Name]
Environment: Staging
Patches: 1, 2

PATCH 1 - Release Log Atomicity:
[ ] Test 1.1: Normal Sale - PASS / FAIL
[ ] Test 1.2: Error Handling - PASS / FAIL  
[ ] Test 1.3: Network Interruption - PASS / FAIL

PATCH 2 - Status Query Fix:
[ ] Test 2.1: Replenishment Flow - PASS / FAIL
[ ] Test 2.2: Acknowledge - PASS / FAIL
[ ] Test 2.3: Dismiss - PASS / FAIL
[ ] Test 2.4: Multiple Locations - PASS / FAIL

COMBINED TEST: PASS / FAIL

REGRESSION TESTS:
[ ] R1: Sale without ROP - PASS / FAIL
[ ] R2: Multiple products - PASS / FAIL
[ ] R3: Payment methods - PASS / FAIL

PERFORMANCE:
20-item sale completion time: ___ seconds

ISSUES FOUND:
1. [Description]
2. [Description]

RECOMMENDATION: APPROVE / REJECT / NEEDS WORK
```

---

**Next Steps After Testing:**

1. ✅ If all tests pass → Deploy to production
2. ⚠️ If minor issues → Fix and retest
3. ❌ If major failures → Rollback and review patches

**Questions?** Contact the development team lead.
