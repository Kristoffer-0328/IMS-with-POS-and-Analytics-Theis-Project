// Centralized Storage Units Configuration
// This is the single source of truth for all storage unit structures
// Used by: Inventory.jsx, NewProductForm.jsx, NewVariantForm.jsx, StorageFacilityInteractiveMap.jsx

export const STORAGE_UNITS = [
  {
    id: 'unit-01',
    title: 'Unit 01 - Steel & Heavy Materials',
    type: 'Heavy Duty Storage',
    capacity: 140, // Total cells (32 + 48 + 28 + 32)
    shelves: [
      {
        name: "Round Tubes",
        rows: [
          { name: "Row 1", capacity: 44, columns: 4 },  // Round Tubes - 22 pcs per cell
          { name: "Row 2", capacity: 44, columns: 4 },
          { name: "Row 3", capacity: 44, columns: 4 },
          { name: "Row 4", capacity: 44, columns: 4 },
          { name: "Row 5", capacity: 44, columns: 4 },
          { name: "Row 6", capacity: 44, columns: 4 },
          { name: "Row 7", capacity: 44, columns: 4 },
          { name: "Row 8", capacity: 44, columns: 4 }
        ]
      },
      {
        name: "Square Bars",
        rows: [
          { name: "Row 1", capacity: 22, columns: 4 },  // Square Bars - 11 pcs per cell
          { name: "Row 2", capacity: 22, columns: 4 },
          { name: "Row 3", capacity: 22, columns: 4 },
          { name: "Row 4", capacity: 22, columns: 4 },
          { name: "Row 5", capacity: 22, columns: 4 },
          { name: "Row 6", capacity: 22, columns: 4 },
          { name: "Row 7", capacity: 22, columns: 4 },
          { name: "Row 8", capacity: 22, columns: 4 },
          { name: "Row 9", capacity: 22, columns: 4 },
          { name: "Row 10", capacity: 22, columns: 4 },
          { name: "Row 11", capacity: 22, columns: 4 },
          { name: "Row 12", capacity: 22, columns: 4 }
        ]
      },
      {
        name: "Channels & Flat Bars",
        rows: [
          { name: "Row 1", capacity: 14, columns: 4 },   // C-Channels - 7 pcs per cell
          { name: "Row 2", capacity: 14, columns: 4 },
          { name: "Row 3", capacity: 70, columns: 4 },  // Flat Bars - 35 pcs per cell
          { name: "Row 4", capacity: 70, columns: 4 },
          { name: "Row 5", capacity: 70, columns: 4 },
          { name: "Row 6", capacity: 70, columns: 4 },
          { name: "Row 7", capacity: 70, columns: 4 }
        ]
      },
      {
        name: "Angle Irons & L-Beams",
        rows: [
          { name: "Row 1", capacity: 30, columns: 4 },  // Angle Irons - 15 pcs per cell
          { name: "Row 2", capacity: 30, columns: 4 },
          { name: "Row 3", capacity: 30, columns: 4 },
          { name: "Row 4", capacity: 30, columns: 4 },
          { name: "Row 5", capacity: 40, columns: 4 },  // L-Beams - 20 pcs per cell
          { name: "Row 6", capacity: 40, columns: 4 },
          { name: "Row 7", capacity: 40, columns: 4 },
          { name: "Row 8", capacity: 40, columns: 4 }
        ]
      }
    ]
  },
  {
    id: 'unit-02',
    title: 'Unit 02 - Plywood & Sheet Materials',
    type: 'Storage Unit',
    capacity: 38, // 32 cells (Shelf A: 8 rows × 4 columns) + 6 zones
    shelves: [
      {
        name: "Lumber & Wood Products",
        rows: [
          { name: "Row 1", capacity: 96, columns: 4 },  // 24 pieces per cell
          { name: "Row 2", capacity: 96, columns: 4 },  // 24 pieces per cell
          { name: "Row 3", capacity: 96, columns: 4 },  // 24 pieces per cell
          { name: "Row 4", capacity: 96, columns: 4 },  // 24 pieces per cell
          { name: "Row 5", capacity: 96, columns: 4 },  // 24 pieces per cell
          { name: "Row 6", capacity: 96, columns: 4 },  // 24 pieces per cell
          { name: "Row 7", capacity: 96, columns: 4 },  // 24 pieces per cell
          { name: "Row 8", capacity: 96, columns: 4 }   // 24 pieces per cell
        ]
      },
      {
        name: "Zone 1",
        type: "large-area",
        capacity: 180,  // 60 pieces per zone (as shown in Excel row 7-9 for Planks)
        description: "Bulk storage area for large items",
        rows: [{ name: "Stack", capacity: 180 }]
      },
      {
        name: "Zone 2",
        type: "large-area",
        capacity: 180,
        description: "Bulk storage area for large items",
        rows: [{ name: "Stack", capacity: 180 }]
      },
      {
        name: "Zone 3",
        type: "large-area",
        capacity: 180,
        description: "Bulk storage area for large items",
        rows: [{ name: "Stack", capacity: 180 }]
      },
      {
        name: "Zone 4",
        type: "large-area",
        capacity: 180,
        description: "Bulk storage area for large items",
        rows: [{ name: "Stack", capacity: 180 }]
      },
      {
        name: "Zone 5",
        type: "large-area",
        capacity: 180,
        description: "Bulk storage area for large items",
        rows: [{ name: "Stack", capacity: 180 }]
      },
      {
        name: "Zone 6",
        type: "large-area",
        capacity: 180,
        description: "Bulk storage area for large items",
        rows: [{ name: "Stack", capacity: 180 }]
      }
    ]
  },
  {
    id: 'unit-03',
    title: 'Unit 03 - Cement & Aggregates',
    type: 'Storage Unit',
    capacity: 300, // 15 columns × 10 rows = 150 pallets
    shelves: [
      {
        name: "Zone 1",
        rows: [
          { name: "Row 1", capacity: 16, columns: 15 },  // 8 bags per pallet
          { name: "Row 2", capacity: 16, columns: 15 },
          { name: "Row 3", capacity: 16, columns: 15 },
          { name: "Row 4", capacity: 16, columns: 15 },
          { name: "Row 5", capacity: 16, columns: 15 },
          { name: "Row 6", capacity: 16, columns: 15 },
          { name: "Row 7", capacity: 16, columns: 15 },
          { name: "Row 8", capacity: 16, columns: 15 },
          { name: "Row 9", capacity: 16, columns: 15 },
          { name: "Row 10", capacity: 16, columns: 15 }
        ]
      }
    ]
  },
  {
    id: 'unit-04',
    title: 'Unit 04 - Electrical & Plumbing',
    type: 'Storage Unit',
    capacity: 248,
    shelves: [
      {
        name: "Electrical Wires & Cables",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Electrical Conduits & Fixtures",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Plumbing Pipes & Fittings",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Plumbing Fixtures & Tools",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      }
    ]
  },
  {
    id: 'unit-05',
    title: 'Unit 05 - Paint & Coatings',
    type: 'Storage Unit',
    capacity: 160,
    shelves: [
      {
        name: "Interior Paints",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Specialty Paints",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Application Tools",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Stains & Sealers",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Solvents & Cleaners",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      }
    ]
  },
  {
    id: 'unit-06',
    title: 'Unit 06 - Insulation & Foam',
    type: 'Storage Unit',
    capacity: 16,
    shelves: [
      {
        name: "Fiberglass Insulation",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Foam Products",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Vapor Barriers",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Installation Tools",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      }
    ]
  },
  {
    id: 'unit-07',
    title: 'Unit 07 - Miscellaneous',
    type: 'Storage Unit',
    capacity: 16,
    shelves: [
      {
        name: "Safety Equipment",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Adhesives & Sealants",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Small Accessories",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Spare Materials",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      }
    ]
  },
  {
    id: 'unit-08',
    title: 'Unit 08 - Roofing Materials',
    type: 'Storage Unit',
    capacity: 16,
    shelves: [
      {
        name: "Roofing Sheets & Shingles",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Flashing & Underlayment",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Roofing Accessories",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Gutters & Drainage",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      }
    ]
  },
  {
    id: 'unit-09',
    title: 'Unit 09 - Hardware & Fasteners',
    type: 'Storage Unit',
    capacity: 16,
    shelves: [
      {
        name: "Screws & Bolts",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Nails & Anchors",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Hand Tools",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      },
      {
        name: "Power Tool Accessories",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 2", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 3", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 4", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 5", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 6", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 7", columns: 4, capacity: 96 },  // 24 pieces per cell
          { name: "Row 8", columns: 4, capacity: 96 }   // 24 pieces per cell
        ]
      }
    ]
  }
];

/**
 * Get storage unit configuration by unit name or ID
 * @param {string} unitIdentifier - Unit name (e.g., "Unit 02") or ID (e.g., "unit-02")
 * @returns {object|null} Storage unit configuration or null if not found
 */
export const getStorageUnitConfig = (unitIdentifier) => {
  if (!unitIdentifier) return null;
  
  const identifier = unitIdentifier.toLowerCase();
  
  return STORAGE_UNITS.find(unit => 
    unit.title.toLowerCase().includes(identifier) || 
    unit.id === identifier
  ) || null;
};

/**
 * Get storage unit for modal display (backward compatible with existing code)
 * @param {string} unitName - Unit name (e.g., "Unit 02")
 * @returns {object} Storage unit configuration with title, type, and shelves
 */
export const getStorageUnitData = (unitName) => {
  const config = getStorageUnitConfig(unitName);
  
  if (config) {
    return {
      title: config.title,
      type: config.type,
      shelves: config.shelves
    };
  }
  
  // Fallback to default structure if unit not found
  return {
    title: unitName || 'Unit 01',
    type: "Storage Unit",
    shelves: [
      {
        name: "Shelf A",
        rows: [
          { name: "Row 1", columns: 4 },
          { name: "Row 2", columns: 4 },
          { name: "Row 3", columns: 4 },
          { name: "Row 4", columns: 4 },
          { name: "Row 5", columns: 4 },
          { name: "Row 6", columns: 4 },
          { name: "Row 7", columns: 4 },
          { name: "Row 8", columns: 4 }
        ]
      },
      {
        name: "Shelf B",
        rows: [
          { name: "Row 1", columns: 4 },
          { name: "Row 2", columns: 4 },
          { name: "Row 3", columns: 4 },
          { name: "Row 4", columns: 4 },
          { name: "Row 5", columns: 4 },
          { name: "Row 6", columns: 4 },
          { name: "Row 7", columns: 4 },
          { name: "Row 8", columns: 4 }
        ]
      }
    ]
  };
};
