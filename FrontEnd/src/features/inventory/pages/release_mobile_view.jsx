import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  runTransaction,
  collection,
  setDoc,
  addDoc
} from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { uploadImage } from '../../../services/cloudinary/CloudinaryService';
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

// Helper function to format currency
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

// Helper function to check if product needs restocking
const checkRestockingThreshold = (productData, variantIndex) => {
  let currentQty, restockLevel, maximumStockLevel;

  if (variantIndex >= 0 && productData.variants?.[variantIndex]) {
    // Variant product
    const variant = productData.variants[variantIndex];
    currentQty = variant.quantity || 0;
    restockLevel = variant.restockLevel || productData.restockLevel || 10;
    maximumStockLevel = variant.maximumStockLevel || productData.maximumStockLevel || 100;
  } else {
    // Non-variant product
    currentQty = productData.quantity || 0;
    restockLevel = productData.restockLevel || productData.reorderPoint || 10;
    maximumStockLevel = productData.maximumStockLevel || productData.restockLevel * 2 || 100;
  }

  const needsRestock = currentQty <= restockLevel;
  const isLowStock = currentQty <= (restockLevel * 1.5);


  return {
    needsRestock,
    isLowStock,
    currentQuantity: currentQty,
    restockLevel,
    maximumStockLevel
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
      suggestedOrderQuantity: Math.max(50, restockCheck.maximumStockLevel - restockCheck.currentQuantity), // Suggest ordering to reach max level
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

// Function to find product in inventory using fullLocation for quick lookup
const findProductInInventory = async (productId, variantId, variantName, storageLocation, shelfName, rowName, columnIndex, category, fullLocation) => {
  try {
    // Check if this is a quotation-based product (temporary ID)
    const isQuotationProduct = productId && productId.startsWith('quotation-');

    // If we have fullLocation, use it for direct lookup
    if (fullLocation && !isQuotationProduct) {

      // Parse fullLocation - it might be in format "Unit 01/Shelf A/Row 1/Column 1"
      // or "Steel & Heavy Materials - Angle Irons & L-Beams - Row 1 - Column 1"
      let unitId = '';

      if (fullLocation.includes('/')) {
        // Format: "Unit 01/Shelf A/Row 1/Column 1"
        const locationParts = fullLocation.split('/');
        unitId = locationParts[0];
      } else if (fullLocation.includes(' - ')) {
        // Format: "Steel & Heavy Materials - Angle Irons & L-Beams - Row 1 - Column 1"
        // Try to extract unit from the beginning
        const parts = fullLocation.split(' - ');
        if (parts[0].includes('Unit')) {
          unitId = parts[0];
        } else {
          // Map category names to unit IDs
          const categoryToUnit = {
            'Steel & Heavy Materials': 'Unit 01',
            'Construction Materials': 'Unit 02',
            'Tools & Equipment': 'Unit 03',
            'Steel': 'Unit 01',
            'Heavy Materials': 'Unit 01',
            'Construction': 'Unit 02',
            'Tools': 'Unit 03'
          };
          unitId = categoryToUnit[parts[0]] || 'Unit 01'; // Default to Unit 01
        }
      }

      if (unitId) {

        // Try direct lookup using the productId
        const productRef = doc(db, 'Products', unitId, 'products', productId);
        const productDoc = await getDoc(productRef);

        if (productDoc.exists()) {
          const productData = productDoc.data();

          return {
            productRef,
            currentQty: productData.quantity || 0,
            location: {
              storageLocation: productData.storageLocation || unitId,
              shelfName: productData.shelfName,
              rowName: productData.rowName,
              columnIndex: productData.columnIndex
            }
          };
        }
      }
    }

    // Fallback to location-based lookup
    if (storageLocation && !isQuotationProduct) {

      const productRef = doc(db, 'Products', storageLocation, 'products', productId);
      const productDoc = await getDoc(productRef);

      if (productDoc.exists()) {
        const productData = productDoc.data();

        return {
          productRef,
          currentQty: productData.quantity || 0,
          location: {
            storageLocation: productData.storageLocation,
            shelfName: productData.shelfName,
            rowName: productData.rowName,
            columnIndex: productData.columnIndex
          }
        };
      }
    }

    // For quotation products or when we don't have location info, search all storage units
    if (isQuotationProduct || !storageLocation) {

      const productsRef = collection(db, 'Products');
      const storageUnitsSnapshot = await getDocs(productsRef);

      for (const storageUnitDoc of storageUnitsSnapshot.docs) {
        const unitId = storageUnitDoc.id;

        // Skip non-storage unit documents
        if (!unitId.startsWith('Unit ')) continue;

        // Search products subcollection in this unit
        const productsSubcollectionRef = collection(db, 'Products', unitId, 'products');
        const productsSnapshot = await getDocs(productsSubcollectionRef);

        for (const productDoc of productsSnapshot.docs) {
          const productData = productDoc.data();
          const currentProductId = productDoc.id;

          // For quotation products, match by name and category
          if (isQuotationProduct) {
            const productBaseName = productData.name || '';
            const normalizeStr = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');
            const normalizedSearchName = normalizeStr(variantName);
            const normalizedProductName = normalizeStr(productBaseName);

            const productNameMatches = normalizedProductName.includes(normalizedSearchName) ||
                                      normalizedSearchName.includes(normalizedProductName);
            const categoryMatches = !category || productData.category === category;

            if (productNameMatches && categoryMatches) {

              const productRef = doc(db, 'Products', unitId, 'products', currentProductId);
              return {
                productRef,
                currentQty: productData.quantity || 0,
                location: {
                  storageLocation: productData.storageLocation || unitId,
                  shelfName: productData.shelfName || 'Unknown',
                  rowName: productData.rowName || 'Unknown',
                  columnIndex: productData.columnIndex || 0
                }
              };
            }
          }
        }
      }

      console.error(`❌ Product not found: ${variantName}`);
      return null;
    }

    // Final fallback: search all units
    console.warn(`⚠️ Product not found at ${storageLocation}, searching all units...`);

    const productsRef = collection(db, 'Products');
    const storageUnitsSnapshot = await getDocs(productsRef);

    for (const storageUnitDoc of storageUnitsSnapshot.docs) {
      const unitId = storageUnitDoc.id;
      if (!unitId.startsWith('Unit ')) continue;

      const fallbackProductRef = doc(db, 'Products', unitId, 'products', productId);
      const fallbackProductDoc = await getDoc(fallbackProductRef);

      if (fallbackProductDoc.exists()) {
        const productData = fallbackProductDoc.data();

        return {
          productRef: fallbackProductRef,
          currentQty: productData.quantity || 0,
          location: {
            storageLocation: productData.storageLocation,
            shelfName: productData.shelfName,
            rowName: productData.rowName,
            columnIndex: productData.columnIndex
          }
        };
      }
    }

    console.error(`❌ Product not found in any location: ${productId}`);
    return null;
  } catch (error) {
    console.error(`Error searching for product ${variantName}:`, error);
    throw error;
  }
};

// Function to find all locations where a product exists with available quantities
const findAllProductLocations = async (productId, variantId, variantName, fullLocation, storageLocation) => {
  try {

    const allLocations = [];

    // If we have a variantId, try to find the variant document directly first
    if (variantId) {

      // Search all storage units for the variant document
      const productsRef = collection(db, 'Products');
      const storageUnitsSnapshot = await getDocs(productsRef);

      for (const storageUnitDoc of storageUnitsSnapshot.docs) {
        const unitId = storageUnitDoc.id;

        // Skip non-storage unit documents
        if (!unitId.startsWith('Unit ')) continue;

        try {
          // Try to find the variant document directly by variantId
          const variantRef = doc(db, 'Products', unitId, 'products', variantId);
          const variantDoc = await getDoc(variantRef);

          if (variantDoc.exists()) {
            const variantData = variantDoc.data();

            // Verify this is actually a variant and matches our product
            if (variantData.isVariant && (variantData.parentProductId === productId || variantData.id === productId)) {
              const availableQty = Number(variantData.quantity) || 0;

              // CRITICAL: Always add the location even if quantity is 0
              // This allows proper error messages and restock request generation
              allLocations.push({
                productRef: variantDoc.ref,
                currentQty: availableQty,
                variantIndex: -1, // Not using nested variant index anymore
                variant: variantData, // The variant data itself
                location: {
                  storageLocation: unitId,
                  shelfName: variantData.shelfName,
                  rowName: variantData.rowName,
                  columnIndex: variantData.columnIndex
                },
                productData: variantData,
                outOfStock: availableQty === 0, // Flag for special handling
                isVariant: true // Flag to indicate this is a variant document
              });

              if (availableQty === 0) {
                console.warn(`⚠️ WARNING: Variant found but OUT OF STOCK at ${unitId}`);
              } else {
              }

              // Return immediately since we found the specific variant
              return allLocations;
            }
          }
        } catch (error) {
          console.warn(`Error searching variant in unit ${unitId}:`, error);
          continue;
        }
      }

    }

    // If we have fullLocation, try direct lookup first (for base products or fallback)
    if (fullLocation) {

      // Parse fullLocation - it might be in format "Unit 01/Shelf A/Row 1/Column 1"
      // or "Steel & Heavy Materials - Angle Irons & L-Beams - Row 1 - Column 1"
      let unitId = '';

      if (fullLocation.includes('/')) {
        // Format: "Unit 01/Shelf A/Row 1/Column 1"
        const locationParts = fullLocation.split('/');
        unitId = locationParts[0];
      } else if (fullLocation.includes(' - ')) {
        // Format: "Steel & Heavy Materials - Angle Irons & L-Beams - Row 1 - Column 1"
        // Try to extract unit from the beginning
        const parts = fullLocation.split(' - ');
        if (parts[0].includes('Unit')) {
          unitId = parts[0];
        } else {
          // Map category names to unit IDs
          const categoryToUnit = {
            'Steel & Heavy Materials': 'Unit 01',
            'Construction Materials': 'Unit 02',
            'Tools & Equipment': 'Unit 03',
            'Steel': 'Unit 01',
            'Heavy Materials': 'Unit 01',
            'Construction': 'Unit 02',
            'Tools': 'Unit 03'
          };
          unitId = categoryToUnit[parts[0]] || 'Unit 01'; // Default to Unit 01
        }
      }

      if (unitId) {

        try {
          const productRef = doc(db, 'Products', unitId, 'products', productId);
          const productDoc = await getDoc(productRef);

          if (productDoc.exists()) {
            const productData = productDoc.data();

            // CRITICAL: Extract base product ID to handle variant ID mismatches
            const extractBaseProductId = (id) => {
              if (!id) return '';
              // Remove variant suffixes: _VAR_, -VAR-, _variant_
              return id.split(/[_-]VAR[_-]/i)[0]
                         .split(/[_-]variant[_-]/i)[0]
                         .split('_VAR_')[0]
                         .split('-VAR-')[0];
            };

            // Compare base IDs
            const productBaseId = extractBaseProductId(productData.id || productDoc.id);
            const searchBaseId = extractBaseProductId(productId);
            const variantIdBaseId = extractBaseProductId(variantId || '');

            // Check if this is the correct product (allowing for variant ID mismatches)
            const isCorrectProduct =
              productData.id === productId ||
              productData.id === variantId ||
              productBaseId === searchBaseId ||
              productBaseId === variantIdBaseId ||
              productDoc.id === productId ||
              productDoc.id === variantId;

            if (!isCorrectProduct) {
              // Don't throw error, just continue searching
            }


            // Check multiple possible variant locations
            const variantsArray = productData.variants || productData.Variants || productData.productVariants || [];
            const hasVariants = Array.isArray(variantsArray) && variantsArray.length > 0;


            if (hasVariants) {

            }

            if (hasVariants && variantId) {

              // Enhanced variant matching with normalization
              const normalizedSearchId = normalizeVariantId(variantId);

              // Find the specific variant with improved matching
              const variantIndex = variantsArray.findIndex(v => {
                // Direct matches
                if (v.id === variantId || v.variantId === variantId || v.size === variantId) return true;

                // String matches
                if (String(v.size) === String(variantId)) return true;

                // Name matches
                if (v.name && v.name === variantName) return true;

                // Normalized matches
                const normalizedVariantId = normalizeVariantId(v.variantId || v.id || v.size);
                if (normalizedVariantId === normalizedSearchId) return true;

                // Partial matches for complex variantIds (like the failing case)
                if (normalizedSearchId.includes(normalizedVariantId) || normalizedVariantId.includes(normalizedSearchId)) return true;

                // Check if variantId contains multiple identifiers separated by dashes/underscores
                const variantIdParts = String(variantId).split(/[-_]/).map(part => normalizeVariantId(part));
                const hasMatchingPart = variantIdParts.some(part =>
                  part && (normalizedVariantId.includes(part) || part.includes(normalizedVariantId))
                );
                if (hasMatchingPart) return true;

                return false;
              });


              if (variantIndex !== -1) {
                const variant = variantsArray[variantIndex];
                const availableQty = Number(variant.quantity) || 0;


                if (availableQty > 0) {
                  allLocations.push({
                    productRef: productDoc.ref,
                    currentQty: availableQty,
                    variantIndex,
                    variant,
                    location: {
                      storageLocation: unitId,
                      shelfName: productData.shelfName,
                      rowName: productData.rowName,
                      columnIndex: productData.columnIndex
                    },
                    productData
                  });
                } else {
                }
              } else {

                // If variantId exists but variant not found, this is an error condition
                // Don't fallback to non-variant - log error and skip this location
                console.error(`❌ CRITICAL: Product has variants but variantId ${variantId} not found in variant array`);
                // Continue to next location instead of adding this one
              }
            } else if (!hasVariants) {
              // Non-variant product OR product that should be treated as non-variant
              const availableQty = Number(productData.quantity) || 0;

              // CRITICAL: Always add the location even if quantity is 0
              // This allows proper error messages and restock request generation
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
                outOfStock: availableQty === 0 // Flag for special handling
              });

              if (availableQty === 0) {
                console.warn(`⚠️ WARNING: Product found but OUT OF STOCK at ${unitId}`);
                console.warn(`   Location: ${unitId}/${productData.shelfName}/${productData.rowName}/${productData.columnIndex}`);
              } else {
              }

              // Return immediately since we found the product (even if out of stock)
              return allLocations;
            } else {
              // Don't add this location - variant products must have variantId
            }

            // If we found the product using fullLocation, return it
            if (allLocations.length > 0) {
              return allLocations;
            }
          }
        } catch (error) {
          console.warn(`Error with fullLocation lookup:`, error);
        }
      }
    }

    // Fallback: search all storage units

    const productsRef = collection(db, 'Products');
    const storageUnitsSnapshot = await getDocs(productsRef);

    for (const storageUnitDoc of storageUnitsSnapshot.docs) {
      const unitId = storageUnitDoc.id;

      // Skip non-storage unit documents
      if (!unitId.startsWith('Unit ')) continue;

      try {
        // Search products subcollection in this unit
        const unitProductsRef = collection(db, 'Products', unitId, 'products');
        const productsSnapshot = await getDocs(unitProductsRef);

        for (const productDoc of productsSnapshot.docs) {
          const productData = productDoc.data();

          // Check if this matches our product
          if (productData.id !== productId && productData.productId !== productId) continue;

          // Check if this product has variants
          const variantsArray = productData.variants || productData.Variants || productData.productVariants || [];
          const hasVariants = Array.isArray(variantsArray) && variantsArray.length > 0;

          if (hasVariants && variantId) {
            // Enhanced variant matching with normalization
            const normalizedSearchId = normalizeVariantId(variantId);

            // Find the specific variant with improved matching
            const variantIndex = variantsArray.findIndex(v => {
              // Direct matches
              if (v.id === variantId || v.variantId === variantId || v.size === variantId) return true;

              // String matches
              if (String(v.size) === String(variantId)) return true;

              // Name matches
              if (v.name && v.name === variantName) return true;

              // Normalized matches
              const normalizedVariantId = normalizeVariantId(v.variantId || v.id || v.size);
              if (normalizedVariantId === normalizedSearchId) return true;

              // Partial matches for complex variantIds
              if (normalizedSearchId.includes(normalizedVariantId) || normalizedVariantId.includes(normalizedSearchId)) return true;

              // Check if variantId contains multiple identifiers separated by dashes/underscores
              const variantIdParts = String(variantId).split(/[-_]/).map(part => normalizeVariantId(part));
              const hasMatchingPart = variantIdParts.some(part =>
                part && (normalizedVariantId.includes(part) || part.includes(normalizedVariantId))
              );
              if (hasMatchingPart) return true;

              return false;
            });

            if (variantIndex !== -1) {
              const variant = variantsArray[variantIndex];
              const availableQty = Number(variant.quantity) || 0;

              if (availableQty > 0) {
                allLocations.push({
                  productRef: productDoc.ref,
                  currentQty: availableQty,
                  variantIndex,
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
            } else {
              // Variant not found - this is an error for variant products
              console.error(`❌ Variant ${variantId} not found in product ${productData.name} at ${unitId}`);
            }
          } else if (!hasVariants) {
            // Non-variant product OR product that should be treated as non-variant
            const availableQty = Number(productData.quantity) || 0;

            // CRITICAL: Always add the location even if quantity is 0
            // This allows proper error messages and restock request generation
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
              outOfStock: availableQty === 0 // Flag for special handling
            });

            if (availableQty === 0) {
              console.warn(`⚠️ WARNING: Product found but OUT OF STOCK at ${unitId}`);
            }
          }
        }
      } catch (error) {
        console.warn(`Error searching in unit ${unitId}:`, error);
        continue;
      }
    }

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
        product.storageLocation
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

      allLocations.forEach((loc, index) => {
        const status = loc.currentQty === 0 ? '❌ OUT OF STOCK' : '✅';
      });

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

      // Deduct from multiple locations as needed
      let remainingQty = releasedQty;
      const deductionDetails = [];

      for (const location of allLocations) {
        if (remainingQty <= 0) break;

        const deductQty = Math.min(remainingQty, location.currentQty);


        // Deduct from this location using transaction
        await runTransaction(db, async (transaction) => {
          const productDoc = await transaction.get(location.productRef);

          if (!productDoc.exists()) {
            throw new Error(`Product ${product.name} no longer exists at ${location.location.storageLocation}`);
          }

          const productData = productDoc.data();

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

            // Update variant document quantity
            transaction.update(location.productRef, {
              quantity: Math.max(0, newQty), // Ensure we don't go below 0
              lastUpdated: serverTimestamp()
            });

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

              // Update the product document with modified variants
              transaction.update(location.productRef, {
                variants: variants,
                lastUpdated: serverTimestamp()
              });

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

              // Update product quantity
              transaction.update(location.productRef, {
                quantity: Math.max(0, newQty), // Ensure we don't go below 0
                lastUpdated: serverTimestamp()
              });

              // Generate restock request if quantity is low
              const restockLevel = productData.restockLevel || productData.reorderPoint || 10;
              if (newQty <= restockLevel) {

                // Generate restock request using the centralized function with updated product data
                const updatedProductData = { ...productData, quantity: newQty };
                await generateRestockingRequest(updatedProductData, -1, location.location, currentUser);
              }
            }
          }
        });

        deductionDetails.push({
          location: location.location,
          deductedQty: deductQty,
          remainingAtLocation: location.currentQty - deductQty
        });

        remainingQty -= deductQty;
      }

      deductionDetails.forEach((detail, index) => {
      });
    }

  } catch (error) {
    console.error('❌ Error in inventory deduction:', error);
    throw new Error(`Failed to update inventory: ${error.message}`);
  }
};

// Helper function to generate release notification
const generateReleaseNotification = async (releaseData, currentUser) => {
  try {
    if (!releaseData) return null;
    
    const notificationId = `REL-NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification = {
      notificationId,
      type: 'release_completed',
      priority: 'normal',
      title: '📦 Release Completed',
      message: `Release ${releaseData.transactionId} completed - ${releaseData.releasedProducts?.length || 0} items released`,
      details: {
        transactionId: releaseData.transactionId,
        releaseId: releaseData.releaseId,
        totalItems: releaseData.releasedProducts?.length || 0,
        totalValue: releaseData.totalValue || 0,
        customerName: releaseData.customerInfo?.name || 'Walk-in Customer',
        releasedBy: releaseData.releasedByName || 'Unknown',
        items: releaseData.releasedProducts?.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalValue,
          category: item.category
        })) || []
      },
      targetRoles: ['InventoryManager', 'Admin'], // Who should see this notification
      triggeredBy: currentUser?.uid || 'system',
      triggeredByName: currentUser?.displayName || currentUser?.email || 'Mobile Release System',
      relatedTransactionId: releaseData.transactionId,
      isRead: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Save to notifications collection
    await addDoc(collection(db, 'Notifications'), notification);

    return notification;
  } catch (error) {
    console.error('Error generating release notification:', error);
    return null;
  }
};

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

  // New state for step-based UI
  const [currentStep, setCurrentStep] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const steps = ['List', 'Verify', 'Info', 'Summary'];

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
          const releaseRef = doc(db, 'Transactions', releaseIdParam);
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
                  productId: item.productId, // This is the actual product document ID
                  variantId: item.variantId, // This is the variant ID within the product
                  variantName: item.variantName,
                  productName: item.productName,
                  storageLocation: item.storageLocation || '',
                  shelfName: item.shelfName || '',
                  rowName: item.rowName || '',
                  columnIndex: item.columnIndex,
                  fullLocation: item.fullLocation || '', // Add fullLocation for quick lookup
                  category: item.category || '',
                  unitPrice: item.unitPrice || 0,
                  photo: null,
                  photoPreview: null
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

  // Initialize all products as selected for verification
  useEffect(() => {
    if (products.length > 0) {
      setSelectedProducts(products.map(p => p.id));
    }
  }, [products]);

  // Handle case where current product is no longer selected
  useEffect(() => {
    if (currentStep === 1 && selectedProducts.length > 0) {
      const selectedProductsForVerification = products.filter(p => selectedProducts.includes(p.id));
      
      // If current product index is out of bounds, reset to first available product
      if (currentProductIndex >= selectedProductsForVerification.length) {
        setCurrentProductIndex(0);
      }
    }
  }, [selectedProducts, currentStep, currentProductIndex, products]);

  const updateReleaseDetails = (field, value) => {
    setReleaseDetails(prev => ({ ...prev, [field]: value }));
  };

  const updateProduct = (productId, field, value) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, [field]: value } : p
    ));
  };

  const handlePhotoUpload = (productId, event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProduct(productId, 'photo', file);
        updateProduct(productId, 'photoPreview', reader.result);
      };
      reader.onerror = () => {
        alert('Error reading file');
      };
      reader.readAsDataURL(file);
    }
    
    // Reset the input value to allow selecting the same file again if needed
    event.target.value = '';
  };

  const toggleProductSelection = useCallback((productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const validateCurrentProduct = () => {
    const selectedProductsForVerification = products.filter(p => selectedProducts.includes(p.id));
    const product = selectedProductsForVerification[currentProductIndex];
    
    if (product && product.status === 'released') {
      if (!product.photo) {
        alert('Please upload a photo for this product');
        return false;
      }
      if (!product.releasedQty || product.releasedQty <= 0) {
        alert('Please enter a valid released quantity');
        return false;
      }
    }
    
    return true;
  };

  const validateReleaseInfo = () => {
    if (!releaseDetails.releasedBy) {
      alert('Released By is required');
      return false;
    }
    if (!releaseDetails.releasedDate) {
      alert('Release Date is required');
      return false;
    }
    if (!releaseDetails.releasedTime) {
      alert('Release Time is required');
      return false;
    }
    return true;
  };

  const handleNextProduct = () => {
    if (validateCurrentProduct()) {
      const selectedProductsForVerification = products.filter(p => selectedProducts.includes(p.id));
      if (currentProductIndex < selectedProductsForVerification.length - 1) {
        setCurrentProductIndex(currentProductIndex + 1);
      } else {
        // Move to next step
        handleStepNavigation('next');
      }
    }
  };

  const handlePreviousProduct = () => {
    if (currentProductIndex > 0) {
      setCurrentProductIndex(currentProductIndex - 1);
    } else {
      // Move to previous step
      handleStepNavigation('back');
    }
  };

  const handleStepNavigation = (direction) => {
    if (direction === 'next') {
      if (currentStep === 0) {
        // From List to Verify - check if products are selected
        if (selectedProducts.length === 0) {
          alert('Please select at least one product to release');
          return;
        }
        setCurrentStep(1);
        setCurrentProductIndex(0);
      } else if (currentStep === 1) {
        // From Verify to Info
        setCurrentStep(2);
      } else if (currentStep === 2) {
        // From Info to Summary
        if (validateReleaseInfo()) {
          setCurrentStep(3);
        }
      }
    } else if (direction === 'back') {
      if (currentStep === 1) {
        // From Verify to List
        setCurrentStep(0);
      } else if (currentStep === 2) {
        // From Info to Verify
        setCurrentStep(1);
        setCurrentProductIndex(selectedProducts.length - 1);
      } else if (currentStep === 3) {
        // From Summary to Info
        setCurrentStep(2);
      }
    }
  };

  const getSummary = () => {
    const totalOrdered = products.reduce((sum, p) => sum + Number(p.orderedQty), 0);
    const totalReleased = products.reduce((sum, p) => sum + (p.status === 'released' ? Number(p.releasedQty) : 0), 0);
    const releasedCount = products.filter(p => p.status === 'released').length;
    const selectedCount = selectedProducts.length;

    return { totalOrdered, totalReleased, releasedCount, selectedCount, totalProducts: products.length };
  };

  const summary = getSummary();
  
  // Get the selected products for verification
  const selectedProductsForVerification = useMemo(() => 
    products.filter(p => selectedProducts.includes(p.id)), 
    [products, selectedProducts]
  );
  const currentProduct = selectedProductsForVerification[currentProductIndex];  const handleSubmit = async () => {
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

      // Validate that all released products have photos
      const productsWithoutPhotos = releasedProducts.filter(p => !p.photo);
      if (productsWithoutPhotos.length > 0) {
        alert(`Please upload photos for the following products: ${productsWithoutPhotos.map(p => p.name).join(', ')}`);
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

      // Upload photos to Cloudinary
      setProcessingStep('Uploading photos...');
      const productsWithPhotoUrls = await Promise.all(
        products.map(async (product) => {
          if (product.photo && product.status === 'released') {
            try {
              const uploadResult = await uploadImage(product.photo, (progress) => {
                // Optional: Could show upload progress per photo
              }, {
                folder: `ims-releases/${releaseData.transactionId}`,
                publicId: `${product.productId || product.id}_${Date.now()}`
              });
              
              return {
                ...product,
                photoUrl: uploadResult.url,
                photoPublicId: uploadResult.publicId
              };
            } catch (photoError) {
              console.error(`Failed to upload photo for ${product.name}:`, photoError);
              // Continue without photo rather than failing the entire release
              return {
                ...product,
                photoUrl: null,
                photoPublicId: null
              };
            }
          }
          return product;
        })
      );

      // Update products array with photo URLs
      setProducts(productsWithPhotoUrls);

      // Update inventory quantities (deduct released items)

      setProcessingStep('Updating inventory...');
      await updateInventoryQuantities(productsWithPhotoUrls);

      // Update the release transaction document

      setProcessingStep('Updating release status...');
      
      const releaseRef = doc(db, 'Transactions', releaseId);
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
        releasedProducts: productsWithPhotoUrls.map(p => {
          // Create a clean object without undefined values
          const cleanProduct = {
            id: p.id,
            name: p.name,
            orderedQty: Number(p.orderedQty) || 0,
            releasedQty: Number(p.releasedQty) || 0,
            status: p.status || 'pending',
            remarks: p.remarks || '',
            productId: p.productId,
            productName: p.productName || p.name,
            category: p.category || '',
            unitPrice: Number(p.unitPrice) || 0,
            photoUrl: p.photoUrl || null,
            photoPublicId: p.photoPublicId || null
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
        products: productsWithPhotoUrls.filter(p => p.status === 'released').map(p => {
          const logProduct = {
            productId: p.productId || '',
            productName: p.name || '',
            quantity: Number(p.releasedQty) || 0,
            orderedQty: Number(p.orderedQty) || 0,
            remarks: p.remarks || '',
            unitPrice: Number(p.unitPrice) || 0,
            totalValue: (Number(p.releasedQty) || 0) * (Number(p.unitPrice) || 0),
            category: p.category || '',
            photoUrl: p.photoUrl || null,
            photoPublicId: p.photoPublicId || null
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
      const stockMovementPromises = productsWithPhotoUrls
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
            remarks: product.remarks || '',
            status: 'completed',
            
            // Photo Information
            photoUrl: product.photoUrl || null,
            photoPublicId: product.photoPublicId || null,
            
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

      // Generate notification for successful release
      await generateReleaseNotification({
        ...releaseData, 
        releaseId,
        releasedByName: releaseDetails.releasedBy,
        totalValue: releaseData.totals?.total || 0,
        releasedProducts: productsWithPhotoUrls.filter(p => p.status === 'released').map(p => ({
          productName: p.name,
          variantName: p.variantName,
          quantity: p.releasedQty,
          unitPrice: p.unitPrice,
          totalValue: Number(p.releasedQty) * Number(p.unitPrice),
          category: p.category,
          photoUrl: p.photoUrl
        }))
      }, currentUser);

      setIsCompleted(true);
      setIsSubmitting(false);

    } catch (error) {
      console.error('Error processing release:', error);
      
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Provide user-friendly, formatted error messages
      if (errorMessage.includes('OUT OF STOCK')) {
        // Extract product name from error
        const productMatch = errorMessage.match(/OUT OF STOCK: (.+?)\n/);
        const productName = productMatch ? productMatch[1] : 'Product';
        
        alert(
          `🚫 RELEASE BLOCKED - Out of Stock\n\n` +
          `Product: ${productName}\n\n` +
          `This item is currently unavailable.\n` +
          `Please restock before releasing.`
        );
      } else if (errorMessage.includes('INSUFFICIENT STOCK')) {
        alert(`🚫 RELEASE BLOCKED - Not Enough Stock\n\n${errorMessage}`);
      } else if (errorMessage.includes('Product Not Found')) {
        alert(`🚫 RELEASE BLOCKED - Product Not Found\n\n${errorMessage}`);
      } else {
        alert(`❌ Release Error\n\n${errorMessage}`);
      }
      
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
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {product.photoPreview ? (
                        <img 
                          src={product.photoPreview} 
                          alt={product.name}
                          className="w-8 h-8 object-cover rounded mr-2"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded mr-2 flex items-center justify-center">
                          <FiPackage className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <span className="text-gray-600">{product.name}</span>
                    </div>
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
                  Restock requests generated
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Mobile Release</h1>
          <p className="text-sm text-gray-500 mt-1">
            {releaseData?.transactionId || releaseId}
            {releaseData?.customerInfo?.name && ` • ${releaseData.customerInfo.name}`}
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

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* STEP 1 - PRODUCTS LIST */}
        {currentStep === 0 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                <p className="text-blue-600 text-xs font-medium">Total Products</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{summary.totalProducts}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-center">
                <p className="text-orange-600 text-xs font-medium">For Verification</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">{summary.selectedCount}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
                <p className="text-green-600 text-xs font-medium">Ready to Release</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{summary.releasedCount}</p>
              </div>
            </div>

            {/* Product Selection List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Products to Release</h2>
              <p className="text-sm text-gray-600 mb-4">Select products for verification and release</p>
              
              <div className="space-y-3">
                {products.map((product) => (
                  <div key={product.id} className={`border rounded-lg p-4 ${
                    product.status === 'released' 
                      ? 'bg-green-50 border-green-300' 
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
                          className="mt-1 mr-3 w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</p>
                          {(product.storageLocation || product.shelfName || product.rowName) && (
                            <p className="text-xs text-blue-600 mt-1">
                              📍 {product.storageLocation || 'Unknown'}/{product.shelfName || 'Unknown'}/{product.rowName || 'Unknown'}
                              {product.columnIndex !== undefined && product.columnIndex !== null ? `/${product.columnIndex}` : ''}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="text-gray-700">
                              <span className="font-medium">Ordered:</span> {product.orderedQty}
                            </span>
                            <span className="text-gray-500">
                              <span className="font-medium">Price:</span> ₱{product.unitPrice?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          {product.status === 'released' && (
                            <div className="mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded inline-block">
                              Ready to Release: {product.releasedQty} units
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Helper Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Next Steps:</p>
              <p>Select products to verify and prepare for release</p>
              <p className="mt-2 text-xs text-blue-600">Tip: Only selected products will be processed for release</p>
            </div>
          </div>
        )}

        {/* STEP 2 - PRODUCT VERIFICATION */}
        {currentStep === 1 && currentProduct && (
          <div className="space-y-5 animate-fadeIn">
            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Product {currentProductIndex + 1} of {selectedProductsForVerification.length}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(((currentProductIndex + 1) / selectedProductsForVerification.length) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentProductIndex + 1) / selectedProductsForVerification.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Product Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentProduct.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">Ordered: {currentProduct.orderedQty} units</p>
                  {(currentProduct.storageLocation || currentProduct.shelfName || currentProduct.rowName) && (
                    <p className="text-xs text-blue-600 mt-1">
                      📍 Location: {currentProduct.storageLocation || 'Unknown'}/{currentProduct.shelfName || 'Unknown'}/{currentProduct.rowName || 'Unknown'}
                      {currentProduct.columnIndex !== undefined && currentProduct.columnIndex !== null ? `/${currentProduct.columnIndex}` : ''}
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold text-blue-700">
                    ₱{currentProduct.unitPrice?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Released Quantity Input */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Release Quantity</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Released Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={currentProduct.orderedQty}
                    value={currentProduct.releasedQty || ''}
                    onChange={(e) => updateProduct(currentProduct.id, 'releasedQty', e.target.value)}
                    className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum: {currentProduct.orderedQty} units</p>
                </div>

                {currentProduct.releasedQty > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-700">
                      ✓ Ready to release {currentProduct.releasedQty} of {currentProduct.orderedQty} units
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Photo Upload - REQUIRED */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <FiPackage className="w-5 h-5 mr-2 text-orange-500" />
                Product Photo <span className="text-red-500">*</span>
              </label>
              
              <div 
                onClick={() => document.getElementById(`photo-input-${currentProduct.id}`)?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  currentProduct.photoPreview
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-orange-400'
                }`}
              >
                {currentProduct.photoPreview ? (
                  <div className="relative">
                    <img 
                      src={currentProduct.photoPreview} 
                      alt="Product preview" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProduct(currentProduct.id, 'photo', null);
                        updateProduct(currentProduct.id, 'photoPreview', null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                    <p className="text-sm text-green-700 mt-3 font-medium">✓ Photo uploaded. Tap to change</p>
                  </div>
                ) : (
                  <>
                    <FiPackage className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="font-medium text-gray-900">Tap to Take/Upload Photo</p>
                    <p className="text-sm text-gray-500 mt-1">Camera or Gallery</p>
                  </>
                )}
              </div>
              <input
                id={`photo-input-${currentProduct.id}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(currentProduct.id, e)}
                className="hidden"
              />
              {!currentProduct.photoPreview && (
                <p className="text-red-600 text-sm mt-2 font-medium">Photo Required</p>
              )}
            </div>

            {/* Remarks */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
              <textarea
                value={currentProduct.remarks || ''}
                onChange={(e) => updateProduct(currentProduct.id, 'remarks', e.target.value)}
                placeholder="Any observations or comments about this product..."
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Status Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Release Status</h3>
              <div className="flex space-x-2">
                {[
                  { value: 'released', label: 'Release', icon: FiCheckCircle, color: 'green' },
                  { value: 'pending', label: 'Skip', icon: FiClock, color: 'yellow' }
                ].map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    onClick={() => updateProduct(currentProduct.id, 'status', value)}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                      currentProduct.status === value
                        ? `bg-${color}-100 text-${color}-700 border-2 border-${color}-300`
                        : 'bg-white text-gray-600 border-2 border-gray-200'
                    }`}
                  >
                    <Icon className="mr-2" size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 - RELEASE INFORMATION */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiUser className="w-5 h-5 mr-2" style={{ color: '#EC6923' }} />
                Release Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Released By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={releaseDetails.releasedBy}
                    onChange={(e) => updateReleaseDetails('releasedBy', e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Release Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={releaseDetails.releasedDate}
                      onChange={(e) => updateReleaseDetails('releasedDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={releaseDetails.releasedTime}
                      onChange={(e) => updateReleaseDetails('releasedTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    value={releaseDetails.notes}
                    onChange={(e) => updateReleaseDetails('notes', e.target.value)}
                    placeholder="Any additional comments about this release..."
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
                <p className="text-blue-600 text-sm font-medium">Total Ordered</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{summary.totalOrdered}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-green-600 text-sm font-medium">Total Released</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{summary.totalReleased}</p>
              </div>
            </div>

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-start">
                <FiCheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 text-lg">Ready for Release</h3>
                  <p className="text-sm text-green-700 mt-1">
                    All products have been verified and are ready for inventory update.
                  </p>
                </div>
              </div>
            </div>

            {/* Release Info Summary */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Release Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-medium text-gray-900">{releaseData?.transactionId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Released By:</span>
                  <span className="font-medium text-gray-900">{releaseDetails.releasedBy}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium text-gray-900">{releaseData?.customerInfo?.name || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Release Date & Time:</span>
                  <span className="font-medium text-gray-900">{releaseDetails.releasedDate} {releaseDetails.releasedTime}</span>
                </div>
              </div>
            </div>

            {/* Product List Summary */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Products Summary</h3>
              <div className="space-y-3">
                {products.filter(p => p.status === 'released').map((product, index) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500">Ordered: {product.orderedQty} | Released: {product.releasedQty}</p>
                        {(product.storageLocation || product.shelfName || product.rowName) && (
                          <p className="text-xs text-blue-600 mt-1">
                            📍 {product.storageLocation || 'Unknown'}/{product.shelfName || 'Unknown'}/{product.rowName || 'Unknown'}
                            {product.columnIndex !== undefined && product.columnIndex !== null ? `/${product.columnIndex}` : ''}
                          </p>
                        )}
                      </div>
                      {product.photoPreview ? (
                        <img 
                          src={product.photoPreview} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded ml-3"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded ml-3 flex items-center justify-center">
                          <FiPackage className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600 text-xs">Quantity</p>
                        <p className="font-semibold text-green-700">{product.releasedQty}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs">Value</p>
                        <p className="font-semibold text-gray-900">₱{(Number(product.releasedQty) * Number(product.unitPrice)).toFixed(2)}</p>
                      </div>
                    </div>

                    {product.remarks && (
                      <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                        <span className="font-medium">Remarks:</span> {product.remarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {currentStep < 3 ? (
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={() => handleStepNavigation('back')}
                  className="px-6 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                >
                  <FiRefreshCw className="w-5 h-5 mr-1" />
                  {currentStep === 1 && currentProductIndex > 0 ? 'Previous Product' : 'Back'}
                </button>
              )}
              <button
                onClick={() => {
                  if (currentStep === 1) {
                    handleNextProduct();
                  } else {
                    handleStepNavigation('next');
                  }
                }}
                className="flex-1 px-6 py-3 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                style={{ backgroundColor: '#EC6923' }}
              >
                {currentStep === 0 ? 'Start Verification' : 
                 currentStep === 1 ? (currentProductIndex < selectedProductsForVerification.length - 1 ? 'Next Product' : 'Continue to Info') :
                 'Continue to Summary'}
                <FiCheckCircle className="w-5 h-5 ml-1" />
              </button>
            </div>
          ) : (
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
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Complete Release & Update Inventory'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReleaseMobileView;
