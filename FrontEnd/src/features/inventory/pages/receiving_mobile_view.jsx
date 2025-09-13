import React, { useState, useCallback } from 'react';
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
  getFirestore 
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
const ProductVerification = ({ products, updateProduct }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Verification</h3>
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

const FileUpload = ({ uploadedFiles, setUploadedFiles, uploadProgress, retryUpload, cancelUpload }) => {
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
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Supporting Documents</h3>
      
      <div 
        className={`bg-white rounded-lg p-4 border-2 border-dashed transition-colors ${
          dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-300'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center">
          <FiCamera className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-sm text-gray-600 mb-2">
            Upload DR, Invoice, or Proof of Delivery
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
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-4 py-2 bg-orange-500 text-white rounded-lg cursor-pointer hover:bg-orange-600"
          >
            <FiUpload className="inline mr-2" size={16} />
            Choose Files
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
  );
};

const DeliveryDetailsForm = ({ deliveryDetails, updateDeliveryDetails }) => (
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
  </div>
);

const ReceivingMobileView = () => {
  const [activeTab, setActiveTab] = useState('delivery-details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadTasks, setUploadTasks] = useState({});
  const [deliveryDetails, setDeliveryDetails] = useState({
    drNumber: '',
    invoiceNumber: '',
    deliveryDate: '',
    deliveryTime: '',
    driverName: ''
  });
  
  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Portland Cement 50kg',
      orderedQty: 100,
      deliveredQty: '',
      status: 'pending',
      remarks: '',
      condition: 'complete'
    },
    {
      id: 2,
      name: 'Steel Bars 12mm',
      orderedQty: 50,
      deliveredQty: '',
      status: 'pending',
      remarks: '',
      condition: 'complete'
    }
  ]);

  const [uploadedFiles, setUploadedFiles] = useState([]);

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

  // Enhanced Firebase save function with concurrent uploads and progress tracking
  const saveReceivingData = async () => {
    try {
      setIsSubmitting(true);

      // Initialize progress tracking for document uploads only
      const initialProgress = {};
      uploadedFiles.forEach(file => {
        initialProgress[file.name] = { progress: 0, status: 'uploading' };
      });
      setUploadProgress(initialProgress);

      // Upload files concurrently with progress tracking
      const uploadedFileURLs = await Promise.all(
        uploadedFiles.map(async (file) => {
          try {
            const url = await uploadFileToFirebase(file, (progress) => {
              setUploadProgress(prev => ({
                ...prev,
                [file.name]: { progress, status: 'uploading' }
              }));
            });
            
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: { progress: 100, status: 'completed' }
            }));
            
            return {
              name: file.name,
              url: url,
              type: file.type,
              size: file.size
            };
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: { progress: 0, status: 'error' }
            }));
            throw new Error(`Failed to upload ${file.name}: ${error.message}`);
          }
        })
      );

      // Prepare data for Firestore
      const receivingData = {
        deliveryDetails: {
          ...deliveryDetails,
          deliveryDateTime: new Date(`${deliveryDetails.deliveryDate}T${deliveryDetails.deliveryTime}`)
        },
        products: products.map(product => ({
          ...product,
          deliveredQty: isNaN(Number(product.deliveredQty)) ? 0 : Number(product.deliveredQty)
        })),
        uploadedFiles: uploadedFileURLs,
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'receivingRecords'), receivingData);
      
      console.log('Receiving data saved with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving receiving data:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'delivery-details':
        return <DeliveryDetailsForm deliveryDetails={deliveryDetails} updateDeliveryDetails={updateDeliveryDetails} />;
      case 'product-verification':
        return <ProductVerification products={products} updateProduct={updateProduct} />;
      case 'documents':
        return (
          <FileUpload 
            uploadedFiles={uploadedFiles} 
            setUploadedFiles={setUploadedFiles}
            uploadProgress={uploadProgress}
            retryUpload={retryUpload}
            cancelUpload={cancelUpload}
          />
        );
      default:
        return null;
    }
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
      
      alert(`Receiving data submitted successfully! Record ID: ${recordId}`);
      
      // Reset form
      setDeliveryDetails({
        drNumber: '',
        invoiceNumber: '',
        deliveryDate: '',
        deliveryTime: '',
        driverName: ''
      });
      setProducts(prev => prev.map(p => ({
        ...p,
        deliveredQty: '',
        status: 'pending',
        remarks: '',
        condition: 'complete'
      })));
      setUploadedFiles([]);
      setUploadProgress({});
      setActiveTab('delivery-details');
      
    } catch (error) {
      console.error('Error submitting data:', error);
      
      // Better error handling with specific messages
      let errorMessage = 'Error submitting data. Please try again.';
      
      if (error.message.includes('Failed to upload')) {
        errorMessage = `Upload failed: ${error.message}`;
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Please check your authentication.';
      } else if (error.message.includes('network') || error.message.includes('CORS')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-800">Mobile Receiving</h1>
          <p className="text-sm text-gray-600">Process delivery receipts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="px-4 py-2 flex overflow-x-auto">
          <TabButton
            id="delivery-details"
            label="Delivery Details"
            icon={FiFileText}
            count={0}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            id="product-verification"
            label="Products"
            icon={FiPackage}
            count={products.length}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            id="documents"
            label="Documents"
            icon={FiUpload}
            count={uploadedFiles.length}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 pb-24">
        {renderContent()}
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isSubmitting 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Receiving Data'}
        </button>
      </div>
    </div>
  );
};

export default ReceivingMobileView; 