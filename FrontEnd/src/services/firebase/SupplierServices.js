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
      const requiredFields = ['name', 'primaryCode', 'address', 'contactPerson', 'phone', 'email'];
      const missingFields = requiredFields.filter(field => !supplierData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const newSupplier = {
        name: supplierData.name,
        primaryCode: supplierData.primaryCode,
        address: supplierData.address,
        contactPerson: supplierData.contactPerson,
        phone: supplierData.phone,
        email: supplierData.email,
        supplierCodes: supplierData.supplierCodes || [],
        leadTime: supplierData.leadTime || 7,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        // Ensure supplier document is visible in Firestore
        _hasProducts: false, // Will be set to true when first product is linked
        totalProducts: 0
      };

      // Use 'Suppliers' (capital S) for new architecture
      const docRef = await addDoc(collection(db, 'Suppliers'), newSupplier);
      
      console.log(`✅ Created supplier: ${newSupplier.name} (ID: ${docRef.id})`);
      
      return { success: true, id: docRef.id, data: { id: docRef.id, ...newSupplier } };
    } catch (error) {
      console.error('❌ Error creating supplier:', error);
      return { success: false, error: error.message };
    }
  };

  // Update Supplier
  const updateSupplier = async (supplierId, updateData) => {
    try {
      // Validate update data
      const allowedFields = ['name', 'primaryCode', 'address', 'contactPerson', 'phone', 'email', 'status', 'supplierCodes', 'leadTime'];
      const invalidFields = Object.keys(updateData).filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
      }

      // Try new collection first
      let supplierRef = doc(db, 'Suppliers', supplierId);
      let supplierDoc = await getDoc(supplierRef);
      
      if (!supplierDoc.exists()) {
        // Try old collection
        console.log('📦 Supplier not found in "Suppliers", trying "suppliers" collection...');
        supplierRef = doc(db, 'suppliers', supplierId);
        supplierDoc = await getDoc(supplierRef);
        
        if (!supplierDoc.exists()) {
          throw new Error('Supplier not found in any collection');
        }
        console.log('Updating supplier in old "suppliers" collection');
      }
      
      await updateDoc(supplierRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating supplier:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete Supplier
  const deleteSupplier = async (supplierId) => {
    try {
      // Try new collection first
      let supplierRef = doc(db, 'Suppliers', supplierId);
      let supplierDoc = await getDoc(supplierRef);
      
      if (!supplierDoc.exists()) {
        // Try old collection
        console.log('📦 Supplier not found in "Suppliers", trying "suppliers" collection...');
        supplierRef = doc(db, 'suppliers', supplierId);
        supplierDoc = await getDoc(supplierRef);
        
        if (!supplierDoc.exists()) {
          throw new Error('Supplier not found in any collection');
        }
        console.log('Deleting supplier from old "suppliers" collection');
      }
      
      await deleteDoc(supplierRef);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting supplier:', error);
      return { success: false, error: error.message };
    }
  };

  // Get Supplier by ID
  const getSupplier = async (supplierId) => {
    try {
      // Try new collection first (Suppliers - capital S)
      let supplierDoc = await getDoc(doc(db, 'Suppliers', supplierId));
      
      if (supplierDoc.exists()) {
        return { success: true, data: { id: supplierDoc.id, ...supplierDoc.data() } };
      }
      
      // If not found, try old collection (suppliers - lowercase)
      console.log('📦 Supplier not found in "Suppliers", checking "suppliers" collection...');
      supplierDoc = await getDoc(doc(db, 'suppliers', supplierId));
      
      if (supplierDoc.exists()) {
        console.log('Found supplier in old "suppliers" collection');
        return { success: true, data: { id: supplierDoc.id, ...supplierDoc.data() } };
      }
      
      return { success: false, error: 'Supplier not found' };
    } catch (error) {
      console.error('❌ Error getting supplier:', error);
      return { success: false, error: error.message };
    }
  };

  // List Suppliers with optional filters
  const listSuppliers = async (filters = {}) => {
    try {
      // Try new collection first (Suppliers - capital S)
      let q = collection(db, 'Suppliers');
      
      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      
      // Always sort by name
      q = query(q, orderBy('name'));
      
      let querySnapshot = await getDocs(q);
      let suppliers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If new collection is empty, try old collection (suppliers - lowercase)
      if (suppliers.length === 0) {
        console.log('📦 No suppliers in "Suppliers" collection, checking "suppliers" collection...');
        
        let oldQ = collection(db, 'suppliers');
        
        // Apply same filters to old collection
        if (filters.status) {
          oldQ = query(oldQ, where('status', '==', filters.status));
        }
        if (filters.category) {
          oldQ = query(oldQ, where('category', '==', filters.category));
        }
        oldQ = query(oldQ, orderBy('name'));
        
        const oldQuerySnapshot = await getDocs(oldQ);
        suppliers = oldQuerySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${suppliers.length} suppliers in old "suppliers" collection`);
      } else {
        console.log(`Found ${suppliers.length} suppliers in new "Suppliers" collection`);
      }
      
      return { success: true, data: suppliers };
    } catch (error) {
      console.error('❌ Error listing suppliers:', error);
      return { success: false, error: error.message };
    }
  };

  // Search Suppliers
  const searchSuppliers = async (searchTerm) => {
    try {
      // Note: Firestore doesn't support native text search
      // This is a simple implementation that searches by name prefix
      
      // Try new collection first
      let q = query(
        collection(db, 'Suppliers'),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        orderBy('name'),
        limit(10)
      );
      
      let querySnapshot = await getDocs(q);
      let suppliers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If no results, try old collection
      if (suppliers.length === 0) {
        console.log('📦 No suppliers found in "Suppliers", searching "suppliers" collection...');
        
        q = query(
          collection(db, 'suppliers'),
          where('name', '>=', searchTerm),
          where('name', '<=', searchTerm + '\uf8ff'),
          orderBy('name'),
          limit(10)
        );
        
        querySnapshot = await getDocs(q);
        suppliers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${suppliers.length} suppliers in old "suppliers" collection`);
      }
      
      return { success: true, data: suppliers };
    } catch (error) {
      console.error('❌ Error searching suppliers:', error);
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
