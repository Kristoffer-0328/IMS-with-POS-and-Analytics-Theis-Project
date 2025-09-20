import React, { useState, useCallback, useEffect } from 'react';
import { 
  FiClock, 
  FiCheckCircle, 
  FiPackage, 
  FiUpload, 
  FiUser, 
  FiCalendar,
  FiFileText,
  FiCamera,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiRefreshCw,
  FiAlertTriangle
} from 'react-icons/fi';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  getFirestore,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import app from '../../../services/firebase/config';
import storage from '../../../services/firebase/StorageConfig';

const db = getFirestore(app);

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const RETRY_ATTEMPTS = 3;

// Move components outside to prevent recreation
const TabButton = ({ id, label, icon: Icon, count, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`flex items-center px-3 py-2 rounded-lg mr-2 text-sm ${
      activeTab === id
        ? 'bg-orange-100 text-[#ff7b54] font-medium'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <Icon className="mr-1" size={16} />
    <span className="hidden sm:inline">{label}</span>
    {count > 0 && (
      <span className="ml-1 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
        {count}
      </span>
    )}
  </button>
);

const InputField = ({ label, type = "text", value, onChange, placeholder, icon: Icon, required = false }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-3 text-gray-400" size={18} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${Icon ? 'pl-10' : ''}`}
      />
    </div>
  </div>
);

// Progress Bar Component
const ProgressBar = ({ progress, fileName, status, onRetry, onCancel }) => (
  <div className="bg-gray-50 p-3 rounded-lg border">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2">
        {fileName}
      </span>
      <div className="flex items-center space-x-2">
        {status === 'error' && (
          <button
            onClick={onRetry}
            className="text-orange-500 hover:text-orange-700"
            title="Retry upload"
          >
            <FiRefreshCw size={16} />
          </button>
        )}
        {status === 'uploading' && (
          <button
            onClick={onCancel}
            className="text-red-500 hover:text-red-700"
            title="Cancel upload"
          >
            <FiX size={16} />
          </button>
        )}
      </div>
    </div>
    
    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${
          status === 'error' ? 'bg-red-500' : 
          status === 'completed' ? 'bg-green-500' : 
          'bg-orange-500'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
    
    <div className="flex justify-between text-xs text-gray-500">
      <span>{Math.round(progress)}%</span>
      <span className={`${
        status === 'error' ? 'text-red-500' : 
        status === 'completed' ? 'text-green-500' : 
        'text-orange-500'
      }`}>
        {status === 'error' ? 'Failed' : 
         status === 'completed' ? 'Completed' : 
         'Uploading...'}
      </span>
    </div>
  </div>
);

// Simplified ProductImageHolder - just one placeholder for now
const ProductImageHolder = () => {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Product Photo
      </label>
      
      {/* Single placeholder */}
      <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
        <FiCamera className="text-gray-400 mb-2" size={24} />
        <span className="text-sm text-gray-500 text-center">
          Product Photo
        </span>
        <span className="text-xs text-gray-400 text-center mt-1">
          Coming soon
        </span>
      </div>
      
      {/* Placeholder text */}
      <p className="text-xs text-gray-500 mt-2">
        Product photo will be added here
      </p>
    </div>
  );
};

// Update the ProductVerification component
const ProductVerification = ({ products, updateProduct }) => {
  console.log('ProductVerification rendered with products:', products);
  
  if (!products || products.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Verification</h3>
        <div className="text-center py-8">
          <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-600">No products found for verification</p>
          <p className="text-sm text-gray-500 mt-1">Please go back and check the delivery details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Verification ({products.length} items)</h3>
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-medium text-gray-800">{product.name}</h4>
          <span className="text-sm text-gray-500">Ordered: {product.orderedQty}</span>
        </div>
        
        {/* Delivered Quantity Input */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Actual Delivered Quantity
          </label>
          <input
            type="number"
            value={product.deliveredQty}
            onChange={(e) => updateProduct(product.id, 'deliveredQty', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            placeholder="Enter delivered quantity"
            min="0"
          />
        </div>

        {/* Product Images */}
        <ProductImageHolder />

        {/* Condition Selection */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Product Condition</label>
          <div className="grid grid-cols-3 gap-2">
            {['complete', 'excess', 'damaged'].map((condition) => (
              <button
                key={condition}
                onClick={() => updateProduct(product.id, 'condition', condition)}
                className={`p-2 rounded-lg text-sm font-medium ${
                  product.condition === condition
                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                {condition.charAt(0).toUpperCase() + condition.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Remarks */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea
            value={product.remarks}
            onChange={(e) => updateProduct(product.id, 'remarks', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            placeholder="Add remarks if needed..."
            rows="2"
          />
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex space-x-2">
            {[
              { value: 'accepted', label: 'Accepted', icon: FiCheck, color: 'green' },
              { value: 'rejected', label: 'Rejected', icon: FiX, color: 'red' },
              { value: 'pending', label: 'Pending', icon: FiClock, color: 'yellow' }
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => updateProduct(product.id, 'status', value)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  product.status === value
                    ? `bg-${color}-100 text-${color}-700 border-2 border-${color}-300`
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                <Icon className="mr-1" size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);
};

const DeliveryDetailsForm = ({ deliveryDetails, updateDeliveryDetails, uploadedFiles, setUploadedFiles, uploadProgress, retryUpload, cancelUpload }) => {
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return `File ${file.name} is not a supported format. Please upload images or PDF files only.`;
    }
    return null;
  };

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    
    // Check total file count
    if (uploadedFiles.length + fileArray.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed. You can upload ${MAX_FILES - uploadedFiles.length} more files.`);
      return;
    }

    // Validate each file
    const validFiles = [];
    const errors = [];
    
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Input Delivery Details</h3>
      
      <InputField
        label="Delivery Receipt (DR No.)"
        value={deliveryDetails.drNumber}
        onChange={(e) => updateDeliveryDetails('drNumber', e.target.value)}
        placeholder="Enter DR Number"
        icon={FiFileText}
        required
      />
      
      <InputField
        label="Invoice Number (if available)"
        value={deliveryDetails.invoiceNumber}
        onChange={(e) => updateDeliveryDetails('invoiceNumber', e.target.value)}
        placeholder="Enter Invoice Number"
        icon={FiFileText}
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Delivery Date"
          type="date"
          value={deliveryDetails.deliveryDate}
          onChange={(e) => updateDeliveryDetails('deliveryDate', e.target.value)}
          icon={FiCalendar}
          required
        />
        
        <InputField
          label="Delivery Time"
          type="time"
          value={deliveryDetails.deliveryTime}
          onChange={(e) => updateDeliveryDetails('deliveryTime', e.target.value)}
          icon={FiClock}
          required
        />
      </div>
      
      <InputField
        label="Delivery Personnel/Driver Name"
        value={deliveryDetails.driverName}
        onChange={(e) => updateDeliveryDetails('driverName', e.target.value)}
        placeholder="Enter driver name"
        icon={FiUser}
        required
      />

      {/* Temporary Notice */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <FiAlertTriangle className="text-yellow-600 mr-2" size={16} />
          <p className="text-sm text-yellow-800">
            <strong>Notice:</strong> File uploads are temporarily disabled due to storage configuration. 
            You can still process deliveries without uploading documents.
          </p>
        </div>
      </div>

      {/* Supporting Documents Section - Temporarily Disabled */}
      <div className="space-y-4 opacity-50">
        <h4 className="text-lg font-semibold text-gray-800">
          Supporting Documents <span className="text-red-500 text-sm">(Temporarily Disabled)</span>
        </h4>
        
        <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300 cursor-not-allowed">
          <div className="text-center">
            <FiCamera className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-sm text-gray-500 mb-2">
              Upload DR, Invoice, or Proof of Delivery (Currently Disabled)
            </p>
            <p className="text-xs text-gray-500 mb-2">
              Max {MAX_FILE_SIZE / (1024 * 1024)}MB per file, {MAX_FILES} files max
            </p>
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="file-upload"
              disabled
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
            >
              <FiUpload className="inline mr-2" size={16} />
              Choose Files (Disabled)
            </label>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress && Object.keys(uploadProgress).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Upload Progress:</h4>
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <ProgressBar
                key={fileName}
                fileName={fileName}
                progress={progress.progress}
                status={progress.status}
                onRetry={() => retryUpload(fileName)}
                onCancel={() => cancelUpload(fileName)}
              />
            ))}
          </div>
        )}

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Selected Files:</h4>
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center">
                  <FiFileText className="mr-2 text-gray-500" size={16} />
                  <div>
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({(file.size / (1024 * 1024)).toFixed(2)}MB)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiX size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ReceivingMobileView = () => {
  const [activeTab, setActiveTab] = useState('delivery-details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadTasks, setUploadTasks] = useState({});
  const [poId, setPoId] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [deliveryDetails, setDeliveryDetails] = useState({
    drNumber: '',
    invoiceNumber: '',
    deliveryDate: '',
    deliveryTime: '',
    driverName: ''
  });
  
  const [products, setProducts] = useState([]);
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [PoData, setPoData] = useState(null);

  // Read poId from URL parameters
  useEffect(() => {
    console.log('Mobile receiving view loaded');
    console.log('Current URL:', window.location.href);
    const urlParams = new URLSearchParams(window.location.search);
    const poIdParam = urlParams.get('poId');
    console.log('PO ID from URL:', poIdParam);
    if (poIdParam) {
      setPoId(poIdParam);
      setIsLoading(true);
      
      // Fetch PO data from Firestore
      const fetchPO = async () => {
        try {
          console.log('Fetching PO data for:', poIdParam);
          const poRef = doc(db, 'purchase_orders', poIdParam);
          const poDoc = await getDoc(poRef);
          
          if (poDoc.exists()) {
            const poData = poDoc.data();
            console.log('PO Data:', poData);
            setPoData(poData);
            
            // Update PO status to 'receiving_in_progress' if not already
            if (poData.status !== 'receiving_in_progress' && poData.status !== 'received') {
              console.log('Updating PO status to receiving_in_progress');
              await updateDoc(poRef, {
                status: 'receiving_in_progress',
                receivingStartedAt: serverTimestamp(),
                receivingStartedBy: 'mobile_user', // You can get actual user if auth is implemented
                updatedAt: serverTimestamp()
              });
              console.log('PO status updated to receiving_in_progress');
            }
          } else {
            console.log('PO document does not exist');
          }
        } catch (err) {
          console.error('Error fetching PO:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPO();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Separate effect to handle setting products when PoData is available
  useEffect(() => {
    if (PoData && PoData.items && PoData.items.length > 0) {
      console.log('Setting products from PO items:', PoData.items);
      setProducts(
        PoData.items.map((item, idx) => ({
          id: item.productId || `item-${idx}`,
          name: item.productName || item.name || 'Unknown Product',
          orderedQty: item.quantity || 0,
          deliveredQty: '',
          status: 'pending',
          remarks: '',
          condition: 'complete',
          productId: item.productId,
          unitPrice: item.unitPrice || 0,
          total: item.total || 0
        }))
      );
    } else if (PoData) {
      console.log('No items found in PO data');
    }
  }, [PoData]);

  // Memoized functions to prevent re-renders
  const updateDeliveryDetails = useCallback((field, value) => {
    setDeliveryDetails(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateProduct = useCallback((productId, field, value) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, [field]: value } : p
    ));
  }, []);

  // Enhanced Firebase upload function with retry logic
  const uploadFileToFirebase = async (file, onProgress, retryCount = 0) => {
    try {
      const fileName = `receiving-docs/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            
            // Retry logic
            if (retryCount < RETRY_ATTEMPTS) {
              console.log(`Retrying upload (${retryCount + 1}/${RETRY_ATTEMPTS}) for ${file.name}`);
              setTimeout(() => {
                uploadFileToFirebase(file, onProgress, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, 1000 * (retryCount + 1)); // Exponential backoff
            } else {
              reject(error);
            }
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Cancel upload function
  const cancelUpload = (fileName) => {
    const task = uploadTasks[fileName];
    if (task) {
      task.cancel();
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: { ...prev[fileName], status: 'cancelled' }
      }));
    }
  };

  // Retry upload function
  const retryUpload = async (fileName) => {
    const file = uploadedFiles.find(f => f.name === fileName);
    if (file) {
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: { progress: 0, status: 'uploading' }
      }));
      
      try {
        const url = await uploadFileToFirebase(file, (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [fileName]: { progress, status: 'uploading' }
          }));
        });
        
        setUploadProgress(prev => ({
          ...prev,
          [fileName]: { progress: 100, status: 'completed' }
        }));
      } catch (error) {
        setUploadProgress(prev => ({
          ...prev,
          [fileName]: { progress: 0, status: 'error' }
        }));
      }
    }
  };

  // Function to find product in inventory by searching all locations
  const findProductInInventory = async (productId, productName) => {
    console.log(`Searching for product ${productName} (ID: ${productId}) in inventory...`);
    
    try {
      // Get all storage locations
      const productsCollection = collection(db, 'Products');
      const storageSnapshot = await getDocs(productsCollection);
      
      for (const storageDoc of storageSnapshot.docs) {
        const storageLocation = storageDoc.id;
        console.log(`Searching in storage location: ${storageLocation}`);
        
        // Get all shelves in this storage location
        const shelvesCollection = collection(db, 'Products', storageLocation, 'shelves');
        const shelvesSnapshot = await getDocs(shelvesCollection);
        
        for (const shelfDoc of shelvesSnapshot.docs) {
          const shelfName = shelfDoc.id;
          
          // Get all rows in this shelf
          const rowsCollection = collection(db, 'Products', storageLocation, 'shelves', shelfName, 'rows');
          const rowsSnapshot = await getDocs(rowsCollection);
          
          for (const rowDoc of rowsSnapshot.docs) {
            const rowName = rowDoc.id;
            
            // Get all columns in this row
            const columnsCollection = collection(db, 'Products', storageLocation, 'shelves', shelfName, 'rows', rowName, 'columns');
            const columnsSnapshot = await getDocs(columnsCollection);
            
            for (const columnDoc of columnsSnapshot.docs) {
              const columnIndex = columnDoc.id;
              
              // Check if product exists in this column
              const productRef = doc(db, 'Products', storageLocation, 'shelves', shelfName, 'rows', rowName, 'columns', columnIndex, 'items', productId);
              const productDoc = await getDoc(productRef);
              
              if (productDoc.exists()) {
                console.log(`Found product ${productName} at: ${storageLocation}/${shelfName}/${rowName}/${columnIndex}`);
                return {
                  ref: productRef,
                  data: productDoc.data(),
                  location: {
                    storageLocation,
                    shelfName,
                    rowName,
                    columnIndex: parseInt(columnIndex)
                  }
                };
              }
            }
          }
        }
      }
      
      console.log(`Product ${productName} not found in any inventory location`);
      return null;
      
    } catch (error) {
      console.error(`Error searching for product ${productName}:`, error);
      throw error;
    }
  };

  // Function to update inventory quantities by adding received items
  const updateInventoryQuantities = async (receivedProducts) => {
    try {
      console.log('Starting inventory update for received products:', receivedProducts);
      
      for (const product of receivedProducts) {
        // Skip if no quantity delivered
        if (!product.deliveredQty || product.deliveredQty <= 0) {
          console.log(`Skipping ${product.name} - no quantity delivered`);
          continue;
        }

        console.log(`Processing product: ${product.name} (ID: ${product.productId})`);
        
        // Find the product in inventory
        const productInfo = await findProductInInventory(product.productId, product.name);
        
        if (!productInfo) {
          throw new Error(`Product "${product.name}" (ID: ${product.productId}) not found in inventory. Cannot update stock levels.`);
        }
        
        // Update the product using a transaction
        await runTransaction(db, async (transaction) => {
          // Re-fetch the latest product data in the transaction
          const currentProductDoc = await transaction.get(productInfo.ref);
          
          if (!currentProductDoc.exists()) {
            throw new Error(`Product "${product.name}" was deleted during update process.`);
          }
          
          const productData = currentProductDoc.data();
          console.log(`Current product data for ${product.name}:`, productData);
          
          // Update the appropriate variant (assuming first variant for now, could be enhanced)
          let updatedVariants = [...(productData.variants || [])];
          
          if (updatedVariants.length > 0) {
            // Update the first variant quantity
            const currentVariantQty = updatedVariants[0].quantity || 0;
            const deliveredQty = parseInt(product.deliveredQty);
            const newVariantQty = currentVariantQty + deliveredQty;
            updatedVariants[0].quantity = newVariantQty;
            
            console.log(`Updated variant for ${product.name}: ${currentVariantQty} -> ${newVariantQty} (+${deliveredQty})`);
            
            // Calculate new total quantity
            const totalQuantity = updatedVariants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
            
            // Update the product document
            transaction.update(productInfo.ref, {
              variants: updatedVariants,
              quantity: totalQuantity,
              lastReceived: serverTimestamp(),
              totalReceived: (productData.totalReceived || 0) + deliveredQty,
              lastUpdated: serverTimestamp()
            });
            
            console.log(`Successfully updated ${product.name} - Total quantity now: ${totalQuantity}`);
          } else {
            // Create a default variant with received quantity
            const deliveredQty = parseInt(product.deliveredQty);
            updatedVariants = [{
              quantity: deliveredQty,
              variant: 'default'
            }];
            
            transaction.update(productInfo.ref, {
              variants: updatedVariants,
              quantity: deliveredQty,
              lastReceived: serverTimestamp(),
              totalReceived: (productData.totalReceived || 0) + deliveredQty,
              lastUpdated: serverTimestamp()
            });
            
            console.log(`Created default variant for ${product.name} with quantity ${deliveredQty}`);
          }
        });
      }
      
      console.log('All inventory updates completed successfully');
      
    } catch (error) {
      console.error('Error in inventory update:', error);
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  };

  // Enhanced Firebase save function with concurrent uploads and progress tracking
  const saveReceivingData = async () => {
    const timeoutId = setTimeout(() => {
      alert('Operation is taking too long. Please try again.');
      setIsSubmitting(false);
    }, 30000); // 30 second timeout

    try {
      setIsSubmitting(true);
      setProcessingStep('Initializing...');
      console.log('Starting receiving data save process...');

      // TEMPORARILY DISABLED: Skip file uploads due to Firebase Storage issues
      console.log('File uploads temporarily disabled - skipping upload process');
      setProcessingStep('Skipping file uploads (temporarily disabled)...');
      
      // Create empty array for uploaded file URLs since we're not uploading
      const uploadedFileURLs = [];
      
      // Log what would have been uploaded
      if (uploadedFiles.length > 0) {
        console.log('Files that would have been uploaded:', uploadedFiles.map(f => f.name));
      }

      // Prepare data for Firestore
      setProcessingStep('Preparing data...');
      const receivingData = {
        poId: poId, // Include PO ID from QR scan
        deliveryDetails: {
          ...deliveryDetails,
          deliveryDateTime: new Date(`${deliveryDetails.deliveryDate}T${deliveryDetails.deliveryTime}`)
        },
        products: products.map(product => ({
          ...product,
          deliveredQty: isNaN(Number(product.deliveredQty)) ? 0 : Number(product.deliveredQty)
        })),
        uploadedFiles: uploadedFileURLs, // This will be empty array when uploads are disabled
        documentsUploaded: uploadedFileURLs.length > 0, // Track if documents were uploaded
        uploadStatus: 'disabled', // Indicate that uploads were disabled
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notes: 'File uploads temporarily disabled - processed without supporting documents'
      };

      // Update inventory quantities with received products
      console.log('Updating inventory quantities...');
      setProcessingStep('Updating inventory...');
      await updateInventoryQuantities(receivingData.products);
      
      // Update Purchase Order status and received quantities
      console.log('Updating Purchase Order status...');
      setProcessingStep('Updating Purchase Order...');
      if (poId) {
        const poRef = doc(db, 'purchase_orders', poId);
        
        // Calculate total ordered vs received for summary
        const orderSummary = {
          totalItemsOrdered: products.length,
          totalItemsReceived: products.filter(p => p.deliveredQty > 0).length,
          totalQuantityOrdered: products.reduce((sum, p) => sum + (p.orderedQty || 0), 0),
          totalQuantityReceived: products.reduce((sum, p) => sum + (Number(p.deliveredQty) || 0), 0),
          itemsWithDiscrepancies: products.filter(p => Number(p.deliveredQty) !== p.orderedQty).length
        };
        
        await updateDoc(poRef, {
          status: 'received',
          receivedAt: serverTimestamp(),
          receivingCompletedBy: 'mobile_user', // You can get actual user if auth is implemented
          orderSummary: orderSummary,
          receivedProducts: receivingData.products,
          deliveryDetails: receivingData.deliveryDetails,
          updatedAt: serverTimestamp()
        });
        
        console.log('Purchase Order updated with received status and summary:', orderSummary);
      }

      // Save receiving transaction record (similar to POS transactions)
      console.log('Logging receiving transaction...');
      setProcessingStep('Logging transaction...');
      const receivingTransactionData = {
        transactionId: `REC-${Date.now()}`,
        type: 'receiving',
        poId: poId,
        deliveryDetails: receivingData.deliveryDetails,
        items: receivingData.products.map(product => ({
          productId: product.productId,
          productName: product.name,
          orderedQuantity: product.orderedQty,
          receivedQuantity: Number(product.deliveredQty),
          condition: product.condition,
          status: product.status,
          remarks: product.remarks,
          unitPrice: product.unitPrice || 0,
          totalValue: (product.unitPrice || 0) * Number(product.deliveredQty)
        })),
        summary: {
          totalOrderValue: products.reduce((sum, p) => sum + ((p.unitPrice || 0) * (p.orderedQty || 0)), 0),
          totalReceivedValue: products.reduce((sum, p) => sum + ((p.unitPrice || 0) * (Number(p.deliveredQty) || 0)), 0),
          itemsCount: products.length,
          receivedItemsCount: products.filter(p => Number(p.deliveredQty) > 0).length
        },
        status: 'completed',
        createdAt: serverTimestamp(),
        createdBy: 'mobile_user' // You can get actual user if auth is implemented
      };
      
      await addDoc(collection(db, 'receivingTransactions'), receivingTransactionData);
      console.log('Receiving transaction logged with ID:', receivingTransactionData.transactionId);

      // Save to Firestore
      console.log('Saving receiving record...');
      setProcessingStep('Saving record...');
      const docRef = await addDoc(collection(db, 'receivingRecords'), receivingData);
      
      console.log('Receiving data saved with ID:', docRef.id);
      setProcessingStep('Completed!');
      clearTimeout(timeoutId); // Clear timeout since we succeeded
      return docRef.id;
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error
      console.error('Error saving receiving data:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
      setProcessingStep('');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'delivery-details':
        return (
          <DeliveryDetailsForm 
            deliveryDetails={deliveryDetails} 
            updateDeliveryDetails={updateDeliveryDetails}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            uploadProgress={uploadProgress}
            retryUpload={retryUpload}
            cancelUpload={cancelUpload}
          />
        );
      case 'product-verification':
        return <ProductVerification products={products} updateProduct={updateProduct} />;
      default:
        return null;
    }
  };

  const handleNext = () => {
    // Validate required fields before proceeding
    if (!deliveryDetails.drNumber || !deliveryDetails.deliveryDate || !deliveryDetails.deliveryTime || !deliveryDetails.driverName) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Move to product verification tab
    setActiveTab('product-verification');
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!deliveryDetails.drNumber || !deliveryDetails.deliveryDate || !deliveryDetails.deliveryTime || !deliveryDetails.driverName) {
        alert('Please fill in all required fields');
        return;
      }

      // Fixed product validation - properly handle 0 quantities
      const hasInvalidProducts = products.some(product => {
        const delivered = product.deliveredQty;
        return delivered === '' || delivered === null || delivered === undefined || product.status === 'pending';
      });

      if (hasInvalidProducts) {
        alert('Please complete all product verifications. Make sure to enter delivered quantities and set status for all products.');
        return;
      }

      // Save to Firebase
      const recordId = await saveReceivingData();
      
      // Set completion data and show completion page
      setCompletionData({
        recordId,
        poId,
        deliveryDetails,
        productsReceived: products.filter(p => p.deliveredQty > 0),
        totalProducts: products.length,
        timestamp: new Date().toISOString()
      });
      
      setIsCompleted(true);
      
    } catch (error) {
      console.error('Error submitting data:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Better error handling with specific messages
      let errorMessage = 'Error submitting data. Please try again.';
      
      if (error.message.includes('Failed to upload')) {
        errorMessage = `Upload failed: ${error.message}`;
      } else if (error.message.includes('permission') || error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your authentication.';
      } else if (error.message.includes('network') || error.message.includes('CORS') || error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('quota') || error.code === 'resource-exhausted') {
        errorMessage = 'Storage quota exceeded. Please contact your administrator.';
      } else if (error.message.includes('invalid-argument') || error.code === 'invalid-argument') {
        errorMessage = 'Invalid data format. Please check your inputs and try again.';
      } else if (error.message) {
        // Include the actual error message for debugging
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // Show completion page if receiving is completed
  if (isCompleted && completionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FiCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Receiving Completed!</h1>
            <p className="text-gray-600 mt-2">All items have been successfully processed</p>
          </div>

          {/* Summary Information */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Delivery Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Record ID:</span>
                  <span className="font-medium">{completionData.recordId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">PO ID:</span>
                  <span className="font-medium">{completionData.poId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">DR Number:</span>
                  <span className="font-medium">{completionData.deliveryDetails?.drNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium">{completionData.deliveryDetails?.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Products Received:</span>
                  <span className="font-medium">{completionData.productsReceived?.length} of {completionData.totalProducts}</span>
                </div>
              </div>
            </div>

            {/* Products Received */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <FiPackage className="mr-2" />
                Inventory Updated
              </h3>
              <div className="space-y-1 text-sm">
                {completionData.productsReceived?.map((product, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600">{product.name}</span>
                    <span className="font-medium text-green-600">+{product.deliveredQty}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Updates */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">System Updates</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Purchase Order status updated to 'Received'
                </div>
                <div className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Inventory quantities updated
                </div>
                <div className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Receiving transaction logged
                </div>
                <div className="flex items-center text-gray-400">
                  <FiX className="w-4 h-4 mr-2" />
                  Document uploads (temporarily disabled)
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                // Reset all states to start a new receiving process
                setIsCompleted(false);
                setCompletionData(null);
                setPoId(null);
                setPoData(null);
                setDeliveryDetails({
                  drNumber: '',
                  invoiceNumber: '',
                  deliveryDate: '',
                  deliveryTime: '',
                  driverName: ''
                });
                setProducts([]);
                setUploadedFiles([]);
                setUploadProgress({});
                setActiveTab('delivery-details');
              }}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center"
            >
              <FiRefreshCw className="mr-2" />
              Process New Delivery
            </button>
            
            <button
              onClick={() => {
                // Go back to main receiving page (or wherever you want)
                window.history.back();
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Receiving
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-800">Mobile Receiving</h1>
          <p className="text-sm text-gray-600">
            {poId ? `PO ID: ${poId}` : 'Process delivery receipts'}
            {PoData && PoData.status && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                PoData.status === 'receiving_in_progress' ? 'bg-orange-100 text-orange-700' :
                PoData.status === 'received' ? 'bg-green-100 text-green-700' :
                PoData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {PoData.status === 'receiving_in_progress' ? 'Receiving in Progress' :
                 PoData.status === 'received' ? 'Received' :
                 PoData.status === 'pending' ? 'Pending' :
                 PoData.status}
              </span>
            )}
          </p>
        </div>
      </div>


      {/* Content Area */}
      <div className="p-4 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-600">Loading PO data...</p>
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        {activeTab === 'delivery-details' ? (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-lg font-medium transition-colors bg-orange-500 text-white hover:bg-orange-600"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              isSubmitting 
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center mb-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
                {processingStep && (
                  <div className="text-xs text-gray-200">
                    {processingStep}
                  </div>
                )}
              </div>
            ) : (
              'Submit Receiving Data'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceivingMobileView;