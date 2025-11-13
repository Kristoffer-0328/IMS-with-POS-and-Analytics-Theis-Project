# Stock Movement Service Guide

## Overview

The **Stock Movement Service** provides a centralized, standardized way to record and query stock movements across the entire inventory system. This ensures consistency in how we track inventory changes from various sources (POS sales, receiving, releases, adjustments, etc.).

## Why Use This Service?

### Problems It Solves:
1. **Inconsistent Data Structure** - Different modules were creating stock movement records with different field names and structures
2. **Code Duplication** - Each module had its own logic for creating movement records
3. **Difficult Reporting** - Reports couldn't reliably query movements because of inconsistent data
4. **Missing Fields** - Some movements lacked important context (location, prices, user info)
5. **No Validation** - No standardized validation before creating records

### Benefits:
- ✅ **Single source of truth** for stock movement data structure
- ✅ **Consistent field names** across all movement types
- ✅ **Built-in validation** prevents incomplete records
- ✅ **Easy querying** with helper functions for common filters
- ✅ **Analytics ready** with summary and aggregation functions
- ✅ **Maintainable** - change structure in one place

---

## Installation & Setup

### 1. Import the Service

```javascript
import StockMovementService, { 
  MOVEMENT_TYPES, 
  MOVEMENT_REASONS, 
  REFERENCE_TYPES 
} from '../services/StockMovementService';
```

### 2. No Configuration Needed
The service uses the same Firebase app instance as your other modules.

---

## Standard Document Structure

Every stock movement document in Firestore follows this structure:

```javascript
{
  // Movement Type & Classification
  movementType: 'IN' | 'OUT',
  reason: string,                    // Use MOVEMENT_REASONS constants
  
  // Product Information
  productId: string,
  productName: string,
  variantId: string | null,
  variantName: string | null,
  category: string,
  
  // Quantity & Value
  quantity: number,
  previousQuantity: number | null,   // Stock before movement
  newQuantity: number | null,        // Stock after movement
  unitPrice: number,
  totalValue: number,                // quantity * unitPrice
  
  // Location Information
  storageLocation: string | null,
  shelf: string | null,
  row: string | null,
  column: string | null,
  
  // Transaction References
  referenceType: string,             // Use REFERENCE_TYPES constants
  referenceId: string,
  
  // User Information
  performedBy: string,               // User UID
  performedByName: string,           // Display name
  
  // Timestamps
  movementDate: Date,                // When movement occurred
  timestamp: Date,                   // Server timestamp
  createdAt: Date,                   // Document creation time
  
  // Additional Context
  notes: string | null,
  status: string,
  
  // Additional fields (optional)
  ...additionalData
}
```

---

## Usage Examples

### Example 1: Recording a POS Sale (Outbound)

```javascript
import StockMovementService, { 
  MOVEMENT_REASONS, 
  REFERENCE_TYPES 
} from '../services/StockMovementService';

// When processing a sale
const saleTransaction = await processPOSSale(cartItems, transactionDetails, currentUser);

// Record stock movements for each item sold
for (const item of cartItems) {
  await StockMovementService.recordOutboundMovement({
    // Product Info
    productId: item.parentProductId,
    productName: item.productName,
    variantId: item.variantId,
    variantName: item.variantName,
    category: item.category,
    
    // Quantity & Price
    quantity: item.qty,
    previousQuantity: item.stockBeforeSale,  // Stock level before sale
    newQuantity: item.stockAfterSale,        // Stock level after sale
    unitPrice: item.unitPrice,
    
    // Reason & Reference
    reason: MOVEMENT_REASONS.POS_SALE,
    referenceType: REFERENCE_TYPES.SALE,
    referenceId: saleTransaction.transactionId,
    
    // User Info
    performedBy: {
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email
    },
    
    // Location (optional)
    location: {
      storageLocation: item.storageLocation,
      shelf: item.shelfName,
      row: item.rowName,
      column: item.columnName
    },
    
    // Additional context (optional)
    additionalData: {
      customerName: transactionDetails.customerName,
      receiptNumber: saleTransaction.receiptNumber
    },
    
    // Timestamp
    movementDate: new Date(),
    notes: `Sale to ${transactionDetails.customerName}`
  });
}
```

### Example 2: Recording Receiving (Inbound)

```javascript
// When receiving products from supplier
for (const receivedItem of receivedProducts) {
  await StockMovementService.recordInboundMovement({
    // Product Info
    productId: receivedItem.productId,
    productName: receivedItem.productName,
    variantId: receivedItem.variantId,
    variantName: receivedItem.variantName,
    category: receivedItem.category,
    
    // Quantity & Price
    quantity: receivedItem.receivedQuantity,
    previousQuantity: receivedItem.stockBeforeReceiving,
    newQuantity: receivedItem.stockAfterReceiving,
    unitPrice: receivedItem.unitPrice,
    
    // Reason & Reference
    reason: MOVEMENT_REASONS.SUPPLIER_DELIVERY,
    referenceType: REFERENCE_TYPES.RECEIVING_RECORD,
    referenceId: poId,
    
    // User Info
    performedBy: {
      uid: currentUser.uid,
      name: currentUser.name || 'Mobile User'
    },
    
    // Location (if known)
    location: {
      storageLocation: receivedItem.storageLocation || null,
      shelf: null,
      row: null,
      column: null
    },
    
    // Additional context
    additionalData: {
      poNumber: poData.poNumber,
      supplier: poData.supplierName,
      drNumber: deliveryData.drNumber,
      invoiceNumber: deliveryData.invoiceNumber
    },
    
    movementDate: deliveryData.deliveryDateTime,
    notes: `Received from ${poData.supplierName}`
  });
}
```

### Example 3: Batch Recording

```javascript
// Prepare array of movements
const movements = cartItems.map(item => ({
  productId: item.parentProductId,
  productName: item.productName,
  variantId: item.variantId,
  variantName: item.variantName,
  category: item.category,
  quantity: item.qty,
  previousQuantity: item.stockBeforeSale,
  newQuantity: item.stockAfterSale,
  unitPrice: item.unitPrice,
  reason: MOVEMENT_REASONS.POS_SALE,
  referenceType: REFERENCE_TYPES.SALE,
  referenceId: transactionId,
  performedBy: {
    uid: currentUser.uid,
    name: currentUser.displayName
  }
}));

// Record all at once
const docIds = await StockMovementService.recordBatchMovements(
  movements, 
  MOVEMENT_TYPES.OUT
);

console.log(`Recorded ${docIds.length} movements`);
```

---

## Querying Stock Movements

### Get All Movements (with filters)

```javascript
const movements = await StockMovementService.getStockMovements({
  movementType: 'OUT',           // 'IN', 'OUT', or null for all
  productId: 'prod_123',         // Specific product
  variantId: 'var_456',          // Specific variant
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  referenceType: 'sale',
  referenceId: 'TXN-12345',
  limitCount: 100
});
```

### Get Movements by Year/Month

```javascript
// Get all movements for 2024
const movements2024 = await StockMovementService.getMovementsByYearMonth(2024);

// Get movements for January 2024 (month is 0-indexed)
const movementsJan2024 = await StockMovementService.getMovementsByYearMonth(2024, 0);
```

### Get Movements by Product

```javascript
// Get last 50 movements for a product
const productMovements = await StockMovementService.getMovementsByProduct(
  'prod_123', 
  50
);
```

### Get Movements by Transaction

```javascript
// Get all movements related to a specific transaction
const saleMovements = await StockMovementService.getMovementsByReference(
  'sale',           // referenceType
  'TXN-12345'      // referenceId
);
```

---

## Analytics & Reporting

### Get Summary Statistics

```javascript
const summary = await StockMovementService.getMovementSummary({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});

console.log(summary);
// {
//   totalMovements: 1523,
//   totalIn: 5000,
//   totalOut: 4200,
//   totalInValue: 125000.50,
//   totalOutValue: 98000.75,
//   netQuantity: 800,
//   netValue: 27000.25,
//   inboundCount: 450,
//   outboundCount: 1073,
//   averageInValue: 277.78,
//   averageOutValue: 91.32
// }
```

### Get Daily Chart Data

```javascript
const dailyData = await StockMovementService.getDailyMovementData({
  startDate: new Date('2024-11-01'),
  endDate: new Date('2024-11-30')
});

// Returns array ready for charts:
// [
//   { day: 'Nov 1', date: Date, in: 50, out: 30, inValue: 1200, outValue: 800 },
//   { day: 'Nov 2', date: Date, in: 45, out: 35, inValue: 1100, outValue: 900 },
//   ...
// ]
```

### Get Breakdown by Reason

```javascript
const breakdown = await StockMovementService.getMovementsByReason({
  movementType: 'OUT',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});

// Returns:
// [
//   { reason: 'POS Sale', count: 1000, totalQuantity: 3500, totalValue: 85000, movementType: 'OUT' },
//   { reason: 'Stock Release', count: 50, totalQuantity: 500, totalValue: 12000, movementType: 'OUT' },
//   { reason: 'Damage/Write-off', count: 23, totalQuantity: 200, totalValue: 1000, movementType: 'OUT' }
// ]
```

---

## Constants Reference

### Movement Types
```javascript
MOVEMENT_TYPES.IN   // 'IN'
MOVEMENT_TYPES.OUT  // 'OUT'
```

### Movement Reasons
```javascript
// Inbound
MOVEMENT_REASONS.SUPPLIER_DELIVERY       // 'Supplier Delivery'
MOVEMENT_REASONS.PURCHASE_RETURN         // 'Purchase Return'
MOVEMENT_REASONS.STOCK_ADJUSTMENT_IN     // 'Stock Adjustment (In)'
MOVEMENT_REASONS.PRODUCTION_IN           // 'Production (In)'
MOVEMENT_REASONS.TRANSFER_IN             // 'Transfer (In)'

// Outbound
MOVEMENT_REASONS.POS_SALE                // 'POS Sale'
MOVEMENT_REASONS.STOCK_RELEASE           // 'Stock Release'
MOVEMENT_REASONS.STOCK_ADJUSTMENT_OUT    // 'Stock Adjustment (Out)'
MOVEMENT_REASONS.DAMAGE_WRITE_OFF        // 'Damage/Write-off'
MOVEMENT_REASONS.TRANSFER_OUT            // 'Transfer (Out)'
MOVEMENT_REASONS.SALES_RETURN            // 'Sales Return'
```

### Reference Types
```javascript
REFERENCE_TYPES.SALE               // 'sale'
REFERENCE_TYPES.RECEIVING_RECORD   // 'receiving_record'
REFERENCE_TYPES.STOCK_RELEASE      // 'stock_release'
REFERENCE_TYPES.ADJUSTMENT         // 'adjustment'
REFERENCE_TYPES.TRANSFER           // 'transfer'
REFERENCE_TYPES.PURCHASE_ORDER     // 'purchase_order'
```

---

## Migration Guide

### Updating Existing Code

#### Before (Old Way):
```javascript
// In POSTransactionService.js
await addDoc(collection(db, 'stock_movements'), {
  movementType: 'OUT',
  referenceType: 'sale',
  referenceId: transactionId,
  variantId: movement.variantId,
  productName: movement.productName,
  quantity: movement.deducted,
  // ... inconsistent fields
});
```

#### After (New Way):
```javascript
// Use the service
await StockMovementService.recordOutboundMovement({
  productId: movement.productId,
  productName: movement.productName,
  variantId: movement.variantId,
  variantName: movement.variantName,
  category: movement.category,
  quantity: movement.deducted,
  previousQuantity: movement.previousQty,
  newQuantity: movement.newQty,
  unitPrice: movement.unitPrice,
  reason: MOVEMENT_REASONS.POS_SALE,
  referenceType: REFERENCE_TYPES.SALE,
  referenceId: transactionId,
  performedBy: {
    uid: currentUser.uid,
    name: currentUser.displayName
  }
});
```

---

## Best Practices

### 1. Always Use Constants
❌ Don't: `reason: 'POS Sale'`  
✅ Do: `reason: MOVEMENT_REASONS.POS_SALE`

### 2. Include Stock Quantities
Always provide `previousQuantity` and `newQuantity` when available. This helps with auditing and troubleshooting.

### 3. Use Proper Reference Types
Link movements to their source transactions using `referenceType` and `referenceId`.

### 4. Provide Location Data
When available, include storage location information. This helps with location-based reporting.

### 5. Add Contextual Notes
Use the `notes` field and `additionalData` to provide context that might be useful later.

### 6. Batch When Possible
For multiple movements from the same transaction, use `recordBatchMovements()` for better performance.

### 7. Error Handling
```javascript
try {
  await StockMovementService.recordOutboundMovement({...});
} catch (error) {
  console.error('Failed to record movement:', error);
  // Handle error appropriately
  // Don't fail the entire transaction if movement logging fails
}
```

---

## Files That Use This Service

### Current Implementation:
1. ✅ `src/services/StockMovementService.js` - The service itself
2. 🔄 `src/features/pos/services/POSTransactionService.js` - Needs update
3. 🔄 `src/features/inventory/pages/MobileReceive.jsx` - Needs update
4. 🔄 `src/features/inventory/components/Reports/StockMovementReport.jsx` - Can use query functions

### Future Files:
- Stock release pages
- Adjustment pages
- Transfer pages
- Any module that moves inventory

---

## Troubleshooting

### Problem: "User information is required"
**Solution:** Make sure you pass `performedBy` with both `uid` and `name`:
```javascript
performedBy: {
  uid: currentUser.uid,
  name: currentUser.displayName || currentUser.email || 'Unknown'
}
```

### Problem: "Quantity must be greater than 0"
**Solution:** Validate quantity before calling the service:
```javascript
if (quantity <= 0) {
  throw new Error('Invalid quantity');
}
```

### Problem: Query returns no results
**Solution:** Check your date filters. Ensure `startDate` is before `endDate`, and dates are valid JavaScript Date objects.

### Problem: Firestore index error
**Solution:** The service requires a composite index on `stock_movements`:
- `movementDate` (Descending)
- `__name__` (Descending)

Create it in Firebase Console when prompted.

---

## Testing

### Test Inbound Movement
```javascript
const testInbound = async () => {
  const docId = await StockMovementService.recordInboundMovement({
    productId: 'test_prod_123',
    productName: 'Test Product',
    variantId: 'test_var_456',
    variantName: 'Small (25kg)',
    category: 'Cement',
    quantity: 100,
    unitPrice: 250,
    reason: MOVEMENT_REASONS.SUPPLIER_DELIVERY,
    referenceType: REFERENCE_TYPES.RECEIVING_RECORD,
    referenceId: 'PO-TEST-001',
    performedBy: {
      uid: 'test_user',
      name: 'Test User'
    },
    notes: 'Test receiving'
  });
  
  console.log('Created movement:', docId);
};
```

---

## Support

For questions or issues with the Stock Movement Service:
1. Check this documentation
2. Review example implementations
3. Check console for error messages
4. Verify Firebase permissions

---

## Changelog

### v1.0.0 (November 2024)
- Initial release
- Standardized document structure
- Query helper functions
- Analytics functions
- Migration from old implementations
