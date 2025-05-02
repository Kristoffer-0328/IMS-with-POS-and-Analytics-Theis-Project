import React from 'react';
import { FiShoppingCart } from 'react-icons/fi';

// Represents a single item within the Cart display
function CartItem({ item, onRemoveItem, index, disabled }) {
  // Basic check for essential item properties
  if (!item || typeof item.price !== 'number' || typeof item.qty !== 'number') {
      console.warn('Invalid item passed to CartItem:', item);
      return null;
  }

  return (
    // Use a combination of a unique item identifier (like variantId) and index for the key
    <div key={item.variantId ? `${item.variantId}-${index}` : index} className="flex justify-between items-start p-2 bg-gray-50 rounded-lg">
      <div className="flex-1 pr-2">
        <div className="text-sm font-medium text-gray-800 break-words">{item.name || 'Unknown Item'}</div>
        <div className="text-xs text-gray-500">
          {item.qty} × ₱{item.price.toFixed(2)}
        </div>
      </div>
      <div className="flex flex-col items-end min-w-[70px] flex-shrink-0">
        <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
          ₱{(item.price * item.qty).toFixed(2)}
        </span>
        <button
          onClick={() => onRemoveItem(index)}
          className="text-xs text-red-500 hover:text-red-700 mt-0.5"
          disabled={disabled}
          aria-label={`Remove ${item.name || 'item'}`} // Accessibility improvement
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// The main Cart component displaying the list of CartItems
function Cart({ cartItems, onRemoveItem, isProcessing }) {
  return (
    <div className="flex-1 overflow-auto mb-3 pr-1"> {/* Added padding right for scrollbar visibility */}
      <h3 className="text-base font-semibold text-gray-800 mb-2">Order Details</h3>
      {cartItems.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-lg">
          <div className="text-center">
            <FiShoppingCart size={24} className="mx-auto mb-1" />
            <p className="text-sm">Cart is empty</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {cartItems.map((item, i) => (
            <CartItem
              // Ensure a unique key again, using variantId if available
              key={item.variantId ? `${item.variantId}-${i}` : i}
              item={item}
              onRemoveItem={onRemoveItem}
              index={i}
              disabled={isProcessing}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Cart;