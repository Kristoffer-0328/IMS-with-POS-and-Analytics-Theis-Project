import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import app from '../../../../../FirebaseConfig';

const ProductList = ({ category, supplier, onClose, linkProductToSupplier }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [supplierData, setSupplierData] = useState({});
    const db = getFirestore(app);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const productsRef = collection(db, 'Products', category, 'Items');
                const q = query(productsRef);
                const querySnapshot = await getDocs(q);
                
                const fetchedProducts = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setProducts(fetchedProducts);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        if (category) {
            fetchProducts();
        }
    }, [category, db]);

    const handleProductSelect = (productId) => {
        const isSelected = selectedProducts.includes(productId);
        if (isSelected) {
            setSelectedProducts(prev => prev.filter(id => id !== productId));
            const newSupplierData = { ...supplierData };
            delete newSupplierData[productId];
            setSupplierData(newSupplierData);
        } else {
            setSelectedProducts(prev => [...prev, productId]);
            setSupplierData(prev => ({
                ...prev,
                [productId]: { price: '', sku: '' }
            }));
        }
    };

    const handleDataChange = (productId, field, value) => {
        setSupplierData(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        try {
            await Promise.all(
                selectedProducts.map(productId =>
                    linkProductToSupplier(productId, supplier.id, {
                        ...supplierData[productId],
                        supplierName: supplier.name,
                        supplierCode: supplier.primaryCode || supplier.code
                    })
                )
            );
            onClose();
        } catch (error) {
            console.error('Error linking products:', error);
        }
    };

    if (loading) {
        return <div className="text-center">Loading products...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="max-h-[400px] overflow-y-auto">
                {products.map(product => (
                    <div key={product.id} className="border rounded-lg p-4 mb-4">
                        <div className="flex items-center mb-2">
                            <input
                                type="checkbox"
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => handleProductSelect(product.id)}
                                className="mr-3"
                            />
                            <span className="font-medium">{product.name}</span>
                        </div>
                        
                        {selectedProducts.includes(product.id) && (
                            <div className="ml-7 mt-2 space-y-2">
                                <div>
                                    <label className="block text-sm text-gray-600">Supplier SKU</label>
                                    <input
                                        type="text"
                                        value={supplierData[product.id]?.sku || ''}
                                        onChange={(e) => handleDataChange(product.id, 'sku', e.target.value)}
                                        className="w-full p-2 border rounded"
                                        placeholder="Enter supplier SKU"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600">Supplier Price</label>
                                    <input
                                        type="number"
                                        value={supplierData[product.id]?.price || ''}
                                        onChange={(e) => handleDataChange(product.id, 'price', parseFloat(e.target.value))}
                                        className="w-full p-2 border rounded"
                                        placeholder="Enter supplier price"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-end space-x-4 mt-4">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={selectedProducts.length === 0}
                    className={`px-4 py-2 text-white rounded ${
                        selectedProducts.length === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                >
                    Link Products
                </button>
            </div>
        </div>
    );
};

export default ProductList;
