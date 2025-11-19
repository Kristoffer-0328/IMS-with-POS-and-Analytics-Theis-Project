import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, Clock, Upload, X, MapPin, User, Truck, FileText, Camera, ChevronLeft, ChevronRight, QrCode } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  getFirestore,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  runTransaction,
  query,        
  where         
} from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import app from '../../../services/firebase/config';
import storage from '../../../services/firebase/StorageConfig';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { AnalyticsService } from '../../../services/firebase/AnalyticsService';
import { uploadImage } from '../../../services/cloudinary/CloudinaryService';
import ErrorModal from '../../../components/modals/ErrorModal';
import { getVariantById, updateVariantStock, updateProductAggregateStats, searchVariants } from '../../../services/firebase/VariantServices';

// Helper function to generate receiving notification
const generateReceivingNotification = async (receivingData, currentUser) => {
  try {
    if (!receivingData) return null;
    
    const notificationId = `REC-NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification = {
      notificationId,
      type: 'receiving_completed',
      priority: 'normal',
      title: '📦 Receiving Completed',
      message: `PO ${receivingData.poId} receiving completed - ${receivingData.items?.length || 0} items processed`,
      details: {
        poId: receivingData.poId,
        transactionId: receivingData.transactionId,
        totalItems: receivingData.items?.length || 0,
        totalReceivedValue: receivingData.summary?.totalReceivedValue || 0,
        supplierName: receivingData.deliveryDetails?.supplierName || 'Unknown Supplier',
        receivedBy: receivingData.deliveryDetails?.receivedBy || 'Unknown',
        items: receivingData.items?.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.receivedQuantity,
          unitPrice: item.unitPrice,
          totalPrice: item.receivedQuantity * item.unitPrice,
          category: item.category
        })) || []
      },
      targetRoles: ['InventoryManager', 'Admin'], // Who should see this notification
      triggeredBy: currentUser?.uid || 'system',
      triggeredByName: currentUser?.displayName || currentUser?.email || 'Mobile Receiving System',
      relatedTransactionId: receivingData.transactionId,
      isRead: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Save to notifications collection
    await addDoc(collection(db, 'Notifications'), notification);

    return notification;
  } catch (error) {
    console.error('Error generating receiving notification:', error);
    return null;
  }
};

const db = getFirestore(app);

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const MobileReceive = () => {
  const { currentUser } = useAuth();
  const [deliveryData, setDeliveryData] = useState({
    drNumber: '',
    invoiceNumber: '',
    poNumber: '',
    supplierName: '',
    deliveryDate: '',
    deliveryTime: '',
    driverName: '',
    truckNumber: '',
    receivedBy: '',
    projectSite: '',
    products: [],
    supportingDocuments: [],
  });

  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [showNotReceivedModal, setShowNotReceivedModal] = useState(false);
  const [notReceivedProductId, setNotReceivedProductId] = useState(null);
  const [notReceivedReason, setNotReceivedReason] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [poId, setPoId] = useState(null);
  const [poData, setPoData] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', type: 'error' });
  
  // Authorization State
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [userAuthCode, setUserAuthCode] = useState('');
  const [userRole, setUserRole] = useState('');
  
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const steps = ['List', 'Inspect', 'Info', 'Summary'];

  // Read poId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const poIdParam = urlParams.get('poId');

    if (poIdParam) {
      setPoId(poIdParam);
      setIsLoading(true);
      
      // Fetch PO data from Firestore
      const fetchPO = async () => {
        try {
          const poRef = doc(db, 'purchase_orders', poIdParam);
          const poDoc = await getDoc(poRef);
          
          if (poDoc.exists()) {
            const poData = poDoc.data();
            setPoData(poData);
            
            // Update delivery data with PO information
            setDeliveryData(prev => ({
              ...prev,
              poNumber: poData.poNumber || '',
              supplierName: poData.supplierName || '',
              products: poData.items?.map((item, idx) => ({
                id: item.productId || `item-${idx}`,
                name: item.productName || item.name || 'Unknown Product',
                sku: item.sku || item.productId || '',
                unit: item.unit || 'pieces',
                expectedQty: item.quantity || 0,
                acceptedQty: 0,
                rejectedQty: 0,
                photo: null,
                photoPreview: null,
                rejectionReason: '',
                status: 'pending',
                notes: '',
                productId: item.productId,
                variantId: item.productId && item.productId.includes('_VAR_') ? item.productId : null, // Check if productId is a variant ID
                variantName: item.variantName || null,
                unitPrice: item.unitPrice || 0,
                total: item.total || 0,
                category: item.category || 'General'
              })) || []
            }));

            // Update PO status to 'receiving_in_progress' if not already
            if (poData.status !== 'receiving_in_progress' && poData.status !== 'received') {
              await updateDoc(poRef, {
                status: 'receiving_in_progress',
                receivingStartedAt: serverTimestamp(),
                receivingStartedBy: currentUser?.uid || 'mobile_user',
                updatedAt: serverTimestamp()
              });
            }
          } else {
            console.error('PO not found');
            setErrorModal({
              isOpen: true,
              title: 'Purchase Order Not Found',
              message: 'The requested Purchase Order could not be found. Please check the QR code or link and try again.',
              type: 'error'
            });
          }
        } catch (err) {
          console.error('Error fetching PO:', err);
          setErrorModal({
            isOpen: true,
            title: 'Loading Error',
            message: 'Error loading Purchase Order data. Please check your connection and try again.',
            type: 'error'
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchPO();
    } else {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Initialize all products as selected for inspection
  useEffect(() => {
    if (deliveryData.products.length > 0) {
      setSelectedProducts(deliveryData.products.map(p => p.id));
    }
  }, [deliveryData.products]);

  // Handle case where current product is no longer selected (e.g., marked as not received)
  useEffect(() => {
    if (currentStep === 1 && selectedProducts.length > 0) {
      const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
      
      // If current product index is out of bounds, reset to first available product
      if (currentProductIndex >= selectedProductsForInspection.length) {
        setCurrentProductIndex(0);
      }
      
      // If no products are selected for inspection, go back to step 0
      if (selectedProductsForInspection.length === 0) {
        setCurrentStep(0);
        setCurrentProductIndex(0);
      }
    }
  }, [selectedProducts, currentStep, currentProductIndex, deliveryData.products]);

  // Fetch User Auth Code
  useEffect(() => {
    const fetchUserAuth = async () => {
      if (!currentUser?.uid) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserAuthCode(userData.authCode || '');
          setUserRole(userData.role || '');
        }
      } catch (error) {
        console.error('Error fetching user auth code:', error);
      }
    };
    fetchUserAuth();
  }, [currentUser, db]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDeliveryData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleProductChange = (selectedIndex, field, value) => {
    const newProducts = [...deliveryData.products];
    
    // Find the actual product in the full array using the selected product's ID
    const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
    const currentProduct = selectedProductsForInspection[selectedIndex];
    if (!currentProduct) return;
    
    const actualIndex = newProducts.findIndex(p => p.id === currentProduct.id);
    if (actualIndex === -1) return;
    
    // Handle quantity fields specially to allow empty string during typing
    if (field === 'acceptedQty' || field === 'rejectedQty') {
      // Allow empty string or valid numbers
      if (value === '' || (!isNaN(value) && value >= 0)) {
        newProducts[actualIndex][field] = value === '' ? '' : parseInt(value) || 0;
      } else {
        return; // Don't update if invalid value
      }
    } else {
      newProducts[actualIndex][field] = value;
    }
    
    if (field === 'photo' && !value) {
      newProducts[actualIndex].photoPreview = null;
    }
    
    // Auto-update status when quantities change
    if (field === 'acceptedQty' || field === 'rejectedQty') {
      const accepted = field === 'acceptedQty' ? (newProducts[actualIndex].acceptedQty || 0) : newProducts[actualIndex].acceptedQty;
      const rejected = field === 'rejectedQty' ? (newProducts[actualIndex].rejectedQty || 0) : newProducts[actualIndex].rejectedQty;
      
      if (accepted > 0 || rejected > 0) {
        newProducts[actualIndex].status = 'received';
      }
    }
    
    setDeliveryData(prevData => ({
      ...prevData,
      products: newProducts
    }));
  };

  const handlePhotoUpload = (selectedIndex, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Show loading state
    setIsPhotoUploading(true);

    try {
      // More comprehensive iPhone image format support
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',  // iPhone HEIC format
        'image/heif',  // iPhone HEIF format
        'image/heics', // iPhone HEIC sequence
        'image/heifs', // iPhone HEIF sequence
        ''  // Some mobile browsers don't provide MIME type
      ];

      // Check file extension for iPhone formats
      const fileName = file.name.toLowerCase();
      const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|heic|heif|heics|heifs)$/i.test(fileName);

      // Check MIME type
      const mimeType = file.type.toLowerCase();
      const hasValidMimeType = mimeType.startsWith('image/') ||
                              allowedTypes.includes(mimeType) ||
                              mimeType === '' || // Some browsers don't provide MIME type
                              mimeType.includes('heic') ||
                              mimeType.includes('heif');

      const isValidType = hasValidExtension || hasValidMimeType;

      if (!isValidType) {
        setErrorModal({
          isOpen: true,
          title: 'Invalid Image Format',
          message: 'Please select a photo from your camera or gallery.',
          type: 'error',
          details: `Supported formats: JPG, PNG, GIF, WebP, HEIC, HEIF\n\nFile selected: ${file.name} (${file.type || 'unknown type'})`
        });
        setIsPhotoUploading(false);
        return;
      }

      // Validate file size (increased for iPhone photos)
      const maxSize = 15 * 1024 * 1024; // 15MB for iPhone photos
      if (file.size > maxSize) {
        setErrorModal({
          isOpen: true,
          title: 'Photo Too Large',
          message: 'Please choose a smaller photo or compress it.',
          type: 'warning',
          details: `File size: ${(file.size / (1024 * 1024)).toFixed(1)}MB\nMaximum size: 15MB`
        });
        setIsPhotoUploading(false);
        return;
      }

      // Check if it's actually an image file
      if (!file.type.startsWith('image/') && !hasValidExtension) {
        setErrorModal({
          isOpen: true,
          title: 'Invalid File Type',
          message: 'Please select an image file. The selected file is not recognized as an image.',
          type: 'error'
        });
        setIsPhotoUploading(false);
        return;
      }


      const reader = new FileReader();

      reader.onloadstart = () => {
      };

      reader.onloadend = () => {
        try {
          handleProductChange(selectedIndex, 'photo', file);
          handleProductChange(selectedIndex, 'photoPreview', reader.result);
          setErrorModal({
            isOpen: true,
            title: 'Photo Uploaded',
            message: 'Photo uploaded successfully!',
            type: 'success'
          });
        } catch (error) {
          console.error('❌ Error processing image:', error);
          setErrorModal({
            isOpen: true,
            title: 'Processing Error',
            message: 'Error processing the photo. Please try a different image or try again.',
            type: 'error'
          });
        } finally {
          setIsPhotoUploading(false);
        }
      };

      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        setErrorModal({
          isOpen: true,
          title: 'File Reading Error',
          message: 'Error reading the photo file. Try taking a new photo or selecting a different image.',
          type: 'error',
          details: `Error: ${error.target?.error?.message || 'Unknown error'}`
        });
        setIsPhotoUploading(false);
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
        }
      };

      // Try different reading methods for better iPhone compatibility
      try {
        reader.readAsDataURL(file);
      } catch (readError) {
        console.error('❌ Error starting file read:', readError);
        setErrorModal({
          isOpen: true,
          title: 'File Read Error',
          message: 'Unable to read the photo file. Please try a different image.',
          type: 'error'
        });
        setIsPhotoUploading(false);
      }

    } catch (error) {
      console.error('❌ Unexpected error in photo upload:', error);
      setErrorModal({
        isOpen: true,
        title: 'Upload Error',
        message: 'Unexpected error while uploading photo. Please try again or contact support if the problem persists.',
        type: 'error',
        details: error.message
      });
      setIsPhotoUploading(false);
    }

    // Reset the input value to allow selecting the same file again if needed
    event.target.value = '';
  };

  const handleNotReceivedClick = (productId) => {
    setNotReceivedProductId(productId);
    setShowNotReceivedModal(true);
  };

  const submitNotReceived = () => {
    if (!notReceivedReason.trim()) {
      setErrorModal({
        isOpen: true,
        title: 'Reason Required',
        message: 'Please provide a reason why this product was not received.',
        type: 'warning'
      });
      return;
    }
    
    const newProducts = deliveryData.products.map(p => 
      p.id === notReceivedProductId 
        ? { ...p, status: 'not_received', rejectionReason: notReceivedReason, acceptedQty: 0, rejectedQty: 0 }
        : p
    );
    
    // Remove the product from selected products list since it's not received
    setSelectedProducts(prev => prev.filter(id => id !== notReceivedProductId));
    
    setDeliveryData(prevData => ({ ...prevData, products: newProducts }));
    setShowNotReceivedModal(false);
    setNotReceivedReason('');
    setNotReceivedProductId(null);
  };

  const undoNotReceived = (productId) => {
    if (window.confirm('Are you sure you want to undo "Not Received" for this product? It will be added back to the inspection list.')) {
      const newProducts = deliveryData.products.map(p => 
        p.id === productId 
          ? { ...p, status: 'pending', rejectionReason: '', acceptedQty: 0, rejectedQty: 0 }
          : p
      );
      
      // Add the product back to selected products list
      setSelectedProducts(prev => [...prev, productId]);
      
      setDeliveryData(prevData => ({ ...prevData, products: newProducts }));
    }
  };

  const toggleProductSelection = (productId) => {
    // Find the product to check its status
    const product = deliveryData.products.find(p => p.id === productId);
    
    // Don't allow selection of products marked as not received
    if (product && product.status === 'not_received') {
      return;
    }
    
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const calculateVariance = (expected, accepted, rejected) => {
    const total = accepted + rejected;
    return total - expected;
  };

  const getVarianceColor = (variance) => {
    if (variance === 0) return 'text-green-600';
    if (variance > 0) return 'text-red-600';
    return 'text-orange-600';
  };

  const validateCurrentProduct = () => {
    const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
    const product = selectedProductsForInspection[currentProductIndex];
    let newErrors = {};

    if (product && product.status !== 'not_received') {
      if (!product.photo) {
        setErrorModal({
          isOpen: true,
          title: 'Photo Required',
          message: 'Please take or upload a photo of the product before proceeding. This is required for quality inspection documentation.',
          type: 'warning'
        });
        return false;
      }

      const totalCounted = (parseInt(product.acceptedQty) || 0) + (parseInt(product.rejectedQty) || 0);
      
      if (totalCounted > product.expectedQty) {
        setErrorModal({
          isOpen: true,
          title: 'Quantity Error',
          message: `Total counted (${totalCounted}) cannot exceed expected quantity of ${product.expectedQty} ${product.unit}.`,
          type: 'error',
          details: `Accepted: ${product.acceptedQty || 0}\nRejected: ${product.rejectedQty || 0}\nExpected: ${product.expectedQty}`
        });
        return false;
      }

      if ((parseInt(product.rejectedQty) || 0) > 0 && !product.rejectionReason.trim()) {
        setErrorModal({
          isOpen: true,
          title: 'Rejection Reason Required',
          message: 'Please provide a reason for rejected/damaged items before proceeding.',
          type: 'warning'
        });
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDeliveryInfo = () => {
    let newErrors = {};
    if (!deliveryData.driverName) newErrors.driverName = 'Driver Name is required';
    // Validate delivery date and time
    if (!deliveryData.deliveryDate) {
      newErrors.deliveryDate = 'Delivery Date is required';
    }
    if (!deliveryData.deliveryTime) {
      newErrors.deliveryTime = 'Delivery Time is required';
    }
    if (!deliveryData.receivedBy) newErrors.receivedBy = 'Received By is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextProduct = () => {
    if (validateCurrentProduct()) {
      const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
      if (currentProductIndex < selectedProductsForInspection.length - 1) {
        setCurrentProductIndex(currentProductIndex + 1);
        setErrors({});
        // Reset file input when moving to next product
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Move to next step
        setCurrentStep(2);
      }
    }
  };

  const handlePreviousProduct = () => {
    if (currentProductIndex > 0) {
      setCurrentProductIndex(currentProductIndex - 1);
      setErrors({});
      // Reset file input when moving to previous product
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleStepNavigation = (direction) => {
    if (direction === 'next') {
      if (currentStep === 0) {
        if (selectedProducts.length === 0) {
          setErrorModal({
            isOpen: true,
            title: 'No Products Selected',
            message: 'Please select at least one product for inspection.',
            type: 'warning'
          });
          return;
        }
        setCurrentStep(1);
        setCurrentProductIndex(0); // Reset to first selected product
        // Reset file input when starting inspection
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else if (currentStep === 1) {
        if (validateCurrentProduct()) {
          const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
          if (currentProductIndex < selectedProductsForInspection.length - 1) {
            handleNextProduct();
          } else {
            setCurrentStep(2);
          }
        }
      } else if (currentStep === 2) {
        if (validateDeliveryInfo()) {
          setCurrentStep(3);
        }
      }
    } else if (direction === 'back') {
      if (currentStep === 1 && currentProductIndex > 0) {
        handlePreviousProduct();
      } else if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const handleAuthSubmit = async () => {
    if (!authCode.trim()) return;

    setAuthLoading(true);
    setAuthError('');

    // Add 1.5 second delay for loading state
    setTimeout(async () => {
      try {
        // Query users collection to find if the auth code exists
        const usersRef = collection(db, 'User');
        const q = query(usersRef, where('authCode', '==', authCode.trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setAuthError('Authorization code is incorrect. Please try again.');
          setAuthLoading(false);
          return;
        }

        // Get the first matching user
        const authUserDoc = querySnapshot.docs[0];
        const authUserData = authUserDoc.data();

        // Check if the user has the required role
        if (authUserData.role !== 'InventoryManager' && authUserData.role !== 'Admin') {
          setErrorModal({
            isOpen: true,
            title: 'Access Denied',
            message: 'The authorization code belongs to a user without sufficient privileges.',
            type: 'error'
          });
          setAuthCode('');
          setAuthLoading(false);
          return;
        }

        // Authorization successful - allow access
        setIsAuthorized(true);
        setShowAuthModal(false);
        setAuthCode('');
        setAuthError('');
      } catch (error) {
        console.error('Error validating auth code:', error);
        setErrorModal({
          isOpen: true,
          title: 'Verification Error',
          message: 'Failed to verify authorization code. Please try again.',
          type: 'error'
        });
      } finally {
        setAuthLoading(false);
      }
    }, 1500); // 1.5 seconds delay
  };

  const getSummary = () => {
    const totalExpected = deliveryData.products.reduce((sum, p) => sum + p.expectedQty, 0);
    const totalAccepted = deliveryData.products.reduce((sum, p) => sum + (parseInt(p.acceptedQty) || 0), 0);
    const totalRejected = deliveryData.products.reduce((sum, p) => sum + (parseInt(p.rejectedQty) || 0), 0);
    const totalReceived = totalAccepted + totalRejected;
    const notReceived = deliveryData.products.filter(p => p.status === 'not_received').length;
    const forInspection = selectedProducts.length;

    return { totalExpected, totalAccepted, totalRejected, totalReceived, notReceived, forInspection, totalProducts: deliveryData.products.length };
  };

  // Function to find variant in inventory using NEW FLAT VARIANTS COLLECTION
  const findProductInInventory = async (productId, productName, variantId = null) => {
    try {
      console.log('🔍 Searching for variant:', { productId, productName, variantId });
      
      // Strategy 1: If we have a variantId, try direct lookup first (most efficient)
      if (variantId) {
        const variant = await getVariantById(variantId);
        if (variant) {
          console.log('✅ Found variant by ID:', variantId);
          return {
            id: variant.id,
            data: variant,
            isVariant: true
          };
        }
      }
      
      // Strategy 2: Try treating productId as a variant ID directly
      if (productId) {
        const variant = await getVariantById(productId);
        if (variant) {
          console.log('✅ Found variant by treating productId as variantId:', productId);
          return {
            id: variant.id,
            data: variant,
            isVariant: true
          };
        }
      }
      
      // Strategy 3: Search by parentProductId (if productId is actually a product ID)
      // This handles cases where the PO references the parent product
      // Note: This query only uses a simple where clause to avoid index requirements
      if (productId) {
        try {
          const variantsCollection = collection(db, 'Variants');
          const productQuery = query(
            variantsCollection, 
            where('parentProductId', '==', productId)
          );
          const productSnapshot = await getDocs(productQuery);
          
          if (!productSnapshot.empty) {
            // If multiple variants exist, try to match by name
            if (productName && productSnapshot.docs.length > 1) {
              const matchingVariant = productSnapshot.docs.find(doc => {
                const data = doc.data();
                return data.variantName === productName || 
                       data.productName === productName ||
                       `${data.productName} - ${data.variantName}` === productName;
              });
              
              if (matchingVariant) {
                const variantData = matchingVariant.data();
                console.log('✅ Found variant by parentProductId and name match:', matchingVariant.id);
                return {
                  id: matchingVariant.id,
                  data: { id: matchingVariant.id, ...variantData },
                  isVariant: true
                };
              }
            }
            
            // Return first variant if no name match
            const firstVariant = productSnapshot.docs[0];
            const variantData = firstVariant.data();
            console.log('✅ Found variant by parentProductId (first match):', firstVariant.id);
            return {
              id: firstVariant.id,
              data: { id: firstVariant.id, ...variantData },
              isVariant: true
            };
          }
        } catch (indexError) {
          console.warn('⚠️ Index not available for parentProductId query, skipping this strategy:', indexError.message);
          // Continue to next strategy
        }
      }
      
      // Strategy 4: Search by product name using searchVariants
      if (productName && productName.trim() !== '') {
        console.log('🔍 Searching variants by name:', productName);
        const searchResults = await searchVariants(productName.trim());
        
        if (searchResults && searchResults.length > 0) {
          const firstMatch = searchResults[0];
          console.log('✅ Found variant by name search:', firstMatch.id);
          return {
            id: firstMatch.id,
            data: firstMatch,
            isVariant: true
          };
        }
      }

      console.warn('⚠️ No variant found for:', { productId, productName, variantId });
      return null;
      
    } catch (error) {
      console.error(`❌ Error searching for variant ${productName}:`, error);
      throw error;
    }
  };

  // Function to update inventory quantities by adding received items using NEW VARIANTS COLLECTION
  const updateInventoryQuantities = async (receivedProducts) => {
    try {
      console.log('📦 Starting inventory update for', receivedProducts.length, 'products');

      for (const product of receivedProducts) {
        if (!product.receivedQuantity || product.receivedQuantity <= 0) {
          console.log('⏭️ Skipping product with no received quantity:', product.productName);
          continue;
        }

        console.log('🔄 Processing:', product.productName, 'Qty:', product.receivedQuantity);

        // Find the variant in the new Variants collection
        const variantInfo = await findProductInInventory(
          product.productId, 
          product.productName || 'Unknown Product', 
          product.variantId
        );

        if (!variantInfo) {
          throw new Error(
            `Variant "${product.productName}" (ID: ${product.productId}, Variant ID: ${product.variantId || 'N/A'}) not found in inventory. Cannot update stock levels.`
          );
        }

        console.log('✅ Found variant:', variantInfo.id);

        // Get current variant data
        const currentVariant = variantInfo.data;
        const currentQty = Number(currentVariant.quantity) || 0;
        const receivedQty = Number(product.receivedQuantity);
        const newQty = currentQty + receivedQty;

        console.log(`📊 Updating stock: ${currentQty} + ${receivedQty} = ${newQty}`);

        // Update the variant using VariantServices
        await updateVariantStock(
          variantInfo.id, 
          newQty, 
          'Receiving - Purchase Order',
          {
            poNumber: deliveryData.poNumber,
            drNumber: deliveryData.drNumber,
            invoiceNumber: deliveryData.invoiceNumber,
            supplierName: deliveryData.supplierName,
            receivedBy: deliveryData.receivedBy || currentUser?.email || 'System',
            deliveryDate: deliveryData.deliveryDate,
            previousQuantity: currentQty,
            receivedQuantity: receivedQty,
            timestamp: new Date().toISOString()
          }
        );

        // Update the parent product's aggregate statistics (optional - gracefully handle if product doesn't exist)
        if (currentVariant.parentProductId) {
          try {
            await updateProductAggregateStats(currentVariant.parentProductId);
            console.log('✅ Updated aggregate stats for parent product:', currentVariant.parentProductId);
          } catch (aggregateError) {
            // Non-critical error - variant was updated successfully, but parent product stats couldn't be updated
            console.warn('⚠️ Could not update parent product aggregate stats (product may not exist):', aggregateError.message);
            // Continue processing - this is not a fatal error
          }
        }

        console.log('✅ Successfully updated variant:', variantInfo.id);
      }

      console.log('✅ All inventory updates completed successfully');

    } catch (error) {
      console.error('❌ Error in inventory update:', error);
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setProcessingStep('Preparing data...');

      // Upload images to Cloudinary and replace base64 data with URLs
      setProcessingStep('Uploading images...');
      const productsWithUploadedImages = await Promise.all(
        deliveryData.products.map(async (product) => {
          if (product.photo && product.photoPreview && product.photoPreview.startsWith('data:')) {
            try {
              const uploadResult = await uploadImage(product.photo, (progress) => {
              }, {
                folder: 'receiving-photos',
                publicId: `receiving-${poId}-${product.id}-${Date.now()}`
              });
              
              return {
                ...product,
                photo: uploadResult.url, // Replace File object with URL
                photoPreview: uploadResult.url // Replace base64 with URL
              };
            } catch (uploadError) {
              console.error(`❌ Failed to upload image for ${product.name}:`, uploadError);
              // Keep the original data if upload fails, but log the error
              return product;
            }
          }
          return product;
        })
      );

      // Update deliveryData with uploaded images
      const updatedDeliveryData = {
        ...deliveryData,
        products: productsWithUploadedImages
      };

      // Prepare received items for processing
      const receivedItems = updatedDeliveryData.products
        .filter(p => p.status === 'received' && (p.acceptedQty > 0 || p.rejectedQty > 0))
        .map(product => ({
          productId: product.productId,
          productName: product.name || 'Unknown Product',
          category: product.category || 'General',
          expectedQuantity: product.expectedQty,
          quantity: parseInt(product.acceptedQty) || 0,  // <-- Changed to 'quantity' for AnalyticsService
          receivedQuantity: parseInt(product.acceptedQty) || 0,  // <-- Keep for other uses
          rejectedQuantity: parseInt(product.rejectedQty) || 0,
          unitPrice: product.unitPrice || 0,
          rejectionReason: product.rejectionReason || '',
          notes: product.notes || '',
          photo: product.photoPreview || null, // Now contains URL instead of base64
          variantId: product.variantId || null,
          variantName: product.variantName || null,
          receivedBy: {
            id: currentUser?.uid || 'mobile_user',
            name: currentUser?.name || deliveryData.receivedBy || 'Mobile User'
          }
        }));

      // Update inventory quantities with received products
      setProcessingStep('Updating inventory...');
      await updateInventoryQuantities(receivedItems);
      
      // Update Purchase Order status and received quantities
      setProcessingStep('Updating Purchase Order...');
      
      // Validate and parse delivery date/time
      let deliveryDateTime;
      try {
        if (updatedDeliveryData.deliveryDate && updatedDeliveryData.deliveryTime) {
          deliveryDateTime = new Date(`${updatedDeliveryData.deliveryDate}T${updatedDeliveryData.deliveryTime}`);
          // Check if the date is valid
          if (isNaN(deliveryDateTime.getTime())) {
            throw new Error('Invalid date format');
          }
        } else {
          // Use current timestamp if date/time is incomplete
          deliveryDateTime = new Date();
        }
      } catch (error) {
        console.warn('Invalid delivery date/time, using current timestamp:', updatedDeliveryData.deliveryDate, updatedDeliveryData.deliveryTime);
        deliveryDateTime = new Date();
      }
      
      if (poId) {
        const poRef = doc(db, 'purchase_orders', poId);
        
        // Calculate total ordered vs received for summary
        const orderSummary = {
          totalItemsOrdered: updatedDeliveryData.products.length,
          totalItemsReceived: receivedItems.length,
          totalQuantityOrdered: updatedDeliveryData.products.reduce((sum, p) => sum + (p.expectedQty || 0), 0),
          totalQuantityReceived: receivedItems.reduce((sum, p) => sum + (p.receivedQuantity || 0), 0),
          itemsWithDiscrepancies: updatedDeliveryData.products.filter(p => (parseInt(p.acceptedQty) || 0) !== p.expectedQty).length
        };
        
        await updateDoc(poRef, {
          status: 'received',
          receivedAt: serverTimestamp(),
          receivingCompletedBy: currentUser?.uid || 'mobile_user',
          orderSummary: orderSummary,
          receivedProducts: receivedItems,
          deliveryDetails: {
            drNumber: updatedDeliveryData.drNumber || '',
            invoiceNumber: updatedDeliveryData.invoiceNumber || '',
            deliveryDateTime: deliveryDateTime,
            driverName: updatedDeliveryData.driverName || '',
            truckNumber: updatedDeliveryData.truckNumber || '',
            receivedBy: updatedDeliveryData.receivedBy || '',
            projectSite: updatedDeliveryData.projectSite || ''
          },
          updatedAt: serverTimestamp()
        });
      }

      // Save receiving transaction record
      setProcessingStep('Logging transaction...');
      
      // Use the validated delivery date/time
      const transactionDateTime = deliveryDateTime || new Date();
      
      const receivingTransactionData = {
        transactionId: `REC-${Date.now()}`,
        type: 'receiving',
        poId: poId,
        deliveryDetails: {
          drNumber: updatedDeliveryData.drNumber || '',
          invoiceNumber: updatedDeliveryData.invoiceNumber || '',
          deliveryDateTime: transactionDateTime,
          driverName: updatedDeliveryData.driverName || '',
          truckNumber: updatedDeliveryData.truckNumber || '',
          receivedBy: updatedDeliveryData.receivedBy || '',
          projectSite: updatedDeliveryData.projectSite || ''
        },
        items: receivedItems,
        summary: {
          totalOrderValue: updatedDeliveryData.products.reduce((sum, p) => sum + ((p.unitPrice || 0) * (p.expectedQty || 0)), 0),
          totalReceivedValue: receivedItems.reduce((sum, p) => sum + ((p.unitPrice || 0) * (p.receivedQuantity || 0)), 0),
          itemsCount: updatedDeliveryData.products.length,
          receivedItemsCount: receivedItems.length
        },
        status: 'completed',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid || 'mobile_user'
      };
      
      await addDoc(collection(db, 'receivingTransactions'), receivingTransactionData);

      // Generate receiving notification for inventory manager and admin
      try {
        await generateReceivingNotification(receivingTransactionData, currentUser);
      } catch (notificationError) {
        console.error('Failed to generate receiving notification:', notificationError);
        // Don't fail the transaction if notification fails
      }

      // Update analytics
      setProcessingStep('Updating analytics...');
      
      // Ensure receivedItems have valid data for analytics
      const cleanReceivedItems = receivedItems.map(item => ({
        productId: item.productId || `unknown-${Date.now()}`,
        productName: item.productName || 'Unknown Product',
        category: item.category || 'General',
        quantity: parseInt(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        receivedQuantity: parseInt(item.receivedQuantity) || 0,
        expectedQuantity: parseInt(item.expectedQuantity) || 0,
        rejectedQuantity: parseInt(item.rejectedQuantity) || 0,
        rejectionReason: item.rejectionReason || '',
        notes: item.notes || '',
        receivedBy: item.receivedBy || { id: 'mobile_user', name: 'Mobile User' }
      }));
      
      await AnalyticsService.updateInventorySnapshotAfterReceiving(cleanReceivedItems);

      // Create stock movement entries for each accepted product
      setProcessingStep('Recording stock movements...');
      const receivingTimestamp = transactionDateTime;
      const stockMovementPromises = receivedItems.map(async (product) => {
        const movementRef = collection(db, 'stock_movements');
        return addDoc(movementRef, {
          // Movement Type
          movementType: 'IN',
          reason: 'Supplier Delivery',
          // Product Information
          productId: product.productId || `unknown-${Date.now()}`,
          productName: product.productName || 'Unknown Product',
          variantId: product.variantId || null,
          variantName: product.variantName || null,
          // Quantity & Value
          quantity: product.receivedQuantity || 0,
          orderedQty: product.expectedQuantity || 0,
          unitPrice: product.unitPrice || 0,
          totalValue: ((product.receivedQuantity || 0) * (product.unitPrice || 0)),
          // Location Information (will be filled when inventory is updated)
          storageLocation: null,
          shelf: null,
          row: null,
          column: null,
          // Transaction References
          referenceType: 'receiving_record',
          referenceId: poId,
          poId: poId,
          drNumber: updatedDeliveryData.drNumber || null,
          invoiceNumber: updatedDeliveryData.invoiceNumber || null,
          // Supplier Information
          supplier: poData?.supplierName || 'Unknown Supplier',
          supplierContact: poData?.supplierContact || '',
          // Delivery Information
          driverName: updatedDeliveryData.driverName || '',
          deliveryDate: receivingTimestamp,
          // Condition & Status
          condition: product.rejectedQuantity > 0 ? 'partial' : 'complete',
          remarks: product.notes || '',
          status: 'completed',
          // Timestamps
          movementDate: receivingTimestamp,
          createdAt: new Date(),
          // Additional Context
          notes: updatedDeliveryData.projectSite || ''
        });
      });
      await Promise.all(stockMovementPromises);

      setProcessingStep('Completed!');
      
      // Set completion data and show completion page
      setCompletionData({
        poId,
        poNumber: updatedDeliveryData.poNumber,
        deliveryDetails: {
          drNumber: updatedDeliveryData.drNumber,
          driverName: updatedDeliveryData.driverName,
          deliveryDate: updatedDeliveryData.deliveryDate,
          deliveryTime: updatedDeliveryData.deliveryTime,
          receivedBy: updatedDeliveryData.receivedBy
        },
        productsReceived: receivedItems,
        totalProducts: updatedDeliveryData.products.length,
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
      
      if (error.message.includes('Failed to update')) {
        errorMessage = `Update failed: ${error.message}`;
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
      
      setErrorModal({
        isOpen: true,
        title: 'Submission Error',
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
      setProcessingStep('');
    }
  };

  const summary = getSummary();
  
  // Get the selected products for inspection
  const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
  const currentProduct = selectedProductsForInspection[currentProductIndex];
  const totalCounted = currentProduct ? (parseInt(currentProduct.acceptedQty) || 0) + (parseInt(currentProduct.rejectedQty) || 0) : 0;
  const variance = currentProduct ? calculateVariance(currentProduct.expectedQty, parseInt(currentProduct.acceptedQty) || 0, parseInt(currentProduct.rejectedQty) || 0) : 0;

  // Authorization check - show auth modal if not authorized
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <ErrorModal
          isOpen={showAuthModal}
          onClose={() => {}}
          title="Authorization Required"
          message="Enter your authorization code to access the receiving page."
          type="warning"
          showDefaultButton={false}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        >
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authorization Code
            </label>
            <input
              type="password"
              value={authCode}
              onChange={(e) => {
                setAuthCode(e.target.value);
                setAuthError(''); // Clear error when user starts typing
              }}
              className={`w-full px-4 py-3 border rounded-lg text-center text-lg font-mono tracking-wider focus:ring-2 focus:ring-orange-500 outline-none ${
                authError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-orange-500'
              } ${authLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="Enter code"
              maxLength={8}
              autoComplete="off"
              disabled={authLoading}
              onKeyPress={(e) => e.key === 'Enter' && !authLoading && handleAuthSubmit()}
            />
            {authError && (
              <p className="text-red-600 text-sm mt-2 text-center">{authError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAuthSubmit}
              disabled={!authCode.trim() || authLoading}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {authLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </ErrorModal>
      </div>
    );
  }

  // Show completion page if receiving is completed
  if (isCompleted && completionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
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
                  <span className="text-gray-600">PO Number:</span>
                  <span className="font-medium">{completionData.poNumber}</span>
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
                  <span className="text-gray-600">Delivery Date & Time:</span>
                  <span className="font-medium">{completionData.deliveryDetails?.deliveryDate} {completionData.deliveryDetails?.deliveryTime}</span>
                </div>
              </div>
            </div>

            {/* Products Received */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <Truck className="mr-2" />
                Inventory Updated
              </h3>
              <div className="space-y-1 text-sm">
                {completionData.productsReceived?.map((product, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600">{product.productName}</span>
                    <span className="font-medium text-green-600">+{product.receivedQuantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Updates */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">System Updates</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Purchase Order status updated to 'Received'
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Inventory quantities updated
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Receiving transaction logged
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Stock movements recorded
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
                setDeliveryData({
                  drNumber: '',
                  invoiceNumber: '',
                  poNumber: '',
                  supplierName: '',
                  deliveryDate: '',
                  deliveryTime: '',
                  driverName: '',
                  truckNumber: '',
                  receivedBy: '',
                  projectSite: '',
                  products: [],
                  supportingDocuments: [],
                });
                setUploadedFiles([]);
                setUploadProgress({});
                setCurrentStep(0);
                setCurrentProductIndex(0);
                setSelectedProducts([]);
              }}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center"
            >
              <QrCode className="mr-2" />
              Process New Delivery
            </button>
            
            <button
              onClick={() => {
                // Go back to main receiving page
                window.location.href = '/im/receiving';
              }}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Back to Receiving
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Purchase Order data...</p>
        </div>
      </div>
    );
  }

  if (!poId || !poData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">No Purchase Order Found</h1>
          <p className="text-gray-600 mb-4">
            Please scan a QR code or access this page through a valid Purchase Order link.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Mobile Receiving</h1>
          <p className="text-sm text-gray-500 mt-1">
            {poData.poNumber} • {poData.supplierName}
            {poData.status && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                poData.status === 'receiving_in_progress' ? 'bg-orange-100 text-orange-700' :
                poData.status === 'received' ? 'bg-green-100 text-green-700' :
                poData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {poData.status === 'receiving_in_progress' ? 'Receiving in Progress' :
                 poData.status === 'received' ? 'Received' :
                 poData.status === 'pending' ? 'Pending' :
                 poData.status}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200 sticky top-20 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                    index <= currentStep 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <p className={`text-xs mt-2 font-medium ${
                    index <= currentStep ? 'text-orange-600' : 'text-gray-400'
                  }`}>
                    {step}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 mb-6 ${
                    index < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="max-w-2xl mx-auto px-4 py-6">
        {/* STEP 1 - EXPECTED PRODUCTS LIST */}
        {currentStep === 0 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                <p className="text-blue-600 text-xs font-medium">Total Products</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{summary.totalProducts}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-center">
                <p className="text-orange-600 text-xs font-medium">For Inspection</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">{summary.forInspection}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                <p className="text-red-600 text-xs font-medium">Not Received</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{summary.notReceived}</p>
              </div>
            </div>

            {/* Product Selection List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Expected Products</h2>
              <p className="text-sm text-gray-600 mb-4">Select products for inspection or mark as not received</p>
              
              <div className="space-y-3">
                {deliveryData.products.map((product, index) => (
                  <div key={product.id} className={`border rounded-lg p-4 ${
                    product.status === 'not_received' 
                      ? 'bg-red-50 border-red-200' 
                      : selectedProducts.includes(product.id)
                      ? 'bg-blue-50 border-blue-300'
                      : 'border-gray-200 bg-white'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          disabled={product.status === 'not_received'}
                          className="mt-1 mr-3 w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="text-gray-700">
                              <span className="font-medium">Expected:</span> {product.expectedQty} {product.unit}
                            </span>
                            <span className="text-gray-500">
                              <span className="font-medium">Price:</span> ₱{product.unitPrice?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          {product.status === 'not_received' && (
                            <div className="mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded inline-block">
                              Not Received: {product.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {product.status !== 'not_received' ? (
                        <button
                          onClick={() => handleNotReceivedClick(product.id)}
                          className="ml-3 text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors whitespace-nowrap"
                        >
                          Not Received
                        </button>
                      ) : (
                        <button
                          onClick={() => undoNotReceived(product.id)}
                          className="ml-3 text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors whitespace-nowrap"
                        >
                          ↶ Undo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Helper Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">💡 Next Steps:</p>
              <p>Select products to inspect or mark missing items as "Not Received"</p>
              <p className="mt-2 text-xs text-blue-600">💡 Tip: You can undo "Not Received" if it was marked by mistake</p>
            </div>
          </div>
        )}

        {/* STEP 2 - PHYSICAL INSPECTION */}
        {currentStep === 1 && currentProduct && (
          <div className="space-y-5 animate-fadeIn">
            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Product {currentProductIndex + 1} of {selectedProductsForInspection.length}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(((currentProductIndex + 1) / selectedProductsForInspection.length) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentProductIndex + 1) / selectedProductsForInspection.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Product Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentProduct.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">SKU: {currentProduct.sku}</p>
                </div>
                <div className="bg-blue-50 px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold text-blue-700">
                    Expected: {currentProduct.expectedQty} {currentProduct.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Photo Upload - REQUIRED */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Camera className="w-5 h-5 mr-2 text-orange-500" />
                Product Photo <span className="text-red-500 ml-1">*</span>
              </label>
              
              <div 
                onClick={() => !isPhotoUploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isPhotoUploading
                    ? 'border-blue-300 bg-blue-50 cursor-wait'
                    : errors.photo 
                    ? 'border-red-300 bg-red-50 hover:border-red-400' 
                    : currentProduct.photoPreview
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-orange-400'
                }`}
              >
                {isPhotoUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
                    <p className="font-medium text-blue-700">Processing photo...</p>
                    <p className="text-sm text-blue-600 mt-1">Please wait</p>
                  </>
                ) : currentProduct.photoPreview ? (
                  <div className="relative">
                    <img 
                      src={currentProduct.photoPreview} 
                      alt="Product preview" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductChange(currentProductIndex, 'photo', null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-sm text-green-700 mt-3 font-medium">✓ Photo uploaded. Tap to change</p>
                  </div>
                ) : (
                  <>
                    <Camera className={`w-12 h-12 mx-auto mb-3 ${errors.photo ? 'text-red-400' : 'text-gray-400'}`} />
                    <p className={`font-medium ${errors.photo ? 'text-red-700' : 'text-gray-900'}`}>
                      {errors.photo ? '⚠ Photo Required' : 'Tap to Take/Upload Photo'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Camera or Gallery • Supports iPhone HEIC/HEIF</p>
                  </>
                )}
              </div>
              <input
                key={`photo-input-${currentProduct?.id || currentProductIndex}`}
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif,.heics,.heifs"
                capture="environment"
                onChange={(e) => handlePhotoUpload(currentProductIndex, e)}
                className="hidden"
              />
            </div>

            {/* Quantity Inputs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quantity Count</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accepted Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentProduct.acceptedQty === 0 ? '' : currentProduct.acceptedQty}
                    onChange={(e) => handleProductChange(currentProductIndex, 'acceptedQty', e.target.value)}
                    className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">{currentProduct.unit}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejected/Damaged
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentProduct.rejectedQty === 0 ? '' : currentProduct.rejectedQty}
                    onChange={(e) => handleProductChange(currentProductIndex, 'rejectedQty', e.target.value)}
                    className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">{currentProduct.unit}</p>
                </div>
              </div>

              {/* Total and Variance Display */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 mb-1">Total Counted</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCounted}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 mb-1">Variance</p>
                  <p className={`text-2xl font-bold ${getVarianceColor(variance)}`}>
                    {variance > 0 ? '+' : ''}{variance}
                  </p>
                </div>
              </div>

              {/* Discrepancy Warnings */}
              {variance !== 0 && (
                <div className={`mt-4 p-3 rounded-lg ${
                  variance < 0 
                    ? 'bg-orange-50 border border-orange-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    variance < 0 ? 'text-orange-700' : 'text-red-700'
                  }`}>
                    {variance < 0 
                      ? `⚠ Discrepancy: ${Math.abs(variance)} units under expected` 
                      : `❌ Error: ${variance} units over expected`
                    }
                  </p>
                  {variance < 0 && (
                    <p className="text-xs text-orange-600 mt-1">Please verify count or mark remaining as damaged/rejected</p>
                  )}
                </div>
              )}
            </div>

            {/* Rejection Reason - Shows when rejected > 0 */}
            {(parseInt(currentProduct.rejectedQty) || 0) > 0 && (
              <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-5">
                <h3 className="text-sm font-semibold text-red-900 mb-3 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Rejection/Damage Details <span className="text-red-600 ml-1">*</span>
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">Damage Type</label>
                    <select
                      value={currentProduct.rejectionReason}
                      onChange={(e) => handleProductChange(currentProductIndex, 'rejectionReason', e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Select reason...</option>
                      <option value="Fully Damaged">Fully Damaged (All Units)</option>
                      <option value="Partially Damaged">Partially Damaged</option>
                      <option value="Wrong Item">Wrong Item Delivered</option>
                      <option value="Incomplete">Incomplete/Missing Parts</option>
                      <option value="Expired">Expired/Past Date</option>
                      <option value="Quality Failed">Quality Check Failed</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">Description</label>
                    <textarea
                      value={currentProduct.notes}
                      onChange={(e) => handleProductChange(currentProductIndex, 'notes', e.target.value)}
                      placeholder="Describe the damage (e.g., 5 bags wet due to rain, 3 rebars bent)"
                      rows="3"
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {(parseInt(currentProduct.rejectedQty) || 0) === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={currentProduct.notes}
                  onChange={(e) => handleProductChange(currentProductIndex, 'notes', e.target.value)}
                  placeholder="Any observations or comments about this product..."
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3 - DELIVERY INFORMATION */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" style={{ color: '#EC6923' }} />
                Delivery Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DR Number</label>
                  <input
                    type="text"
                    name="drNumber"
                    value={deliveryData.drNumber}
                    onChange={handleInputChange}
                    placeholder="DR-2025-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={deliveryData.invoiceNumber}
                    onChange={handleInputChange}
                    placeholder="INV-2025-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver's Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="driverName"
                    value={deliveryData.driverName}
                    onChange={handleInputChange}
                    placeholder="Enter driver's name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {errors.driverName && <p className="text-red-500 text-xs mt-1">{errors.driverName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="deliveryDate"
                      value={deliveryData.deliveryDate}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      name="deliveryTime"
                      value={deliveryData.deliveryTime}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {errors.deliveryDate && <p className="text-red-500 text-xs mt-1">{errors.deliveryDate}</p>}
                {errors.deliveryTime && <p className="text-red-500 text-xs mt-1">{errors.deliveryTime}</p>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="receivedBy"
                    value={deliveryData.receivedBy}
                    onChange={handleInputChange}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {errors.receivedBy && <p className="text-red-500 text-xs mt-1">{errors.receivedBy}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    name="projectSite"
                    value={deliveryData.projectSite}
                    onChange={handleInputChange}
                    placeholder="Any additional comments about the delivery..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 - SUMMARY */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-blue-600 text-sm font-medium">Total Expected</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{summary.totalExpected}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-green-600 text-sm font-medium">Accepted</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{summary.totalAccepted}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-red-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-700 mt-1">{summary.totalRejected}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-orange-600 text-sm font-medium">Total Received</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">{summary.totalReceived}</p>
              </div>
            </div>

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 text-lg">Process Complete</h3>
                  <p className="text-sm text-green-700 mt-1">
                    All products have been processed and documented. Ready for review or export.
                  </p>
                </div>
              </div>
            </div>

         

            {/* Product List Summary */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Product Summary</h3>
              <div className="space-y-3">
                {deliveryData.products.map((product, index) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                          <p className="text-sm text-gray-500 truncate" title={product.sku}>
                            SKU: {product.sku.length > 32 ? product.sku.slice(0, 32) + '...' : product.sku}
                          </p>
                      </div>
                      {product.photoPreview && (
                        <div className="flex-shrink-0">
                          <img 
                            src={product.photoPreview} 
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded border border-gray-200"
                          />
                        </div>  
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Expected</p>
                        <p className="font-semibold text-gray-900">{product.expectedQty} {product.unit}</p>
                      </div>
                      <div>
                        <p className="text-green-600 text-xs mb-1">Accepted</p>
                        <p className="font-semibold text-green-700">{product.acceptedQty} {product.unit}</p>
                      </div>
                      <div>
                        <p className="text-red-600 text-xs mb-1">Rejected</p>
                        <p className="font-semibold text-red-700">{product.rejectedQty} {product.unit}</p>
                      </div>
                    </div>

                    {product.status === 'not_received' && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 break-words">
                        <span className="font-medium">Not Received:</span> {product.rejectionReason}
                      </div>
                    )}

                    {product.rejectedQty > 0 && product.rejectionReason && product.status !== 'not_received' && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 break-words">
                        <span className="font-medium">Rejection Reason:</span> {product.rejectionReason}
                      </div>
                    )}

                    {product.notes && (
                      <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 break-words">
                        <span className="font-medium">Notes:</span> {product.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
               {/* Delivery Info Summary */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Delivery Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">PO Number:</span>
                  <span className="font-medium text-gray-900">{deliveryData.poNumber || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">DR Number:</span>
                  <span className="font-medium text-gray-900">{deliveryData.drNumber || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-medium text-gray-900">{deliveryData.invoiceNumber || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Driver's Name:</span>
                  <span className="font-medium text-gray-900">{deliveryData.driverName || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Delivery Date & Time:</span>
                  <span className="font-medium text-gray-900">{deliveryData.deliveryDate} {deliveryData.deliveryTime}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Received By:</span>
                  <span className="font-medium text-gray-900">{deliveryData.receivedBy || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Not Received Modal */}
      {showNotReceivedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Not Received</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason why this product was not received:</p>
            
            <textarea
              value={notReceivedReason}
              onChange={(e) => setNotReceivedReason(e.target.value)}
              placeholder="e.g., Out of stock, Wrong item sent, Delivery delayed..."
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm mb-4"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNotReceivedModal(false);
                  setNotReceivedReason('');
                  setNotReceivedProductId(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitNotReceived}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Removed vanilla CSS for bottom bar, all responsive behavior is now handled by Tailwind classes */}
    </div>

    {/* Bottom Action Bar */}
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-2xl mx-auto px-4 py-3">
        {currentStep < 3 ? (
          <div className="flex gap-3">
            {(currentStep > 0 || (currentStep === 1 && currentProductIndex > 0)) && (
              <button
                onClick={() => handleStepNavigation('back')}
                className="px-6 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                {currentStep === 1 && currentProductIndex > 0 ? 'Previous Product' : 'Back'}
              </button>
            )}
            <button
              onClick={() => handleStepNavigation('next')}
              className="flex-1 px-6 py-3 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              style={{ backgroundColor: '#EC6923' }}
            >
              {currentStep === 0 ? 'Start Inspection' : 
               currentStep === 1 ? (currentProductIndex < selectedProductsForInspection.length - 1 ? 'Next Product' : 'Continue to Info') :
               'Continue to Summary'}
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Print
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to start over?')) {
                  window.location.reload();
                }
              }}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 px-4 py-3 text-white font-medium rounded-lg transition-colors ${
                isSubmitting 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-orange-500 hover:bg-orange-600'
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
                'Submit Receipt'
              )}
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Error Modal */}
    <ErrorModal
      isOpen={errorModal.isOpen}
      onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
      title={errorModal.title}
      message={errorModal.message}
      type={errorModal.type}
      details={errorModal.details}
    />
    </>
  );
};

export default MobileReceive;
