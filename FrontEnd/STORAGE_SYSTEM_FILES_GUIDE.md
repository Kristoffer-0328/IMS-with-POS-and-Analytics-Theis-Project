# Storage System - Related Files Guide

## 📋 Overview
This document identifies all files related to the storage facility system, particularly those that interact with `StorageUnitsConfig.js`. This is critical for understanding what needs to be updated after re-initializing storage units in the admin page.

---

## 🔑 Core Configuration & Services

### 1. **StorageUnitsConfig.js** (SINGLE SOURCE OF TRUTH)
**Path:** `src/features/inventory/config/StorageUnitsConfig.js`
- **Purpose:** Central configuration for all storage unit structures
- **Contains:**
  - `STORAGE_UNITS` array with 9 units (Unit 01 - Unit 09)
  - Each unit has shelves, rows, columns, and capacity details
  - Helper functions: `getStorageUnitConfig()`, `getStorageUnitData()`
- **Used By:** All storage-related components
- **Data Structure:**
  ```javascript
  {
    id: 'unit-01',
    title: 'Unit 01 - Steel & Heavy Materials',
    type: 'Heavy Duty Storage',
    capacity: 3936,
    shelves: [
      {
        name: "Round Tubes",
        rows: [
          { name: "Row 1", capacity: 96, columns: 4 },
          // ...more rows
        ]
      }
      // ...more shelves
    ]
  }
  ```

### 2. **StorageServices.js** (FIREBASE SERVICE)
**Path:** `src/services/firebase/StorageServices.js`
- **Purpose:** Service layer for storage unit CRUD operations
- **Key Functions:**
  - `initializeStorageUnitsFromConfig()` - Creates StorageUnits collection from config
  - `getStorageUnits()` - Fetches all storage units from Firestore
  - `getStorageUnit(unitId)` - Fetches single storage unit
  - `updateStorageUnit(unitId, data)` - Updates storage unit
  - `deleteStorageUnit(unitId)` - Deletes storage unit
  - `createStorageUnit(data)` - Creates new storage unit
- **Database Collection:** `StorageUnits` in Firestore

### 3. **StorageConfig.js** (FIREBASE STORAGE - NOT UNITS)
**Path:** `src/services/firebase/StorageConfig.js`
- **Purpose:** Firebase Storage (file storage) configuration
- **Note:** This is for FILE storage (images, etc.), NOT storage units
- **Contains:** CORS headers and storage options

---

## 🎯 Admin & Initialization Components

### 4. **InitializeStorageUnits.jsx**
**Path:** `src/features/inventory/components/Admin/InitializeStorageUnits.jsx`
- **Purpose:** One-time initialization UI component
- **Features:**
  - Button to trigger `initializeStorageUnitsFromConfig()`
  - Status messages and error handling
  - Lists all units to be created (Unit 01 - Unit 09)
- **Usage:** Add this to admin panel temporarily for initial setup

### 5. **StorageFacilityMap.jsx** (Admin Page)
**Path:** `src/features/admin/pages/StorageFacilityMap.jsx`
- **Purpose:** Admin page for managing storage facility
- **Features:**
  - Initialize storage units button
  - Edit mode toggle
  - Embeds `StorageFacilityInteractiveMap` component
  - Save/cancel changes functionality
- **Key Functions:**
  - `handleInitializeStorage()` - Calls initialization service
  - `toggleEditMode()` - Switches between view and edit mode

---

## 🗺️ Interactive Map & Visualization

### 6. **StorageFacilityInteractiveMap.jsx**
**Path:** `src/features/inventory/components/Inventory/StorageFacilityInteractiveMap.jsx`
- **Purpose:** Interactive visual map of storage facility
- **Features:**
  - Displays all storage units with capacity info
  - View individual shelf layouts
  - Edit mode: Add/Edit/Delete units and shelves
  - Real-time capacity calculation
  - Color-coded capacity status (green/yellow/red)
- **Key State:**
  - `storageUnits` - Array of units from Firestore
  - `unitCapacities` - Occupancy rates per unit
  - `selectedUnit` - Currently viewed unit
  - `editMode` - Whether editing is enabled
- **Key Functions:**
  - `fetchStorageUnits()` - Gets units from Firestore
  - `fetchUnitCapacities()` - Calculates occupancy from Products
  - `handleEditUnit()`, `handleDeleteUnit()`, `handleAddShelf()`
  - `openShelfView()` - Opens modal showing shelf details

---

## 📦 Product Creation & Management

### 7. **NewProductForm.jsx**
**Path:** `src/features/inventory/components/Inventory/CategoryModal/NewProductForm.jsx`
- **Purpose:** Form for creating new products
- **Storage Integration:**
  - Imports `getStorageUnitData()` from StorageUnitsConfig
  - Allows user to select storage unit
  - Location selection: shelf → row → column
  - Saves product to `Products/{unit}/products/{productId}`
- **Key Functions:**
  - `handleStorageLocationSelect(shelfName, rowName, columnIndex, quantity)`
  - Creates location key: `${unit}-${shelf}-${row}-${column}`
- **Data Saved:**
  ```javascript
  {
    storageLocation: 'Unit 01',
    shelfName: 'Round Tubes',
    rowName: 'Row 1',
    columnIndex: 0,
    fullLocation: 'Unit 01 - Round Tubes - Row 1 - Column 1'
  }
  ```

### 8. **NewVariantForm.jsx**
**Path:** `src/features/inventory/components/Inventory/CategoryModal/NewVariantForm.jsx`
- **Purpose:** Form for creating product variants
- **Storage Integration:** Same as NewProductForm.jsx
- **Imports:** `getStorageUnitData()` from StorageUnitsConfig
- **Saves To:** `Products/{unit}/products/{variantId}`

### 9. **ViewProductModal.jsx**
**Path:** `src/features/inventory/components/Inventory/ViewProductModal.jsx`
- **Purpose:** Modal for viewing/editing product details
- **Storage Integration:**
  - Imports `getStorageUnitConfig()` from StorageUnitsConfig
  - Displays storage unit details
  - Shows shelf configuration
  - Displays full location path
- **Usage:** Used to verify product's storage location

---

## 📊 Product Services

### 10. **ProductServices.jsx**
**Path:** `src/services/firebase/ProductServices.jsx`
- **Purpose:** Service layer for product operations
- **Storage Integration:**
  - Fetches products from nested structure: `Products/{storageUnit}/products/{productId}`
  - Iterates through storage units (Unit 01, Unit 02, etc.)
  - Constructs `fullLocation` string from shelf/row/column data
- **Key Functions:**
  - `getAllProducts()` - Loops through all storage units
  - Filters by `storageLocation.startsWith('Unit ')`
  - Sets up real-time listeners per storage unit

---

## 🎨 POS & Location Selection

### 11. **LocationSelectionModal.jsx**
**Path:** `src/features/pos/components/Modals/LocationSelectionModal.jsx`
- **Purpose:** Modal for selecting storage location during POS operations
- **Imports:** `getStorageUnitConfig()` from StorageUnitsConfig
- **Used In:** POS system for allocating inventory

---

## 📄 Inventory Pages

### 12. **Inventory.jsx**
**Path:** `src/features/inventory/pages/Inventory.jsx`
- **Purpose:** Main inventory page
- **Storage Integration:**
  - Embeds `StorageFacilityInteractiveMap` component
  - View-only mode (`viewOnly={true}`)
- **Usage:** Displays storage facility overview

---

## 📚 Documentation Files

### 13. **Related Markdown Documentation:**
- `STORAGE_FACILITY_LAYOUT.md` - Layout structure and design
- `POS_MULTI_LOCATION_ALLOCATION.md` - POS location system
- `AUTO_ALLOCATION_SYSTEM.md` - Automatic allocation logic
- `NESTED_STORAGE_STRUCTURE.md` - Database structure explanation
- `STOCK_MOVEMENT_FLOW.md` - Stock movement tracking

---

## 🔄 Data Flow & Dependencies

```
StorageUnitsConfig.js (Config)
        ↓
StorageServices.js (Firebase Service)
        ↓
StorageUnits Collection (Firestore)
        ↓
StorageFacilityInteractiveMap.jsx (UI Component)
        ↑
Products/{unit}/products/{id} (Nested by Unit)
        ↑
NewProductForm.jsx & NewVariantForm.jsx
        ↑
ProductServices.jsx
```

---

## ⚠️ Critical Points After Re-initialization

### What Happens When You Re-Initialize:
1. **StorageUnits Collection** in Firestore gets repopulated from `StorageUnitsConfig.js`
2. All storage unit data is reset to config defaults
3. **Existing products are NOT affected** (they're in separate `Products/{unit}/products/` collections)

### What Needs Verification After Re-init:
1. ✅ **Storage unit IDs** - Ensure they match between config and Firestore
2. ✅ **Shelf names** - Products reference shelf names (e.g., "Round Tubes")
3. ✅ **Row names** - Products reference row names (e.g., "Row 1")
4. ✅ **Column structure** - Products use columnIndex (0-based)
5. ✅ **Capacity values** - Must match to calculate occupancy correctly

### Files That MUST Match StorageUnitsConfig.js:
1. `StorageServices.js` - Uses `STORAGE_UNITS` array
2. `NewProductForm.jsx` - Uses `getStorageUnitData()`
3. `NewVariantForm.jsx` - Uses `getStorageUnitData()`
4. `ViewProductModal.jsx` - Uses `getStorageUnitConfig()`
5. `LocationSelectionModal.jsx` - Uses `getStorageUnitConfig()`
6. `StorageFacilityInteractiveMap.jsx` - Displays units from Firestore

---

## 🛠️ How to Safely Update Storage Configuration

### Step 1: Update StorageUnitsConfig.js
- Modify the `STORAGE_UNITS` array
- Change shelf names, row counts, capacities, etc.

### Step 2: Re-initialize from Admin Page
- Go to `StorageFacilityMap.jsx` admin page
- Click "Initialize Storage Units" button
- This calls `initializeStorageUnitsFromConfig()`
- Firestore `StorageUnits` collection is updated

### Step 3: Verify Product References
- Check existing products still reference valid shelves/rows
- Run a query to find products with outdated shelf names:
  ```javascript
  // Products with shelves not in new config
  const allProducts = await getAllProducts();
  const validShelves = STORAGE_UNITS.flatMap(u => u.shelves.map(s => s.name));
  const orphanedProducts = allProducts.filter(p => 
    !validShelves.includes(p.shelfName)
  );
  ```

### Step 4: Update Affected Products (if needed)
- If shelf/row names changed, update affected products
- Migrate products to new shelf structure if needed

---

## 🔍 Quick Reference

### Storage Unit IDs:
- `unit-01` - Steel & Heavy Materials (3,936 capacity)
- `unit-02` - Plywood & Sheet Materials (38 capacity)
- `unit-03` - Cement & Aggregates (1,200 capacity)
- `unit-04` - Electrical & Plumbing (248 capacity)
- `unit-05` - Paint & Coatings (160 capacity)
- `unit-06` - Insulation & Foam (16 capacity)
- `unit-07` - Miscellaneous (16 capacity)
- `unit-08` - Roofing Materials (16 capacity)
- `unit-09` - Hardware & Fasteners (16 capacity)

### Firestore Collections:
- `StorageUnits` - Storage unit configurations
- `Products/{unit}/products/{id}` - Products nested by storage unit

### Key Exports from StorageUnitsConfig.js:
- `STORAGE_UNITS` - Main config array
- `getStorageUnitConfig(unitName)` - Get unit config by name
- `getStorageUnitData(unitName)` - Get unit data for forms

---

## 📝 Summary

**Total Files Affected:** 12+ component/service files + 5+ documentation files

**Primary Files to Monitor:**
1. `StorageUnitsConfig.js` ← Source of truth
2. `StorageServices.js` ← Initialization & CRUD
3. `StorageFacilityInteractiveMap.jsx` ← Visual management
4. `NewProductForm.jsx` & `NewVariantForm.jsx` ← Product creation
5. `ProductServices.jsx` ← Product fetching

**Admin Action Required:**
- Access: `src/features/admin/pages/StorageFacilityMap.jsx`
- Click: "Initialize Storage Units" button
- Verify: All units appear in the interactive map

---

**Last Updated:** November 2, 2025
**Maintained By:** Development Team
