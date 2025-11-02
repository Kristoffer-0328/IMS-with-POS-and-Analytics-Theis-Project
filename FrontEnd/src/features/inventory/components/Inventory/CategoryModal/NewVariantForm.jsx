import React, { useState, useEffect } from "react";
import { useServices } from "../../../../../services/firebase/ProductServices";
import { getFirestore, doc, setDoc, updateDoc, arrayUnion, getDoc, collection, getDocs } from "firebase/firestore";
import app from "../../../../../FirebaseConfig";
import { getCategorySpecificFields } from "./Utils";
import ProductFactory from "../../Factory/productFactory";
import SupplierSelector from '../../Supplier/SupplierSelector';
import ShelfViewModal from '../ShelfViewModal';
import { getStorageUnitData, validateDimensionConstraints, getRowDimensionConstraints } from '../../../config/StorageUnitsConfig';
import ErrorModal from '../../../../../components/modals/ErrorModal';

// Category-based measurement rules
const CATEGORY_RULES = {
    "Steel & Heavy Materials": { measurementType: "length", baseUnit: "m", requireDimensions: true },
    "Plywood & Sheet Materials": { measurementType: "length", baseUnit: "m", requireDimensions: true },
    "Roofing Materials": { measurementType: "length", baseUnit: "m", requireDimensions: true },
    "Insulation & Foam": { measurementType: "length", baseUnit: "m", requireDimensions: true },
    "Cement & Aggregates": { measurementType: "weight", baseUnit: "kg", requireDimensions: false },
    "Paint & Coatings": { measurementType: "volume", baseUnit: "l", requireDimensions: false },
    "Electrical & Plumbing": { measurementType: "count", baseUnit: "pcs", requireDimensions: false },
    "Hardware & Fasteners": { measurementType: "count", baseUnit: "pcs", requireDimensions: false },
    "Miscellaneous": { measurementType: "count", baseUnit: "pcs", requireDimensions: false }
};

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
    const [quantity, setQuantity] = useState('');
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
    const [selectedSuppliers, setSelectedSuppliers] = useState([]);
    const [supplierPrice, setSupplierPrice] = useState('');
    
    // Safety stock for ROP calculation
    const [safetyStock, setSafetyStock] = useState('');
    
    // Bundle/Package specification
    const [isBundle, setIsBundle] = useState(false);
    const [piecesPerBundle, setPiecesPerBundle] = useState('');
    const [bundlePackagingType, setBundlePackagingType] = useState('bundle');
    
    // Category-based measurement states
    const [measurementType, setMeasurementType] = useState('count');
    const [baseUnit, setBaseUnit] = useState('pcs');
    const [requireDimensions, setRequireDimensions] = useState(false);
    
    // Measurement-specific fields
    const [unitWeightKg, setUnitWeightKg] = useState('');
    const [unitVolumeLiters, setUnitVolumeLiters] = useState('');
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [thickness, setThickness] = useState('');
    const [unitVolumeCm3, setUnitVolumeCm3] = useState('');
    
    // UOM conversions for count-based items
    const [uomConversions, setUomConversions] = useState([]);
    const [newUomName, setNewUomName] = useState('');
    const [newUomQty, setNewUomQty] = useState('');
    
    // Storage location modal states
    const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
    const [selectedStorageLocations, setSelectedStorageLocations] = useState([]); // Changed to array for multiple selections
    const [selectedUnit, setSelectedUnit] = useState(selectedCategory?.name || null); // Auto-set from selectedCategory
    const [quantityPerLocation, setQuantityPerLocation] = useState({}); // Track quantity per location

    // Loading state for variant creation
    const [isCreatingVariant, setIsCreatingVariant] = useState(false);

    // Error modal states
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorModalData, setErrorModalData] = useState({
        title: '',
        message: '',
        details: '',
        type: 'error'
    });

    const { listenToProducts, linkProductToSupplier } = useServices();
    const db = getFirestore(app);
    
    // Handle storage location selection - now supports multiple locations
    // Handle storage location selection - now with quantity parameter
    const handleStorageLocationSelect = (shelfName, rowName, columnIndex, quantity) => {
        // If quantity is -1, this is a removal request
        if (quantity === -1) {
            const unitData = getStorageUnitData(selectedUnit);
            const unitName = unitData?.title?.split(' - ')[0] || selectedUnit;
            const locationKey = `${unitName}-${shelfName}-${rowName}-${columnIndex}`;
            handleRemoveLocation(locationKey);
            return;
        }
        
        // Validate dimension constraints if variant has dimensions
        if (requireDimensions && (length || width || thickness)) {
            const unitData = getStorageUnitData(selectedUnit);
            const unitName = unitData?.title?.split(' - ')[0] || selectedUnit;
            const rowConfig = getRowDimensionConstraints(unitName, shelfName, rowName);
            
            if (rowConfig) {
                const productDimensions = {
                    length: parseFloat(length) || 0,
                    width: parseFloat(width) || 0,
                    thickness: parseFloat(thickness) || 0,
                    diameter: parseFloat(thickness) || 0  // thickness field is used for diameter (in mm)
                };
                
                // Get the row object to validate
                const shelf = unitData.shelves.find(s => s.name === shelfName);
                const row = shelf?.rows.find(r => r.name === rowName);
                
                if (row) {
                    const validation = validateDimensionConstraints(row, productDimensions);
                    
                    if (!validation.isValid) {
                        // Show error modal instead of alert
                        setErrorModalData({
                            title: '📏 Dimension Constraint Error',
                            message: validation.message,
                            details: `Row: ${rowName}\nShelf: ${shelfName}\nUnit: ${unitName}\n\nPlease select a row that fits your variant dimensions or update the variant dimensions.`,
                            type: 'error'
                        });
                        setErrorModalOpen(true);
                        return;
                    }
                }
            }
        }
        
        const unitData = getStorageUnitData(selectedUnit);
        const unitName = unitData?.title?.split(' - ')[0] || selectedUnit;
        const locationKey = `${unitName}-${shelfName}-${rowName}-${columnIndex}`;
        const locationString = `${selectedUnit} - ${shelfName} - ${rowName} - Column ${columnIndex + 1}`;
        
        const newLocation = {
            id: locationKey,
            unit: unitName,
            shelf: shelfName,
            row: rowName,
            column: columnIndex,
            columnDisplay: columnIndex + 1,
            fullLocation: locationString,
            quantity: quantity // Quantity is now passed directly from the modal
        };
        
        // Add new location with quantity already set
        setSelectedStorageLocations(prev => [...prev, newLocation]);
        setQuantityPerLocation(prev => ({
            ...prev,
            [locationKey]: quantity
        }));
        
        // Don't close modal - allow multiple selections
    };
    
    // Handle removing a storage location
    const handleRemoveLocation = (locationId) => {
        setSelectedStorageLocations(prev => prev.filter(loc => loc.id !== locationId));
        setQuantityPerLocation(prev => {
            const updated = { ...prev };
            delete updated[locationId];
            return updated;
        });
    };
    
    // Handle quantity change for a specific location (for editing after selection)
    const handleLocationQuantityChange = (locationId, qty) => {
        setQuantityPerLocation(prev => ({
            ...prev,
            [locationId]: parseInt(qty) || 0
        }));
        // Also update in selectedStorageLocations
        setSelectedStorageLocations(prev => prev.map(loc => 
            loc.id === locationId ? { ...loc, quantity: parseInt(qty) || 0 } : loc
        ));
    };
    
    // Calculate total quantity across all locations
    const getTotalQuantity = () => {
        return Object.values(quantityPerLocation).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
    };
    
    // Calculate allocated quantity (for ShelfViewModal)
    const getAllocatedQuantity = () => {
        return getTotalQuantity();
    };
    
    // Calculate total bundles/packages based on pieces per bundle
    const getTotalBundles = () => {
        const total = getTotalQuantity();
        const perBundle = parseInt(piecesPerBundle) || 0;
        if (perBundle === 0) return 0;
        return Math.floor(total / perBundle);
    };
    
    // Calculate remaining loose pieces
    const getLoosePieces = () => {
        const total = getTotalQuantity();
        const perBundle = parseInt(piecesPerBundle) || 0;
        if (perBundle === 0) return total;
        return total % perBundle;
    };

    // Handle preSelectedProduct and supplier props
    useEffect(() => {
        if (preSelectedProduct) {
            setSelectedProduct(preSelectedProduct);
            setUnit(preSelectedProduct.measurements?.defaultUnit || preSelectedProduct.baseUnit || 'pcs');
            setStorageLocation(preSelectedProduct.location || 'STR A1');
            setVariantValue(prev => ({
                ...prev,
                unitPrice: preSelectedProduct.unitPrice || 
                    (preSelectedProduct.variants && preSelectedProduct.variants[0]?.unitPrice) || ''
            }));
            
            // Inherit measurement type from parent product
            if (preSelectedProduct.measurementType) {
                setMeasurementType(preSelectedProduct.measurementType);
                setBaseUnit(preSelectedProduct.baseUnit || 'pcs');
                setRequireDimensions(preSelectedProduct.measurementType === 'length');
            }
        }
    }, [preSelectedProduct]);

    useEffect(() => {
        if (supplier) {
            setSelectedSuppliers([supplier]);
        }
    }, [supplier]);

    // Update measurement settings when category changes
    useEffect(() => {
        if (selectedCategory?.category) {
            const categoryName = selectedCategory.category;
            const rule = CATEGORY_RULES[categoryName] || CATEGORY_RULES["Miscellaneous"];
            
            setMeasurementType(rule.measurementType);
            setBaseUnit(rule.baseUnit);
            setRequireDimensions(rule.requireDimensions);
            setUnit(rule.baseUnit);
            
            // Reset measurement-specific fields when category changes
            setUnitWeightKg('');
            setUnitVolumeLiters('');
            setLength('');
            setWidth('');
            setThickness('');
            setUnitVolumeCm3('');
            setUomConversions([]);
        }
    }, [selectedCategory]);

    // Auto-calculate volume for length-based products with dimensions
    useEffect(() => {
        if (measurementType === 'length' && requireDimensions && length && thickness) {
            const lengthCm = parseFloat(length) * 100; // m to cm
            const thicknessCm = parseFloat(thickness) / 10; // mm to cm
            
            let calculatedVolume;
            
            if (width && parseFloat(width) > 0) {
                // Sheet/panel product with width
                const widthCm = parseFloat(width); // already in cm
                calculatedVolume = lengthCm * widthCm * thicknessCm;
            } else {
                // Bar/rebar product (cylindrical) - use diameter for thickness
                // Volume of cylinder = π * r² * h
                const radius = thicknessCm / 2;
                calculatedVolume = Math.PI * radius * radius * lengthCm;
            }
            
            setUnitVolumeCm3(calculatedVolume.toFixed(2));
        } else {
            setUnitVolumeCm3('');
        }
    }, [length, width, thickness, measurementType, requireDimensions]);

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
    }, [selectedCategory?.name]);

    useEffect(() => {

    }, [existingProducts]);

    const handleProductSelect = (productId) => {
        const product = existingProducts.find(p => p.id === productId);

        if (product) {
            setSelectedProduct(product);
            setUnit(product.measurements?.defaultUnit || 'pcs');
            setStorageLocation(product.location || 'STR A1');
            setVariantValue(prev => ({
                ...prev,
                unitPrice: product.unitPrice ||
                    (product.variants && product.variants[0]?.unitPrice) || ''
            }));
        }
    };

    const handleSupplierSelect = (supplierData) => {
        // supplierData is an array of selected suppliers
        setSelectedSuppliers(supplierData);
    };

    // Add UOM conversion
    const handleAddUomConversion = () => {
        if (newUomName.trim() && newUomQty && parseFloat(newUomQty) > 0) {
            setUomConversions(prev => [
                ...prev,
                { name: newUomName.trim(), quantity: parseFloat(newUomQty) }
            ]);
            setNewUomName('');
            setNewUomQty('');
        }
    };

    // Remove UOM conversion
    const handleRemoveUomConversion = (index) => {
        setUomConversions(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddVariant = async () => {
        if (!selectedProduct) {
            alert('Please select a product first');
            return;
        }
        
        // Validate storage locations
        if (selectedStorageLocations.length === 0) {
            alert('Please select at least one storage location');
            return;
        }
        
        // Validate quantities for all locations
        const totalQty = getTotalQuantity();
        if (totalQty === 0) {
            alert('Please enter quantity for at least one storage location');
            return;
        }
        
        // Check if all selected locations have quantities
        const locationsWithoutQty = selectedStorageLocations.filter(
            loc => !quantityPerLocation[loc.id] || quantityPerLocation[loc.id] === 0
        );
        if (locationsWithoutQty.length > 0) {
            alert('Please enter quantity for all selected storage locations');
            return;
        }

        setIsCreatingVariant(true);

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

            // Get suppliers for variant (support multiple suppliers)
            const variantSuppliers = supplier ? [supplier] : selectedSuppliers;
            
            // Create variants for each storage location
            for (const location of selectedStorageLocations) {
                const locationQty = quantityPerLocation[location.id] || 0;

                // Generate unique variant ID for this location
                const locationSuffix = `${location.shelf}-${location.row}-${location.column}`;
                const baseVariantId = `${selectedProduct.id}_VAR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const variantId = selectedStorageLocations.length > 1 
                    ? `${baseVariantId}-${locationSuffix}` 
                    : baseVariantId;

                // Create variant data with all selected suppliers
                const variantProductData = {
                    id: variantId,
                    name: selectedProduct.name,
                    brand: selectedProduct.brand || 'Generic',
                    category: selectedProduct.category || selectedCategory?.name,
                    subCategory: selectedProduct.subCategory || selectedProduct.category,
                    
                    // Variant-specific data
                    quantity: locationQty,
                    unitPrice: Number(variantValue.unitPrice) || 0,
                    unit: variantValue.unit || unit || 'pcs',
                    size: variantValue.size || 'default',
                    specifications: specifications || '',
                    variantName: variantValue.size || 'Variant',
                    
                    // Storage location
                    storageLocation: location.unit,
                    shelfName: location.shelf,
                    rowName: location.row,
                    columnIndex: location.column,
                    fullLocation: location.fullLocation,
                    location: location.unit,
                    
                    // Variant identification
                    isVariant: true,
                    parentProductId: selectedProduct.id,
                    multiLocation: selectedStorageLocations.length > 1,
                    totalQuantityAllLocations: totalQty,
                    
                    // Supplier information - store all suppliers
                    suppliers: variantSuppliers.length > 0 ? variantSuppliers.map(supp => ({
                        name: supp.name,
                        code: supp.primaryCode || supp.code,
                        primaryCode: supp.primaryCode || supp.code,
                        id: supp.id,
                        price: Number(supplierPrice) || Number(variantValue.supplierPrice) || 0
                    })) : selectedProduct.supplier ? [selectedProduct.supplier] : [{
                        name: 'Unknown',
                        primaryCode: '',
                        code: ''
                    }],
                    
                    // Keep backward compatibility with single supplier field
                    supplier: variantSuppliers.length > 0 ? {
                        name: variantSuppliers[0].name,
                        code: variantSuppliers[0].primaryCode || variantSuppliers[0].code,
                        primaryCode: variantSuppliers[0].primaryCode || variantSuppliers[0].code,
                        id: variantSuppliers[0].id,
                        price: Number(supplierPrice) || Number(variantValue.supplierPrice) || 0
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
                    safetyStock: Number(safetyStock) || 0,
                    
                    // Measurement type and unit information
                    measurementType: measurementType,
                    baseUnit: baseUnit,
                    
                    // Bundle/Package information if specified
                    isBundle: isBundle,
                    ...(isBundle && piecesPerBundle && parseInt(piecesPerBundle) > 0 ? {
                        piecesPerBundle: parseInt(piecesPerBundle),
                        bundlePackagingType: bundlePackagingType,
                        totalBundles: getTotalBundles(),
                        loosePieces: getLoosePieces()
                    } : {}),
                    
                    // Timestamps
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };

                // Add measurement-specific fields
                if (measurementType === 'weight') {
                    variantProductData.unitWeightKg = Number(unitWeightKg) || 0;
                }
                if (measurementType === 'volume') {
                    variantProductData.unitVolumeLiters = Number(unitVolumeLiters) || 0;
                }
                if (measurementType === 'length' && requireDimensions) {
                    variantProductData.length = Number(length) || 0;
                    variantProductData.width = Number(width) || 0;
                    variantProductData.thickness = Number(thickness) || 0;
                    variantProductData.unitVolumeCm3 = Number(unitVolumeCm3) || 0;
                }
                if (measurementType === 'count' && uomConversions.length > 0) {
                    variantProductData.uomConversions = uomConversions;
                }

                // Remove any undefined values
                const cleanVariantData = JSON.parse(JSON.stringify(variantProductData));


                // Write variant to Products/{storageLocation}/products/{variantId} - NESTED BY STORAGE UNIT
                const storageUnitPath = location.unit;
                const variantRef = doc(db, 'Products', storageUnitPath, 'products', variantId);
                await setDoc(variantRef, cleanVariantData);


                // If suppliers are selected, create supplier-product relationships for the variant
                const suppliersToLink = supplier ? [supplier] : selectedSuppliers;
                for (const supplierToLink of suppliersToLink) {
                    try {
                        await linkProductToSupplier(variantId, supplierToLink.id, {
                            supplierPrice: Number(supplierPrice) || Number(variantValue.supplierPrice) || 0,
                            supplierSKU: variantId,
                            isVariant: true,
                            parentProductId: selectedProduct.id,
                            lastUpdated: new Date().toISOString()
                        });
                    } catch (linkError) {
                        console.error('Error linking variant to supplier:', linkError);
                        // Don't fail the whole operation if linking fails
                    }
                }
            }

            const locationCount = selectedStorageLocations.length;
            alert(`Variant added successfully across ${locationCount} location${locationCount > 1 ? 's' : ''}! Total quantity: ${totalQty}`);
            onBack();
        } catch (error) {
            console.error('Error adding variant:', error);
            alert(`Failed to add variant: ${error.message}`);
        } finally {
            setIsCreatingVariant(false);
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
                    {/* Enhanced Measurement/Dimension Information */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {measurementType === 'length' && 'Dimension Information'}
                                {measurementType === 'weight' && 'Weight Information'}
                                {measurementType === 'volume' && 'Volume Information'}
                                {measurementType === 'count' && 'Variant Information'}
                            </h3>
                            <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                                measurementType === 'length' ? 'bg-blue-100 text-blue-700' :
                                measurementType === 'weight' ? 'bg-green-100 text-green-700' :
                                measurementType === 'volume' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                                {measurementType === 'length' && '📏 Length-based'}
                                {measurementType === 'weight' && '⚖️ Weight-based'}
                                {measurementType === 'volume' && '🧪 Volume-based'}
                                {measurementType === 'count' && '📦 Count-based'}
                            </span>
                        </div>

                        {/* Common fields: Variant Type and Specifications */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Variant Type/Name
                                    <span className="text-xs text-gray-500 ml-1">(e.g., #4, #5, Blue, 10mm)</span>
                                </label>
                                <input
                                    type="text"
                                    value={variantValue.size}
                                    onChange={(e) => setVariantValue(prev => ({...prev, size: e.target.value}))}
                                    placeholder="Enter variant identifier"
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
                                    placeholder="Additional specifications"
                                    rows="2"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Weight-based fields */}
                        {measurementType === 'weight' && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                    </svg>
                                    <h4 className="text-sm font-semibold text-green-800">Unit Weight</h4>
                                    <span className="ml-auto text-xs text-red-500">Required</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-green-700 mb-1">
                                            Weight per Unit (kg) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={unitWeightKg}
                                            onChange={(e) => setUnitWeightKg(e.target.value)}
                                            placeholder="e.g., 50 for 50kg bags"
                                            className="w-full px-3 py-2 border border-green-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Volume-based fields */}
                        {measurementType === 'volume' && (
                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <h4 className="text-sm font-semibold text-purple-800">Unit Volume</h4>
                                    <span className="ml-auto text-xs text-red-500">Required</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-purple-700 mb-1">
                                            Volume per Unit (Liters) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={unitVolumeLiters}
                                            onChange={(e) => setUnitVolumeLiters(e.target.value)}
                                            placeholder="e.g., 5 for 5L cans"
                                            className="w-full px-3 py-2 border border-purple-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Length-based fields with dimensions */}
                        {measurementType === 'length' && requireDimensions && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                    <h4 className="text-sm font-semibold text-blue-800">Product Dimensions</h4>
                                    <span className="ml-auto text-xs text-red-500">Required</span>
                                </div>
                                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-blue-800">
                                        <span className="font-semibold">Tip:</span> For steel bars/rebars, only enter <strong>Length</strong> and <strong>Thickness (diameter)</strong>. For sheets/panels, enter all three dimensions.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-blue-700 mb-1">
                                            Length (m) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={length}
                                            onChange={(e) => setLength(e.target.value)}
                                            placeholder="e.g., 6"
                                            className="w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-blue-700 mb-1">
                                            Width (cm) <span className="text-gray-400">(Optional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={width}
                                            onChange={(e) => setWidth(e.target.value)}
                                            placeholder="For sheets only"
                                            className="w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-blue-700 mb-1">
                                            Thickness/Diameter (mm) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={thickness}
                                            onChange={(e) => setThickness(e.target.value)}
                                            placeholder="e.g., 12"
                                            className="w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                {unitVolumeCm3 && (
                                    <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm font-medium text-green-800">
                                                Calculated Volume: {unitVolumeCm3} cm³
                                            </span>
                                        </div>
                                        <p className="text-xs text-green-700 mt-2">
                                            {width && parseFloat(width) > 0 
                                                ? `📐 Sheet/Panel: ${length}m × ${width}cm × ${thickness}mm` 
                                                : `⭕ Cylindrical (Bar): π × (${thickness}mm ÷ 2)² × ${length}m`
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Count-based UOM conversions */}
                        {measurementType === 'count' && (
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    <h4 className="text-sm font-semibold text-orange-800">Unit of Measure Conversions</h4>
                                    <span className="ml-auto text-xs text-gray-500">Optional</span>
                                </div>
                                <p className="text-sm text-orange-700 mb-3">
                                    Define how different packaging units relate to the base unit ({baseUnit})
                                </p>
                                
                                {/* Add UOM Conversion Form */}
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newUomName}
                                        onChange={(e) => setNewUomName(e.target.value)}
                                        placeholder="Unit name (e.g., box, pack)"
                                        className="flex-1 px-3 py-2 border border-orange-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        value={newUomQty}
                                        onChange={(e) => setNewUomQty(e.target.value)}
                                        placeholder={`Qty in ${baseUnit}`}
                                        className="w-28 px-3 py-2 border border-orange-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddUomConversion}
                                        className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* Display UOM Conversions */}
                                {uomConversions.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-orange-700">Defined Conversions:</p>
                                        {uomConversions.map((uom, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                                                <span className="text-sm text-gray-900">
                                                    1 {uom.name} = {uom.quantity} {baseUnit}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveUomConversion(index)}
                                                    className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ====== LEGACY: Supplier Information Section (Commented out for future use) ====== */}
                    {/* 
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
                                    selectedSupplierIds={selectedSuppliers.map(s => s.id)}
                                />
                                {selectedSuppliers.length > 0 && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded border">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Selected Suppliers:</span>
                                        </p>
                                        <div className="mt-2 space-y-1">
                                            {selectedSuppliers.map((supplier, index) => (
                                                <div key={supplier.id} className="text-sm text-gray-700">
                                                    {supplier.name} ({supplier.primaryCode || supplier.code})
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    */}
                    {/* ====== END LEGACY: Supplier Information Section ====== */}

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
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="Enter quantity"
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
                            {/* LEGACY: Supplier Price field (commented out for future use)
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
                            */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Safety Stock
                                    <span className="text-xs text-gray-500 ml-1">(Used for reorder calculations)</span>
                                </label>
                                <input
                                    type="number"
                                    value={safetyStock}
                                    onChange={(e) => setSafetyStock(e.target.value)}
                                    placeholder="Buffer stock quantity"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Safety stock helps prevent stockouts during supply delays</p>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer mt-6">
                                    <input
                                        type="checkbox"
                                        checked={isBundle}
                                        onChange={(e) => setIsBundle(e.target.checked)}
                                        className="w-5 h-5 text-purple-600 bg-gray-50 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        This variant comes in bundles/packages
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 ml-7">
                                    Check this if packaged in bundles, boxes, or packs
                                </p>
                            </div>
                        </div>
                        
                        {/* Storage Location Selection - Combined */}
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-700">
                                    Storage Locations
                                    <span className="text-xs text-red-500 ml-1">* Select locations with quantity</span>
                                </label>
                                {quantity && getTotalQuantity() < parseInt(quantity) ? (
                                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                                        {parseInt(quantity) - getTotalQuantity()} remaining to allocate
                                    </span>
                                ) : quantity && getTotalQuantity() === parseInt(quantity) ? (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Fully allocated
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-500">
                                        {selectedStorageLocations.length} location{selectedStorageLocations.length !== 1 ? 's' : ''} selected
                                    </span>
                                )}
                            </div>
                            
                            {/* Show selected unit */}
                            {selectedUnit && (
                                <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                                    <span className="text-sm font-medium text-purple-700">Storage Unit: {selectedUnit}</span>
                                </div>
                            )}
                            
                            <button
                                type="button"
                                onClick={() => setIsStorageModalOpen(true)}
                                className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all text-left font-medium shadow-sm flex items-center justify-between"
                            >
                                <span>
                                    {selectedStorageLocations.length > 0 
                                        ? `${selectedStorageLocations.length} location${selectedStorageLocations.length > 1 ? 's' : ''} selected` 
                                        : `Select shelf locations in ${selectedUnit}`}
                                </span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </button>
                            
                            {/* Show selected locations with quantity inputs */}
                            {selectedStorageLocations.length > 0 && (
                                <div className="space-y-2 mt-3 max-h-64 overflow-y-auto">
                                    <div className="flex items-center justify-between text-xs font-medium text-gray-600 px-2">
                                        <span>Location</span>
                                        <span>Quantity</span>
                                    </div>
                                    {selectedStorageLocations.map((location) => (
                                        <div key={location.id} className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {location.shelf} → {location.row} → Col {location.columnDisplay}
                                                </p>
                                                <p className="text-xs text-gray-600">{location.unit}</p>
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                value={quantityPerLocation[location.id] || ''}
                                                onChange={(e) => handleLocationQuantityChange(location.id, e.target.value)}
                                                placeholder="Qty"
                                                className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLocation(location.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                                                title="Remove location"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    
                                    {/* Total Quantity Summary */}
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 font-medium">
                                        <span className="text-sm text-green-900">Total Quantity:</span>
                                        <span className="text-lg text-green-600">{getTotalQuantity()} {unit || 'pcs'}</span>
                                    </div>
                                </div>
                            )}
                            
                            {selectedStorageLocations.length === 0 && (
                                <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    <p className="text-sm text-gray-600">No storage locations selected</p>
                                    <p className="text-xs text-gray-500 mt-1">Click the button above to select locations</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bundle/Package Specification - Only show when isBundle is checked */}
                    {isBundle && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-5">
                                <div className="p-1.5 bg-teal-100 rounded-lg">
                                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Bundle/Package Details</h3>
                                <span className="ml-auto text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-full">Recommended</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Packaging Type
                                    </label>
                                    <select
                                        value={bundlePackagingType}
                                        onChange={(e) => setBundlePackagingType(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    >
                                        <option value="bundle">Bundle</option>
                                        <option value="box">Box</option>
                                        <option value="pack">Pack</option>
                                        <option value="case">Case</option>
                                        <option value="carton">Carton</option>
                                        <option value="pallet">Pallet</option>
                                        <option value="crate">Crate</option>
                                        <option value="bag">Bag</option>
                                    </select>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Pieces per {bundlePackagingType}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={piecesPerBundle}
                                        onChange={(e) => setPiecesPerBundle(e.target.value)}
                                        placeholder={`e.g., 20 pieces per ${bundlePackagingType}`}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>
                            
                            {/* Bundle Calculation Display */}
                            {piecesPerBundle && parseInt(piecesPerBundle) > 0 && getTotalQuantity() > 0 && (
                                <div className="mt-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-teal-100 rounded-lg">
                                            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <p className="text-sm font-semibold text-gray-800">Package Breakdown:</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-white rounded-lg border border-teal-200">
                                                    <p className="text-xs text-gray-600 mb-1">Total {bundlePackagingType}s</p>
                                                    <p className="text-2xl font-bold text-teal-600">{getTotalBundles()}</p>
                                                </div>
                                                <div className="p-3 bg-white rounded-lg border border-teal-200">
                                                    <p className="text-xs text-gray-600 mb-1">Loose Pieces</p>
                                                    <p className="text-2xl font-bold text-orange-600">{getLoosePieces()}</p>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg border border-teal-200">
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-semibold">{getTotalQuantity()}</span> {unit || 'pcs'} = 
                                                    <span className="font-semibold text-teal-600"> {getTotalBundles()} {bundlePackagingType}s</span>
                                                    {getLoosePieces() > 0 && (
                                                        <span className="text-orange-600"> + {getLoosePieces()} loose {unit || 'pcs'}</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    ({piecesPerBundle} {unit || 'pcs'} per {bundlePackagingType})
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                

                

                    {/* Enhanced Submit Button */}
                    <div className="sticky bottom-0 bg-white pt-6 pb-2 -mx-1 px-6 border-t border-gray-200 shadow-lg">
                        <button
                            onClick={handleAddVariant}
                            disabled={isCreatingVariant}
                            className={`w-full py-4 rounded-xl transition-all shadow-md hover:shadow-xl
                                     flex items-center justify-center gap-3 font-semibold text-lg
                                     transform hover:scale-[1.02] active:scale-[0.98]
                                     ${isCreatingVariant 
                                         ? 'bg-gray-400 cursor-not-allowed' 
                                         : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                                     }`}
                        >
                            {isCreatingVariant ? (
                                <>
                                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Creating Variant...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span>Add Variant to Product</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>



            )}

            </div>
            
            {/* Storage Location Selection Modal */}
            <ShelfViewModal 
                isOpen={isStorageModalOpen}
                onClose={() => setIsStorageModalOpen(false)}
                selectedUnit={getStorageUnitData(selectedUnit)}
                onLocationSelect={handleStorageLocationSelect}
                multiSelect={true}
                selectedLocations={selectedStorageLocations}
                totalQuantity={parseInt(quantity) || 0}
                allocatedQuantity={getAllocatedQuantity()}
                cellCapacity={100}
            />

            {/* Dimension Error Modal */}
            <ErrorModal
                isOpen={errorModalOpen}
                onClose={() => setErrorModalOpen(false)}
                title={errorModalData.title}
                message={errorModalData.message}
                details={errorModalData.details}
                type={errorModalData.type}
            />
        </div>
    );
};

export default NewVariantForm;
