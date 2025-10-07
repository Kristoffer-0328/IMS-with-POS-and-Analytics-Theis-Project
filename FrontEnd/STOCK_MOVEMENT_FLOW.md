# Stock Movement Flow Documentation

## Overview
This document explains how stock movements are tracked in the system from POS sale to inventory deduction.

---

## 🔄 Complete Flow

### **Step 1: POS Sale (Pos_NewSale.jsx)**
**What happens:**
- Cashier creates an invoice/receipt for customer
- System writes to Firebase collections but **DOES NOT deduct inventory yet**

**Firebase Collections Written:**
1. **`pos_transactions`**
   ```javascript
   {
     transactionId: "INV-2025-001",
     releaseStatus: "pending_release", // Key field
     items: [...], // Product details
     customerInfo: {...},
     cashier: {...},
     totals: { subtotal, tax, total },
     paymentInfo: {...},
     createdAt: Timestamp
   }
   ```

2. **`sales_aggregates`** (Analytics)
   ```javascript
   {
     date: "2025-10-07",
     totalSales: 5200,
     transactionCount: 1,
     productsData: {...}
   }
   ```

3. **`notifications`** (If restocking needed)
   ```javascript
   {
     type: "restock_alert",
     productId: "...",
     message: "Low stock alert"
   }
   ```

**Important:** 
- ✅ Transaction recorded
- ❌ Inventory NOT deducted yet
- 📦 Items marked as `pending_release`

---

### **Step 2: Release Management (ReleaseManagement.jsx)**
**What happens:**
- Inventory Manager sees all transactions with `releaseStatus === 'pending_release'`
- Generates QR code for each pending release
- Mobile worker scans QR code

**Firebase Collections Read:**
1. **`pos_transactions`** where `releaseStatus === 'pending_release'`

**QR Code Contains:**
- Release ID (pos_transaction document ID)
- Transaction ID (INV-2025-001)
- Customer info
- Items to release

---

### **Step 3: Mobile Release (release_mobile_view.jsx)**
**What happens:**
- Worker scans QR code → Redirects to mobile view
- URL contains: `/release-mobile?id={releaseId}`
- Worker fills in release details and product conditions
- System updates inventory and creates tracking logs

**Firebase Collections Written:**

1. **`release_logs`** (Main release record)
   ```javascript
   {
     releaseId: "doc_id_from_pos_transactions",
     transactionId: "INV-2025-001",
     releasedBy: "user_uid",
     releasedByName: "John Doe",
     releaseDate: Timestamp,
     products: [
       {
         productId: "...",
         productName: "Portland Cement Type 1 (40kg)",
         variantId: "...",
         quantity: 20,
         orderedQty: 20,
         storageLocation: "warehouse_1",
         shelf: "A",
         row: "1",
         column: "2",
         condition: "complete",
         unitPrice: 260,
         totalValue: 5200
       }
     ],
     customerInfo: {...},
     totalValue: 5200,
     totalItems: 20,
     releaseType: "POS Sale",
     status: "completed",
     createdAt: Timestamp
   }
   ```

2. **`stock_movements`** (Individual movement records - ONE PER PRODUCT)
   ```javascript
   {
     // Movement Type
     movementType: "OUT",
     reason: "POS Sale",
     
     // Product Info
     productId: "...",
     productName: "Portland Cement Type 1 (40kg)",
     variantId: "...",
     variantName: "40kg Bag",
     
     // Quantity & Value
     quantity: 20,
     unitPrice: 260,
     totalValue: 5200,
     
     // Location
     storageLocation: "warehouse_1",
     shelf: "A",
     row: "1",
     column: "2",
     
     // References
     referenceType: "pos_transaction",
     referenceId: "pos_transaction_doc_id",
     transactionId: "INV-2025-001",
     releaseLogId: "release_log_doc_id",
     
     // People
     customer: "Walk-in Customer",
     releasedBy: "user_uid",
     releasedByName: "John Doe",
     cashier: "Jane Smith",
     
     // Status
     condition: "complete",
     status: "completed",
     
     // Time
     movementDate: Timestamp,
     createdAt: Timestamp
   }
   ```

3. **`pos_transactions`** (Update existing doc)
   ```javascript
   {
     // ... existing fields ...
     releaseStatus: "released", // Changed from pending_release
     releasedAt: Timestamp,
     releasedBy: "user_uid",
     releasedByName: "John Doe",
     releaseDetails: {...},
     releasedProducts: [...],
     updatedAt: Timestamp
   }
   ```

4. **`Products/{location}/shelves/{shelf}/rows/{row}/columns/{col}/items/{id}`** (Inventory deduction)
   ```javascript
   {
     // ... existing fields ...
     quantity: 80, // Was 100, now deducted by 20
     lastUpdated: Timestamp
   }
   ```

---

## 📊 Stock Movement Report Integration

### **How Stock Movement Report Works:**

The Stock Movement Report reads from `stock_movements` collection to show:

**Movement Types:**
- **IN:** Supplier Delivery, Restock Request, Adjustments (increase)
- **OUT:** POS Sale, Project Release, Damage/Shrinkage, Adjustments (decrease)

**Report Displays:**
| Date | Type | Reason | Product | Quantity | Value | Reference | Details |
|------|------|--------|---------|----------|-------|-----------|---------|
| Oct 1 | OUT | POS Sale | Portland Cement | -20 | ₱5,200 | INV-2025-001 | Customer: Walk-in |
| Oct 3 | IN | Supplier Delivery | Portland Cement | +100 | ₱26,000 | RCV-2025-015 | Supplier: ABC |
| Oct 5 | OUT | Project Release | PVC Pipe | -50 | ₱25,000 | REL-2025-008 | To: Construction Site A |

---

## 🔍 Query Examples

### **Get all movements for a product:**
```javascript
const movementsRef = collection(db, 'stock_movements');
const q = query(
  movementsRef,
  where('productId', '==', productId),
  orderBy('movementDate', 'desc')
);
const snapshot = await getDocs(q);
```

### **Get movements by type (IN or OUT):**
```javascript
const q = query(
  collection(db, 'stock_movements'),
  where('movementType', '==', 'OUT'),
  orderBy('movementDate', 'desc')
);
```

### **Get movements by reason:**
```javascript
const q = query(
  collection(db, 'stock_movements'),
  where('reason', '==', 'POS Sale'),
  orderBy('movementDate', 'desc')
);
```

### **Get movements for date range:**
```javascript
const q = query(
  collection(db, 'stock_movements'),
  where('movementDate', '>=', startDate),
  where('movementDate', '<=', endDate),
  orderBy('movementDate', 'desc')
);
```

---

## 📝 Summary

### **Collections & Their Purposes:**

| Collection | Purpose | Written By | When |
|------------|---------|------------|------|
| `pos_transactions` | Invoice records | Pos_NewSale.jsx | When sale created |
| `sales_aggregates` | Sales analytics | Pos_NewSale.jsx | When sale created |
| `release_logs` | Release summary | release_mobile_view.jsx | After QR scan & release |
| `stock_movements` | Individual movements | release_mobile_view.jsx | After QR scan & release |
| `Products/...` | Inventory quantities | release_mobile_view.jsx | After QR scan & release |

### **Status Flow:**
1. **POS Sale** → `releaseStatus: "pending_release"`
2. **QR Generated** → Shown in ReleaseManagement.jsx
3. **QR Scanned** → Opens release_mobile_view.jsx
4. **Release Completed** → `releaseStatus: "released"` + Inventory deducted + Logs created

### **Key Features:**
✅ **Separation of Concerns:** Sale recording vs. inventory deduction
✅ **Audit Trail:** Complete tracking from sale to release
✅ **Stock Movement History:** Every OUT movement recorded individually
✅ **Real-time Updates:** Inventory updated after physical release
✅ **Mobile Workflow:** QR code enables warehouse workers to process releases

---

## 🚀 Future Enhancements

### **Additional Movement Types to Add:**

1. **Supplier Deliveries** (receiving_logs → stock_movements)
   ```javascript
   {
     movementType: "IN",
     reason: "Supplier Delivery",
     referenceType: "receiving_log",
     supplier: "ABC Suppliers"
   }
   ```

2. **Internal Transfers**
   ```javascript
   {
     movementType: "OUT",
     reason: "Transfer Out",
     destination: "Warehouse B"
   }
   // And corresponding IN at destination
   ```

3. **Damage/Shrinkage Adjustments**
   ```javascript
   {
     movementType: "OUT",
     reason: "Damaged/Shrinkage",
     referenceType: "adjustment",
     notes: "Damaged during handling"
   }
   ```

4. **Stock Count Adjustments**
   ```javascript
   {
     movementType: "IN/OUT",
     reason: "Stock Count Adjustment",
     referenceType: "stock_count",
     expectedQty: 100,
     actualQty: 95
   }
   ```

---

## 💡 Best Practices

1. **Always use transactions** when updating multiple documents
2. **Include timestamps** for accurate movement tracking
3. **Store references** to link related documents
4. **Calculate totals** at write time (don't rely on queries)
5. **Add status fields** for workflow tracking
6. **Include user information** for accountability

