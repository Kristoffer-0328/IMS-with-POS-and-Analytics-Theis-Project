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
  const { listenToProducts } = useServices();
  const db = getFirestore(app);

  const storageOptions = [];
  const rows = ["A", "B", "C"];
  for (let row of rows) {
    for (let i = 1; i <= 3; i++) {
      storageOptions.push(`STR ${row}${i}`);
    }
  }
  listenToProducts((updatedProducts) => {
    // This will activate the listener and ensure the UI updates
    console.log("Products updated in real-time:", updatedProducts.length);
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        CategoryClose();
      }
    };

    const fetchCategories = async () => {
      try {
        // Get categories directly from Products collection
        const productsRef = collection(db, "Products");
        const querySnapshot = await getDocs(productsRef);
        const fetchedCategories = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.id, // Use the document ID as the category name
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
      // Create new category document in Products collection
      const categoryRef = doc(db, 'Products', newCategoryName.trim());
      await setDoc(categoryRef, { 
        name: newCategoryName.trim(),
        createdAt: new Date().toISOString()
      });

      // Refresh categories list
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

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowAddProductModal(true);
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

    useEffect(() => {
        const fetchProducts = async () => {
            if (!selectedCategory?.name) {
                console.log('No category selected');
                return;
            }

            try {
                console.log('Fetching products for category:', selectedCategory.name);
                const productsRef = collection(db, 'Products', selectedCategory.name, 'Items');
                const snapshot = await getDocs(productsRef);
                
                if (snapshot.empty) {
                    console.log('No products found in category:', selectedCategory.name);
                    setExistingProducts([]);
                    return;
                }

                const products = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name, // Using the name field from ProductFactory
                        baseProductName: data.baseProductName,
                        category: data.category,
                        quantity: data.quantity,
                        unitPrice: data.unitPrice,
                        location: data.location,
                        measurements: data.measurements || {},
                        variants: data.variants || [],
                        lastUpdated: data.lastUpdated
                    };
                });

                console.log('Processed products:', products);
                setExistingProducts(products);
            } catch (error) {
                console.error("Error fetching products:", error);
                alert("Error loading products: " + error.message);
            }
        };

        fetchProducts();
    }, [selectedCategory]);

    const handleProductSelect = (productId) => {
        const product = existingProducts.find(p => p.id === productId);
        console.log('Selected product:', product);

        if (product) {
            setSelectedProduct(product);
            // Use the correct property names from ProductFactory
            setUnit(product.measurements?.defaultUnit || 'pcs');
            setRestockLevel(product.quantity || '');
            setStorageLocation(product.location || 'STR A1');
            setUnitPrice(product.unitPrice || 
                (product.variants && product.variants[0]?.unitPrice) || '');
        }
    };

    return (
        <div className="space-y-4 mt-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">Add Variant</h2>
            <p className="font-bold text-sm mb-4">
                Category: <span className="font-bold text-blue-600">{selectedCategory?.name}</span>
            </p>

            <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Product
                </label>
                <select
                    className="w-full p-2 border rounded bg-white"
                    onChange={(e) => handleProductSelect(e.target.value)}
                    value={selectedProduct?.id || ''}
                >
                    <option value="">-- Select a Product --</option>
                    {existingProducts.length > 0 ? (
                        existingProducts.map(product => (
                            <option key={product.id} value={product.id}>
                                {product.name || product.baseProductName}
                            </option>
                        ))
                    ) : (
                        <option disabled>No products available</option>
                    )}
                </select>
                <div className="text-sm text-gray-500 mt-1">
                    {existingProducts.length} products available
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
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/30 bg-opacity-40">
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl p-6">
            <div className="absolute top-3 right-4 text-xl text-gray-500 hover:text-red-500">
              <button onClick={CategoryClose}>✕</button>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-semibold text-center">
                Select a Category to Add New Product
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-6 shadow-inner grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center mb-6">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`bg-white shadow p-2 rounded-lg w-full text-center text-sm hover:bg-blue-100 ${
                    selectedCategory?.id === cat.id ? 'bg-blue-200 font-bold' : ''
                  }`}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {showAddCategory && (
              <div className="flex items-center justify-between gap-4 mb-4 bg-gray-100 p-4 rounded-xl">
                <div className="flex flex-col w-full">
                  <label className="text-sm mb-1 text-gray-600">Category Name</label>
                  <input
                    type="text"
                    className="border border-blue-400 rounded-md px-2 py-1 focus:outline-none focus:ring w-full"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleAddCategory}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-lg rounded-full w-10 h-10 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            )}

            <div className="flex justify-center">
              <button
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
                onClick={() => setShowAddCategory((prev) => !prev)}
              >
                {showAddCategory ? "Cancel" : "Add New Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/30 bg-opacity-40">
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="absolute top-3 right-4 text-xl text-gray-500 hover:text-red-500">
              <button
                onClick={() => {
                  if (activeForm) setActiveForm(null);
                  else setShowAddProductModal(false);
                }}
                className="flex items-center gap-2"
              >
                <span className="text-2xl">&#8592;</span>
                Back
              </button>
            </div>

            {!activeForm ? (
              <>
                <div className="mt-12 flex justify-center mb-4">
                  <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-semibold text-center">
                    Add New Variant or New Product in <span className="font-bold text-blue-600">{selectedCategory?.name}</span>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-xl p-6 shadow-inner flex justify-center gap-4">
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    onClick={() => setActiveForm('variant')}
                  >
                    New Variant
                  </button>
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
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