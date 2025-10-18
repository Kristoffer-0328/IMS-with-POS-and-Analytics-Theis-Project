// StorageServices.js - Service for managing storage units and locations
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import app from './config';
import { STORAGE_UNITS } from '../../features/inventory/config/StorageUnitsConfig';

const db = getFirestore(app);

/**
 * Initialize storage units from detailed config (StorageUnitsConfig.js)
 * This creates the complete structure with all shelves, rows, and capacity details
 */
export const initializeStorageUnitsFromConfig = async () => {
  try {
    // Create StorageUnits collection and add all units from config
    for (const unit of STORAGE_UNITS) {
      const unitRef = doc(db, 'StorageUnits', unit.id);
      await setDoc(unitRef, {
        ...unit,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }

    console.log('✅ Storage units initialized from config successfully');
    return { success: true, count: STORAGE_UNITS.length };
  } catch (error) {
    console.error('Error initializing storage units from config:', error);
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
 * Update a storage unit
 */
export const updateStorageUnit = async (unitId, unitData) => {
  try {
    const unitRef = doc(db, 'StorageUnits', unitId);
    await setDoc(unitRef, {
      ...unitData,
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    console.log('✅ Storage unit updated successfully:', unitId);
    return { success: true };
  } catch (error) {
    console.error('Error updating storage unit:', error);
    return { success: false, error };
  }
};

/**
 * Delete a storage unit
 */
export const deleteStorageUnit = async (unitId) => {
  try {
    const unitRef = doc(db, 'StorageUnits', unitId);
    await deleteDoc(unitRef);

    console.log('✅ Storage unit deleted successfully:', unitId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting storage unit:', error);
    return { success: false, error };
  }
};

/**
 * Create a new storage unit
 */
export const createStorageUnit = async (unitData) => {
  try {
    const unitRef = doc(db, 'StorageUnits', unitData.id);
    await setDoc(unitRef, {
      ...unitData,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    console.log('✅ Storage unit created successfully:', unitData.id);
    return { success: true };
  } catch (error) {
    console.error('Error creating storage unit:', error);
    return { success: false, error };
  }
};
