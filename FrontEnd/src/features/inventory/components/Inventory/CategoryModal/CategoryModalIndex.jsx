import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import NewProductForm from './NewProductForm';
import NewVariantForm from './NewVariantForm';
import ProductList from './ProductList';
import app from '../../../../../FirebaseConfig';
import { useServices } from '../../../../../services/firebase/ProductServices';

const CategoryModalIndex = ({ CategoryOpen, CategoryClose, supplier }) => {
    const { linkProductToSupplier } = useServices();
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [activeForm, setActiveForm] = useState(null); // 'product' or 'variant'
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const db = getFirestore(app);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "Products"));
                const fetchedCategories = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.id
                }));
                setCategories(fetchedCategories);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };

        if (CategoryOpen) {
            fetchCategories();
        }
    }, [CategoryOpen, db]);

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
        setShowAddProductModal(true);
        if (supplier) {
            setActiveForm('product'); // Automatically go to product form when supplier is provided
        }
    };

    const handleClose = () => {
        setShowAddProductModal(false);
        setSelectedCategory(null);
        setActiveForm(null);
        CategoryClose();
    };

    const handleBack = () => {
        if (activeForm) {
            setActiveForm(null);
        } else {
            setShowAddProductModal(false);
            setSelectedCategory(null);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const categoryRef = doc(db, 'Products', newCategoryName.trim());
            await setDoc(categoryRef, { 
                name: newCategoryName.trim(),
                createdAt: new Date().toISOString()
            });

            const querySnapshot = await getDocs(collection(db, "Products"));
            const updatedCategories = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                name: doc.id
            }));
            
            setCategories(updatedCategories);
            setNewCategoryName('');
            setShowAddCategory(false);
        } catch (error) {
            console.error("Error adding category:", error);
            alert("Failed to add category: " + error.message);
        }
    };

    if (!CategoryOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm"></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl p-8 animate-scaleUp z-10">
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <span className="text-xl">✕</span>
                </button>

                {!showAddProductModal ? (
                    <>
                        <h2 className="text-center text-2xl font-semibold mb-8 text-gray-800">
                            Select a Category
                            <span className="block text-sm text-gray-500 font-normal mt-1">Choose a category to add new product</span>
                        </h2>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategoryClick(category)}
                                    className="p-6 text-center border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                                >
                                    <span className="text-lg font-medium group-hover:scale-105 inline-block transition-transform duration-200">
                                        {category.name}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {showAddCategory && (
                            <div className="mb-6 bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                                            Category Name
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-shadow"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="Enter category name"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddCategory}
                                        className="h-10 w-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all duration-200"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center">
                            <button
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl 
                                    hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow transition-all duration-200
                                    flex items-center gap-2"
                                onClick={() => setShowAddCategory((prev) => !prev)}
                            >
                                {showAddCategory ? (
                                    <>
                                        <span>Cancel</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Add New Category</span>
                                        <span className="text-lg">+</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="mt-8">
                        {!activeForm ? (
                            <>
                                <div className="text-center mb-8">
                                    <h3 className="text-xl font-semibold text-gray-800">
                                        {supplier ? 'Add Product to Supplier' : 'Add New Item'}
                                        <span className="block text-blue-600 text-sm mt-1">{selectedCategory?.name}</span>
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setActiveForm('product')}
                                        className="w-full p-6 text-left border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                                    >
                                        <span className="text-lg font-medium text-gray-800 group-hover:text-blue-600">New Product</span>
                                        <p className="text-sm text-gray-500 mt-1">Add a completely new product to inventory</p>
                                    </button>
                                    {!supplier && (
                                        <button
                                            onClick={() => setActiveForm('variant')}
                                            className="w-full p-6 text-left border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                                        >
                                            <span className="text-lg font-medium text-gray-800 group-hover:text-blue-600">Add Variant</span>
                                            <p className="text-sm text-gray-500 mt-1">Add a variation to existing product</p>
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleBack}
                                    className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                                >
                                    <span>← Back</span>
                                </button>
                                {activeForm === 'product' ? (
                                    <NewProductForm
                                        selectedCategory={selectedCategory}
                                        onClose={handleClose}
                                        supplier={supplier}
                                    />
                                ) : (
                                    <NewVariantForm
                                        selectedCategory={selectedCategory}
                                        onBack={() => setActiveForm(null)}
                                    />
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryModalIndex;