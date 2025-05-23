import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getFirestore,
  limit
} from 'firebase/firestore';
import app from '../../FirebaseConfig';

const db = getFirestore(app);

export const useSupplierServices = () => {
  // Create Supplier
  const createSupplier = async (supplierData) => {
    try {
      // Validate required fields
      const requiredFields = ['name', 'code', 'address', 'contactPerson', 'phone', 'email'];
      const missingFields = requiredFields.filter(field => !supplierData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const newSupplier = {
        name: supplierData.name,
        code: supplierData.code,
        address: supplierData.address,
        contactPerson: supplierData.contactPerson,
        phone: supplierData.phone,
        email: supplierData.email,
        supplierCodes: supplierData.supplierCodes || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      };

      const docRef = await addDoc(collection(db, 'suppliers'), newSupplier);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating supplier:', error);
      return { success: false, error: error.message };
    }
  };

  // Update Supplier
  const updateSupplier = async (supplierId, updateData) => {
    try {
      // Validate update data
      const allowedFields = ['name', 'code', 'address', 'contactPerson', 'phone', 'email', 'status', 'supplierCodes'];
      const invalidFields = Object.keys(updateData).filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
      }

      const supplierRef = doc(db, 'suppliers', supplierId);
      await updateDoc(supplierRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete Supplier
  const deleteSupplier = async (supplierId) => {
    try {
      await deleteDoc(doc(db, 'suppliers', supplierId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return { success: false, error: error.message };
    }
  };

  // Get Supplier by ID
  const getSupplier = async (supplierId) => {
    try {
      const supplierDoc = await getDoc(doc(db, 'suppliers', supplierId));
      if (supplierDoc.exists()) {
        return { success: true, data: { id: supplierDoc.id, ...supplierDoc.data() } };
      }
      return { success: false, error: 'Supplier not found' };
    } catch (error) {
      console.error('Error getting supplier:', error);
      return { success: false, error: error.message };
    }
  };

  // List Suppliers with optional filters
  const listSuppliers = async (filters = {}) => {
    try {
      let q = collection(db, 'suppliers');
      
      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      
      // Always sort by name
      q = query(q, orderBy('name'));
      
      const querySnapshot = await getDocs(q);
      const suppliers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: suppliers };
    } catch (error) {
      console.error('Error listing suppliers:', error);
      return { success: false, error: error.message };
    }
  };

  // Search Suppliers
  const searchSuppliers = async (searchTerm) => {
    try {
      // Note: Firestore doesn't support native text search
      // This is a simple implementation that searches by name prefix
      const q = query(
        collection(db, 'suppliers'),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        orderBy('name'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const suppliers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: suppliers };
    } catch (error) {
      console.error('Error searching suppliers:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplier,
    listSuppliers,
    searchSuppliers
  };
}; 