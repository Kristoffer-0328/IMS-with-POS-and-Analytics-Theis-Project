import React, { useState, useEffect, useCallback } from 'react';
import { FiX } from 'react-icons/fi';
import { useServices } from '../../../../services/firebase/ProductServices';

const SupplierProducts = ({ supplier, onClose }) => {
  const { products } = useServices();
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Memoize the filter function
  const filterProducts = useCallback((supplier, products) => {
    if (!supplier || !products) return [];
    
    // Get all supplier codes to check against
    const supplierCodesToCheck = [supplier.code, ...(supplier.supplierCodes || []).map(sc => sc.code)];
    
    console.log('Checking supplier codes:', supplierCodesToCheck);
    
    // Filter products for this supplier
    return products.filter(product => {
      // Check both supplier.code and supplierCode fields
      const matchesSupplierCode = (
        supplierCodesToCheck.includes(product.supplier?.code) ||
        supplierCodesToCheck.includes(product.supplierCode) ||
        product.variants?.some(variant => 
          supplierCodesToCheck.includes(variant.supplier?.code) ||
          supplierCodesToCheck.includes(variant.supplierCode)
        )
      );

      if (matchesSupplierCode) {
        console.log('Matched product:', {
          name: product.name,
          supplierCode: product.supplierCode,
          supplier: product.supplier
        });
      }

      return matchesSupplierCode;
    });
  }, []); // Empty dependency array since it doesn't use any external values

  // Use the memoized filter function in useEffect
  useEffect(() => {
    if (supplier && products) {
      setLoading(true);
      
      const filteredProducts = filterProducts(supplier, products);
      console.log('Supplier codes to check:', [supplier.code, ...(supplier.supplierCodes || []).map(sc => sc.code)]);
      console.log('Filtered products:', filteredProducts);
      
      setSupplierProducts(filteredProducts);
      setLoading(false);
    }
  }, [supplier, products, filterProducts]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            Products from {supplier?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="text-center py-4">Loading products...</div>
          ) : supplierProducts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No products found for this supplier
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-2">Supplier Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">Code:</span> {supplier.code}</p>
                    <p><span className="font-medium">Contact:</span> {supplier.contactPerson}</p>
                    <p><span className="font-medium">Phone:</span> {supplier.phone}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Email:</span> {supplier.email}</p>
                    <p><span className="font-medium">Address:</span> {supplier.address}</p>
                  </div>
                </div>
              </div>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.quantity} {product.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₱{(product.variants?.[0]?.unitPrice || product.unitPrice || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierProducts; 