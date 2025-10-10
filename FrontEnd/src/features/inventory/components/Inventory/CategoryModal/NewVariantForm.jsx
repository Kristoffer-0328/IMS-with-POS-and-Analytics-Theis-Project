import React, { useState, useEffect } from "react";
import { useServices } from "../../../../../services/firebase/ProductServices";
import { getFirestore, doc, setDoc, updateDoc, arrayUnion, getDoc, collection, getDocs } from "firebase/firestore";
import app from "../../../../../FirebaseConfig";
import { getCategorySpecificFields } from "./Utils";
import ProductFactory from "../../Factory/productFactory";
import SupplierSelector from '../../Supplier/SupplierSelector';
import ShelfViewModal from '../ShelfViewModal';

const NewVariantForm = ({ selectedCategory, onBack, preSelectedProduct, supplier }) => {
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
    
    // Add new state for variant-specific information
    const [specifications, setSpecifications] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierPrice, setSupplierPrice] = useState('');
    
    // Storage location modal states
    const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
    const [selectedStorageLocation, setSelectedStorageLocation] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState('Unit 01'); // Add state for unit selection

    const { listenToProducts, linkProductToSupplier } = useServices();
    const db = getFirestore(app);
    
    // Mock storage unit data for the modal
    const getStorageUnitData = () => {
        const unitName = selectedUnit || 'Unit 01'; // Use selectedUnit instead of category
        return {
            title: unitName,
            type: "Storage Unit",
            shelves: [
                {
                    name: "Shelf A",
                    rows: Array.from({ length: 8 }, (_, i) => ({ 
                        name: `Row ${i + 1}`, 
                        columns: 4 
                    }))
                },
                {
                    name: "Shelf B",
                    rows: Array.from({ length: 8 }, (_, i) => ({ 
                        name: `Row ${i + 1}`, 
                        columns: 4 
                    }))
                }
            ]
        };
    };
    
    // Handle storage location selection
    const handleStorageLocationSelect = (shelfName, rowName, columnIndex) => {
        const locationString = `${selectedUnit} - ${shelfName} - ${rowName} - Column ${columnIndex + 1}`;
        setSelectedStorageLocation({
            unit: selectedUnit, // Use selectedUnit instead of category name
            shelf: shelfName,
            row: rowName,
            column: columnIndex, // Store 0-based index (0, 1, 2, 3) to match ShelfViewModal
            columnDisplay: columnIndex + 1, // Keep display value (1, 2, 3, 4) for UI
            fullLocation: locationString
        });
        setVariantValue(prev => ({
            ...prev,
            location: locationString
        }));
        setIsStorageModalOpen(false);
    };

    // Handle preSelectedProduct and supplier props
    useEffect(() => {
        if (preSelectedProduct) {
            setSelectedProduct(preSelectedProduct);
            setUnit(preSelectedProduct.measurements?.defaultUnit || 'pcs');
            setRestockLevel(preSelectedProduct.quantity || '');
            setStorageLocation(preSelectedProduct.location || 'STR A1');
            setVariantValue(prev => ({
                ...prev,
                unitPrice: preSelectedProduct.unitPrice || 
                    (preSelectedProduct.variants && preSelectedProduct.variants[0]?.unitPrice) || ''
            }));
        }
    }, [preSelectedProduct]);

    useEffect(() => {
        if (supplier) {
            setSelectedSupplier(supplier);
        }
    }, [supplier]);

    useEffect(() => {
        if (!selectedCategory?.name) {

            return;
        }

        try {
            const unsubscribe = listenToProducts((allProducts) => {

                if (!Array.isArray(allProducts)) {
                    console.error('allProducts is not an array:', allProducts);
                    return;
                }

                const categoryProducts = allProducts.filter(product => {
                    const isValidProduct = product &&
                        typeof product === 'object' &&
                        product.category === selectedCategory.name &&
                        !product.isVariant;

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

                if (formattedProducts.length > 0) {
                    setExistingProducts(formattedProducts);
                } else {

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

    }, [existingProducts]);

    const handleProductSelect = (productId) => {
        const product = existingProducts.find(p => p.id === productId);

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

    const handleSupplierSelect = (supplierData) => {
        setSelectedSupplier(supplierData);
    };

    const handleAddVariant = async () => {
        if (!selectedProduct) {
            alert('Please select a product first');
            return;
        }
        
        if (!selectedStorageLocation) {
            alert('Please select a storage location first');
            return;
        }

        try {
            const db = getFirestore(app);

            // Filter out weight and type from category values and ensure no undefined values
            const filteredCategoryValues = localCategoryFields.reduce((acc, field) => {
                const value = variantValue[field.name];
                if (field.name !== 'weight' && field.name !== 'type' && value) {
                    acc[field.name] = value;
                }
                return acc;
            }, {});

            // Get current supplier
            const currentSupplier = supplier || selectedSupplier;

            // Generate unique variant ID
            const variantId = `${selectedProduct.id}_VAR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create variant as a separate product document with FLAT STRUCTURE
            const variantProductData = {
                id: variantId,
                name: selectedProduct.name,
                brand: selectedProduct.brand || 'Generic',
                category: selectedProduct.category || selectedCategory?.name,
                subCategory: selectedProduct.subCategory || selectedProduct.category,
                
                // Variant-specific data
                quantity: Number(variantValue.quantity) || 0,
                unitPrice: Number(variantValue.unitPrice) || 0,
                unit: variantValue.unit || unit || 'pcs',
                size: variantValue.size || 'default',
                specifications: specifications || '',
                variantName: variantValue.size || 'Variant',
                
                // Storage location - from selected storage location
                storageLocation: selectedStorageLocation.unit,
                shelfName: selectedStorageLocation.shelf,
                rowName: selectedStorageLocation.row,
                columnIndex: selectedStorageLocation.column,
                fullLocation: selectedStorageLocation.fullLocation,
                location: selectedStorageLocation.unit,
                
                // Variant identification
                isVariant: true,
                parentProductId: selectedProduct.id,
                
                // Supplier information
                supplier: currentSupplier ? {
                    name: currentSupplier.name,
                    code: currentSupplier.primaryCode || currentSupplier.code,
                    primaryCode: currentSupplier.primaryCode || currentSupplier.code,
                    id: currentSupplier.id,
                    price: Number(supplierPrice) || Number(variantValue.unitPrice) || 0
                } : selectedProduct.supplier || {
                    name: 'Unknown',
                    primaryCode: '',
                    code: ''
                },
                
                // Additional fields
                categoryValues: filteredCategoryValues || {},
                customFields: additionalVariantFields.reduce((acc, field) => ({
                    ...acc,
                    [field.name]: field.value || ''
                }), {}),
                imageUrl: variantImage || null,
                storageType: selectedProduct.storageType || 'Goods',
                restockLevel: selectedProduct.restockLevel || 0,
                maximumStockLevel: selectedProduct.maximumStockLevel || 0,
                
                // Timestamps
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            // Remove any undefined values
            const cleanVariantData = JSON.parse(JSON.stringify(variantProductData));

            console.log('=== VARIANT CREATION DEBUG ===');
            console.log('Storage Unit Path:', selectedStorageLocation.unit);
            console.log('Variant ID:', variantId);
            console.log('Full Path:', `Products/${selectedStorageLocation.unit}/products/${variantId}`);
            console.log('Variant Data:', cleanVariantData);

            // Write variant to Products/{storageLocation}/products/{variantId} - NESTED BY STORAGE UNIT
            const storageUnitPath = selectedStorageLocation.unit; // e.g., "Unit 01"
            const variantRef = doc(db, 'Products', storageUnitPath, 'products', variantId);
            await setDoc(variantRef, cleanVariantData);

            console.log(`✅ Variant created at: Products/${storageUnitPath}/products/${variantId}`);

            // If supplier is provided, create supplier-product relationship for the variant
            if (currentSupplier) {
                try {
                    await linkProductToSupplier(variantId, currentSupplier.id, {
                        supplierPrice: Number(supplierPrice) || Number(variantValue.unitPrice) || 0,
                        supplierSKU: variantId,
                        isVariant: true,
                        parentProductId: selectedProduct.id,
                        lastUpdated: new Date().toISOString()
                    });

                    console.log('Variant linked to supplier');
                } catch (linkError) {
                    console.error('Error linking variant to supplier:', linkError);
                    // Don't fail the whole operation if linking fails
                }
            }

            alert('Variant added successfully as a separate product!');
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
        <div className="space-y-6 max-h-[85vh] overflow-y-auto p-1">
            {/* Enhanced Header with Gradient Background */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-pink-50 -mx-1 px-6 py-5 z-10 rounded-t-xl border-b border-purple-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-500 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Add Product Variant</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">Category:</span>
                            <span className="px-3 py-1 bg-white border border-purple-200 text-purple-700 rounded-full text-sm font-semibold shadow-sm">
                                {selectedCategory?.name}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6 px-6 pb-6">
                {/* Enhanced Product Selection - Only show if no preSelectedProduct */}
                {!preSelectedProduct && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <label className="text-base font-semibold text-gray-800">
                                Select Base Product
                                <span className="text-xs text-red-500 ml-1">*</span>
                            </label>
                        </div>
                        <select
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm 
                                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                                     transition-all hover:border-purple-300"
                            onChange={(e) => handleProductSelect(e.target.value)}
                            value={selectedProduct?.id || ''}
                        >
                            <option value="" className="text-gray-500">-- Select a Product --</option>
                            {existingProducts.map(product => (
                                <option key={product.id} value={product.id} className="text-gray-900">
                                    {product.name || product.ProductName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Enhanced selected product info when preSelected */}
                {preSelectedProduct && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-500 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-purple-900 mb-1">Adding variant to:</h3>
                                <p className="text-xl font-bold text-purple-800 mb-1">{preSelectedProduct.name}</p>
                                <p className="text-sm text-purple-600">Category: {preSelectedProduct.category}</p>
                            </div>
                        </div>
                    </div>
                )}

                {selectedProduct && (
                    <div className="space-y-6">
                    {/* Enhanced Variant Information */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Variant Information</h3>
                            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Required</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Size/Dimension
                                </label>
                                <input
                                    type="text"
                                    value={variantValue.size}
                                    onChange={(e) => setVariantValue(prev => ({...prev, size: e.target.value}))}
                                    placeholder="Enter size or dimension"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Specifications
                                </label>
                                <textarea
                                    value={specifications}
                                    onChange={(e) => setSpecifications(e.target.value)}
                                    placeholder="Enter variant specifications"
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                        </div>
                    </div>

                    {/* Enhanced Supplier Information */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-indigo-100 rounded-lg">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Supplier Information</h3>
                            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
                        </div>
                        {supplier ? (
                            <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                <p className="text-sm text-blue-600">
                                    <span className="font-medium">Supplier:</span> {supplier.name} ({supplier.primaryCode || supplier.code})
                                </p>
                                <p className="text-xs text-blue-500 mt-1">This variant will be automatically linked to this supplier</p>
                            </div>
                        ) : (
                            <>
                                <SupplierSelector 
                                    onSelect={handleSupplierSelect}
                                    selectedSupplierId={selectedSupplier?.id}
                                />
                                {selectedSupplier && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded border">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Selected:</span> {selectedSupplier.name} ({selectedSupplier.primaryCode || selectedSupplier.code})
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Enhanced Stock Information */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-purple-100 rounded-lg">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Stock Information</h3>
                            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Required</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    value={variantValue.quantity}
                                    onChange={(e) => setVariantValue(prev => ({...prev, quantity: e.target.value}))}
                                    placeholder="Enter quantity"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit
                                    <span className="text-xs text-gray-500 ml-1">(Select measurement unit)</span>
                                </label>
                                <select
                                    value={unit}
                                    onChange={(e) => {
                                        setUnit(e.target.value);
                                        setVariantValue(prev => ({...prev, unit: e.target.value}));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Unit</option>
                                    <optgroup label="Count">
                                        <option value="pcs">Pieces (pcs)</option>
                                        <option value="bag">Bag</option>
                                        <option value="box">Box</option>
                                        <option value="set">Set</option>
                                        <option value="pack">Pack</option>
                                    </optgroup>
                                    <optgroup label="Weight">
                                        <option value="kg">Kilogram (kg)</option>
                                        <option value="g">Gram (g)</option>
                                        <option value="lbs">Pounds (lbs)</option>
                                    </optgroup>
                                    <optgroup label="Length">
                                        <option value="m">Meter (m)</option>
                                        <option value="cm">Centimeter (cm)</option>
                                        <option value="ft">Feet (ft)</option>
                                        <option value="in">Inch (in)</option>
                                    </optgroup>
                                    <optgroup label="Volume">
                                        <option value="L">Liter (L)</option>
                                        <option value="mL">Milliliter (mL)</option>
                                        <option value="gal">Gallon (gal)</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit Price (₱)
                                </label>
                                <input
                                    type="number"
                                    value={variantValue.unitPrice}
                                    onChange={(e) => setVariantValue(prev => ({...prev, unitPrice: e.target.value}))}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supplier Price (₱)
                                </label>
                                <input
                                    type="number"
                                    value={supplierPrice}
                                    onChange={(e) => setSupplierPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        
                        {/* Storage Unit Selection */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Storage Unit
                                <span className="text-xs text-red-500 ml-1">*</span>
                            </label>
                            <select
                                value={selectedUnit}
                                onChange={(e) => {
                                    setSelectedUnit(e.target.value);
                                    // Reset storage location when unit changes
                                    setSelectedStorageLocation(null);
                                }}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="Unit 01">Unit 01</option>
                                <option value="Unit 02">Unit 02</option>
                                <option value="Unit 03">Unit 03</option>
                                <option value="Unit 04">Unit 04</option>
                                <option value="Unit 05">Unit 05</option>
                                <option value="Unit 06">Unit 06</option>
                                <option value="Unit 07">Unit 07</option>
                                <option value="Unit 08">Unit 08</option>
                                <option value="Unit 09">Unit 09</option>
                            </select>
                        </div>
                        
                        {/* Storage Location Selection */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Storage Location (Shelf/Row/Column)
                                <span className="text-xs text-red-500 ml-1">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsStorageModalOpen(true)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-left hover:bg-gray-100"
                            >
                                {selectedStorageLocation ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-900">{selectedStorageLocation.fullLocation}</span>
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Click to select storage location</span>
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                            {selectedStorageLocation && (
                                <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <span className="font-medium">Selected:</span> {selectedStorageLocation.unit} → {selectedStorageLocation.shelf} → {selectedStorageLocation.row} → Column {selectedStorageLocation.columnDisplay || selectedStorageLocation.column}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* Enhanced Custom Fields */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-cyan-100 rounded-lg">
                                <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
                            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <input
                                type="text"
                                value={newVariantFieldName}
                                onChange={(e) => setNewVariantFieldName(e.target.value)}
                                placeholder="Add custom field"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Add Field
                            </button>
                        </div>
                        <div className="space-y-3">
                            {additionalVariantFields.map((field, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={field.value}
                                        onChange={(e) => {
                                            const updated = [...additionalVariantFields];
                                            updated[idx].value = e.target.value;
                                            setAdditionalVariantFields(updated);
                                        }}
                                        placeholder={field.name}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                        onClick={() => {
                                            setAdditionalVariantFields(
                                                additionalVariantFields.filter((_, i) => i !== idx)
                                            );
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Enhanced Submit Button */}
                    <div className="sticky bottom-0 bg-white pt-6 pb-2 -mx-1 px-6 border-t border-gray-200 shadow-lg">
                        <button
                            onClick={handleAddVariant}
                            className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl 
                                     hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-xl
                                     flex items-center justify-center gap-3 font-semibold text-lg
                                     transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Variant to Product
                        </button>
                    </div>
                </div>
            )}
            </div>
            
            {/* Storage Location Selection Modal */}
            <ShelfViewModal 
                isOpen={isStorageModalOpen}
                onClose={() => setIsStorageModalOpen(false)}
                selectedUnit={getStorageUnitData()}
                onLocationSelect={handleStorageLocationSelect}
            />
        </div>
    );
};

export default NewVariantForm;