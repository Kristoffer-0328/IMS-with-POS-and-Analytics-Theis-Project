import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
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
    status: 'active',
    supplierCodes: []
  });
  const [newCode, setNewCode] = useState({ code: '', description: '' });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewCodeChange = (e) => {
    const { name, value } = e.target;
    setNewCode(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addSupplierCode = () => {
    if (!newCode.code || !newCode.description) {
      alert('Please enter both code and description');
      return;
    }

    // Check for duplicate codes
    if (formData.supplierCodes.some(code => code.code === newCode.code)) {
      alert('This supplier code already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      supplierCodes: [...prev.supplierCodes, { ...newCode }]
    }));
    setNewCode({ code: '', description: '' });
  };

  const removeSupplierCode = (codeToRemove) => {
    setFormData(prev => ({
      ...prev,
      supplierCodes: prev.supplierCodes.filter(code => code.code !== codeToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (supplier) {
        // Update existing supplier
        result = await supplierServices.updateSupplier(supplier.id, formData);
      } else {
        // Create new supplier
        result = await supplierServices.createSupplier(formData);
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
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
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
              <input
                type="text"
                name="primaryCode"
                value={formData.primaryCode}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter primary supplier code"
              />
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

            <div className="col-span-2 mt-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Product Supplier Codes</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Code
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={newCode.code}
                      onChange={handleNewCodeChange}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Enter supplier code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="description"
                        value={newCode.description}
                        onChange={handleNewCodeChange}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="Enter code description"
                      />
                      <button
                        type="button"
                        onClick={addSupplierCode}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        <FiPlus size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {formData.supplierCodes.length > 0 ? (
                  <div className="mt-4">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.supplierCodes.map((code, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{code.code}</td>
                            <td className="px-3 py-2 text-sm">{code.description}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeSupplierCode(code.code)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <FiTrash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No supplier codes added yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-4">
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
              {loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSupplierModal; 