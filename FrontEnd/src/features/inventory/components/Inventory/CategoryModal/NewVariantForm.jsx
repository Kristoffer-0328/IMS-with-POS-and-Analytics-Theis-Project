import React, { useState, useEffect } from "react";
import { useServices } from "../../../../../services/firebase/ProductServices";
import { getFirestore, doc, updateDoc, arrayUnion, getDoc, collection, getDocs } from "firebase/firestore";
import app from "../../../../../FirebaseConfig";
import { getCategorySpecificFields } from "./Utils";
import ProductFactory from "../../Factory/productFactory";
import SupplierSelector from '../../Supplier/SupplierSelector';

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

    const { listenToProducts, linkProductToSupplier } = useServices();
    const db = getFirestore(app);

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

    const handleSupplierSelect = (supplierData) => {
        setSelectedSupplier(supplierData);
    };

    const handleAddVariant = async () => {
        if (!selectedProduct) {
            alert('Please select a product first');
            return;
        }

        try {
            console.log('=== ADD VARIANT DEBUG START ===');
            console.log('Selected Product:', selectedProduct);
            console.log('Selected Category:', selectedCategory);

            // Filter out weight and type from category values and ensure no undefined values
            const filteredCategoryValues = localCategoryFields.reduce((acc, field) => {
                const value = variantValue[field.name];
                if (field.name !== 'weight' && field.name !== 'type' && value) {
                    acc[field.name] = value;
                }
                return acc;
            }, {});

            // Create variant data with enhanced fields (keeping all new attributes)
            const variantData = {
                quantity: Number(variantValue.quantity) || 0,
                unitPrice: Number(variantValue.unitPrice) || 0,
                unit: variantValue.unit || unit || 'pcs',
                location: variantValue.location || storageLocation || 'STR A1',
                size: variantValue.size || 'default',
                type: variantValue.type || 'standard',
                specifications: specifications || '',
                // Add supplier information if available
                ...(supplier || selectedSupplier ? {
                    supplier: {
                        name: (supplier || selectedSupplier).name,
                        code: (supplier || selectedSupplier).primaryCode || (supplier || selectedSupplier).code,
                        id: (supplier || selectedSupplier).id,
                        price: Number(supplierPrice) || Number(variantValue.unitPrice) || 0
                    }
                } : {}),
                categoryValues: filteredCategoryValues || {},
                ...(additionalVariantFields.length > 0 && {
                    customFields: additionalVariantFields.reduce((acc, field) => ({
                        ...acc,
                        [field.name]: field.value || ''
                    }), {})
                }),
                imageUrl: variantImage || null
            };

            console.log('Variant Data to Add:', variantData);

            // Find the correct product document first
            let productRef = null;
            let docSnap = null;
            let foundCategory = null;

            // First try with the provided category
            if (selectedCategory?.name) {
                const testProductRef = doc(db, 'Products', selectedCategory.name, 'Items', selectedProduct.id);
                const testDocSnap = await getDoc(testProductRef);
                
                if (testDocSnap.exists()) {
                    productRef = testProductRef;
                    docSnap = testDocSnap;
                    foundCategory = selectedCategory.name;
                    console.log('Found product in expected category:', selectedCategory.name);
                }
            }
            
            // If not found, search through all categories
            if (!productRef) {
                console.log('Product not found in expected category, searching all categories...');
                const categoriesRef = collection(db, 'Products');
                const categoriesSnapshot = await getDocs(categoriesRef);
                
                for (const categoryDoc of categoriesSnapshot.docs) {
                    const categoryName = categoryDoc.id;
                    const testProductRef = doc(db, 'Products', categoryName, 'Items', selectedProduct.id);
                    const testDocSnap = await getDoc(testProductRef);
                    
                    if (testDocSnap.exists()) {
                        foundCategory = categoryName;
                        productRef = testProductRef;
                        docSnap = testDocSnap;
                        console.log('Found product in category:', categoryName);
                        break;
                    }
                }
            }
            
            if (!productRef || !docSnap.exists()) {
                throw new Error(`Product document not found in any category. Product ID: ${selectedProduct.id}`);
            }

            // Get the current document data
            const currentData = docSnap.data();
            console.log('Current Product Data:', currentData);

            // Get existing variants and ensure it's an array - CRITICAL FIX
            const existingVariants = Array.isArray(currentData.variants) ? [...currentData.variants] : [];
            console.log('Existing Variants:', existingVariants);
            
            // Create new variant with unique ID
            const newVariant = {
                id: `${selectedProduct.id}_variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                parentProductId: selectedProduct.id,
                name: selectedProduct.name,
                brand: selectedProduct.brand || currentData.brand || 'Generic',
                category: foundCategory,
                subCategory: selectedProduct.subCategory || currentData.subCategory || foundCategory,
                quantity: Number(variantData.quantity || 0),
                unitPrice: Number(variantData.unitPrice || 0),
                unit: variantData.unit || currentData.unit || 'pcs',
                location: variantData.location || 'STR A1',
                storageType: variantData.storageType || currentData.storageType || 'Goods',
                size: variantData.size || 'default',
                specifications: variantData.specifications || '',
                supplier: variantData.supplier || currentData.supplier,
                customFields: variantData.customFields || {},
                categoryValues: variantData.categoryValues || {},
                imageUrl: variantData.imageUrl || null,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                isVariant: true
            };
            
            console.log('New Variant to Add:', newVariant);
            
            // Add to variants array
            const updatedVariants = [...existingVariants, newVariant];
            console.log('Updated Variants Array:', updatedVariants);

            // Calculate new total quantity (existing base quantity + all variant quantities)
            const variantQuantityTotal = updatedVariants.reduce((sum, variant) => 
                sum + (Number(variant.quantity) || 0), 0
            );
            
            // Preserve the original product's base quantity and add variant quantities
            const originalBaseQuantity = Number(currentData.quantity) || 0;
            const totalQuantity = originalBaseQuantity + variantQuantityTotal;
            
            console.log('Quantity Calculation:', {
                originalBaseQuantity,
                variantQuantityTotal,
                totalQuantity
            });

            // CRITICAL: Only update variants and quantity, preserve all other fields
            const updateData = {
                variants: updatedVariants,
                quantity: totalQuantity,
                lastUpdated: new Date().toISOString()
            };
            
            console.log('Update Data to Firebase:', updateData);

            // Update the document with only the necessary fields
            await updateDoc(productRef, updateData);

            console.log('Product updated successfully in Firebase');

            // If supplier is provided, also create a supplier-product relationship record for the variant
            const currentSupplier = supplier || selectedSupplier;
            if (currentSupplier) {
                try {
                    console.log('Creating supplier-product link for variant...');
                    const variantProductId = newVariant.id; // Use the unique variant ID
                    await linkProductToSupplier(variantProductId, currentSupplier.id, {
                        supplierPrice: Number(supplierPrice) || Number(variantValue.unitPrice) || 0,
                        supplierSKU: newVariant.id,
                        isVariant: true,
                        parentProductId: selectedProduct.id,
                        variantIndex: updatedVariants.length - 1,
                        lastUpdated: new Date().toISOString()
                    });
                    console.log('Supplier-product link created successfully');
                } catch (linkError) {
                    console.error('Error linking variant to supplier:', linkError);
                    // Don't fail the whole operation if linking fails
                }
            }

            console.log('=== ADD VARIANT DEBUG END ===');

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
        <div className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Add Variant</h2>
                <div className="mt-1">
                    <span className="text-sm text-gray-600">Category: </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {selectedCategory?.name}
                    </span>
                </div>
            </div>

            {/* Product Selection - Only show if no preSelectedProduct */}
            {!preSelectedProduct && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Base Product
                    </label>
                    <select
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onChange={(e) => handleProductSelect(e.target.value)}
                        value={selectedProduct?.id || ''}
                    >
                        <option value="">-- Select a Product --</option>
                        {existingProducts.map(product => (
                            <option key={product.id} value={product.id}>
                                {product.name || product.ProductName}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Show selected product info when preSelected */}
            {preSelectedProduct && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Adding variant to:</h3>
                    <p className="text-lg font-semibold text-blue-800">{preSelectedProduct.name}</p>
                    <p className="text-sm text-blue-600">Category: {preSelectedProduct.category}</p>
                </div>
            )}

            {selectedProduct && (
                <div className="space-y-6">
                    {/* Variant Information */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Variant Information</h3>
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

                    {/* Supplier Information */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Information</h3>
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

                    {/* Stock Information */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Information</h3>
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
                                </label>
                                <input
                                    type="text"
                                    value={variantValue.unit}
                                    onChange={(e) => setVariantValue(prev => ({...prev, unit: e.target.value}))}
                                    placeholder="e.g. pcs, kg"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
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
                    </div>



                    {/* Custom Fields */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
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

                    {/* Submit Button */}
                    <button
                        onClick={handleAddVariant}
                        className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
                    >
                        Add Variant
                    </button>
                </div>
            )}
        </div>
    );
};

export default NewVariantForm;