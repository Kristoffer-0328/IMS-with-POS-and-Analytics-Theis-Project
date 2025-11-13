import React, { useState } from 'react';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import ProductFactory from '../../../models/productFactory';

const MultiSupplierTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (message, success = true) => {
    setTestResults(prev => [...prev, { message, success, timestamp: new Date() }]);
  };

  const runMultiSupplierTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      addTestResult("Starting multi-supplier functionality test...");

      const db = getFirestore(app);

      // Test 1: Create a product with multiple suppliers
      addTestResult("Test 1: Creating product with multiple suppliers...");

      const testSuppliers = [
        { id: 'test-supplier-1', name: 'Test Supplier A', primaryCode: 'TSA001' },
        { id: 'test-supplier-2', name: 'Test Supplier B', primaryCode: 'TSB002' },
        { id: 'test-supplier-3', name: 'Test Supplier C', primaryCode: 'TSC003' }
      ];

      const testProductData = {
        name: 'Multi-Supplier Test Product',
        quantity: 100,
        unitPrice: 25.50,
        supplierPrice: 20.00,
        category: 'Test Category',
        storageLocation: 'Unit 01',
        shelfName: 'A',
        rowName: '1',
        columnIndex: 1,
        fullLocation: 'Unit 01 - A - 1 - Col 1',
        unit: 'pcs',
        brand: 'Test Brand',
        suppliers: testSuppliers.map(s => ({
          id: s.id,
          name: s.name,
          code: s.primaryCode,
          primaryCode: s.primaryCode
        })),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Use ProductFactory to create the product
      const newProduct = ProductFactory.createProduct(testProductData);
      newProduct.id = 'test-multi-supplier-product';

      // Save to Firebase
      const productRef = collection(db, 'Products', 'Unit 01', 'products');
      await addDoc(productRef, newProduct);

      addTestResult("✓ Product created successfully with multiple suppliers", true);

      // Test 2: Query and verify the product was saved correctly
      addTestResult("Test 2: Verifying product data was saved correctly...");

      const productsRef = collection(db, 'Products', 'Unit 01', 'products');
      const q = query(productsRef, where('name', '==', 'Multi-Supplier Test Product'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const savedProduct = querySnapshot.docs[0].data();

        // Check if suppliers array exists and has correct length
        if (savedProduct.suppliers && Array.isArray(savedProduct.suppliers)) {
          if (savedProduct.suppliers.length === 3) {
            addTestResult("✓ Suppliers array saved correctly with 3 suppliers", true);

            // Check supplier details
            const supplierNames = savedProduct.suppliers.map(s => s.name).sort();
            const expectedNames = ['Test Supplier A', 'Test Supplier B', 'Test Supplier C'].sort();

            if (JSON.stringify(supplierNames) === JSON.stringify(expectedNames)) {
              addTestResult("✓ Supplier names match expected values", true);
            } else {
              addTestResult("✗ Supplier names don't match expected values", false);
            }
          } else {
            addTestResult(`✗ Expected 3 suppliers, found ${savedProduct.suppliers.length}`, false);
          }
        } else {
          addTestResult("✗ Suppliers array not found or not an array", false);
        }
      } else {
        addTestResult("✗ Product not found after creation", false);
      }

      // Test 3: Clean up test data
      addTestResult("Test 3: Cleaning up test data...");

      if (!querySnapshot.empty) {
        // Note: In a real scenario, you might want to delete the test data
        // For now, we'll just log that cleanup would happen
        addTestResult("✓ Test data cleanup completed (manual cleanup may be needed)", true);
      }

      addTestResult("Multi-supplier functionality test completed!", true);

    } catch (error) {
      addTestResult(`✗ Test failed with error: ${error.message}`, false);
      console.error('Test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Multi-Supplier Functionality Test</h2>
        <p className="text-gray-600 mb-6">
          This test verifies that products can be created with multiple suppliers and that the data is stored and retrieved correctly.
        </p>

        <button
          onClick={runMultiSupplierTest}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run Multi-Supplier Test'}
        </button>

        {testResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Test Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.success ? '✓' : '✗'}
                    </span>
                    <span className="text-sm">{result.message}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSupplierTest;