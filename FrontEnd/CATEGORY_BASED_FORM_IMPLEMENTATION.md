# Category-Based Dynamic Form Implementation

## Overview
Updated `NewProductForm.jsx` to automatically adjust form fields based on the selected **Category**. The form now uses simplified category names (e.g., "Roofing Materials" instead of "Unit 01 – Roofing Materials") and applies category-specific measurement rules.

## Category → Measurement Rules

```javascript
const CATEGORY_RULES = {
  "Steel & Heavy Materials":      { measurementType: "length", baseUnit: "m", requireDimensions: true },
  "Plywood & Sheet Materials":    { measurementType: "length", baseUnit: "m", requireDimensions: true },
  "Roofing Materials":            { measurementType: "length", baseUnit: "m", requireDimensions: true },
  "Insulation & Foam":            { measurementType: "length", baseUnit: "m", requireDimensions: true },
  "Cement & Aggregates":          { measurementType: "weight", baseUnit: "kg", requireDimensions: false },
  "Paint & Coatings":             { measurementType: "volume", baseUnit: "l", requireDimensions: false },
  "Electrical & Plumbing":        { measurementType: "count", baseUnit: "pcs", requireDimensions: false },
  "Hardware & Fasteners":         { measurementType: "count", baseUnit: "pcs", requireDimensions: false },
  "Miscellaneous":                { measurementType: "count", baseUnit: "pcs", requireDimensions: false }
};
```

## Form Behavior

### Base Fields (Always Visible)
- Product Name *
- Brand *
- Unit Price (₱) *
- Safety Stock
- Product Image
- Storage Locations *
- Supplier Information (optional)

### Dynamic Fields Based on Measurement Type

#### 1. Count-Based Items (`measurementType: "count"`)
**Categories:** Electrical & Plumbing, Hardware & Fasteners, Miscellaneous

**Fields Shown:**
- Base fields only
- Optional UOM Conversions section (e.g., 1 box = 12 pcs)

**No dimension or weight fields are shown**

#### 2. Weight-Based Items (`measurementType: "weight"`)
**Categories:** Cement & Aggregates

**Fields Shown:**
- Base fields
- Unit Weight (kg) * - Required field

**Firestore Save:**
```javascript
{
  ...baseFields,
  measurementType: "weight",
  baseUnit: "kg",
  unitWeightKg: Number
}
```

#### 3. Volume-Based Items (`measurementType: "volume"`)
**Categories:** Paint & Coatings

**Fields Shown:**
- Base fields
- Unit Volume (Liters) * - Required field

**Firestore Save:**
```javascript
{
  ...baseFields,
  measurementType: "volume",
  baseUnit: "l",
  unitVolumeLiters: Number
}
```

#### 4. Length-Based Items with Dimensions (`measurementType: "length"`, `requireDimensions: true`)
**Categories:** Steel & Heavy Materials, Plywood & Sheet Materials, Roofing Materials, Insulation & Foam

**Fields Shown:**
- Base fields
- Length (m) * - Required
- Width (cm) * - Required
- Thickness (mm) * - Required
- Auto-calculated Volume (cm³) - Displayed after input

**Volume Calculation:**
```javascript
unitVolumeCm3 = (length * 100) × width × (thickness / 10)
// length converted from m to cm
// thickness converted from mm to cm
```

**Firestore Save:**
```javascript
{
  ...baseFields,
  measurementType: "length",
  baseUnit: "m",
  length: Number,
  width: Number,
  thickness: Number,
  unitVolumeCm3: Number // Auto-calculated
}
```

## UOM Conversions (Count-Based Only)

For count-based items, users can optionally define unit conversions:

**Example:**
- 1 box = 12 pcs
- 1 pack = 6 pcs
- 1 set = 24 pcs

**Firestore Save:**
```javascript
{
  ...baseFields,
  measurementType: "count",
  baseUnit: "pcs",
  uomConversions: [
    { name: "box", quantity: 12 },
    { name: "pack", quantity: 6 }
  ]
}
```

## Firestore Document Structure

### Complete Product Document
```javascript
{
  // Basic Information
  id: String,
  name: String,
  brand: String,
  unitPrice: Number,
  category: String,
  
  // Measurement Information
  measurementType: "count" | "weight" | "volume" | "length",
  baseUnit: String,
  
  // Stock Information
  quantity: Number,
  safetyStock: Number,
  
  // Storage Information
  storageLocation: String,
  shelfName: String,
  rowName: String,
  columnIndex: Number,
  fullLocation: String,
  multiLocation: Boolean,
  totalQuantityAllLocations: Number,
  
  // Supplier Information
  suppliers: Array<{
    id: String,
    name: String,
    code: String,
    primaryCode: String
  }>,
  supplierPrice: Number,
  
  // Conditional Fields (based on measurementType)
  unitWeightKg: Number,           // Only for weight-based
  unitVolumeLiters: Number,       // Only for volume-based
  length: Number,                 // Only for length-based with dimensions
  width: Number,                  // Only for length-based with dimensions
  thickness: Number,              // Only for length-based with dimensions
  unitVolumeCm3: Number,          // Only for length-based with dimensions (auto-calculated)
  uomConversions: Array<{         // Only for count-based
    name: String,
    quantity: Number
  }>,
  
  // Media & Metadata
  imageUrl: String,
  dateStocked: String,
  createdAt: Timestamp,
  lastUpdated: Timestamp
}
```

## Validation Rules

### Required Field Validation
1. **All Products:**
   - Product Name
   - Brand
   - Unit Price
   - At least one storage location with quantity

2. **Weight-Based:**
   - Unit Weight (kg)

3. **Volume-Based:**
   - Unit Volume (Liters)

4. **Length-Based with Dimensions:**
   - Length (m)
   - Width (cm)
   - Thickness (mm)

### Automatic Calculations
- **Volume Calculation** for length-based products happens automatically when all three dimensions are entered
- **Total Quantity** is calculated from all storage locations
- **Timestamp** fields use `serverTimestamp()` for consistency

## UI/UX Features

### Visual Indicators
- Category badge shows selected category name
- Measurement type badge shows `measurementType (baseUnit)`
- Required fields marked with red asterisk (*)
- Optional sections marked with gray badge

### Form Sections
1. **Product Image** - Upload to Cloudinary with progress bar
2. **Basic Product Information** - Always visible
3. **Measurement-Specific Fields** - Dynamically shown based on category
4. **Supplier Information** - Optional, supports multiple suppliers
5. **Storage Locations** - Required, supports multiple locations

### Auto-Calculation Display
For length-based products with dimensions, a green success box displays:
```
✓ Calculated Volume: 1234.56 cm³
```

## Implementation Notes

### State Management
- Category change triggers `useEffect` that updates measurement type and resets measurement-specific fields
- Volume auto-calculation uses separate `useEffect` watching length, width, and thickness
- Supplier info auto-populates when passed as prop

### Clean Data Saving
- Uses `JSON.parse(JSON.stringify())` to remove undefined values before Firestore save
- Conditionally adds measurement-specific fields to avoid null/undefined in database
- Uses `serverTimestamp()` for consistent timestamp handling

### Multi-Location Support
- Products can be allocated to multiple storage locations
- Each location gets separate quantity input
- Total quantity calculated and displayed
- Multi-location products get unique IDs with location suffix

## Migration Notes

### Existing Data
- Old products without `measurementType` will default to "count"
- Missing `baseUnit` will default to "pcs"
- Existing products continue to work without migration

### Category Name Changes
- System now expects simplified category names without "Unit XX –" prefix
- Categories stored in Firestore should use new naming convention
- Update category documents if they still use old format

## Testing Checklist

- [ ] Create count-based product (no extra fields shown)
- [ ] Create count-based product with UOM conversions
- [ ] Create weight-based product (cement, aggregate)
- [ ] Create volume-based product (paint)
- [ ] Create length-based product (steel, plywood, roofing)
- [ ] Verify auto-calculation of volume for length-based
- [ ] Test multi-location allocation
- [ ] Test with supplier pre-selected
- [ ] Test without supplier (manual selection)
- [ ] Verify image upload to Cloudinary
- [ ] Test form validation for required fields
- [ ] Test measurement-specific field validation
- [ ] Verify Firestore document structure
- [ ] Test category switching (fields update correctly)

## Future Enhancements

1. **Dynamic Category Loading:** Load categories from Firestore instead of hardcoding
2. **Custom Measurement Types:** Allow admin to define new measurement types
3. **Batch Import:** Support CSV import with category-aware field mapping
4. **Unit Conversion Tools:** Built-in converters for common units
5. **Dimension Presets:** Save common dimension combinations for quick selection
