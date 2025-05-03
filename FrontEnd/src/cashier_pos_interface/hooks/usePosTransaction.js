import { useState, useCallback } from 'react';
import {
  getFirestore, collection, doc, runTransaction, serverTimestamp, getDoc
} from 'firebase/firestore';
import app from '../FirebaseConfig'; // Adjust path as needed

const db = getFirestore(app);

/**
 * Custom Hook to encapsulate POS transaction logic including pre-fetch and Firestore transaction.
 */
export function usePosTransaction() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null); // Store error messages

  /**
   * Processes the sale transaction.
   * @param {object[]} cart - Array of cart items.
   * @param {string} customerIdentifier - Unique ID for the customer.
   * @param {string} customerDisplayName - Name of the customer for display.
   * @param {boolean} isBulkOrder - Whether it's a bulk order.
   * @param {object | null} customerDetails - Additional details for bulk orders.
   * @param {string} paymentMethod - Method of payment.
   * @param {string} amountPaidStr - Amount paid by customer (as string).
   * @param {number} total - Calculated total amount of the sale.
   * @param {object} cashier - Cashier object containing id and name.
   * @returns {Promise<object|null>} - Resolves with transactionData on success, null on failure.
   */
  const processSale = useCallback(async (
    cart,
    customerIdentifier,
    customerDisplayName,
    isBulkOrder,
    customerDetails,
    paymentMethod,
    amountPaidStr, // Receive as string from input
    total,         // Receive calculated total
    cashier = { id: 'unknown', name: 'Unknown Cashier' } // Update parameter
  ) => {
    // --- Validation ---
    setError(null); // Clear previous errors
    if (!cart || cart.length === 0) {
      setError("Cart is empty.");
      console.error("processSale validation failed: Cart is empty.");
      return null;
    }
    const parsedAmountPaid = parseFloat(amountPaidStr);
    if (isNaN(parsedAmountPaid) || parsedAmountPaid < 0) {
      setError("Invalid amount paid entered.");
       console.error("processSale validation failed: Invalid amount paid format.");
      return null;
    }
     if (isNaN(total) || total < 0) {
         setError("Error calculating total amount.");
         console.error("processSale validation failed: Invalid total passed.");
         return null;
     }
    if (parsedAmountPaid < total) {
      setError(`Amount paid (₱${parsedAmountPaid.toFixed(2)}) is less than total (₱${total.toFixed(2)}).`);
      console.error("processSale validation failed: Amount paid less than total.");
      return null;
    }
    if (isProcessing) {
        setError("Processing already in progress.");
        console.warn("processSale blocked: Already processing.");
        return null; // Prevent concurrent executions
    }

    setIsProcessing(true); // Indicate start of processing

    // --- Prepare Data ---
    const now = new Date(); // For receipt display timestamp
    const serverTime = serverTimestamp(); // For Firestore timestamp
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const receiptNumber = `GS-${year}${month}${day}-${random}`;

    // Recalculate totals within the hook for certainty
    const subTotalCalc = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const taxRateCalc = 0.12;
    const taxCalc = subTotalCalc * taxRateCalc;
    const totalCalc = subTotalCalc + taxCalc;
    const changeCalc = parsedAmountPaid - totalCalc;

    // Final check against internal calculation
    if (Math.abs(totalCalc - total) > 0.001) { // Allow for tiny float differences
        setError("Total amount mismatch detected during processing.");
        console.error(`processSale consistency error: Passed total ${total}, calculated total ${totalCalc}`);
        setIsProcessing(false);
        return null;
    }

    const transactionData = {
        receiptNumber: receiptNumber,
        cashierId: cashier.id,
        cashierName: cashier.name,
        customerId: customerIdentifier,
        customerName: customerDisplayName,
        isBulkOrder: !!isBulkOrder,
        customerDetails: isBulkOrder ? customerDetails : null,
        items: cart.map(item => ({
            name: item.name, qty: item.qty, price: item.price,
            variantId: item.variantId, baseProductId: item.baseProductId, category: item.category
        })),
        subTotal: subTotalCalc, tax: taxCalc, total: totalCalc,
        amountPaid: parsedAmountPaid, change: changeCalc, paymentMethod: paymentMethod,
        timestamp: serverTime, // Use server timestamp for DB record
        clientTimestamp: now.toISOString() // Optionally store client time too
    };

    // --- Pre-fetch Product Data ---
    console.log("--- Starting Pre-fetch (within hook) ---");
    const productDocsToFetch = new Map();
    let preFetchErrorMsg = null;
    for (const item of transactionData.items) {
        if (!item.category || !item.baseProductId || !item.variantId) {
            preFetchErrorMsg = `Invalid item data for '${item.name || 'unknown'}': Missing category, baseProductId, or variantId.`;
            break;
        }
        const productDocPath = `Products/${item.category}/Items/${item.baseProductId}`;
        if (!productDocsToFetch.has(productDocPath)) {
            productDocsToFetch.set(productDocPath, { docRef: doc(db, productDocPath), items: [item] });
        } else {
            productDocsToFetch.get(productDocPath).items.push(item);
        }
    }

    if (preFetchErrorMsg) {
        setError(preFetchErrorMsg);
        console.error("processSale pre-fetch failed:", preFetchErrorMsg);
        setIsProcessing(false);
        return null;
    }

    const fetchedProductData = new Map();
    try {
        const fetchPromises = Array.from(productDocsToFetch.entries()).map(async ([path, { docRef, items }]) => {
            const productDoc = await getDoc(docRef);
            if (!productDoc.exists()) {
                const itemNames = items.map(i => i.name).join(', ');
                throw new Error(`Product document for '${itemNames}' (Path: ${path}) not found.`);
            }
            fetchedProductData.set(path, { docRef: docRef, data: productDoc.data() });
        });
        await Promise.all(fetchPromises);
        console.log("--- Pre-fetch Complete (within hook) ---");
    } catch (error) {
        setError(`Pre-fetch Error: ${error.message}`);
        console.error("processSale pre-fetch error:", error);
        setIsProcessing(false);
        return null;
    }

    // --- Firestore Transaction ---
    try {
        await runTransaction(db, async (transaction) => {
            console.log("--- Starting Firestore Transaction (within hook) ---");
            const productUpdates = new Map();

            for (const item of transactionData.items) {
                const productDocPath = `Products/${item.category}/Items/${item.baseProductId}`;
                const preFetchedInfo = fetchedProductData.get(productDocPath);

                if (!preFetchedInfo || !preFetchedInfo.data) {
                    throw new Error(`Consistency Error: Pre-fetched data missing for ${productDocPath}`);
                }
                const productData = preFetchedInfo.data;

                if (!productData.variants || !Array.isArray(productData.variants)) {
                    throw new Error(`Invalid 'variants' array in product '${item.name}' (Path: ${productDocPath}).`);
                }

                let currentVariantsData = productUpdates.has(productDocPath)
                    ? productUpdates.get(productDocPath).updatedVariantsData
                    : JSON.parse(JSON.stringify(productData.variants)); // Deep copy

                const variantIndex = currentVariantsData.findIndex(v => v.variantId === item.variantId);
                if (variantIndex === -1) {
                    throw new Error(`Variant '${item.name}' (ID: ${item.variantId}) not found in ${productDocPath}.`);
                }

                const variantToUpdate = currentVariantsData[variantIndex];
                const currentStock = variantToUpdate.quantity;

                if (typeof currentStock !== 'number' || currentStock < 0) {
                     throw new Error(`Invalid stock (${currentStock}) for variant '${item.name}'.`);
                }
                if (currentStock < item.qty) {
                    throw new Error(`Insufficient stock for ${item.name} (${item.variantId}). Available: ${currentStock}, Needed: ${item.qty}.`);
                }

                const newStock = currentStock - item.qty;
                currentVariantsData[variantIndex] = { ...variantToUpdate, quantity: newStock };

                productUpdates.set(productDocPath, {
                    docRef: preFetchedInfo.docRef,
                    updatedVariantsData: currentVariantsData
                });
                console.log(`Prepared stock update (hook): ${item.name} (${item.variantId}) -> ${newStock}`);
            }

            console.log("--- Applying Firestore Updates (within hook) ---");
            for (const [path, { docRef, updatedVariantsData }] of productUpdates.entries()) {
                transaction.update(docRef, { variants: updatedVariantsData });
            }

            const finalTransactionRef = doc(collection(db, "Transactions"));
            console.log("Creating transaction doc (hook):", finalTransactionRef.id);
            transaction.set(finalTransactionRef, transactionData); // Use prepared data with server timestamp

            console.log("--- Firestore Transaction Commit Attempt (within hook) ---");
        }); // End runTransaction

        console.log("Transaction successful (hook)!");
        setIsProcessing(false);
        // Return the final transaction data (with client timestamp added for receipt use)
        return { ...transactionData, timestamp: now }; // Use 'now' for receipt

    } catch (transactionError) {
        setError(`Transaction Failed: ${transactionError.message}`);
        console.error("processSale transaction error:", transactionError);
        setIsProcessing(false);
        return null; // Indicate failure
    }
  }, [isProcessing]); // Dependency: isProcessing to prevent concurrent calls

  // Return state and the processing function
  return { isProcessing, error, processSale };
}

