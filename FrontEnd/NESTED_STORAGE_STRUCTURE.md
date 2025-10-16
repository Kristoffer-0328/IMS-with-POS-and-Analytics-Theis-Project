# Nested Storage Structure Documentation

## Database Structure

The Firebase Firestore database is organized with a **nested structure by storage location**:

```
Products/
  ├── Unit 01/
  │   ├── category: "Steel & Heavy Materials"
  │   └── products/ (subcollection)
  │       ├── {productId1}
  │       ├── {productId2}
  │       └── {variantId1}
  ├── Unit 02/
  │   ├── category: "Lumber & Wood"
  │   └── products/ (subcollection)
  │       ├── {productId3}
  │       └── {productId4}
  ├── Unit 03/
  │   ├── category: "Cement & Aggregate"
  │   └── products/ (subcollection)
  │       └── {productId5}
  └── ...
```

## Path Structure

### Products
**Path**: `Products/{storageLocation}/products/{productId}`

**Example**: `Products/Unit 01/products/HWD-FAS-ABC-PROD001`

### Variants
Variants are stored as separate product documents within the same subcollection:

**Path**: `Products/{storageLocation}/products/{variantId}`

**Example**: `Products/Unit 01/products/HWD-FAS-ABC-PROD001_VAR_1633024800_abc123`

## Storage Unit Documents

Each storage unit (Unit 01 through Unit 09) is a **document** in the Products collection with metadata:

```javascript
{
  category: "Steel & Heavy Materials",  // The category for this storage unit
  type: "storage_unit",                 // Identifier for storage unit documents
  // ... other metadata
}
```

## Product Document Structure

### Base Product
```javascript
{
  id: "STL-HVY-ABC-PROD001",
  name: "Product Name",
  category: "Steel & Heavy Materials",
  brand: "ABC Brand",
  quantity: 100,
  unitPrice: 50.00,
  unit: "pcs",
  
  // Storage Information
  storageLocation: "Unit 01",
  shelfName: "Shelf A",
  rowName: "Row 1",
  columnIndex: 1,
  fullLocation: "Unit 01 - Shelf A - Row 1 - Column 1",
  
  // Variant Identification
  isVariant: false,
  parentProductId: null,
  variantName: "Standard",
  
  // Supplier Information
  supplier: {
    name: "Supplier Name",
    code: "SUP001",
    primaryCode: "SUP001"
  },
  
  // Additional Fields
  specifications: "...",
  categoryValues: {},
  customFields: {},
  imageUrl: "https://...",
  
  // Timestamps
  createdAt: "2025-10-09T...",
  lastUpdated: "2025-10-09T..."
}
```

### Variant Product
```javascript
{
  id: "STL-HVY-ABC-PROD001_VAR_1633024800_abc123",
  name: "Product Name",  // Same as parent
  category: "Steel & Heavy Materials",
  brand: "ABC Brand",
  quantity: 50,
  unitPrice: 45.00,
  unit: "pcs",
  size: "Large",  // Variant-specific
  
  // Storage Information (can be different from parent)
  storageLocation: "Unit 02",
  shelfName: "Shelf B",
  rowName: "Row 3",
  columnIndex: 2,
  fullLocation: "Unit 02 - Shelf B - Row 3 - Column 2",
  
  // Variant Identification
  isVariant: true,
  parentProductId: "STL-HVY-ABC-PROD001",
  variantName: "Large",
  
  // ... rest of fields same as base product
}
```

## Code Implementation

### Creating a Product
```javascript
// Path: Products/{storageUnit}/products/{productId}
const storageUnitPath = "Unit 01";
const productId = "STL-HVY-ABC-PROD001";
const productRef = doc(db, 'Products', storageUnitPath, 'products', productId);
await setDoc(productRef, productData);
```

### Creating a Variant
```javascript
// Path: Products/{storageUnit}/products/{variantId}
const storageUnitPath = "Unit 01";
const variantId = `${parentProductId}_VAR_${Date.now()}_${randomString}`;
const variantRef = doc(db, 'Products', storageUnitPath, 'products', variantId);
await setDoc(variantRef, variantData);
```

### Fetching All Products
```javascript
const allProducts = [];
const productsRef = collection(db, 'Products');
const storageUnitsSnapshot = await getDocs(productsRef);

// Iterate through each storage unit
for (const storageUnitDoc of storageUnitsSnapshot.docs) {
  const unitId = storageUnitDoc.id;
  
  // Skip non-storage unit documents
  if (!unitId.startsWith('Unit ')) continue;
  
  // Fetch products subcollection
  const productsSubcollectionRef = collection(db, 'Products', unitId, 'products');
  const productsSnapshot = await getDocs(productsSubcollectionRef);
  
  productsSnapshot.docs.forEach(doc => {
    const product = { ...doc.data(), id: doc.id };
    allProducts.push(product);
  });
}
```

## Benefits of This Structure

1. **Organization**: Products are automatically organized by storage location
2. **Category Mapping**: Each storage unit has a category field
3. **Querying**: Easy to query all products in a specific storage unit
4. **Scalability**: Subcollections prevent document size limits
5. **Maintenance**: Clear separation between storage metadata and product data

## Storage Unit Categories

Based on the storage facility layout:

- **Unit 01**: Steel & Heavy Materials
- **Unit 02**: Lumber & Wood
- **Unit 03**: Cement & Aggregate
- **Unit 04**: Electrical & Plumbing
- **Unit 05**: Paint & Coatings
- **Unit 06**: Insulation & Foam
- **Unit 07**: Specialty Materials
- **Unit 08**: Roofing Materials
- **Unit 09**: Hardware & Fasteners

## Important Notes

1. **Storage units** are documents with metadata (category, type, etc.)
2. **Products** are in subcollections under each storage unit
3. **Variants** are separate products with `isVariant: true` and `parentProductId`
4. **Product IDs** remain unique across all storage units
5. The `storageLocation` field in each product document indicates which unit it belongs to
