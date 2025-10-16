# POS Multi-Location Allocation System

## Overview
The POS system now supports automatic multi-location allocation for products stored across multiple warehouse cells. This allows efficient order fulfillment when a single location doesn't have enough stock.

## How It Works

### Scenario Example
**Order:** 50 pieces of plywood (10 x 20)  
**Cell Capacity:** 24 pieces per cell  
**Solution:** System auto-allocates from 3 cells:
- Cell 1: 24 pieces (full cell)
- Cell 2: 24 pieces (full cell)  
- Cell 3: 2 pieces (remaining)

Total: 48 + 2 = 50 pieces ✅

---

## User Flow

### 1. **Quick Select - Single Location** (When one location has enough stock)
   - User clicks plus button on product
   - Modal shows locations with sufficient stock highlighted in green
   - Click location → Product added to cart immediately
   - ✅ **Fast path for simple orders**

### 2. **Visual Map - Multiple Locations** (When need to combine stock)
   - User clicks plus button on product
   - Modal shows "Visual Map" option for each storage unit
   - Click storage unit → ShelfViewModal opens with warehouse layout
   - **Auto-Allocation:**
     - Click empty cells where product exists
     - System automatically calculates quantity based on cell capacity
     - First cells filled to capacity (e.g., 24 pcs)
     - Last cell gets remaining quantity (e.g., 2 pcs)
   - Visual indicators show:
     - Total Quantity Needed
     - Allocated Quantity
     - Remaining Quantity
   - Click "Confirm Selection" → All allocations added to cart
   - ✅ **Intelligent path for complex orders**

---

## Features

### Visual Warehouse Map
- **Interactive Layout:** Click cells to select locations
- **Color Coding:**
  - 🟦 Blue = Selected cell with allocated quantity
  - 🟢 Green = Product exists at this location (highlighted)
  - ⚪ White = Empty cell available for selection
  - 🔴 Red = Occupied by other products
- **Smart Selection:**
  - Click selected cell again to deselect
  - Auto-calculates quantity per cell based on capacity
  - Prevents over-allocation

### Auto-Allocation Logic
```javascript
// Example: Order 50 pcs, Cell capacity 24 pcs
Click Cell 1 → Allocates 24 pcs (min(remaining=50, capacity=24))
Click Cell 2 → Allocates 24 pcs (min(remaining=26, capacity=24))
Click Cell 3 → Allocates 2 pcs  (min(remaining=2, capacity=24))
Total = 50 pcs ✅
```

### Cart Items
Each allocation creates a separate cart item:
```json
{
  "name": "plywood (10 x 20)",
  "qty": 24,
  "storageLocation": "Unit 02",
  "shelfName": "Lumber & Wood Products",
  "rowName": "Row 1",
  "columnIndex": 1,
  "fullLocation": "Unit 02 - Lumber & Wood Products - Row 1 - Column 1",
  "isMultiLocationAllocation": true
}
```

---

## Benefits

### For Users
1. **Faster Order Processing:** Visual map makes it easy to find and select multiple locations
2. **Accurate Allocation:** Auto-calculation prevents errors
3. **Clear Overview:** See exactly where stock is being pulled from
4. **Flexible:** Can use quick select OR visual map based on preference

### For Inventory Management
1. **Precise Tracking:** Each cart item has exact location details
2. **Release Management:** Knows exactly which cells to pull from
3. **Stock Deduction:** Deducts from correct locations during release
4. **Audit Trail:** Full visibility of multi-location orders

### For Business
1. **Maximize Stock Utilization:** Use products from multiple locations efficiently
2. **Reduce Stockouts:** Combine partial stocks to fulfill orders
3. **Better Space Management:** Know which cells are being used
4. **Improved Accuracy:** Visual confirmation reduces picking errors

---

## Technical Implementation

### Components Modified
1. **LocationSelectionModal.jsx**
   - Added ShelfViewModal integration
   - Added multi-select capability
   - Added auto-allocation logic
   - Added visual indicators for allocated quantities

2. **Pos_NewSale.jsx**
   - Updated `handleSelectLocation` to handle both single and array of locations
   - Added `isMultiLocationAllocation` flag to cart items
   - Maintains location tracking for each allocation

3. **ShelfViewModal.jsx** (Reused from Inventory)
   - Multi-select mode enabled
   - Auto-allocation based on cell capacity
   - Visual highlighting of selected cells
   - Real-time quantity tracking

### Data Flow
```
1. User clicks product (+) button
   ↓
2. Multiple locations detected
   ↓
3. LocationSelectionModal shows options:
   - Quick Select (single location)
   - Visual Map (multiple locations)
   ↓
4. User clicks "Visual Map" for a unit
   ↓
5. ShelfViewModal opens with:
   - multiSelect = true
   - totalQuantity = order quantity
   - highlightedProduct = product locations
   ↓
6. User clicks cells → Auto-allocates quantities
   ↓
7. User clicks "Confirm Selection"
   ↓
8. Array of allocations returned to parent
   ↓
9. Each allocation added as separate cart item
   ↓
10. Cart displays all items with location details
```

---

## Cell Capacity Configuration

Cell capacities are defined in `StorageUnitsConfig.js`:

```javascript
{
  name: "Lumber & Wood Products",
  rows: [
    { name: "Row 1", capacity: 24, columns: 4 },  // 12 pcs per cell
    { name: "Row 2", capacity: 24, columns: 4 },
    // ...
  ]
}
```

The `capacity` value represents **maximum pieces per cell**, which the system uses for auto-allocation.

---

## Future Enhancements

1. **Suggested Allocation:** AI-powered recommendation for optimal cell selection
2. **Distance Optimization:** Suggest closest cells to dispatch area
3. **FIFO Logic:** Auto-select oldest stock first
4. **Batch Selection:** Select entire rows/shelves at once
5. **Mobile Optimization:** Touch-friendly cell selection on tablets

---

## Usage Examples

### Example 1: Small Order (Single Location Sufficient)
- Order: 15 pcs plywood
- Available: Cell A1 has 24 pcs
- Action: Click Cell A1 in Quick Select → Done
- Result: 1 cart item from Cell A1

### Example 2: Medium Order (Multiple Cells Needed)
- Order: 50 pcs plywood  
- Available: Cell A1 (24 pcs), Cell A2 (24 pcs), Cell A3 (10 pcs)
- Action: Open Visual Map → Click A1, A2, A3 → Confirm
- Result: 3 cart items:
  - A1: 24 pcs
  - A2: 24 pcs  
  - A3: 2 pcs (only 2 needed)

### Example 3: Large Order (Spanning Shelves)
- Order: 100 pcs plywood
- Available across 5 cells in different rows
- Action: Open Visual Map → Click 5 cells → Confirm  
- Result: 5 cart items with precise allocations

---

## Best Practices

1. **Always use Visual Map for orders > 50 pcs**
2. **Select cells from left to right, top to bottom** for organized picking
3. **Verify total allocated = quantity needed** before confirming
4. **Check cell capacities** to understand allocation limits
5. **Use single location when possible** for faster processing

---

## Troubleshooting

**Q: Why can't I select a cell with the product highlighted?**  
A: The cell already has a different product or is occupied. Only empty cells can be selected for allocation.

**Q: Total allocated doesn't match my order quantity**  
A: Keep clicking cells until the allocated quantity equals your order. The confirm button is disabled until they match.

**Q: Can I change allocation after confirming?**  
A: Yes, remove items from cart and start over. Each cart item represents one cell allocation.

**Q: What if I need more than cell capacity allows?**  
A: Select multiple cells. The system will automatically distribute the quantity across them.

---

## Related Documentation
- [POS Location Selection Flow](./POS_LOCATION_SELECTION_FLOW.md)
- [Storage Units Configuration](./src/features/inventory/config/StorageUnitsConfig.js)
- [Shelf View Modal Guide](./STORAGE_FACILITY_LAYOUT.md)
