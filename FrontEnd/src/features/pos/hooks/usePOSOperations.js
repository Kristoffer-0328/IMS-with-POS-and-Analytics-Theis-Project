import { useState, useEffect } from 'react';
import { useOfflineSupport } from './useOfflineSupport';
import { toast } from 'react-hot-toast';
import { validateStock } from '../services/IndexedDBService';

export function usePOSOperations() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getProducts, saveTransaction, isOnline } = useOfflineSupport();

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Load products with error handling
  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const fetchedProducts = await getProducts();
      setProducts(fetchedProducts);
    } catch (error) {
      toast.error('Failed to load products');
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle a new sale transaction
  const handleSale = async (saleData) => {
    try {
      // Validate stock before processing transaction
      try {
        await validateStock(saleData.items);
      } catch (error) {
        if (error.type === 'StockValidationError') {
          const itemErrors = error.items.map(item => 
            `${item.productName}: Requested ${item.requested}, Available ${item.available}`
          ).join('\n');
          
          toast.error(
            <div>
              <p>Insufficient stock for some items:</p>
              <pre className="mt-2 text-sm">{itemErrors}</pre>
            </div>,
            { duration: 5000 }
          );
          return false;
        }
        throw error;
      }

      const result = await saveTransaction({
        ...saleData,
        timestamp: new Date().toISOString(),
        status: 'pending'
      });

      if (result.success) {
        if (result.offline) {
          toast.success('Sale saved offline. Will sync when connection is restored.');
        } else {
          toast.success('Sale completed successfully');
        }
        return true;
      } else {
        toast.error(result.message || 'Failed to process sale');
        return false;
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error(error.message || 'Failed to process sale');
      return false;
    }
  };

  // Refresh products when coming back online
  useEffect(() => {
    if (isOnline) {
      loadProducts();
    }
  }, [isOnline]);

  return {
    products,
    isLoading,
    handleSale,
    refreshProducts: loadProducts
  };
} 