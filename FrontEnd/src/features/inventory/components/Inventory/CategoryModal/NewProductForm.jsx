import React, { useState, useEffect } from 'react';
import ProductFactory from '../../Factory/productFactory';
import { getFirestore, doc, setDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import app from '../../../../../FirebaseConfig';
import { validateProduct, getStorageOptions, getCategorySpecificFields, updateFieldOptions } from './Utils';
import SupplierSelector from '../../Supplier/SupplierSelector';
import { useServices } from '../../../../../services/firebase/ProductServices';
import ShelfViewModal from '../ShelfViewModal';

const NewProductForm = ({ selectedCategory, onClose, onBack, supplier }) => {
    const { linkProductToSupplier } = useServices();
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [location, setLocation] = useState('STR A1');

    const [restockLevel, setRestockLevel] = useState('');
    const [productImage, setProductImage] = useState(null);

    const [additionalFields, setAdditionalFields] = useState([]);
    const [newFieldName, setNewFieldName] = useState("");
    const [unit, setUnit] = useState('pcs');
    const [categoryFields, setCategoryFields] = useState([]);
    const [categoryValues, setCategoryValues] = useState({});
    const [editingField, setEditingField] = useState(null);
    const [newOptionValue, setNewOptionValue] = useState('');
    const [localCategoryFields, setLocalCategoryFields] = useState([]);
    
    // Add new state for supplier information
    const [brand, setBrand] = useState('');
    const [specifications, setSpecifications] = useState('');
    const [maximumStockLevel, setMaximumStockLevel] = useState('');
    const [size, setSize] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [supplierCode, setSupplierCode] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierPrice, setSupplierPrice] = useState('');
    const [dateStocked, setDateStocked] = useState(new Date().toISOString().split('T')[0]);
    
    // Storage location modal states
    const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
    const [selectedStorageLocation, setSelectedStorageLocation] = useState(null);
    
    // Mock storage unit data for the modal
    const getStorageUnitData = () => {
        const unitName = selectedCategory?.name || 'Unit 01';
        return {
            title: unitName,
            type: "Storage Unit",
            shelves: [
                {
                    name: "Shelf A",
                    rows: [
                        { name: "Row 1", items: [] },
                        { name: "Row 2", items: [] },
                        { name: "Row 3", items: [] },
                        { name: "Row 4", items: [] },
                        { name: "Row 5", items: [] },
                        { name: "Row 6", items: [] },
                        { name: "Row 7", items: [] },
                        { name: "Row 8", items: [] }
                    ]
                },
                {
                    name: "Shelf B",
                    rows: [
                        { name: "Row 1", items: [] },
                        { name: "Row 2", items: [] },
                        { name: "Row 3", items: [] },
                        { name: "Row 4", items: [] },
                        { name: "Row 5", items: [] },
                        { name: "Row 6", items: [] },
                        { name: "Row 7", items: [] },
                        { name: "Row 8", items: [] }
                    ]
                }
            ]
        };
    };
    
    // Handle storage location selection
    const handleStorageLocationSelect = (shelfName, rowName, columnIndex) => {
        const locationString = `${selectedCategory?.name} - ${shelfName} - ${rowName} - Column ${columnIndex + 1}`;
        setSelectedStorageLocation({
            unit: selectedCategory?.name,
            shelf: shelfName,
            row: rowName,
            column: columnIndex + 1,
            fullLocation: locationString
        });
        setLocation(locationString);
        setIsStorageModalOpen(false);
    };

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


    // When supplier is provided, we don't need supplier state variables
    useEffect(() => {
        if (supplier) {
            // Automatically use the supplier's information
            setSupplierName(supplier.name);
            setSupplierCode(supplier.primaryCode || supplier.code);
            setSelectedSupplier(supplier);
        }
    }, [supplier]);

    // Handle supplier selection from SupplierSelector
    const handleSupplierSelect = (supplierData) => {
        if (supplierData) {
            setSelectedSupplier(supplierData);
            setSupplierName(supplierData.name);
            setSupplierCode(supplierData.primaryCode || supplierData.code);
        } else {
            setSelectedSupplier(null);
            setSupplierName('');
            setSupplierCode('');
        }
    };

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
        console.log('Starting product creation...', {
            productName,
            brand,
            quantity,
            unitPrice,
            selectedCategory: selectedCategory?.name,
            supplier: supplier?.name
        });

        // Validate required fields
        if (!productName || !brand || !quantity || !unitPrice || !selectedStorageLocation) {
            alert('Please fill in all required fields: Product Name, Brand, Quantity, Unit Price, and Storage Location');
            return;
        }

        const productData = {
            name: productName.trim(),
            quantity: Number(quantity) || 0,
            unitPrice: Number(unitPrice) || 0,
            category: selectedCategory.name,
            storageLocation: selectedStorageLocation.unit,
            shelfName: selectedStorageLocation.shelf,
            rowName: selectedStorageLocation.row,
            columnIndex: selectedStorageLocation.column,
            fullLocation: `${selectedStorageLocation.unit} - ${selectedStorageLocation.shelf} - ${selectedStorageLocation.row} - Column ${selectedStorageLocation.column}`,
            location: selectedStorageLocation.unit, // Keep for backward compatibility
            unit: unit || 'pcs',
            brand: brand.trim(),
            size: size?.trim() || 'default',
            specifications: specifications?.trim() || '',
            maximumStockLevel: Number(maximumStockLevel) || 0,
            restockLevel: Number(restockLevel) || 0,
            dateStocked: dateStocked || new Date().toISOString().split('T')[0],
            imageUrl: productImage || null,
            categoryValues: categoryValues || {},
            supplier: supplier ? {
                name: supplier.name,
                code: supplier.primaryCode || supplier.code,
                primaryCode: supplier.primaryCode || supplier.code
            } : {
                name: supplierName?.trim() || 'Unknown',
                code: supplierCode?.trim() || '',
                primaryCode: supplierCode?.trim() || ''
            },
            customFields: additionalFields.reduce((acc, field) => ({
                ...acc,
                [field.name]: field.value || ''
            }), {}),
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        try {
            const db = getFirestore(app);
            
            // Generate the ID FIRST, before creating the product
            const currentSupplier = supplier || selectedSupplier;
            const productId = currentSupplier 
                ? ProductFactory.generateSupplierProductId(productData.name, selectedCategory.name, currentSupplier.primaryCode || currentSupplier.code)
                : ProductFactory.generateProductId(productData.name, selectedCategory.name, productData.brand);
            
            console.log('Generated product ID:', productId);
            console.log('Current supplier:', currentSupplier);
            
            // Create product with the correct ID
            const newProduct = ProductFactory.createProduct(productData);
            
            // Override the product ID to match our generated ID
            newProduct.id = productId;
            
            // Remove any undefined values
            const cleanProduct = JSON.parse(JSON.stringify(newProduct));

            console.log('Creating product in database...', {
                category: selectedCategory.name,
                productId,
                storageLocation: selectedStorageLocation.unit,
                shelf: selectedStorageLocation.shelf,
                row: selectedStorageLocation.row,
                column: selectedStorageLocation.column,
                productData: cleanProduct
            });

            // Create Firebase path: Products/{storageLocation}/{shelfName}/{rowName}/{columnIndex}/{productId}
            const storageLocation = selectedStorageLocation.unit;
            const shelfName = selectedStorageLocation.shelf;
            const rowName = selectedStorageLocation.row;
            const columnIndex = selectedStorageLocation.column;
            
            // Ensure all parent documents exist in the hierarchy
            // Firebase requires alternating collection/document structure
            // 1. Create storage location document (if it doesn't exist)
            const storageLocationRef = doc(db, 'Products', storageLocation);
            await setDoc(storageLocationRef, {
                name: storageLocation,
                type: 'storage_location',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            // 2. Create shelf document (using 'shelves' subcollection)
            const shelfRef = doc(db, 'Products', storageLocation, 'shelves', shelfName);
            await setDoc(shelfRef, {
                name: shelfName,
                type: 'shelf',
                storageLocation: storageLocation,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            // 3. Create row document (using 'rows' subcollection)
            const rowRef = doc(db, 'Products', storageLocation, 'shelves', shelfName, 'rows', rowName);
            await setDoc(rowRef, {
                name: rowName,
                type: 'row',
                storageLocation: storageLocation,
                shelfName: shelfName,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            // 4. Create column document (using 'columns' subcollection)
            const columnRef = doc(db, 'Products', storageLocation, 'shelves', shelfName, 'rows', rowName, 'columns', columnIndex.toString());
            await setDoc(columnRef, {
                name: `Column ${columnIndex}`,
                type: 'column',
                storageLocation: storageLocation,
                shelfName: shelfName,
                rowName: rowName,
                columnIndex: columnIndex,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            // 5. Create the actual product document (using 'items' subcollection)
            const productRef = doc(db, 'Products', storageLocation, 'shelves', shelfName, 'rows', rowName, 'columns', columnIndex.toString(), 'items', productId);
            await setDoc(productRef, cleanProduct);
            
            console.log('Product created successfully in database with full hierarchy:', {
                storageLocation,
                shelfName,
                rowName,
                columnIndex,
                productId,
                productPath: `Products/${storageLocation}/shelves/${shelfName}/rows/${rowName}/columns/${columnIndex}/items/${productId}`
            });

            // If supplier is provided, automatically link the product
            if (currentSupplier) {
                try {
                    console.log('Linking product to supplier...', {
                        productId,
                        supplierId: currentSupplier.id,
                        supplierPrice: Number(supplierPrice) || Number(unitPrice) || 0
                    });
                    
                    const linkResult = await linkProductToSupplier(productId, currentSupplier.id, {
                        supplierPrice: Number(supplierPrice) || Number(unitPrice) || 0,
                        supplierSKU: productId,
                        lastUpdated: new Date().toISOString()
                    });
                    
                    console.log('Link result:', linkResult);
                } catch (error) {
                    console.error('Error linking product to supplier:', error);
                    alert('Product created but failed to link to supplier: ' + error.message);
                }
            }

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
                {onBack && (
                    <button
                        onClick={onBack}
                        className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                        <span>← Back</span>
                    </button>
                )}
                <h2 className="text-xl font-semibold text-gray-800">Add Product</h2>
                <p className="text-sm text-gray-600">Storage Location: 
                    <span className="ml-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                        {selectedCategory?.name}
                    </span>
                </p>
            </div>

            <div className="space-y-6">
                {/* 1. Product Image */}
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

                {/* 2. Basic Product Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Basic Product Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Product Name
                                <span className="text-xs text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="e.g. Phillips Head Screwdriver, LED Bulb 10W"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Brand
                                <span className="text-xs text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="text"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                placeholder="Enter brand name"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Size/Dimension</label>
                            <input
                                type="text"
                                value={size}
                                onChange={(e) => setSize(e.target.value)}
                                placeholder="Enter size or dimension"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Specifications</label>
                            <textarea
                                value={specifications}
                                onChange={(e) => setSpecifications(e.target.value)}
                                placeholder="Enter product specifications"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                rows="2"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Stock Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Stock Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Initial Stock Quantity
                                <span className="text-xs text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                                placeholder="Enter initial stock quantity"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Unit
                                <span className="text-xs text-gray-500 ml-1">(Select measurement unit)</span>
                            </label>
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="">Select Unit</option>
                                <optgroup label="Count">
                                    <option value="pcs">Pieces (pcs)</option>
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

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Unit Price (₱)
                                <span className="text-xs text-red-500 ml-1">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Supplier Price (₱)
                                <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={supplierPrice}
                                    onChange={(e) => setSupplierPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Restock Level</label>
                            <input
                                type="number"
                                value={restockLevel}
                                onChange={(e) => setRestockLevel(e.target.value)}
                                placeholder="Minimum quantity"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Maximum Stock Level</label>
                            <input
                                type="number"
                                value={maximumStockLevel}
                                onChange={(e) => setMaximumStockLevel(e.target.value)}
                                placeholder="Maximum quantity"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Storage Location
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
                                        <span className="font-medium">Selected:</span> {selectedStorageLocation.unit} → {selectedStorageLocation.shelf} → {selectedStorageLocation.row} → Column {selectedStorageLocation.column}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Category-Specific Fields */}
                {localCategoryFields.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Category-Specific Fields</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>
                    </div>
                )}

                {/* 5. Custom Fields */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Custom Fields</h3>
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
                </div>

                {/* 6. Supplier Information */}
                {!supplier && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Supplier Information</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <SupplierSelector 
                                onSelect={handleSupplierSelect}
                                selectedSupplierId={selectedSupplier?.id}
                            />
                            {selectedSupplier && (
                                <div className="mt-3 p-3 bg-white rounded border">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Selected:</span> {selectedSupplier.name} ({selectedSupplier.primaryCode || selectedSupplier.code})
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

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

export default NewProductForm;