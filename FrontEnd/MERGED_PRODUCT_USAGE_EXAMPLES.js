/**
 * MERGED_PRODUCT_USAGE_EXAMPLES.js
 * 
 * Practical examples of using the merged product architecture
 */

import { listenToMergedProducts, getMergedProducts } from '../services/firebase/ProductServices';
import { applyProductFilters, filterProductsBySupplier } from '../models/MergedProduct';

// ============================================================================
// Example 1: Real-time Product List with Filters (POS/Inventory)
// ============================================================================

export const Example1_RealTimeProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);

  useEffect(() => {
    setLoading(true);

    // Listen to merged products from all collections
    const unsubscribe = listenToMergedProducts((mergedProducts) => {
      // Apply filters
      const filtered = applyProductFilters(mergedProducts, {
        searchQuery,
        category: selectedCategory,
        brand: selectedBrand
      });

      setProducts(filtered);
      setLoading(false);
    });

    return unsubscribe; // Cleanup on unmount
  }, [searchQuery, selectedCategory, selectedBrand]);

  return (
    <div>
      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div>
          {products.map(product => (
            <div key={product.id}>
              <h3>{product.name}</h3>
              <p>Stock: {product.totalStock}</p>
              <p>Variants: {product.totalVariants}</p>
              <p>Suppliers: {product.allSuppliers.join(', ')}</p>
              
              {product.variants.map(variant => (
                <div key={variant.variantId}>
                  <p>{variant.variantName} - ₱{variant.price}</p>
                  <p>Suppliers: {variant.suppliers.length}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 2: One-time Product Fetch (Reports/Exports)
// ============================================================================

export const Example2_GenerateReport = async () => {
  console.log('📊 Generating product report...');

  // Fetch merged products once
  const result = await getMergedProducts();

  if (!result.success) {
    console.error('Failed to fetch products:', result.error);
    return;
  }

  const products = result.products;

  // Generate report data
  const report = {
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + p.totalStock, 0),
    totalValue: products.reduce((sum, p) => {
      const value = p.variants.reduce((vSum, v) => 
        vSum + (v.quantity * v.price), 0
      );
      return sum + value;
    }, 0),
    lowStockProducts: products.filter(p => p.totalStock < 10),
    outOfStockProducts: products.filter(p => p.totalStock === 0),
    productsByCategory: {}
  };

  // Group by category
  products.forEach(product => {
    if (!report.productsByCategory[product.category]) {
      report.productsByCategory[product.category] = [];
    }
    report.productsByCategory[product.category].push(product);
  });

  console.log('✅ Report generated:', report);
  return report;
};

// ============================================================================
// Example 3: Filter Products by Supplier
// ============================================================================

export const Example3_FilterBySupplier = () => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    const unsubscribe = listenToMergedProducts((mergedProducts) => {
      // Get unique suppliers
      const uniqueSuppliers = new Set();
      mergedProducts.forEach(p => {
        p.allSuppliers.forEach(s => uniqueSuppliers.add(s));
      });
      setSuppliers(Array.from(uniqueSuppliers));

      // Filter by selected supplier
      if (selectedSupplier) {
        const filtered = filterProductsBySupplier(mergedProducts, selectedSupplier);
        setProducts(filtered);
      } else {
        setProducts(mergedProducts);
      }
    });

    return unsubscribe;
  }, [selectedSupplier]);

  return (
    <div>
      <select onChange={(e) => setSelectedSupplier(e.target.value)}>
        <option value="">All Suppliers</option>
        {suppliers.map(supplier => (
          <option key={supplier} value={supplier}>{supplier}</option>
        ))}
      </select>

      <div>
        {products.map(product => (
          <div key={product.id}>
            <h3>{product.name}</h3>
            <p>Available from: {product.allSuppliers.join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Example 4: Display Variant with Supplier Pricing
// ============================================================================

export const Example4_VariantSupplierPricing = ({ variantId }) => {
  const [variant, setVariant] = useState(null);

  useEffect(() => {
    const unsubscribe = listenToMergedProducts((mergedProducts) => {
      // Find variant across all products
      for (const product of mergedProducts) {
        const found = product.variants.find(v => v.variantId === variantId);
        if (found) {
          setVariant(found);
          break;
        }
      }
    });

    return unsubscribe;
  }, [variantId]);

  if (!variant) return <p>Loading variant...</p>;

  return (
    <div>
      <h3>{variant.variantName}</h3>
      <p>Current Price: ₱{variant.price}</p>
      <p>Current Stock: {variant.quantity} {variant.unit}</p>

      <h4>Suppliers:</h4>
      {variant.suppliers.length === 0 ? (
        <p>No suppliers linked</p>
      ) : (
        <ul>
          {variant.suppliers.map(supplier => (
            <li key={supplier.id}>
              <strong>{supplier.name}</strong> ({supplier.primaryCode})
              <br />
              Supplier Price: ₱{supplier.supplierPrice}
              <br />
              SKU: {supplier.supplierSKU}
              <br />
              Lead Time: {supplier.leadTime} days
              <br />
              Contact: {supplier.contactPerson} - {supplier.phone}
            </li>
          ))}
        </ul>
      )}

      {variant.primarySupplier && (
        <div>
          <h4>Primary Supplier:</h4>
          <p>{variant.primarySupplier.name}</p>
          <p>₱{variant.primarySupplier.supplierPrice}</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 5: Advanced Filtering and Search
// ============================================================================

export const Example5_AdvancedFiltering = () => {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    searchQuery: '',
    category: null,
    brand: null,
    supplier: null,
    minPrice: 0,
    maxPrice: Infinity,
    inStockOnly: false
  });

  useEffect(() => {
    const unsubscribe = listenToMergedProducts((mergedProducts) => {
      // Apply basic filters from model
      let filtered = applyProductFilters(mergedProducts, {
        searchQuery: filters.searchQuery,
        category: filters.category,
        brand: filters.brand,
        supplier: filters.supplier
      });

      // Apply custom filters
      if (filters.inStockOnly) {
        filtered = filtered.filter(p => p.isInStock);
      }

      if (filters.minPrice > 0 || filters.maxPrice < Infinity) {
        filtered = filtered.filter(p => 
          p.lowestPrice >= filters.minPrice && 
          p.lowestPrice <= filters.maxPrice
        );
      }

      setProducts(filtered);
    });

    return unsubscribe;
  }, [filters]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        value={filters.searchQuery}
        onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
      />

      <label>
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => setFilters({ ...filters, inStockOnly: e.target.checked })}
        />
        In Stock Only
      </label>

      <input
        type="number"
        placeholder="Min Price"
        value={filters.minPrice}
        onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
      />

      <input
        type="number"
        placeholder="Max Price"
        value={filters.maxPrice === Infinity ? '' : filters.maxPrice}
        onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) || Infinity })}
      />

      <div>
        {products.map(product => (
          <div key={product.id}>
            <h3>{product.name}</h3>
            <p>Price Range: ₱{product.lowestPrice} - ₱{product.highestPrice}</p>
            <p>Stock: {product.totalStock}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Example 6: Supplier Comparison for Purchase Orders
// ============================================================================

export const Example6_SupplierComparison = ({ productId }) => {
  const [product, setProduct] = useState(null);
  const [supplierComparison, setSupplierComparison] = useState([]);

  useEffect(() => {
    const unsubscribe = listenToMergedProducts((mergedProducts) => {
      const found = mergedProducts.find(p => p.id === productId);
      setProduct(found);

      if (found) {
        // Build supplier comparison
        const comparison = [];
        
        found.variants.forEach(variant => {
          variant.suppliers.forEach(supplier => {
            comparison.push({
              variantName: variant.variantName,
              variantId: variant.variantId,
              supplierName: supplier.name,
              supplierId: supplier.id,
              supplierPrice: supplier.supplierPrice,
              leadTime: supplier.leadTime,
              contactPerson: supplier.contactPerson,
              phone: supplier.phone
            });
          });
        });

        // Sort by price
        comparison.sort((a, b) => a.supplierPrice - b.supplierPrice);
        setSupplierComparison(comparison);
      }
    });

    return unsubscribe;
  }, [productId]);

  if (!product) return <p>Loading product...</p>;

  return (
    <div>
      <h2>{product.name}</h2>
      
      <h3>Supplier Price Comparison</h3>
      <table>
        <thead>
          <tr>
            <th>Variant</th>
            <th>Supplier</th>
            <th>Price</th>
            <th>Lead Time</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          {supplierComparison.map((row, index) => (
            <tr key={index}>
              <td>{row.variantName}</td>
              <td>{row.supplierName}</td>
              <td>₱{row.supplierPrice.toFixed(2)}</td>
              <td>{row.leadTime} days</td>
              <td>{row.contactPerson} ({row.phone})</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// Example 7: Low Stock Alert with Supplier Info
// ============================================================================

export const Example7_LowStockAlert = ({ threshold = 10 }) => {
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    const unsubscribe = listenToMergedProducts((mergedProducts) => {
      // Find low stock products
      const lowStock = mergedProducts.filter(p => 
        p.totalStock > 0 && p.totalStock <= threshold
      );

      // Enrich with supplier info
      const enriched = lowStock.map(product => ({
        ...product,
        lowStockVariants: product.variants.filter(v => 
          v.quantity > 0 && v.quantity <= threshold
        )
      }));

      setLowStockProducts(enriched);
    });

    return unsubscribe;
  }, [threshold]);

  return (
    <div>
      <h2>Low Stock Alert (≤ {threshold} units)</h2>
      
      {lowStockProducts.length === 0 ? (
        <p>No low stock products</p>
      ) : (
        <ul>
          {lowStockProducts.map(product => (
            <li key={product.id}>
              <strong>{product.name}</strong> - Total Stock: {product.totalStock}
              
              <ul>
                {product.lowStockVariants.map(variant => (
                  <li key={variant.variantId}>
                    {variant.variantName} - {variant.quantity} {variant.unit} left
                    
                    {variant.suppliers.length > 0 && (
                      <div>
                        <small>
                          Reorder from: {variant.primarySupplier?.name || variant.suppliers[0]?.name}
                          {' '}(Lead time: {variant.primarySupplier?.leadTime || variant.suppliers[0]?.leadTime} days)
                        </small>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ============================================================================
// Example 8: Export to CSV with Supplier Data
// ============================================================================

export const Example8_ExportToCSV = async () => {
  console.log('📄 Exporting products to CSV...');

  const result = await getMergedProducts();
  if (!result.success) {
    console.error('Failed to fetch products');
    return;
  }

  const products = result.products;

  // Build CSV rows
  const rows = [
    ['Product ID', 'Product Name', 'Category', 'Brand', 'Variant', 'Stock', 'Price', 'Suppliers', 'Primary Supplier']
  ];

  products.forEach(product => {
    product.variants.forEach(variant => {
      rows.push([
        product.id,
        product.name,
        product.category,
        product.brand,
        variant.variantName,
        variant.quantity,
        variant.price,
        variant.suppliers.map(s => s.name).join('; '),
        variant.primarySupplier?.name || 'N/A'
      ]);
    });
  });

  // Convert to CSV string
  const csv = rows.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products_export.csv';
  link.click();

  console.log('✅ Export complete');
};

export default {
  Example1_RealTimeProductList,
  Example2_GenerateReport,
  Example3_FilterBySupplier,
  Example4_VariantSupplierPricing,
  Example5_AdvancedFiltering,
  Example6_SupplierComparison,
  Example7_LowStockAlert,
  Example8_ExportToCSV
};
