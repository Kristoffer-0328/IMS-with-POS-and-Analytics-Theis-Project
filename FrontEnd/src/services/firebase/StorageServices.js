// StorageServices.js - Service for managing storage units and locations
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import app from './config';

const db = getFirestore(app);

/**
 * Initialize default storage units in Firestore
 * This creates the basic structure for all storage units
 */
export const initializeStorageUnits = async () => {
  try {
    const storageUnits = [
      {
        id: 'Unit 01',
        name: 'Unit 01',
        type: 'Construction Materials Storage',
        category: 'Steel & Heavy Materials',
        shelves: [
          { name: 'Shelf A', rows: 8, columns: 4 },
          { name: 'Shelf B', rows: 13, columns: 5 },
          { name: 'Shelf C', rows: 6, columns: 6 }
        ],
        totalCapacity: 161, // 32 + 65 + 36
        status: 'active'
      },
      {
        id: 'Unit 02',
        name: 'Unit 02',
        type: 'Generic',
        category: 'Lumber & Wood',
        shelves: [
          { name: 'Shelf A', rows: 8, columns: 4 }
        ],
        totalCapacity: 32,
        status: 'active'
      },
      {
        id: 'Unit 03',
        name: 'Unit 03',
        type: 'Generic',
        category: 'Cement & Aggregate',
        shelves: [
          { name: 'Shelf A', rows: 8, columns: 4 },
          { name: 'Shelf B', rows: 8, columns: 4 }
        ],
        totalCapacity: 64,
        status: 'active'
      },
      {
        id: 'Unit 04',
        name: 'Unit 04',
        type: 'Generic',
        category: 'Electrical & Plumbing',
        shelves: [
          { name: 'Shelf A', rows: 8, columns: 4 },
          { name: 'Shelf B', rows: 8, columns: 4 }
        ],
        totalCapacity: 64,
        status: 'active'
      },
      {
        id: 'Unit 05',
        name: 'Unit 05',
        type: 'Generic',
        category: 'Paint & Coating',
        shelves: [
          { name: 'Shelf A', rows: 8, columns: 4 },
          { name: 'Shelf B', rows: 8, columns: 4 }
        ],
        totalCapacity: 64,
        status: 'active'
      },
      {
        id: 'Unit 06',
        name: 'Unit 06',
        type: 'Generic',
        category: 'Insulation & Foam',
        shelves: [
          { name: 'Shelf A', rows: 8, columns: 4 },
          { name: 'Shelf B', rows: 8, columns: 4 }
        ],
        totalCapacity: 64,
        status: 'active'
      },
      {
        id: 'Unit 07',
        name: 'Unit 07',
        type: 'Generic',
        category: 'Specialty Materials',
        shelves: [
          { name: 'Shelf A', rows: 2, columns: 4 },
          { name: 'Shelf B', rows: 1, columns: 4 }
        ],
        totalCapacity: 12,
        status: 'active'
      },
      {
        id: 'Unit 08',
        name: 'Unit 08',
        type: 'Generic',
        category: 'Roofing Materials',
        shelves: [
          { name: 'Shelf A', rows: 10, columns: 4 },
          { name: 'Shelf B', rows: 20, columns: 5 }
        ],
        totalCapacity: 140,
        status: 'active'
      },
      {
        id: 'Unit 09',
        name: 'Unit 09',
        type: 'Generic',
        category: 'Hardware & Fasteners',
        shelves: [
          { name: 'Shelf A', rows: 8, columns: 4 },
          { name: 'Shelf B', rows: 8, columns: 4 },
          { name: 'Shelf C', rows: 8, columns: 4 }
        ],
        totalCapacity: 96,
        status: 'active'
      }
    ];

    // Create StorageUnits collection and add all units
    for (const unit of storageUnits) {
      const unitRef = doc(db, 'StorageUnits', unit.id);
      await setDoc(unitRef, {
        ...unit,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }

    console.log('✅ Storage units initialized successfully');
    return { success: true, count: storageUnits.length };
  } catch (error) {
    console.error('Error initializing storage units:', error);
    return { success: false, error };
  }
};

/**
 * Get all storage units
 */
export const getStorageUnits = async () => {
  try {
    const storageUnitsRef = collection(db, 'StorageUnits');
    const snapshot = await getDocs(storageUnitsRef);
    
    const units = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: units };
  } catch (error) {
    console.error('Error fetching storage units:', error);
    return { success: false, error };
  }
};

/**
 * Get a specific storage unit by ID
 */
export const getStorageUnit = async (unitId) => {
  try {
    const unitRef = doc(db, 'StorageUnits', unitId);
    const unitDoc = await getDoc(unitRef);
    
    if (unitDoc.exists()) {
      return { 
        success: true, 
        data: { id: unitDoc.id, ...unitDoc.data() } 
      };
    } else {
      return { success: false, error: 'Storage unit not found' };
    }
  } catch (error) {
    console.error('Error fetching storage unit:', error);
    return { success: false, error };
  }
};

/**
 * Get storage location details (for shelf view modal)
 */
export const getStorageLocationData = async (unitId) => {
  try {
    const result = await getStorageUnit(unitId);
    if (result.success) {
      const unit = result.data;
      
      // Format for ShelfViewModal
      return {
        success: true,
        data: {
          title: unit.name,
          type: unit.type,
          category: unit.category,
          shelves: unit.shelves.map(shelf => ({
            name: shelf.name,
            rows: Array.from({ length: shelf.rows }, (_, i) => ({
              name: `Row ${i + 1}`,
              columns: shelf.columns
            }))
          }))
        }
      };
    }
    return result;
  } catch (error) {
    console.error('Error getting storage location data:', error);
    return { success: false, error };
  }
};
