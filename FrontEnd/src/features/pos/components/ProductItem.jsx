import React from 'react';
import { FiShoppingCart, FiPackage } from 'react-icons/fi';

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
  return product?.image;
};

function ProductItem({ product, onAddProduct, disabled }) {
  if (!product || !product.id || !product.variants) {
    console.warn("ProductItem received invalid product prop:", product);
    return null; // Don't render if product data is invalid
  }

  // Calculate stock and price display
  const totalStock = Number(product.quantity) || 0;
  const isOutOfStock = totalStock <= 0;

  const prices = product.variants.map(v => v.price).filter(price => typeof price === 'number' && price > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceDisplay = minPrice === maxPrice
    ? `₱${minPrice.toFixed(2)}`
    : `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`;

  return (
    <div
      className={`group bg-white rounded-xl shadow-sm border border-gray-200 hover:border-orange-200 p-4 flex flex-col 
      transition-all duration-300 hover:shadow-lg hover:shadow-orange-100 ${isOutOfStock ? 'opacity-60' : ''}`}
    >
      {/* Stock Badge */}
      <div className="relative">
        {isOutOfStock ? (
          <span className="absolute -top-2 -right-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium z-10">
            Out of Stock
          </span>
        ) : totalStock <= 5 && (
          <span className="absolute -top-2 -right-2 bg-amber-100 text-amber-600 text-xs px-2 py-1 rounded-full font-medium z-10">
            Low Stock: {totalStock}
          </span>
        )}
      </div>

      {/* Image Container */}
      <div className="relative h-36 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg flex items-center justify-center mb-3 p-2 overflow-hidden group-hover:scale-[1.02] transition-transform">
        <img
          key={product.id + '-img'}
          src={getProductImage(product)}
          alt={product.name}
          className="max-h-full max-w-full object-contain drop-shadow-sm"
          onError={handleImageError}
          loading="lazy"
        />
        {product.hasVariants && product.variants.length > 0 && (
          <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-600 flex items-center gap-1">
            <FiPackage size={12} />
            {product.variants.length} options
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 mb-3 space-y-2">
        <h3 className="font-medium text-gray-800 line-clamp-2 group-hover:text-orange-600 transition-colors" 
            title={product.name}>
          {product.name || 'Unnamed Product'}
        </h3>
        
        <div className="flex items-baseline gap-2">
          <p className={`text-lg font-bold ${minPrice > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            {minPrice > 0 ? priceDisplay : 'N/A'}
          </p>
          {minPrice !== maxPrice && (
            <span className="text-xs text-gray-400">Multiple prices</span>
          )}
        </div>

        <p className={`text-sm flex items-center gap-1.5 
          ${isOutOfStock ? 'text-red-500' : totalStock <= 5 ? 'text-amber-600' : 'text-gray-500'}`}
        >
          <span className="inline-block w-2 h-2 rounded-full 
            ${isOutOfStock ? 'bg-red-500' : totalStock <= 5 ? 'bg-amber-500' : 'bg-green-500'}"
          />
          {isOutOfStock ? 'Out of stock' : `${totalStock} in stock`}
        </p>
      </div>

      {/* Add Button */}
      <button
        onClick={() => onAddProduct(product)}
        disabled={isOutOfStock || disabled}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2
          transition-all duration-200
          ${isOutOfStock || disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white shadow-sm hover:shadow-md hover:shadow-orange-100'
          }`}
      >
        <FiShoppingCart size={16} />
        <span>
          {product.hasVariants && product.variants.length > 0 
            ? 'Select Options' 
            : 'Add to Cart'}
        </span>
      </button>
    </div>
  );
}

export default ProductItem;