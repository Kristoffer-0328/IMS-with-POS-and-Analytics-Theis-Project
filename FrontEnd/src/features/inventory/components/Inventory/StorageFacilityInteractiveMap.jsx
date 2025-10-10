import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';
import ShelfViewModal from './ShelfViewModal';

const StorageFacilityInteractiveMap = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitCapacities, setUnitCapacities] = useState({});
  const [loading, setLoading] = useState(true);
  const db = getFirestore(app);

  // Fetch unit capacities on component mount
  useEffect(() => {
    fetchUnitCapacities();
  }, []);

  // Calculate unit capacity based on actual products vs total slots
  const fetchUnitCapacities = async () => {
    try {
      const capacities = {};
      
      // Define total slots for each unit based on shelf layout
      const unitTotalSlots = {
        'Unit 01': 4 * 8 + 5 * 13 + 6 * 6, // Shelf A (4 cols * 8 rows) + Shelf B (5 cols * 13 rows) + Shelf C (6 cols * 6 rows)
        'Unit 02': 4 * 8, // Shelf A only (4 cols * 8 rows)
        'Unit 03': 4 * 8 + 4 * 8, // Shelf A + Shelf B (4 cols * 8 rows each)
        'Unit 04': 4 * 8 + 4 * 8, // Shelf A + Shelf B (4 cols * 8 rows each)
        'Unit 05': 4 * 8 + 4 * 8, // Shelf A + Shelf B (4 cols * 8 rows each)
        'Unit 06': 4 * 8 + 4 * 8, // Shelf A + Shelf B (4 cols * 8 rows each)
        'Unit 07': 4 * 2 + 4 * 1, // Shelf A (4 cols * 2 rows) + Shelf B (4 cols * 1 row)
        'Unit 08': 4 * 10 + 5 * 20, // Shelf A (4 cols * 10 rows) + Shelf B (5 cols * 20 rows)
        'Unit 09': 4 * 8 + 4 * 8 + 4 * 8 // Shelf A + Shelf B + Shelf C (4 cols * 8 rows each)
      };

      // Fetch products from nested structure: Products/{storageUnit}/products/{productId}
      const productsRef = collection(db, 'Products');
      const storageUnitsSnapshot = await getDocs(productsRef);
      
      // Count products per unit (group base products + variants)
      const unitProductCounts = {};
      const processedParentIds = new Set(); // Track base products we've already counted
      
      // Iterate through each storage unit
      for (const storageUnitDoc of storageUnitsSnapshot.docs) {
        const unitId = storageUnitDoc.id;
        
        // Skip non-storage unit documents
        if (!unitId.startsWith('Unit ')) {
          continue;
        }
        
        // Fetch products subcollection for this storage unit
        const productsSubcollectionRef = collection(db, 'Products', unitId, 'products');
        const productsSnapshot = await getDocs(productsSubcollectionRef);
        
        // Initialize counter for this unit
        if (!unitProductCounts[unitId]) {
          unitProductCounts[unitId] = 0;
        }
        
        productsSnapshot.docs.forEach(doc => {
          const product = doc.data();
          
          // If it's a variant, only count if we haven't counted its parent
          if (product.isVariant && product.parentProductId) {
            const parentKey = `${unitId}_${product.parentProductId}`;
            if (!processedParentIds.has(parentKey)) {
              processedParentIds.add(parentKey);
              unitProductCounts[unitId]++;
            }
          } else if (!product.isVariant) {
            // It's a base product, count it once
            const productKey = `${unitId}_${doc.id}`;
            if (!processedParentIds.has(productKey)) {
              processedParentIds.add(productKey);
              unitProductCounts[unitId]++;
            }
          }
        });
      }
      
      // Calculate capacities for each unit
      for (const unitName in unitTotalSlots) {
        const productCount = unitProductCounts[unitName] || 0;
        const totalSlots = unitTotalSlots[unitName];
        const occupancyRate = productCount / totalSlots;
        
        capacities[unitName] = {
          productCount,
          totalSlots,
          occupancyRate,
          status: getCapacityStatus(occupancyRate)
        };
        
        console.log(`${unitName}: ${productCount} products / ${totalSlots} slots (${(occupancyRate * 100).toFixed(1)}%)`);
      }
      
      setUnitCapacities(capacities);
    } catch (error) {
      console.error('Error fetching unit capacities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine capacity status based on occupancy rate
  const getCapacityStatus = (occupancyRate) => {
    if (occupancyRate >= 0.9) return 'full';      // 90%+ = full (red)
    if (occupancyRate >= 0.6) return 'occupied';  // 60-89% = occupied (yellow/orange)
    return 'available';                           // <60% = available (green)
  };

  const shelfLayouts = {
    unit1: {
      title: "Unit 01 - Steel & Heavy Materials",
      type: "Construction Materials Storage",
      shelves: [
        {
          name: "Shelf A",
          rows: [
            {
              name: "Row 1",
              items: ["I-Beam 6m", "I-Beam 8m", "H-Beam 6m", "H-Beam 8m"]
            },
            {
              name: "Row 2",
              items: ["Angle Iron", "Steel Plates", "Steel Columns", "Beam Connectors"]
            },
            {
              name: "Row 3",
              items: ["Base Plates", "Anchor Bolts", "Steel Brackets", "Welding Rods"]
            },
            {
              name: "Row 4",
              items: ["Steel Pipes", "Steel Tubes", "Steel Bars", "Steel Wire"]
            },
            {
              name: "Row 5",
              items: ["Steel Mesh", "Steel Grating", "Steel Ladders", "Steel Platforms"]
            },
            {
              name: "Row 6",
              items: ["Steel Frames", "Steel Trusses", "Steel Joists", "Steel Girders"]
            },
            {
              name: "Row 7",
              items: ["Steel Channels", "Steel Angles", "Steel Tees", "Steel Flats"]
            },
            {
              name: "Row 8",
              items: ["Steel Rounds", "Steel Squares", "Steel Hex", "Steel Bolts"]
            }
          ]
        },
        {
          name: "Shelf B",
          rows: [
            {
              name: "Row 1",
              items: ["Rebar #3", "Rebar #4", "Rebar #5", "Rebar #6", "Rebar #7"]
            },
            {
              name: "Row 2",
              items: ["Rebar #8", "Rebar #9", "Rebar #10", "Rebar #11", "Rebar #12"]
            },
            {
              name: "Row 3",
              items: ["Wire Mesh 4x4", "Wire Mesh 6x6", "Wire Mesh 8x8", "Wire Mesh 10x10", "Wire Mesh 12x12"]
            },
            {
              name: "Row 4",
              items: ["Tie Wire 16ga", "Tie Wire 18ga", "Tie Wire 20ga", "Rebar Caps", "Rebar Chairs"]
            },
            {
              name: "Row 5",
              items: ["Rebar Spacers", "Rebar Bolsters", "Rebar Supports", "Rebar Ties", "Rebar Clips"]
            },
            {
              name: "Row 6",
              items: ["Concrete Wire", "Welded Wire", "Expanded Metal", "Perforated Metal", "Diamond Mesh"]
            },
            {
              name: "Row 7",
              items: ["Chain Link", "Barbed Wire", "Razor Wire", "Security Mesh", "Fence Posts"]
            },
            {
              name: "Row 8",
              items: ["Fence Rails", "Fence Gates", "Fence Hardware", "Fence Fabric", "Fence Ties"]
            },
            {
              name: "Row 9",
              items: ["Fence Clips", "Fence Brackets", "Fence Hinges", "Fence Latches", "Fence Locks"]
            },
            {
              name: "Row 10",
              items: ["Fence Tensioners", "Fence Stretchers", "Fence Crimpers", "Fence Cutters", "Fence Tools"]
            },
            {
              name: "Row 11",
              items: ["Fence Staples", "Fence Nails", "Fence Screws", "Fence Bolts", "Fence Washers"]
            },
            {
              name: "Row 12",
              items: ["Fence Caps", "Fence Tops", "Fence Finials", "Fence Decorations", "Fence Accessories"]
            },
            {
              name: "Row 13",
              items: ["Fence Panels", "Fence Sections", "Fence Modules", "Fence Components", "Fence Parts"]
            }
          ]
        },
        {
          name: "Shelf C",
          rows: [
            {
              name: "Row 1",
              items: ["Concrete Mixer", "Jack Hammer", "Grinder", "Welding Unit", "Tool Cart", "Crane"]
            },
            {
              name: "Row 2",
              items: ["Forklift", "Excavator", "Bulldozer", "Loader", "Dump Truck", "Cement Truck"]
            },
            {
              name: "Row 3",
              items: ["Compactor", "Roller", "Paver", "Grader", "Scraper", "Backhoe"]
            },
            {
              name: "Row 4",
              items: ["Drill Rig", "Pile Driver", "Hammer", "Vibrator", "Compactor", "Tamper"]
            },
            {
              name: "Row 5",
              items: ["Generator", "Compressor", "Pump", "Blower", "Fan", "Heater"]
            },
            {
              name: "Row 6",
              items: ["Light Tower", "Traffic Cone", "Barrier", "Sign", "Flag", "Cone"]
            }
          ]
        }
      ],
      info: {
        capacity: "85% Full",
        lastUpdate: "Today, 2:30 PM",
        manager: "John Smith",
        temperature: "22°C",
        items: ["Steel beams and structural materials", "Reinforcement bars and mesh", "Heavy construction tools", "Welding and cutting equipment"]
      }
    },
    unit2: {
      title: "Unit 02 - Lumber & Wood Materials",
      type: "Construction Materials Storage",
      shelves: [
        {
          name: "Shelf A",
          rows: [
            {
              name: "Row 1",
              items: ["2x4x8'", "2x4x10'", "2x6x8'", "2x6x10'"]
            },
            {
              name: "Row 2",
              items: ["2x8x8'", "2x8x10'", "2x10x8'", "2x10x10'"]
            },
            {
              name: "Row 3",
              items: ["2x12x8'", "2x12x10'", "4x4x8'", "4x4x10'"]
            },
            {
              name: "Row 4",
              items: ["4x6x8'", "4x6x10'", "4x8x8'", "4x8x10'"]
            },
            {
              name: "Row 5",
              items: ["3/4\" Plywood", "1/2\" Plywood", "OSB 7/16\"", "MDF Sheets"]
            },
            {
              name: "Row 6",
              items: ["Hardboard", "Cedar Planks", "Oak Boards", "Pine Molding"]
            },
            {
              name: "Row 7",
              items: ["Trim Pieces", "Wood Stain", "Sandpaper", "Wood Glue"]
            },
            {
              name: "Row 8",
              items: ["Clamps", "Nails & Screws", "Safety Gear", "Tool Set"]
            }
          ]
        }
      ],
      info: {
        capacity: "70% Full",
        lastUpdate: "Yesterday, 4:15 PM",
        manager: "Maria Garcia",
        humidity: "45%",
        items: ["Dimensional lumber in various sizes", "Plywood and engineered sheets", "Specialty wood products", "Wood finishing supplies"]
      }
    },
    unit3: {
      title: "Unit 03 - Cement & Aggregate",
      type: "Construction Materials Storage",
      shelves: [
        {
          name: "Shelf A",
          rows: [
            {
              name: "Row 1",
              items: ["Portland Cement", "Quick Set", "Mortar Mix", "Grout"]
            },
            {
              name: "Row 2",
              items: ["Concrete Mix", "Fiber Mix", "Fine Sand", "Coarse Sand"]
            },
            {
              name: "Row 3",
              items: ["Pea Gravel", "Crushed Stone", "River Rock", "Drainage Rock"]
            },
            {
              name: "Row 4",
              items: ["Cement Additives", "Water Reducer", "Air Entrainer", "Accelerator"]
            },
            {
              name: "Row 5",
              items: ["Retarder", "Plasticizer", "Superplasticizer", "Shrinkage Reducer"]
            },
            {
              name: "Row 6",
              items: ["Cement Bags", "Cement Sacks", "Cement Containers", "Cement Storage"]
            },
            {
              name: "Row 7",
              items: ["Cement Mixer", "Cement Tools", "Cement Equipment", "Cement Supplies"]
            },
            {
              name: "Row 8",
              items: ["Cement Testing", "Cement Quality", "Cement Standards", "Cement Certification"]
            }
          ]
        },
        {
          name: "Shelf B",
          rows: [
            {
              name: "Row 1",
              items: ["Wheelbarrow", "Mixing Tools", "Float Set", "Trowels"]
            },
            {
              name: "Row 2",
              items: ["Buckets", "Hose & Sprayer", "Concrete Vibrator", "Screed Board"]
            },
            {
              name: "Row 3",
              items: ["Bull Float", "Hand Float", "Edger", "Groover"]
            },
            {
              name: "Row 4",
              items: ["Concrete Saw", "Grinder", "Polisher", "Sealer"]
            },
            {
              name: "Row 5",
              items: ["Concrete Forms", "Rebar Cutter", "Rebar Bender", "Rebar Ties"]
            },
            {
              name: "Row 6",
              items: ["Concrete Pump", "Concrete Truck", "Concrete Mixer", "Concrete Plant"]
            },
            {
              name: "Row 7",
              items: ["Concrete Testing", "Concrete Quality", "Concrete Standards", "Concrete Inspection"]
            },
            {
              name: "Row 8",
              items: ["Concrete Repair", "Concrete Maintenance", "Concrete Protection", "Concrete Curing"]
            }
          ]
        }
      ],
      info: {
        capacity: "92% Full - Nearly Full",
        lastUpdate: "2 hours ago",
        manager: "David Chen",
        temperature: "24°C",
        items: ["Various cement and concrete products", "Sand, gravel, and stone aggregates", "Masonry and concrete tools", "Mixing and finishing equipment"]
      }
    },
    unit4: {
      title: "Unit 04 - Electrical & Plumbing",
      type: "Construction Materials Storage",
      shelves: [
        {
          name: "Shelf A",
          rows: [
            {
              name: "Row 1",
              items: ["PVC 1/2\"", "PVC 3/4\"", "PVC 1\"", "PVC 1.25\""]
            },
            {
              name: "Row 2",
              items: ["Copper 1/2\"", "Copper 3/4\"", "Copper 1\"", "Copper 1.25\""]
            },
            {
              name: "Row 3",
              items: ["PEX 1/2\"", "PEX 3/4\"", "PEX 1\"", "PEX 1.25\""]
            },
            {
              name: "Row 4",
              items: ["Galvanized 1/2\"", "Galvanized 3/4\"", "Galvanized 1\"", "Galvanized 1.25\""]
            },
            {
              name: "Row 5",
              items: ["Pipe Fittings", "Elbows", "Tees", "Couplings"]
            },
            {
              name: "Row 6",
              items: ["Valves", "Faucets", "Shower Heads", "Toilet Parts"]
            },
            {
              name: "Row 7",
              items: ["Pipe Wrenches", "Pipe Cutters", "Pipe Threaders", "Pipe Benders"]
            },
            {
              name: "Row 8",
              items: ["Pipe Insulation", "Pipe Hangers", "Pipe Clamps", "Pipe Seals"]
            }
          ]
        },
        {
          name: "Shelf B",
          rows: [
            {
              name: "Row 1",
              items: ["12 AWG Wire", "14 AWG Wire", "10 AWG Wire", "8 AWG Wire"]
            },
            {
              name: "Row 2",
              items: ["6 AWG Wire", "4 AWG Wire", "2 AWG Wire", "1 AWG Wire"]
            },
            {
              name: "Row 3",
              items: ["Conduit 1/2\"", "Conduit 3/4\"", "Conduit 1\"", "Conduit 1.25\""]
            },
            {
              name: "Row 4",
              items: ["Conduit 1.5\"", "Conduit 2\"", "Conduit 2.5\"", "Conduit 3\""]
            },
            {
              name: "Row 5",
              items: ["Junction Boxes", "Outlet Boxes", "Switch Boxes", "Panel Boxes"]
            },
            {
              name: "Row 6",
              items: ["Switches", "Outlets", "GFCI Outlets", "USB Outlets"]
            },
            {
              name: "Row 7",
              items: ["Circuit Breakers", "Fuses", "Panels", "Meters"]
            },
            {
              name: "Row 8",
              items: ["Light Fixtures", "Ceiling Fans", "Chandeliers", "Track Lighting"]
            }
          ]
        }
      ],
      info: {
        capacity: "60% Full",
        lastUpdate: "This morning, 9:00 AM",
        manager: "Robert Johnson",
        temperature: "21°C",
        items: ["Electrical cables and conduits", "Plumbing pipes and fittings", "Installation tools and equipment", "Safety equipment and supplies"]
      }
    },
    unit5: {
      title: "Unit 05 - Paint & Coatings",
      type: "Paint, Insulation & Materials Storage",
      shelves: [
        {
          name: "Shelf A",
          rows: [
            {
              name: "Row 1",
              items: ["White Latex", "Beige Latex", "Gray Latex", "Blue Latex"]
            },
            {
              name: "Row 2",
              items: ["Red Latex", "Green Latex", "Yellow Latex", "Black Latex"]
            },
            {
              name: "Row 3",
              items: ["Ext. White", "Ext. Brown", "Ext. Gray", "Weather Shield"]
            },
            {
              name: "Row 4",
              items: ["Deck Stain", "Metal Paint", "Primer", "Sealer"]
            },
            {
              name: "Row 5",
              items: ["Base Coat", "Top Coat", "Clear Coat", "Varnish"]
            },
            {
              name: "Row 6",
              items: ["Stain", "Glaze", "Wash", "Tint"]
            },
            {
              name: "Row 7",
              items: ["Paint Thinner", "Paint Solvent", "Paint Cleaner", "Paint Remover"]
            },
            {
              name: "Row 8",
              items: ["Paint Additives", "Paint Extenders", "Paint Conditioners", "Paint Enhancers"]
            }
          ]
        },
        {
          name: "Shelf B",
          rows: [
            {
              name: "Row 1",
              items: ["Epoxy Paint", "Anti-Slip Coating", "Fire Retardant", "Mold Resistant"]
            },
            {
              name: "Row 2",
              items: ["Chalk Paint", "Metallic Finish", "Textured Paint", "Specialty Paint"]
            },
            {
              name: "Row 3",
              items: ["Brushes 2\"", "Brushes 4\"", "Brushes 6\"", "Brushes 8\""]
            },
            {
              name: "Row 4",
              items: ["Rollers", "Roller Pans", "Roller Covers", "Roller Frames"]
            },
            {
              name: "Row 5",
              items: ["Drop Cloths", "Painter's Tape", "Masking Paper", "Plastic Sheeting"]
            },
            {
              name: "Row 6",
              items: ["Paint Trays", "Paint Buckets", "Paint Sticks", "Paint Strainers"]
            },
            {
              name: "Row 7",
              items: ["Paint Sprayers", "Paint Guns", "Paint Hoses", "Paint Filters"]
            },
            {
              name: "Row 8",
              items: ["Paint Safety", "Paint PPE", "Paint Equipment", "Paint Tools"]
            }
          ]
        }
      ],
      info: {
        capacity: "45% Full - Available Space",
        lastUpdate: "Yesterday, 3:45 PM",
        manager: "Lisa Brown",
        ventilation: "Active",
        items: ["Interior and exterior paints", "Primers and specialty coatings", "Paint brushes and application tools", "Solvents and thinners"]
      }
    },
    unit6: {
      title: "Unit 06 - Insulation & Foam",
      type: "Paint, Insulation & Materials Storage",
      shelves: [
        {
          name: "Shelf A",
          rows: [
            {
              name: "Row 1",
              items: ["R-13 Batts", "R-19 Batts", "R-30 Batts", "R-38 Batts"]
            },
            {
              name: "Row 2",
              items: ["Foam Board 1\"", "Foam Board 2\"", "Foam Board 3\"", "Foam Board 4\""]
            },
            {
              name: "Row 3",
              items: ["Radiant Barrier", "Reflective Insulation", "Bubble Wrap", "Insulation Blankets"]
            },
            {
              name: "Row 4",
              items: ["Fiberglass Insulation", "Mineral Wool", "Cellulose Insulation", "Spray Foam"]
            },
            {
              name: "Row 5",
              items: ["Expanding Foam", "Foam Gun", "Foam Cleaner", "Great Stuff"]
            },
            {
              name: "Row 6",
              items: ["Foam Sealant", "Caulk Tubes", "Weather Stripping", "Door Seals"]
            },
            {
              name: "Row 7",
              items: ["Window Insulation", "Pipe Insulation", "Duct Insulation", "Tank Insulation"]
            },
            {
              name: "Row 8",
              items: ["Insulation Testing", "Insulation Quality", "Insulation Standards", "Insulation Certification"]
            }
          ]
        },
        {
          name: "Shelf B",
          rows: [
            {
              name: "Row 1",
              items: ["Vapor Barrier", "Tape", "Staple Gun", "Utility Knife"]
            },
            {
              name: "Row 2",
              items: ["Safety Mask", "Gloves", "Safety Goggles", "Protective Clothing"]
            },
            {
              name: "Row 3",
              items: ["Insulation Cutter", "Insulation Knife", "Insulation Saw", "Insulation Scissors"]
            },
            {
              name: "Row 4",
              items: ["Insulation Stapler", "Insulation Gun", "Insulation Applicator", "Insulation Spreader"]
            },
            {
              name: "Row 5",
              items: ["Insulation Support", "Insulation Hangers", "Insulation Clips", "Insulation Brackets"]
            },
            {
              name: "Row 6",
              items: ["Insulation Adhesive", "Insulation Glue", "Insulation Tape", "Insulation Sealant"]
            },
            {
              name: "Row 7",
              items: ["Insulation Tools", "Insulation Equipment", "Insulation Machinery", "Insulation Vehicles"]
            },
            {
              name: "Row 8",
              items: ["Insulation Services", "Insulation Installation", "Insulation Maintenance", "Insulation Repair"]
            }
          ]
        }
      ],
      info: {
        capacity: "78% Full",
        lastUpdate: "Today, 11:20 AM",
        manager: "Tom Wilson",
        temperature: "20°C",
        items: ["Fiberglass and foam insulation", "Spray foam products and applicators", "Vapor barriers and sealing tape", "Installation tools and safety equipment"]
      }
    },
    unit7: {
      title: "Unit 07 - Specialty Materials",
      type: "Paint, Insulation & Materials Storage",
      shelves: [
        {
          name: "Shelf A",
          rows: [
            {
              name: "Row 1 - Waterproofing",
              items: ["Membrane Roll", "Liquid Rubber", "Crack Filler", "Waterproof Paint", "Empty", "Brush Set"]
            },
            {
              name: "Row 2 - Adhesives",
              items: ["Construction Adhesive", "PL Premium", "Gorilla Glue", "Epoxy 2-Part", "Contact Cement", "Hot Glue"]
            }
          ]
        },
        {
          name: "Shelf B",
          rows: [
            {
              name: "Row 1 - Weather Strip Materials",
              items: ["Door Seal", "Window Strip", "Foam Tape", "Rubber Strip", "Empty", "Installation Kit"]
            }
          ]
        }
      ],
      info: {
        capacity: "30% Full - Plenty of Space",
        lastUpdate: "2 days ago",
        manager: "Sarah Davis",
        humidity: "40%",
        items: ["Waterproofing membranes and coatings", "Construction adhesives and sealants", "Weather stripping materials", "Specialty installation tools"]
      }
    },
    unit8: {
      title: "Unit 08 - Roofing Materials",
      type: "Construction Materials Storage",
      shelves: [
        {
          name: "Shelf A",
          rows: [
            {
              name: "Row 1",
              items: ["Asphalt Shingles", "Clay Tiles", "Metal Roofing", "Slate Tiles"]
            },
            {
              name: "Row 2",
              items: ["Composite Shingles", "Wood Shingles", "Cedar Shakes", "Concrete Tiles"]
            },
            {
              name: "Row 3",
              items: ["Ridge Caps", "Hip Caps", "Valley Metal", "Drip Edge"]
            },
            {
              name: "Row 4",
              items: ["Flashing Roll", "Step Flashing", "Chimney Flashing", "Vent Flashing"]
            },
            {
              name: "Row 5",
              items: ["Tar Paper", "Synthetic Felt", "Ice Shield", "Vapor Barrier"]
            },
            {
              name: "Row 6",
              items: ["Roofing Nails", "Staples", "Screws", "Clips"]
            },
            {
              name: "Row 7",
              items: ["Nail Gun", "Hammer", "Chalk Line", "Measuring Tape"]
            },
            {
              name: "Row 8",
              items: ["Safety Harness", "Ladder Hooks", "Roof Brackets", "Safety Rope"]
            },
            {
              name: "Row 9",
              items: ["Roofing Knife", "Utility Knife", "Tin Snips", "Cutting Tools"]
            },
            {
              name: "Row 10",
              items: ["Roofing Cement", "Sealant", "Caulk", "Adhesive"]
            }
          ]
        },
        {
          name: "Shelf B",
          rows: [
            {
              name: "Row 1",
              items: ["Ridge Vents", "Soffit Vents", "Gable Vents", "Turbine Vents", "Static Vents"]
            },
            {
              name: "Row 2",
              items: ["Gutter Guards", "Downspouts", "Gutters", "Gutter Hangers", "Gutter Screws"]
            },
            {
              name: "Row 3",
              items: ["Chimney Caps", "Chimney Liners", "Chimney Flashing", "Chimney Crown", "Chimney Mortar"]
            },
            {
              name: "Row 4",
              items: ["Skylights", "Roof Windows", "Solar Panels", "Roof Fans", "Attic Fans"]
            },
            {
              name: "Row 5",
              items: ["Roof Insulation", "Attic Insulation", "Vapor Barriers", "Insulation Baffles", "Insulation Supports"]
            },
            {
              name: "Row 6",
              items: ["Roofing Underlayment", "Synthetic Underlayment", "Felt Paper", "Ice & Water Shield", "Peel & Stick"]
            },
            {
              name: "Row 7",
              items: ["Roofing Tools", "Roofing Ladders", "Roofing Scaffolding", "Roofing Safety", "Roofing Equipment"]
            },
            {
              name: "Row 8",
              items: ["Roofing Accessories", "Roofing Hardware", "Roofing Fasteners", "Roofing Clips", "Roofing Brackets"]
            },
            {
              name: "Row 9",
              items: ["Roofing Sealants", "Roofing Adhesives", "Roofing Tapes", "Roofing Patches", "Roofing Repairs"]
            },
            {
              name: "Row 10",
              items: ["Roofing Cleaners", "Roofing Treatments", "Roofing Coatings", "Roofing Paints", "Roofing Stains"]
            },
            {
              name: "Row 11",
              items: ["Roofing Membranes", "Roofing Systems", "Roofing Kits", "Roofing Packages", "Roofing Bundles"]
            },
            {
              name: "Row 12",
              items: ["Roofing Components", "Roofing Parts", "Roofing Materials", "Roofing Supplies", "Roofing Inventory"]
            },
            {
              name: "Row 13",
              items: ["Roofing Equipment", "Roofing Machinery", "Roofing Vehicles", "Roofing Transport", "Roofing Logistics"]
            },
            {
              name: "Row 14",
              items: ["Roofing Services", "Roofing Installation", "Roofing Maintenance", "Roofing Repair", "Roofing Inspection"]
            },
            {
              name: "Row 15",
              items: ["Roofing Safety", "Roofing PPE", "Roofing Training", "Roofing Certification", "Roofing Standards"]
            },
            {
              name: "Row 16",
              items: ["Roofing Documentation", "Roofing Manuals", "Roofing Guides", "Roofing Instructions", "Roofing Procedures"]
            },
            {
              name: "Row 17",
              items: ["Roofing Quality", "Roofing Testing", "Roofing Inspection", "Roofing Certification", "Roofing Compliance"]
            },
            {
              name: "Row 18",
              items: ["Roofing Warranty", "Roofing Guarantee", "Roofing Support", "Roofing Service", "Roofing Maintenance"]
            },
            {
              name: "Row 19",
              items: ["Roofing Innovation", "Roofing Technology", "Roofing Solutions", "Roofing Systems", "Roofing Products"]
            },
            {
              name: "Row 20",
              items: ["Roofing Future", "Roofing Trends", "Roofing Development", "Roofing Research", "Roofing Innovation"]
            }
          ]
        }
      ],
      info: {
        capacity: "75% Full",
        lastUpdate: "Today, 10:15 AM",
        manager: "Carlos Martinez",
        temperature: "23°C",
        items: ["Roofing shingles and tiles", "Underlayment materials", "Flashing and trim pieces", "Roofing installation tools"]
      }
    },
    unit9: {
      title: "Unit 09 - Hardware & Fasteners",
      type: "Paint, Insulation & Materials Storage",
      shelves: [
        {
          name: "Shelf A",
          rows: [
            {
              name: "Row 1",
              items: ["Wood Screws", "Drywall Screws", "Carriage Bolts", "Machine Screws"]
            },
            {
              name: "Row 2",
              items: ["Lag Bolts", "Eye Bolts", "Hex Bolts", "Socket Bolts"]
            },
            {
              name: "Row 3",
              items: ["Cap Screws", "Set Screws", "Thumb Screws", "Wing Screws"]
            },
            {
              name: "Row 4",
              items: ["Self-Tapping Screws", "Sheet Metal Screws", "Deck Screws", "Concrete Screws"]
            },
            {
              name: "Row 5",
              items: ["Stainless Steel Screws", "Galvanized Screws", "Brass Screws", "Aluminum Screws"]
            },
            {
              name: "Row 6",
              items: ["Phillips Screws", "Flat Head Screws", "Round Head Screws", "Pan Head Screws"]
            },
            {
              name: "Row 7",
              items: ["Button Head Screws", "Oval Head Screws", "Truss Head Screws", "Fillister Head Screws"]
            },
            {
              name: "Row 8",
              items: ["Screw Drivers", "Screw Bits", "Screw Extractors", "Screw Gauges"]
            }
          ]
        },
        {
          name: "Shelf B",
          rows: [
            {
              name: "Row 1",
              items: ["Framing Nails", "Finish Nails", "Roofing Nails", "Brad Nails"]
            },
            {
              name: "Row 2",
              items: ["Staples", "Tacks", "Upholstery Nails", "Decorative Nails"]
            },
            {
              name: "Row 3",
              items: ["Hinges", "Door Knobs", "Locks", "Brackets"]
            },
            {
              name: "Row 4",
              items: ["Handles", "Cabinet Hardware", "Drawer Slides", "Cabinet Hinges"]
            },
            {
              name: "Row 5",
              items: ["Door Hardware", "Window Hardware", "Gate Hardware", "Fence Hardware"]
            },
            {
              name: "Row 6",
              items: ["Hardware Tools", "Hardware Installation", "Hardware Repair", "Hardware Maintenance"]
            },
            {
              name: "Row 7",
              items: ["Hardware Supplies", "Hardware Accessories", "Hardware Components", "Hardware Parts"]
            },
            {
              name: "Row 8",
              items: ["Hardware Testing", "Hardware Quality", "Hardware Standards", "Hardware Certification"]
            }
          ]
        },
        {
          name: "Shelf C",
          rows: [
            {
              name: "Row 1",
              items: ["Concrete Anchors", "Toggle Bolts", "Molly Bolts", "Expansion Bolts"]
            },
            {
              name: "Row 2",
              items: ["Threaded Rods", "Washers", "Nuts", "Lock Washers"]
            },
            {
              name: "Row 3",
              items: ["Spring Washers", "Flat Washers", "Fender Washers", "Countersunk Washers"]
            },
            {
              name: "Row 4",
              items: ["Hex Nuts", "Lock Nuts", "Wing Nuts", "Cap Nuts"]
            },
            {
              name: "Row 5",
              items: ["Acorn Nuts", "Flange Nuts", "Square Nuts", "T-Nuts"]
            },
            {
              name: "Row 6",
              items: ["Rivets", "Pop Rivets", "Blind Rivets", "Solid Rivets"]
            },
            {
              name: "Row 7",
              items: ["Rivet Tools", "Rivet Guns", "Rivet Sets", "Rivet Anvils"]
            },
            {
              name: "Row 8",
              items: ["Fastener Testing", "Fastener Quality", "Fastener Standards", "Fastener Certification"]
            }
          ]
        }
      ],
      info: {
        capacity: "65% Full",
        lastUpdate: "Yesterday, 2:30 PM",
        manager: "Angela Foster",
        temperature: "22°C",
        items: ["Screws, bolts, and threaded fasteners", "Nails, staples, and brad nails", "Door and cabinet hardware", "Brackets and mounting accessories"]
      }
    }
  };

  const openShelfView = (unitId) => {
    setSelectedUnit(shelfLayouts[unitId]);
    setIsModalOpen(true);
  };

  const closeShelfView = () => {
    setIsModalOpen(false);
    setSelectedUnit(null);
  };

  const getStatusColor = (unitName) => {
    const capacity = unitCapacities[unitName];
    if (!capacity) return 'bg-gray-400'; // Loading or no data
    
    switch (capacity.status) {
      case 'full': return 'bg-red-500';      // 90%+ occupied
      case 'occupied': return 'bg-yellow-500'; // 60-89% occupied  
      case 'available': return 'bg-green-500'; // <60% occupied
      default: return 'bg-gray-400';
    }
  };

  // Get capacity info for tooltip
  const getCapacityInfo = (unitName) => {
    const capacity = unitCapacities[unitName];
    if (!capacity) return 'Loading...';
    
    const percentage = (capacity.occupancyRate * 100).toFixed(1);
    return `${capacity.productCount}/${capacity.totalSlots} slots (${percentage}%)`;
  };

  return (
    <div className="max-w-7xl mx-auto p-5">
      {/* Legend */}
      <div className="flex justify-center gap-5 mb-8 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Available (&lt;60%)</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Occupied (60-89%)</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Full (90%+)</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-sm font-medium">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            <span>Loading capacity data...</span>
          </div>
        )}
      </div>

      {/* Facility Map */}
      <div className="bg-transparent rounded-2xl p-10 relative min-h-[600px]">
        <div className="grid grid-cols-7 grid-rows-3 gap-0.5 h-[500px] relative bg-gray-50 border-4 border-slate-800 p-1 w-full">
          {/* Construction Materials Units 01-05 (Bottom row) */}
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm hover:bg-blue-50 hover:border-blue-500 border-red-500 bg-red-50 row-start-3 col-start-1"
            onClick={() => openShelfView('unit1')}
            title={`Unit 01 - ${getCapacityInfo('Unit 01')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 01')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 01</div>
            <div className="text-sm text-gray-600 font-medium">Steel & Heavy Materials</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm hover:bg-blue-50 hover:border-blue-500 border-red-500 bg-red-50 row-start-3 col-start-2"
            onClick={() => openShelfView('unit2')}
            title={`Unit 02 - ${getCapacityInfo('Unit 02')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 02')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 02</div>
            <div className="text-sm text-gray-600 font-medium">Lumber & Wood</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm hover:bg-blue-50 hover:border-blue-500 border-red-500 bg-red-50 row-start-3 col-start-3"
            onClick={() => openShelfView('unit3')}
            title={`Unit 03 - ${getCapacityInfo('Unit 03')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 03')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 03</div>
            <div className="text-sm text-gray-600 font-medium">Cement & Aggregate</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm hover:bg-blue-50 hover:border-blue-500 border-red-500 bg-red-50 row-start-3 col-start-4"
            onClick={() => openShelfView('unit4')}
            title={`Unit 04 - ${getCapacityInfo('Unit 04')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 04')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 04</div>
            <div className="text-sm text-gray-600 font-medium">Electrical & Plumbing</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm hover:bg-blue-50 hover:border-blue-500 border-orange-500 bg-orange-50 row-start-3 col-start-5"
            onClick={() => openShelfView('unit5')}
            title={`Unit 05 - ${getCapacityInfo('Unit 05')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 05')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 05</div>
            <div className="text-sm text-gray-600 font-medium">Paint & Coatings</div>
          </div>
          
          {/* Upper units */}
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm hover:bg-blue-50 hover:border-blue-500 border-orange-500 bg-orange-50 row-start-1 col-start-6"
            onClick={() => openShelfView('unit6')}
            title={`Unit 06 - ${getCapacityInfo('Unit 06')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 06')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 06</div>
            <div className="text-sm text-gray-600 font-medium">Insulation & Foam</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm hover:bg-blue-50 hover:border-blue-500 border-orange-500 bg-orange-50 row-start-2 col-start-6"
            onClick={() => openShelfView('unit7')}
            title={`Unit 07 - ${getCapacityInfo('Unit 07')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 07')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 07</div>
            <div className="text-sm text-gray-600 font-medium">Specialty Materials</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm hover:bg-blue-50 hover:border-blue-500 border-green-500 bg-green-50 row-start-1 col-start-7"
            onClick={() => openShelfView('unit8')}
            title={`Unit 08 - ${getCapacityInfo('Unit 08')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 08')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 08</div>
            <div className="text-sm text-gray-600 font-medium">Roofing Materials</div>
          </div>
          
          <div 
            className="bg-white border-2 border-slate-800 p-4 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm hover:bg-blue-50 hover:border-blue-500 border-green-500 bg-green-50 row-start-2 col-start-7"
            onClick={() => openShelfView('unit9')}
            title={`Unit 09 - ${getCapacityInfo('Unit 09')}`}
          >
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor('Unit 09')}`}></div>
            <div className="text-lg font-bold mb-1 text-slate-800">Unit 09</div>
            <div className="text-sm text-gray-600 font-medium">Hardware & Fasteners</div>
          </div>
          
          {/* Front Desk - Static, non-clickable */}
          <div className="bg-gray-300 border-2 border-gray-500 p-4 relative z-10 flex flex-col justify-center items-center text-center min-h-[80px] text-sm font-bold row-start-3 col-start-6 col-span-2">
            <div className="text-sm text-gray-600 font-medium">Front Desk</div>
          </div>
        </div>
      </div>

      {/* Shelf View Modal */}
      <ShelfViewModal 
        isOpen={isModalOpen}
        onClose={closeShelfView}
        selectedUnit={selectedUnit}
      />
    </div>
  );
};

export default StorageFacilityInteractiveMap;