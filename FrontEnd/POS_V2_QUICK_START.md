# Quick Start: Testing Pos_NewSale_V2

## Option 1: Update Router Temporarily (Recommended for Testing)

### Find your router file (usually `App.jsx` or `Routes.jsx`)

Look for something like:
```javascript
import Pos_NewSale from './features/pos/pages/Pos_NewSale';

// In routes:
<Route path="/pos/new-sale" element={<Pos_NewSale />} />
```

### Change to V2 temporarily:
```javascript
import Pos_NewSale_V2 from './features/pos/pages/Pos_NewSale_V2';

// In routes:
<Route path="/pos/new-sale" element={<Pos_NewSale_V2 />} />
```

## Option 2: Create New Test Route

Add a parallel route for testing:
```javascript
import Pos_NewSale from './features/pos/pages/Pos_NewSale';
import Pos_NewSale_V2 from './features/pos/pages/Pos_NewSale_V2';

// In routes:
<Route path="/pos/new-sale" element={<Pos_NewSale />} />
<Route path="/pos/new-sale-v2" element={<Pos_NewSale_V2 />} />  {/* TEST ROUTE */}
```

Then visit: `http://localhost:5173/pos/new-sale-v2`

## Testing Workflow

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Open Browser
Navigate to POS New Sale page

### 3. Test Sequence
1. ✅ **Search** - Type product name, verify results appear
2. ✅ **Filter** - Select category/brand, verify filtering
3. ✅ **Select Product** - Click a product card
4. ✅ **Choose Variant** - If modal appears, select variant and quantity
5. ✅ **Add to Cart** - Verify item appears in cart
6. ✅ **Update Quantity** - Change quantity in cart
7. ✅ **Remove Item** - Remove an item
8. ✅ **Add Discount** - Test percentage and fixed discount
9. ✅ **Complete Sale** - Enter payment and complete transaction
10. ✅ **Verify Receipt** - Check receipt modal displays correctly

### 4. Verify in Firestore Console
After completing a test transaction:
- Check `Transactions` collection for new document
- Check `Variants` collection - stock should be reduced
- Check `stock_movements` collection for movement log
- Check `Notifications` collection if product went below ROP

## Expected Console Logs

### On Page Load:
```
🔍 Searching products: {searchQuery: '', selectedCategory: null, selectedBrand: null}
✅ Fetched products: 45
```

### On Product Click:
```
🎯 Product clicked: {name: "Portland Cement", variants: Array(3)}
```

### On Add to Cart:
```
➕ Adding to cart: {variantId: "abc123", name: "Portland Cement (40kg)", qty: 10}
```

### On Complete Sale:
```
💳 Processing sale...
🛒 Cart items: Array(2)
💰 Transaction details: {customerName: "Walk-in Customer", paymentMethod: "Cash"}
✅ Sale processed successfully: {transactionId: "TRANS-1731157200-xyz"}
📊 Analytics recorded: {transactionId: "TRANS-1731157200-xyz", totalAmount: 2500}
```

## Common Issues & Fixes

### Issue: "Cannot read properties of undefined (reading 'variants')"
**Fix:** Products not loading correctly. Check `searchPOSProducts()` service.

### Issue: "Variant not found"
**Fix:** Cart item has invalid `variantId`. Check cart structure.

### Issue: "Insufficient stock"
**Fix:** Working correctly! Product stock is lower than requested quantity.

### Issue: Transaction fails silently
**Fix:** Check browser console for error messages. Verify Firestore permissions.

## Rollback Plan

If V2 has issues, rollback is instant:

### If using Option 1 (Router Update):
```javascript
// Change back to:
import Pos_NewSale from './features/pos/pages/Pos_NewSale';
<Route path="/pos/new-sale" element={<Pos_NewSale />} />
```

### If using Option 2 (Parallel Route):
Just navigate back to `/pos/new-sale`

## Performance Comparison

### Old System:
- **Page Load:** 2-3 seconds (loading all products)
- **Search:** 500ms (client-side filtering)
- **Transaction:** 5-8 seconds (multi-step stock deduction)

### New System (Expected):
- **Page Load:** 0.5-1 second (optimized query)
- **Search:** 200ms (server-side filtering)
- **Transaction:** 1-2 seconds (atomic operation)

## Success Criteria

Before marking V2 as complete, verify:
- [x] File created with no errors (567 lines)
- [ ] Products load and display correctly
- [ ] Search and filters work
- [ ] Variant selection works
- [ ] Cart operations work
- [ ] Transaction completes successfully
- [ ] Stock updates in Firestore
- [ ] Transaction document created
- [ ] Stock movements logged
- [ ] No console errors
- [ ] Performance equal or better than old system

## Next Steps After Testing

1. **If all tests pass:**
   - Keep V2 as primary
   - Rename old file to `Pos_NewSale_OLD.jsx`
   - Create Pos_Quotation_V2.jsx using same pattern
   - Update documentation

2. **If issues found:**
   - Document issues in comments
   - Fix and re-test
   - Compare behavior with old system
   - Adjust as needed

---

**Ready to test!** 🚀

Just update your router and navigate to the POS page.
