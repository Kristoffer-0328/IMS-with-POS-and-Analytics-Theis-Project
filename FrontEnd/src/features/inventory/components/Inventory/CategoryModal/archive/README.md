# Archive - Legacy Product Form Components

This folder contains legacy/deprecated files from the old product management architecture.

## Archived Files

### NewProductForm.jsx.LEGACY
- **Original Purpose**: Single monolithic form for creating products with all fields (general info, variants, pricing, stock, location) in one form
- **Why Deprecated**: Replaced by two-step architecture separating Product (general info) from Variants (inventory data)
- **Replaced By**: 
  - `NewProductForm_GeneralInfo.jsx` - Step 1: General product information
  - `NewVariantForm.jsx` - Step 2: Variant details (pricing, stock, location)
- **Architecture Change**: 
  - Old: Nested structure `Products/{unit}/products/{id}` with all data in one document
  - New: Flat structure `Products/{id}` (general info) + `Variants/{variantId}` (inventory data)
- **Date Archived**: November 8, 2025

### NewVariantForm.jsx.OLD
- **Original Purpose**: Backup of variant form during development
- **Why Deprecated**: Development backup file, superseded by final NewVariantForm.jsx
- **Date Archived**: November 8, 2025

## Current Active Files (DO NOT ARCHIVE)

- `NewProductForm_GeneralInfo.jsx` - ✅ ACTIVE: Step 1 product creation
- `NewVariantForm.jsx` - ✅ ACTIVE: Step 2 variant creation
- `CategoryModalIndex.jsx` - ✅ ACTIVE: Main modal coordinator
- `ProductList.jsx` - ✅ ACTIVE: Product list display
- `CategoryFieldManager.jsx` - ✅ ACTIVE: Dynamic field management
- `Utils.jsx` - ✅ ACTIVE: Utility functions

## Related Service Files

### Active Services (NEW Architecture)
- `src/features/inventory/services/VariantServices.jsx` - Variants collection CRUD
- `src/features/inventory/services/ProductServices.jsx` - Products collection CRUD (refactored for flat structure)

### Factory Pattern
- `src/features/inventory/components/Factory/productFactory.jsx` - Factory methods for creating Products and Variants

## Migration Notes

The legacy `NewProductForm.jsx` contained ~1400 lines handling:
- Product general info (name, brand, category, image)
- Variant identification (variant name)
- Pricing & stock (unitPrice, quantity, supplierPrice, safetyStock)
- Storage location (with ShelfViewModal)
- Supplier selection (multi-select)
- Measurement-specific fields (weight, volume, dimensions)
- Cement-specific fields (packed/raw, packaging variants)
- Bundle configuration

This functionality has been split across:
1. **NewProductForm_GeneralInfo.jsx** (~450 lines) - Only general product information
2. **NewVariantForm.jsx** (~1100 lines) - All variant-specific fields

## Benefits of New Architecture

1. **Separation of Concerns**: Product template vs inventory instances
2. **Scalability**: One product can have unlimited variants without document size limits
3. **Query Efficiency**: Can query variants directly without navigating nested collections
4. **Data Integrity**: Variants denormalize product info for efficient reads
5. **Flexibility**: Easy to add variants to existing products
6. **Aggregate Statistics**: Product documents maintain calculated stats (totalVariants, totalStock, price ranges)

## Rollback Instructions

If you need to revert to legacy architecture:
1. Rename `NewProductForm.jsx.LEGACY` back to `NewProductForm.jsx`
2. Update `CategoryModalIndex.jsx` to use legacy form
3. Set `USE_NEW_ARCHITECTURE = false` in `Inventory.jsx`
4. Use `ProductServices.listenToLegacyProducts()` for data fetching

---
*This README was created during Product/Variant architecture refactoring*
*Last Updated: November 8, 2025*
