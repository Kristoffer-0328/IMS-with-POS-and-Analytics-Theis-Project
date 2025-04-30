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
import ProductFactory from '../Factory/productFactory';
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
      const querySnapshot = await getDocs(collection(db, "Categories"));
      const fetchedCategories = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(fetchedCategories);
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
    await addDoc(collection(db, 'Categories'), { name: newCategoryName.trim() });
    setNewCategoryName('');
    setShowAddCategory(false);
    const querySnapshot = await getDocs(collection(db, "Categories"));
    const updatedCategories = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setCategories(updatedCategories);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowAddProductModal(true);
  };

  


  const NewVariantForm = () => {
    const [variantProduct, setVariantProduct] = useState('');
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
  
    const handleAddField = () => {
      if (
        newVariantFieldName.trim() &&
        !additionalVariantFields.find((f) => f.name === newVariantFieldName)
      ) {
        setAdditionalVariantFields([
          ...additionalVariantFields,
          { name: newVariantFieldName, value: '' },
        ]);
        setNewVariantFieldName('');
      }
    };
  
    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const imageUrl = URL.createObjectURL(file);
        setVariantImage(imageUrl);
      }
    };
  
    const removeImage = () => {
      setVariantImage(null);
      document.getElementById('variantImage').value = '';
    };
  
    const handleAddVariant = async () => {
      if (!variantProduct.trim() || !selectedCategory) return;
      
      try {
        // Create customFields object
        const customFieldsObject = {};
        additionalVariantFields.forEach((field) => {
          customFieldsObject[field.name] = field.value;
        });
        
        // Create standardized variant using factory
        const variantData = ProductFactory.createVariant({
          value: variantValue,
          quantity: Number(quantity) || 0,
          unitPrice: Number(unitPrice) || 0,
          unit: unit,
          restockLevel: Number(restockLevel) || 0,
          location: storageLocation,
          date: date,
          image: variantImage,
          ...customFieldsObject
        });
        
        const productPath = doc(
          db,
          'Products',
          selectedCategory.name,
          'Items',
          variantProduct.trim()
        );
        
        // First check if the product exists
        const productDoc = await getDoc(productPath);
        
        if (!productDoc.exists()) {
          // Product doesn't exist, create it first with the variant
          const newProductData = ProductFactory.createProduct({
            ProductName: variantProduct.trim(),
            Category: selectedCategory.name,
            Quantity: Number(quantity) || 0,
            UnitPrice: Number(unitPrice) || 0,
            Unit: unit,
            RestockLevel: Number(restockLevel) || 0,
            Location: storageLocation,
            Date: date,
            variants: [variantData]
          });
          
          await setDoc(productPath, newProductData);
        } else {
          // Product exists, add the variant and update total quantity
          const productData = productDoc.data();
          const currentQuantity = productData.Quantity || 0;
          const variantQuantity = Number(quantity) || 0;
          
          // Transaction to update both variants array and total quantity
          await updateDoc(productPath, {
            variants: arrayUnion(variantData),
            Quantity: currentQuantity + variantQuantity
          });
        }
        
        alert('Variant added successfully.');
        CategoryClose();
      } catch (error) {
        console.error("Error adding variant:", error);
        alert('Failed to add variant. Please try again.');
      }
    };
    return (
      <div className="space-y-4 mt-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-2">Add Variant</h2>
        <p className="font-bold text-sm mb-4">Category: <span className="font-bold text-blue-600">{selectedCategory?.name}</span></p>
        {/* Image Upload */}
        <div className="w-full border border-dashed border-gray-400 p-4 rounded relative">
          {variantImage ? (
            <div className="relative">
              <img src={variantImage} alt="Preview" className="w-full h-48 object-contain rounded" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-800"
              >
                Remove
              </button>
            </div>
          ) : (
            <label
              htmlFor="variantImage"
              className="w-full h-24 flex items-center justify-center cursor-pointer text-gray-500"
            >
              Upload Variant Image
            </label>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="variantImage"
          />
        </div>
  
        <input
          type="text"
          value={variantProduct}
          onChange={(e) => setVariantProduct(e.target.value)}
          placeholder="Product Name"
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          value={variantValue}
          onChange={(e) => setVariantValue(e.target.value)}
          placeholder="Variant Value (e.g. Color: Red)"
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
        <input
          type="number"
          value={restockLevel}
          onChange={(e) => setRestockLevel(e.target.value)}
          placeholder="Restock Level"
          className="w-full p-2 border rounded"
        />
        <select
          value={storageLocation}
          onChange={(e) => setStorageLocation(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {storageOptions.map((loc, index) => (
            <option key={index} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 border rounded"
        />
  
        {/* Custom Fields */}
        <div className="">
          {additionalVariantFields.map((field, idx) => (
            <input
              key={idx}
              type="text"
              value={field.value}
              onChange={(e) => {
                const updatedFields = [...additionalVariantFields];
                updatedFields[idx].value = e.target.value;
                setAdditionalVariantFields(updatedFields);
              }}
              placeholder={field.name}
              className="w-full p-2 border rounded"
            />
          ))}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newVariantFieldName}
              onChange={(e) => setNewVariantFieldName(e.target.value)}
              placeholder="New Field Name"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleAddField}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </div>
  
        <button
          onClick={handleAddVariant}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Variant
        </button>
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
      // Reset file input manually
      document.getElementById("productImage").value = "";
    };
    

    const handleAddProduct = async () => {
      if (!productName.trim() || !quantity || !unitPrice || !restockLevel) return;
      try {
        // Create customFields object
        const customFieldsObject = {};
        additionalFields.forEach(field => {
          customFieldsObject[field.name] = field.value;
        });
    
        // Create initial variant
        const initialVariant = ProductFactory.createVariant({
          value: "", // Default empty value for first variant
          quantity: quantity,
          unitPrice: unitPrice,
          unit: unit,
          restockLevel: restockLevel,
          location: storage,
          date: dateStocked,
          ...customFieldsObject
        });
    
        // Create standardized product using factory
        const productData = ProductFactory.createProduct({
          ProductName: productName.trim(),
          Category: selectedCategory.name,
          Quantity: quantity,
          UnitPrice: unitPrice,
          Unit: unit,
          RestockLevel: restockLevel,
          Location: storage,
          Date: dateStocked,
          image: productImage,
          ...customFieldsObject
        });
        
        // Add the initial variant to the variants array
        productData.variants = [initialVariant];
    
        const productRef = doc(db, 'Products', selectedCategory.name, 'Items', productName.trim());
        await setDoc(productRef, productData);
    
        alert('Product added successfully');
        CategoryClose();
      } catch (error) {
        console.error("Error adding product:", error);
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
            onClick={handleAddProduct}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-800 "
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