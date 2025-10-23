import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const db = getFirestore(app);

// Test function to simulate inventory update
const testInventoryUpdate = async () => {

  try {
    // Sample product data from POS transaction
    const testProduct = {
      id: 'variant-123',
      productId: 'product-456',
      variantId: 'variant-123',
      variantName: 'Test Product - Small',
      name: 'Test Product - Small',
      releasedQty: 2,
      storageLocation: 'Unit 1',
      shelfName: 'Shelf A',
      rowName: 'Row 1',
      columnIndex: 1
    };


    // Construct the product reference path directly
    const productRef = doc(db, 'Products', testProduct.storageLocation, 'products', testProduct.productId);

    // Get current product data
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      console.error('❌ Test product not found at stored location');
      return;
    }

    const productData = productDoc.data();

    // Since all products in POS transactions have variantId, we always update the specific variant/product quantity directly
    if (testProduct.variantId) {
      // Product is a variant - update its own quantity

      const currentQty = Number(productData.quantity) || 0;
      const newQty = currentQty - testProduct.releasedQty;


      if (newQty < 0) {
        console.warn(`⚠️ WARNING: Variant quantity going negative: ${newQty}`);
      }

      // Use transaction to safely update inventory
      await runTransaction(db, async (transaction) => {
        // Re-fetch the document inside the transaction
        const currentProductDoc = await transaction.get(productRef);

        if (!currentProductDoc.exists()) {
          throw new Error(`Product ${testProduct.name} no longer exists at ${testProduct.storageLocation}`);
        }

        // Update the variant quantity
        transaction.update(productRef, {
          quantity: newQty,
          lastUpdated: serverTimestamp()
        });

      });

    }

  } catch (error) {
    console.error('❌ Error in test inventory update:', error);
  }
};

// Test component
const TestReleaseLogic = () => {
  const [testResult, setTestResult] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async () => {
    setIsRunning(true);
    setTestResult('Running test...');

    try {
      await testInventoryUpdate();
      setTestResult('✅ Test completed successfully! Check console for details.');
    } catch (error) {
      setTestResult(`❌ Test failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Release Inventory Logic</h1>
      <p className="text-gray-600 mb-6">
        This test simulates the inventory update logic used in the release process.
        It will attempt to deduct quantity from a test product.
      </p>

      <button
        onClick={runTest}
        disabled={isRunning}
        className={`px-6 py-3 rounded-lg font-medium ${
          isRunning
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isRunning ? 'Running Test...' : 'Run Inventory Update Test'}
      </button>

      {testResult && (
        <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Test Details:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Looks for product at: Products/Unit 1/products/product-456</li>
          <li>• Deducts 2 units from the variant quantity</li>
          <li>• Uses Firestore transaction for atomic update</li>
          <li>• Check browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  );
};

export default TestReleaseLogic;
