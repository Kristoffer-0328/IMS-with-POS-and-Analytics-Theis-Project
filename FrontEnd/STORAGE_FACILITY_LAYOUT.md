# Storage Facility Layout

## Physical Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          WAREHOUSE FLOOR PLAN                               │
│                                                                             │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Unit 01  │  │ Unit 02  │  │ Unit 03  │  │ Unit 04  │  │ Unit 05  │    │
│  │  Steel   │  │  Lumber  │  │  Cement  │  │Electrical│  │  Paint   │    │
│  │  & Heavy │  │  & Wood  │  │    &     │  │    &     │  │    &     │    │
│  │Materials │  │          │  │Aggregate │  │ Plumbing │  │ Coatings │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                                             │
│                                                              ┌──────────┐  │
│                                                              │ Unit 06  │  │
│                                                              │Insulation│  │
│                                                              │  & Foam  │  │
│                                                              └──────────┘  │
│                                                                             │
│                                                              ┌──────────┐  │
│                                                              │ Unit 07  │  │
│                                                              │Specialty │  │
│                                               Front Desk     │Materials │  │
│                                                              └──────────┘  │
│                                                                             │
│                                                              ┌──────────┐  │
│                                                              │ Unit 08  │  │
│                                                              │ Roofing  │  │
│                                                              │Materials │  │
│                                                              └──────────┘  │
│                                                                             │
│                                                              ┌──────────┐  │
│                                                              │ Unit 09  │  │
│                                                              │ Hardware │  │
│                                                              │    &     │  │
│                                                              │Fasteners │  │
│                                                              └──────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Unit-to-Category Mapping

| Unit ID | Category Name            | Location      | Description                           |
|---------|-------------------------|---------------|---------------------------------------|
| Unit 01 | Steel & Heavy Materials | Front Row     | Steel beams, metal sheets, rebar      |
| Unit 02 | Lumber & Wood          | Front Row     | Timber, plywood, wooden planks        |
| Unit 03 | Cement & Aggregate     | Front Row     | Cement bags, sand, gravel, aggregate  |
| Unit 04 | Electrical & Plumbing  | Front Row     | Wires, pipes, fittings, fixtures      |
| Unit 05 | Paint & Coatings       | Front Row     | Paints, varnish, sealants            |
| Unit 06 | Insulation & Foam      | Right Column  | Insulation materials, foam boards     |
| Unit 07 | Specialty Materials    | Right Column  | Specialized construction materials    |
| Unit 08 | Roofing Materials      | Right Column  | Roofing sheets, tiles, gutters       |
| Unit 09 | Hardware & Fasteners   | Right Column  | Nails, screws, bolts, tools          |

## Database Structure per Unit

Each unit follows this structure in Firebase:

```
Products/
  └── Unit 01/
      ├── category: "Steel & Heavy Materials"
      ├── type: "storage_unit"
      └── products/ (subcollection)
          ├── STL-HVY-PROD001
          ├── STL-HVY-PROD002
          └── STL-HVY-PROD003
```

## Shelf Layout per Unit

### Standard Unit Layout (Units 01-05, 09)
- **Shelf A**: 8 rows × 4 columns = 32 slots
- **Shelf B**: 8 rows × 4 columns = 32 slots
- **Total**: 64 slots per unit

### Specialty Unit Layout

**Unit 01** (Steel & Heavy Materials):
- Shelf A: 8 rows × 4 columns
- Shelf B: 13 rows × 5 columns
- Shelf C: 6 rows × 6 columns

**Unit 07** (Specialty Materials):
- Shelf A: 2 rows × 4 columns
- Shelf B: 1 row × 4 columns

**Unit 08** (Roofing Materials):
- Shelf A: 10 rows × 4 columns
- Shelf B: 20 rows × 5 columns

## Navigation

```javascript
// To select a unit in the UI
const units = [
  { id: 'Unit 01', category: 'Steel & Heavy Materials' },
  { id: 'Unit 02', category: 'Lumber & Wood' },
  { id: 'Unit 03', category: 'Cement & Aggregate' },
  { id: 'Unit 04', category: 'Electrical & Plumbing' },
  { id: 'Unit 05', category: 'Paint & Coatings' },
  { id: 'Unit 06', category: 'Insulation & Foam' },
  { id: 'Unit 07', category: 'Specialty Materials' },
  { id: 'Unit 08', category: 'Roofing Materials' },
  { id: 'Unit 09', category: 'Hardware & Fasteners' }
];
```

## Product Assignment Logic

When creating a new product:
1. User selects a **category** from the dropdown
2. System maps category → storage unit
3. Product is stored in: `Products/{unitId}/products/{productId}`
4. Storage location is recorded in product document

Example:
- User selects "Steel & Heavy Materials"
- System assigns to Unit 01
- Product saved to: `Products/Unit 01/products/STL-HVY-ABC-PROD001`
- Product document includes: `storageLocation: "Unit 01"`
