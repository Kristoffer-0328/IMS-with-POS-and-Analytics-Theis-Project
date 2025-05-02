import React from 'react';
import { FiShoppingCart } from 'react-icons/fi';

// Helper function to handle image errors (can be moved to a util if used elsewhere)
const handleImageError = (e) => {
  // Make sure '/images/placeholder.png' path is correct relative to your public folder
  const placeholderSrc = '/images/placeholder.png';
  if (e.target.src !== placeholderSrc) {
    console.warn(`Image failed to load: ${e.target.currentSrc || e.target.src}. Using placeholder.`);
    e.target.src = placeholderSrc;
    e.target.onerror = null; // Prevent infinite loops if placeholder also fails
  }
};

// Helper function to get the image URL (can be moved to a util)
const getProductImage = (product) => {
  // Make sure '/images/placeholder.png' path is correct relative to your public folder
  return product?.image ;
};


function ProductItem({ product, onAddProduct, disabled }) {
  if (!product || !product.id || !product.variants) {
    console.warn("ProductItem received invalid product prop:", product);
    return null; // Don't render if product data is invalid
  }

  // Calculate stock and price display
  const totalStock = product.variants?.length > 0
    ? product.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
    : Number(product.quantity) || 0;
  const isOutOfStock = totalStock <= 0;

  const prices = product.variants.map(v => v.price).filter(price => typeof price === 'number' && price > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceDisplay = minPrice === maxPrice
    ? `₱${minPrice.toFixed(2)}`
    : `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col hover:shadow-md transition duration-150 ${isOutOfStock ? 'opacity-50' : ''}`}
    >
      {/* Image Container */}
      <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-2 p-1 overflow-hidden">
        <img
          // Use product.id in key if images are likely to change for same name/id
          key={product.id + '-img'}
          src={getProductImage(product)}
          alt={product.name}
          className="max-h-full max-w-full object-contain"
          onError={handleImageError}
          loading="lazy"
        />
      </div>
      {/* Details */}
      <div className="flex-1 mb-2">
        <h3 className="font-medium text-sm text-gray-800 line-clamp-2" title={product.name}>{product.name || 'Unnamed Product'}</h3>
        <p className={`mt-1 text-base font-semibold ${minPrice > 0 ? 'text-green-600' : 'text-gray-500'}`}>
          {minPrice > 0 ? priceDisplay : 'Price unavailable'}
        </p>
        <p className={`text-xs mt-1 ${isOutOfStock ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
          {isOutOfStock ? 'Out of stock' : `${totalStock} total in stock`}
          {product.hasVariants && product.variants.length > 0 && ` (${product.variants.length} options)`}
        </p>
      </div>
      {/* Add Button */}
      <button
        onClick={() => onAddProduct(product)}
        className={`mt-auto w-full py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-1.5 ${isOutOfStock || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isOutOfStock || disabled}
      >
        <FiShoppingCart size={14} />
        <span>{product.hasVariants && product.variants.length > 0 ? 'Select Option' : 'Add to Cart'}</span>
      </button>
    </div>
  );
}

export default ProductItem;