import React, { useState, useEffect } from 'react';
import ProductFactory from '../../Factory/productFactory';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import app from '../../../../../FirebaseConfig';
import { validateProduct, getStorageOptions, getCategorySpecificFields, updateFieldOptions } from './Utils';

const NewProductForm = ({ selectedCategory, onClose }) => {
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [location, setLocation] = useState('STR A1');
    const [attribute, setAttribute] = useState('');
    const [restockLevel, setRestockLevel] = useState('');
    const [productImage, setProductImage] = useState(null);
    const [dateStocked, setDateStocked] = useState('');
    const [additionalFields, setAdditionalFields] = useState([]);
    const [newFieldName, setNewFieldName] = useState("");
    const [unit, setUnit] = useState('pcs');
    const [categoryFields, setCategoryFields] = useState([]);
    const [categoryValues, setCategoryValues] = useState({});
    const [editingField, setEditingField] = useState(null);
    const [newOptionValue, setNewOptionValue] = useState('');
    const [localCategoryFields, setLocalCategoryFields] = useState([]);
    
    useEffect(() => {
        if (selectedCategory?.name) {
            const fields = getCategorySpecificFields(selectedCategory.name);
            setCategoryFields(fields);
            const initialValues = fields.reduce((acc, field) => ({
                ...acc,
                [field.name]: ''
            }), {});
            setCategoryValues(initialValues);
        }
    }, [selectedCategory]);

    useEffect(() => {
        if (selectedCategory?.name) {
            const fields = getCategorySpecificFields(selectedCategory.name);
            setLocalCategoryFields(fields);
        }
    }, [selectedCategory]);

    const handleCategoryFieldChange = (fieldName, value) => {
        setCategoryValues(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleOptionManagement = async (fieldIndex, action, optionValue) => {
        const updatedFields = [...localCategoryFields];
        const field = updatedFields[fieldIndex];

        if (!field) return;

        try {
            if (action === 'add') {
                const trimmedValue = newOptionValue.trim();
                if (trimmedValue && !field.options.includes(trimmedValue)) {
                    const newOptions = [...field.options, trimmedValue];
                    
                    // Update in Firebase using Utils function
                    await updateFieldOptions(selectedCategory.name, field.name, newOptions);
                    
                    // Update local state
                    field.options = newOptions;
                    setNewOptionValue('');
                    setLocalCategoryFields(updatedFields);
                    setCategoryFields(updatedFields);
                }
            } else if (action === 'remove' && optionValue) {
                const newOptions = field.options.filter(opt => opt !== optionValue);
                
                // Update in Firebase using Utils function
                await updateFieldOptions(selectedCategory.name, field.name, newOptions);
                
                // Update local state
                field.options = newOptions;
                setLocalCategoryFields(updatedFields);
                setCategoryFields(updatedFields);
            }
        } catch (error) {
            console.error('Error managing options:', error);
            alert('Failed to update options');
        }
    };

    const handleAddField = () => {
        if (
            newFieldName.trim() &&
            !additionalFields.find((f) => f.name === newFieldName)
        ) {
            setAdditionalFields([...additionalFields, { name: newFieldName, value: "" }]);
            setNewFieldName("");
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setProductImage(imageUrl);
        }
    };

    const removeImage = () => {
        setProductImage(null);
        document.getElementById("productImage").value = "";
    };

    const handleAddProduct = async () => {
 
        
        const productData = {
            name: productName,
            quantity: Number(quantity),
            unitPrice: Number(unitPrice),
            category: selectedCategory,
            location,
            unit,
            restockLevel: Number(restockLevel),
            dateStocked: dateStocked || new Date().toISOString().split('T')[0],
            imageUrl: productImage,
            categoryValues: categoryValues,
            customFields: additionalFields.reduce((acc, field) => ({
                ...acc,
                [field.name]: field.value
            }), {})
        };

        // const validation = validateProduct(productData);
        // if (!validation.isValid) {
        //     alert(`Please fix the following errors:\n${validation.errors.join('\n')}`);
        //     return;
        // }

        try {
            const db = getFirestore(app);
            const newProduct = ProductFactory.createProduct(productData);
            const productId = ProductFactory.generateProductId(newProduct.name, selectedCategory.name);
            const productRef = doc(db, 'Products', selectedCategory.name, 'Items', productId);
            await setDoc(productRef, newProduct);

            alert('Product added successfully!');
            onClose();
        } catch (error) {
            console.error('Error adding product:', error);
            alert(`Failed to add product: ${error.message}`);
        }
    };

    return (
        <div className="space-y-6 max-h-[80vh] overflow-y-auto modal-content">
            <div className="sticky top-0 bg-white pb-4 z-10">
                <h2 className="text-xl font-semibold text-gray-800">New Product</h2>
                <p className="text-sm text-gray-600">Category: 
                    <span className="ml-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                        {selectedCategory?.name}
                    </span>
                </p>
            </div>

            <div className="space-y-6">
                <div className="group relative w-full h-48 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden transition-all hover:border-blue-500">
                    {productImage ? (
                        <div className="relative h-full">
                            <img src={productImage} alt="Preview" className="w-full h-full object-contain" />
                            <button
                                onClick={removeImage}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/90 backdrop-blur-sm text-white rounded-lg 
                                         hover:bg-red-600 transition-colors group-hover:opacity-100 opacity-0"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <label
                            htmlFor="productImage"
                            className="flex flex-col items-center justify-center h-full cursor-pointer 
                                     bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="mt-2 text-sm text-gray-500">Upload Product Image</span>
                            <span className="mt-1 text-xs text-gray-400">Click or drag and drop</span>
                        </label>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="productImage"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {localCategoryFields.map((field, index) => (
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
                                        value={categoryValues[field.name] || ''}
                                        onChange={(e) => handleCategoryFieldChange(field.name, e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    >
                                        <option value="">Select {field.name}</option>
                                        {field.options.map((option, idx) => (
                                            <option key={idx} value={option}>{option}</option>
                                        ))}
                                    </select>

                                    {editingField === index && (
                                        <div className="mt-2 space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newOptionValue}
                                                    onChange={(e) => setNewOptionValue(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleOptionManagement(index, 'add');
                                                        }
                                                    }}
                                                    placeholder={`Add new ${field.name} option`}
                                                    className="flex-1 px-3 py-1 border rounded-lg text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleOptionManagement(index, 'add')}
                                                    disabled={!newOptionValue.trim()}
                                                    className={`px-3 py-1 text-white rounded-lg text-sm transition-colors ${
                                                        newOptionValue.trim() 
                                                            ? 'bg-blue-500 hover:bg-blue-600' 
                                                            : 'bg-gray-400 cursor-not-allowed'
                                                    }`}
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

                    <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Product Name</label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Enter product name"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Enter quantity"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Unit</label>
                        <input
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="e.g. pcs, kg"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Unit Price (₱)</label>
                        <input
                            type="number"
                            value={unitPrice}
                            onChange={(e) => setUnitPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Storage Location</label>
                        <select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                            {getStorageOptions().map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Restock Level</label>
                        <input
                            type="number"
                            value={restockLevel}
                            onChange={(e) => setRestockLevel(e.target.value)}
                            placeholder="Minimum quantity"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Date Stocked</label>
                        <input
                            type="date"
                            value={dateStocked}
                            onChange={(e) => setDateStocked(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            placeholder="Custom field name"
                            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                        <button
                            onClick={handleAddField}
                            className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                                     transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Field
                        </button>
                    </div>

                    {additionalFields.map((field, index) => (
                        <div key={index} className="relative">
                            <input
                                type="text"
                                value={field.value}
                                onChange={(e) => {
                                    const newFields = [...additionalFields];
                                    newFields[index].value = e.target.value;
                                    setAdditionalFields(newFields);
                                }}
                                placeholder={field.name}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                                         focus:ring-blue-500 focus:border-blue-500 transition-all pr-10"
                            />
                            <button
                                onClick={() => {
                                    const newFields = additionalFields.filter((_, i) => i !== index);
                                    setAdditionalFields(newFields);
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

                <button
                    onClick={handleAddProduct}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                             transition-colors flex items-center justify-center gap-2 font-medium"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Product
                </button>
            </div>
        </div>
    );
};

export default NewProductForm;


