import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const SupplierSelector = ({ onSelect, selectedSupplierId }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore(app);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const suppliersRef = collection(db, 'suppliers');
        const snapshot = await getDocs(suppliersRef);
        const suppliersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure code is always available
          code: doc.data().code || doc.id
        }));
        
        console.log('Fetched suppliers:', suppliersList);
        setSuppliers(suppliersList);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  const handleSupplierChange = (e) => {
    const selectedSupplier = suppliers.find(s => s.id === e.target.value);
    if (selectedSupplier) {
      // Ensure the supplier object has all necessary fields
      const enhancedSupplier = {
        ...selectedSupplier,
        // If code is missing, use ID as fallback
        code: selectedSupplier.code || selectedSupplier.id,
        // Ensure other required fields exist
        name: selectedSupplier.name || 'Unknown Supplier',
        address: selectedSupplier.address || '',
        contactPerson: selectedSupplier.contactPerson || '',
        phone: selectedSupplier.phone || '',
        email: selectedSupplier.email || ''
      };
      console.log('Selected supplier:', enhancedSupplier);
      onSelect(enhancedSupplier);
    } else {
      onSelect(null);
    }
  };

  if (loading) {
    return (
      <select disabled className="w-full border rounded-lg px-3 py-2 bg-gray-100">
        <option>Loading suppliers...</option>
      </select>
    );
  }

  return (
    <select
      value={selectedSupplierId || ''}
      onChange={handleSupplierChange}
      className="w-full border rounded-lg px-3 py-2"
      required
    >
      <option value="">-- Select Supplier --</option>
      {suppliers.map(supplier => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.name} ({supplier.code})
        </option>
      ))}
    </select>
  );
};

export default SupplierSelector; 