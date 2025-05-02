import React from 'react';
import ProductItem from './ProductItem'; // Adjust path as needed

function ProductGrid({ products, onAddProduct, loading, searchQuery, disabled }) {

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400">
        Loading inventory...
      </div>
    );
  }

  if (products.length === 0 && searchQuery) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400">
        No products found matching "{searchQuery}"
      </div>
    );
  }

  if (products.length === 0 && !searchQuery) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400">
        No products available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map(p => (
        <ProductItem
          // Ensure product 'p' has a unique 'id' from the grouping logic
          key={p.id}
          product={p}
          onAddProduct={onAddProduct}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

export default ProductGrid;