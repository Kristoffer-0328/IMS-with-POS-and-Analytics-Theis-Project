import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiGrid, FiList, FiBell, FiCalendar } from 'react-icons/fi';
import { useSupplierServices } from '../../../services/firebase/SupplierServices';
import EditSupplierModal from '../components/Supplier/EditSupplierModal';
import SupplierProducts from '../components/Supplier/SupplierProducts';

const SupplierManagement = () => {
  const supplierServices = useSupplierServices();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'table' or 'card'

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const result = await supplierServices.listSuppliers();
      if (result.success) {
        setSuppliers(result.data);
      } else {
        console.error('Failed to load suppliers:', result.error);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    // If supplier is null, it means we're adding a new supplier
    if (!supplier) {
      setSelectedSupplier({
        name: '',
        primaryCode: '',
        code: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        status: 'active'
      });
    } else {
      setSelectedSupplier(supplier);
    }
    setShowEditModal(true);
  };

  const handleViewProducts = (supplier) => {
    setSelectedSupplier(supplier);
    setShowProductsModal(true);
  };

  const handleDelete = async (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        const result = await supplierServices.deleteSupplier(supplierId);
        if (result.success) {
          await loadSuppliers();
        } else {
          console.error('Failed to delete supplier:', result.error);
        }
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  const handleModalClose = () => {
    setShowEditModal(false);
    setShowProductsModal(false);
    setSelectedSupplier(null);
    loadSuppliers();
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'table' ? 'card' : 'table');
  };

  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primary Code</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {suppliers.map((supplier) => (
            <tr key={supplier.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{supplier.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{supplier.primaryCode || supplier.code}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{supplier.contactPerson}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{supplier.phone}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{supplier.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {supplier.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-3">
                <button
                  onClick={() => handleViewProducts(supplier)}
                  className="text-green-600 hover:text-green-900"
                  title="View Products"
                >
                  <FiPackage className="inline" size={18} />
                </button>
                <button
                  onClick={() => handleEdit(supplier)}
                  className="text-blue-600 hover:text-blue-900"
                  title="Edit Supplier"
                >
                  <FiEdit2 className="inline" size={18} />
                </button>
                <button
                  onClick={() => handleDelete(supplier.id)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete Supplier"
                >
                  <FiTrash2 className="inline" size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {suppliers.map((supplier) => (
        <div key={supplier.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-sm font-medium inline-block px-2 py-1 bg-yellow-100 rounded-md text-gray-900">{supplier.name}</h4>
              <p className="text-sm text-gray-500 mt-2">Primary Code: {supplier.primaryCode || supplier.code}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {supplier.status}
            </span>
          </div>
          
          <div className="space-y-2 mb-4">
            <p className="text-sm">
              <span className="font-medium">Contact:</span> {supplier.contactPerson}
            </p>
            <p className="text-sm">
              <span className="font-medium">Phone:</span> {supplier.phone}
            </p>
            <p className="text-sm">
              <span className="font-medium">Email:</span> {supplier.email}
            </p>
            <p className="text-sm">
              <span className="font-medium">Address:</span> {supplier.address}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={() => handleViewProducts(supplier)}
              className="text-green-600 hover:text-green-900 p-1"
              title="View Products"
            >
              <FiPackage size={18} />
            </button>
            <button
              onClick={() => handleEdit(supplier)}
              className="text-blue-600 hover:text-blue-900 p-1"
              title="Edit Supplier"
            >
              <FiEdit2 size={18} />
            </button>
            <button
              onClick={() => handleDelete(supplier.id)}
              className="text-red-600 hover:text-red-900 p-1"
              title="Delete Supplier"
            >
              <FiTrash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">Glory Star Hardware</h1>
              <div className="flex space-x-4">
                <button className="px-3 py-2 text-orange-500 border-b-2 border-orange-500 font-medium">
                  Overview
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <button className="text-gray-500 hover:text-gray-700">
                <div className="flex items-center space-x-2">
                  <FiCalendar size={20} />
                  <span>Today</span>
                </div>
              </button>
              <button className="text-gray-500 hover:text-gray-700 relative">
                <FiBell size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  2
                </span>
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">I love Toff</span>
                <div className="bg-orange-500 text-white text-sm font-medium px-2 py-1 rounded">
                  IT
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleEdit(null)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FiPlus size={20} />
              <span>Add New Supplier</span>
            </button>
          </div>
          <button
            onClick={toggleViewMode}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white rounded-lg hover:bg-gray-50 border"
          >
            {viewMode === 'table' ? (
              <>
                <FiGrid size={20} />
                <span>Card View</span>
              </>
            ) : (
              <>
                <FiList size={20} />
                <span>Table View</span>
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No suppliers found</div>
        ) : (
          viewMode === 'table' ? renderTableView() : renderCardView()
        )}

        {showEditModal && (
          <EditSupplierModal
            supplier={selectedSupplier}
            onClose={handleModalClose}
          />
        )}

        {showProductsModal && (
          <SupplierProducts
            supplier={selectedSupplier}
            onClose={handleModalClose}
          />
        )}
      </div>
    </div>
  );
};

export default SupplierManagement; 