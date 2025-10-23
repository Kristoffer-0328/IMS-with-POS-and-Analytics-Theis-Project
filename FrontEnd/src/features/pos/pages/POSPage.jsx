import React, { useState, useEffect } from 'react';
import POSLayout from '../components/POSLayout';
import { usePOSOperations } from '../hooks/usePOSOperations';
import { FiSearch, FiFilter } from 'react-icons/fi';

const POSPage = () => {
  const { products, isLoading, handleSale } = usePOSOperations();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Filter and search products
  useEffect(() => {
    let result = [...products];
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(product => product.category === selectedCategory);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.id.toString().includes(term)
      );
    }
    
    setFilteredProducts(result);
  }, [products, searchTerm, selectedCategory]);

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category))];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + K for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input').focus();
      }
      // Ctrl/Cmd + Enter for checkout
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const saleData = {
      items: cart,
      total: calculateTotal(),
      createdAt: new Date().toISOString()
    };

    const success = await handleSale(saleData);
    if (success) {
      setCart([]);
    }
  };

  return (
    <POSLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Products Section */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="search-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products... (Ctrl + K)"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  />
                </div>
                {/* Categories */}
                <div className="flex items-center gap-2">
                  <FiFilter className="text-gray-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No products found
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.quantity <= 0}
                      className={`p-4 border rounded-lg hover:shadow-md transition-shadow text-left ${
                        product.quantity <= 0 ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-sm font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.category}</div>
                      {product.isVariant && (product.size || product.specifications) && (
                        <div className="text-xs text-blue-600 mt-1">
                          {product.size && `Size: ${product.size}`}
                          {product.size && product.specifications && ' • '}
                          {product.specifications && `Spec: ${product.specifications}`}
                        </div>
                      )}
                      <div className="text-sm text-gray-600 mt-1">₱{product.price?.toFixed(2) || '0.00'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Stock: {product.quantity} {product.unit}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Cart</h2>
            </div>
            <div className="p-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Cart is empty</p>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        {item.isVariant && (item.size || item.specifications) && (
                          <div className="text-xs text-blue-600">
                            {item.size && `Size: ${item.size}`}
                            {item.size && item.specifications && ' • '}
                            {item.specifications && `Spec: ${item.specifications}`}
                          </div>
                        )}
                        <div className="text-sm text-gray-600">₱{item.price?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-gray-600 hover:text-gray-900"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 text-gray-600 hover:text-gray-900"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>₱{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Checkout (Ctrl + Enter)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </POSLayout>
  );
};

export default POSPage; 
