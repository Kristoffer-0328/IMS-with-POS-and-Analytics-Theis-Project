# Stock Movement Service - Implementation Examples

This document shows **before and after** code examples for migrating to the standardized Stock Movement Service.

---

## Example 1: POS Transaction Service

### Location: `src/features/pos/services/POSTransactionService.js`

### BEFORE (Current Implementation):

```javascript
const createStockMovementLogs = async (stockMovements, transactionId, currentUser) => {
  try {
    const promises = stockMovements.map(movement => 
      addDoc(collection(db, STOCK_MOVEMENTS_COLLECTION), {
        movementType: 'OUT',
        referenceType: 'sale',
        referenceId: transactionId,
        variantId: movement.variantId,
        productName: movement.productName,
        variantName: movement.variantName,
        quantity: movement.deducted,
        previousQuantity: movement.previousQty,
        newQuantity: movement.newQty,
        performedBy: currentUser.uid,
        performedByName: currentUser.displayName || currentUser.email || 'Unknown',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      })
    );
    
    await Promise.all(promises);
    console.log(`✅ Created ${stockMovements.length} stock movement logs`);
  } catch (error) {
    console.error('❌ Error creating stock movement logs:', error);
    throw error;
  }
};
```

### AFTER (Using Stock Movement Service):

```javascript
// Import the service at the top of the file
import StockMovementService, { 
  MOVEMENT_REASONS, 
  REFERENCE_TYPES 
} from '../../../services/StockMovementService';

// Replace the createStockMovementLogs function with:
const createStockMovementLogs = async (stockMovements, transactionId, currentUser) => {
  try {
    // Map to the standardized format
    const movements = stockMovements.map(movement => ({
      // Product Information
      productId: movement.parentProductId || movement.productId,
      productName: movement.productName,
      variantId: movement.variantId,
      variantName: movement.variantName,
      category: movement.category || 'General',
      
      // Quantity & Price
      quantity: movement.deducted,
      previousQuantity: movement.previousQty,
      newQuantity: movement.newQty,
      unitPrice: movement.unitPrice || 0,
      
      // Movement Reason & Reference
      reason: MOVEMENT_REASONS.POS_SALE,
      referenceType: REFERENCE_TYPES.SALE,
      referenceId: transactionId,
      
      // User Information
      performedBy: {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email || 'Unknown'
      },
      
      // Location (if available)
      location: {
        storageLocation: movement.storageLocation,
        shelf: movement.shelfName,
        row: movement.rowName,
        column: movement.columnName
      },
      
      // Movement date
      movementDate: new Date(),
      
      // Notes
      notes: `POS Sale - Transaction: ${transactionId}`
    }));
    
    // Use batch recording for better performance
    await StockMovementService.recordBatchMovements(movements, 'OUT');
    
    console.log(`✅ Created ${movements.length} stock movement logs using StockMovementService`);
  } catch (error) {
    console.error('❌ Error creating stock movement logs:', error);
    throw error;
  }
};
```

### What Changed:
1. ✅ Import StockMovementService and constants
2. ✅ Map internal data to standardized format
3. ✅ Use `recordBatchMovements()` for better performance
4. ✅ Include all required fields (category, unitPrice, location)
5. ✅ Use constants instead of hardcoded strings
6. ✅ Proper user object structure with `uid` and `name`

---

## Example 2: Mobile Receive Page

### Location: `src/features/inventory/pages/MobileReceive.jsx`

### BEFORE (Current Implementation):

```javascript
setProcessingStep('Recording stock movements...');
const receivingTimestamp = transactionDateTime;
const stockMovementPromises = receivedItems.map(async (product) => {
  const movementRef = collection(db, 'stock_movements');
  return addDoc(movementRef, {
    // Movement Type
    movementType: 'IN',
    reason: 'Supplier Delivery',
    // Product Information
    productId: product.productId || `unknown-${Date.now()}`,
    productName: product.productName || 'Unknown Product',
    variantId: product.variantId || null,
    variantName: product.variantName || null,
    // Quantity & Value
    quantity: product.receivedQuantity || 0,
    orderedQty: product.expectedQuantity || 0,
    unitPrice: product.unitPrice || 0,
    totalValue: ((product.receivedQuantity || 0) * (product.unitPrice || 0)),
    // Location Information
    storageLocation: null,
    shelf: null,
    row: null,
    column: null,
    // Transaction References
    referenceType: 'receiving_record',
    referenceId: poId,
    poId: poId,
    drNumber: updatedDeliveryData.drNumber || null,
    invoiceNumber: updatedDeliveryData.invoiceNumber || null,
    // Supplier Information
    supplier: poData?.supplierName || 'Unknown Supplier',
    supplierContact: poData?.supplierContact || '',
    // Delivery Information
    driverName: updatedDeliveryData.driverName || '',
    deliveryDate: receivingTimestamp,
    // Condition & Status
    condition: product.rejectedQuantity > 0 ? 'partial' : 'complete',
    remarks: product.notes || '',
    status: 'completed',
    // Timestamps
    movementDate: receivingTimestamp,
    createdAt: new Date(),
    // Additional Context
    notes: updatedDeliveryData.projectSite || ''
  });
});
await Promise.all(stockMovementPromises);
```

### AFTER (Using Stock Movement Service):

```javascript
// Import at the top of the file
import StockMovementService, { 
  MOVEMENT_REASONS, 
  REFERENCE_TYPES 
} from '../../../services/StockMovementService';

// Replace the stock movement recording code with:
setProcessingStep('Recording stock movements...');
const receivingTimestamp = transactionDateTime;

// Map received items to standardized format
const movements = receivedItems.map(product => ({
  // Product Information
  productId: product.productId || `unknown-${Date.now()}`,
  productName: product.productName || 'Unknown Product',
  variantId: product.variantId || null,
  variantName: product.variantName || null,
  category: product.category || 'General',
  
  // Quantity & Price
  quantity: product.receivedQuantity || 0,
  previousQuantity: product.stockBeforeReceiving || null,  // Add this if available
  newQuantity: product.stockAfterReceiving || null,        // Add this if available
  unitPrice: product.unitPrice || 0,
  
  // Movement Reason & Reference
  reason: MOVEMENT_REASONS.SUPPLIER_DELIVERY,
  referenceType: REFERENCE_TYPES.RECEIVING_RECORD,
  referenceId: poId,
  
  // User Information
  performedBy: {
    uid: currentUser?.uid || 'mobile_user',
    name: currentUser?.name || updatedDeliveryData.receivedBy || 'Mobile User'
  },
  
  // Location (will be filled when inventory is updated)
  location: {
    storageLocation: product.storageLocation || null,
    shelf: null,
    row: null,
    column: null
  },
  
  // Movement date
  movementDate: receivingTimestamp,
  
  // Notes and additional data
  notes: [
    product.notes,
    updatedDeliveryData.projectSite,
    product.rejectedQuantity > 0 ? `Rejected: ${product.rejectedQuantity}` : ''
  ].filter(Boolean).join(' | '),
  
  // Additional context
  additionalData: {
    poId: poId,
    poNumber: poData?.poNumber,
    drNumber: updatedDeliveryData.drNumber || null,
    invoiceNumber: updatedDeliveryData.invoiceNumber || null,
    supplier: poData?.supplierName || 'Unknown Supplier',
    supplierContact: poData?.supplierContact || '',
    driverName: updatedDeliveryData.driverName || '',
    orderedQty: product.expectedQuantity || 0,
    condition: product.rejectedQuantity > 0 ? 'partial' : 'complete',
    rejectedQty: product.rejectedQuantity || 0,
    rejectionReason: product.rejectionReason || ''
  }
}));

// Use batch recording
await StockMovementService.recordBatchMovements(movements, 'IN');
console.log(`✅ Recorded ${movements.length} inbound movements`);
```

### What Changed:
1. ✅ Import StockMovementService and constants
2. ✅ Use standardized field names
3. ✅ Include `category` field
4. ✅ Use `recordBatchMovements()` for efficiency
5. ✅ Move supplier/delivery details to `additionalData`
6. ✅ Proper user object structure
7. ✅ Combine notes into single field
8. ✅ Use constants for reason and referenceType

---

## Example 3: Stock Movement Report

### Location: `src/features/inventory/components/Reports/StockMovementReport.jsx`

### BEFORE (Current Implementation):

```javascript
const fetchMovementData = async () => {
  setLoading(true);
  try {
    // Build query based on filters
    const movementsRef = collection(db, 'stock_movements');
    let movementQuery = movementsRef;
    
    // Apply year filter
    if (yearFilter && yearFilter !== 'All Years') {
      const year = parseInt(yearFilter);
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      
      movementQuery = query(
        movementsRef,
        where('movementDate', '>=', startOfYear),
        where('movementDate', '<=', endOfYear),
        orderBy('movementDate', 'desc')
      );
    } else {
      movementQuery = query(movementsRef, orderBy('movementDate', 'desc'));
    }
    
    // Fetch movements
    const movementsSnapshot = await getDocs(movementQuery);
    
    let movements = movementsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.movementDate?.toDate ? data.movementDate.toDate() : new Date(data.movementDate),
        type: data.movementType || 'OUT',
        reason: data.reason || 'Unknown',
        productName: data.productName || 'Unknown Product',
        quantity: data.quantity || 0,
        value: data.totalValue || 0,
        // ... more field mapping
      };
    });
    
    // Apply month filter
    if (monthFilter && monthFilter !== 'All Months') {
      const monthIndex = months.indexOf(monthFilter) - 1;
      movements = movements.filter(m => m.date.getMonth() === monthIndex);
    }
    
    // Calculate summary
    const totalIn = movements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = movements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.quantity, 0);
    // ... more calculations
    
  } catch (error) {
    console.error('Error fetching movement data:', error);
  }
};
```

### AFTER (Using Stock Movement Service):

```javascript
// Import at the top of the file
import StockMovementService from '../../../services/StockMovementService';

const fetchMovementData = async () => {
  setLoading(true);
  try {
    // Determine date range based on filters
    let startDate = null;
    let endDate = null;
    
    if (yearFilter && yearFilter !== 'All Years') {
      const year = parseInt(yearFilter);
      
      if (monthFilter && monthFilter !== 'All Months') {
        // Specific month
        const monthIndex = months.indexOf(monthFilter) - 1;
        const movements = await StockMovementService.getMovementsByYearMonth(year, monthIndex);
        processMovements(movements);
      } else {
        // Entire year
        const movements = await StockMovementService.getMovementsByYearMonth(year);
        processMovements(movements);
      }
    } else {
      // All time - just get recent movements
      const movements = await StockMovementService.getStockMovements({
        limitCount: 1000  // Adjust as needed
      });
      
      // Apply month filter if needed
      let filteredMovements = movements;
      if (monthFilter && monthFilter !== 'All Months') {
        const monthIndex = months.indexOf(monthFilter) - 1;
        filteredMovements = movements.filter(m => m.movementDate.getMonth() === monthIndex);
      }
      
      processMovements(filteredMovements);
    }
    
  } catch (error) {
    console.error('Error fetching movement data:', error);
    alert(`Error loading stock movements: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

// Helper function to process movements
const processMovements = (movements) => {
  setMovementData(movements);
  
  // Use service function for summary instead of calculating manually
  StockMovementService.getMovementSummary({ 
    // Pass the movements or apply date filters
    startDate: movements[0]?.movementDate,
    endDate: movements[movements.length - 1]?.movementDate
  }).then(summary => {
    setSummary(summary);
  });
  
  // Use service function for chart data
  StockMovementService.getDailyMovementData({
    startDate: movements[0]?.movementDate,
    endDate: movements[movements.length - 1]?.movementDate
  }).then(chartData => {
    setChartData(chartData);
  });
};
```

### What Changed:
1. ✅ Import StockMovementService
2. ✅ Use `getMovementsByYearMonth()` for filtering
3. ✅ Use `getMovementSummary()` instead of manual calculations
4. ✅ Use `getDailyMovementData()` for chart data
5. ✅ Cleaner code with less manual querying
6. ✅ Consistent data structure returned

---

## Example 4: Creating a New Feature (Stock Release)

When creating a **new feature** that involves stock movements, use the service from the start:

```javascript
// In src/features/inventory/pages/StockRelease.jsx
import StockMovementService, { 
  MOVEMENT_REASONS, 
  REFERENCE_TYPES 
} from '../../../services/StockMovementService';

const handleReleaseStock = async (releaseData) => {
  try {
    // 1. Create release document
    const releaseRef = await addDoc(collection(db, 'stock_releases'), {
      releaseNumber: releaseData.releaseNumber,
      destination: releaseData.destination,
      items: releaseData.items,
      releasedBy: currentUser.uid,
      createdAt: serverTimestamp()
    });
    
    // 2. Update inventory quantities
    for (const item of releaseData.items) {
      const variantRef = doc(db, 'Variants', item.variantId);
      const variantSnap = await getDoc(variantRef);
      const currentQty = variantSnap.data().quantity;
      
      await updateDoc(variantRef, {
        quantity: currentQty - item.quantity
      });
    }
    
    // 3. Record stock movements using the service
    const movements = releaseData.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      variantId: item.variantId,
      variantName: item.variantName,
      category: item.category,
      quantity: item.quantity,
      previousQuantity: item.currentStock,
      newQuantity: item.currentStock - item.quantity,
      unitPrice: item.unitPrice,
      reason: MOVEMENT_REASONS.STOCK_RELEASE,
      referenceType: REFERENCE_TYPES.STOCK_RELEASE,
      referenceId: releaseRef.id,
      performedBy: {
        uid: currentUser.uid,
        name: currentUser.displayName
      },
      location: {
        storageLocation: item.storageLocation,
        shelf: item.shelf,
        row: item.row,
        column: item.column
      },
      movementDate: new Date(),
      notes: `Released to ${releaseData.destination}`,
      additionalData: {
        releaseNumber: releaseData.releaseNumber,
        destination: releaseData.destination,
        requestedBy: releaseData.requestedBy
      }
    }));
    
    await StockMovementService.recordBatchMovements(movements, 'OUT');
    
    console.log('✅ Stock released successfully');
  } catch (error) {
    console.error('❌ Error releasing stock:', error);
  }
};
```

---

## Migration Checklist

### For Each File:

- [ ] Import `StockMovementService` and constants
- [ ] Replace direct Firestore calls with service functions
- [ ] Map data to standardized format
- [ ] Use constants instead of hardcoded strings
- [ ] Include all required fields (productId, productName, quantity, etc.)
- [ ] Provide proper user object with `uid` and `name`
- [ ] Add category field
- [ ] Move non-standard fields to `additionalData`
- [ ] Test thoroughly
- [ ] Update error handling
- [ ] Remove old imports if no longer needed

### Testing After Migration:

1. **Test Creation**: Verify movements are created with correct structure
2. **Test Querying**: Ensure reports still work correctly
3. **Test Analytics**: Verify summary calculations are accurate
4. **Test Performance**: Batch operations should be faster
5. **Check Firebase Console**: Verify document structure in Firestore

---

## Common Pitfalls

### ❌ Don't forget category
```javascript
// Missing category field
{
  productId: 'prod_123',
  productName: 'Cement'
  // category: ???  <- Missing!
}
```

### ❌ Don't use hardcoded strings
```javascript
// Bad
reason: 'POS Sale'

// Good
reason: MOVEMENT_REASONS.POS_SALE
```

### ❌ Don't forget user name
```javascript
// Bad
performedBy: {
  uid: currentUser.uid
  // Missing name!
}

// Good
performedBy: {
  uid: currentUser.uid,
  name: currentUser.displayName || currentUser.email
}
```

### ❌ Don't mix old and new formats
Either fully migrate or don't. Mixing causes inconsistent data.

---

## Need Help?

Refer to the main guide: `STOCK_MOVEMENT_SERVICE_GUIDE.md`
