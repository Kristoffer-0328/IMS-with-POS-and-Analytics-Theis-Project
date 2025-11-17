import React, { useState, useEffect } from 'react';
import ProductFactory from '../../Factory/productFactory';
import { getFirestore, doc, setDoc, collection, updateDoc, onSnapshot } from 'firebase/firestore';
import app from '../../../../../FirebaseConfig';
import SupplierSelector from '../../Supplier/SupplierSelector';
import { useServices } from '../../../../../services/firebase/ProductServices';
import ShelfViewModal from '../ShelfViewModal';
import { getStorageUnitData, validateDimensionConstraints, getRowDimensionConstraints } from '../../../config/StorageUnitsConfig';
import ErrorModal from '../../../../../components/modals/ErrorModal';

const NewVariantForm = ({ product, onClose, onBack, onVariantCreated, selectedCategory, storageLocations }) => {
    const { linkProductToSupplier } = useServices();
    
    // Variant identification
    const [variantName, setVariantName] = useState('');
    
    // Pricing and stock
    const [unitPrice, setUnitPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [safetyStock, setSafetyStock] = useState('');
    const [dateStocked, setDateStocked] = useState(new Date().toISOString().split('T')[0]);
    
    // Bundle/Package specification
    const [isBundle, setIsBundle] = useState(false);
    const [piecesPerBundle, setPiecesPerBundle] = useState('');
    const [bundlePackagingType, setBundlePackagingType] = useState('bundle');
    
    // Supplier information with individual prices
    const [selectedSuppliers, setSelectedSuppliers] = useState([]);
    const [supplierPrices, setSupplierPrices] = useState({}); // { supplierId: price }
    
    // Measurement-specific fields (inherited from product)
    const measurementType = product?.measurementType || 'count';
    const baseUnit = product?.baseUnit || 'pcs';
    const requireDimensions = product?.requireDimensions || false;
    
    // Weight-based fields
    const [unitWeightKg, setUnitWeightKg] = useState('');
    
    // Volume-based fields
    const [unitVolumeLiters, setUnitVolumeLiters] = useState('');
    
    // Length-based fields with dimensions
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [thickness, setThickness] = useState('');
    const [unitVolumeCm3, setUnitVolumeCm3] = useState('');
    
    // UOM conversions for count-based items
    const [uomConversions, setUomConversions] = useState([]);
    const [newUomName, setNewUomName] = useState('');
    const [newUomQty, setNewUomQty] = useState('');
    
    // Cement & Aggregates specific
    const [cementFormType, setCementFormType] = useState('packed');
    const [packagingVariant, setPackagingVariant] = useState('40kg');
    const [numberOfBags, setNumberOfBags] = useState('');
    const [bulkVolumeCubicMeters, setBulkVolumeCubicMeters] = useState('');
    
    // Storage location
    const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
    const [selectedStorageLocations, setSelectedStorageLocations] = useState([]); // Changed to array for multiple selections
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [quantityPerLocation, setQuantityPerLocation] = useState({}); // Track quantity per location

    // Loading and error states
    const [isCreatingVariant, setIsCreatingVariant] = useState(false);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorModalData, setErrorModalData] = useState({
        title: '',
        message: '',
        details: '',
        type: 'error'
    });

    // Don't auto-fill storage unit - let user select with category highlighting
    // The selectedUnit will be set when user manually selects from dropdown

    useEffect(() => {
        if (measurementType === 'length' && requireDimensions && length && thickness) {
            const lengthCm = parseFloat(length) * 100;
            const thicknessCm = parseFloat(thickness) / 10;
            
            let calculatedVolume;
            if (width && parseFloat(width) > 0) {
                const widthCm = parseFloat(width);
                calculatedVolume = lengthCm * widthCm * thicknessCm;
            } else {
                const radius = thicknessCm / 2;
                calculatedVolume = Math.PI * radius * radius * lengthCm;
            }
            
            setUnitVolumeCm3(calculatedVolume.toFixed(2));
        } else {
            setUnitVolumeCm3('');
        }
    }, [length, width, thickness, measurementType, requireDimensions]);

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

    // Handle storage location selection - now with quantity parameter and multi-location support
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
                    diameter: parseFloat(thickness) || 0
                };
                
                const shelf = unitData.shelves.find(s => s.name === shelfName);
                const row = shelf?.rows.find(r => r.name === rowName);
                
                if (row) {
                    const validation = validateDimensionConstraints(row, productDimensions);
                    
                    if (!validation.isValid) {
                        setErrorModalData({
                            title: '📏 Dimension Constraint Error',
                            message: validation.message,
                            details: `Row: ${rowName}\nShelf: ${shelfName}\nUnit: ${unitName}\n\nPlease select a row that fits your product dimensions.`,
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
        const newQty = parseInt(qty) || 0;
        
        // Calculate what the total would be with this new quantity
        const otherLocationsTotal = Object.entries(quantityPerLocation)
            .filter(([id]) => id !== locationId)
            .reduce((sum, [, q]) => sum + (parseInt(q) || 0), 0);
        
        const newTotal = otherLocationsTotal + newQty;
        const initialQty = parseInt(quantity) || 0;
        
        // Allow the change but show warning if exceeding
        setQuantityPerLocation(prev => ({
            ...prev,
            [locationId]: newQty
        }));
        
        // Also update in selectedStorageLocations
        setSelectedStorageLocations(prev => prev.map(loc => 
            loc.id === locationId ? { ...loc, quantity: newQty } : loc
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

    // Calculate total bundles (uses Initial Quantity field)
    const getTotalBundles = () => {
        const total = parseInt(quantity) || 0; // Use initial quantity from input field
        const perBundle = parseInt(piecesPerBundle) || 0;
        if (perBundle === 0) return 0;
        return Math.floor(total / perBundle);
    };
    
    // Calculate loose pieces (uses Initial Quantity field)
    const getLoosePieces = () => {
        const total = parseInt(quantity) || 0; // Use initial quantity from input field
        const perBundle = parseInt(piecesPerBundle) || 0;
        if (perBundle === 0) return total;
        return total % perBundle;
    };

    const handleCreateVariant = async () => {
        // Validate required fields
        if (!variantName.trim()) {
            setErrorModalData({
                title: '⚠️ Required Field Missing',
                message: 'Variant Name is required',
                details: 'Please enter a name or identifier for this variant (e.g., "40kg Bag", "Blue", "12mm").',
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        if (!unitPrice || parseFloat(unitPrice) <= 0) {
            setErrorModalData({
                title: '⚠️ Required Field Missing',
                message: 'Unit Price is required',
                details: 'Please enter a valid unit price greater than zero.',
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        // Validate storage locations
        if (selectedStorageLocations.length === 0) {
            setErrorModalData({
                title: '⚠️ Storage Location Required',
                message: 'Please select at least one storage location',
                details: 'Click the "Select Shelf, Row & Column" button to choose where this variant will be stored.',
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        // Validate quantities for all locations
        const totalQty = getTotalQuantity();
        if (totalQty === 0) {
            setErrorModalData({
                title: '⚠️ Quantity Required',
                message: 'Please enter quantity for at least one storage location',
                details: 'Total quantity across all locations must be greater than zero.',
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        // Check if all selected locations have quantities
        const locationsWithoutQty = selectedStorageLocations.filter(
            loc => !quantityPerLocation[loc.id] || quantityPerLocation[loc.id] === 0
        );
        if (locationsWithoutQty.length > 0) {
            setErrorModalData({
                title: '⚠️ Missing Quantities',
                message: 'Please enter quantity for all selected storage locations',
                details: `${locationsWithoutQty.length} location(s) are missing quantity values.`,
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        // Validate that total allocated quantity matches initial quantity
        const initialQty = parseInt(quantity) || 0;
        if (totalQty !== initialQty) {
            setErrorModalData({
                title: '⚠️ Quantity Mismatch',
                message: `Total allocated quantity (${totalQty}) doesn't match Initial Quantity (${initialQty})`,
                details: `Please adjust the quantities in each location so the total equals ${initialQty} ${baseUnit}.\n\nCurrent total: ${totalQty} ${baseUnit}\nRequired: ${initialQty} ${baseUnit}\nDifference: ${Math.abs(totalQty - initialQty)} ${baseUnit} ${totalQty > initialQty ? '(over)' : '(under)'}`,
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        // Validate measurement-specific fields
        if (measurementType === 'weight' && product.category !== 'Cement & Aggregates' && !unitWeightKg) {
            setErrorModalData({
                title: '⚠️ Weight Required',
                message: 'Please enter unit weight in kg',
                details: 'This is a weight-based product. Weight information is required.',
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        if (measurementType === 'volume' && !unitVolumeLiters) {
            setErrorModalData({
                title: '⚠️ Volume Required',
                message: 'Please enter unit volume in liters',
                details: 'This is a volume-based product. Volume information is required.',
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        if (measurementType === 'length' && requireDimensions && (!length || !thickness)) {
            setErrorModalData({
                title: '⚠️ Dimensions Required',
                message: 'Please enter length and thickness/diameter',
                details: 'This product requires dimension specifications.',
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        // Special validation for Cement & Aggregates
        if (product.category === 'Cement & Aggregates') {
            if (cementFormType === 'packed' && (!numberOfBags || !unitWeightKg)) {
                setErrorModalData({
                    title: '⚠️ Cement Details Required',
                    message: 'Please enter number of bags and weight per bag',
                    details: 'For packed cement, both fields are required.',
                    type: 'error'
                });
                setErrorModalOpen(true);
                return;
            } else if (cementFormType === 'raw' && !bulkVolumeCubicMeters) {
                setErrorModalData({
                    title: '⚠️ Volume Required',
                    message: 'Please enter volume in m³ for bulk cement',
                    details: 'For raw/bulk cement, volume is required.',
                    type: 'error'
                });
                setErrorModalOpen(true);
                return;
            }
        }

        setIsCreatingVariant(true);

        try {
            const db = getFirestore(app);
            
            // Build variant data with multi-location support
            const variantData = {
                variantName: variantName.trim(),
                quantity: getTotalQuantity(), // Total quantity across all locations
                unitPrice: parseFloat(unitPrice) || 0,
                safetyStock: parseInt(safetyStock) || 0,
                
                // Multi-location storage - properly structured
                locations: selectedStorageLocations.map(loc => ({
                    unit: loc.unit,
                    shelf: loc.shelf,
                    shelfName: loc.shelf,
                    row: loc.row,
                    rowName: loc.row,
                    column: loc.column,
                    columnIndex: loc.column,
                    quantity: quantityPerLocation[loc.id] || 0,
                    location: loc.fullLocation,
                    storageLocation: loc.unit // For backward compatibility
                })),
                
                suppliers: selectedSuppliers.map(s => ({
                    id: s.id,
                    name: s.name,
                    code: s.primaryCode || s.code,
                    primaryCode: s.primaryCode || s.code,
                    price: parseFloat(supplierPrices[s.id]) || 0 // Individual supplier price
                })),
                measurementType: measurementType,
                baseUnit: baseUnit,
                dateStocked: dateStocked,
                isBundle: isBundle,
                productInfo: {
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    imageUrl: product.imageUrl
                }
            };

            // Add measurement-specific fields
            if (measurementType === 'weight') {
                if (product.category === 'Cement & Aggregates') {
                    variantData.cementFormType = cementFormType;
                    if (cementFormType === 'packed') {
                        variantData.packagingVariant = packagingVariant;
                        variantData.numberOfBags = parseInt(numberOfBags) || 0;
                        variantData.weightPerBag = parseFloat(unitWeightKg) || 0;
                        variantData.unitWeightKg = parseFloat(unitWeightKg) || 0;
                    } else {
                        variantData.bulkVolumeCubicMeters = parseFloat(bulkVolumeCubicMeters) || 0;
                        if (unitWeightKg) {
                            variantData.approximateWeightKg = parseFloat(unitWeightKg) || 0;
                        }
                    }
                } else {
                    variantData.unitWeightKg = parseFloat(unitWeightKg) || 0;
                }
            }

            if (measurementType === 'volume') {
                variantData.unitVolumeLiters = parseFloat(unitVolumeLiters) || 0;
            }

            if (measurementType === 'length' && requireDimensions) {
                variantData.length = parseFloat(length) || 0;
                variantData.width = parseFloat(width) || 0;
                variantData.thickness = parseFloat(thickness) || 0;
                variantData.unitVolumeCm3 = parseFloat(unitVolumeCm3) || 0;
            }

            if (measurementType === 'count' && uomConversions.length > 0) {
                variantData.uomConversions = uomConversions;
            }

            // Add bundle information
            if (isBundle && piecesPerBundle && parseInt(piecesPerBundle) > 0) {
                variantData.piecesPerBundle = parseInt(piecesPerBundle);
                variantData.bundlePackagingType = bundlePackagingType;
                variantData.totalBundles = getTotalBundles();
                variantData.loosePieces = getLoosePieces();
            }

            // Create variant using ProductFactory
            const newVariant = ProductFactory.createVariant(product.id, variantData);

            // Save to Firestore Variants collection
            const variantRef = doc(collection(db, 'Variants'), newVariant.id);
            await setDoc(variantRef, newVariant);

            // Update product aggregate stats in Master collection
            const productRef = doc(db, 'Master', product.id);
            const currentTotalVariants = (product.totalVariants || 0) + 1;
            const currentTotalStock = (product.totalStock || 0) + newVariant.quantity;
            const currentLowestPrice = product.lowestPrice 
                ? Math.min(product.lowestPrice, newVariant.unitPrice)
                : newVariant.unitPrice;
            const currentHighestPrice = product.highestPrice
                ? Math.max(product.highestPrice, newVariant.unitPrice)
                : newVariant.unitPrice;

            await setDoc(productRef, {
                totalVariants: currentTotalVariants,
                totalStock: currentTotalStock,
                lowestPrice: currentLowestPrice,
                highestPrice: currentHighestPrice,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            // Link to suppliers
            for (const supplier of selectedSuppliers) {
                try {
                    await linkProductToSupplier(newVariant.id, supplier.id, {
                        supplierPrice: parseFloat(supplierPrices[supplier.id]) || 0,
                        supplierSKU: newVariant.id,
                        lastUpdated: new Date().toISOString()
                    });
                } catch (error) {
                    console.error('Error linking variant to supplier:', error);
                }
            }

            // Show success
            const locationsSummary = selectedStorageLocations.length === 1 
                ? selectedStorageLocations[0].fullLocation
                : `${selectedStorageLocations.length} locations`;
            
            setErrorModalData({
                title: '✅ Variant Created Successfully!',
                message: `${variantName} has been added to ${product.name}`,
                details: `Quantity: ${getTotalQuantity()} ${baseUnit}\nPrice: ₱${unitPrice}\nLocation: ${locationsSummary}`,
                type: 'success'
            });
            setErrorModalOpen(true);

            // Call callback
            if (onVariantCreated) {
                onVariantCreated(newVariant);
            }

            // Close after showing success
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Error creating variant:', error);
            setErrorModalData({
                title: '❌ Error Creating Variant',
                message: 'Failed to create variant',
                details: error.message || 'An unexpected error occurred. Please try again.',
                type: 'error'
            });
            setErrorModalOpen(true);
        } finally {
            setIsCreatingVariant(false);
        }
    };

    return (
        <div className="space-y-6 max-h-[85vh] overflow-y-auto modal-content px-1">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-50 to-emerald-50 -mx-1 px-6 py-5 z-10 rounded-t-xl border-b border-green-100 shadow-sm">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="mb-3 px-3 py-1.5 text-gray-600 hover:text-green-600 hover:bg-white/50 rounded-lg flex items-center gap-2 transition-all font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>
                )}
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-500 rounded-lg flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-800">Add Variant</h2>
                        <p className="text-sm text-gray-600 mt-1">Step 2: Stock, Pricing & Location</p>
                        <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center gap-3">
                                {product.imageUrl && (
                                    <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                                )}
                                <div>
                                    <p className="font-semibold text-gray-800">{product.name}</p>
                                    <p className="text-xs text-gray-600">{product.brand} • {product.category}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                            {product.measurementType} ({product.baseUnit})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6 px-6 pb-6">
                {/* Info Box */}
                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="font-semibold text-green-900 mb-1">🏷️ What is a Variant?</h4>
                            <p className="text-sm text-green-800 leading-relaxed">
                                A <strong>Variant</strong> represents a specific instance of the product with its own stock quantity, 
                                price, storage location, and supplier. You can create multiple variants for different sizes, 
                                colors, specifications, or storage locations.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Variant Identification */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Variant Identification</h3>
                        <span className="ml-auto text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Variant Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={variantName}
                            onChange={(e) => setVariantName(e.target.value)}
                            placeholder="e.g., 40kg Bag, Blue, 12mm, Unit 03 Stock"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        />
                        <p className="text-xs text-gray-500">
                            A unique identifier for this variant (size, color, specification, or location)
                        </p>
                    </div>
                </div>

                {/* Pricing & Stock Information */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="p-1.5 bg-yellow-100 rounded-lg">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Pricing & Stock</h3>
                        <span className="ml-auto text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Unit Price (₱) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Only show Initial Quantity for non-aggregates, or for aggregates with packed form */}
                        {(
                            product.category !== 'Cement & Aggregates' ||
                            (product.category === 'Cement & Aggregates' && cementFormType === 'packed')
                        ) && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Initial Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder={`Enter quantity in ${baseUnit}`}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Safety Stock <span className="text-gray-500 text-xs">(for ROP)</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={safetyStock}
                                onChange={(e) => setSafetyStock(e.target.value)}
                                placeholder="Buffer stock quantity"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Date Stocked
                            </label>
                            <input
                                type="date"
                                value={dateStocked}
                                onChange={(e) => setDateStocked(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isBundle}
                                    onChange={(e) => setIsBundle(e.target.checked)}
                                    className="w-5 h-5 text-green-600 bg-gray-50 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Packaged in bundles
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Bundle Configuration */}
                    {isBundle && (
                        <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                            <h4 className="text-sm font-semibold text-teal-900 mb-3">Bundle Configuration</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Packaging Type</label>
                                    <select
                                        value={bundlePackagingType}
                                        onChange={(e) => setBundlePackagingType(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="bundle">Bundle</option>
                                        <option value="box">Box</option>
                                        <option value="pack">Pack</option>
                                        <option value="case">Case</option>
                                        <option value="bag">Bag</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Pieces per {bundlePackagingType}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={piecesPerBundle}
                                        onChange={(e) => setPiecesPerBundle(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                            {piecesPerBundle && quantity && parseInt(piecesPerBundle) > 0 && (
                                <div className="mt-3 p-3 bg-white rounded-lg text-sm">
                                    <p className="text-gray-700">
                                        <span className="font-semibold">{getTotalBundles()}</span> {bundlePackagingType}s
                                        {getLoosePieces() > 0 && <span> + <span className="font-semibold">{getLoosePieces()}</span> loose {baseUnit}</span>}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Measurement-Specific Fields (conditionally shown based on product.measurementType) */}
                {measurementType === 'weight' && product.category === 'Cement & Aggregates' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Aggregates Specifications</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCementFormType('packed')}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        cementFormType === 'packed'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                    }`}
                                >
                                    <div className="text-center">
                                        <p className="font-semibold text-gray-900">Packed (Bags)</p>
                                        <p className="text-xs text-gray-600 mt-1">Bagged cement</p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCementFormType('raw')}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        cementFormType === 'raw'
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                    }`}
                                >
                                    <div className="text-center">
                                        <p className="font-semibold text-gray-900">Bulk (Raw)</p>
                                        <p className="text-xs text-gray-600 mt-1">Loose cement</p>
                                    </div>
                                </button>
                            </div>

                            {cementFormType === 'packed' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Bag Size</label>
                                        <select
                                            value={packagingVariant}
                                            onChange={(e) => {
                                                setPackagingVariant(e.target.value);
                                                if (e.target.value === '40kg') setUnitWeightKg('40');
                                                else if (e.target.value === '25kg') setUnitWeightKg('25');
                                                else if (e.target.value === '10kg') setUnitWeightKg('10');
                                                else if (e.target.value === '5kg') setUnitWeightKg('5');
                                                else setUnitWeightKg('');
                                            }}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                                        >
                                            <option value="40kg">40 kg Bag</option>
                                            <option value="25kg">25 kg Bag</option>
                                            <option value="10kg">10 kg (Repacked)</option>
                                            <option value="5kg">5 kg (Repacked)</option>
                                            <option value="sack">Custom Sack</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Number of Bags</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={numberOfBags}
                                            onChange={(e) => setNumberOfBags(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Weight per Bag (kg)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={unitWeightKg}
                                            onChange={(e) => setUnitWeightKg(e.target.value)}
                                            disabled={packagingVariant !== 'sack'}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg disabled:bg-gray-200"
                                        />
                                    </div>
                                </div>
                            )}

                            {cementFormType === 'raw' && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Volume (m³)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={bulkVolumeCubicMeters}
                                        onChange={(e) => setBulkVolumeCubicMeters(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Weight-based (non-cement) */}
                {measurementType === 'weight' && product.category !== 'Cement & Aggregates' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <h3 className="text-lg font-semibold text-gray-900">Weight Information</h3>
                            <span className="ml-auto text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Unit Weight (kg) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={unitWeightKg}
                                onChange={(e) => setUnitWeightKg(e.target.value)}
                                placeholder="Weight per unit in kilograms"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>
                )}

                {/* Volume-based */}
                {measurementType === 'volume' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <h3 className="text-lg font-semibold text-gray-900">Volume Information</h3>
                            <span className="ml-auto text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Unit Volume (Liters) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={unitVolumeLiters}
                                onChange={(e) => setUnitVolumeLiters(e.target.value)}
                                placeholder="Volume per unit in liters"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>
                )}

                {/* Length-based with dimensions */}
                {measurementType === 'length' && requireDimensions && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <h3 className="text-lg font-semibold text-gray-900">Dimensions</h3>
                            <span className="ml-auto text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Length (m) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={length}
                                    onChange={(e) => setLength(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Width (cm)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={width}
                                    onChange={(e) => setWidth(e.target.value)}
                                    placeholder="For sheets"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Thickness (mm) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={thickness}
                                    onChange={(e) => setThickness(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>
                        {unitVolumeCm3 && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-800">
                                Calculated Volume: {unitVolumeCm3} cm³
                            </div>
                        )}
                    </div>
                )}

                {/* Count-based with UOM conversions */}
                {measurementType === 'count' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <h3 className="text-lg font-semibold text-gray-900">UOM Conversions</h3>
                            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newUomName}
                                    onChange={(e) => setNewUomName(e.target.value)}
                                    placeholder="Unit name (e.g., box, pack)"
                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    value={newUomQty}
                                    onChange={(e) => setNewUomQty(e.target.value)}
                                    placeholder={`Qty in ${baseUnit}`}
                                    className="w-24 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddUomConversion}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                                >
                                    Add
                                </button>
                            </div>
                            {uomConversions.length > 0 && (
                                <div className="space-y-2">
                                    {uomConversions.map((uom, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded text-sm">
                                            <span>1 {uom.name} = {uom.quantity} {baseUnit}</span>
                                            <button
                                                onClick={() => handleRemoveUomConversion(index)}
                                                className="p-1 text-red-500 hover:bg-red-100 rounded"
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
                    </div>
                )}

                {/* Supplier Selection */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Supplier Information</h3>
                        <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
                    </div>
                    
                    <SupplierSelector
                        onSelect={(suppliers) => {
                            setSelectedSuppliers(suppliers);
                            // Initialize prices for new suppliers
                            const newPrices = { ...supplierPrices };
                            suppliers.forEach(supplier => {
                                if (!newPrices[supplier.id]) {
                                    newPrices[supplier.id] = '';
                                }
                            });
                            // Remove prices for unselected suppliers
                            Object.keys(newPrices).forEach(id => {
                                if (!suppliers.find(s => s.id === id)) {
                                    delete newPrices[id];
                                }
                            });
                            setSupplierPrices(newPrices);
                        }}
                        selectedSupplierIds={selectedSuppliers.map(s => s.id)}
                        multiSelect={true}
                    />

                    {/* Selected Suppliers with Individual Prices */}
                    {selectedSuppliers.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">Supplier Prices:</p>
                            {selectedSuppliers.map((supplier) => (
                                <div key={supplier.id} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span className="font-semibold text-gray-900">{supplier.name}</span>
                                            </div>
                                            {supplier.primaryCode && (
                                                <p className="text-xs text-gray-600 mb-2">Code: {supplier.primaryCode}</p>
                                            )}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Price from this supplier (₱)
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={supplierPrices[supplier.id] || ''}
                                                        onChange={(e) => setSupplierPrices({
                                                            ...supplierPrices,
                                                            [supplier.id]: e.target.value
                                                        })}
                                                        placeholder="0.00"
                                                        className="w-full pl-8 pr-4 py-2 bg-white border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Storage Location Selection */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Storage Location</h3>
                        <span className="ml-auto text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                    </div>

                    {/* Visual Storage Unit Selection */}
                    <div className="space-y-4 mb-4">
                        <label className="block text-sm font-medium text-gray-700">
                            Select Storage Unit <span className="text-red-500">*</span>
                        </label>
                        
                        {/* Helper text with recommendation indicator */}
                        {product?.category && (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <p className="text-xs text-purple-900">
                                    <span className="font-semibold">Recommended for {product.category}:</span> Units with highlighted borders match your product category
                                </p>
                            </div>
                        )}

                        {/* Visual Unit Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {storageLocations && storageLocations.map((location) => {
                                const isRecommended = location.category === product?.category;
                                const isSelected = selectedUnit === location.name;
                                
                                return (
                                    <button
                                        key={location.id}
                                        type="button"
                                        onClick={() => setSelectedUnit(location.name)}
                                        className={`
                                            relative p-4 rounded-lg border-2 transition-all duration-200
                                            hover:shadow-md hover:scale-105
                                            ${isSelected 
                                                ? 'border-green-500 bg-green-50 shadow-lg scale-105' 
                                                : isRecommended
                                                    ? 'border-purple-400 bg-purple-50 hover:border-purple-500'
                                                    : 'border-gray-300 bg-white hover:border-gray-400'
                                            }
                                        `}
                                    >
                                        {/* Recommended Badge */}
                                        {isRecommended && !isSelected && (
                                            <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                Match
                                            </div>
                                        )}
                                        
                                        {/* Selected Checkmark */}
                                        {isSelected && (
                                            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Unit Content */}
                                        <div className="text-center">
                                            <div className={`text-sm font-bold mb-1 ${
                                                isSelected ? 'text-green-900' : 
                                                isRecommended ? 'text-purple-900' : 
                                                'text-gray-900'
                                            }`}>
                                                {location.name}
                                            </div>
                                            <div className={`text-xs ${
                                                isSelected ? 'text-green-700' : 
                                                isRecommended ? 'text-purple-700' : 
                                                'text-gray-600'
                                            }`}>
                                                {location.category}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* Show selected unit confirmation */}
                        {selectedUnit && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-sm font-medium text-green-900">Selected: {selectedUnit}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shelf, Row & Column Selection */}
                    <button
                        type="button"
                        onClick={() => setIsStorageModalOpen(true)}
                        disabled={!selectedUnit}
                        className={`w-full px-4 py-3 rounded-lg transition-all font-medium shadow-sm flex items-center justify-between ${
                            selectedUnit
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 cursor-pointer'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <span>
                            {selectedStorageLocations.length > 0 
                                ? `${selectedStorageLocations.length} Location${selectedStorageLocations.length > 1 ? 's' : ''} Selected` 
                                : selectedUnit 
                                    ? 'Select Shelf, Row & Column'
                                    : 'Please select a storage unit first'}
                        </span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Display Selected Storage Locations */}
                    {selectedStorageLocations.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Selected Locations:</span>
                                <span className="text-xs text-gray-500">Total: {getTotalQuantity()} {baseUnit}</span>
                            </div>
                            
                            {/* Quantity Distribution Info */}
                            {quantity && getTotalQuantity() !== parseInt(quantity) && (
                                <div className={`p-2 rounded-lg text-xs ${
                                    getTotalQuantity() > parseInt(quantity) 
                                        ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' 
                                        : 'bg-blue-50 border border-blue-200 text-blue-800'
                                }`}>
                                    {getTotalQuantity() > parseInt(quantity) ? '⚠️ ' : 'ℹ️ '}
                                    Allocated: {getTotalQuantity()} {baseUnit} | Initial Quantity: {quantity} {baseUnit}
                                    {getTotalQuantity() > parseInt(quantity) && ' (Exceeds initial quantity)'}
                                </div>
                            )}
                            
                            {selectedStorageLocations.map((location) => (
                                <div key={location.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">
                                                {location.shelf} → {location.row} → Col {location.columnDisplay}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1">{location.unit}</p>
                                            <div className="mt-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Quantity:
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={quantityPerLocation[location.id] || 0}
                                                    onChange={(e) => handleLocationQuantityChange(location.id, e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveLocation(location.id)}
                                            className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="sticky bottom-0 bg-white pt-6 pb-2 -mx-1 px-6 border-t border-gray-200 shadow-lg">
                    <button
                        onClick={handleCreateVariant}
                        disabled={isCreatingVariant}
                        className={`w-full py-4 rounded-xl transition-all shadow-md hover:shadow-xl
                                 flex items-center justify-center gap-3 font-semibold text-lg
                                 transform hover:scale-[1.02] active:scale-[0.98]
                                 ${isCreatingVariant 
                                     ? 'bg-gray-400 cursor-not-allowed' 
                                     : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Add Variant to Product</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Storage Location Modal */}
            {selectedUnit && (
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
            )}

            {/* Error/Success Modal */}
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
