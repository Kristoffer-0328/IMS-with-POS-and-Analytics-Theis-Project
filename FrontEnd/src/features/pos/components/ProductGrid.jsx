import React from 'react';
import { FiPlus, FiPackage } from 'react-icons/fi';

const ProductCard = ({ product, onAddProduct, disabled }) => {
  const firstVariant = product.variants[0];
  const lowestPrice = Math.min(...product.variants.map(v => v.price));
  const totalStock = product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
  const hasMultipleVariants = product.variants.length > 1;

  const formatPrice = (price) => {
    return `₱${Number(price).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="aspect-square relative overflow-hidden bg-gray-50">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <FiPackage size={40} />
          </div>
        )}
        {hasMultipleVariants && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
            {product.variants.length} variants
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="mb-2">
          <h3 className="font-medium text-gray-900 line-clamp-1">{product.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-1">{product.category}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-orange-600">
              <span className="font-medium text-base">
                {hasMultipleVariants 
                  ? `From ${formatPrice(lowestPrice)}` 
                  : formatPrice(firstVariant.price)
                }
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Stock: {totalStock}
            </p>
          </div>
          
          <button
            onClick={() => onAddProduct(product)}
            disabled={disabled || totalStock === 0}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              totalStock === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            }`}
          >
            <FiPlus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductGrid = ({ products, onAddProduct, loading, disabled }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-xl mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
        <p className="mt-1 text-sm text-gray-500">
          No products match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddProduct={onAddProduct}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default ProductGrid;