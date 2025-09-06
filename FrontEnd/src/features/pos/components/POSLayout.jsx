import React from 'react';
import { useOfflineSupport } from '../hooks/useOfflineSupport';
import ConnectionStatusBanner from './ConnectionStatusBanner';
import OfflineIndicator from './OfflineIndicator';
import { Toaster, toast } from 'react-hot-toast';

const POSLayout = ({ children }) => {
  const {
    isOnline,
    isInitialized,
    syncStatus,
    lastError,
    syncWithRetry
  } = useOfflineSupport();

  // Show error notifications
  React.useEffect(() => {
    if (lastError) {
      toast.error(lastError);
    }
  }, [lastError]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Connection Status Banner */}
      <ConnectionStatusBanner isOnline={isOnline} />

      {/* Header with Offline Indicator */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              Glory Sales POS
            </h1>
            <OfflineIndicator
              isOnline={isOnline}
              syncStatus={syncStatus}
              onSync={() => {
                toast.promise(syncWithRetry(), {
                  loading: 'Syncing...',
                  success: 'All changes synced',
                  error: 'Failed to sync changes'
                });
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-[1920px] mx-auto p-4">
          {children}
        </div>
      </main>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
};

export default POSLayout; 