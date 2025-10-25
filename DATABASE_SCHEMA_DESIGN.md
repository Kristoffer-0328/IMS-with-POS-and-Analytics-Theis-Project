# Database Schema Design - IMS with POS and Analytics

## Overview
This document outlines the complete database schema for the Inventory Management System (IMS) with Point of Sale (POS) and Analytics capabilities. The system uses Firebase Firestore as the primary database with a document-based NoSQL structure.

## Core Collections

### 1. Products Collection
**Collection Path:** `/products`

#### Document Structure
```json
{
  "id": "string", // Unique product identifier
  "productName": "string", // Product display name
  "category": "string", // Product category (e.g., "Hardware", "Tools", "Materials")
  "description": "string", // Optional product description
  "unit": "string", // Unit of measurement (e.g., "pcs", "kg", "meters")
  "price": "number", // Selling price per unit
  "cost": "number", // Cost price per unit
  "sku": "string", // Stock Keeping Unit
  "barcode": "string", // Product barcode (optional)
  "supplierId": "string", // Reference to supplier document
  "minStock": "number", // Minimum stock level for alerts
  "maxStock": "number", // Maximum stock level
  "location": "string", // Storage location identifier
  "isActive": "boolean", // Product status
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "createdBy": "string", // User ID who created the product
  "tags": ["string"], // Array of tags for categorization
  "images": ["string"], // Array of image URLs
  "specifications": {
    "weight": "number",
    "dimensions": {
      "length": "number",
      "width": "number",
      "height": "number",
      "unit": "string"
    }
  }
}
```

#### Indexes Required
- `category` (ascending)
- `supplierId` (ascending)
- `isActive` (ascending)
- `createdAt` (descending)
- Composite: `category + isActive`

---

### 2. Inventory Snapshots Collection
**Collection Path:** `/inventory_snapshots`

#### Document Structure
```json
{
  "id": "string", // Auto-generated document ID
  "productId": "string", // Reference to products collection
  "productName": "string", // Cached product name
  "category": "string", // Cached product category
  "location": "string", // Storage facility location
  "storageFacility": "string", // Storage facility identifier
  "quantity": "number", // Current stock quantity
  "unitCost": "number", // Cost per unit at time of snapshot
  "totalValue": "number", // quantity * unitCost
  "snapshotDate": "timestamp", // Date of inventory count
  "snapshotType": "string", // "daily", "weekly", "monthly", "manual"
  "recordedBy": "string", // User ID who recorded the snapshot
  "notes": "string", // Optional notes
  "batchNumber": "string", // For batch tracking (optional)
  "expiryDate": "timestamp", // For perishable items (optional)
  "qualityStatus": "string", // "good", "damaged", "expired"
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Indexes Required
- `productId` (ascending)
- `snapshotDate` (descending)
- `location` (ascending)
- `category` (ascending)
- Composite: `productId + snapshotDate`
- Composite: `location + snapshotDate`

---

### 3. Sales Aggregates Collection
**Collection Path:** `/sales_aggregates`

#### Document Structure
```json
{
  "id": "string", // Auto-generated document ID
  "productId": "string", // Reference to products collection
  "productName": "string", // Cached product name
  "category": "string", // Cached product category
  "period": "string", // Aggregation period (e.g., "2024-01", "2024-W01")
  "periodType": "string", // "daily", "weekly", "monthly", "yearly"
  "startDate": "timestamp", // Start of aggregation period
  "endDate": "timestamp", // End of aggregation period
  "totalQuantity": "number", // Total units sold
  "totalSales": "number", // Total sales amount (₱)
  "totalCost": "number", // Total cost of goods sold
  "grossProfit": "number", // totalSales - totalCost
  "profitMargin": "number", // (grossProfit / totalSales) * 100
  "averagePrice": "number", // totalSales / totalQuantity
  "transactionCount": "number", // Number of transactions
  "customerCount": "number", // Number of unique customers (if tracked)
  "location": "string", // POS location identifier
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Indexes Required
- `productId` (ascending)
- `period` (ascending)
- `periodType` (ascending)
- `startDate` (ascending)
- `endDate` (ascending)
- `location` (ascending)
- Composite: `productId + period`
- Composite: `periodType + period`

---

### 4. Transactions Collection
**Collection Path:** `/transactions`

#### Document Structure
```json
{
  "id": "string", // Transaction ID
  "transactionNumber": "string", // Human-readable transaction number
  "transactionType": "string", // "sale", "return", "exchange"
  "status": "string", // "completed", "pending", "cancelled", "refunded"
  "customerId": "string", // Reference to customers collection (optional)
  "customerName": "string", // Customer name (if not registered)
  "location": "string", // POS location identifier
  "cashierId": "string", // User ID of cashier
  "cashierName": "string", // Cached cashier name
  "totalAmount": "number", // Total transaction amount
  "taxAmount": "number", // Tax amount
  "discountAmount": "number", // Total discount applied
  "paymentMethod": "string", // "cash", "card", "digital_wallet", "mixed"
  "paymentDetails": {
    "cashReceived": "number",
    "changeGiven": "number",
    "cardLastFour": "string",
    "referenceNumber": "string"
  },
  "items": [
    {
      "productId": "string",
      "productName": "string",
      "quantity": "number",
      "unitPrice": "number",
      "discount": "number",
      "totalPrice": "number",
      "category": "string"
    }
  ],
  "transactionDate": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "notes": "string"
}
```

#### Subcollections
- **`/transactions/{transactionId}/refunds`** - Refund records
- **`/transactions/{transactionId}/payments`** - Payment breakdown for mixed payments

#### Indexes Required
- `transactionDate` (descending)
- `status` (ascending)
- `location` (ascending)
- `cashierId` (ascending)
- `customerId` (ascending)
- Composite: `location + transactionDate`
- Composite: `status + transactionDate`

---

### 5. Purchase Orders Collection
**Collection Path:** `/purchase_orders`

#### Document Structure
```json
{
  "id": "string", // Purchase order ID
  "orderNumber": "string", // Human-readable PO number
  "supplierId": "string", // Reference to suppliers collection
  "supplierName": "string", // Cached supplier name
  "status": "string", // "draft", "pending", "approved", "ordered", "received", "cancelled"
  "orderDate": "timestamp",
  "expectedDeliveryDate": "timestamp",
  "actualDeliveryDate": "timestamp",
  "totalAmount": "number", // Total order value
  "taxAmount": "number",
  "shippingAmount": "number",
  "discountAmount": "number",
  "currency": "string", // Default: "PHP"
  "paymentTerms": "string", // "net_30", "net_60", "cod", etc.
  "paymentStatus": "string", // "unpaid", "partial", "paid"
  "createdBy": "string", // User ID who created the PO
  "approvedBy": "string", // User ID who approved the PO
  "receivedBy": "string", // User ID who received the goods
  "items": [
    {
      "productId": "string",
      "productName": "string",
      "quantity": "number",
      "unitPrice": "number",
      "totalPrice": "number",
      "receivedQuantity": "number",
      "notes": "string"
    }
  ],
  "notes": "string",
  "attachments": ["string"], // Array of file URLs
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Indexes Required
- `supplierId` (ascending)
- `status` (ascending)
- `orderDate` (descending)
- `expectedDeliveryDate` (ascending)
- `createdBy` (ascending)
- Composite: `status + orderDate`

---

### 6. Suppliers Collection
**Collection Path:** `/suppliers`

#### Document Structure
```json
{
  "id": "string", // Supplier ID
  "supplierName": "string", // Company/business name
  "contactPerson": "string", // Primary contact person
  "email": "string",
  "phone": "string",
  "mobile": "string",
  "address": {
    "street": "string",
    "city": "string",
    "province": "string",
    "postalCode": "string",
    "country": "string"
  },
  "taxId": "string", // TIN or tax identification number
  "paymentTerms": "string", // Default payment terms
  "creditLimit": "number",
  "leadTime": "number", // Average delivery time in days
  "rating": "number", // Supplier performance rating (1-5)
  "categories": ["string"], // Product categories supplied
  "isActive": "boolean",
  "notes": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "createdBy": "string"
}
```

#### Indexes Required
- `supplierName` (ascending)
- `isActive` (ascending)
- `createdAt` (descending)

---

### 7. Storage Facilities Collection
**Collection Path:** `/storage_facilities`

#### Document Structure
```json
{
  "id": "string", // Storage facility ID
  "facilityName": "string", // Display name
  "facilityType": "string", // "warehouse", "store", "showroom"
  "location": "string", // Physical address/location identifier
  "address": {
    "street": "string",
    "city": "string",
    "province": "string",
    "postalCode": "string"
  },
  "managerId": "string", // User ID of facility manager
  "managerName": "string", // Cached manager name
  "capacity": "number", // Total capacity in square meters
  "usedCapacity": "number", // Currently used capacity
  "zones": [
    {
      "zoneId": "string",
      "zoneName": "string",
      "category": "string", // Product category stored here
      "capacity": "number",
      "usedCapacity": "number",
      "temperature": "string", // "ambient", "cool", "frozen"
      "securityLevel": "string" // "low", "medium", "high"
    }
  ],
  "isActive": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Indexes Required
- `facilityType` (ascending)
- `location` (ascending)
- `isActive` (ascending)
- `managerId` (ascending)

---

### 8. Users Collection
**Collection Path:** `/users`

#### Document Structure
```json
{
  "id": "string", // Firebase Auth UID
  "email": "string",
  "displayName": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "role": "string", // "admin", "manager", "cashier", "warehouse_staff"
  "permissions": {
    "canCreateProducts": "boolean",
    "canEditProducts": "boolean",
    "canDeleteProducts": "boolean",
    "canViewReports": "boolean",
    "canManageUsers": "boolean",
    "canProcessOrders": "boolean",
    "canManageInventory": "boolean",
    "locations": ["string"] // Array of accessible location IDs
  },
  "assignedLocations": ["string"], // Location IDs user can access
  "isActive": "boolean",
  "lastLogin": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "createdBy": "string"
}
```

#### Indexes Required
- `role` (ascending)
- `isActive` (ascending)
- `lastLogin` (descending)
- `email` (ascending)

---

### 9. Audit Logs Collection
**Collection Path:** `/audit_logs`

#### Document Structure
```json
{
  "id": "string", // Auto-generated
  "userId": "string", // User who performed the action
  "userName": "string", // Cached user name
  "action": "string", // "create", "update", "delete", "login", "logout"
  "resourceType": "string", // "product", "transaction", "inventory", "user"
  "resourceId": "string", // ID of affected resource
  "resourceName": "string", // Cached resource name
  "oldValues": "object", // Previous values (for updates)
  "newValues": "object", // New values (for creates/updates)
  "ipAddress": "string",
  "userAgent": "string",
  "location": "string", // POS/facility location
  "timestamp": "timestamp",
  "notes": "string"
}
```

#### Indexes Required
- `userId` (ascending)
- `timestamp` (descending)
- `action` (ascending)
- `resourceType` (ascending)
- Composite: `resourceType + timestamp`
- Composite: `userId + timestamp`

---

### 10. System Settings Collection
**Collection Path:** `/system_settings`

#### Document Structure
```json
{
  "id": "string", // Setting key
  "category": "string", // "general", "tax", "inventory", "reports"
  "settingName": "string",
  "settingValue": "any", // Can be string, number, boolean, or object
  "description": "string",
  "isSystemSetting": "boolean", // True for system-wide settings
  "isEditable": "boolean", // Whether users can modify this setting
  "validationRules": {
    "type": "string", // "string", "number", "boolean", "email"
    "min": "number",
    "max": "number",
    "pattern": "string",
    "options": ["string"] // For dropdown selections
  },
  "updatedBy": "string",
  "updatedAt": "timestamp",
  "createdAt": "timestamp"
}
```

#### Indexes Required
- `category` (ascending)
- `isSystemSetting` (ascending)
- `updatedAt` (descending)

---

## Data Relationships

### Core Relationships
1. **Products → Suppliers**: Many-to-One
2. **Products → Storage Facilities**: Many-to-One (via location)
3. **Inventory Snapshots → Products**: Many-to-One
4. **Sales Aggregates → Products**: Many-to-One
5. **Transactions → Products**: Many-to-Many (via items array)
6. **Transactions → Users**: Many-to-One (cashier)
7. **Purchase Orders → Suppliers**: Many-to-One
8. **Purchase Orders → Products**: Many-to-Many (via items array)
9. **Users → Storage Facilities**: Many-to-Many (via assignedLocations)

### Analytics Relationships
- **Inventory Turnover** = Sales Aggregates ÷ Average Inventory (from snapshots)
- **Profit Margins** = (Sales - COGS) ÷ Sales
- **Stock Levels** = Current inventory vs. min/max thresholds

---

## Data Flow Patterns

### Inventory Management Flow
1. **Product Creation** → Products collection
2. **Stock Receipt** → Inventory snapshots + Purchase orders update
3. **Sales Transaction** → Transactions + Sales aggregates update
4. **Stock Movement** → Inventory snapshots update
5. **Reporting** → Query snapshots + aggregates for analytics

### Analytics Data Flow
1. **Daily Aggregation** → Sales aggregates (daily totals)
2. **Weekly Aggregation** → Sales aggregates (weekly summaries)
3. **Monthly Aggregation** → Sales aggregates (monthly reports)
4. **Inventory Snapshots** → Daily/weekly inventory counts
5. **Reports Generation** → Combine aggregates + snapshots

---

## Security Rules Considerations

### Collection-Level Security
- **Products**: Read for authenticated users, Write for managers/admins
- **Transactions**: Read for authenticated users, Write for cashiers/managers
- **Inventory**: Read for warehouse staff/managers, Write for authorized personnel
- **Users**: Read own profile, Write for admins only
- **Audit Logs**: Read for admins only, Write by system

### Field-Level Security
- Sensitive financial data (costs, margins) restricted to managers
- PII (customer data) encrypted and access-controlled
- System settings restricted to admins

---

## Performance Optimization

### Query Patterns
1. **Dashboard Metrics**: Pre-aggregated data in dedicated collections
2. **Product Search**: Indexed on name, category, SKU
3. **Inventory Reports**: Composite indexes on location + date
4. **Sales Analytics**: Time-range queries with date indexes

### Data Archiving Strategy
- **Transaction History**: Archive after 2 years to cold storage
- **Audit Logs**: Archive after 1 year
- **Inventory Snapshots**: Keep last 2 years, archive older data

---

## Backup and Recovery

### Backup Strategy
- **Daily Backups**: Full database backup
- **Real-time Replication**: Critical collections replicated
- **Point-in-Time Recovery**: Enabled for disaster recovery

### Data Retention Policies
- **Transactions**: 7 years (tax compliance)
- **Audit Logs**: 3 years
- **Analytics Data**: 5 years
- **System Logs**: 1 year

---

## Migration Considerations

### Version Compatibility
- Schema versioning in document metadata
- Backward compatibility for read operations
- Migration scripts for schema updates

### Data Validation
- Client-side validation before writes
- Server-side validation rules
- Data integrity checks during migrations

---

*This schema design supports the complete IMS functionality including inventory management, POS operations, analytics, and reporting. All collections are designed for optimal query performance and scalability.*</content>
<parameter name="filePath">c:\Users\John Kristoffer\Desktop\Repository\IMS-with-POS-and-Analytics-Theis-Project\DATABASE_SCHEMA_DESIGN.md