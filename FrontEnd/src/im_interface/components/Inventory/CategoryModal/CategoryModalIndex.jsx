import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import NewProductForm from './NewProductForm';
import NewVariantForm from './NewVariantForm';
import app from '../../../../FirebaseConfig';

const CategoryModalIndex = ({ CategoryOpen, CategoryClose }) => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [activeForm, setActiveForm] = useState(null); // 'product' or 'variant'
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

    if (!CategoryOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scaleUp z-10">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 ease-in-out"
                >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Back Button with enhanced styling */}
                {showAddProductModal && (
                    <button
                        onClick={handleBack}
                        className="absolute top-4 left-4 px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200 flex items-center gap-2 group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                )}

                {!showAddProductModal ? (
                    <>
                        <h2 className="text-center text-2xl font-semibold mb-8 text-gray-800">
                            Select a Category
                            <span className="block text-sm text-gray-500 font-normal mt-1">Choose a category to add new product</span>
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
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
                    </>
                ) : (
                    <div className="mt-8">
                        {!activeForm ? (
                            <>
                                <div className="text-center mb-8">
                                    <h3 className="text-xl font-semibold text-gray-800">
                                        Add New Item
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
                                    <button
                                        onClick={() => setActiveForm('variant')}
                                        className="w-full p-6 text-left border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                                    >
                                        <span className="text-lg font-medium text-gray-800 group-hover:text-blue-600">Add Variant</span>
                                        <p className="text-sm text-gray-500 mt-1">Add a variation to existing product</p>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {activeForm === 'product' ? (
                                    <NewProductForm
                                        selectedCategory={selectedCategory}
                                        onClose={handleClose}
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