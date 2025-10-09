# System Process Flow - Complete Workflow

## Overview
This document outlines the complete end-to-end business process flow in the IMS with POS and Analytics System, from initial customer quotation through to inventory replenishment.

---

## 📊 Complete Process Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CUSTOMER TRANSACTION FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   1. QUOTATION CREATION (POS)     │
                    │   Role: POS Cashier               │
                    └─────────────────┬─────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
    │  Create New     │     │  Select         │   │  Calculate      │
    │  Quotation      │────▶│  Products       │──▶│  Total & Tax    │
    │  Document       │     │  & Quantities   │   │  (VATable/Non)  │
    └─────────────────┘     └─────────────────┘   └─────────────────┘
              │                                              │
              │                                              ▼
              │                                    ┌─────────────────┐
              │                                    │  Save to        │
              │                                    │  quotations     │
              │                                    │  Collection     │
              │                                    └─────────────────┘
              │                                              │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │   2. INVOICE GENERATION (POS)   │
                    │   Role: POS Cashier             │
                    └─────────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
    │  Convert        │     │  Process        │   │  Generate       │
    │  Quotation to   │────▶│  Payment        │──▶│  Invoice #      │
    │  Invoice        │     │  (Cash/Card)    │   │  (INV-YYYY-XXX) │
    └─────────────────┘     └─────────────────┘   └─────────────────┘
              │                                              │
              │                                              ▼
              │                                    ┌─────────────────┐
              │                                    │  Create         │
              │                                    │  posTransactions│
              │                                    │  Document       │
              │                                    └─────────────────┘
              │                                              │
              │                                              │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │   3. PRODUCT RELEASE (Factory)  │
                    │   Role: Factory/Inventory Staff │
                    └─────────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
    │  View Pending   │     │  Scan/Select    │   │  Verify Stock   │
    │  Invoices for   │────▶│  Products from  │──▶│  Availability   │
    │  Release        │     │  Shelves        │   │  (Mobile View)  │
    └─────────────────┘     └─────────────────┘   └─────────────────┘
              │                                              │
              │                                              ▼
              │                                    ┌─────────────────┐
              │                                    │  Deduct Stock   │
              │                                    │  from Products  │
              │                                    │  Collection     │
              │                                    └─────────────────┘
              │                                              │
              │                                              ▼
              │                                    ┌─────────────────┐
              │                                    │  Create         │
              │                                    │  release_logs   │
              │                                    │  Document       │
              │                                    └─────────────────┘
              │                                              │
              │                                              ▼
              │                                    ┌─────────────────┐
              │                                    │  Create         │
              │                                    │  stock_movements│
              │                                    │  (OUT)          │
              │                                    └─────────────────┘
              │                                              │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INVENTORY REPLENISHMENT FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │  4. AUTOMATIC RESTOCK REQUEST     │
                    │  Trigger: Stock Level <= Min      │
                    └─────────────────┬─────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
    │  System Detects │     │  Calculate      │   │  Create         │
    │  Low Stock      │────▶│  Restock        │──▶│  RestockRequests│
    │  (qty<=minStock)│     │  Quantity Needed│   │  Document       │
    └─────────────────┘     └─────────────────┘   └─────────────────┘
              │                                              │
              │                                              ▼
              │                                    ┌─────────────────┐
              │                                    │  Status:        │
              │                                    │  "Pending"      │
              │                                    │  Notify IM      │
              │                                    └─────────────────┘
              │                                              │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │  5. PURCHASE ORDER CREATION     │
                    │  Role: Inventory Manager (IM)   │
                    └─────────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
    │  Review Restock │     │  Select         │   │  Create         │
    │  Requests       │────▶│  Supplier       │──▶│  Purchase Order │
    │  Dashboard      │     │  & Products     │   │  (PO-YYYY-XXXX) │
    └─────────────────┘     └─────────────────┘   └─────────────────┘
              │                                              │
              │                                              ▼
              │                                    ┌─────────────────┐
              │                                    │  Fill in:       │
              │                                    │  - Quantities   │
              │                                    │  - Prices       │
              │                                    │  - Delivery Date│
              │                                    └─────────────────┘
              │                                              │
              │                                              ▼
              │                                    ┌─────────────────┐
              │                                    │  Save to        │
              │                                    │  purchase_orders│
              │                                    │  Status: Draft  │
              │                                    └─────────────────┘
              │                                              │
              │                                              ▼
              │                                    ┌─────────────────┐
              │                                    │  Submit for     │
              │                                    │  Approval       │
              │                                    │  Status: Pending│
              │                                    └─────────────────┘
              │                                              │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │  6. PURCHASE ORDER APPROVAL     │
                    │  Role: Admin                    │
                    └─────────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
    │  Admin Reviews  │     │  Verify:        │   │  Decision:      │
    │  Pending POs    │────▶│  - Budget       │──▶│  Approve/Reject │
    │  in Dashboard   │     │  - Supplier     │   │  /Request Info  │
    └─────────────────┘     │  - Quantities   │   └─────────────────┘
                            │  - Pricing      │             │
                            └─────────────────┘             │
                                                            │
              ┌─────────────────────────────────────────────┤
              │                                             │
              ▼                                             ▼
    ┌─────────────────┐                          ┌─────────────────┐
    │  If REJECTED    │                          │  If APPROVED    │
    │  Status:        │                          │  Status:        │
    │  "Rejected"     │                          │  "Approved"     │
    │  Add Comments   │                          │  Add Signature  │
    └─────────────────┘                          └─────────────────┘
              │                                             │
              │                                             ▼
              │                                   ┌─────────────────┐
              │                                   │  Create         │
              │                                   │  po_approvals   │
              │                                   │  Document       │
              │                                   └─────────────────┘
              │                                             │
              │                                             ▼
              │                                   ┌─────────────────┐
              │                                   │  Notify IM      │
              │                                   │  Email Supplier │
              │                                   │  Generate PO PDF│
              │                                   └─────────────────┘
              │                                             │
              └──────────────────────┬────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │  7. WAITING FOR DELIVERY        │
                    │  Role: Inventory Manager        │
                    └─────────────────┬───────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  Monitor PO     │
                            │  Status in      │
                            │  Dashboard      │
                            └─────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  Supplier       │
                            │  Delivers       │
                            │  Products       │
                            └─────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │  8. RECEIVING MANAGEMENT        │
                    │  (QR CODE SYSTEM)               │
                    └─────────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
    │  DESKTOP:       │     │  MOBILE:        │   │  MOBILE:        │
    │  Select Approved│────▶│  Scan QR Code   │──▶│  Browser Opens  │
    │  PO             │     │  with Camera    │   │  Safari/Chrome  │
    └─────────────────┘     └─────────────────┘   └─────────────────┘
              │                                              │
              ▼                                              ▼
    ┌─────────────────┐                          ┌─────────────────┐
    │  Generate QR    │                          │  PO Details     │
    │  Code with      │                          │  Auto-Load      │
    │  Unique Token   │                          │  on Mobile      │
    └─────────────────┘                          └─────────────────┘
              │                                              │
              ▼                                              ▼
    ┌─────────────────┐                          ┌─────────────────┐
    │  Display QR on  │                          │  Quality        │
    │  Desktop Screen │                          │  Assessment UI  │
    │  (Print Option) │                          │  Per Product    │
    └─────────────────┘                          └─────────────────┘
                                                             │
                                      ┌──────────────────────┼──────────────────────┐
                                      │                      │                      │
                                      ▼                      ▼                      ▼
                            ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
                            │  GOOD CONDITION │   │  DAMAGED        │   │  MISSING        │
                            │  • Enter qty    │   │  • Enter qty    │   │  • Enter qty    │
                            │  • Select       │   │  • Damage type  │   │  • Add notes    │
                            │    location     │   │  • Upload photos│   │  • Track        │
                            │  • ADD to       │   │  • Add notes    │   │    shortage     │
                            │    inventory    │   │  • DO NOT add   │   │  • DO NOT add   │
                            └─────────────────┘   └─────────────────┘   └─────────────────┘
                                      │                      │                      │
                                      └──────────────────────┼──────────────────────┘
                                                             │
                                                             ▼
                                                   ┌─────────────────┐
                                                   │  Review Summary │
                                                   │  • Good: 95     │
                                                   │  • Damaged: 3   │
                                                   │  • Missing: 2   │
                                                   └─────────────────┘
                                                             │
                                                             ▼
                                                   ┌─────────────────┐
                                                   │  Signatures &   │
                                                   │  Photos         │
                                                   │  (Mobile Touch) │
                                                   └─────────────────┘
                                                             │
                                                             ▼
                                                   ┌─────────────────┐
                                                   │  Complete       │
                                                   │  Receiving      │
                                                   │  (Submit)       │
                                                   └─────────────────┘
                                                             │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │  9. INVENTORY UPDATE            │
                    │  + SYSTEM LOGS                  │
                    │  Automatic Process              │
                    └─────────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
    │  Update Products│     │  Create Stock   │   │  Write SYSTEM   │
    │  Collection:    │────▶│  Movements:     │──▶│  LOGS:          │
    │  Add GOOD qty   │     │  - IN (95 good) │   │  8 Log Entries  │
    │  (95 units)     │     │  - DAMAGED (3)  │   │  INFO/WARNING   │
    └─────────────────┘     └─────────────────┘   └─────────────────┘
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
    │  Create Damage  │     │  Update PO:     │   │  LOG 1: QR Gen  │
    │  Reports for    │────▶│  Status:        │   │  LOG 2: QR Scan │
    │  3 damaged items│     │  "completed_    │   │  LOG 3: Start   │
    └─────────────────┘     │   with_issues"  │   │  LOG 4: Damaged │
                            └─────────────────┘   │  LOG 5: Missing │
              │                       │            │  LOG 6: Inv Upd │
              ▼                       ▼            │  LOG 7: Complete│
    ┌─────────────────┐     ┌─────────────────┐   │  LOG 8: PO Upd  │
    │  Update Restock │     │  Create         │   └─────────────────┘
    │  Requests:      │────▶│  receivingRecords│             │
    │  Status: Done   │     │  Document       │             ▼
    └─────────────────┘     └─────────────────┘   ┌─────────────────┐
              │                       │            │  Audit Trail    │
              │                       │            │  Entry Created  │
              │                       │            └─────────────────┘
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  Send           │
                            │  Notifications: │
                            │  - Admin        │
                            │  - Purchasing   │
                            │  - Supplier     │
                            └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  Generate       │
                            │  Reports:       │
                            │  - Receiving    │
                            │  - Damage       │
                            │  - Stock Move   │
                            └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  Dashboard      │
                            │  Real-time      │
                            │  Update         │
                            └─────────────────┘
```

---

## 📋 Detailed Process Breakdown

### **PHASE 1: Customer Transaction**

#### **Step 1: Quotation Creation**
- **Role**: POS Cashier
- **Location**: POS → New Sale
- **Process**:
  1. Click "Create Quotation" button
  2. Search and add products
  3. Set quantities for each item
  4. System calculates:
     - Subtotal per item
     - VAT-able and Non-VAT-able totals
     - Total discount (if applicable)
     - Grand total
  5. Save quotation with customer details
  6. Generate quotation number (QT-YYYY-XXXX)
  7. Print quotation for customer

- **Firebase Collections Updated**:
  ```javascript
  quotations/{quotationId}
    ├── quotationNumber: "QT-2025-0001"
    ├── customerName: "John Doe"
    ├── items: [{ productId, name, quantity, price, total }]
    ├── subtotal: 5000
    ├── vatAmount: 600
    ├── totalAmount: 5600
    ├── status: "pending"
    ├── createdAt: timestamp
    └── createdBy: userId
  ```

#### **Step 2: Invoice Generation**
- **Role**: POS Cashier
- **Location**: POS → Transaction History
- **Process**:
  1. Locate saved quotation
  2. Click "Convert to Invoice"
  3. Review items and amounts
  4. Select payment method (Cash/Card)
  5. Process payment
  6. Generate invoice number (INV-YYYY-XXXX)
  7. Update quotation status to "converted"
  8. Print invoice and receipt
  9. Customer takes invoice to factory for pickup

- **Firebase Collections Updated**:
  ```javascript
  posTransactions/{invoiceId}
    ├── invoiceNumber: "INV-2025-0001"
    ├── quotationId: "QT-2025-0001"
    ├── items: [{ productId, name, quantity, price }]
    ├── paymentMethod: "Cash"
    ├── amountPaid: 5600
    ├── change: 400
    ├── status: "pending_release"
    ├── transactionDate: timestamp
    └── cashier: userId
  
  quotations/{quotationId}
    └── status: "converted" // Updated
  ```

#### **Step 3: Product Release**
- **Role**: Factory Staff / Inventory Staff
- **Location**: Inventory → Release Management (Mobile View)
- **Process**:
  1. View pending invoices list
  2. Select invoice to process
  3. Switch to mobile-optimized view
  4. For each product in invoice:
     - Scan barcode or search product
     - Verify product details
     - Select storage location (shelf/row/column)
     - Enter quantity to release
     - Confirm stock availability
  5. System validates stock levels
  6. Deduct quantities from inventory
  7. Generate release summary
  8. Customer signs for receipt
  9. Update invoice status to "completed"

- **Firebase Collections Updated**:
  ```javascript
  // 1. Update inventory quantities
  Products/{location}/shelves/{shelf}/rows/{row}/columns/{col}/items/{productId}
    └── quantity: 90 // Was 100, released 10
  
  // 2. Create release log
  release_logs/{releaseId}
    ├── invoiceNumber: "INV-2025-0001"
    ├── releasedBy: userId
    ├── releasedDate: timestamp
    ├── items: [{ productId, name, quantityReleased, location }]
    ├── totalItems: 5
    └── customerSignature: imageUrl
  
  // 3. Create stock movement records (for each item)
  stock_movements/{movementId}
    ├── productId: "product123"
    ├── productName: "Portland Cement 50kg"
    ├── movementType: "OUT"
    ├── fromLocation: "STR A1 - Shelf A - Row 1 - Column 1"
    ├── toLocation: "Customer - INV-2025-0001"
    ├── quantity: 10
    ├── reason: "Sales Release"
    ├── invoiceNumber: "INV-2025-0001"
    ├── movementDate: timestamp
    ├── performedBy: userId
    └── status: "completed"
  
  // 4. Update invoice status
  posTransactions/{invoiceId}
    ├── status: "completed" // Updated
    ├── releaseDate: timestamp
    └── releasedBy: userId
  ```

- **Automatic Trigger**: When stock drops below minimum level
  ```javascript
  // System checks after each release:
  if (product.quantity <= product.minStock) {
    createRestockRequest(product);
  }
  ```

---

### **PHASE 2: Inventory Replenishment**

#### **Step 4: Automatic Restock Request**
- **Trigger**: Stock level drops to or below minimum stock level
- **Location**: Automatic background process
- **Process**:
  1. System continuously monitors inventory levels
  2. When product quantity <= minStock:
     - Calculate recommended restock quantity
     - Create restock request automatically
     - Notify Inventory Manager
  3. Request appears in IM dashboard

- **Firebase Collections Updated**:
  ```javascript
  RestockRequests/{requestId}
    ├── productId: "product123"
    ├── productName: "Portland Cement 50kg"
    ├── currentStock: 45
    ├── minStock: 60
    ├── maxStock: 200
    ├── recommendedQuantity: 155 // maxStock - currentStock
    ├── urgencyLevel: "medium" // high/medium/low
    ├── Status: "Pending"
    ├── createdAt: timestamp
    ├── createdBy: "System"
    └── assignedTo: inventoryManagerId
  ```

#### **Step 5: Purchase Order Creation**
- **Role**: Inventory Manager
- **Location**: Inventory → Purchase Orders
- **Process**:
  1. Navigate to Purchase Orders page
  2. Review pending restock requests
  3. Click "Create Purchase Order"
  4. Select supplier from dropdown
  5. Add products to PO:
     - From restock requests (one-click add)
     - Or manually search products
  6. For each product:
     - Set quantity to order
     - Verify supplier price
     - Set expected delivery date
  7. Review order summary:
     - Total items
     - Subtotal
     - Tax
     - Grand total
  8. Save as draft (can edit later)
  9. Submit for admin approval
  10. System generates PO number (PO-YYYY-XXXX)

- **Firebase Collections Updated**:
  ```javascript
  purchase_orders/{poId}
    ├── poNumber: "PO-2025-0001"
    ├── supplierId: "supplier123"
    ├── supplierName: "ABC Cement Supplier"
    ├── supplierCode: "SUP-001"
    ├── items: [
    │     {
    │       productId: "product123",
    │       productName: "Portland Cement 50kg",
    │       quantity: 100,
    │       unitPrice: 200,
    │       totalPrice: 20000,
    │       restockRequestId: "restock456"
    │     }
    │   ]
    ├── subtotal: 20000
    ├── taxAmount: 2400
    ├── grandTotal: 22400
    ├── expectedDeliveryDate: "2025-10-15"
    ├── status: "pending" // draft → pending → approved/rejected
    ├── createdBy: inventoryManagerId
    ├── createdAt: timestamp
    ├── submittedAt: timestamp
    └── notes: "Urgent - Low stock alert"
  
  // Update restock request
  RestockRequests/{requestId}
    ├── Status: "In Progress" // Updated
    └── purchaseOrderId: "PO-2025-0001"
  ```

#### **Step 6: Purchase Order Approval**
- **Role**: Admin
- **Location**: Admin → Purchase Orders
- **Process**:
  1. Admin receives notification of pending PO
  2. Navigate to Admin Purchase Orders page
  3. View list of pending POs
  4. Click on PO to review details:
     - Supplier information
     - Product list with quantities and prices
     - Total amount
     - Delivery date
     - Requester (IM) details
  5. Verify:
     - Budget availability
     - Supplier credibility
     - Reasonable quantities
     - Pricing accuracy
     - Business need
  6. Decision options:
     - **Approve**: 
       - Add digital signature
       - Add approval comments
       - Confirm approval
     - **Reject**:
       - Add rejection reason
       - Send back to IM
     - **Request More Info**:
       - Add comments/questions
       - Set status to "needs_info"
  7. System sends email to supplier (if approved)
  8. Generate PO PDF with approval signature
  9. Notify Inventory Manager of decision

- **Firebase Collections Updated**:
  ```javascript
  // Update PO status
  purchase_orders/{poId}
    ├── status: "approved" // Updated
    ├── approvedBy: adminId
    ├── approvedAt: timestamp
    ├── approvalComments: "Approved - Budget allocated"
    └── approvalSignature: imageUrl
  
  // Create approval record
  po_approvals/{approvalId}
    ├── poId: "PO-2025-0001"
    ├── poNumber: "PO-2025-0001"
    ├── approver: adminId
    ├── approverName: "Admin User"
    ├── decision: "approved" // approved/rejected/needs_info
    ├── comments: "Approved - Budget allocated"
    ├── signature: imageUrl
    ├── approvedAt: timestamp
    └── notificationSent: true
  
  // If rejected:
  purchase_orders/{poId}
    ├── status: "rejected"
    ├── rejectedBy: adminId
    ├── rejectedAt: timestamp
    └── rejectionReason: "Over budget for this quarter"
  ```

#### **Step 7: Waiting for Delivery**
- **Role**: Inventory Manager
- **Location**: Inventory → Purchase Orders
- **Process**:
  1. Monitor PO status in dashboard
  2. PO status shows "Approved - Awaiting Delivery"
  3. Track expected delivery date
  4. Coordinate with supplier for delivery schedule
  5. Prepare receiving area and staff
  6. System shows countdown to expected delivery
  7. When supplier arrives with delivery:
     - Proceed to Receiving Management

- **Visual Indicators**:
  - Green badge: "Approved"
  - Blue badge: "In Transit" (if tracking available)
  - Yellow badge: "Delayed" (if past expected date)
  - Notification when delivery is expected today

#### **Step 8: Receiving Management (QR Code Scanning)**
- **Role**: Inventory Manager
- **Location**: Inventory → Receiving Management → Desktop (QR Generation) + Mobile Browser (Scanning)
- **Process**:
  
  **Phase 1: QR Code Generation (Desktop)**
  1. Navigate to Receiving Management page on desktop
  2. View list of approved POs ready for receiving
  3. Select the PO that has arrived (PO-2025-0001)
  4. System displays PO details with **"Generate QR Code"** button
  5. Click "Generate QR Code" button
  6. System generates unique QR code containing:
     - PO Number (PO-2025-0001)
     - Unique identifier/token
     - Direct URL to mobile receiving page
     - Encrypted PO data
  7. QR code is displayed on screen
  8. Option to print QR code for field use
  
  **Phase 2: Mobile QR Scanning**
  9. User opens mobile phone camera or QR scanner app
  10. Scan the displayed QR code
  11. Mobile browser (Safari/Chrome/Firefox) automatically opens
  12. Browser redirects to mobile-optimized receiving page
  13. System authenticates the QR token
  14. PO details auto-load on mobile screen
  
  **Phase 3: Product Quality Assessment (Mobile Browser)**
  15. **For each product in the PO**, mobile screen shows:
     - Product name and image
     - Expected quantity
     - Expected price
     - Product specifications
  
  16. **Quality Status Selection** (for each product):
     - **Good Condition**: 
       - Enter quantity in good condition
       - These items will be added to inventory
     - **Damaged**: 
       - Enter quantity damaged
       - Required: Add damage notes
       - Optional: Upload damage photos
       - These items will NOT be added to inventory
     - **Missing**: 
       - Enter quantity missing/not delivered
       - Add notes about shortage
     - **Expired/Near Expiry**:
       - Enter quantity with expiry issues
       - Enter expiry date
       - Decision: Accept or reject
  
  17. **For items in GOOD CONDITION**:
     - **Select Storage Location**:
       - Choose storage unit (STR A1)
       - Select shelf (Shelf A)
       - Select row (Row 1)
       - Select column (Column 1)
       - System shows available space
     - **Verify Details**:
       - Product matches PO
       - Quantity correct
       - Quality approved
     - Click "Confirm Good Items" button
  
  18. **For DAMAGED/DEFECTIVE items**:
     - Enter damage quantity
     - Select damage type:
       - Physical damage (torn, broken)
       - Water damage
       - Expired
       - Wrong product
       - Other (specify)
     - Add detailed notes
     - Take photos of damage
     - Click "Report Damaged Items" button
  
  19. **Review Receiving Summary** (Mobile):
     - Total expected: 100 units
     - Good condition: 95 units
     - Damaged: 3 units
     - Missing: 2 units
     - Total value (good items): ₱19,000
     - Total value (damaged): ₱600
  
  20. **Add Final Notes**:
     - "3 bags damaged during transport - torn packaging"
     - "2 bags missing from delivery - supplier to credit"
     - Upload delivery receipt photo
  
  21. **Complete Receiving**:
     - Click "Complete Receiving" button
     - System confirms all items processed
     - Generate receiving report
     - Display summary on mobile
  
  22. **Digital Signatures** (Mobile):
     - Receiver signs on mobile touchscreen
     - Supplier representative signs on mobile
     - Signatures captured and stored
     - Confirmation sent to both parties

- **Firebase Collections Updated**:
  ```javascript
  // 1. Create QR code record (Desktop - before scanning)
  qr_codes/{qrId}
    ├── poId: "PO-2025-0001"
    ├── poNumber: "PO-2025-0001"
    ├── uniqueToken: "abc123xyz789..." // Encrypted token
    ├── qrCodeUrl: "https://yourapp.com/receiving/scan?token=abc123xyz789"
    ├── generatedBy: inventoryManagerId
    ├── generatedAt: timestamp
    ├── expiresAt: timestamp // 24 hours from generation
    ├── status: "active" // active/used/expired
    ├── scannedAt: null
    └── scannedBy: null
  
  // 2. Update QR code record (Mobile - after scanning)
  qr_codes/{qrId}
    ├── status: "used" // Updated
    ├── scannedAt: timestamp
    ├── scannedBy: userId
    ├── deviceInfo: "iPhone 14 - Safari"
    └── ipAddress: "192.168.1.50"
  
  // 3. Create receiving record summary (Mobile - after completion)
  receivingRecords/{receivingId}
    ├── poId: "PO-2025-0001"
    ├── poNumber: "PO-2025-0001"
    ├── qrCodeId: qrId
    ├── supplierId: "supplier123"
    ├── supplierName: "ABC Cement Supplier"
    ├── receivedBy: inventoryManagerId
    ├── receivedDate: timestamp
    ├── receivedVia: "qr_scan" // qr_scan/manual
    ├── deviceUsed: "Mobile - Safari"
    ├── totalExpectedItems: 100
    ├── itemsInGoodCondition: 95
    ├── itemsDamaged: 3
    ├── itemsMissing: 2
    ├── qualityBreakdown: {
    │     good: 95,
    │     damaged: 3,
    │     missing: 2,
    │     expired: 0
    │   }
    ├── damageReport: [
    │     {
    │       productId: "product123",
    │       productName: "Portland Cement 50kg",
    │       damagedQuantity: 3,
    │       damageType: "Physical damage - torn bags",
    │       damageNotes: "Bags torn during transport, cement exposed",
    │       damagePhotos: [imageUrl1, imageUrl2],
    │       estimatedLoss: 600,
    │       supplierAction: "Credit note requested"
    │     }
    │   ]
    ├── missingItems: [
    │     {
    │       productId: "product123",
    │       productName: "Portland Cement 50kg",
    │       expectedQuantity: 100,
    │       receivedQuantity: 95,
    │       missingQuantity: 2,
    │       notes: "2 bags missing from delivery - supplier to credit"
    │     }
    │   ]
    ├── notes: "3 bags damaged during transport, 2 bags missing"
    ├── deliveryReceiptPhoto: imageUrl
    ├── receiverSignature: imageUrl
    ├── supplierSignature: imageUrl
    └── status: "completed"
  
  // 4. Create detailed transaction records (for GOOD CONDITION items only)
  receivingTransactions/{transactionId}
    ├── receivingId: receivingId
    ├── poId: "PO-2025-0001"
    ├── productId: "product123"
    ├── productName: "Portland Cement 50kg"
    ├── expectedQuantity: 100
    ├── receivedQuantity: 95 // Only good condition items
    ├── damagedQuantity: 3
    ├── missingQuantity: 2
    ├── qualityStatus: "good"
    ├── unitPrice: 200
    ├── totalValue: 19000 // Only for good items (95 × 200)
    ├── storageLocation: "STR A1"
    ├── shelfName: "Shelf A"
    ├── rowName: "Row 1"
    ├── columnIndex: 1
    ├── fullLocation: "STR A1 - Shelf A - Row 1 - Column 1"
    ├── expiryDate: "2026-10-01"
    ├── qualityCheck: "passed"
    ├── photos: [imageUrl1, imageUrl2]
    ├── receivedVia: "qr_scan"
    └── receivedAt: timestamp
  
  // 5. Create damage report documents (for DAMAGED items)
  damage_reports/{damageId}
    ├── receivingId: receivingId
    ├── poId: "PO-2025-0001"
    ├── productId: "product123"
    ├── productName: "Portland Cement 50kg"
    ├── damagedQuantity: 3
    ├── damageType: "Physical damage"
    ├── damageCategory: "torn_packaging"
    ├── damageDescription: "Bags torn during transport, cement exposed"
    ├── damagePhotos: [imageUrl1, imageUrl2, imageUrl3]
    ├── estimatedValue: 600
    ├── supplierResponsibility: true
    ├── actionTaken: "Credit note requested"
    ├── creditNoteNumber: "CN-2025-001"
    ├── reportedBy: inventoryManagerId
    ├── reportedAt: timestamp
    └── status: "pending_resolution" // pending_resolution/resolved/disputed
  ```

#### **Step 9: Inventory Update & System Logs (Automatic)**
- **Trigger**: When receiving is completed on mobile
- **Location**: Background automatic process
- **Process**:
  1. System processes completed receiving record from mobile
  2. **For each product in GOOD CONDITION only**:
     - Locate product in nested Products structure
     - Add received good quantity to current stock (95 units)
     - DO NOT add damaged/missing items to stock
     - Update last restock date
     - Update average cost (if applicable)
  3. **Create stock movement records**:
     - Type: "IN" (incoming)
     - From: Supplier
     - To: Storage location
     - Quantity: Only good condition items (95)
     - Reference: PO number
     - Quality status: Good
  4. **Update Purchase Order**:
     - Change status based on quality results:
       - If all items good: "completed"
       - If has damages/missing: "completed_with_issues"
     - Add receiving reference
     - Calculate fulfillment percentage
     - Note discrepancies
  5. **Update Restock Requests**:
     - Change status to "Completed"
     - Add PO and receiving references
     - Calculate resolution time
     - Note if partial fulfillment
  6. **Create System Logs** (for audit trail):
     - Log QR code generation
     - Log QR code scan event
     - Log receiving start
     - Log each product quality assessment
     - Log damaged items separately
     - Log missing items
     - Log inventory updates
     - Log receiving completion
  7. **Process Damaged/Missing Items**:
     - Create damage reports
     - Generate credit note requests
     - Notify purchasing team
     - Update supplier performance metrics
  8. **Trigger notifications**:
     - Notify Admin of completed receiving
     - Alert if damaged/missing items found
     - Send report to management
     - Email supplier for credit notes
  9. **Generate reports**:
     - Stock movement report
     - Receiving summary report
     - Damage report (if applicable)
     - Updated inventory valuation
     - Quality assessment summary

- **Firebase Collections Updated**:
  ```javascript
  // 1. Update product inventory (ONLY for GOOD CONDITION items)
  Products/{location}/shelves/{shelf}/rows/{row}/columns/{col}/items/{productId}
    ├── quantity: 140 // Was 45, added 95 (good items only, NOT 98)
    ├── lastRestockDate: timestamp
    ├── lastRestockQuantity: 95 // Only good items added
    ├── lastRestockPO: "PO-2025-0001"
    ├── lastRestockQuality: {
    │     good: 95,
    │     damaged: 3,
    │     missing: 2
    │   }
    └── lastUpdated: timestamp
  
  // 2. Create stock movement (ONLY for GOOD items)
  stock_movements/{movementId}
    ├── productId: "product123"
    ├── productName: "Portland Cement 50kg"
    ├── movementType: "IN"
    ├── fromLocation: "Supplier - ABC Cement Supplier"
    ├── toLocation: "STR A1 - Shelf A - Row 1 - Column 1"
    ├── quantity: 95 // Only good condition items
    ├── expectedQuantity: 100
    ├── qualityStatus: "good"
    ├── damagedQuantity: 3
    ├── missingQuantity: 2
    ├── reason: "Purchase Order Receiving - QR Scan"
    ├── referenceNumber: "PO-2025-0001"
    ├── receivingId: receivingId
    ├── qrCodeId: qrId
    ├── receivingMethod: "qr_scan"
    ├── movementDate: timestamp
    ├── performedBy: inventoryManagerId
    └── status: "completed"
  
  // 3. Create stock movement for DAMAGED items (tracking only, no inventory add)
  stock_movements/{movementId_damaged}
    ├── productId: "product123"
    ├── productName: "Portland Cement 50kg"
    ├── movementType: "DAMAGED_RECEIPT"
    ├── fromLocation: "Supplier - ABC Cement Supplier"
    ├── toLocation: "Quarantine/Rejected"
    ├── quantity: 3
    ├── qualityStatus: "damaged"
    ├── damageType: "Physical damage - torn bags"
    ├── reason: "Damaged on delivery - Not added to inventory"
    ├── referenceNumber: "PO-2025-0001"
    ├── damageReportId: damageId
    ├── receivingId: receivingId
    ├── movementDate: timestamp
    ├── performedBy: inventoryManagerId
    └── status: "damaged_rejected"
  
  // 4. Update Purchase Order
  purchase_orders/{poId}
    ├── status: "completed_with_issues" // Updated (has damaged/missing items)
    ├── receivingId: receivingId
    ├── receivedDate: timestamp
    ├── qualityResults: {
    │     expected: 100,
    │     goodCondition: 95,
    │     damaged: 3,
    │     missing: 2,
    │     fulfillmentRate: "95%"
    │   }
    ├── hasQualityIssues: true
    ├── damageReportIds: [damageId]
    ├── creditNotesRequested: ["CN-2025-001"]
    └── completedAt: timestamp
  
  // 5. Update Restock Request
  RestockRequests/{requestId}
    ├── Status: "Completed" // Updated
    ├── completedDate: timestamp
    ├── receivingId: receivingId
    ├── requestedQuantity: 155
    ├── receivedQuantity: 95 // Only good items
    ├── fulfilledPercentage: 61 // 95 out of 155
    ├── partialFulfillment: true
    └── resolutionTime: "5 days"
  
  // 6. Create SYSTEM LOGS (detailed audit trail)
  system_logs/{logId_1}
    ├── timestamp: timestamp
    ├── level: "INFO"
    ├── module: "Receiving Management"
    ├── action: "QR Code Generated"
    ├── message: "QR code generated for PO-2025-0001"
    ├── details: {
    │     poNumber: "PO-2025-0001",
    │     qrCodeId: qrId,
    │     generatedBy: inventoryManagerId,
    │     expiresAt: timestamp
    │   }
    ├── userId: inventoryManagerId
    └── ipAddress: "192.168.1.100"
  
  system_logs/{logId_2}
    ├── timestamp: timestamp
    ├── level: "INFO"
    ├── module: "Receiving Management"
    ├── action: "QR Code Scanned"
    ├── message: "QR code scanned for PO-2025-0001 via mobile device"
    ├── details: {
    │     poNumber: "PO-2025-0001",
    │     qrCodeId: qrId,
    │     deviceInfo: "iPhone 14 - Safari",
    │     scannedBy: userId,
    │     scanLocation: "192.168.1.50"
    │   }
    ├── userId: userId
    └── ipAddress: "192.168.1.50"
  
  system_logs/{logId_3}
    ├── timestamp: timestamp
    ├── level: "INFO"
    ├── module: "Receiving Management"
    ├── action: "Receiving Started"
    ├── message: "Started receiving process for PO-2025-0001"
    ├── details: {
    │     poNumber: "PO-2025-0001",
    │     expectedItems: 100,
    │     supplier: "ABC Cement Supplier",
    │     receivingMethod: "qr_scan"
    │   }
    ├── userId: inventoryManagerId
    └── ipAddress: "192.168.1.50"
  
  system_logs/{logId_4}
    ├── timestamp: timestamp
    ├── level: "WARNING"
    ├── module: "Quality Control"
    ├── action: "Damaged Items Detected"
    ├── message: "3 units of Portland Cement 50kg marked as damaged"
    ├── details: {
    │     productId: "product123",
    │     productName: "Portland Cement 50kg",
    │     damagedQuantity: 3,
    │     damageType: "Physical damage - torn bags",
    │     estimatedLoss: 600,
    │     damageReportId: damageId
    │   }
    ├── userId: inventoryManagerId
    └── severity: "medium"
  
  system_logs/{logId_5}
    ├── timestamp: timestamp
    ├── level: "WARNING"
    ├── module: "Quality Control"
    ├── action: "Missing Items Detected"
    ├── message: "2 units of Portland Cement 50kg reported missing from delivery"
    ├── details: {
    │     productId: "product123",
    │     productName: "Portland Cement 50kg",
    │     expectedQuantity: 100,
    │     receivedQuantity: 98,
    │     missingQuantity: 2,
    │     poNumber: "PO-2025-0001"
    │   }
    ├── userId: inventoryManagerId
    └── severity: "medium"
  
  system_logs/{logId_6}
    ├── timestamp: timestamp
    ├── level: "INFO"
    ├── module: "Inventory Management"
    ├── action: "Inventory Updated"
    ├── message: "Added 95 units of Portland Cement 50kg to inventory"
    ├── details: {
    │     productId: "product123",
    │     productName: "Portland Cement 50kg",
    │     previousQuantity: 45,
    │     addedQuantity: 95,
    │     newQuantity: 140,
    │     location: "STR A1 - Shelf A - Row 1 - Column 1",
    │     poNumber: "PO-2025-0001",
    │     qualityStatus: "good"
    │   }
    ├── userId: inventoryManagerId
    └── changeType: "stock_increase"
  
  system_logs/{logId_7}
    ├── timestamp: timestamp
    ├── level: "INFO"
    ├── module: "Receiving Management"
    ├── action: "Receiving Completed"
    ├── message: "Receiving completed for PO-2025-0001 with quality issues"
    ├── details: {
    │     poNumber: "PO-2025-0001",
    │     receivingId: receivingId,
    │     totalExpected: 100,
    │     goodCondition: 95,
    │     damaged: 3,
    │     missing: 2,
    │     fulfillmentRate: "95%",
    │     hasIssues: true,
    │     processingTime: "15 minutes"
    │   }
    ├── userId: inventoryManagerId
    └── ipAddress: "192.168.1.50"
  
  system_logs/{logId_8}
    ├── timestamp: timestamp
    ├── level: "INFO"
    ├── module: "Purchase Orders"
    ├── action: "PO Status Updated"
    ├── message: "PO-2025-0001 status changed to completed_with_issues"
    ├── details: {
    │     poNumber: "PO-2025-0001",
    │     previousStatus: "approved",
    │     newStatus: "completed_with_issues",
    │     receivingId: receivingId,
    │     qualityIssues: true,
    │     creditNoteRequested: true
    │   }
    ├── userId: "system"
    └── automatedAction: true
  
  // 7. Create audit trail entry
  audit_trail/{auditId}
    ├── action: "Inventory Updated - Purchase Order Received via QR Scan"
    ├── module: "Receiving Management"
    ├── userId: inventoryManagerId
    ├── userName: "Inventory Manager"
    ├── details: "Received 95 units (good), 3 damaged, 2 missing of Portland Cement 50kg via QR scan"
    ├── referenceId: "PO-2025-0001"
    ├── receivingMethod: "qr_scan"
    ├── deviceInfo: "Mobile - Safari"
    ├── qualitySummary: {
    │     good: 95,
    │     damaged: 3,
    │     missing: 2
    │   }
    ├── timestamp: timestamp
    └── ipAddress: "192.168.1.50"
  ```

---

## 🔄 Process Loop & Continuous Monitoring

```
┌────────────────────────────────────────────────────────────┐
│              CONTINUOUS INVENTORY MONITORING                │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Real-time       │
                  │  Dashboard       │
                  │  Updates         │
                  └──────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Stock Levels │    │ Low Stock    │    │ Pending      │
│ Per Product  │    │ Alerts       │    │ Transactions │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  System Detects  │
                  │  Low Stock       │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Auto-create     │
                  │  Restock Request │
                  └──────────────────┘
                            │
                            ▼
                  [ CYCLE REPEATS ]
```

---

## 📊 Key Metrics & Reports Generated

### **1. Sales Metrics**
- Daily/Weekly/Monthly sales totals
- Top selling products
- Sales by category
- Average transaction value
- VAT vs Non-VAT sales breakdown

### **2. Inventory Metrics**
- Current stock levels per product
- Low stock alerts count
- Stock turnover rate
- Inventory value
- Dead stock identification

### **3. Purchase Order Metrics**
- Pending POs count
- Average approval time
- Total PO value
- Supplier performance
- Fulfillment accuracy

### **4. Efficiency Metrics**
- Time from restock request to PO creation
- Time from PO approval to receiving
- Average receiving time
- Order fulfillment percentage
- Inventory accuracy rate

---

## 🔐 User Roles & Permissions

| Role | Permissions |
|------|------------|
| **POS Cashier** | Create quotations, Generate invoices, Process payments |
| **Factory Staff** | Release products, View invoices, Update release status |
| **Inventory Manager** | View all inventory, Create POs, Receive deliveries, Manage stock, View reports |
| **Admin** | Approve/Reject POs, View all reports, Manage users, System settings, Audit trails |

---

## 📱 Mobile-Optimized Features

### **Release Management Mobile View**
- ✅ Barcode scanning
- ✅ Touch-friendly product selection
- ✅ Large buttons for quick actions
- ✅ Visual stock location picker
- ✅ Signature capture
- ✅ Photo upload for documentation

### **Receiving Management QR Code System**
- ✅ **Desktop QR Generation**:
  - Generate unique QR code for each PO
  - Display QR code on screen
  - Option to print QR code
  - Auto-expiry after 24 hours
  - Secure encrypted token
  
- ✅ **Mobile Browser Receiving** (Post QR Scan):
  - Works on any mobile browser (Safari/Chrome/Firefox)
  - No app installation required
  - Responsive mobile-optimized UI
  - Auto-authentication via QR token
  - PO details auto-load
  
- ✅ **Quality Assessment Interface**:
  - **Good Condition** selection and quantity
  - **Damaged** items with photo upload
  - **Missing** items tracking
  - **Expired/Near Expiry** detection
  - Damage type categorization
  - Notes field for each status
  
- ✅ **Storage Location Selector**:
  - Visual shelf/row/column picker
  - Available space indicator
  - Quick location selection
  - Touch-friendly interface
  
- ✅ **Photo Documentation**:
  - Camera integration for damage photos
  - Multiple photo upload per item
  - Delivery receipt photo capture
  - Automatic image compression
  
- ✅ **Digital Signatures**:
  - Touch-screen signature capture
  - Receiver signature
  - Supplier representative signature
  - Signature stored with timestamp
  
- ✅ **Offline Support**:
  - Cache PO data after QR scan
  - Local storage of assessment
  - Auto-sync when connection restored
  - Conflict resolution handling

---

## 📱 QR Code Receiving Workflow (Detailed)

### **Why QR Code System?**
- **No App Required**: Works directly in mobile browser
- **Cross-Platform**: Works on iOS (Safari), Android (Chrome), any device
- **Secure**: Unique encrypted token per PO
- **Fast**: One scan to load entire PO
- **Trackable**: Complete audit trail of scan events
- **Mobile-Optimized**: Touch-friendly UI for field use

### **Step-by-Step QR Code Process**

```
┌─────────────────────────────────────────────────────────────┐
│                   QR CODE RECEIVING FLOW                     │
└─────────────────────────────────────────────────────────────┘

DESKTOP (Receiving Management Page)
  │
  ├─► 1. Select PO from approved list
  │     └─► PO-2025-0001 (ABC Cement Supplier)
  │
  ├─► 2. Click "Generate QR Code" button
  │     └─► System creates:
  │          • Unique token: abc123xyz789...
  │          • QR code image
  │          • Expiry: 24 hours
  │
  ├─► 3. QR Code displayed on screen
  │     └─► Options:
  │          • Display full screen
  │          • Print QR code
  │          • Copy QR link
  │
  ▼
  
MOBILE DEVICE (Camera/QR Scanner)
  │
  ├─► 4. Open camera or QR scanner app
  │
  ├─► 5. Scan QR code from desktop screen
  │     └─► QR contains:
  │          https://yourapp.com/receiving/scan?token=abc123xyz789
  │
  ├─► 6. Mobile browser auto-opens
  │     └─► Redirects to mobile receiving page
  │          • Safari (iOS)
  │          • Chrome (Android)
  │          • Firefox (Any)
  │
  ├─► 7. System validates QR token
  │     └─► Checks:
  │          • Token is valid
  │          • Token not expired
  │          • Token not already used
  │          • User has permission
  │
  ├─► 8. PO details auto-load
  │     └─► Shows:
  │          • Supplier: ABC Cement Supplier
  │          • PO Number: PO-2025-0001
  │          • Expected items: 100 units
  │          • Product list
  │
  ▼

MOBILE BROWSER (Quality Assessment)
  │
  ├─► 9. For EACH product, select quality:
  │     │
  │     ├─► GOOD CONDITION:
  │     │    ├─► Enter quantity: 95
  │     │    ├─► Select storage location
  │     │    │    • STR A1 → Shelf A → Row 1 → Col 1
  │     │    └─► Click "Confirm Good Items"
  │     │
  │     ├─► DAMAGED:
  │     │    ├─► Enter damaged quantity: 3
  │     │    ├─► Select damage type:
  │     │    │    • Physical damage
  │     │    │    • Water damage
  │     │    │    • Expired
  │     │    │    • Wrong product
  │     │    ├─► Add damage notes
  │     │    ├─► Upload photos (1-5 images)
  │     │    └─► Click "Report Damaged"
  │     │
  │     ├─► MISSING:
  │     │    ├─► Enter missing quantity: 2
  │     │    ├─► Add notes about shortage
  │     │    └─► Click "Report Missing"
  │     │
  │     └─► EXPIRED/NEAR EXPIRY:
  │          ├─► Enter quantity
  │          ├─► Enter expiry date
  │          ├─► Decision: Accept or Reject
  │          └─► Add notes
  │
  ├─► 10. Review receiving summary
  │      └─► Total: 100 units
  │           • Good: 95 units → ADD to inventory
  │           • Damaged: 3 units → DO NOT add
  │           • Missing: 2 units → DO NOT add
  │
  ├─► 11. Add final notes
  │      └─► "3 bags damaged, 2 missing - supplier to credit"
  │
  ├─► 12. Upload delivery receipt photo
  │      └─► Camera capture or gallery upload
  │
  ├─► 13. Digital signatures
  │      ├─► Receiver signs (touchscreen)
  │      └─► Supplier rep signs (touchscreen)
  │
  ├─► 14. Click "Complete Receiving"
  │      └─► System confirms:
  │           • All items assessed
  │           • Signatures captured
  │           • Photos uploaded
  │
  ▼

BACKEND (Automatic Processing)
  │
  ├─► 15. Create receiving record
  │      └─► receivingRecords collection
  │
  ├─► 16. Update inventory (GOOD items only)
  │      └─► Add 95 units to Products collection
  │
  ├─► 17. Create stock movements
  │      ├─► IN movement: 95 good units
  │      └─► DAMAGED movement: 3 damaged (tracking only)
  │
  ├─► 18. Create damage reports
  │      └─► damage_reports collection
  │
  ├─► 19. Update PO status
  │      └─► "completed_with_issues"
  │
  ├─► 20. Generate SYSTEM LOGS
  │      ├─► QR generated
  │      ├─► QR scanned
  │      ├─► Receiving started
  │      ├─► Damaged items detected (WARNING)
  │      ├─► Missing items detected (WARNING)
  │      ├─► Inventory updated (INFO)
  │      └─► Receiving completed (INFO)
  │
  ├─► 21. Send notifications
  │      ├─► Admin: Receiving completed
  │      ├─► Purchasing: Damage report
  │      └─► Supplier: Credit note request
  │
  └─► 22. Generate reports
       ├─► Receiving summary PDF
       ├─► Damage report PDF
       ├─► Stock movement report
       └─► Updated inventory dashboard
```

### **QR Code Security Features**

1. **Unique Token Generation**
   ```javascript
   token = encrypt({
     poId: "PO-2025-0001",
     timestamp: Date.now(),
     userId: inventoryManagerId,
     randomSalt: generateRandomString(32)
   });
   ```

2. **Token Validation**
   - Must be valid encrypted token
   - Not expired (24 hour window)
   - Not already used (one-time use)
   - User must be authenticated
   - User must have receiving permissions

3. **Audit Trail**
   - Who generated QR (user, timestamp, IP)
   - When QR was scanned (device, browser, IP)
   - What actions were taken
   - All quality assessments logged
   - Complete receiving timeline

### **Mobile UI Features**

#### **Product Quality Card (Mobile)**
```
┌───────────────────────────────────────────┐
│  Portland Cement 50kg                     │
│  Expected: 100 bags                       │
│  ─────────────────────────────────────── │
│                                           │
│  QUALITY STATUS:                          │
│  ☑ Good Condition      Qty: [95]         │
│  ☐ Damaged             Qty: [3]          │
│  ☐ Missing             Qty: [2]          │
│  ☐ Expired             Qty: [0]          │
│  ─────────────────────────────────────── │
│                                           │
│  STORAGE LOCATION:                        │
│  STR A1 > Shelf A > Row 1 > Col 1       │
│  [Select Location]                        │
│  ─────────────────────────────────────── │
│                                           │
│  [Confirm Good] [Report Issue]            │
└───────────────────────────────────────────┘
```

#### **Damage Report Form (Mobile)**
```
┌───────────────────────────────────────────┐
│  DAMAGE REPORT                            │
│  Portland Cement 50kg                     │
│  ─────────────────────────────────────── │
│                                           │
│  Damaged Quantity: [3]                    │
│                                           │
│  Damage Type:                             │
│  ● Physical damage (torn/broken)          │
│  ○ Water damage                           │
│  ○ Expired/spoiled                        │
│  ○ Wrong product                          │
│  ○ Other                                  │
│  ─────────────────────────────────────── │
│                                           │
│  Damage Description:                      │
│  [Bags torn during transport, cement     │
│   exposed and hardened]                   │
│  ─────────────────────────────────────── │
│                                           │
│  Photos (tap to add):                     │
│  [📷] [📷] [📷] [+]                      │
│  ─────────────────────────────────────── │
│                                           │
│  Estimated Loss: ₱600                     │
│  Request Credit Note: ☑ Yes  ☐ No        │
│                                           │
│  [Save Damage Report]                     │
└───────────────────────────────────────────┘
```

### **System Logs Generated**

| Log Event | Level | When | Details |
|-----------|-------|------|---------|
| **QR Generated** | INFO | Desktop - PO selected | QR code created, token encrypted, expiry set |
| **QR Scanned** | INFO | Mobile - QR scanned | Device info, browser, IP, timestamp |
| **Receiving Started** | INFO | Mobile - PO loaded | PO details, expected items, supplier |
| **Good Items Confirmed** | INFO | Mobile - Per product | Product, quantity, location selected |
| **Damaged Detected** | WARNING | Mobile - Damage reported | Product, damaged qty, damage type, photos |
| **Missing Detected** | WARNING | Mobile - Shortage noted | Product, expected vs received, notes |
| **Inventory Updated** | INFO | Backend - Auto | Product, old qty, new qty, location |
| **PO Completed** | INFO | Backend - Auto | PO status, fulfillment rate, issues flag |
| **Receiving Completed** | INFO | Mobile - Final submit | Summary, signatures, processing time |

### **Error Scenarios & Handling**

| Scenario | System Response |
|----------|----------------|
| **QR Expired** | Show error: "QR code expired, please generate new one" |
| **QR Already Used** | Show error: "QR code already used, cannot reuse" |
| **No Internet on Mobile** | Cache data locally, sync when online |
| **Photo Upload Failed** | Retry upload, or save locally and sync later |
| **All Items Damaged** | Allow completion, create full damage report |
| **Signature Capture Failed** | Allow retry, or skip and add later |
| **Browser Not Supported** | Show message, suggest Chrome/Safari |

---

## 🚨 Automatic Alerts & Notifications

### **Low Stock Alerts**
- **Trigger**: Product quantity <= minStock
- **Recipients**: Inventory Manager
- **Action**: Auto-create restock request
- **Display**: Dashboard notification badge

### **Pending Approval Alerts**
- **Trigger**: PO submitted for approval
- **Recipients**: Admin
- **Action**: Email + in-app notification
- **Display**: Admin dashboard alert

### **Delivery Expected Alerts**
- **Trigger**: Expected delivery date = today
- **Recipients**: Inventory Manager
- **Action**: Reminder notification
- **Display**: Calendar notification

### **Overdue PO Alerts**
- **Trigger**: Expected delivery date + 3 days past
- **Recipients**: Inventory Manager, Admin
- **Action**: Escalation notification
- **Display**: Red badge on PO

---

## 📈 Reporting & Analytics

### **Available Reports**
1. **Stock Movement Report**
   - All IN/OUT movements
   - Filterable by date range
   - Export to CSV/PDF

2. **Sales Report**
   - Transaction summary
   - Product-wise breakdown
   - Payment method analysis

3. **Purchase Order Report**
   - PO history
   - Approval timeline
   - Supplier performance

4. **Receiving Report**
   - Received quantities
   - Discrepancies log
   - Quality check records

5. **Inventory Valuation Report**
   - Current stock value
   - FIFO/LIFO calculations
   - Asset reporting

---

## 🔧 System Integrations

### **Email Notifications**
- PO approval/rejection to IM
- PO details to supplier
- Daily stock reports to management
- Low stock warnings

### **PDF Generation**
- Quotations
- Invoices
- Purchase Orders
- Receiving reports
- Stock movement reports

### **Barcode System**
- Product identification
- Quick scanning during release
- Receiving verification
- Inventory audit support

---

## 📝 Best Practices

### **For POS Cashiers**
1. Always verify product availability before creating invoice
2. Double-check quantities and prices
3. Print clear invoices for customers
4. Keep transaction records organized

### **For Factory Staff**
1. Verify invoice before releasing products
2. Check product condition before release
3. Ensure correct quantities
4. Get customer signature
5. Update release status immediately

### **For Inventory Managers**
1. Review restock requests daily
2. Maintain optimal stock levels
3. Build good supplier relationships
4. Process receivings promptly
5. Verify quality on every delivery
6. Keep accurate storage location records

### **For Admins**
1. Review POs within 24 hours
2. Verify budget before approving
3. Monitor inventory metrics regularly
4. Review audit trails weekly
5. Ensure system backups are running

---

## 🔄 Error Handling & Edge Cases

### **Insufficient Stock During Release**
- System prevents release if stock unavailable
- Alert shown to factory staff
- Option to create backorder
- Notify POS cashier to contact customer

### **Partial Delivery Receiving**
- System accepts partial quantities
- Automatically adjusts PO status
- Option to:
  - Mark as complete with shortage
  - Keep PO open for remaining items
  - Create new PO for shortage

### **Damaged Goods Receiving**
- Record damaged quantity separately
- Attach photos as evidence
- Create supplier credit note
- Don't add damaged items to inventory
- Notify purchasing team

### **PO Rejection**
- IM receives notification with reason
- Option to revise and resubmit
- Or cancel and create new PO
- Restock request returns to pending

### **System Downtime During Transaction**
- Offline mode for POS
- Local storage of transactions
- Auto-sync when connection restored
- Manual reconciliation if needed

---

## 📞 Support & Troubleshooting

### **Common Issues**

**Issue**: Barcode not scanning
- **Solution**: Clean camera lens, ensure good lighting, manual entry option available

**Issue**: Product not found in system
- **Solution**: Check spelling, verify product exists in inventory, contact admin to add

**Issue**: Storage location full
- **Solution**: System suggests alternative locations, option to rearrange stock

**Issue**: PO approval delayed
- **Solution**: Send reminder to admin, escalate if urgent, temp approval for emergency

---

## 📚 Related Documentation

- `STOCK_MOVEMENT_FLOW.md` - Detailed stock movement tracking
- `SUPPLIER_PRODUCTS_IMPROVEMENTS.md` - Supplier-product relationship
- `REPORTS_GUIDE.md` - Report generation guide
- `RELEASE_MOBILE_VIEW_GUIDE.md` - Mobile release process
- `REPORTS_IMPLEMENTATION_GUIDE.md` - Technical implementation

---

## 🎯 Success Metrics

### **Target KPIs**
- ✅ 99% invoice accuracy
- ✅ < 24 hours PO approval time
- ✅ < 5% stock discrepancies
- ✅ 100% traceability of stock movements
- ✅ Zero out-of-stock on critical items
- ✅ 95%+ first-time receiving accuracy

---

*Last Updated: October 7, 2025*
*Document Version: 2.0*

---

## 🔄 Version History

### **Version 2.0** (October 7, 2025)
**Major Updates - QR Code Receiving System**

#### **Changes to Step 8: Receiving Management**
- ✅ **OLD**: Manual mobile view with barcode scanning
- ✅ **NEW**: QR code-based system with browser redirect
  - Desktop generates unique QR code per PO
  - Mobile scans QR → Opens browser automatically
  - No app installation required
  - Works on any mobile browser (Safari/Chrome/Firefox)

#### **Enhanced Quality Assessment**
- ✅ Added detailed quality status selection:
  - **Good Condition** (added to inventory)
  - **Damaged** (not added, with photos and damage type)
  - **Missing** (not added, tracked for supplier credit)
  - **Expired/Near Expiry** (accept/reject decision)
- ✅ Each status has its own workflow and documentation
- ✅ Photo upload for damaged items (up to 5 photos per item)
- ✅ Damage type categorization

#### **Changes to Step 9: Inventory Update**
- ✅ **OLD**: All received items added to inventory
- ✅ **NEW**: Only GOOD condition items added to inventory
  - Damaged items tracked but not added
  - Missing items logged separately
  - Damage reports created automatically
  - Credit notes requested from supplier

#### **System Logs Implementation**
- ✅ Added 8 comprehensive system log entries:
  1. QR Code Generated (INFO)
  2. QR Code Scanned (INFO)
  3. Receiving Started (INFO)
  4. Damaged Items Detected (WARNING)
  5. Missing Items Detected (WARNING)
  6. Inventory Updated (INFO)
  7. Receiving Completed (INFO)
  8. PO Status Updated (INFO)
- ✅ Complete audit trail from QR generation to completion
- ✅ Device info, browser type, IP address tracking
- ✅ Quality assessment results logged

#### **New Firebase Collections**
- ✅ `qr_codes` - QR code generation and scan tracking
- ✅ `damage_reports` - Detailed damage documentation
- ✅ `system_logs` - Comprehensive system activity logs
- ✅ Enhanced `receivingRecords` with quality breakdown
- ✅ Enhanced `stock_movements` with quality status

#### **Security Enhancements**
- ✅ Encrypted QR tokens
- ✅ One-time use QR codes
- ✅ 24-hour expiry on QR codes
- ✅ Token validation on scan
- ✅ Complete scan event logging

#### **Mobile Experience Improvements**
- ✅ Browser-based (no app needed)
- ✅ Touch-optimized UI for quality assessment
- ✅ Camera integration for damage photos
- ✅ Signature capture on touchscreen
- ✅ Offline mode with local caching
- ✅ Auto-sync when connection restored

### **Version 1.0** (Initial Release)
- Basic process flow documentation
- 9-step workflow from quotation to inventory
- Manual receiving process
- Standard reporting

---

## 📊 Key Benefits of QR Code System

| Feature | Benefit |
|---------|---------|
| **No App Required** | Works on any device with camera and browser |
| **Fast Setup** | One QR scan loads entire PO |
| **Quality Control** | Separate good/damaged/missing tracking |
| **Accurate Inventory** | Only good items added to stock |
| **Supplier Accountability** | Automatic damage reports and credit requests |
| **Complete Audit Trail** | Every action logged with timestamps |
| **Mobile-First** | Optimized for field receiving operations |
| **Security** | Encrypted tokens, one-time use, auto-expiry |
| **Offline Support** | Cache data locally, sync when online |
| **Photo Documentation** | Visual proof of damages |

---

*Last Updated: October 7, 2025*
*Document Version: 2.0*
