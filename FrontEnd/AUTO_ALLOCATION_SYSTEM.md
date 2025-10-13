# Auto-Allocation System for Storage Locations

## Overview
The new auto-allocation system eliminates the need for manual quantity input when assigning storage locations. It automatically calculates and distributes products across multiple cells based on capacity constraints.

## How It Works

### 1. **Automatic Quantity Calculation**
When you click on an empty cell, the system automatically:
- Calculates remaining quantity: `Total Quantity - Already Allocated`
- Determines cell capacity from the row configuration (e.g., 24 pcs, 44 pcs, 120 pcs)
- Allocates the **minimum** of:
  - Remaining quantity
  - Cell capacity

### 2. **Smart Distribution Example**
**Scenario:** You have 100 pcs to store, and each cell can hold 24 pcs

**Old System (Manual):**
1. Click Cell 1 → Type "24" → Confirm
2. Click Cell 2 → Type "24" → Confirm  
3. Click Cell 3 → Type "24" → Confirm
4. Click Cell 4 → Type "24" → Confirm
5. Click Cell 5 → Type "4" → Confirm
Total: **5 clicks + 5 manual inputs = 10 actions**

**New System (Auto):**
1. Click Cell 1 → Auto fills 24 pcs (76 remaining)
2. Click Cell 2 → Auto fills 24 pcs (52 remaining)
3. Click Cell 3 → Auto fills 24 pcs (28 remaining)
4. Click Cell 4 → Auto fills 24 pcs (4 remaining)
5. Click Cell 5 → Auto fills 4 pcs (0 remaining)
Total: **5 clicks = 5 actions** ✅

## Visual Feedback

### Real-time Progress Tracker
The modal displays a prominent progress bar showing:
```
┌─────────────────────────────────────────────┐
│  Total Quantity: 100                        │
│  Allocated: 76                              │
│  Remaining: 24                              │
└─────────────────────────────────────────────┘
```

### Cell Tooltips
When hovering over empty cells:
- **Before allocation:** `Click to auto-allocate 24 pcs (Max: 24)`
- **After full allocation:** `All products allocated - No remaining quantity`

### Cell States
- 🟢 **Empty & Available:** White background, clickable
- 🔵 **Selected:** Blue background with checkmark
- 🟢 **Occupied:** Green background (already has product)
- ⚪ **No Remaining:** Disabled when all products are allocated

## Features

### 1. **Capacity-Aware Allocation**
Different rows have different capacities:
- **Unit 01 - Round Tubes:** 44 pcs per cell
- **Unit 01 - Square Bars:** 22 pcs per cell
- **Unit 07 - Safety Equipment:** 24 pcs per cell
- **Unit 02 - Zones:** 120 sheets per zone

The system automatically uses the correct capacity for each row.

### 2. **Prevent Over-Allocation**
- Cannot allocate more than cell capacity
- Cannot allocate more than remaining quantity
- Automatically stops when all products are distributed

### 3. **Remove Allocations**
Click on a selected (blue) cell to remove that allocation and return the quantity to the remaining pool.

### 4. **Multi-Location Support**
Products can be distributed across multiple cells:
- Each cell tracks its own quantity
- Total across all cells equals product quantity
- Each location is stored separately in Firebase

## Technical Implementation

### Key Changes in `ShelfViewModal.jsx`

1. **Removed Manual Input Modal**
   - Deleted `QuantityInputModal` component
   - Removed `showQuantityModal` state
   - Removed `selectedCell` state

2. **Added Auto-Allocation Logic**
   ```javascript
   const handleCellClick = (shelfName, rowName, columnIndex, rowCapacity) => {
     const remainingQty = getRemainingQuantity();
     const quantityToAllocate = Math.min(remainingQty, rowCapacity);
     onLocationSelect(shelfName, rowName, columnIndex, quantityToAllocate);
   };
   ```

3. **Real-time Progress Display**
   ```javascript
   const getRemainingQuantity = () => {
     return totalQuantity - allocatedQuantity;
   };
   ```

## Usage in Forms

### NewProductForm.jsx
When adding a new product:
1. Enter product details (name, quantity, price, etc.)
2. Click "Select Storage Location"
3. Click empty cells to auto-allocate
4. Watch the remaining quantity decrease
5. Continue until all products are allocated
6. Submit the form

### NewVariantForm.jsx
Same workflow as NewProductForm for variant products.

## Benefits

✅ **Efficiency:** 50% fewer actions (no manual typing)
✅ **Speed:** Instant allocation with single click
✅ **Accuracy:** No typos or calculation errors
✅ **Visual:** Clear progress tracking
✅ **Smart:** Respects capacity limits automatically
✅ **Flexible:** Works with any cell capacity (16, 24, 44, 120, etc.)

## Capacity Values (After 2x Increase)

| Unit | Shelf/Row | Capacity per Cell |
|------|-----------|-------------------|
| Unit 01 | Round Tubes | 44 pcs |
| Unit 01 | Square Bars | 22 pcs |
| Unit 01 | Channels | 14 pcs |
| Unit 01 | Flat Bars | 70 pcs |
| Unit 01 | Angle Irons | 30 pcs |
| Unit 01 | L-Beams | 40 pcs |
| Unit 02 | Lumber Rows 1-2 | 24 pcs |
| Unit 02 | Lumber Rows 3-4 | 20 pcs |
| Unit 02 | Lumber Rows 5-6 | 16 pcs |
| Unit 02 | Lumber Rows 7-8 | 12 pcs |
| Unit 02 | Zones 1-6 | 120 sheets |
| Unit 03 | Cement/Aggregates | 16 bags |
| Units 04-09 | Standard Rows | 16-24 pcs |

## Edge Cases Handled

1. ✅ **Remaining < Cell Capacity:** Allocates only what's remaining
2. ✅ **Cell Already Occupied:** Prevents selection (shows as green)
3. ✅ **Zero Remaining:** Disables all empty cells
4. ✅ **View-Only Mode:** No allocation allowed (Inventory page)
5. ✅ **Large Zones (Unit 02):** Works with 120-capacity zones
6. ✅ **Multiple Shelves:** Each shelf type has correct capacity

## Future Enhancements (Optional)

- **Bulk Auto-Fill:** "Auto-distribute across all empty cells" button
- **Undo Last Allocation:** Quick undo for mistakes
- **Suggested Layout:** AI suggests optimal cell arrangement
- **Capacity Warnings:** Alert when cells are nearly full

---

**Last Updated:** October 12, 2025  
**Related Files:** 
- `ShelfViewModal.jsx` (Auto-allocation logic)
- `NewProductForm.jsx` (Product creation)
- `NewVariantForm.jsx` (Variant creation)
- `StorageUnitsConfig.js` (Capacity definitions)
