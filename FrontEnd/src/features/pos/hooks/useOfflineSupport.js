import { useState, useEffect, useCallback } from 'react';
import * as IndexedDB from '../services/IndexedDBService';

export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({ hasPendingTransactions: false, pendingCount: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Initialize IndexedDB and check sync status
  useEffect(() => {
    async function init() {
      try {
        await IndexedDB.initDB();
        const status = await IndexedDB.checkSyncStatus();
        setSyncStatus(status);
        setIsInitialized(true);
        setLastError(null);
      } catch (error) {
        console.error('Failed to initialize offline support:', error);
        setLastError('Failed to initialize offline storage');
      }
    }
    init();
  }, []);

  // Monitor online/offline status with connection check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health-check', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        setIsOnline(response.ok);
        if (response.ok) setLastError(null);
      } catch (error) {
        setIsOnline(false);
        setLastError('Connection failed');
      }
    };

    const handleOnline = () => {
      checkConnection();
      // Don't set isOnline immediately, wait for actual check
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastError('Connection lost');
    };

    // Initial check
    checkConnection();

    // Set up listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic check when online
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  // Auto-sync with retry logic
  const syncWithRetry = useCallback(async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        await IndexedDB.syncData();
        const status = await IndexedDB.checkSyncStatus();
        setSyncStatus(status);
        setLastError(null);
        return true;
      } catch (error) {
        console.error(`Sync attempt ${i + 1} failed:`, error);
        if (i === retries - 1) {
          setLastError('Failed to sync changes');
          return false;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }, []);

  useEffect(() => {
    if (isOnline && syncStatus.hasPendingTransactions) {
      syncWithRetry();
    }
  }, [isOnline, syncStatus.hasPendingTransactions, syncWithRetry]);

  const saveTransaction = async (transaction) => {
    try {
      if (!isOnline) {
        await IndexedDB.savePendingTransaction(transaction);
        const status = await IndexedDB.checkSyncStatus();
        setSyncStatus(status);
        return { 
          success: true, 
          offline: true,
          message: 'Transaction saved offline'
        };
      }

      // Try online transaction
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction)
        });

        if (!response.ok) throw new Error('Network response was not ok');
        
        return { 
          success: true, 
          offline: false,
          message: 'Transaction completed'
        };
      } catch (error) {
        // Fall back to offline storage
        await IndexedDB.savePendingTransaction(transaction);
        const status = await IndexedDB.checkSyncStatus();
        setSyncStatus(status);
        setLastError('Connection failed, saved offline');
        return { 
          success: true, 
          offline: true,
          message: 'Saved offline due to connection error'
        };
      }
    } catch (error) {
      setLastError('Failed to save transaction');
      return { 
        success: false, 
        error: error.message,
        message: 'Failed to save transaction'
      };
    }
  };

  const getProducts = async () => {
    try {
      if (!isOnline) {
        const products = await IndexedDB.getProducts();
        if (products.length === 0) {
          setLastError('No cached products available offline');
        }
        return products;
      }

      // Try to fetch from server and update local cache
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const products = await response.json();
        await IndexedDB.saveProducts(products);
        setLastError(null);
        return products;
      } catch (error) {
        setLastError('Failed to fetch products, using cached data');
        return await IndexedDB.getProducts();
      }
    } catch (error) {
      setLastError('Failed to get products');
      return [];
    }
  };

  return {
    isOnline,
    isInitialized,
    syncStatus,
    lastError,
    saveTransaction,
    getProducts,
    syncWithRetry,
  };
} 
