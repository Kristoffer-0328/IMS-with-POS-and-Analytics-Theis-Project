import React, { useState, useEffect } from "react";
import { useServices } from "../../../../auth/services/ProductServices";
import { getFirestore, doc, updateDoc, arrayUnion } from "firebase/firestore";
import app from "../../../../../FirebaseConfig";
import { getCategorySpecificFields } from "./Utils";
import ProductFactory from "../../Factory/productFactory";

const NewVariantForm = ({ selectedCategory, onBack }) => {
    const [existingProducts, setExistingProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [variantValue, setVariantValue] = useState({
        size: '',
        quantity: '',
        unitPrice: '',
        unit: '',
        location: 'STR A1'
    });
    const [restockLevel, setRestockLevel] = useState('');
    const [storageLocation, setStorageLocation] = useState('STR A1');
    const [variantImage, setVariantImage] = useState(null);
    const [unit, setUnit] = useState('pcs');
    const [additionalVariantFields, setAdditionalVariantFields] = useState([]);
    const [newVariantFieldName, setNewVariantFieldName] = useState('');
    const [editingField, setEditingField] = useState(null);
    const [newOptionValue, setNewOptionValue] = useState('');
    const [localCategoryFields, setLocalCategoryFields] = useState(getCategorySpecificFields(selectedCategory?.name));
    const { listenToProducts } = useServices();
    const db = getFirestore(app);

    useEffect(() => {
        if (!selectedCategory?.name) {
            console.log('No category selected');
            return;
        }

        try {
            const unsubscribe = listenToProducts((allProducts) => {
                console.log('Raw products received:', allProducts);

                if (!Array.isArray(allProducts)) {
                    console.error('allProducts is not an array:', allProducts);
                    return;
                }

                const categoryProducts = allProducts.filter(product => {
                    const isValidProduct = product &&
                        typeof product === 'object' &&
                        product.category === selectedCategory.name &&
                        !product.isVariant;

                    console.log(`Checking product: ${product?.name || 'unnamed'}`, {
                        hasProduct: !!product,
                        category: product?.category,
                        expectedCategory: selectedCategory.name,
                        isValidProduct
                    });

                    return isValidProduct;
                });

                const formattedProducts = categoryProducts.map(product => ({
                    id: product.id || '',
                    name: product.ProductName || product.name || '',
                    category: product.category || '',
                    quantity: parseInt(product.quantity) || 0,
                    unitPrice: parseFloat(product.unitPrice) || 0,
                    location: product.location || 'STR A1',
                    unit: product.unit || 'pcs',
                    restockLevel: parseInt(product.restockLevel) || 0,
                    variants: product.variants || [],
                    lastUpdated: product.lastUpdated || new Date().toISOString()
                }));

                console.log('Formatted products:', formattedProducts);

                if (formattedProducts.length > 0) {
                    setExistingProducts(formattedProducts);
                } else {
                    console.log('No products found for category:', selectedCategory.name);
                    setExistingProducts([]);
                }
            });

            return () => unsubscribe();
        } catch (error) {
            console.error('Error in products listener:', error);
            setExistingProducts([]);
        }
    }, [selectedCategory?.name, listenToProducts]);

    useEffect(() => {
        console.log('ExistingProducts updated:', {
            length: existingProducts.length,
            products: existingProducts
        });
    }, [existingProducts]);

    const handleProductSelect = (productId) => {
        const product = existingProducts.find(p => p.id === productId);
        console.log('Selected product:', product);

        if (product) {
            setSelectedProduct(product);
            setUnit(product.measurements?.defaultUnit || 'pcs');
            setRestockLevel(product.quantity || '');
            setStorageLocation(product.location || 'STR A1');
            setVariantValue(prev => ({
                ...prev,
                unitPrice: product.unitPrice ||
                    (product.variants && product.variants[0]?.unitPrice) || ''
            }));
        }
    };

    const handleAddVariant = async () => {
        if (!selectedProduct) {
            alert('Please select a product first');
            return;
        }

        try {
            // Filter out weight and type from category values
            const filteredCategoryValues = categoryFields.reduce((acc, field) => {
                const value = variantValue[field.name];
                if (field.name !== 'weight' && field.name !== 'type' && value) {
                    acc[field.name] = value;
                }
                return acc;
            }, {});

            // Create variant data with weight as size
            const variantData = {
                quantity: Number(variantValue.quantity),
                unitPrice: Number(variantValue.unitPrice),
                unit: variantValue.unit || unit,
                location: variantValue.location || storageLocation,
                // Use weight from categoryValues as size
                size: variantValue.weight || 'default',
                // Add type separately if it exists
                type: variantValue.type || null,
                // Add remaining category values
                categoryValues: filteredCategoryValues,
                ...(additionalVariantFields.length > 0 && {
                    customFields: additionalVariantFields.reduce((acc, field) => ({
                        ...acc,
                        [field.name]: field.value
                    }), {})
                }),
                imageUrl: variantImage
            };

            // Get existing variants
            const updatedVariants = [...(selectedProduct.variants || [])];
            
            // Create new variant
            const newVariant = ProductFactory.createVariant(selectedProduct, variantData);
            
            // Add to variants array
            updatedVariants.push(newVariant);

            // Calculate new total quantity
            const totalQuantity = updatedVariants.reduce((sum, variant) => 
                sum + Number(variant.quantity || 0), 0
            );

            // Update the document
            const productRef = doc(db, 'Products', selectedCategory.name, 'Items', selectedProduct.id);
            await updateDoc(productRef, {
                variants: updatedVariants,
                quantity: totalQuantity,
                lastUpdated: new Date().toISOString()
            });

            alert('Variant added successfully!');
            onBack();
        } catch (error) {
            console.error('Error adding variant:', error);
            alert(`Failed to add variant: ${error.message}`);
        }
    };

    const handleOptionManagement = (fieldIndex, action, optionValue) => {
        const updatedFields = [...localCategoryFields];
        const field = updatedFields[fieldIndex];

        if (action === 'add' && newOptionValue.trim()) {
            if (!field.options.includes(newOptionValue.trim())) {
                field.options.push(newOptionValue.trim());
                setNewOptionValue('');
            }
        } else if (action === 'remove') {
            field.options = field.options.filter(opt => opt !== optionValue);
        }

        setLocalCategoryFields(updatedFields);
    };

    const categoryFields = getCategorySpecificFields(selectedCategory?.name);

    return (
        <div className="space-y-6 max-h-[80vh] overflow-y-auto modal-content">
            {/* Header Section */}
            <div className="sticky top-0 bg-white pb-4 z-10">
                <h2 className="text-xl font-semibold text-gray-800">Add Variant</h2>
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">Category:</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                        {selectedCategory?.name}
                    </span>
                </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Select Base Product</label>
                <div className="relative">
                    <select
                        className="w-full p-3 pr-10 bg-gray-50 border border-gray-300 rounded-lg 
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all
                                 appearance-none"
                        onChange={(e) => handleProductSelect(e.target.value)}
                        value={selectedProduct?.id || ''}
                    >
                        <option value="">-- Select a Product --</option>
                        {Array.isArray(existingProducts) && existingProducts.length > 0 ? (
                            existingProducts.map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.name || product.ProductName || 'Unnamed Product'}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>No products available in {selectedCategory?.name}</option>
                        )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                        {existingProducts.length} product(s) available
                    </div>
                </div>
            </div>

            {selectedProduct && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Image Upload Section */}
                    <div className="group relative w-full h-48 border-2 border-dashed border-gray-300 rounded-lg 
                                  overflow-hidden transition-all hover:border-blue-500">
                        {variantImage ? (
                            <div className="relative h-full">
                                <img src={variantImage} alt="Variant Preview" className="w-full h-full object-contain" />
                                <button
                                    onClick={() => setVariantImage(null)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500/90 backdrop-blur-sm text-white 
                                             rounded-lg hover:bg-red-600 transition-colors group-hover:opacity-100 
                                             opacity-0"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <label
                                htmlFor="variantImage"
                                className="flex flex-col items-center justify-center h-full cursor-pointer 
                                         bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="mt-2 text-sm text-gray-500">Upload Variant Image</span>
                                <span className="mt-1 text-xs text-gray-400">Click or drag and drop</span>
                            </label>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const imageUrl = URL.createObjectURL(file);
                                    setVariantImage(imageUrl);
                                }
                            }}
                            className="hidden"
                            id="variantImage"
                        />
                    </div>

                    {/* Category-specific Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {categoryFields.map((field, index) => (
                            <div key={index} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                                    </label>
                                    {field.editable && (
                                        <button
                                            type="button"
                                            onClick={() => setEditingField(editingField === index ? null : index)}
                                            className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            {editingField === index ? 'Done' : 'Edit Options'}
                                        </button>
                                    )}
                                </div>
                                
                                {field.type === 'select' && (
                                    <>
                                        <select
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            value={variantValue[field.name] || ''}
                                            onChange={(e) => setVariantValue(prev => ({
                                                ...prev,
                                                [field.name]: e.target.value
                                            }))}
                                        >
                                            <option value="">Select {field.name}</option>
                                            {field.options.map((opt, idx) => (
                                                <option key={idx} value={opt}>{opt}</option>
                                            ))}
                                        </select>

                                        {editingField === index && (
                                            <div className="mt-2 space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newOptionValue}
                                                        onChange={(e) => setNewOptionValue(e.target.value)}
                                                        placeholder={`Add new ${field.name} option`}
                                                        className="flex-1 px-3 py-1 border rounded-lg text-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOptionManagement(index, 'add')}
                                                        className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {field.options.map((option, optIndex) => (
                                                        <span 
                                                            key={optIndex}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                                                        >
                                                            {option}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOptionManagement(index, 'remove', option)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}

                        {/* Standard Fields */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <input
                                type="number"
                                value={variantValue.quantity}
                                onChange={(e) => setVariantValue(prev => ({
                                    ...prev,
                                    quantity: e.target.value
                                }))}
                                placeholder="Enter quantity"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Unit</label>
                            <input
                                type="text"
                                value={variantValue.unit}
                                onChange={(e) => setVariantValue(prev => ({
                                    ...prev,
                                    unit: e.target.value
                                }))}
                                placeholder="e.g. pcs, kg"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Unit Price (₱)</label>
                            <input
                                type="number"
                                value={variantValue.unitPrice}
                                onChange={(e) => setVariantValue(prev => ({
                                    ...prev,
                                    unitPrice: e.target.value
                                }))}
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Additional Fields Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newVariantFieldName}
                                onChange={(e) => setNewVariantFieldName(e.target.value)}
                                placeholder="Add custom field"
                                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                            <button
                                onClick={() => {
                                    if (newVariantFieldName.trim()) {
                                        setAdditionalVariantFields([
                                            ...additionalVariantFields,
                                            { name: newVariantFieldName.trim(), value: '' }
                                        ]);
                                        setNewVariantFieldName('');
                                    }
                                }}
                                className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                                         transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Field
                            </button>
                        </div>

                        {additionalVariantFields.map((field, idx) => (
                            <div key={idx} className="relative">
                                <input
                                    type="text"
                                    value={field.value}
                                    onChange={(e) => {
                                        const updated = [...additionalVariantFields];
                                        updated[idx].value = e.target.value;
                                        setAdditionalVariantFields(updated);
                                    }}
                                    placeholder={field.name}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10"
                                />
                                <button
                                    onClick={() => {
                                        setAdditionalVariantFields(
                                            additionalVariantFields.filter((_, i) => i !== idx)
                                        );
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 
                                             hover:text-red-500 transition-colors"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleAddVariant}
                        className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                                 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Variant
                    </button>
                </div>
            )}
        </div>
    );
};

export default NewVariantForm;