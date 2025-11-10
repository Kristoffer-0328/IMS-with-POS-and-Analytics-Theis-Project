# Purchase Order Creation Flow - Product-First Approach

## Overview
Refactored the Purchase Order creation process to prioritize **product selection first**, then **supplier comparison**, providing users with better visibility into pricing options across multiple suppliers.

## Previous Flow (Supplier-First)
1. **Step 1:** Select a supplier
2. **Step 2:** Choose products from that supplier
3. Issue: Users couldn't compare prices across suppliers for the same product

## New Flow (Product-First)
1. **Step 1: Product Selection** - Browse all products that need restocking
2. **Step 2: Supplier Selection** - Compare available suppliers and their prices for the selected product
3. **Step 3: Order Details** - Finalize quantities, delivery dates, and complete the purchase order

## Key Changes

### 1. State Management Updates
```javascript
// Old state
const [selectedSupplier, setSelectedSupplier] = useState(null);
const [suppliersWithRestockNeeds, setSuppliersWithRestockNeeds] = useState([]);
const [currentStep, setCurrentStep] = useState('supplier-selection');

// New state
const [productsNeedingRestock, setProductsNeedingRestock] = useState([]);
const [selectedProduct, setSelectedProduct] = useState(null);
const [selectedSupplierForProduct, setSelectedSupplierForProduct] = useState(null);
const [currentStep, setCurrentStep] = useState('product-selection');
```

### 2. Data Processing Functions

#### `findProductsNeedingRestock()`
- Identifies products below restock levels or with pending restock requests
- Maps all available suppliers for each product
- Returns enriched product data with supplier options

#### `findSuppliersForVariant()`
- Extracts supplier information from variant data
- Handles multiple supplier formats (string, object, array)
- Returns supplier list with pricing for each product

### 3. New UI Components

#### **Step 1: Product Selection Screen**
- Grid view of all products needing restock
- Shows:
  - Product name and size
  - Current stock vs restock level
  - Suggested quantity
  - Number of available suppliers
  - Status badge (Pending Request / Below Level)
- Search functionality to filter products
- Click product card to view suppliers

#### **Step 2: Supplier Selection Screen**
- Shows selected product details at top
- Displays all available suppliers in a grid
- For each supplier shows:
  - Supplier name and code
  - **Unit price** (key feature for comparison)
  - **Total price for suggested quantity**
  - Contact information
- Visual price comparison makes decision-making easier

#### **Step 3: Order Details Screen**
- Shows selected product and supplier in header
- Pre-fills first item with:
  - Selected product
  - Suggested quantity
  - Supplier's unit price
- Allows adding more products from the same supplier
- Standard PO fields: delivery date, payment terms, notes

## Benefits

### 1. **Better Price Comparison**
Users can now see prices from multiple suppliers side-by-side before making a decision, ensuring they get the best deal.

### 2. **Product-Centric View**
Focuses on what needs to be restocked, rather than which supplier to use, aligning better with inventory management workflows.

### 3. **Informed Decision Making**
- See how many suppliers offer each product
- Compare unit prices and total costs
- View supplier contact info for quick reference

### 4. **Flexible Multi-Supplier Support**
The system handles products with:
- Single supplier
- Multiple suppliers
- Different prices per supplier

### 5. **Maintains Restock Request Integration**
- Products with pending restock requests are highlighted
- Suggested quantities are automatically calculated
- Restock requests are marked as "processed" when PO is created

## Technical Implementation

### Supplier Data Structure
```javascript
{
  id: 'SUPPLIER_CODE',
  primaryCode: 'SUPPLIER_CODE',
  code: 'ALTERNATIVE_CODE',
  name: 'Supplier Name',
  unitPrice: 150.00,  // Price for this specific product
  contactInfo: 'email@supplier.com'
}
```

### Product Data Structure
```javascript
{
  id: 'VARIANT_ID',
  name: 'Product Name',
  size: '50',
  unit: 'kg',
  currentQuantity: 10,
  restockLevel: 50,
  suggestedQuantity: 45,
  suppliers: [/* Array of supplier objects with prices */],
  restockRequest: {/* Optional pending request */},
  needsRestocking: true
}
```

## Navigation Flow

```
Product Selection
      ↓
   (Click Product)
      ↓
Supplier Selection ←→ (Back Button)
      ↓
  (Choose Supplier)
      ↓
Order Details ←→ (Change Supplier Button)
      ↓
  (Submit PO)
```

## Features Preserved
- ✅ Restock request tracking
- ✅ Auto-population of suggested quantities
- ✅ Multi-item purchase orders
- ✅ Delivery date selection
- ✅ Payment terms and notes
- ✅ Real-time total calculation
- ✅ Notification generation
- ✅ Request status updates

## User Experience Improvements

1. **Visual Clarity**: Color-coded badges and cards make status instantly recognizable
2. **Information Density**: All relevant data visible without scrolling
3. **Progressive Disclosure**: Information revealed step-by-step as decisions are made
4. **Undo-Friendly**: Back buttons at each step allow reconsidering choices
5. **Search & Filter**: Quick product lookup in large inventories

## Future Enhancements (Suggestions)
- Add supplier rating/performance metrics
- Show historical pricing trends
- Bulk selection of multiple products before choosing suppliers
- Save supplier preferences per product
- Quick reorder from previous POs
- Compare lead times between suppliers

## Testing Checklist
- [ ] Products with single supplier display correctly
- [ ] Products with multiple suppliers show all options
- [ ] Price calculations are accurate
- [ ] Back navigation preserves data correctly
- [ ] Restock requests update status after PO creation
- [ ] Search functionality works across all product fields
- [ ] Empty states display when no products need restocking
- [ ] Form validation prevents incomplete submissions

---

**Date:** November 10, 2025  
**Component:** `CreatePOModal.jsx`  
**Impact:** Major UX improvement for purchase order creation workflow
