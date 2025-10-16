# In-Modal Allocation Removal Feature

## Overview
Enhanced the storage location modal to allow users to **remove allocations directly inside the modal** by clicking on already-selected cells, instead of having to go back to the form.

## Problem Solved
**Before:** 
- User allocates 100 pcs to Zone 1
- Realizes they made a mistake
- Has to close modal
- Find the allocation in the form's list
- Click the trash icon to remove it
- Re-open the modal
- Allocate again

**After:**
- User allocates 100 pcs to Zone 1
- Clicks the blue cell with X button
- Allocation is immediately removed
- Remaining quantity increases back to 100
- Can reallocate right away

## Visual Features

### 1. **Selected Cells Display**
When a cell is selected (has allocated quantity):
```
┌─────────────────┐
│    × (red X)    │  ← Click to remove
│       24        │  ← Quantity allocated
│      pcs        │
│    Col 1        │
└─────────────────┘
```

**Visual Characteristics:**
- Blue background with border
- Large quantity number display
- Red × button in top-right corner
- Shows "pcs" unit
- Shows column number

### 2. **Zone Allocations**
For large storage areas (Unit 02 zones):
```
┌──────────────────────────┐
│   × (red X button)       │
│                          │
│     ALLOCATED            │
│        100               │  ← Quantity
│        pcs               │
│                          │
│  Click × to remove       │
└──────────────────────────┘
```

**Visual Characteristics:**
- Blue background with border
- Red × button in top-right corner
- Large quantity display
- Clear removal instruction

### 3. **Empty Cells**
When hovering over empty cells:
- Tooltip shows: `Click to auto-allocate 24 pcs (Max: 24)`
- White background
- Becomes blue on hover

### 4. **Fully Allocated State**
When all products are allocated:
- Empty cells show: `All products allocated - Click blue cells to remove allocations`
- Zone buttons become gray and disabled
- Button text: "Fully Allocated"

## How It Works

### Auto-Allocation Flow
1. **User clicks empty cell:**
   ```javascript
   handleCellClick(shelfName, rowName, columnIndex, rowCapacity)
   ```
   - Calculates: `Math.min(remainingQty, rowCapacity)`
   - Example: 76 remaining, 24 capacity → Allocates 24 pcs
   - Calls parent: `onLocationSelect(shelf, row, col, 24)`

2. **User clicks selected cell:**
   ```javascript
   // Detects existing allocation
   const existingSelection = selectedLocations.find(...)
   if (existingSelection) {
     onLocationSelect(shelf, row, col, -1) // Signal removal
   }
   ```
   - Passes `-1` as quantity to signal removal
   - Parent component removes the allocation
   - Quantity returns to remaining pool

### Parent Component Handling

**NewProductForm.jsx & NewVariantForm.jsx:**
```javascript
const handleStorageLocationSelect = (shelfName, rowName, columnIndex, quantity) => {
  // Check for removal signal
  if (quantity === -1) {
    const locationKey = `${selectedUnit}-${shelfName}-${rowName}-${columnIndex}`;
    handleRemoveLocation(locationKey);
    return;
  }
  
  // Normal allocation...
};
```

## User Interactions

### Scenario 1: Normal Allocation
```
Total: 100 | Allocated: 0 | Remaining: 100
→ Click Cell 1 → 24 pcs allocated
Total: 100 | Allocated: 24 | Remaining: 76
→ Click Cell 2 → 24 pcs allocated
Total: 100 | Allocated: 48 | Remaining: 52
```

### Scenario 2: Remove and Reallocate
```
Total: 100 | Allocated: 48 | Remaining: 52
→ Click Cell 1 (selected) → Remove 24 pcs
Total: 100 | Allocated: 24 | Remaining: 76
→ Click Cell 3 → 24 pcs allocated
Total: 100 | Allocated: 48 | Remaining: 52
```

### Scenario 3: Zone Allocation
```
Total: 100 | Allocated: 0 | Remaining: 100
→ Click Zone 1 button → 100 pcs allocated (capacity: 120)
Total: 100 | Allocated: 100 | Remaining: 0
→ Click × on Zone 1 → Remove 100 pcs
Total: 100 | Allocated: 0 | Remaining: 100
```

### Scenario 4: Partial Fill
```
Total: 10 | Allocated: 0 | Remaining: 10
→ Click Cell 1 (capacity: 24) → 10 pcs allocated
Total: 10 | Allocated: 10 | Remaining: 0
Empty cells now show: "All products allocated - Click blue cells to remove"
```

## UI States

### Cell States
| State | Background | Border | Cursor | Action |
|-------|-----------|--------|--------|--------|
| Empty | White | Gray | Pointer | Click to allocate |
| Selected | Blue | Blue (thick) | Pointer | Click to remove |
| Occupied | Green | Green | Not-allowed | Cannot interact |
| Highlighted | Orange | Orange (thick) | Pointer | View only |
| View-Only | Gray | Gray | Default | No interaction |

### Zone Button States
| Condition | Style | Text | Action |
|-----------|-------|------|--------|
| Has remaining | Amber | "Add X pcs" | Click to allocate |
| No remaining | Gray (disabled) | "Fully Allocated" | No action |
| Already selected | Blue box with × | Shows quantity | Click × to remove |

## Tooltips

### Empty Cell Tooltips
- **With remaining:** `Click to auto-allocate 24 pcs to this cell (Max: 24)`
- **No remaining:** `All products allocated - Click blue cells to remove allocations`

### Selected Cell Tooltips
- **Normal cells:** `Click to remove allocation (24 pcs)`
- **Zone cells:** `Click to remove this allocation`

### Occupied Cell Tooltips
- `Product Name - Qty: 50 - Slot is occupied`

## Technical Implementation

### Key Functions

#### handleCellClick()
```javascript
const handleCellClick = (shelfName, rowName, columnIndex, rowCapacity) => {
  if (viewOnly) return;
  
  const product = getProductAtLocation(...);
  if (product) return; // Occupied
  
  // Check if already selected
  const existingSelection = selectedLocations.find(...);
  if (existingSelection) {
    onLocationSelect(..., -1); // Remove
    return;
  }
  
  // Auto-allocate
  const remainingQty = getRemainingQuantity();
  const quantityToAllocate = Math.min(remainingQty, rowCapacity);
  onLocationSelect(..., quantityToAllocate);
};
```

#### getRemainingQuantity()
```javascript
const getRemainingQuantity = () => {
  return totalQuantity - allocatedQuantity;
};
```

## Benefits

✅ **Efficiency:** No need to close and reopen modal
✅ **Speed:** Instant removal with single click
✅ **Clarity:** Visual X button makes removal obvious
✅ **Flexibility:** Easy to try different allocation strategies
✅ **User-Friendly:** Quantity displayed directly on selected cells
✅ **Responsive:** Real-time updates to remaining quantity

## Edge Cases Handled

1. ✅ **Remove last allocation:** Remaining quantity increases back to total
2. ✅ **Remove middle allocation:** Other allocations remain intact
3. ✅ **Remove from zone:** Zone button returns to normal state
4. ✅ **Remove with multiple selections:** Only removes clicked cell
5. ✅ **View-only mode:** No removal allowed (Inventory page)
6. ✅ **Occupied cells:** Cannot remove existing products

## Visual Indicators

### Progress Tracker (Top of Modal)
```
┌───────────────────────────────────────────────┐
│  Total Quantity: 100 | Allocated: 48 | Remaining: 52  │
└───────────────────────────────────────────────┘
```
- **Purple gradient background**
- **Large numbers for easy reading**
- **Updates in real-time**
- **Remaining turns gray when 0**

### Selection Counter
```
✓ 3 locations selected - Click empty cells to auto-allocate
```
- Shows when selections exist
- Updates count dynamically

### Removal Hint
When fully allocated:
```
All products allocated - Click blue cells to remove allocations
```

## Keyboard Interactions
- **ESC:** Close modal (existing feature)
- **Click × button:** Remove specific allocation
- **Click blue cell/zone:** Remove allocation

## Mobile Considerations
- × button is 20x20px (easy to tap)
- Zone × button is 28x28px (larger for easier access)
- Touch-friendly spacing between cells
- Clear visual feedback on tap

---

**Last Updated:** October 12, 2025  
**Related Files:**
- `ShelfViewModal.jsx` - Modal with removal feature
- `NewProductForm.jsx` - Parent form handler
- `NewVariantForm.jsx` - Variant form handler
- `AUTO_ALLOCATION_SYSTEM.md` - Auto-allocation documentation
