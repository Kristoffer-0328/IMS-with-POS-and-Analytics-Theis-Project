// Centralized Storage Units Configuration
// This is the single source of truth for all storage unit structures
// Used by: Inventory.jsx, NewProductForm.jsx, NewVariantForm.jsx, StorageFacilityInteractiveMap.jsx

export const STORAGE_UNITS = [
  {
    id: 'unit-01',
    title: 'Unit 01 - Steel & Heavy Materials',
    type: 'Heavy Duty Storage',
    capacity: 3936, // Total capacity: Round Tubes (768) + Square Bars (1152) + Channels (1456) + Angle Irons (560)
    shelves: [
      {
        name: "Round Tubes",
        rows: [
          { 
            name: "Row 1", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "diameter", 
              min: 6, 
              max: 12.7, 
              unit: "mm",
              description: "Very small diameter: 6mm - 12.7mm" 
            }
          },
          { 
            name: "Row 2", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "diameter", 
              min: 6, 
              max: 12.7, 
              unit: "mm",
              description: "Very small diameter: 6mm - 12.7mm" 
            }
          },
          { 
            name: "Row 3", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "diameter", 
              min: 12.7, 
              max: 38.1, 
              unit: "mm",
              description: "Small diameter: 12.7mm - 38.1mm" 
            }
          },
          { 
            name: "Row 4", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "diameter", 
              min: 12.7, 
              max: 38.1, 
              unit: "mm",
              description: "Small diameter: 12.7mm - 38.1mm" 
            }
          },
          { 
            name: "Row 5", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "diameter", 
              min: 38.1, 
              max: 76.2, 
              unit: "mm",
              description: "Medium diameter: 38.1mm - 76.2mm" 
            }
          },
          { 
            name: "Row 6", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "diameter", 
              min: 38.1, 
              max: 76.2, 
              unit: "mm",
              description: "Medium diameter: 38.1mm - 76.2mm" 
            }
          },
          { 
            name: "Row 7", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "diameter", 
              min: 76.2, 
              max: 152.4, 
              unit: "mm",
              description: "Large diameter: 76.2mm - 152.4mm" 
            }
          },
          { 
            name: "Row 8", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "diameter", 
              min: 152.4, 
              max: 304.8, 
              unit: "mm",
              description: "Extra large diameter: 152.4mm - 304.8mm" 
            }
          }
        ]
      },
      {
        name: "Square Bars",
        rows: [
          { 
            name: "Row 1", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 6.35, 
              max: 19.05, 
              unit: "mm",
              description: "Small width: 6.35mm - 19.05mm" 
            }
          },
          { 
            name: "Row 2", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 6.35, 
              max: 19.05, 
              unit: "mm",
              description: "Small width: 6.35mm - 19.05mm" 
            }
          },
          { 
            name: "Row 3", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 19.05, 
              max: 38.1, 
              unit: "mm",
              description: "Medium width: 19.05mm - 38.1mm" 
            }
          },
          { 
            name: "Row 4", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 19.05, 
              max: 38.1, 
              unit: "mm",
              description: "Medium width: 19.05mm - 38.1mm" 
            }
          },
          { 
            name: "Row 5", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 38.1, 
              max: 76.2, 
              unit: "mm",
              description: "Large width: 38.1mm - 76.2mm" 
            }
          },
          { 
            name: "Row 6", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 38.1, 
              max: 76.2, 
              unit: "mm",
              description: "Large width: 38.1mm - 76.2mm" 
            }
          },
          { 
            name: "Row 7", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 76.2, 
              max: 152.4, 
              unit: "mm",
              description: "Extra large width: 76.2mm - 152.4mm" 
            }
          },
          { 
            name: "Row 8", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 76.2, 
              max: 152.4, 
              unit: "mm",
              description: "Extra large width: 76.2mm - 152.4mm" 
            }
          },
          { 
            name: "Row 9", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 152.4, 
              max: 304.8, 
              unit: "mm",
              description: "Heavy duty width: 152.4mm - 304.8mm" 
            }
          },
          { 
            name: "Row 10", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 152.4, 
              max: 304.8, 
              unit: "mm",
              description: "Heavy duty width: 152.4mm - 304.8mm" 
            }
          },
          { 
            name: "Row 11", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 304.8, 
              max: 609.6, 
              unit: "mm",
              description: "Industrial width: 304.8mm - 609.6mm" 
            }
          },
          { 
            name: "Row 12", 
            capacity: 96, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 304.8, 
              max: 609.6, 
              unit: "mm",
              description: "Industrial width: 304.8mm - 609.6mm" 
            }
          }
        ]
      },
      {
        name: "Channels & Flat Bars",
        rows: [
          { 
            name: "Row 1", 
            capacity: 28, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 50.8, 
              max: 101.6, 
              unit: "mm",
              description: "C-Channel Small: 50.8mm - 101.6mm width" 
            }
          },
          { 
            name: "Row 2", 
            capacity: 28, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 101.6, 
              max: 203.2, 
              unit: "mm",
              description: "C-Channel Large: 101.6mm - 203.2mm width" 
            }
          },
          { 
            name: "Row 3", 
            capacity: 280, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 25.4, 
              max: 76.2, 
              unit: "mm",
              description: "Flat Bar Small: 25.4mm - 76.2mm width" 
            }
          },
          { 
            name: "Row 4", 
            capacity: 280, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 25.4, 
              max: 76.2, 
              unit: "mm",
              description: "Flat Bar Small: 25.4mm - 76.2mm width" 
            }
          },
          { 
            name: "Row 5", 
            capacity: 280, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 76.2, 
              max: 152.4, 
              unit: "mm",
              description: "Flat Bar Medium: 76.2mm - 152.4mm width" 
            }
          },
          { 
            name: "Row 6", 
            capacity: 280, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 76.2, 
              max: 152.4, 
              unit: "mm",
              description: "Flat Bar Medium: 76.2mm - 152.4mm width" 
            }
          },
          { 
            name: "Row 7", 
            capacity: 280, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 152.4, 
              max: 304.8, 
              unit: "mm",
              description: "Flat Bar Large: 152.4mm - 304.8mm width" 
            }
          }
        ]
      },
      {
        name: "Angle Irons & L-Beams",
        rows: [
          { 
            name: "Row 1", 
            capacity: 60, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 25.4, 
              max: 50.8, 
              unit: "mm",
              description: "Small Angle: 25.4mm - 50.8mm width" 
            }
          },
          { 
            name: "Row 2", 
            capacity: 60, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 25.4, 
              max: 50.8, 
              unit: "mm",
              description: "Small Angle: 25.4mm - 50.8mm width" 
            }
          },
          { 
            name: "Row 3", 
            capacity: 60, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 50.8, 
              max: 101.6, 
              unit: "mm",
              description: "Medium Angle: 50.8mm - 101.6mm width" 
            }
          },
          { 
            name: "Row 4", 
            capacity: 60, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 50.8, 
              max: 101.6, 
              unit: "mm",
              description: "Medium Angle: 50.8mm - 101.6mm width" 
            }
          },
          { 
            name: "Row 5", 
            capacity: 80, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 101.6, 
              max: 152.4, 
              unit: "mm",
              description: "L-Beam Medium: 101.6mm - 152.4mm width" 
            }
          },
          { 
            name: "Row 6", 
            capacity: 80, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 101.6, 
              max: 152.4, 
              unit: "mm",
              description: "L-Beam Medium: 101.6mm - 152.4mm width" 
            }
          },
          { 
            name: "Row 7", 
            capacity: 80, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 152.4, 
              max: 304.8, 
              unit: "mm",
              description: "L-Beam Large: 152.4mm - 304.8mm width" 
            }
          },
          { 
            name: "Row 8", 
            capacity: 80, 
            columns: 4,
            dimensionConstraints: { 
              type: "width", 
              min: 152.4, 
              max: 304.8, 
              unit: "mm",
              description: "L-Beam Large: 152.4mm - 304.8mm width" 
            }
          }
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
          { name: "Row 1", capacity: 96, columns: 4, dimensionConstraints: { type: "thickness", min: 6, max: 12, unit: "mm", description: "Thin sheets: 6mm - 12mm" } },
          { name: "Row 2", capacity: 96, columns: 4, dimensionConstraints: { type: "thickness", min: 6, max: 12, unit: "mm", description: "Thin sheets: 6mm - 12mm" } },
          { name: "Row 3", capacity: 96, columns: 4, dimensionConstraints: { type: "thickness", min: 12, max: 18, unit: "mm", description: "Medium sheets: 12mm - 18mm" } },
          { name: "Row 4", capacity: 96, columns: 4, dimensionConstraints: { type: "thickness", min: 12, max: 18, unit: "mm", description: "Medium sheets: 12mm - 18mm" } },
          { name: "Row 5", capacity: 96, columns: 4, dimensionConstraints: { type: "thickness", min: 18, max: 25, unit: "mm", description: "Thick sheets: 18mm - 25mm" } },
          { name: "Row 6", capacity: 96, columns: 4, dimensionConstraints: { type: "thickness", min: 18, max: 25, unit: "mm", description: "Thick sheets: 18mm - 25mm" } },
          { name: "Row 7", capacity: 96, columns: 4, dimensionConstraints: { type: "thickness", min: 25, max: 50, unit: "mm", description: "Heavy sheets: 25mm - 50mm" } },
          { name: "Row 8", capacity: 96, columns: 4, dimensionConstraints: { type: "thickness", min: 25, max: 50, unit: "mm", description: "Heavy sheets: 25mm - 50mm" } }
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
    capacity: 1200, // 10 rows × 120 bags per row (15 columns × 8 bags per column) = 1200 bags
    shelves: [
      {
        name: "Zone 1",
        rows: [
          { name: "Row 1", capacity: 120, columns: 15 },  // 15 columns × 8 bags per column = 120 bags per row
          { name: "Row 2", capacity: 120, columns: 15 },
          { name: "Row 3", capacity: 120, columns: 15 },
          { name: "Row 4", capacity: 120, columns: 15 },
          { name: "Row 5", capacity: 120, columns: 15 },
          { name: "Row 6", capacity: 120, columns: 15 },
          { name: "Row 7", capacity: 120, columns: 15 },
          { name: "Row 8", capacity: 120, columns: 15 },
          { name: "Row 9", capacity: 120, columns: 15 },
          { name: "Row 10", capacity: 120, columns: 15 }
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
          { name: "Row 1", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 1.5, max: 6, unit: "mm", description: "Small wire: 1.5mm - 6mm diameter" } },
          { name: "Row 2", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 1.5, max: 6, unit: "mm", description: "Small wire: 1.5mm - 6mm diameter" } },
          { name: "Row 3", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 6, max: 10, unit: "mm", description: "Medium wire: 6mm - 10mm diameter" } },
          { name: "Row 4", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 6, max: 10, unit: "mm", description: "Medium wire: 6mm - 10mm diameter" } },
          { name: "Row 5", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 10, max: 16, unit: "mm", description: "Large wire: 10mm - 16mm diameter" } },
          { name: "Row 6", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 10, max: 16, unit: "mm", description: "Large wire: 16mm - 16mm diameter" } },
          { name: "Row 7", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 16, max: 25, unit: "mm", description: "Heavy wire: 16mm - 25mm diameter" } },
          { name: "Row 8", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 16, max: 25, unit: "mm", description: "Heavy wire: 16mm - 25mm diameter" } }
        ]
      },
      {
        name: "Electrical Conduits & Fixtures",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 12.7, max: 19.05, unit: "mm", description: "Small conduit: 12.7mm - 19.05mm (1/2\" - 3/4\")" } },
          { name: "Row 2", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 12.7, max: 19.05, unit: "mm", description: "Small conduit: 12.7mm - 19.05mm (1/2\" - 3/4\")" } },
          { name: "Row 3", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 19.05, max: 25.4, unit: "mm", description: "Medium conduit: 19.05mm - 25.4mm (3/4\" - 1\")" } },
          { name: "Row 4", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 19.05, max: 25.4, unit: "mm", description: "Medium conduit: 19.05mm - 25.4mm (3/4\" - 1\")" } },
          { name: "Row 5", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 25.4, max: 50.8, unit: "mm", description: "Large conduit: 25.4mm - 50.8mm (1\" - 2\")" } },
          { name: "Row 6", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 25.4, max: 50.8, unit: "mm", description: "Large conduit: 25.4mm - 50.8mm (1\" - 2\")" } },
          { name: "Row 7", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 50.8, max: 101.6, unit: "mm", description: "Heavy conduit: 50.8mm - 101.6mm (2\" - 4\")" } },
          { name: "Row 8", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 50.8, max: 101.6, unit: "mm", description: "Heavy conduit: 50.8mm - 101.6mm (2\" - 4\")" } }
        ]
      },
      {
        name: "Plumbing Pipes & Fittings",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 12.7, max: 19.05, unit: "mm", description: "Small pipe: 12.7mm - 19.05mm (1/2\" - 3/4\")" } },
          { name: "Row 2", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 12.7, max: 19.05, unit: "mm", description: "Small pipe: 12.7mm - 19.05mm (1/2\" - 3/4\")" } },
          { name: "Row 3", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 19.05, max: 25.4, unit: "mm", description: "Medium pipe: 19.05mm - 25.4mm (3/4\" - 1\")" } },
          { name: "Row 4", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 19.05, max: 25.4, unit: "mm", description: "Medium pipe: 19.05mm - 25.4mm (3/4\" - 1\")" } },
          { name: "Row 5", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 25.4, max: 50.8, unit: "mm", description: "Large pipe: 25.4mm - 50.8mm (1\" - 2\")" } },
          { name: "Row 6", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 25.4, max: 50.8, unit: "mm", description: "Large pipe: 25.4mm - 50.8mm (1\" - 2\")" } },
          { name: "Row 7", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 50.8, max: 101.6, unit: "mm", description: "Heavy pipe: 50.8mm - 101.6mm (2\" - 4\")" } },
          { name: "Row 8", columns: 4, capacity: 96, dimensionConstraints: { type: "diameter", min: 50.8, max: 101.6, unit: "mm", description: "Heavy pipe: 50.8mm - 101.6mm (2\" - 4\")" } }
        ]
      },
      {
        name: "Plumbing Fixtures & Tools",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },
          { name: "Row 2", columns: 4, capacity: 96 },
          { name: "Row 3", columns: 4, capacity: 96 },
          { name: "Row 4", columns: 4, capacity: 96 },
          { name: "Row 5", columns: 4, capacity: 96 },
          { name: "Row 6", columns: 4, capacity: 96 },
          { name: "Row 7", columns: 4, capacity: 96 },
          { name: "Row 8", columns: 4, capacity: 96 }
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
          { name: "Row 1", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.3, max: 0.5, unit: "mm", description: "Thin sheets: 0.3mm - 0.5mm (gauge 26-28)" } },
          { name: "Row 2", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.3, max: 0.5, unit: "mm", description: "Thin sheets: 0.3mm - 0.5mm (gauge 26-28)" } },
          { name: "Row 3", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.5, max: 0.7, unit: "mm", description: "Medium sheets: 0.5mm - 0.7mm (gauge 22-24)" } },
          { name: "Row 4", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.5, max: 0.7, unit: "mm", description: "Medium sheets: 0.5mm - 0.7mm (gauge 22-24)" } },
          { name: "Row 5", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.7, max: 1.2, unit: "mm", description: "Thick sheets: 0.7mm - 1.2mm (gauge 18-20)" } },
          { name: "Row 6", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.7, max: 1.2, unit: "mm", description: "Thick sheets: 0.7mm - 1.2mm (gauge 18-20)" } },
          { name: "Row 7", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 1.2, max: 3.0, unit: "mm", description: "Heavy sheets: 1.2mm - 3.0mm (gauge 14-16)" } },
          { name: "Row 8", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 1.2, max: 3.0, unit: "mm", description: "Heavy sheets: 1.2mm - 3.0mm (gauge 14-16)" } }
        ]
      },
      {
        name: "Flashing & Underlayment",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.2, max: 0.5, unit: "mm", description: "Flashing: 0.2mm - 0.5mm" } },
          { name: "Row 2", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.2, max: 0.5, unit: "mm", description: "Flashing: 0.2mm - 0.5mm" } },
          { name: "Row 3", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.5, max: 1.0, unit: "mm", description: "Heavy flashing: 0.5mm - 1.0mm" } },
          { name: "Row 4", columns: 4, capacity: 96, dimensionConstraints: { type: "thickness", min: 0.5, max: 1.0, unit: "mm", description: "Heavy flashing: 0.5mm - 1.0mm" } },
          { name: "Row 5", columns: 4, capacity: 96 },
          { name: "Row 6", columns: 4, capacity: 96 },
          { name: "Row 7", columns: 4, capacity: 96 },
          { name: "Row 8", columns: 4, capacity: 96 }
        ]
      },
      {
        name: "Roofing Accessories",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96 },
          { name: "Row 2", columns: 4, capacity: 96 },
          { name: "Row 3", columns: 4, capacity: 96 },
          { name: "Row 4", columns: 4, capacity: 96 },
          { name: "Row 5", columns: 4, capacity: 96 },
          { name: "Row 6", columns: 4, capacity: 96 },
          { name: "Row 7", columns: 4, capacity: 96 },
          { name: "Row 8", columns: 4, capacity: 96 }
        ]
      },
      {
        name: "Gutters & Drainage",
        rows: [
          { name: "Row 1", columns: 4, capacity: 96, dimensionConstraints: { type: "width", min: 76.2, max: 127, unit: "mm", description: "Small gutter: 76.2mm - 127mm (3\" - 5\")" } },
          { name: "Row 2", columns: 4, capacity: 96, dimensionConstraints: { type: "width", min: 76.2, max: 127, unit: "mm", description: "Small gutter: 76.2mm - 127mm (3\" - 5\")" } },
          { name: "Row 3", columns: 4, capacity: 96, dimensionConstraints: { type: "width", min: 127, max: 152.4, unit: "mm", description: "Medium gutter: 127mm - 152.4mm (5\" - 6\")" } },
          { name: "Row 4", columns: 4, capacity: 96, dimensionConstraints: { type: "width", min: 127, max: 152.4, unit: "mm", description: "Medium gutter: 127mm - 152.4mm (5\" - 6\")" } },
          { name: "Row 5", columns: 4, capacity: 96, dimensionConstraints: { type: "width", min: 152.4, max: 203.2, unit: "mm", description: "Large gutter: 152.4mm - 203.2mm (6\" - 8\")" } },
          { name: "Row 6", columns: 4, capacity: 96, dimensionConstraints: { type: "width", min: 152.4, max: 203.2, unit: "mm", description: "Large gutter: 152.4mm - 203.2mm (6\" - 8\")" } },
          { name: "Row 7", columns: 4, capacity: 96 },
          { name: "Row 8", columns: 4, capacity: 96 }
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

/**
 * Validate if product dimensions fit within row constraints
 * @param {object} row - Row configuration with dimensionConstraints
 * @param {object} productDimensions - Product dimensions { length, width, thickness, diameter }
 * @returns {object} { isValid: boolean, message: string }
 */
export const validateDimensionConstraints = (row, productDimensions) => {
  if (!row.dimensionConstraints) {
    // No constraints = always valid
    return { isValid: true, message: 'No dimension constraints' };
  }

  const constraints = row.dimensionConstraints;
  const { type, min, max, unit, description } = constraints;
  
  // Determine which dimension to check based on constraint type
  let dimensionValue = 0;
  
  if (type === 'diameter' && productDimensions.diameter) {
    dimensionValue = parseFloat(productDimensions.diameter);
  } else if (type === 'width' && productDimensions.width) {
    dimensionValue = parseFloat(productDimensions.width);
  } else if (type === 'length' && productDimensions.length) {
    dimensionValue = parseFloat(productDimensions.length);
  } else if (type === 'thickness' && productDimensions.thickness) {
    dimensionValue = parseFloat(productDimensions.thickness);
  } else {
    // Dimension not provided or not applicable
    return { isValid: false, message: `Product ${type} dimension is required for this row` };
  }

  // Check if dimension is within range
  if (dimensionValue < min || dimensionValue > max) {
    return {
      isValid: false,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${dimensionValue}${unit} is outside allowed range: ${min}${unit} - ${max}${unit}`
    };
  }

  return {
    isValid: true,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${dimensionValue}${unit} fits within ${description}`
  };
};

/**
 * Get compatible rows for a product based on dimensions
 * @param {string} unitName - Unit name (e.g., "Unit 01")
 * @param {string} shelfName - Shelf name
 * @param {object} productDimensions - Product dimensions
 * @returns {array} Array of compatible row names
 */
export const getCompatibleRows = (unitName, shelfName, productDimensions) => {
  const unit = getStorageUnitConfig(unitName);
  if (!unit) return [];

  const shelf = unit.shelves.find(s => s.name === shelfName);
  if (!shelf) return [];

  const compatibleRows = shelf.rows
    .filter(row => {
      const validation = validateDimensionConstraints(row, productDimensions);
      return validation.isValid;
    })
    .map(row => row.name);

  return compatibleRows;
};

/**
 * Get dimension constraint info for a specific row
 * @param {string} unitName - Unit name
 * @param {string} shelfName - Shelf name
 * @param {string} rowName - Row name
 * @returns {object|null} Dimension constraints or null
 */
export const getRowDimensionConstraints = (unitName, shelfName, rowName) => {
  const unit = getStorageUnitConfig(unitName);
  if (!unit) return null;

  const shelf = unit.shelves.find(s => s.name === shelfName);
  if (!shelf) return null;

  const row = shelf.rows.find(r => r.name === rowName);
  if (!row) return null;

  return row.dimensionConstraints || null;
};
