import React, { useState, useEffect } from 'react';
import ProductFactory from '../../Factory/productFactory';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';
import app from '../../../../../FirebaseConfig';
import { uploadImage } from '../../../../../services/cloudinary/CloudinaryService';
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

const NewProductForm_GeneralInfo = ({ storageLocations, unitCapacities, onClose, onProductCreated }) => {
    // Base fields - GENERAL INFO ONLY
    const [productName, setProductName] = useState('');
    const [brand, setBrand] = useState('');
    const [description, setDescription] = useState('');
    const [specifications, setSpecifications] = useState('');
    const [productImage, setProductImage] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    
    // Category-based measurement states (auto-detected from category)
    const [measurementType, setMeasurementType] = useState('count');
    const [baseUnit, setBaseUnit] = useState('pcs');
    const [requireDimensions, setRequireDimensions] = useState(false);

    // Loading state for product creation
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);

    // Error modal states
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorModalData, setErrorModalData] = useState({
        title: '',
        message: '',
        details: '',
        type: 'error'
    });

    // Update measurement settings when category changes
    useEffect(() => {
        if (selectedCategory) {
            const rule = CATEGORY_RULES[selectedCategory] || CATEGORY_RULES["Miscellaneous"];
            setMeasurementType(rule.measurementType);
            setBaseUnit(rule.baseUnit);
            setRequireDimensions(rule.requireDimensions);
        }
    }, [selectedCategory]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);
            setUploadProgress(0);

            const uploadResult = await uploadImage(
                file,
                (progress) => {
                    setUploadProgress(progress);
                },
                {
                folder: `ims-products/${selectedCategory || 'general'}`,
                tags: [selectedCategory || 'product', productName || 'new-product'],
                }
            );

            setProductImage(uploadResult.url);
        } catch (error) {
            console.error('Error uploading image:', error);
            setErrorModalData({
                title: '❌ Image Upload Failed',
                message: 'Failed to upload product image',
                details: error.message,
                type: 'error'
            });
            setErrorModalOpen(true);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const removeImage = () => {
        setProductImage(null);
        const fileInput = document.getElementById("productImage");
        if (fileInput) fileInput.value = "";
    };



    const handleCreateProduct = async () => {
        // Validate required fields
        if (!productName.trim()) {
            setErrorModalData({
                title: '⚠️ Required Field Missing',
                message: 'Product Name is required',
                details: 'Please enter a name for this product before proceeding.',
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

      

        if (!selectedCategory) {
            setErrorModalData({
                title: '⚠️ Required Field Missing',
                message: 'Category is required',
                details: 'Please select a category for this product.',
                type: 'error'
            });
            setErrorModalOpen(true);
            return;
        }

        setIsCreatingProduct(true);

        try {
            const db = getFirestore(app);
            
            const productData = {
                name: productName.trim(),
                brand: brand.trim(),
                category: selectedCategory,
                measurementType: measurementType,
                baseUnit: baseUnit,
                requireDimensions: requireDimensions,
                description: description.trim(),
                specifications: specifications.trim(),
                imageUrl: productImage || null,
                categoryValues: {},
                customFields: {}
            };

            const newProduct = ProductFactory.createProduct(productData);

            // Save to Firestore in Master collection (NEW ARCHITECTURE)
            const productRef = doc(collection(db, 'Master'), newProduct.id);
            await setDoc(productRef, newProduct);

            // Show success modal
            setErrorModalData({
                title: '✅ Product Created Successfully!',
                message: `${productName} has been added to your inventory.`,
                details: 'Opening product details where you can add variants...',
                type: 'success'
            });
            setErrorModalOpen(true);

            // Wait a moment to show success, then call callback to open ViewProductModal
            setTimeout(() => {
                if (onProductCreated) {
                    onProductCreated(newProduct);
                }
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Error creating product:', error);
            setErrorModalData({
                title: '❌ Error Creating Product',
                message: 'Failed to create product',
                details: error.message || 'An unexpected error occurred. Please try again.',
                type: 'error'
            });
            setErrorModalOpen(true);
        } finally {
            setIsCreatingProduct(false);
        }
    };

    return (
        <div className="space-y-6 max-h-[85vh] overflow-y-auto modal-content px-1">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 -mx-1 px-6 py-5 z-10 rounded-t-xl border-b border-blue-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Create New Product</h2>
                        <p className="text-sm text-gray-600 mt-1">Fill in the product information below</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6 px-6 pb-6">
                {/* Info Box */}
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="font-semibold text-blue-900 mb-1">📋 What is a Product?</h4>
                            <p className="text-sm text-blue-800 leading-relaxed">
                                A <strong>Product</strong> represents the general information about an item (name, brand, category, image). 
                                After creating the product, you'll add <strong>Variants</strong> which contain specific details like 
                                stock quantity, price, storage location, and supplier information.
                            </p>
                            <p className="text-xs text-blue-700 mt-2">
                                💡 Example: Product = "Portland Cement" | Variants = "40kg Bag in Unit 03-A1", "25kg Bag in Unit 03-B2"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Product Image Upload */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-base font-semibold text-gray-800">Product Image</h3>
                        <span className="ml-auto text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">Optional</span>
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
                                    className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <label
                                htmlFor="productImage"
                                className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-blue-50/50 transition-all"
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

                {/* Basic Product Information */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="p-1.5 bg-green-100 rounded-lg">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
                        <span className="ml-auto text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="e.g. Portland Cement, G.I. Sheet, LED Bulb"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Brand <span className="text-gray-500 text-xs">(Leave blank if generic or no brand)</span>
                            </label>
                            <input
                                type="text"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                placeholder="e.g. Republic Cement, Yardstick, Philips"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="">Select a category...</option>
                                {Object.keys(CATEGORY_RULES).map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                💡 Measurement type and units will be automatically set based on the selected category
                            </p>
                        </div>

                        {/* Category Measurement Info */}
                        {selectedCategory && (
                            <div className="md:col-span-2">
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">
                                            � Selected Category: <strong>{selectedCategory}</strong>
                                        </span>
                                    </div>
                                    
                                    <div className="mt-3 pt-3 border-t border-blue-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-600">Measurement Settings:</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 bg-purple-100 border border-purple-200 text-purple-700 rounded-full text-xs font-medium">
                                                📏 {measurementType} ({baseUnit})
                                            </span>
                                            {requireDimensions && (
                                                <span className="px-2 py-1 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium">
                                                    📐 Requires Dimensions
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Description <span className="text-gray-500 text-xs">(Optional)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of the product..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Specifications <span className="text-gray-500 text-xs">(Optional)</span>
                            </label>
                            <textarea
                                value={specifications}
                                onChange={(e) => setSpecifications(e.target.value)}
                                placeholder="Technical specifications, certifications, standards..."
                                rows={2}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="sticky bottom-0 bg-white pt-6 pb-2 -mx-1 px-6 border-t border-gray-200 shadow-lg">
                    <button
                        onClick={handleCreateProduct}
                        disabled={isCreatingProduct}
                        className={`w-full py-4 rounded-xl transition-all shadow-md hover:shadow-xl
                                 flex items-center justify-center gap-3 font-semibold text-lg
                                 transform hover:scale-[1.02] active:scale-[0.98]
                                 ${isCreatingProduct 
                                     ? 'bg-gray-400 cursor-not-allowed' 
                                     : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                                 }`}
                    >
                        {isCreatingProduct ? (
                            <>
                                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Creating Product...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Create Product & Continue to Variants</span>
                            </>
                        )}
                    </button>
                    <p className="text-xs text-center text-gray-500 mt-3">
                        After creating the product, you'll add variants with pricing, quantity, and location details.
                    </p>
                </div>
            </div>

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

export default NewProductForm_GeneralInfo;
