import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  doc, 
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  runTransaction,
  collection,
  setDoc
} from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { 
  FiPackage, 
  FiCheckCircle, 
  FiClock, 
  FiUser, 
  FiCalendar,
  FiX,
  FiRefreshCw,
  FiAlertCircle
} from 'react-icons/fi';

const db = getFirestore(app);

const ReleaseMobileView = () => {
  const { currentUser } = useAuth();
  const [releaseId, setReleaseId] = useState(null);
  const [releaseData, setReleaseData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [products, setProducts] = useState([]);
  const [releaseDetails, setReleaseDetails] = useState({
    releasedBy: '',
    releasedDate: '',
    releasedTime: '',
    notes: ''
  });

  // Read releaseId from URL parameters
  useEffect(() => {


    const urlParams = new URLSearchParams(window.location.search);
    const releaseIdParam = urlParams.get('releaseId');

    if (releaseIdParam) {
      setReleaseId(releaseIdParam);
      setIsLoading(true);
      
      // Fetch release data from Firestore
      const fetchRelease = async () => {
        try {
          const releaseRef = doc(db, 'posTransactions', releaseIdParam);
          const releaseSnap = await getDoc(releaseRef);
          
          if (releaseSnap.exists()) {
            const data = releaseSnap.data();

            setReleaseData(data);
            
            // Initialize products from transaction items
            if (data.items && data.items.length > 0) {


              
              
              const mappedProducts = data.items.map((item, idx) => {

                
                
                const mapped = {
                  id: item.variantId || item.productId || `item-${idx}`,
                  name: item.variantName || item.productName || 'Unknown Product',
                  orderedQty: item.quantity || 0,
                  releasedQty: item.quantity || 0, // Default to ordered quantity
                  status: 'pending',
                  remarks: '',
                  condition: 'complete',
                  productId: item.productId, // This is the actual product document ID
                  variantId: item.variantId, // This is the variant ID within the product
                  variantName: item.variantName,
                  productName: item.productName,
                  storageLocation: item.storageLocation || '',
                  shelfName: item.shelfName || '',
                  rowName: item.rowName || '',
                  columnIndex: item.columnIndex,
                  category: item.category || '',
                  unitPrice: item.unitPrice || 0
                };
                
                
                return mapped;
              });


              

              setProducts(mappedProducts);
            }
          } else {
            console.error('Release not found');
            alert('Release not found');
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching release:', error);
          alert('Error loading release data: ' + error.message);
          setIsLoading(false);
        }
      };
      
      fetchRelease();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Set default release details
  useEffect(() => {
    if (currentUser) {
      const now = new Date();
      setReleaseDetails(prev => ({
        ...prev,
        releasedBy: currentUser.displayName || currentUser.email || 'Unknown User',
        releasedDate: now.toISOString().split('T')[0],
        releasedTime: now.toTimeString().split(' ')[0].substring(0, 5)
      }));
    }
  }, [currentUser]);

  const updateReleaseDetails = (field, value) => {
    setReleaseDetails(prev => ({ ...prev, [field]: value }));
  };

  const updateProduct = (productId, field, value) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, [field]: value } : p
    ));
  };

  // Function to find product in inventory
  const findProductInInventory = async (productId, variantId, variantName, storageLocation, shelfName, rowName, columnIndex, category) => {







    // Check if this is a quotation-based product (temporary ID)
    const isQuotationProduct = productId && productId.startsWith('quotation-');
    
    if (isQuotationProduct) {

    }
    
    try {
      // If we have the location information AND a real product ID, try direct lookup first
      if (!isQuotationProduct && storageLocation && shelfName && rowName && columnIndex !== undefined) {

        const productRef = doc(
          db, 
          'Products', 
          storageLocation, 
          'shelves', 
          shelfName, 
          'rows', 
          rowName, 
          'columns', 
          String(columnIndex), 
          'items', 
          productId
        );

        const productDoc = await getDoc(productRef);
        
        if (productDoc.exists()) {
          const productData = productDoc.data();

          

          if (productData.variants) {
            
            
          }

          // Extract the variant index from the full variant ID
          // Format: 'ABC-123-CODE1-Unit_04-PVC_PIP-1696-0' -> '0'
          let actualVariantKey = variantId;
          if (variantId && variantId.includes('-')) {
            const parts = variantId.split('-');
            actualVariantKey = parts[parts.length - 1]; // Get the last part (the index)

          }
          
          // If variantId is provided, look for that specific variant
          if (actualVariantKey && productData.variants && productData.variants[actualVariantKey]) {
            const variantData = productData.variants[actualVariantKey];
            
            return {
              productRef,
              variantId: actualVariantKey,
              currentQty: variantData.quantity || 0,
              location: {
                storageLocation,
                shelfName,
                rowName,
                columnIndex: parseInt(columnIndex)
              }
            };
          } else {
            console.warn(`⚠️ Variant '${actualVariantKey}' NOT found at known location`);
            console.warn(`Available variants:`, Object.keys(productData.variants || {}));
            
            // Try to find variant by name as fallback
            if (productData.variants) {
              const matchingVariantKey = Object.keys(productData.variants).find(vKey => {
                const variant = productData.variants[vKey];
                const matches = (
                  variant.name === variantName || 
                  variant.variantName === variantName ||
                  variant.name?.includes(variantName) ||
                  variantName?.includes(variant.name)
                );
                
                return matches;
              });
              
              if (matchingVariantKey) {
                const variantData = productData.variants[matchingVariantKey];
                
                return {
                  productRef,
                  variantId: matchingVariantKey,
                  currentQty: variantData.quantity || 0,
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
        } else {
          console.warn(`⚠️ Product document NOT found at known location`);
          console.warn(`Will proceed to search all locations...`);
        }
      } else {

      }
      
      // If direct lookup failed or no location info, search all locations
      
      const productsCollection = collection(db, 'Products');
      const storageSnapshot = await getDocs(productsCollection);

      for (const storageDoc of storageSnapshot.docs) {
        const currentStorageLocation = storageDoc.id;

        // Get all shelves in this storage location
        const shelvesCollection = collection(db, 'Products', currentStorageLocation, 'shelves');
        const shelvesSnapshot = await getDocs(shelvesCollection);

        for (const shelfDoc of shelvesSnapshot.docs) {
          const currentShelfName = shelfDoc.id;
          
          // Get all rows in this shelf
          const rowsCollection = collection(db, 'Products', currentStorageLocation, 'shelves', currentShelfName, 'rows');
          const rowsSnapshot = await getDocs(rowsCollection);
          
          for (const rowDoc of rowsSnapshot.docs) {
            const currentRowName = rowDoc.id;
            
            // Get all columns in this row
            const columnsCollection = collection(db, 'Products', currentStorageLocation, 'shelves', currentShelfName, 'rows', currentRowName, 'columns');
            const columnsSnapshot = await getDocs(columnsCollection);
            
            for (const columnDoc of columnsSnapshot.docs) {
              const currentColumnIndex = columnDoc.id;
              
              // Get all items in this column
              const itemsCollection = collection(db, 'Products', currentStorageLocation, 'shelves', currentShelfName, 'rows', currentRowName, 'columns', currentColumnIndex, 'items');
              const itemsSnapshot = await getDocs(itemsCollection);

              // Check each product in this column
              for (const itemDoc of itemsSnapshot.docs) {
                const productData = itemDoc.data();
                const currentProductId = itemDoc.id;




                if (productData.variants) {
                  
                  // Log first variant details for reference
                  const firstVariantKey = Object.keys(productData.variants)[0];
                  if (firstVariantKey) {
                    const firstVariant = productData.variants[firstVariantKey];

                  }
                }
                
                // For quotation products, match by name and category
                if (isQuotationProduct) {
                  // Check if product name matches (try both exact and partial matches)
                  const productBaseName = productData.name || productData.productName || '';
                  
                  // Normalize names for comparison (remove extra spaces, lowercase)
                  const normalizeStr = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');
                  const normalizedSearchName = normalizeStr(variantName);
                  const normalizedProductName = normalizeStr(productBaseName);
                  
                  // Try different matching strategies
                  const exactMatch = normalizedProductName === normalizedSearchName;
                  const containsMatch = normalizedProductName.includes(normalizedSearchName) || 
                                       normalizedSearchName.includes(normalizedProductName);
                  
                  // Extract key parts (e.g., "Cement Portland Type 1" from "Cement Portland Type 1 (40kg Bag)")
                  const extractMainName = (str) => {
                    const match = str.match(/^([^(]+)/); // Get everything before first parenthesis
                    return match ? match[1].trim() : str;
                  };
                  
                  const mainSearchName = normalizeStr(extractMainName(variantName));
                  const mainProductName = normalizeStr(extractMainName(productBaseName));
                  const mainNameMatch = mainSearchName === mainProductName || 
                                       mainProductName.includes(mainSearchName) ||
                                       mainSearchName.includes(mainProductName);
                  
                  const productNameMatches = exactMatch || containsMatch || mainNameMatch;


                  // Check if category matches
                  const categoryMatches = !category || productData.category === category;
                  
                  
                  
                  if (productNameMatches && categoryMatches) {

                    
                    
                    const productRef = doc(db, 'Products', currentStorageLocation, 'shelves', currentShelfName, 'rows', currentRowName, 'columns', currentColumnIndex, 'items', currentProductId);
                    
                    // If product has variants, find matching variant
                    if (productData.variants && Object.keys(productData.variants).length > 0) {

                      // Try to find variant by name
                      const matchingVariantKey = Object.keys(productData.variants).find(vKey => {
                        const variant = productData.variants[vKey];
                        const matches = (
                          variant.name === variantName || 
                          variant.variantName === variantName ||
                          variant.name?.includes(variantName) ||
                          variantName?.includes(variant.name)
                        );
                        
                        return matches;
                      });
                      
                      if (matchingVariantKey) {
                        const variantData = productData.variants[matchingVariantKey];
                        
                        return {
                          productRef,
                          variantId: matchingVariantKey,
                          currentQty: variantData.quantity || 0,
                          location: {
                            storageLocation: currentStorageLocation,
                            shelfName: currentShelfName,
                            rowName: currentRowName,
                            columnIndex: parseInt(currentColumnIndex)
                          }
                        };
                      } else {
                        console.warn(`Product found but no matching variant for: ${variantName}`);
                      }
                    } else {
                      // Product has no variants, return the product itself

                      return {
                        productRef,
                        variantId: null,
                        currentQty: productData.quantity || 0,
                        location: {
                          storageLocation: currentStorageLocation,
                          shelfName: currentShelfName,
                          rowName: currentRowName,
                          columnIndex: parseInt(currentColumnIndex)
                        }
                      };
                    }
                  }
                  continue; // Skip ID-based matching for quotation products
                }
                
                // For regular products, check by ID first
                if (currentProductId === productId) {

                  
                  

                  const productRef = doc(db, 'Products', currentStorageLocation, 'shelves', currentShelfName, 'rows', currentRowName, 'columns', currentColumnIndex, 'items', currentProductId);
                  
                  // Extract the variant index from the full variant ID
                  let actualVariantKey = variantId;
                  if (variantId && variantId.includes('-')) {
                    const parts = variantId.split('-');
                    actualVariantKey = parts[parts.length - 1];

                  }
                  
                  // If variantId is provided, look for that specific variant
                  if (actualVariantKey && productData.variants && productData.variants[actualVariantKey]) {
                    const variantData = productData.variants[actualVariantKey];
                    
                    return {
                      productRef,
                      variantId: actualVariantKey,
                      currentQty: variantData.quantity || 0,
                      location: {
                        storageLocation: currentStorageLocation,
                        shelfName: currentShelfName,
                        rowName: currentRowName,
                        columnIndex: parseInt(currentColumnIndex)
                      }
                    };
                  } else if (!actualVariantKey) {
                    // If no variantId, try to find variant by name matching
                    console.warn(`No variantId provided for ${variantName}. Checking if product has variants...`);
                    
                    if (productData.variants && Object.keys(productData.variants).length > 0) {
                      // Try to find variant by name matching
                      const matchingVariantId = Object.keys(productData.variants).find(vId => {
                        const variant = productData.variants[vId];
                        const matches = (
                          variant.name === variantName || 
                          variant.variantName === variantName ||
                          variant.name?.includes(variantName) ||
                          variantName?.includes(variant.name)
                        );
                        
                        return matches;
                      });
                      
                      if (matchingVariantId) {
                        const variantData = productData.variants[matchingVariantId];
                        
                        return {
                          productRef,
                          variantId: matchingVariantId,
                          currentQty: variantData.quantity || 0,
                          location: {
                            storageLocation: currentStorageLocation,
                            shelfName: currentShelfName,
                            rowName: currentRowName,
                            columnIndex: parseInt(currentColumnIndex)
                          }
                        };
                      }
                    }
                  } else {
                    console.error(`❌ Variant '${actualVariantKey}' not found. Available variants:`, Object.keys(productData.variants || {}));
                  }
                }
              }
            }
          }
        }
      }
      
      console.error(`\n❌ PRODUCT NOT FOUND IN ANY LOCATION`);
      console.error(`Search parameters:`);
      console.error(`  - Product Name: ${variantName}`);
      console.error(`  - Product ID: ${productId}`);
      console.error(`  - Variant ID: ${variantId}`);
      console.error(`  - Expected Location: ${storageLocation}/${shelfName}/${rowName}/${columnIndex}`);
      return null;
    } catch (error) {
      console.error(`Error searching for product ${variantName}:`, error);
      throw error;
    }
  };

  // Function to update inventory by deducting released items
  const updateInventoryQuantities = async (releasedProducts) => {
    try {

      for (const product of releasedProducts) {
        if (product.status !== 'released') {

          continue;
        }

        const releasedQty = Number(product.releasedQty);
        if (isNaN(releasedQty) || releasedQty <= 0) {

          continue;
        }


        // Find the product in inventory
        const inventoryLocation = await findProductInInventory(
          product.productId,
          product.variantId,
          product.name,
          product.storageLocation,
          product.shelfName,
          product.rowName,
          product.columnIndex,
          product.category
        );

        if (!inventoryLocation) {
          console.error(`Product ${product.name} not found in inventory`);
          throw new Error(`Product ${product.name} not found in inventory`);
        }

        // Deduct from inventory using transaction
        await runTransaction(db, async (transaction) => {
          const productDoc = await transaction.get(inventoryLocation.productRef);
          
          if (!productDoc.exists()) {
            throw new Error(`Product ${product.name} no longer exists`);
          }

          const productData = productDoc.data();
          
          // Handle products with variants
          if (inventoryLocation.variantId) {
            const variantData = productData.variants?.[inventoryLocation.variantId];

            if (!variantData) {
              throw new Error(`Variant not found for ${product.name}`);
            }

            const currentQty = Number(variantData.quantity) || 0;
            const newQty = currentQty - releasedQty;

            if (newQty < 0) {
              throw new Error(`Insufficient stock for ${product.name}. Available: ${currentQty}, Requested: ${releasedQty}`);
            }

            // Update the variant quantity
            const updatedVariants = {
              ...productData.variants,
              [inventoryLocation.variantId]: {
                ...variantData,
                quantity: newQty
              }
            };

            transaction.update(inventoryLocation.productRef, {
              variants: updatedVariants,
              updatedAt: serverTimestamp()
            });

            // Generate restock request if quantity is low
            if (newQty <= (variantData.reorderPoint || 10)) {

              const restockRequestRef = doc(collection(db, 'RestockingRequests'));
              transaction.set(restockRequestRef, {
                productId: product.productId,
                productName: product.name,
                variantId: inventoryLocation.variantId,
                variantName: product.variantName || product.name,
                currentQuantity: newQty,
                requestedQuantity: (variantData.reorderPoint || 10) * 2,
                storageLocation: inventoryLocation.location.storageLocation,
                shelfName: inventoryLocation.location.shelfName,
                rowName: inventoryLocation.location.rowName,
                columnIndex: inventoryLocation.location.columnIndex,
                category: product.category,
                status: 'pending',
                priority: newQty === 0 ? 'high' : 'medium',
                reason: `Stock depleted after release (Release ID: ${releaseId})`,
                requestedBy: currentUser?.uid || 'system',
                requestedByName: currentUser?.displayName || currentUser?.email || 'System',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            }
          } else {
            // Handle products without variants (main product quantity)
            const currentQty = Number(productData.quantity) || 0;
            const newQty = currentQty - releasedQty;

            if (newQty < 0) {
              throw new Error(`Insufficient stock for ${product.name}. Available: ${currentQty}, Requested: ${releasedQty}`);
            }

            

            transaction.update(inventoryLocation.productRef, {
              quantity: newQty,
              updatedAt: serverTimestamp()
            });

            // Generate restock request if quantity is low
            if (newQty <= (productData.reorderPoint || 10)) {

              const restockRequestRef = doc(collection(db, 'RestockingRequests'));
              transaction.set(restockRequestRef, {
                productId: product.productId,
                productName: product.name,
                variantId: null,
                variantName: product.name,
                currentQuantity: newQty,
                requestedQuantity: (productData.reorderPoint || 10) * 2,
                storageLocation: inventoryLocation.location.storageLocation,
                shelfName: inventoryLocation.location.shelfName,
                rowName: inventoryLocation.location.rowName,
                columnIndex: inventoryLocation.location.columnIndex,
                category: product.category,
                status: 'pending',
                priority: newQty === 0 ? 'high' : 'medium',
                reason: `Stock depleted after release (Release ID: ${releaseId})`,
                requestedBy: currentUser?.uid || 'system',
                requestedByName: currentUser?.displayName || currentUser?.email || 'System',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            }
          }
        });

      }

    } catch (error) {
      console.error('Error in inventory deduction:', error);
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setProcessingStep('Validating release details...');

      // Validate required fields
      if (!releaseDetails.releasedBy || !releaseDetails.releasedDate || !releaseDetails.releasedTime) {
        alert('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      // Validate at least one product is marked as released
      const releasedProducts = products.filter(p => p.status === 'released');
      if (releasedProducts.length === 0) {
        alert('Please mark at least one product as released');
        setIsSubmitting(false);
        return;
      }

      // Confirm before proceeding
      const confirmation = confirm(
        `Are you sure you want to release ${releasedProducts.length} item(s)?\n\n` +
        `This will deduct the quantities from inventory.`
      );

      if (!confirmation) {
        setIsSubmitting(false);
        return;
      }

      // Update inventory quantities (deduct released items)

      setProcessingStep('Updating inventory...');
      await updateInventoryQuantities(products);

      // Update the release transaction document

      setProcessingStep('Updating release status...');
      
      const releaseRef = doc(db, 'posTransactions', releaseId);
      await updateDoc(releaseRef, {
        releaseStatus: 'released',
        releasedAt: serverTimestamp(),
        releasedBy: currentUser?.uid || 'unknown',
        releasedByName: releaseDetails.releasedBy,
        releaseDetails: {
          releasedDate: releaseDetails.releasedDate,
          releasedTime: releaseDetails.releasedTime,
          releaseDateTime: new Date(`${releaseDetails.releasedDate}T${releaseDetails.releasedTime}`),
          notes: releaseDetails.notes || ''
        },
        releasedProducts: products.map(p => {
          // Create a clean object without undefined values
          const cleanProduct = {
            id: p.id,
            name: p.name,
            orderedQty: Number(p.orderedQty) || 0,
            releasedQty: Number(p.releasedQty) || 0,
            status: p.status || 'pending',
            condition: p.condition || 'complete',
            remarks: p.remarks || '',
            productId: p.productId,
            productName: p.productName || p.name,
            category: p.category || '',
            unitPrice: Number(p.unitPrice) || 0
          };
          
          // Only add optional fields if they have values
          if (p.variantId) cleanProduct.variantId = p.variantId;
          if (p.variantName) cleanProduct.variantName = p.variantName;
          if (p.storageLocation) cleanProduct.storageLocation = p.storageLocation;
          if (p.shelfName) cleanProduct.shelfName = p.shelfName;
          if (p.rowName) cleanProduct.rowName = p.rowName;
          if (p.columnIndex !== undefined && p.columnIndex !== null) cleanProduct.columnIndex = p.columnIndex;
          
          return cleanProduct;
        }),
        updatedAt: serverTimestamp()
      });

      // Create a release log entry for Stock Movement tracking

      setProcessingStep('Creating release log...');
      
      const releaseTimestamp = new Date(`${releaseDetails.releasedDate}T${releaseDetails.releasedTime}`);
      
      // Main release log
      const releaseLogRef = doc(collection(db, 'release_logs'));
      await setDoc(releaseLogRef, {
        releaseId: releaseId,
        transactionId: releaseData.transactionId || '',
        releasedBy: currentUser?.uid || 'unknown',
        releasedByName: releaseDetails.releasedBy,
        releaseDate: releaseTimestamp,
        products: products.filter(p => p.status === 'released').map(p => {
          const logProduct = {
            productId: p.productId || '',
            productName: p.name || '',
            quantity: Number(p.releasedQty) || 0,
            orderedQty: Number(p.orderedQty) || 0,
            condition: p.condition || 'complete',
            remarks: p.remarks || '',
            unitPrice: Number(p.unitPrice) || 0,
            totalValue: (Number(p.releasedQty) || 0) * (Number(p.unitPrice) || 0),
            category: p.category || ''
          };
          
          // Add optional fields only if they exist
          if (p.variantId) logProduct.variantId = p.variantId;
          if (p.variantName) logProduct.variantName = p.variantName;
          if (p.storageLocation) logProduct.storageLocation = p.storageLocation;
          if (p.shelfName) logProduct.shelf = p.shelfName;
          if (p.rowName) logProduct.row = p.rowName;
          if (p.columnIndex !== undefined && p.columnIndex !== null) logProduct.column = p.columnIndex;
          
          return logProduct;
        }),
        customerInfo: releaseData.customerInfo || {},
        cashier: releaseData.cashier || {},
        totalValue: releaseData.totals?.total || 0,
        totalItems: products.filter(p => p.status === 'released').reduce((sum, p) => sum + Number(p.releasedQty), 0),
        notes: releaseDetails.notes || '',
        releaseType: 'POS Sale',
        status: 'completed',
        createdAt: serverTimestamp()
      });

      // Create individual stock movement entries for each released product
      setProcessingStep('Recording stock movements...');
      const stockMovementPromises = products
        .filter(p => p.status === 'released' && Number(p.releasedQty) > 0)
        .map(async (product) => {
          const movementRef = doc(collection(db, 'stock_movements'));
          
          // Build movement object without undefined values
          const movementData = {
            // Movement Details
            movementType: 'OUT',
            reason: 'POS Sale',
            
            // Product Information
            productId: product.productId || '',
            productName: product.name || '',
            category: product.category || '',
            
            // Quantity & Value
            quantity: Number(product.releasedQty) || 0,
            unitPrice: Number(product.unitPrice) || 0,
            totalValue: (Number(product.releasedQty) || 0) * (Number(product.unitPrice) || 0),
            
            // Transaction References
            referenceType: 'pos_transaction',
            referenceId: releaseId,
            transactionId: releaseData.transactionId || '',
            releaseLogId: releaseLogRef.id,
            
            // Customer/Release Information
            customer: releaseData.customerInfo?.name || 'Walk-in Customer',
            customerPhone: releaseData.customerInfo?.phone || '',
            releasedBy: currentUser?.uid || 'unknown',
            releasedByName: releaseDetails.releasedBy,
            cashier: releaseData.cashier?.name || 'Unknown',
            
            // Condition & Status
            condition: product.condition || 'complete',
            remarks: product.remarks || '',
            status: 'completed',
            
            // Timestamps
            movementDate: releaseTimestamp,
            createdAt: serverTimestamp(),
            
            // Additional Context
            notes: releaseDetails.notes || ''
          };
          
          // Add optional location fields only if they exist
          if (product.variantId) movementData.variantId = product.variantId;
          if (product.variantName) movementData.variantName = product.variantName;
          if (product.storageLocation) movementData.storageLocation = product.storageLocation;
          if (product.shelfName) movementData.shelf = product.shelfName;
          if (product.rowName) movementData.row = product.rowName;
          if (product.columnIndex !== undefined && product.columnIndex !== null) movementData.column = product.columnIndex;
          
          return setDoc(movementRef, movementData);
        });

      await Promise.all(stockMovementPromises);


      setIsCompleted(true);
      setIsSubmitting(false);

    } catch (error) {
      console.error('Error processing release:', error);
      alert('Error processing release: ' + error.message);
      setIsSubmitting(false);
      setProcessingStep('');
    }
  };

  // Show completion page if release is completed
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FiCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Release Completed!</h1>
            <p className="text-gray-600 mt-2">Items have been successfully released</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Release Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-medium">{releaseData?.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Released By:</span>
                  <span className="font-medium">{releaseDetails.releasedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{releaseData?.customerInfo?.name || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Products Released:</span>
                  <span className="font-medium">{products.filter(p => p.status === 'released').length} of {products.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <FiPackage className="mr-2" />
                Inventory Updated
              </h3>
              <div className="space-y-1 text-sm">
                {products.filter(p => p.status === 'released').map((product, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600">{product.name}</span>
                    <span className="font-medium text-red-600">-{product.releasedQty}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">System Updates</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Transaction status updated to 'Released'
                </div>
                <div className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Inventory quantities deducted
                </div>
                <div className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Release transaction logged
                </div>
                <div className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Restock requests generated (if needed)
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setIsCompleted(false);
                setProducts([]);
                setReleaseData(null);
                setReleaseId(null);
                window.location.href = '/inventory';
              }}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Back to Inventory
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
          <h1 className="text-xl font-bold text-gray-800">Release Items</h1>
          <p className="text-sm text-gray-600">
            {releaseId ? `Transaction: ${releaseData?.transactionId || releaseId}` : 'Process item release'}
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-600">Loading release data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Release Details Form */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Release Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Released By <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={releaseDetails.releasedBy}
                      onChange={(e) => updateReleaseDetails('releasedBy', e.target.value)}
                      placeholder="Enter your name"
                      className="w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Release Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiCalendar className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="date"
                        value={releaseDetails.releasedDate}
                        onChange={(e) => updateReleaseDetails('releasedDate', e.target.value)}
                        className="w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Release Time <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiClock className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="time"
                        value={releaseDetails.releasedTime}
                        onChange={(e) => updateReleaseDetails('releasedTime', e.target.value)}
                        className="w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={releaseDetails.notes}
                    onChange={(e) => updateReleaseDetails('notes', e.target.value)}
                    placeholder="Add any notes about this release..."
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Products to Release ({products.length} items)
              </h3>

              {products.length === 0 ? (
                <div className="text-center py-8">
                  <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-600">No products found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-800">{product.name}</h4>
                        <span className="text-sm text-gray-500">Qty: {product.orderedQty}</span>
                      </div>

                      {/* Released Quantity Input */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Actual Released Quantity
                        </label>
                        <input
                          type="number"
                          value={product.releasedQty}
                          onChange={(e) => updateProduct(product.id, 'releasedQty', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="Enter released quantity"
                          min="0"
                          max={product.orderedQty}
                        />
                      </div>

                      {/* Condition Selection */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Condition
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['complete', 'partial', 'damaged'].map((condition) => (
                            <button
                              key={condition}
                              onClick={() => updateProduct(product.id, 'condition', condition)}
                              className={`p-2 rounded-lg text-sm font-medium ${
                                product.condition === condition
                                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                                  : 'bg-white text-gray-600 border-2 border-gray-200'
                              }`}
                            >
                              {condition.charAt(0).toUpperCase() + condition.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Remarks */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Remarks
                        </label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Release Status
                        </label>
                        <div className="flex space-x-2">
                          {[
                            { value: 'released', label: 'Released', icon: FiCheckCircle, color: 'green' },
                            { value: 'pending', label: 'Pending', icon: FiClock, color: 'yellow' },
                            { value: 'cancelled', label: 'Cancelled', icon: FiX, color: 'red' }
                          ].map(({ value, label, icon: Icon, color }) => (
                            <button
                              key={value}
                              onClick={() => updateProduct(product.id, 'status', value)}
                              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                                product.status === value
                                  ? `bg-${color}-100 text-${color}-700 border-2 border-${color}-300`
                                  : 'bg-white text-gray-600 border-2 border-gray-200'
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
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isSubmitting 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-green-600 text-white hover:bg-green-700'
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
            'Complete Release & Update Inventory'
          )}
        </button>
      </div>
    </div>
  );
};

export default ReleaseMobileView;
