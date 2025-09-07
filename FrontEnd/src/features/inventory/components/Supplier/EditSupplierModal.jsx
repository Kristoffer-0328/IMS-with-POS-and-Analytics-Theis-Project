import React, { useState, useEffect } from 'react';
import { FiX, FiTrash2 } from 'react-icons/fi';
import { useSupplierServices } from '../../../../services/firebase/SupplierServices';

const EditSupplierModal = ({ supplier, onClose }) => {
  const supplierServices = useSupplierServices();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    primaryCode: '',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    status: 'active'
  });
  
  // Determine if we're creating a new supplier or editing an existing one
  // If supplier is null or has no meaningful id, we're creating
  const isCreating = !supplier || !supplier.id || supplier.id === '';

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        primaryCode: supplier.primaryCode || supplier.code || '',
        address: supplier.address || '',
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        status: supplier.status || 'active',
        supplierCodes: supplier.supplierCodes || []
      });
    }
  }, [supplier]);

  const [primaryCodeError, setPrimaryCodeError] = useState('');
  
  // Function to check if all required fields are filled
  const isFormValid = () => {
    return (
      formData.name?.trim() !== '' &&
      formData.primaryCode?.trim() !== '' &&
      formData.address?.trim() !== '' &&
      formData.contactPerson?.trim() !== '' &&
      formData.phone?.trim() !== '' &&
      formData.email?.trim() !== '' &&
      !primaryCodeError // Also ensure there are no validation errors
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error when primary code field is modified
    if (name === 'primaryCode') {
      setPrimaryCodeError('');
      // Validate format in real-time
      if (value && !validatePrimaryCode(value)) {
        setPrimaryCodeError('Primary code should only contain letters, numbers, and hyphens');
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const validatePrimaryCode = (code) => {
    if (!code) return false;
    // Primary code should be alphanumeric and may include hyphens
    const codeRegex = /^[A-Za-z0-9-]+$/;
    return codeRegex.test(code.toString());
  };

  const handleDelete = async () => {
    if (!supplier || !supplier.id) return;
    
    const confirmMessage = `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      setLoading(true);
      try {
        const result = await supplierServices.deleteSupplier(supplier.id);
        if (result.success) {
          onClose();
        } else {
          alert(result.error || 'Failed to delete supplier');
        }
      } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Failed to delete supplier: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate primary code format
    if (!validatePrimaryCode(formData.primaryCode)) {
      alert('Primary code should only contain letters, numbers, and hyphens');
      return;
    }

    setLoading(true);

    try {
      let result;
      
      if (isCreating) {
        // Create new supplier
        result = await supplierServices.createSupplier({
          name: formData.name,
          primaryCode: formData.primaryCode,
          address: formData.address,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
          status: formData.status
        });
      } else {
        // Update existing supplier
        result = await supplierServices.updateSupplier(supplier.id, {
          name: formData.name,
          primaryCode: formData.primaryCode,
          address: formData.address,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
          status: formData.status
        });
      }

      if (result.success) {
        onClose();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Failed to save supplier: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold">
            {isCreating ? 'Add New Supplier' : 'Edit Supplier'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter supplier name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Code
              </label>
              <div>
                <input
                  type="text"
                  name="primaryCode"
                  value={formData.primaryCode}
                  onChange={handleChange}
                  required
                  className={`w-full border rounded-lg px-3 py-2 ${
                    primaryCodeError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter primary supplier code"
                />
                {primaryCodeError && (
                  <p className="mt-1 text-sm text-red-500">{primaryCodeError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  This code will be used to link products to this supplier
                </p>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                rows={3}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter complete address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter contact person name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

          </div>

          <div className="mt-6 flex justify-between">
            {/* Delete button - only show when editing existing supplier */}
            {!isCreating && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                <FiTrash2 size={16} />
                Delete Supplier
              </button>
            )}
            
            {/* Right side buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading 
                  ? (isCreating ? 'Adding...' : 'Updating...') 
                  : (isCreating ? 'Add Supplier' : 'Update Supplier')
                }
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default EditSupplierModal; 