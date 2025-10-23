import React, { useState, useEffect } from 'react';
import { FiX, FiWifiOff, FiAlertCircle } from 'react-icons/fi';

const ConnectionStatusBanner = ({ isOnline, onDismiss }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
    }
  }, [isOnline]);

  if (!show || isOnline) return null;

  return (
    <div className="bg-red-50 border-b border-red-200">
      <div className="max-w-[1920px] mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-red-700">
            <FiWifiOff className="flex-shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-medium">Connection failed</span>
              <span className="hidden sm:inline text-red-600">
                • Working in offline mode. Changes will sync when connection is restored.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setShow(false);
              onDismiss?.();
            }}
            className="p-1 text-red-500 hover:text-red-700 rounded-full"
          >
            <FiX />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatusBanner; 
