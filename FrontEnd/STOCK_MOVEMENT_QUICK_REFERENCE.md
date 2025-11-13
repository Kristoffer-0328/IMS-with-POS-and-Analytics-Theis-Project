# Stock Movement Service - Quick Reference

## Import

```javascript
import StockMovementService, { 
  MOVEMENT_TYPES, 
  MOVEMENT_REASONS, 
  REFERENCE_TYPES 
} from '../services/StockMovementService';
```

---

## Record Movements

### Inbound (Receiving, Returns, Adjustments)

```javascript
await StockMovementService.recordInboundMovement({
  // REQUIRED
  productId: 'prod_123',
  productName: 'Portland Cement',
  quantity: 100,
  unitPrice: 250,
  reason: MOVEMENT_REASONS.SUPPLIER_DELIVERY,
  referenceType: REFERENCE_TYPES.RECEIVING_RECORD,
  referenceId: 'PO-2024-001',
  performedBy: {
    uid: currentUser.uid,
    name: currentUser.displayName
  },
  
  // OPTIONAL
  variantId: 'var_456',
  variantName: '25kg Bag',
  category: 'Cement',
  previousQuantity: 50,
  newQuantity: 150,
  location: {
    storageLocation: 'Warehouse A',
    shelf: 'A1',
    row: 'R1',
    column: 'C1'
  },
  movementDate: new Date(),
  notes: 'Delivered by XYZ Supplier',
  additionalData: {
    supplier: 'ABC Company',
    drNumber: 'DR-001',
    invoiceNumber: 'INV-001'
  }
});
```

### Outbound (Sales, Releases, Adjustments)

```javascript
await StockMovementService.recordOutboundMovement({
  // REQUIRED
  productId: 'prod_123',
  productName: 'Portland Cement',
  quantity: 10,
  unitPrice: 300,
  reason: MOVEMENT_REASONS.POS_SALE,
  referenceType: REFERENCE_TYPES.SALE,
  referenceId: 'TXN-12345',
  performedBy: {
    uid: currentUser.uid,
    name: currentUser.displayName
  },
  
  // OPTIONAL (same as inbound)
  variantId: 'var_456',
  variantName: '25kg Bag',
  category: 'Cement',
  previousQuantity: 150,
  newQuantity: 140,
  location: { /* ... */ },
  movementDate: new Date(),
  notes: 'Sale to walk-in customer',
  additionalData: {
    customerName: 'John Doe',
    receiptNumber: 'RCP-12345'
  }
});
```

### Batch Recording

```javascript
const movements = items.map(item => ({
  productId: item.productId,
  productName: item.productName,
  variantId: item.variantId,
  variantName: item.variantName,
  category: item.category,
  quantity: item.qty,
  unitPrice: item.price,
  previousQuantity: item.stockBefore,
  newQuantity: item.stockAfter,
  reason: MOVEMENT_REASONS.POS_SALE,
  referenceType: REFERENCE_TYPES.SALE,
  referenceId: transactionId,
  performedBy: {
    uid: currentUser.uid,
    name: currentUser.displayName
  }
}));

await StockMovementService.recordBatchMovements(movements, 'OUT');
```

---

## Query Movements

### Basic Query

```javascript
const movements = await StockMovementService.getStockMovements({
  movementType: 'OUT',              // 'IN', 'OUT', or null
  productId: 'prod_123',            // Optional
  variantId: 'var_456',             // Optional
  startDate: new Date('2024-01-01'), // Optional
  endDate: new Date('2024-12-31'),   // Optional
  referenceType: 'sale',            // Optional
  referenceId: 'TXN-12345',         // Optional
  limitCount: 100                   // Optional
});
```

### By Year/Month

```javascript
// All movements in 2024
const movements2024 = await StockMovementService.getMovementsByYearMonth(2024);

// January 2024 (month is 0-indexed)
const movementsJan = await StockMovementService.getMovementsByYearMonth(2024, 0);
```

### By Product/Variant

```javascript
// Last 50 movements for a product
const productMovements = await StockMovementService.getMovementsByProduct('prod_123', 50);

// Last 50 movements for a variant
const variantMovements = await StockMovementService.getMovementsByVariant('var_456', 50);
```

### By Transaction

```javascript
// All movements for a sale
const saleMovements = await StockMovementService.getMovementsByReference(
  'sale',      // referenceType
  'TXN-12345'  // referenceId
);
```

---

## Analytics

### Summary Statistics

```javascript
const summary = await StockMovementService.getMovementSummary({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});

// Returns:
{
  totalMovements: 1523,
  totalIn: 5000,
  totalOut: 4200,
  totalInValue: 125000.50,
  totalOutValue: 98000.75,
  netQuantity: 800,
  netValue: 27000.25,
  inboundCount: 450,
  outboundCount: 1073,
  averageInValue: 277.78,
  averageOutValue: 91.32
}
```

### Daily Chart Data

```javascript
const chartData = await StockMovementService.getDailyMovementData({
  startDate: new Date('2024-11-01'),
  endDate: new Date('2024-11-30')
});

// Returns:
[
  { day: 'Nov 1', date: Date, in: 50, out: 30, inValue: 1200, outValue: 800 },
  { day: 'Nov 2', date: Date, in: 45, out: 35, inValue: 1100, outValue: 900 },
  // ...
]
```

### Breakdown by Reason

```javascript
const breakdown = await StockMovementService.getMovementsByReason({
  movementType: 'OUT',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});

// Returns:
[
  { reason: 'POS Sale', count: 1000, totalQuantity: 3500, totalValue: 85000, movementType: 'OUT' },
  { reason: 'Stock Release', count: 50, totalQuantity: 500, totalValue: 12000, movementType: 'OUT' },
  // ...
]
```

---

## Constants

### Movement Types
```javascript
MOVEMENT_TYPES.IN   // 'IN'
MOVEMENT_TYPES.OUT  // 'OUT'
```

### Movement Reasons (Inbound)
```javascript
MOVEMENT_REASONS.SUPPLIER_DELIVERY      // 'Supplier Delivery'
MOVEMENT_REASONS.PURCHASE_RETURN        // 'Purchase Return'
MOVEMENT_REASONS.STOCK_ADJUSTMENT_IN    // 'Stock Adjustment (In)'
MOVEMENT_REASONS.PRODUCTION_IN          // 'Production (In)'
MOVEMENT_REASONS.TRANSFER_IN            // 'Transfer (In)'
```

### Movement Reasons (Outbound)
```javascript
MOVEMENT_REASONS.POS_SALE               // 'POS Sale'
MOVEMENT_REASONS.STOCK_RELEASE          // 'Stock Release'
MOVEMENT_REASONS.STOCK_ADJUSTMENT_OUT   // 'Stock Adjustment (Out)'
MOVEMENT_REASONS.DAMAGE_WRITE_OFF       // 'Damage/Write-off'
MOVEMENT_REASONS.TRANSFER_OUT           // 'Transfer (Out)'
MOVEMENT_REASONS.SALES_RETURN           // 'Sales Return'
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

## Standard Document Structure

```javascript
{
  // Movement Type & Classification
  movementType: 'IN' | 'OUT',
  reason: string,
  
  // Product Information
  productId: string,
  productName: string,
  variantId: string | null,
  variantName: string | null,
  category: string,
  
  // Quantity & Value
  quantity: number,
  previousQuantity: number | null,
  newQuantity: number | null,
  unitPrice: number,
  totalValue: number,
  
  // Location Information
  storageLocation: string | null,
  shelf: string | null,
  row: string | null,
  column: string | null,
  
  // Transaction References
  referenceType: string,
  referenceId: string,
  
  // User Information
  performedBy: string,
  performedByName: string,
  
  // Timestamps
  movementDate: Date,
  timestamp: Date,
  createdAt: Date,
  
  // Additional Context
  notes: string | null,
  status: string
}
```

---

## Common Patterns

### Pattern 1: POS Sale
```javascript
// After successful sale, record movements
await StockMovementService.recordBatchMovements(
  cartItems.map(item => ({
    productId: item.productId,
    productName: item.productName,
    variantId: item.variantId,
    variantName: item.variantName,
    category: item.category,
    quantity: item.qty,
    previousQuantity: item.stockBefore,
    newQuantity: item.stockAfter,
    unitPrice: item.price,
    reason: MOVEMENT_REASONS.POS_SALE,
    referenceType: REFERENCE_TYPES.SALE,
    referenceId: transactionId,
    performedBy: { uid: user.uid, name: user.name }
  })),
  'OUT'
);
```

### Pattern 2: Receiving
```javascript
// After updating inventory, record movements
await StockMovementService.recordBatchMovements(
  receivedItems.map(item => ({
    productId: item.productId,
    productName: item.productName,
    variantId: item.variantId,
    variantName: item.variantName,
    category: item.category,
    quantity: item.receivedQty,
    previousQuantity: item.stockBefore,
    newQuantity: item.stockAfter,
    unitPrice: item.unitPrice,
    reason: MOVEMENT_REASONS.SUPPLIER_DELIVERY,
    referenceType: REFERENCE_TYPES.RECEIVING_RECORD,
    referenceId: poId,
    performedBy: { uid: user.uid, name: user.name },
    additionalData: {
      supplier: supplierName,
      drNumber: drNumber
    }
  })),
  'IN'
);
```

### Pattern 3: Report with Filters
```javascript
// Get movements for report
const movements = await StockMovementService.getMovementsByYearMonth(
  selectedYear,
  selectedMonth
);

// Get summary
const summary = await StockMovementService.getMovementSummary({
  startDate: new Date(selectedYear, selectedMonth, 1),
  endDate: new Date(selectedYear, selectedMonth + 1, 0)
});

// Get chart data
const chartData = await StockMovementService.getDailyMovementData({
  startDate: new Date(selectedYear, selectedMonth, 1),
  endDate: new Date(selectedYear, selectedMonth + 1, 0)
});
```

---

## Error Handling

```javascript
try {
  await StockMovementService.recordOutboundMovement({
    // ... movement data
  });
} catch (error) {
  if (error.message.includes('required')) {
    console.error('Missing required fields:', error.message);
  } else if (error.message.includes('greater than 0')) {
    console.error('Invalid quantity:', error.message);
  } else {
    console.error('Movement recording failed:', error);
  }
  
  // Don't fail the entire transaction
  // Log error and continue
}
```

---

## Validation Rules

### Required Fields:
- ✅ `productId` (string, non-empty)
- ✅ `productName` (string, non-empty)
- ✅ `quantity` (number > 0)
- ✅ `referenceType` (string, non-empty)
- ✅ `referenceId` (string, non-empty)
- ✅ `performedBy.uid` (string, non-empty)
- ✅ `performedBy.name` (string, non-empty)

### Optional Fields:
- `variantId`, `variantName`
- `category` (defaults to 'General')
- `previousQuantity`, `newQuantity`
- `unitPrice` (defaults to 0)
- `location.*`
- `movementDate` (defaults to now)
- `notes`
- `additionalData`

---

## Tips

1. **Always use constants** - Don't hardcode strings like 'POS Sale'
2. **Include stock levels** - Provide `previousQuantity` and `newQuantity` when available
3. **Batch when possible** - Use `recordBatchMovements()` for multiple items
4. **Add context** - Use `notes` and `additionalData` for extra information
5. **Handle errors gracefully** - Don't let movement logging break the main transaction
6. **Test queries** - Verify reports work with the new standardized structure

---

## Quick Troubleshooting

| Error | Solution |
|-------|----------|
| "User information is required" | Ensure `performedBy` has both `uid` and `name` |
| "Quantity must be greater than 0" | Validate quantity before calling service |
| "Product ID and name are required" | Check productId and productName are not empty |
| Query returns no results | Check date range, ensure dates are valid Date objects |
| Firestore index error | Create composite index on `movementDate` (desc) |

---

## Full Documentation

- **Guide**: `STOCK_MOVEMENT_SERVICE_GUIDE.md`
- **Migration Examples**: `STOCK_MOVEMENT_MIGRATION_EXAMPLES.md`
- **Service Code**: `src/services/StockMovementService.js`
