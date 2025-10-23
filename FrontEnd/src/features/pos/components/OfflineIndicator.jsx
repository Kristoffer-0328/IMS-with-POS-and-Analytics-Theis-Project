import React from 'react';
import { FiCloud, FiCloudOff, FiRefreshCw } from 'react-icons/fi';

const OfflineIndicator = ({ isOnline, syncStatus, onSync }) => {
  const { hasPendingTransactions, pendingCount } = syncStatus;

  if (isOnline && !hasPendingTransactions) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <FiCloud className="w-4 h-4" />
        <span className="text-sm">Online</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <FiCloudOff className="w-4 h-4" />
        <span className="text-sm">Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-yellow-600">
        <FiCloud className="w-4 h-4" />
        <span className="text-sm">
          {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
        </span>
      </div>
      <button
        onClick={onSync}
        className="p-1 text-yellow-600 hover:text-yellow-700 rounded-full"
        title="Sync now"
      >
        <FiRefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
};

export default OfflineIndicator; 
