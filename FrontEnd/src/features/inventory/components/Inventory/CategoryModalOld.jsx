import React, { useState, useEffect } from 'react';
import app from '../../../FirebaseConfig';
import {
  getFirestore,
  getDocs,
  addDoc,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { ProductFactory } from '../Factory/productFactory';
import { useServices } from '../../../FirebaseBackEndQuerry/ProductServices';

const CategoryModal = ({ CategoryOpen, CategoryClose }) => {
  const [categories, setCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [previousState, setPreviousState] = useState({
    category: null,
    activeForm: null
  });
  const { listenToProducts } = useServices();
  const db = getFirestore(app);

  const storageOptions = [];
  const rows = ["A", "B", "C"];
  for (let row of rows) {
    for (let i = 1; i <= 3; i++) {
      storageOptions.push(`STR ${row}${i}`);
    }
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    const fetchCategories = async () => {
      try {
        const productsRef = collection(db, "Products");
        const querySnapshot = await getDocs(productsRef);
        const fetchedCategories = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.id,
          ...doc.data()
        }));
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    if (CategoryOpen) {
      fetchCategories();
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [CategoryOpen]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const categoryRef = doc(db, 'Products', newCategoryName.trim());
      await setDoc(categoryRef, { 
        name: newCategoryName.trim(),
        createdAt: new Date().toISOString()
      });

      const productsRef = collection(db, "Products");
      const querySnapshot = await getDocs(productsRef);
      const updatedCategories = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.id,
        ...doc.data()
      }));
      
      setCategories(updatedCategories);
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category: " + error.message);
    }
  };

  const handleClose = () => {
    setPreviousState({
      category: selectedCategory,
      activeForm: activeForm
    });
    setShowAddProductModal(false);
    setActiveForm(null);
    CategoryClose();
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowAddProductModal(true);
    if (previousState.category?.id === category.id) {
      setActiveForm(previousState.activeForm);
    }
  };

  const validateProduct = () => {
    const errors = [];
    if (!productName.trim()) errors.push("Product name is required");
    if (!quantity) errors.push("Quantity is required");
    if (!unitPrice) errors.push("Unit price is required");
    if (!selectedCategory) errors.push("Category is required");
    
    if (errors.length > 0) {
        alert(`Please fix the following errors:\n${errors.join('\n')}`);
        return false;
    }
    return true;
  };

  const NewVariantForm = () => {
    const [existingProducts, setExistingProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [variantValue, setVariantValue] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [restockLevel, setRestockLevel] = useState('');
    const [storageLocation, setStorageLocation] = useState('STR A1');
    const [date, setDate] = useState('');
    const [variantImage, setVariantImage] = useState(null);
    const [unit, setUnit] = useState('pcs');
    const [additionalVariantFields, setAdditionalVariantFields] = useState([]);
    const [newVariantFieldName, setNewVariantFieldName] = useState('');
    const { listenToProducts } = useServices();

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

                // Filter products that belong to selected category
                const categoryProducts = allProducts.filter(product => {
                    const isValidProduct = product && 
                        typeof product === 'object' &&
                        product.category === selectedCategory.name &&
                        !product.isVariant;

                    return isValidProduct;
                });

                // Format the products and RETURN the formatted object
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

                    setExistingProducts([]); // Set empty array to clear previous products
                }
            });

            return () => unsubscribe();
        } catch (error) {
            console.error('Error in products listener:', error);
            setExistingProducts([]); // Set empty array on error
        }
    }, [selectedCategory?.name, listenToProducts]);

    // Add this separate useEffect to monitor existingProducts
    useEffect(() => {

    }, [existingProducts]);

    const handleProductSelect = (productId) => {
        const product = existingProducts.find(p => p.id === productId);

        if (product) {
            setSelectedProduct(product);
            setUnit(product.measurements?.defaultUnit || 'pcs');
            setRestockLevel(product.quantity || '');
            setStorageLocation(product.location || 'STR A1');
            setUnitPrice(product.unitPrice || 
                (product.variants && product.variants[0]?.unitPrice) || '');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
            </div>

            <div className="mb-6">
                <span className="text-sm text-gray-600">Category: </span>
                <span className="font-medium text-blue-600">{selectedCategory?.name}</span>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Select Product</label>
                <select
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <div className="text-sm text-gray-500 mt-1">
                    {existingProducts.length} product(s) available in {selectedCategory?.name}
                </div>
            </div>

            {selectedProduct && (
                <>
                    <div className="w-full border border-dashed border-gray-400 p-4 rounded relative">
                        {variantImage ? (
                            <div className="relative">
                                <img src={variantImage} alt="Preview" className="w-full h-48 object-contain rounded" />
                                <button onClick={() => setVariantImage(null)} className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <label htmlFor="variantImage" className="w-full h-24 flex items-center justify-center cursor-pointer text-gray-500">
                                Upload Variant Image
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

                    <input
                        type="text"
                        value={variantValue}
                        onChange={(e) => setVariantValue(e.target.value)}
                        placeholder="Variant Type (e.g., Size, Color)"
                        className="w-full p-2 border rounded"
                    />

                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Quantity"
                        className="w-full p-2 border rounded"
                    />

                    <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="Unit (e.g. pcs, kg)"
                        className="w-full p-2 border rounded"
                    />

                    <input
                        type="number"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        placeholder="Unit Price"
                        className="w-full p-2 border rounded"
                    />

                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={newVariantFieldName}
                                onChange={(e) => setNewVariantFieldName(e.target.value)}
                                placeholder="New Field Name"
                                className="flex-1 p-2 border rounded"
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
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Add Field
                            </button>
                        </div>

                        {additionalVariantFields.map((field, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={field.value}
                                    onChange={(e) => {
                                        const updated = [...additionalVariantFields];
                                        updated[idx].value = e.target.value;
                                        setAdditionalVariantFields(updated);
                                    }}
                                    placeholder={field.name}
                                    className="flex-1 p-2 border rounded"
                                />
                                <button
                                    onClick={() => {
                                        setAdditionalVariantFields(
                                            additionalVariantFields.filter((_, i) => i !== idx)
                                        );
                                    }}
                                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddVariant}
                        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Add Variant
                    </button>
                </>
            )}
        </div>
    );
  };

  const NewProductForm = () => {
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [storage, setStorage] = useState('STR A1');
    const [attribute, setAttribute] = useState('');
    const [restockLevel, setRestockLevel] = useState('');
    const [productImage, setProductImage] = useState(null);
    const [dateStocked, setDateStocked] = useState('');
    const [additionalFields, setAdditionalFields] = useState([]);
    const [newFieldName, setNewFieldName] = useState("");
    const [unit, setUnit] = useState('pcs');
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
      if (!productName.trim() || !selectedCategory) {
        alert('Please fill in required fields');
        return;
      }
  
      try {
        const productData = ProductFactory.createProduct({
          ProductName: productName.trim(),
          Category: selectedCategory.name,
          Quantity: Number(quantity) || 0,
          UnitPrice: Number(unitPrice) || 0,
          Unit: unit || 'pcs',
          RestockLevel: Number(restockLevel) || 0,
          Location: storage,
          Date: dateStocked
        });
  
        const initialVariant = {
          size: '',
          unit: unit || 'pcs',
          quantity: Number(quantity) || 0,
          unitPrice: Number(unitPrice) || 0,
          location: storage,
          lengthPerUnit: null,
          expiringDate: dateStocked || null
        };
  
        productData.variants = [initialVariant];
  
        const productRef = doc(
          db, 
          'Products', 
          selectedCategory.name, 
          'Items', 
          productData.id
        );
  
        await setDoc(productRef, productData);
  
        const categoryRef = doc(db, 'Products', selectedCategory.name);
        await setDoc(categoryRef, { name: selectedCategory.name }, { merge: true });
  
        alert('Product added successfully!');
        CategoryClose();
      } catch (error) {
        console.error("Error adding product:", error);
        alert(`Failed to add product: ${error.message}`);
      }
    };

    return (
      <div className="">
        <h2 className="text-sm font-semibold text-gray-500 mb-2">New Product</h2>
        <p className="font-bold text-sm mb-4">Category: <span className="font-bold text-blue-600">{selectedCategory?.name}</span></p>

        <div className="space-y-4">
        <div className="w-full border border-dashed border-gray-400 p-4 rounded relative">
            {productImage ? (
              <div className="relative">
                <img src={productImage} alt="Preview" className="w-full h-48 object-contain rounded" />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                htmlFor="productImage"
                className="w-full h-24 flex items-center justify-center cursor-pointer text-gray-500"
              >
                Upload Product Image
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

          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Product Name"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />

          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />

          <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit (e.g. pcs, kg)"
          className="w-full p-2 border rounded"
        />


          <input
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="Unit Price ₱"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />

          <div className="flex justify-between space-x-2">
            <select
              value={storage}
              onChange={(e) => setStorage(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {storageOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={restockLevel}
            onChange={(e) => setRestockLevel(e.target.value)}
            placeholder="Restock Level"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />

          <input
            type="date"
            value={dateStocked}
            onChange={(e) => setDateStocked(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Add Custom Field"
              className="flex-1 border border-gray-300 rounded px-3 py-2"
            />
            <button
              onClick={handleAddField}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-800"
            >
              Add Field
            </button>
          </div>

          {additionalFields.map((field, index) => (
            <input
              key={index}
              type="text"
              value={field.value}
              onChange={(e) => {
                const newFields = [...additionalFields];
                newFields[index].value = e.target.value;
                setAdditionalFields(newFields);
              }}
              placeholder={field.name}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          ))}

          <button
            onClick={async () => {
                if (validateProduct()) {
                    await handleAddProduct();
                }
            }}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-800"
          >
            Add Product
          </button>
        </div>
      </div>
    );
  };


  if (!CategoryOpen) return null;

  return (
    <>
      {!showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl p-8 animate-scaleUp z-10">
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>

            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3 rounded-xl text-sm font-medium text-blue-700 shadow-sm">
                Select a Category to Add New Product
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 shadow-inner grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`bg-white shadow-sm p-3 rounded-xl w-full text-center text-sm transition-all duration-200
                    ${selectedCategory?.id === cat.id 
                      ? 'bg-blue-500 text-white font-medium scale-105 shadow-md' 
                      : 'hover:bg-blue-50 hover:shadow hover:scale-105'
                    }`}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {showAddCategory && (
              <div className="mb-6 bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl shadow-inner">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Category Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-shadow"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                    />
                  </div>
                  <button
                    onClick={handleAddCategory}
                    className="h-10 w-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all duration-200"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl 
                  hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow transition-all duration-200
                  flex items-center gap-2"
                onClick={() => setShowAddCategory((prev) => !prev)}
              >
                {showAddCategory ? (
                  <>
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <span>Add New Category</span>
                    <span className="text-lg">+</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-scaleUp z-10">
            <button
              onClick={() => {
                if (activeForm) {
                  setActiveForm(null);
                } else {
                  setPreviousState({
                    category: selectedCategory,
                    activeForm: activeForm
                  });
                  setShowAddProductModal(false);
                }
              }}
              className="absolute top-4 left-4 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="text-xl">←</span>
              <span>Back</span>
            </button>

            {!activeForm ? (
              <>
                <div className="mt-12 mb-6 text-center">
                  <div className="inline-block bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3 rounded-xl">
                    <span className="text-sm font-medium text-blue-700">
                      Add New Variant or New Product in{' '}
                      <span className="font-bold">{selectedCategory?.name}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                  <button
                    className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 
                      shadow-sm hover:shadow transition-all duration-200"
                    onClick={() => setActiveForm('variant')}
                  >
                    New Variant
                  </button>
                  <button
                    className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 
                      shadow-sm hover:shadow transition-all duration-200"
                    onClick={() => setActiveForm('product')}
                  >
                    New Product
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-12">
                {activeForm === 'variant' ? <NewVariantForm /> : <NewProductForm />}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CategoryModal;
