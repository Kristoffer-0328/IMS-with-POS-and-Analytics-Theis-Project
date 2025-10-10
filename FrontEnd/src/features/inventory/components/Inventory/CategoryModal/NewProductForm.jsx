import React, { useState, useEffect } from 'react';
import ProductFactory from '../../Factory/productFactory';
import { getFirestore, doc, setDoc, collection, addDoc, getDocs, query, getDoc } from 'firebase/firestore';
import app from '../../../../../FirebaseConfig';
import { validateProduct, getStorageOptions, getCategorySpecificFields, updateFieldOptions } from './Utils';
import SupplierSelector from '../../Supplier/SupplierSelector';
import { useServices } from '../../../../../services/firebase/ProductServices';
import ShelfViewModal from '../ShelfViewModal';
import { uploadImage } from '../../../../../services/cloudinary/CloudinaryService';

const NewProductForm = ({ selectedCategory, onClose, onBack, supplier }) => {
    const { linkProductToSupplier } = useServices();
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [location, setLocation] = useState(''); // Will be set when storage location is selected

    const [restockLevel, setRestockLevel] = useState('');
    const [productImage, setProductImage] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

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
    const [selectedUnit, setSelectedUnit] = useState('Unit 01'); // Add state for unit selection
    
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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Upload to Cloudinary with progress tracking
            const uploadResult = await uploadImage(
                file,
                (progress) => {
                    setUploadProgress(progress);
                },
                {
                    folder: `ims-products/${selectedCategory}`,
                    tags: [selectedCategory, productName || 'new-product'],
                }
            );

            // Set the permanent Cloudinary URL
            setProductImage(uploadResult.url);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image: ' + error.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const removeImage = () => {
        setProductImage(null);
        document.getElementById("productImage").value = "";
    };

    const handleAddProduct = async () => {

        // Validate required fields
        if (!productName || !brand || !quantity || !unitPrice || !selectedStorageLocation) {
            alert('Please fill in all required fields: Product Name, Brand, Quantity, Unit Price, and Storage Location');
            return;
        }

        // Fetch storage unit's category from Firebase
        const db = getFirestore(app);
        let unitCategory = selectedCategory.name; // fallback to storage location name
        
        try {
            const storageUnitRef = doc(db, "Products", selectedStorageLocation.unit);
            const storageUnitDoc = await getDoc(storageUnitRef);
            
            if (storageUnitDoc.exists()) {
                const unitData = storageUnitDoc.data();
                unitCategory = unitData.category || selectedCategory.name;

            }
        } catch (error) {

        }

        const productData = {
            name: productName.trim(),
            quantity: Number(quantity) || 0,
            unitPrice: Number(unitPrice) || 0,
            category: unitCategory, // Use storage unit's category instead of selectedCategory.name
            storageLocation: selectedStorageLocation.unit,
            shelfName: selectedStorageLocation.shelf,
            rowName: selectedStorageLocation.row,
            columnIndex: selectedStorageLocation.column, // 0-based index (0, 1, 2, 3) to match ShelfViewModal
            fullLocation: `${selectedStorageLocation.unit} - ${selectedStorageLocation.shelf} - ${selectedStorageLocation.row} - Column ${selectedStorageLocation.columnDisplay || selectedStorageLocation.column + 1}`,
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

            // Create product with the correct ID
            const newProduct = ProductFactory.createProduct(productData);
            
            // Override the product ID to match our generated ID
            newProduct.id = productId;
            
            // Add flat structure fields
            newProduct.isVariant = false;
            newProduct.parentProductId = null;
            newProduct.variantName = 'Standard';
            
            // Remove any undefined values
            const cleanProduct = JSON.parse(JSON.stringify(newProduct));

            // Write to Products/{storageLocation}/{productId} - NESTED BY STORAGE UNIT
            const storageUnitPath = selectedStorageLocation.unit; // e.g., "Unit 01"
            const productRef = doc(db, 'Products', storageUnitPath, 'products', productId);
            await setDoc(productRef, cleanProduct);

            console.log(`Product created at: Products/${storageUnitPath}/products/${productId}`);

            // If supplier is provided, automatically link the product
            if (currentSupplier) {
                try {
                    const linkResult = await linkProductToSupplier(productId, currentSupplier.id, {
                        supplierPrice: Number(supplierPrice) || Number(unitPrice) || 0,
                        supplierSKU: productId,
                        lastUpdated: new Date().toISOString()
                    });

                    console.log('Product linked to supplier:', linkResult);
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
        <div className="space-y-6 max-h-[85vh] overflow-y-auto modal-content px-1">
            {/* Enhanced Header with Gradient Background */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 -mx-1 px-6 py-5 z-10 rounded-t-xl border-b border-blue-100 shadow-sm">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="mb-3 px-3 py-1.5 text-gray-600 hover:text-blue-600 hover:bg-white/50 rounded-lg flex items-center gap-2 transition-all font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Add New Product</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">Storage Unit:</span>
                            <span className="px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded-full text-sm font-semibold shadow-sm">
                                {selectedCategory?.name}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6 px-6 pb-6">
                {/* Enhanced Product Image Upload Section */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-base font-semibold text-gray-800">Product Image</h3>
                    </div>
                    <div className="group relative w-full h-56 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden transition-all hover:border-blue-400 hover:shadow-md bg-white">
                        {isUploading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm text-gray-600 font-medium">Uploading to Cloudinary...</span>
                                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                                    <div 
                                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" 
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs text-gray-500">{uploadProgress}%</span>
                            </div>
                        ) : productImage ? (
                            <div className="relative h-full bg-gray-50">
                                <img src={productImage} alt="Preview" className="w-full h-full object-contain p-4" />
                                <button
                                    onClick={removeImage}
                                    className="absolute top-3 right-3 p-2 bg-red-500 backdrop-blur-sm text-white rounded-lg 
                                             hover:bg-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
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
                                     hover:bg-blue-50/50 transition-all group-hover:scale-[1.02]"
                        >
                            <div className="p-4 bg-blue-100 rounded-full mb-3 group-hover:bg-blue-200 transition-colors">
                                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-base font-medium text-gray-700 mb-1">Upload Product Image</span>
                            <span className="text-sm text-gray-500">Click to browse or drag and drop</span>
                            <span className="text-xs text-gray-400 mt-2">PNG, JPG, GIF up to 10MB</span>
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
                </div>

                {/* Enhanced Basic Product Information Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="p-1.5 bg-green-100 rounded-lg">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Basic Product Information</h3>
                        <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Required</span>
                    </div>
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

                {/* Enhanced Stock Information Section */}
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
                                    <option value="box">Bag</option>
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

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
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
                </div>

                {/* Enhanced Category-Specific Fields Section */}
                {localCategoryFields.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-orange-100 rounded-lg">
                                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Category-Specific Fields</h3>
                            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
                        </div>
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

                {/* Enhanced Custom Fields Section */}
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

                {/* Enhanced Supplier Information Section */}
                {!supplier && (
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

                {/* Enhanced Submit Button */}
                <div className="sticky bottom-0 bg-white pt-6 pb-2 -mx-1 px-6 border-t border-gray-200 shadow-lg">
                    <button
                        onClick={handleAddProduct}
                        className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl 
                                 hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-xl
                                 flex items-center justify-center gap-3 font-semibold text-lg
                                 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Product to Inventory
                    </button>
                </div>
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