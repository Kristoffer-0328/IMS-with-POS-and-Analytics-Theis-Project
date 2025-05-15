import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCalendar } from 'react-icons/fi';
import { getFirestore, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import { useNavigate } from 'react-router-dom';

// Add this hook to the same file
const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};


const DashboardHeader = () => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [error, setError] = useState(null);
  const db = getFirestore(app);
  const notificationsRef = useRef(null);
  const [readNotifications, setReadNotifications] = useState(new Set());
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const navigate = useNavigate();

  useClickOutside(notificationsRef, () => setShowNotifications(false));

  useEffect(() => {
    // Query notifications collection
    const notificationsQuery = query(
      collection(db, 'Notifications'),
      where('status', '==', 'pending'),
      where('type', '==', 'restock_alert')
    );

    console.log("Setting up notifications listener...");

    // Set up real-time listener with error handling
    const unsubscribe = onSnapshot(
      notificationsQuery, 
      (snapshot) => {
        const notificationsList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.createdAt || Date.now()
          };
        });

        // Check for new notifications
        const newNotifications = notificationsList.filter(
          notification => !readNotifications.has(notification.id)
        );

        if (newNotifications.length > 0) {
          setHasNewNotification(true);
          // Optional: Play a sound or show a browser notification
        }

        setNotifications(notificationsList);
        setError(null);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        setError(error.message);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [readNotifications]);

  // Add function to mark notifications as read
  const handleOpenNotifications = () => {
    setShowNotifications(true);
    // Mark all current notifications as read
    const newReadNotifications = new Set(readNotifications);
    notifications.forEach(notification => {
      newReadNotifications.add(notification.id);
    });
    setReadNotifications(newReadNotifications);
    setHasNewNotification(false);
  };

  // Add this function
  const handleNotificationClick = (notification) => {
    if (notification.type === 'restock_alert') {
      setShowNotifications(false); // Close the dropdown
      navigate('/im/restocking-request'); // Navigate to restocking page
    }
  };

  // Add error display if needed
  if (error) {
    console.error("Notification Error:", error);
  }

  return (
    <div className="flex justify-between items-center mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <span className="hidden sm:inline-block px-3 py-1 bg-orange-100 text-orange-600 text-sm font-medium rounded-full">
          Overview
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Date picker button */}
        <button className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <FiCalendar size={20} />
          <span className="hidden sm:inline-block ml-2 text-sm">Today</span>
        </button>

        {/* Notification Button with Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button 
            className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            onClick={handleOpenNotifications}
          >
            <FiBell size={20} className={hasNewNotification ? 'animate-bounce' : ''} />
            {notifications.filter(n => !readNotifications.has(n.id)).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full animate-pulse">
                {notifications.filter(n => !readNotifications.has(n.id)).length}
              </span>
            )}
            {hasNewNotification && (
              <span className="absolute -top-1 -right-1 w-5 h-5 border-4 border-orange-500 rounded-full animate-ping" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer ${
                        !readNotifications.has(notification.id) ? 'bg-orange-50' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800">
                        {notification.message}
                        {!readNotifications.has(notification.id) && (
                          <span className="ml-2 text-xs font-medium text-orange-500">New</span>
                        )}
                      </p>
                      <div className="mt-1 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-600 rounded-full">
                          Restock Alert
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800">I love Toff</p>
            <p className="text-xs text-gray-500 font-medium">Administrator</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-medium shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            IT
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
