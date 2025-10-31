import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Firebase and Services
import { useServices } from '../../../services/firebase/ProductServices';
import {
  getFirestore,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  addDoc,
  collection,
  setDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import app from  '../../../FirebaseConfig';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { AnalyticsService } from '../../../services/firebase/AnalyticsService';

// Import Components from new locations
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';
import ProductList from '../components/Cart';
import OrderSummary from '../components/OrderSummary';
import PaymentSection from '../components/PaymentSection';
import ProductFilters from '../components/ProductFilters';
import UnitConversionModal from '../components/UnitConversionModal';

// Import Modals from new locations
import VariantSelectionModal from '../components/Modals/VariantSelectionModal';
import QuickQuantityModal from '../components/QuickQuantityModal';
import ReceiptModal from '../components/Modals/ReceiptModal';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';

const db = getFirestore(app);

// Add this helper function near the top of the file, after imports
const formatCurrency = (number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

// Helper function to clean Firebase data (remove undefined values)
const cleanFirebaseData = (obj) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanFirebaseData(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

// Helper function to format Date/Time (can be moved to utils)
const getFormattedDateTime = () => {
    const now = new Date();
    
    const formattedDate = now.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).replace(/,/g, '').toUpperCase();

    // Format time parts separately for better control
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return {
        formattedDate,
        formattedTime: { hours, minutes, seconds }
    };
};

// Helper function to check if product needs restocking
const checkRestockingThreshold = (productData, variantIndex) => {
  const variant = productData.variants?.[variantIndex];
  if (!variant) return false;

  const currentQty = variant.quantity || 0;
  // Use ROP (restockLevel) and EOQ from product/variant if available, otherwise calculate
  let restockLevel = variant.restockLevel || productData.restockLevel;
  let eoq = variant.eoq || productData.eoq;
  const maximumStockLevel = variant.maximumStockLevel || productData.maximumStockLevel || 100;

  // If not present, calculate EOQ and ROP using the same logic as NewProductForm
  if (!restockLevel || !eoq) {
    const defaultDemand = 10;
    const purchaseCost = Number(variant.supplierPrice) || Number(variant.unitPrice) || Number(productData.supplierPrice) || Number(productData.unitPrice) || 1;
    const currentDate = new Date();
    const createdDate = new Date(productData.createdAt || variant.createdAt || Date.now());
    const holdingPeriodDays = Math.max(1, Math.ceil((currentDate - createdDate) / (1000 * 60 * 60 * 24)));
    const holdingCost = purchaseCost / holdingPeriodDays;
    eoq = Math.ceil(Math.sqrt(2 * defaultDemand * purchaseCost / holdingCost));
    const leadTime = (productData.suppliers?.[0]?.leadTime || variant.leadTime || 7);
    const avgDemand = defaultDemand;
    const safetyStockQty = Number(productData.safetyStock) || Number(variant.safetyStock) || 0;
    restockLevel = Math.ceil((avgDemand * leadTime) + safetyStockQty);
  }

  return {
    needsRestock: currentQty <= restockLevel,
    isLowStock: currentQty <= (restockLevel * 1.5),
    currentQuantity: currentQty,
    restockLevel,
    maximumStockLevel,
    eoq
  };
};

// Helper function to generate restocking notification
const generateRestockingNotification = async (restockingRequest, currentUser) => {
  try {
    if (!restockingRequest) return null;

    const notificationId = `NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification = {
      notificationId,
      type: 'restocking_request',
      priority: restockingRequest.priority,
      title: `${restockingRequest.priority === 'urgent' ? '🚨 URGENT' : '⚠️'} Restocking Required`,
      message: `${restockingRequest.productName} is ${restockingRequest.currentQuantity === 0 ? 'out of stock' : 'running low'} (${restockingRequest.currentQuantity} remaining)`,
      details: {
        productName: restockingRequest.productName,
        currentQuantity: restockingRequest.currentQuantity,
        restockLevel: restockingRequest.restockLevel,
        maximumStockLevel: restockingRequest.maximumStockLevel,
        suggestedOrderQuantity: restockingRequest.suggestedOrderQuantity,
        location: restockingRequest.location.fullPath,
        variantDetails: restockingRequest.variantDetails
      },
      targetRoles: ['InventoryManager', 'Admin'], // Who should see this notification
      triggeredBy: restockingRequest.triggeredByUser,
      triggeredByName: restockingRequest.triggeredByUserName,
      relatedRequestId: restockingRequest.requestId,
      isRead: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save to notifications collection
    await addDoc(collection(db, 'Notifications'), notification);

    return notification;
  } catch (error) {
    console.error('Error generating restocking notification:', error);
    return null;
  }
};

// Function to generate sale notification for inventory managers
const generateSaleNotification = async (transactionData, currentUser) => {
  try {
    if (!transactionData) return null;

    const notificationId = `NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate total items sold
    const totalItemsSold = transactionData.items.reduce((sum, item) => sum + item.quantity, 0);

    const notification = {
      notificationId,
      type: 'sale_completed',
      priority: 'normal',
      title: '💰 Sale Completed',
      message: `Sale ${transactionData.transactionId} completed - ${totalItemsSold} items sold for ₱${transactionData.total.toLocaleString()}`,
      details: {
        transactionId: transactionData.transactionId,
        customerName: transactionData.customerName,
        totalAmount: transactionData.total,
        totalItems: totalItemsSold,
        paymentMethod: transactionData.paymentMethod,
        items: transactionData.items.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          category: item.category
        })),
        saleDate: transactionData.saleDate,
        saleTime: transactionData.saleTime
      },
      targetRoles: ['InventoryManager', 'Admin'], // Who should see this notification
      triggeredBy: transactionData.createdBy,
      triggeredByName: transactionData.cashierName,
      relatedTransactionId: transactionData.transactionId,
      isRead: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save to notifications collection
    await addDoc(collection(db, 'Notifications'), notification);

    return notification;
  } catch (error) {
    console.error('Error generating sale notification:', error);
    return null;
  }
};

// Helper function to generate restocking request
const generateRestockingRequest = async (productData, variantIndex, locationInfo, currentUser) => {
  try {
    let variant = null;
    let isVariantRequest = true;

    // Check if this is a variant request or non-variant request
    if (variantIndex >= 0 && productData.variants?.[variantIndex]) {
      variant = productData.variants[variantIndex];
      isVariantRequest = true;
    } else {
      // Non-variant product
      isVariantRequest = false;
    }

    const restockCheck = checkRestockingThreshold(productData, variantIndex);

    if (!restockCheck.needsRestock) {
      return null;
    }

    const requestId = `RSR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Use EOQ as the suggested order quantity for restocking
    const suggestedOrderQuantity = restockCheck.eoq || Math.max(50, restockCheck.maximumStockLevel - restockCheck.currentQuantity);

    const restockingRequest = {
      requestId,
      productId: productData.id || 'unknown',
      productName: productData.name || 'Unknown Product',
      category: productData.category || 'Uncategorized',
      supplierId: productData.supplier?.code || '',
      supplierName: productData.supplier?.name || 'Unknown Supplier',
      variantIndex: isVariantRequest ? variantIndex : -1,
      variantDetails: isVariantRequest ? {
        size: variant.size || '',
        unit: variant.unit || 'pcs',
        unitPrice: variant.unitPrice || 0
      } : {
        size: 'N/A',
        unit: productData.unit || 'pcs',
        unitPrice: productData.unitPrice || 0
      },
      currentQuantity: restockCheck.currentQuantity,
      restockLevel: restockCheck.restockLevel,
      maximumStockLevel: restockCheck.maximumStockLevel,
      suggestedOrderQuantity,
      priority: restockCheck.currentQuantity === 0 ? 'urgent' : 'normal',
      location: {
        storageLocation: locationInfo.storageLocation,
        shelfName: locationInfo.shelfName,
        rowName: locationInfo.rowName,
        columnIndex: locationInfo.columnIndex,
        fullPath: `${locationInfo.storageLocation}/${locationInfo.shelfName}/${locationInfo.rowName}/${locationInfo.columnIndex}`
      },
      triggeredBy: 'pos_sale',
      triggeredByUser: currentUser?.uid || 'unknown',
      triggeredByUserName: currentUser?.displayName || currentUser?.email || 'Unknown User',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save to restocking requests collection
    await addDoc(collection(db, 'RestockingRequests'), restockingRequest);

    // Generate notification for restocking request
    await generateRestockingNotification(restockingRequest, currentUser);

    return restockingRequest;
  } catch (error) {
    console.error('Error generating restocking request:', error);
    return null;
  }
};

// Helper function to normalize variant IDs for comparison
const normalizeVariantId = (id) => {
  if (!id) return '';
  return String(id).toLowerCase().trim()
    .replace(/[-_]/g, '') // Remove separators
    .replace(/\s+/g, ''); // Remove spaces
};

// Function to find all locations where a product exists with available quantities
const findAllProductLocations = async (productId, variantId, variantName, fullLocation, storageLocation, size, unit, baseName) => {
  try {
    console.log('🔍 Searching for product locations:', {
      productId,
      variantId,
      variantName,
      size,
      unit,
      baseName
    });

    const allLocations = [];

    // Parse the generic variantId to extract components
    let baseProductId = productId;
    let searchSize = size;
    let searchUnit = unit;

    // If variantId is a generic ID (contains underscores), parse it
    // Format: {baseProductId}_{size}_{unit}
    // Need to split from the right since baseProductId can contain underscores
    if (variantId && variantId.includes('_')) {
      const parts = variantId.split('_');
      if (parts.length >= 3) {
        // Take the last two parts as unit and size, everything before as baseProductId
        searchUnit = parts[parts.length - 1] === 'pcs' ? 'pcs' : parts[parts.length - 1];
        searchSize = parts[parts.length - 2] === 'default' ? '' : parts[parts.length - 2];
        baseProductId = parts.slice(0, -2).join('_');
      }
    }

    console.log('📊 Parsed search criteria:', {
      baseProductId,
      searchSize,
      searchUnit
    });

    // Search all storage units for matching products
    const productsRef = collection(db, 'Products');
    const storageUnitsSnapshot = await getDocs(productsRef);

    console.log(`🏭 Found ${storageUnitsSnapshot.docs.length} storage units`);

    for (const storageUnitDoc of storageUnitsSnapshot.docs) {
      const unitId = storageUnitDoc.id;

      // Skip non-storage unit documents
      if (!unitId.startsWith('Unit ')) continue;

      console.log(`🔎 Searching in unit: ${unitId}`);

      try {
        // Search products subcollection in this unit
        const unitProductsRef = collection(db, 'Products', unitId, 'products');
        const productsSnapshot = await getDocs(unitProductsRef);

        console.log(`📦 Found ${productsSnapshot.docs.length} products in ${unitId}`);

        for (const productDoc of productsSnapshot.docs) {
          const productData = productDoc.data();

          console.log(`🔍 Checking product:`, {
            id: productData.id,
            name: productData.name,
            size: productData.size,
            unit: productData.unit,
            quantity: productData.quantity,
            shelfName: productData.shelfName,
            rowName: productData.rowName,
            columnIndex: productData.columnIndex
          });

          // Check if this matches our base product - try multiple matching strategies
          const matchesBaseProduct =
            productData.id === baseProductId ||
            productData.productId === baseProductId ||
            productData.parentProductId === baseProductId ||
            (productData.name && baseName && productData.name.toLowerCase() === baseName.toLowerCase());

          console.log(`✅ Base product match: ${matchesBaseProduct}`, {
            productDataId: productData.id,
            productDataProductId: productData.productId,
            productDataParentId: productData.parentProductId,
            productDataName: productData.name,
            baseProductId,
            baseName
          });

          if (!matchesBaseProduct) continue;

          // Check if this product has variants
          const variantsArray = productData.variants || productData.Variants || productData.productVariants || [];
          const hasVariants = Array.isArray(variantsArray) && variantsArray.length > 0;
          const isVariantDocument = productData.isVariant === true;

          console.log(`📋 Product structure:`, {
            hasVariants,
            isVariantDocument,
            variantsCount: variantsArray.length
          });

          if (isVariantDocument) {
            // This is a separate variant document - check if it matches our criteria
            const variantSize = productData.size || productData.variantName || '';
            const variantUnit = productData.unit || 'pcs';

            const sizeMatches = !searchSize || variantSize === searchSize;
            const unitMatches = !searchUnit || variantUnit === searchUnit;

            console.log(`🎯 Variant document match:`, {
              variantSize,
              variantUnit,
              sizeMatches,
              unitMatches,
              searchSize,
              searchUnit
            });

            if (sizeMatches && unitMatches) {
              const availableQty = Number(productData.quantity) || 0;

              console.log(`✅ Adding variant document location: ${unitId}/${productData.shelfName}/${productData.rowName}/${productData.columnIndex} - ${availableQty} units`);

              allLocations.push({
                productRef: productDoc.ref,
                currentQty: availableQty,
                variantIndex: -1,
                variant: productData,
                location: {
                  storageLocation: unitId,
                  shelfName: productData.shelfName,
                  rowName: productData.rowName,
                  columnIndex: productData.columnIndex
                },
                productData,
                outOfStock: availableQty === 0,
                isVariant: true
              });
            }
          } else if (hasVariants) {
            // Base product with nested variants - find matching variant
            console.log('🔍 Searching for matching variant in nested variants array');

            const matchingVariantIndex = variantsArray.findIndex(v => {
              const variantSize = v.size || v.variantName || '';
              const variantUnit = v.unit || 'pcs';

              const sizeMatches = !searchSize || variantSize === searchSize;
              const unitMatches = !searchUnit || variantUnit === searchUnit;

              console.log(`   Checking variant ${variantsArray.indexOf(v)}:`, {
                variantSize,
                variantUnit,
                sizeMatches,
                unitMatches
              });

              return sizeMatches && unitMatches;
            });

            console.log(`📍 Matching variant index: ${matchingVariantIndex}`);

            if (matchingVariantIndex !== -1) {
              const variant = variantsArray[matchingVariantIndex];
              const availableQty = Number(variant.quantity) || 0;

              console.log(`✅ Adding nested variant location: ${unitId}/${productData.shelfName}/${productData.rowName}/${productData.columnIndex} - ${availableQty} units`);

              if (availableQty > 0) {
                allLocations.push({
                  productRef: productDoc.ref,
                  currentQty: availableQty,
                  variantIndex: matchingVariantIndex,
                  variant,
                  location: {
                    storageLocation: unitId,
                    shelfName: productData.shelfName,
                    rowName: productData.rowName,
                    columnIndex: productData.columnIndex
                  },
                  productData
                });
              }
            }
          } else {
            // Non-variant product
            const productSize = productData.size || productData.variantName || '';
            const productUnit = productData.unit || 'pcs';

            const sizeMatches = !searchSize || productSize === searchSize;
            const unitMatches = !searchUnit || productUnit === searchUnit;

            console.log(`🎯 Non-variant product match:`, {
              productSize,
              productUnit,
              sizeMatches,
              unitMatches
            });

            if (sizeMatches && unitMatches) {
              const availableQty = Number(productData.quantity) || 0;

              console.log(`✅ Adding non-variant location: ${unitId}/${productData.shelfName}/${productData.rowName}/${productData.columnIndex} - ${availableQty} units`);

              allLocations.push({
                productRef: productDoc.ref,
                currentQty: availableQty,
                variantIndex: -1,
                variant: null,
                location: {
                  storageLocation: unitId,
                  shelfName: productData.shelfName,
                  rowName: productData.rowName,
                  columnIndex: productData.columnIndex
                },
                productData,
                outOfStock: availableQty === 0
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Error searching in unit ${unitId}:`, error);
        continue;
      }
    }

    console.log(`🎉 Found ${allLocations.length} total locations:`, allLocations.map(loc => ({
      location: `${loc.location.storageLocation}/${loc.location.shelfName}/${loc.location.rowName}/${loc.location.columnIndex}`,
      quantity: loc.currentQty
    })));

    return allLocations;
  } catch (error) {
    console.error(`Error finding all locations for product ${variantName}:`, error);
    throw error;
  }
};

// Function to update inventory by deducting released items
const updateInventoryQuantities = async (releasedProducts, currentUser) => {
  try {
    for (const product of releasedProducts) {
      if (product.status !== 'released') {
        continue;
      }

      const releasedQty = Number(product.releasedQty);
      if (isNaN(releasedQty) || releasedQty <= 0) {
        continue;
      }

      // Find all locations where this product exists
      const allLocations = await findAllProductLocations(
        product.productId,
        product.variantId,
        product.name,
        product.fullLocation,
        product.storageLocation,
        product.size,
        product.unit,
        product.baseName
      );

      if (allLocations.length === 0) {
        console.error(`❌ Product ${product.name} not found in any inventory location`);
        throw new Error(
          `Product Not Found: ${product.name}\n\n` +
          `This product could not be located in any inventory location.\n` +
          `Please check if the product exists in the inventory system.`
        );
      }

      // Check if product is out of stock at all locations
      const allOutOfStock = allLocations.every(loc => loc.currentQty === 0);

      if (allOutOfStock) {
        const locationDetails = allLocations.map(loc =>
          `${loc.location.storageLocation}/${loc.location.shelfName}/${loc.location.rowName}/${loc.location.columnIndex}`
        ).join('\n   ');

        // Check if this is a quotation product
        const isQuotationProduct = product.productId && product.productId.startsWith('quotation-');

        if (isQuotationProduct) {
          console.warn(`⚠️ WARNING: Quotation product ${product.name} is out of stock. Proceeding with note.`);
        } else {
          throw new Error(
            `❌ OUT OF STOCK: ${product.name}\n\n` +
            `This product is currently unavailable at all locations:\n   ${locationDetails}\n\n` +
            `Current Quantity: 0 units\n` +
            `Requested: ${releasedQty} units\n\n` +
            `Action Required:\n` +
            `1. Restock this product in inventory\n` +
            `2. Or reduce the release quantity\n` +
            `3. Or remove this item from the release`
          );
        }
      }

      // Sort locations by available quantity (descending) to prioritize locations with more stock
      allLocations.sort((a, b) => b.currentQty - a.currentQty);

      // Calculate total available quantity across all locations
      const totalAvailable = allLocations.reduce((sum, loc) => sum + loc.currentQty, 0);

      if (totalAvailable < releasedQty) {
        // For quotation products, allow negative inventory with warning
        const isQuotationProduct = product.productId && product.productId.startsWith('quotation-');
        if (isQuotationProduct) {
          console.warn(`⚠️ WARNING: Allowing release with insufficient stock for quotation product ${product.name}. Available: ${totalAvailable}, Requested: ${releasedQty}. Inventory will go negative.`);
        } else {
          const locationDetails = allLocations
            .filter(loc => loc.currentQty > 0)
            .map(loc => `   • ${loc.location.storageLocation}: ${loc.currentQty} units`)
            .join('\n');

          throw new Error(
            `❌ INSUFFICIENT STOCK: ${product.name}\n\n` +
            `Available: ${totalAvailable} units\n` +
            `Requested: ${releasedQty} units\n` +
            `Shortage: ${releasedQty - totalAvailable} units\n\n` +
            `Available at:\n${locationDetails}\n\n` +
            `Please:\n` +
            `1. Add more stock to inventory (${releasedQty - totalAvailable} more units needed)\n` +
            `2. Or reduce release quantity to ${totalAvailable} units`
          );
        }
      }

      // Deduct from multiple locations as needed using optimized batch operations
      let remainingQty = releasedQty;
      const deductionDetails = [];
      let currentBatch = writeBatch(db); // Use batch write instead of individual transactions
      let batchOperations = 0;
      const maxBatchSize = 400; // Firestore batch limit is 500, keep some buffer

      for (const location of allLocations) {
        if (remainingQty <= 0) break;

        const deductQty = Math.min(remainingQty, location.currentQty);

        // Use batch write for better performance and quota management
        try {
          // Get current document data first (outside transaction for batch efficiency)
          const docSnap = await getDoc(location.productRef);

          if (!docSnap.exists()) {
            throw new Error(`Product ${product.name} no longer exists at ${location.location.storageLocation}`);
          }

          const productData = docSnap.data();

          // Check if this is a variant document (separate document) or base product with nested variants
          const isVariantDocument = productData.isVariant === true;

          if (isVariantDocument) {
            // VARIANT DOCUMENT: Update the variant document directly
            const currentQty = Number(productData.quantity) || 0;
            const newQty = currentQty - deductQty;

            // Validate that we're not going negative (unless it's a quotation product)
            const isQuotationProduct = product.productId && product.productId.startsWith('quotation-');
            if (newQty < 0 && !isQuotationProduct) {
              throw new Error(`Insufficient stock for variant ${productData.variantName || productData.size || product.name}. Available: ${currentQty}, Requested: ${deductQty}`);
            }

            // Add to batch: Update variant document quantity
            currentBatch.update(location.productRef, {
              quantity: Math.max(0, newQty), // Ensure we don't go below 0
              lastUpdated: serverTimestamp()
            });
            batchOperations++;

            // Check for low stock on variant
            const restockLevel = productData.restockLevel || productData.maximumStockLevel || 10;
            if (newQty <= restockLevel) {
              // Generate restock request using the centralized function with variant data
              await generateRestockingRequest(productData, -1, location.location, currentUser);
            }
          } else {
            // BASE PRODUCT: Check if this product has nested variants (legacy structure)
            const hasVariants = productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0;

            if (hasVariants && location.variantIndex >= 0) {
              // LEGACY: Product has nested variants - update the specific variant's quantity
              const variants = [...productData.variants];
              const variant = variants[location.variantIndex];
              const currentQty = Number(variant.quantity) || 0;
              const newQty = currentQty - deductQty;

              // Validate that we're not going negative (unless it's a quotation product)
              const isQuotationProduct = product.productId && product.productId.startsWith('quotation-');
              if (newQty < 0 && !isQuotationProduct) {
                throw new Error(`Insufficient stock for variant ${variant.size || variant.name}. Available: ${currentQty}, Requested: ${deductQty}`);
              }

              // Update the variant quantity
              variants[location.variantIndex] = {
                ...variant,
                quantity: Math.max(0, newQty) // Ensure we don't go below 0
              };

              // Add to batch: Update the product document with modified variants
              currentBatch.update(location.productRef, {
                variants: variants,
                lastUpdated: serverTimestamp()
              });
              batchOperations++;

              // Check for low stock on variant
              const restockLevel = variant.restockLevel || productData.restockLevel || productData.reorderPoint || 10;
              if (newQty <= restockLevel) {
                // Generate restock request using the centralized function with updated product data
                const updatedProductData = { ...productData, variants };
                await generateRestockingRequest(updatedProductData, location.variantIndex, location.location, currentUser);
              }
            } else {
              // BASE PRODUCT: Non-variant product - update base product quantity
              const currentQty = Number(productData.quantity) || 0;
              const newQty = currentQty - deductQty;

              // Validate that we're not going negative (unless it's a quotation product)
              const isQuotationProduct = product.productId && product.productId.startsWith('quotation-');
              if (newQty < 0 && !isQuotationProduct) {
                throw new Error(`Insufficient stock for ${product.name}. Available: ${currentQty}, Requested: ${deductQty}`);
              }

              // Add to batch: Update product quantity
              currentBatch.update(location.productRef, {
                quantity: Math.max(0, newQty), // Ensure we don't go below 0
                lastUpdated: serverTimestamp()
              });
              batchOperations++;

              // Generate restock request if quantity is low
              const restockLevel = productData.restockLevel || productData.reorderPoint || 10;
              if (newQty <= restockLevel) {
                // Generate restock request using the centralized function with updated product data
                const updatedProductData = { ...productData, quantity: newQty };
                await generateRestockingRequest(updatedProductData, -1, location.location, currentUser);
              }
            }
          }

          deductionDetails.push({
            location: location.location,
            deductedQty: deductQty,
            remainingAtLocation: location.currentQty - deductQty
          });

          remainingQty -= deductQty;

          // Commit batch if it reaches the limit or this is the last location
          if (batchOperations >= maxBatchSize || location === allLocations[allLocations.length - 1]) {
            console.log(`🔄 Committing batch with ${batchOperations} operations for ${product.name}`);
            await currentBatch.commit();
            console.log(`✅ Batch committed successfully for ${product.name}`);

            // Reset batch for next set of operations
            currentBatch = writeBatch(db);
            batchOperations = 0;
          }

        } catch (locationError) {
          console.error(`❌ Error processing location ${location.location.storageLocation} for ${product.name}:`, locationError);
          throw new Error(`Failed to update inventory at ${location.location.storageLocation}: ${locationError.message}`);
        }
      }

      // Ensure any remaining batch operations are committed
      if (batchOperations > 0) {
        console.log(`🔄 Committing final batch with ${batchOperations} operations for ${product.name}`);
        await currentBatch.commit();
        console.log(`✅ Final batch committed successfully for ${product.name}`);
      }

      console.log(`✅ Successfully updated inventory for ${product.name}:`, deductionDetails);
    }
  } catch (error) {
    console.error('❌ Error in inventory deduction:', error);
    throw new Error(`Failed to update inventory: ${error.message}`);
  }
};


export default function Pos_NewSale() {
  // --- User Authentication ---
  const { currentUser, loading: authLoading } = useAuth();

  // Redirect to login if not authenticated and auth state is loaded
  useEffect(() => {
    if (!authLoading && !currentUser) {
      // User is not authenticated, redirect to login
      window.location.href = '/auth/login';
    }
  }, [currentUser, authLoading]);

  // Show loading screen while authentication is being determined
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!currentUser) {
    return null;
  }

  // --- State Management ---

  const [currentDateTime, setCurrentDateTime] = useState(() => getFormattedDateTime());
  const [addedProducts, setAddedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [restockingAlerts, setRestockingAlerts] = useState([]); // Track restocking alerts

  // Product State
  const { listenToProducts } = useServices();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Variant Modal State
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Customer State
  const [customerDetails, setCustomerDetails] = useState({ 
    name: 'Walk-in Customer', 
    phone: '', 
    address: '',
    email: '' 
  });
  const [customerDisplayName, setCustomerDisplayName] = useState('Walk-in Customer');

  // Quotation Lookup State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [loadingQuotation, setLoadingQuotation] = useState(false);

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Add this memoized value to get unique categories:
  const categories = useMemo(() => {
    return [...new Set(products.map(product => product.category))].sort();
  }, [products]);

  // Add new state for unit conversion modal
  const [unitConversionModalOpen, setUnitConversionModalOpen] = useState(false);
  const [selectedProductForUnitModal, setSelectedProductForUnitModal] = useState(null);

  // Add new state for quick quantity modal
  const [quickQuantityModalOpen, setQuickQuantityModalOpen] = useState(false);
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState(null);

  // Add state for receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState(null);

  // Function to load quotation from Firebase
  const handleLoadQuotation = async () => {
    if (!quotationNumber.trim()) {
      alert('Please enter a quotation number');
      return;
    }

    setLoadingQuotation(true);
    try {
      const quotationRef = doc(db, 'quotations', quotationNumber.trim());
      const quotationSnap = await getDoc(quotationRef);

      if (!quotationSnap.exists()) {
        alert(`Quotation ${quotationNumber} not found`);
        setLoadingQuotation(false);
        return;
      }

      const quotationData = quotationSnap.data();

      // Load customer information
      if (quotationData.customer) {
        setCustomerDetails({
          name: quotationData.customer.name || 'Walk-in Customer',
          phone: quotationData.customer.phone || '',
          address: quotationData.customer.address || '',
          email: quotationData.customer.email || '',
          company: quotationData.customer.company || '',
          projectName: quotationData.customer.projectName || ''
        });
        setCustomerDisplayName(quotationData.customer.name || 'Walk-in Customer');
      }

      // Load products from quotation
      if (quotationData.items && Array.isArray(quotationData.items)) {
        const loadedProducts = [];
        
        for (const item of quotationData.items) {
           // Debug log
          
          // Extract price and quantity - handle both old format (price/qty) and new format (unitPrice/quantity)
          const itemPrice = Number(item.unitPrice || item.price || 0);
          const itemQty = Number(item.quantity || item.qty || 1);
          const itemName = item.description || item.name || 'Unknown Product';
          
          // Try to find the product in the current products list
          const productMatch = products.find(p => 
            p.name.toLowerCase() === itemName.toLowerCase()
          );

          if (productMatch) {
            // Add to cart with quotation details
            loadedProducts.push({
              id: productMatch.id || `temp-${Date.now()}-${Math.random()}`,
              name: itemName,
              baseName: productMatch.name,
              price: itemPrice,
              qty: itemQty,
              category: item.category || productMatch.category,
              unit: item.unit || 'pcs',
              variantDetails: item.variantDetails || {},
              fromQuotation: quotationNumber.trim(),
              originalProductId: productMatch.id, // Store original product ID for inventory tracking
              actualProductId: item.variantId || productMatch.id, // Store actual Firestore document ID
              // Include location information from quotation
              storageLocation: item.storageLocation || '',
              shelfName: item.shelfName || '',
              rowName: item.rowName || '',
              columnIndex: item.columnIndex || '',
              fullLocation: item.fullLocation || '',
              variantId: item.variantId || productMatch.id,
              baseProductId: item.baseProductId || productMatch.id
            });
          } else {
            // Product not found in inventory, still add it for reference
            console.warn(`Product "${itemName}" not found in current inventory`);
            loadedProducts.push({
              id: `quotation-${Date.now()}-${Math.random()}`,
              name: itemName,
              baseName: itemName,
              price: itemPrice,
              qty: itemQty,
              category: item.category || 'Other',
              unit: item.unit || 'pcs',
              variantDetails: item.variantDetails || {},
              fromQuotation: quotationNumber.trim(),
              notInInventory: true, // Flag for products not in current inventory
              // Include location information from quotation even if product not found
              storageLocation: item.storageLocation || '',
              shelfName: item.shelfName || '',
              rowName: item.rowName || '',
              columnIndex: item.columnIndex || '',
              fullLocation: item.fullLocation || '',
              variantId: item.variantId || '',
              baseProductId: item.baseProductId || ''
            });
          }
        }

         // Debug log
        setAddedProducts(loadedProducts);
        alert(`Quotation ${quotationNumber} loaded successfully!\n${loadedProducts.length} items added to cart.`);
      } else {
        alert('No items found in this quotation');
      }

      // Update quotation status to 'processing' or 'converted'
      await setDoc(quotationRef, {
        ...quotationData,
        status: 'processing',
        convertedToInvoice: true,
        convertedAt: serverTimestamp(),
        convertedBy: currentUser?.uid || 'unknown',
        lastUpdated: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error('Error loading quotation:', error);
      alert('Failed to load quotation. Please try again.');
    } finally {
      setLoadingQuotation(false);
    }
  };

  // Helper function to check if a product variant is low on stock
  const isLowStock = useCallback((productGroup) => {
    if (!productGroup.variants || productGroup.variants.length === 0) return false;
    
    return productGroup.variants.some(variant => {
      const currentQty = variant.quantity || 0;
      const restockLevel = variant.restockLevel || 10; // Default restock level
      return currentQty <= (restockLevel * 1.5); // Alert when 50% above restock level
    });
  }, []);

  const isOutOfStock = useCallback((productGroup) => {
    if (!productGroup.variants || productGroup.variants.length === 0) return true;
    
    return productGroup.variants.every(variant => {
      const currentQty = variant.quantity || 0;
      const restockLevel = variant.restockLevel || 10;
      return currentQty <= restockLevel; // Consider out of stock when at or below restock level
    });
  }, []);

  const getCartItemQuantity = useCallback((productId, variantId) => {
    const cartItem = addedProducts.find(item => 
      item.baseProductId === productId && item.variantId === variantId
    );
    return cartItem ? cartItem.qty : 0;
  }, [addedProducts]);

  // Walk-in customers have default name
  // No need for transaction type logic as this is invoice-only page

  // Add clock update effect
  useEffect(() => {
    const updateClock = () => {
        const time = getFormattedDateTime();
        setCurrentDateTime(time);
    };
    
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Data Fetching and Processing ---

  // Validation function
  const validateProductQuantities = useCallback((currentProducts, updatedProducts) => {
    let productsNeedUpdate = false;
    
    const updatedProductsList = currentProducts.map(item => {
        const product = updatedProducts.find(p => p.id === item.baseProductId);
        if (!product) return item;

        // Safe check for variants array
        if (!product.variants || !Array.isArray(product.variants)) return item;

        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) return item;

        if (variant.quantity < item.qty) {
            productsNeedUpdate = true;
            return {
                ...item,
                qty: variant.quantity,
                invalidQuantity: true
            };
        }
        return item;
    });

    if (productsNeedUpdate) {
        setAddedProducts(updatedProductsList);
        alert("Some products have been updated due to inventory changes.");
    }
  }, []);

  // Fetch Products
  useEffect(() => {
    setLoadingProducts(true);
    const unsubscribe = listenToProducts((fetchedProducts) => {
        setProducts(prevProducts => {
            const addedProductIds = addedProducts.map(item => item.baseProductId);
            
            // Check if any added products are affected by the update
            const updatedItems = fetchedProducts.filter(p => 
                addedProductIds.includes(p.id));
            
            // Validate quantities against new stock levels
            if (updatedItems.length > 0) {
                validateProductQuantities(addedProducts, updatedItems);
            }
            
            return fetchedProducts;
        });
        setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [addedProducts]); // Updated dependency

  // Group Products (Memoized)
  // Group products by base identity (name + brand + specs)
  // Then consolidate variants by size/unit (combining different locations)
  const groupedProducts = useMemo(() => {
    const grouped = {};

    products.forEach(product => {
      if (!product || !product.id || !product.name) {
        console.warn("Skipping invalid product data:", product);
        return;
      }

      // Group by base identity (name, brand, specifications, category)
      const groupKey = `${product.name || 'unknown'}_${product.brand || 'generic'}_${product.specifications || ''}_${product.category || ''}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          id: product.id, // Use first product's id for cart logic
          name: product.name, // Name should be the same for all products in the group
          category: product.category,
          brand: product.brand || 'Generic',
          quantity: 0,
          variants: [],
          image: product.image || product.imageUrl || null,
          hasVariants: false,
          allLocations: [] // Store all location instances
        };
      }
      
      // Add this product instance to allLocations
      grouped[groupKey].allLocations.push({
        variantId: product.id,
        baseProductId: product.parentProductId || product.id,
        category: product.category,
        brand: product.brand || 'Generic',
        size: product.size || product.variantName || '',
        unit: product.unit || 'pcs',
        price: Number(product.unitPrice) || 0,
        quantity: Number(product.quantity) || 0,
        image: product.image || product.imageUrl || null,
        storageLocation: product.storageLocation,
        shelfName: product.shelfName,
        rowName: product.rowName,
        columnIndex: product.columnIndex,
        fullLocation: product.fullLocation,
        isVariant: product.isVariant || false
      });
      
      // Add to total quantity
      grouped[groupKey].quantity += Number(product.quantity) || 0;
    });

    // Now consolidate by variant (size/unit) - combining different locations
    Object.values(grouped).forEach(group => {
      const variantMap = {};
      
      // Ensure allLocations exists and is an array
      if (!group.allLocations || !Array.isArray(group.allLocations)) {
        console.warn('Group missing allLocations:', group);
        group.allLocations = [];
      }
      
      group.allLocations.forEach(location => {
        // Create key by size and unit to group same variants from different locations
        const variantKey = `${location.size || ''}_${location.unit || 'pcs'}`;
        
        if (!variantMap[variantKey]) {
          variantMap[variantKey] = {
            ...location,
            totalQuantity: location.quantity,
            locationCount: 1
          };
        } else {
          // Same variant exists in another location - just add to quantity count
          variantMap[variantKey].totalQuantity += location.quantity;
          variantMap[variantKey].locationCount += 1;
        }
      });
      
      group.variants = Object.values(variantMap);
      
      // Determine if product has actual variants (different sizes/units)
      group.hasVariants = group.variants.length > 1;
    });

    return Object.values(grouped);
  }, [products]);  // Filter Products (Memoized)
  const filteredProducts = useMemo(() => {
    let filtered = groupedProducts;
    
    // First filter by category if one is selected
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);

    }
    
    // Then filter by brand if one is selected
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);

    }
    
    // Then apply search query if exists
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query)
      );

    }
    
    return filtered;
  }, [groupedProducts, selectedCategory, selectedBrand, searchQuery]);

  // --- Product Management Logic ---
  const addProduct = useCallback((prodToAdd) => {
    if (!prodToAdd?.variantId || !prodToAdd?.baseProductId) {
        console.error("Invalid product data:", prodToAdd);
        return;
    }

    const quantity = Number(prodToAdd.qty);
    if (isNaN(quantity) || quantity <= 0) {
        alert("Please enter a valid quantity");
        return;
    }

    setAddedProducts(currentProducts => {
        const existingItem = currentProducts.find(item => item.variantId === prodToAdd.variantId);
        
        if (existingItem) {
            return currentProducts.map(item => 
                item.variantId === prodToAdd.variantId 
                    ? { ...item, qty: item.qty + quantity }
                    : item
            );
        }

        return [...currentProducts, {
            ...prodToAdd,
            qty: quantity,
            price: Number(prodToAdd.price)
        }];
    });
  }, []);

  const handleRemoveProduct = useCallback((indexToRemove) => {
    setAddedProducts(currentProducts => currentProducts.filter((_, i) => i !== indexToRemove));
  }, []);

  const handleUpdateCartQuantity = useCallback((itemIndex, newQuantity) => {
    setAddedProducts(currentProducts => {
      const updatedProducts = [...currentProducts];
      const item = updatedProducts[itemIndex];
      
      // Find the product in the products array to check stock
      const product = products.find(p => p.id === item.baseProductId);
      if (!product) {
        alert('Product not found');
        return currentProducts;
      }

      // Find the variant
      const variantIndex = parseInt(item.variantId.split('-').pop(), 10);
      const variant = product.variants[variantIndex];
      
      if (!variant) {
        alert('Product variant not found');
        return currentProducts;
      }

      // Validate new quantity
      if (newQuantity <= 0) {
        // If quantity is 0 or negative, remove the item
        return currentProducts.filter((_, index) => index !== itemIndex);
      }

      if (newQuantity > variant.quantity) {
        alert(`Cannot set quantity to ${newQuantity}. Only ${variant.quantity} available in stock.`);
        return currentProducts;
      }

      // Update the quantity
      updatedProducts[itemIndex] = {
        ...item,
        qty: newQuantity
      };

      return updatedProducts;
    });
  }, [products]);

  // --- Product Selection Logic ---
  const handleAddProduct = useCallback((productGroup) => {
    if (!productGroup || !productGroup.variants || isProcessing) {
        console.warn("Add product blocked:", { productGroup, isProcessing });
        return;
    }

    // If product has variants (different sizes/units), show variant selection
    if (productGroup.hasVariants && productGroup.variants.length > 1) {
        setQuantity(1);
        setSelectedProductForModal(productGroup);
        setActiveVariantIndex(0);
        setVariantModalOpen(true);
    } 
    // If only one variant, proceed directly to quick add
    else if (productGroup.variants.length === 1) {
        const variant = productGroup.variants[0];
        
        // Check if this variant exists in multiple locations
        const variantLocations = productGroup.allLocations?.filter(loc => 
          loc.size === variant.size && loc.unit === variant.unit
        ) || [];
        
        // Always show quick quantity modal - inventory deduction will handle multiple locations automatically
        const cartQty = getCartItemQuantity(productGroup.id, variant.variantId);
        const availableQty = (variant.totalQuantity || variant.quantity) - cartQty;

        if (availableQty <= 0) {
            alert(`Maximum quantity already in cart for ${productGroup.name}`);
            return;
        }

        setSelectedProductForQuantity({
            ...productGroup,
            maxAvailableQty: availableQty
        });
        setQuickQuantityModalOpen(true);
    } else {
        console.error('Unexpected state - no variants found');
    }
  }, [isProcessing, getCartItemQuantity]);

  const handleAddVariant = useCallback(() => {
    if (!selectedProductForModal?.variants?.[activeVariantIndex]) {
        console.error("Invalid variant selection");
        setVariantModalOpen(false);
        return;
    }

    const variant = selectedProductForModal.variants[activeVariantIndex];
    
    // Check if this variant exists in multiple locations
    const variantLocations = selectedProductForModal.allLocations.filter(loc => 
      loc.size === variant.size && loc.unit === variant.unit
    );
    
    // Close variant modal first
    setVariantModalOpen(false);
    
    // Always add directly - inventory deduction will handle multiple locations automatically
    // Use the first location for cart display, but create a generic variantId for multi-location deduction
    const locationVariant = variantLocations[0];
    const cartQty = getCartItemQuantity(selectedProductForModal.id, `${selectedProductForModal.id}_${variant.size || 'default'}_${variant.unit || 'pcs'}`);
    const totalAvailableInAllLocations = variantLocations.reduce((sum, loc) => sum + loc.quantity, 0);

    if (cartQty + quantity > totalAvailableInAllLocations) {
        alert(`Cannot add ${quantity} items. Only ${totalAvailableInAllLocations - cartQty} available across all locations.`);
        setVariantModalOpen(true); // Reopen modal
        return;
    }

    const displayName = locationVariant.size || locationVariant.unit 
        ? `${selectedProductForModal.name} (${locationVariant.size || ''} ${locationVariant.unit || ''})`.trim()
        : selectedProductForModal.name;

    // Create a generic variant identifier that can match across multiple locations
    const genericVariantId = `${selectedProductForModal.id}_${variant.size || 'default'}_${variant.unit || 'pcs'}`;

    addProduct({
        id: genericVariantId,
        name: displayName,
        baseName: selectedProductForModal.name,
        price: locationVariant.price,
        qty: quantity,
        variantId: genericVariantId, // Use generic ID for cart matching
        actualProductId: locationVariant.variantId, // Store actual Firestore document ID
        category: selectedProductForModal.category,
        baseProductId: selectedProductForModal.id, // Use the grouped product ID
        storageLocation: locationVariant.storageLocation, // Keep one location for reference
        shelfName: locationVariant.shelfName,
        rowName: locationVariant.rowName,
        columnIndex: locationVariant.columnIndex,
        fullLocation: locationVariant.fullLocation,
        // Add variant details for matching across locations
        size: variant.size,
        unit: variant.unit
    });

    setSelectedProductForModal(null);
    setActiveVariantIndex(0);
    setQuantity(1);
  }, [selectedProductForModal, activeVariantIndex, quantity, addProduct, getCartItemQuantity]);

  // --- Sale Reset Logic ---
  const resetSaleState = useCallback(() => {
       setAddedProducts([]); // This line clears the cart
       setAmountPaid('');
       setPaymentMethod('Cash');
       setPaymentReference('');
       setCustomerDetails({ name: '', phone: '', address: '', email: '' });
       setCustomerDisplayName('Walk-in Customer');
       setSearchQuery('');
       setQuantity(1);
       setSelectedProductForModal(null);
       setVariantModalOpen(false);
       setActiveVariantIndex(0);
       setRestockingAlerts([]); // Clear restocking alerts
  }, []);

  // --- Calculations ---
  // Calculate totals using useMemo based on added products
  const { subTotal, tax, total } = useMemo(() => {
    const totalCalc = addedProducts.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const subTotalCalc = totalCalc / 1.12; // Net of VAT
    const taxCalc = totalCalc - subTotalCalc; // VAT amount
    
    return { 
      subTotal: subTotalCalc, 
      tax: taxCalc, 
      total: totalCalc 
    };
  }, [addedProducts]); // Updated dependency

  // Enhanced analytics data collection
  const collectAnalyticsData = useCallback((transactionData) => {
    try {
      const analyticsData = {
        transactionId: transactionData.transactionId,
        timestamp: new Date(),
        totalAmount: transactionData.totalAmount,
        itemCount: transactionData.items.length,
        paymentMethod: transactionData.paymentMethod,
        items: transactionData.items.map(item => ({
          productId: item.baseProductId || item.id,
          variantId: item.variantId || item.id,
          productName: item.baseName || item.name,
          variantName: item.name,
          quantity: item.qty,
          unitPrice: item.price,
          totalPrice: item.price * item.qty,
          category: item.category
        })),
        salesPerformance: {
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          month: new Date().getMonth()
        }
      };

      // Send to analytics service
      AnalyticsService.recordSale(analyticsData);

    } catch (error) {
      console.error('Error collecting analytics:', error);
    }
  }, []);

  // --- Transaction Logic ---
  const validateStockBeforeTransaction = async () => {
    const invalidItems = [];

    for (const item of addedProducts) {
        try {
            // Find all locations where this product exists with available quantities
            const allLocations = await findAllProductLocations(
              item.baseProductId || item.id,
              item.variantId || item.id,
              item.name,
              item.fullLocation,
              item.storageLocation,
              item.size,
              item.unit,
              item.baseName
            );

            if (allLocations.length === 0) {
                invalidItems.push(`${item.name} - Product not found in any inventory location`);
                continue;
            }

            // Calculate total available quantity across all locations
            const totalAvailable = allLocations.reduce((sum, loc) => sum + loc.currentQty, 0);

            if (totalAvailable < item.qty) {
                const locationDetails = allLocations.map(loc =>
                  `${loc.location.storageLocation}/${loc.location.shelfName}/${loc.location.rowName}/${loc.location.columnIndex}: ${loc.currentQty} available`
                ).join('\n   ');

                invalidItems.push(
                  `${item.name} - Insufficient stock across all locations\n` +
                  `   Total Available: ${totalAvailable}, Needed: ${item.qty}\n` +
                  `   Location breakdown:\n   ${locationDetails}`
                );
            }
        } catch (error) {
            console.error('Error validating stock for', item.name, error);
            invalidItems.push(`${item.name} - Error checking stock availability`);
        }
    }

    if (invalidItems.length > 0) {
        throw new Error(`Cannot process transaction:\n${invalidItems.join('\n')}`);
    }
};

  const handlePrintAndSave = useCallback(async () => {
    validateStockBeforeTransaction().catch(error => {
        alert(error.message);
        return;
    });
    setIsProcessing(true);

    try {
        const { formattedDate, formattedTime } = getFormattedDateTime();
        const receiptNumber = `GS-${Date.now()}`;

        // Calculate change
        const paidAmount = Number(amountPaid) || 0;
        const changeAmount = paidAmount > 0 ? paidAmount - total : 0;

        const transactionData = {
          transactionId: receiptNumber,
          customerId: `CUST-${Date.now()}`,
          customerInfo: cleanFirebaseData(customerDetails),
          customerName: customerDetails?.name || customerDisplayName || 'Walk-in Customer',
          items: addedProducts.map(item => cleanFirebaseData({
            productId: item.baseProductId || item.id,
            variantId: item.variantId || item.id,
            productName: item.baseName || item.name,
            variantName: item.name,
            name: item.name, // For receipt modal
            quantity: item.qty,
            price: item.price, // For receipt modal
            unitPrice: item.price,
            unit: item.unit || 'Piece',
            totalPrice: item.price * item.qty,
            category: item.category,
            storageLocation: item.storageLocation,
            shelfName: item.shelfName,
            rowName: item.rowName,
            columnIndex: item.columnIndex,
            fullLocation: item.fullLocation
          })),
          subTotal: subTotal,
          tax: tax,
          total: total,
          amountPaid: paidAmount,
          change: changeAmount,
          paymentMethod,
          paymentReference: paymentReference || null,
          status: 'completed',
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || 'unknown',
          saleDate: formattedDate,
          saleTime: formattedTime,
          cashierName: currentUser?.name  || currentUser?.email || "Cashier",
        };

        // Prepare products for inventory deduction
        const productsForDeduction = addedProducts.map(item => ({
          id: item.variantId || item.id,
          name: item.name,
          productId: item.baseProductId || item.id,
          variantId: item.variantId || item.id,
          variantName: item.name,
          storageLocation: item.storageLocation,
          fullLocation: item.fullLocation,
          releasedQty: item.qty,
          status: 'released', // Mark as released for immediate deduction
          // Add variant matching data for multi-location deduction
          size: item.size,
          unit: item.unit,
          baseName: item.baseName
        }));

        // Deduct inventory immediately
        try {
          await updateInventoryQuantities(productsForDeduction, currentUser);
        } catch (inventoryError) {
          console.error('Inventory deduction failed:', inventoryError);
          alert(`Transaction failed: ${inventoryError.message}`);
          setIsProcessing(false);
          return;
        }

        // Save transaction to Firestore
        const transactionRef = doc(db, 'posTransactions', receiptNumber);
        await setDoc(transactionRef, transactionData);

        // Create stock movement records for the sale
        try {
          const stockMovementPromises = addedProducts.map(async (item) => {
            const movementRef = doc(collection(db, 'stock_movements'));
            
            const movementData = {
              movementType: 'OUT',
              reason: 'POS Sale',
              productId: item.baseProductId || item.id,
              productName: item.baseName || item.name,
              variantId: item.variantId || item.id,
              variantName: item.name,
              category: item.category,
              quantity: item.qty,
              unitPrice: item.price,
              totalValue: item.price * item.qty,
              referenceType: 'pos_transaction',
              referenceId: receiptNumber,
              transactionId: receiptNumber,
              customer: customerDetails?.name || customerDisplayName || 'Walk-in Customer',
              customerPhone: customerDetails?.phone || '',
              cashier: currentUser?.name || currentUser?.email || 'Unknown',
              remarks: '',
              status: 'completed',
              movementDate: serverTimestamp(),
              createdAt: serverTimestamp(),
              storageLocation: item.storageLocation,
              shelfName: item.shelfName,
              rowName: item.rowName,
              columnIndex: item.columnIndex
            };
            
            return setDoc(movementRef, movementData);
          });

          await Promise.all(stockMovementPromises);
        } catch (movementError) {
          console.error('Error creating stock movements:', movementError);
          // Don't fail the transaction if stock movement logging fails
        }

        // Generate sale notification for inventory manager
        try {
          await generateSaleNotification(transactionData, currentUser); 
        } catch (notificationError) {
          console.error('Failed to generate sale notification:', notificationError);
          // Don't fail the transaction if notification fails
        }

        // Collect analytics
        collectAnalyticsData({
          transactionId: receiptNumber,
          totalAmount: total,
          itemCount: addedProducts.length,
          items: addedProducts,
          paymentMethod
        });

        // Create/update daily analytics records
        try {
          await AnalyticsService.checkAndCreateDailyRecords();
        } catch (analyticsError) {
          console.error('Error updating analytics records:', analyticsError);
          // Don't fail transaction if analytics fails
        }

        // Generate and print receipt
        try {
          // Show receipt modal for preview before printing
          setReceiptTransaction(transactionData);
          setShowReceiptModal(true);
        } catch (printError) {
          console.error('Error preparing receipt:', printError);
          alert('Receipt preparation failed, but transaction was completed successfully!');
        }

        // Clear cart and reset states
        resetSaleState();
        alert('Transaction completed successfully! Inventory updated.');

    } catch (error) {
        console.error("Transaction failed:", error);
        alert(error.message);
    } finally {
        setIsProcessing(false);
    }
  }, [addedProducts, products, total, subTotal, tax, amountPaid, paymentMethod, customerDetails, customerDisplayName, resetSaleState, currentUser, collectAnalyticsData]);

  // --- UI ---
  const shouldDisableInteractions = isProcessing;

  return (
    <div className="  flex h-screen bg-gray-50">
      
      {/* Left Side: Product Selection */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200">  
        <DashboardHeader />
        {/* Header with Search and Filters */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  disabled={shouldDisableInteractions}
                  placeholder="Search products by name, category, or brand..."
                  className="bg-white shadow-sm border-gray-200"
                />
              </div>
              {/* Filters */}
              <div className="flex-1">
                <ProductFilters
                  products={products}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedBrand={selectedBrand}
                  setSelectedBrand={setSelectedBrand}
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <ProductGrid
              products={filteredProducts}
              onProductSelect={handleAddProduct}
              loading={loadingProducts}
              disabled={shouldDisableInteractions}
            />
          </div>
        </div>
      </div>

      {/* Right Side: Cart and Checkout */}
      <div className="w-[480px] flex flex-col bg-white shadow-lg">
        {/* Header Section */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
          <div className="p-4 space-y-4">
            {/* Quotation Lookup */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Load from Quotation</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value.toUpperCase())}
                  placeholder="GS-20251006-XXXX"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingQuotation || isProcessing}
                  onKeyPress={(e) => e.key === 'Enter' && handleLoadQuotation()}
                />
                <button
                  onClick={handleLoadQuotation}
                  disabled={loadingQuotation || isProcessing || !quotationNumber.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingQuotation ? '...' : 'Load'}
                </button>
              </div>
              {addedProducts.some(p => p.fromQuotation) && (
                <div className="mt-2 text-sm text-blue-700">
                  📄 <span className="font-semibold">{addedProducts[0].fromQuotation}</span>
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Customer:</span>
                <span className="text-sm text-gray-800 font-medium">{customerDisplayName || 'Walk-in Customer'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Date:</span>
                <span className="text-sm text-gray-800">
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cart Items - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Cart Items</h3>
              <span className="text-sm text-gray-500">
                {addedProducts.length} {addedProducts.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {addedProducts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-base font-medium">Your cart is empty</p>
                <p className="text-sm mt-1">Select products from the left to get started</p>
              </div>
            ) : (
              <ProductList
                cartItems={addedProducts.map((item, index) => ({
                    ...item,
                    originalIndex: index,
                    formattedPrice: formatCurrency(item.price),
                    formattedTotal: formatCurrency(item.price * item.qty)
                }))}
                onRemoveItem={handleRemoveProduct}
                onUpdateQuantity={handleUpdateCartQuantity}
                isProcessing={isProcessing}
              />
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50">
          <OrderSummary
            subTotal={subTotal}
            tax={tax}
            total={total}
            itemCount={addedProducts.length}
          />
        </div>

        {/* Payment Section */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          <PaymentSection
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            amountPaid={amountPaid}
            setAmountPaid={setAmountPaid}
            paymentReference={paymentReference}
            setPaymentReference={setPaymentReference}
            total={total}
            formattedTotal={formatCurrency(total)}
            formattedChange={formatCurrency(Number(amountPaid) - total)}
            onPrintAndSave={handlePrintAndSave}
            onClearCart={resetSaleState}
            isProcessing={isProcessing}
            disabled={shouldDisableInteractions || addedProducts.length === 0}
            hasProducts={addedProducts.length > 0}
            checkoutButtonText="Complete Sale"
          />
        </div>
      </div>

      {/* Modals */}
      <div className="relative z-50">
        {variantModalOpen && selectedProductForModal && (
          <VariantSelectionModal
            product={selectedProductForModal}
            activeVariantIndex={activeVariantIndex}
            setActiveVariantIndex={setActiveVariantIndex}
            qty={quantity}
            setQty={setQuantity}
            onAddVariant={handleAddVariant}
            onClose={() => {
              setVariantModalOpen(false);
              setSelectedProductForModal(null);
              setActiveVariantIndex(0);
              setQuantity(1);
            }}
          />
        )}

        {unitConversionModalOpen && selectedProductForUnitModal && (
          <UnitConversionModal
            product={selectedProductForUnitModal}
            isOpen={unitConversionModalOpen}
            onClose={() => {
              setUnitConversionModalOpen(false);
              setSelectedProductForUnitModal(null);
            }}
            onAddToCart={(productWithUnit) => {
              addProduct({
                id: productWithUnit.variantId,
                name: `${productWithUnit.name} (${productWithUnit.unit})`,
                baseName: productWithUnit.name,
                price: productWithUnit.price,
                qty: productWithUnit.qty,
                unit: productWithUnit.unit,
                variantId: productWithUnit.variantId,
                actualProductId: productWithUnit.variantId, // Store actual Firestore document ID
                baseProductId: productWithUnit.baseProductId,
                category: productWithUnit.category,
                // Add location fields from variant
                storageLocation: productWithUnit.storageLocation,
                shelfName: productWithUnit.shelfName,
                rowName: productWithUnit.rowName,
                columnIndex: productWithUnit.columnIndex,
                fullLocation: productWithUnit.fullLocation
              });
              setUnitConversionModalOpen(false);
              setSelectedProductForUnitModal(null);
            }}
          />
        )}

        {quickQuantityModalOpen && selectedProductForQuantity && (
          <QuickQuantityModal
            product={selectedProductForQuantity}
            maxQuantity={selectedProductForQuantity.maxAvailableQty || selectedProductForQuantity.variants[0].totalQuantity}
            onClose={() => {
              setQuickQuantityModalOpen(false);
              setSelectedProductForQuantity(null);
            }}
            onAdd={(quantity) => {
              const variant = selectedProductForQuantity.variants[0];
              
              // Always add directly - inventory deduction will handle multiple locations automatically
              const variantLocations = selectedProductForQuantity.allLocations?.filter(loc => 
                loc.size === variant.size && loc.unit === variant.unit
              ) || [];
              
              const locationVariant = variantLocations[0] || variant; // Use first location for cart display
              const cartQty = getCartItemQuantity(selectedProductForQuantity.id, `${selectedProductForQuantity.id}_${variant.size || 'default'}_${variant.unit || 'pcs'}`);
              const totalAvailableInAllLocations = variantLocations.reduce((sum, loc) => sum + loc.quantity, 0);
              
              if (cartQty + quantity > totalAvailableInAllLocations) {
                alert(`Cannot add ${quantity} items. Only ${totalAvailableInAllLocations - cartQty} available across all locations.`);
                return;
              }

              const displayName = locationVariant.size || locationVariant.unit 
                ? `${selectedProductForQuantity.name} (${locationVariant.size || ''} ${locationVariant.unit || ''})`.trim()
                : selectedProductForQuantity.name;

              // Create a generic variant identifier that can match across multiple locations
              const genericVariantId = `${selectedProductForQuantity.id}_${variant.size || 'default'}_${variant.unit || 'pcs'}`;

              addProduct({
                id: genericVariantId,
                name: displayName,
                baseName: selectedProductForQuantity.name,
                price: locationVariant.price,
                qty: quantity,
                variantId: genericVariantId, // Use generic ID for cart matching
                actualProductId: locationVariant.variantId, // Store actual Firestore document ID
                unit: locationVariant.unit,
                category: selectedProductForQuantity.category,
                baseProductId: selectedProductForQuantity.id, // Use the grouped product ID
                storageLocation: locationVariant.storageLocation,
                shelfName: locationVariant.shelfName,
                rowName: locationVariant.rowName,
                columnIndex: locationVariant.columnIndex,
                fullLocation: locationVariant.fullLocation,
                // Add variant details for matching across locations
                size: variant.size
              });
              
              setQuickQuantityModalOpen(false);
              setSelectedProductForQuantity(null);
            }}
          />
        )}

        {showReceiptModal && receiptTransaction && (
          <ReceiptModal
            transaction={receiptTransaction}
            onClose={() => {
              setShowReceiptModal(false);
              setReceiptTransaction(null);
              resetSaleState();
            }}
          />
        )}
      </div>
    </div>
  );
} // End Pos_NewSale component
