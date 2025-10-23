import React, { useState, useEffect } from 'react';
import { FiUpload, FiDownload, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import Papa from 'papaparse';
import { getFirestore, doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import ProductFactory from './Factory/productFactory';
import { linkProductToSupplier } from '../../../services/firebase/ProductServices';

const BulkProductImport = ({ isOpen, onClose, suppliers = [] }) => {
  const [file, setFile] = useState(null);
  const [importProgress, setImportProgress] = useState({ total: 0, current: 0 });
  const [processingProductsCount, setProcessingProductsCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const db = getFirestore(app);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResults(null);
      setErrors([]);
    }
  };

  const validateCSVData = (data) => {
    const errors = [];
    const requiredFields = ['ProductName', 'Category', 'Quantity', 'UnitPrice', 'StorageLocation'];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because of header row and 0-based indexing

      // Check required fields
      requiredFields.forEach(field => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push(`Row ${rowNum}: Missing required field '${field}'`);
        }
      });

      // Validate numeric fields
      if (row.Quantity && isNaN(Number(row.Quantity))) {
        errors.push(`Row ${rowNum}: 'Quantity' must be a valid number`);
      }

      if (row.UnitPrice && isNaN(Number(row.UnitPrice))) {
        errors.push(`Row ${rowNum}: 'UnitPrice' must be a valid number`);
      }

      if (row.RestockLevel && row.RestockLevel !== '' && isNaN(Number(row.RestockLevel))) {
        errors.push(`Row ${rowNum}: 'RestockLevel' must be a valid number`);
      }

      if (row.MaximumStockLevel && row.MaximumStockLevel !== '' && isNaN(Number(row.MaximumStockLevel))) {
        errors.push(`Row ${rowNum}: 'MaximumStockLevel' must be a valid number`);
      }

      // Validate storage location format (should be like "Unit 01 - Shelf A - Row 1 - Column 1")
      if (row.StorageLocation && !row.StorageLocation.includes(' - ')) {
        errors.push(`Row ${rowNum}: 'StorageLocation' should be in format "Unit XX - Shelf X - Row X - Column X"`);
      }
    });

    return errors;
  };

  const parseStorageLocation = (locationString) => {
    // Parse "Unit 01 - Shelf A - Row 1 - Column 1" format
    const parts = locationString.split(' - ').map(part => part.trim());

    if (parts.length >= 4) {
      return {
        storageLocation: parts[0],
        shelfName: parts[1],
        rowName: parts[2],
        columnIndex: parseInt(parts[3].replace('Column ', '')) - 1, // Convert to 0-based
        fullLocation: locationString
      };
    }

    return {
      storageLocation: locationString,
      shelfName: '',
      rowName: '',
      columnIndex: 0,
      fullLocation: locationString
    };
  };

  const processCSVData = (csvData) => {
    const processedProducts = [];

    csvData.forEach(row => {
      const storageInfo = parseStorageLocation(row.StorageLocation || '');

      const productData = {
        name: row.ProductName,
        brand: row.Brand || 'Generic',
        category: row.Category,
        quantity: Number(row.Quantity) || 0,
        unitPrice: Number(row.UnitPrice) || 0,
        unit: row.Unit || 'pcs',
        size: row.Size || '',
        specifications: row.Specifications || '',
        restockLevel: Number(row.RestockLevel) || 0,
        maximumStockLevel: Number(row.MaximumStockLevel) || 0,
        supplier: selectedSupplier ? {
          name: selectedSupplier.name,
          code: selectedSupplier.primaryCode || selectedSupplier.code,
          primaryCode: selectedSupplier.primaryCode || selectedSupplier.code
        } : {
          name: row.Supplier || 'Unknown',
          code: row.SupplierCode || '',
          primaryCode: row.SupplierCode || ''
        },
        ...storageInfo,
        dateStocked: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Create product using ProductFactory
      const product = ProductFactory.createProduct(productData);

      // Generate ID based on whether supplier is selected (same logic as NewProductForm)
      if (selectedSupplier) {
        product.id = ProductFactory.generateSupplierProductId(
          productData.name, 
          productData.category, 
          selectedSupplier.primaryCode || selectedSupplier.code
        );
      } else {
        product.id = ProductFactory.generateProductId(
          productData.name, 
          productData.category, 
          productData.brand
        );
      }

      processedProducts.push(product);
    });

    return processedProducts;
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a CSV file to import.');
      return;
    }

    if (!selectedSupplier) {
      alert('Please select a supplier for the imported products.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ total: 0, current: 0 });
    setErrors([]);

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const { data } = results;

          if (data.length === 0) {
            setErrors(['CSV file appears to be empty or has no valid data rows.']);
            setIsImporting(false);
            return;
          }

          // Validate data
          const validationErrors = validateCSVData(data);
          if (validationErrors.length > 0) {
            setErrors(validationErrors);
            setIsImporting(false);
            return;
          }

          // Process data
          const processedProducts = processCSVData(data);

          // Set the count of products being processed for progress tracking
          setProcessingProductsCount(processedProducts.length);

          // Import products
          const totalOperations = selectedSupplier ? processedProducts.length * 2 : processedProducts.length;
          setImportProgress({ total: totalOperations, current: 0 });
          await saveProductsToFirestore(processedProducts, selectedSupplier);

          setImportResults({
            success: true,
            totalProducts: processedProducts.length,
            supplierName: selectedSupplier.name,
            message: `Successfully imported ${processedProducts.length} product${processedProducts.length > 1 ? 's' : ''} and linked to ${selectedSupplier.name}!`
          });

          setIsImporting(false);
        },
        error: (err) => {
          console.error('Error parsing CSV:', err);
          setErrors(['Error parsing CSV file. Please check the file format.']);
          setIsImporting(false);
        }
      });
    } catch (error) {
      console.error('Error during import:', error);
      setErrors([`Import failed: ${error.message}`]);
      setIsImporting(false);
    }
  };

  const saveProductsToFirestore = async (products, selectedSupplier) => {
    const batch = writeBatch(db);
    let operationCount = 0;

    for (const product of products) {
      // Save to nested structure: Products/{storageLocation}/products/{productId}
      const productRef = doc(db, 'Products', product.storageLocation, 'products', product.id);
      batch.set(productRef, product);

      operationCount++;
      setImportProgress(prev => ({ ...prev, current: operationCount }));
    }

    await batch.commit();

    // Link each product to the supplier
    if (selectedSupplier) {
      for (const product of products) {
        try {
          const supplierData = {
            supplierName: selectedSupplier.name,
            supplierCode: selectedSupplier.primaryCode || selectedSupplier.code,
            supplierPrice: product.unitPrice, // Use the product's unit price as supplier price
            supplierSKU: `${selectedSupplier.primaryCode || selectedSupplier.code}-${product.id}`
          };

          await linkProductToSupplier(product.id, selectedSupplier.id, supplierData);
          operationCount++;
          setImportProgress(prev => ({ ...prev, current: operationCount }));
        } catch (error) {
          console.error(`Failed to link product ${product.name} to supplier:`, error);
          // Continue with other products even if one fails
        }
      }
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'ProductName',
      'Brand',
      'Category',
      'Quantity',
      'UnitPrice',
      'Unit',
      'Size',
      'Specifications',
      'RestockLevel',
      'MaximumStockLevel',
      'Supplier',
      'SupplierCode',
      'StorageLocation'
    ];

    const sampleData = [
      [
        'Sample Product 1',
        'Generic Brand',
        'Steal & Heavy Materials',
        '50',
        '299.99',
        'pcs',
        'Medium',
        'High quality electronic component',
        '10',
        '200',
        selectedSupplier?.name || 'Sample Supplier',
        selectedSupplier?.primaryCode || 'SUP001',
        'Unit 01 - (Shelf Name) - Row 1 - Column 2'
      ],
      [
        'Sample Product 2',
        'Premium Brand',
        'Steal & Heavy Materials',
        '25',
        '149.50',
        'pcs',
        'Large',
        'Professional grade tool',
        '5',
        '100',
        selectedSupplier?.name || 'Sample Supplier',
        selectedSupplier?.primaryCode || 'SUP001',
        'Unit 01 - (Shelf Name) - Row 2 - Column 3'
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product_import_template_${selectedSupplier?.name || 'supplier'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setFile(null);
    setImportResults(null);
    setErrors([]);
    setImportProgress({ total: 0, current: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-white/30 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiUpload className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bulk Product Import</h2>
              <p className="text-sm text-gray-600">
                Import products for {selectedSupplier?.name || 'selected supplier'} and automatically link them
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Template Download */}
          <div className="mb-6">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              Download CSV Template
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Download a template with sample data and required columns
            </p>
          </div>

          {/* Supplier Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSupplier?.id || ''}
              onChange={(e) => {
                const supplierId = e.target.value;
                const supplier = suppliers.find(s => s.id === supplierId);
                setSelectedSupplier(supplier || null);
              }}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={isImporting}
            >
              <option value="">Choose a supplier...</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} ({supplier.primaryCode || supplier.code})
                </option>
              ))}
            </select>
            {selectedSupplier && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Selected:</span> {selectedSupplier.name}
                </p>
                <p className="text-xs text-blue-600">
                  Code: {selectedSupplier.primaryCode || selectedSupplier.code} | 
                  Contact: {selectedSupplier.contactPerson}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              All imported products will be associated with the selected supplier
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div className="relative">
              <input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isImporting}
              />
              <label
                htmlFor="csvFile"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  file
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                } ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  {file ? file.name : 'Click to upload CSV file'}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  CSV files only, max 10MB
                </span>
              </label>
            </div>
          </div>

          {/* Progress Bar */}
          {isImporting && importProgress.total > 0 && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>
                  {importProgress.current <= processingProductsCount 
                    ? 'Saving products...' 
                    : 'Linking to supplier...'
                  }
                </span>
                <span>{importProgress.current} of {importProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(importProgress.current / importProgress.total) * 100}%`
                  }}
                ></div>
              </div>
              {selectedSupplier && importProgress.current > processingProductsCount && (
                <p className="text-xs text-blue-600 mt-1">
                  Linking products to {selectedSupplier.name}...
                </p>
              )}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiAlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-medium text-red-800">
                  {errors.length} error{errors.length > 1 ? 's' : ''} found
                </h3>
              </div>
              <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Results */}
          {importResults && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiCheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-medium text-green-800">Import Successful!</h3>
              </div>
              <p className="text-sm text-green-700">{importResults.message}</p>
              {importResults.supplierName && (
                <p className="text-xs text-green-600 mt-1">
                  All products linked to supplier: {importResults.supplierName}
                </p>
              )}
            </div>
          )}

          {/* Required Fields Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Required CSV Columns:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
              <span>• ProductName</span>
              <span>• Category</span>
              <span>• Quantity</span>
              <span>• UnitPrice</span>
              <span>• StorageLocation</span>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              StorageLocation format: "Unit XX - Shelf X - Row X - Column X"
            </p>
            <p className="text-xs text-blue-600 mt-1">
              <strong>Note:</strong> Supplier and SupplierCode columns are optional since all products will be automatically linked to the selected supplier.
            </p>
          </div>
        </div>

        {/* Footer - Always visible */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            onClick={importResults ? resetImport : handleImport}
            disabled={!file || !selectedSupplier || isImporting}
            className={`px-6 py-2 rounded-lg transition-colors ${
              importResults
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
            }`}
          >
            {importResults ? 'Import Another File' : isImporting ? 'Importing...' : 'Import Products'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkProductImport;
