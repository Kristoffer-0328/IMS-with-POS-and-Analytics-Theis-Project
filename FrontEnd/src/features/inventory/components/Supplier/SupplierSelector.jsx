import React, { useState, useEffect } from 'react';
import { useSupplierServices } from '../../../../services/firebase/SupplierServices';
import { FiPlus, FiSearch } from 'react-icons/fi';
import EditSupplierModal from './EditSupplierModal';

const SupplierSelector = ({ onSelect, selectedSupplierId }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const supplierServices = useSupplierServices();

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

    const filteredSuppliers = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.primaryCode || supplier.code).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSupplierSelect = (supplier) => {
        onSelect(supplier);
    };

    const handleModalClose = () => {
        setShowAddModal(false);
        loadSuppliers(); // Refresh the list after adding new supplier
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Search suppliers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <FiPlus className="h-5 w-5 mr-2" />
                    Add New
                </button>
            </div>

            <div className="mt-1 max-h-60 overflow-auto border border-gray-200 rounded-md">
                {loading ? (
                    <div className="text-center py-4 text-gray-500">Loading suppliers...</div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No suppliers found</div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredSuppliers.map((supplier) => (
                            <div
                                key={supplier.id}
                                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                                    selectedSupplierId === supplier.id ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => handleSupplierSelect(supplier)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900">{supplier.name}</h4>
                                        <p className="text-sm text-gray-500">Primary Code: {supplier.primaryCode || supplier.code}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {supplier.status}
                                    </span>
                                </div>
                                <div className="mt-2 text-sm text-gray-500">
                                    <p>{supplier.contactPerson} • {supplier.phone}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showAddModal && (
                <EditSupplierModal
                    supplier={null}
                    onClose={handleModalClose}
                    onSave={(newSupplier) => {
                        handleModalClose();
                        handleSupplierSelect(newSupplier);
                    }}
                />
            )}
        </div>
    );
};

export default SupplierSelector; 