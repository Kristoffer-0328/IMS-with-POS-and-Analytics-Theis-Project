import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCalendar, FiSearch } from 'react-icons/fi';
import { getFirestore, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../auth/services/FirebaseAuth';

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
  const [readNotifications, setReadNotifications] = useState(() => {
    const stored = localStorage.getItem('readNotifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Debug: Log when component renders
  

  useClickOutside(notificationsRef, () => setShowNotifications(false));

  useEffect(() => {
    if (!currentUser?.role) {
      return;
    }

    const userRole = currentUser.role;

    // Query notifications collection - include all notification types
    const notificationsQuery = query(
      collection(db, 'Notifications'),
      where('status', '==', 'active'),
      where('type', 'in', ['restocking_request', 'sale_completed', 'release_mobile_view', 'receiving_completed', 'release_completed', 'po_pending_approval', 'po_approved', 'po_rejected', 'draft_po_created']),
      orderBy('createdAt', 'desc')
    );

    // Set up real-time listener with error handling
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const allNotifications = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.createdAt || Date.now()
          };
        });

        // Filter notifications by user role
        const filteredNotifications = allNotifications.filter(notification => {
          if (notification.targetRoles && Array.isArray(notification.targetRoles)) {
            return notification.targetRoles.includes(userRole);
          }
          return true;
        });

        // Check for new notifications
        const newNotifications = filteredNotifications.filter(
          notification => !readNotifications.has(notification.id)
        );

        if (newNotifications.length > 0) {
          setHasNewNotification(true);
        }

        setNotifications(filteredNotifications);
        setError(null);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        setError(error.message);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [readNotifications, currentUser?.role]);

  // Add function to mark notifications as read
  const handleOpenNotifications = () => {
    setShowNotifications(true);
    // Mark all current notifications as read
    const newReadNotifications = new Set(readNotifications);
    notifications.forEach(notification => {
      newReadNotifications.add(notification.id);
    });
    setReadNotifications(newReadNotifications);
    localStorage.setItem('readNotifications', JSON.stringify(Array.from(newReadNotifications)));
    setHasNewNotification(false);
  };

  // Add this function
  const handleNotificationClick = (notification) => {
    setShowNotifications(false); // Close the dropdown
    if (!currentUser) {
      alert('You must be logged in to view this page.');
      return;
    }
    if (notification.type === 'restocking_request') {
      navigate('/im/restocking-request');
    } else if (notification.type === 'sale_completed' || notification.type === 'release_mobile_view' || notification.type === 'release_completed') {
      navigate('/im/inventory?tab=release');
    } else if (notification.type === 'receiving_completed') {
      navigate('/im/receiving');
    } else if (notification.type === 'po_pending_approval' || notification.type === 'po_approved' || notification.type === 'po_rejected' || notification.type === 'draft_po_created') {
      navigate('/admin/purchase-orders');
    }
  };

  // Function to get page title based on current path
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/admin':
        return 'Admin Dashboard'; 
      case '/admin/reports':
        return 'Reports & Logs';
      case '/admin/purchase-orders':
        return 'Purchase Orders';
      case '/im':
        return 'Dashboard Overview';
      case '/admin/storage-map':
        return 'Storage Facility Map';
      case '/admin/audit-trail':
        return 'Audit Trail';
      case '/admin/sytem-logs':
        return 'System Logs';
      case '/admin/transaction-history':
        return 'Transaction History';
      case '/im/inventory':
        return 'Stock Management';
      case '/im/restocking-request':
        return 'Restocking Requests';
      case '/im/receiving':
        return 'Receiving Management';
      case '/im/purchase-orders':
        return 'Purchase Orders';
      case '/im/stock-transfer':
        return 'Stock Transfer';
      case '/im/reports':
        return 'Reports & Logs';
      case '/im/settings':
        return 'Settings';
      case '/im/suppliers':
        return 'Supplier Management';
      default:
        return 'Glory Star Hardware';
    }
  };

  return (
    <div className="sticky top-4 z-50 mb-6">
      <div className="flex justify-between items-center bg-white rounded-xl shadow-lg border border-gray-100 p-4 backdrop-blur-sm bg-white/95">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">{getPageTitle()}</h1>
          <span className="hidden sm:inline-block px-3 py-1 bg-orange-100 text-orange-600 text-sm font-medium rounded-full">
            Overview
          </span>
        </div>

          <div className="flex items-center gap-6">
    
           
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
                              {notification.createdAt ? new Date(notification.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              notification.type === 'sale_completed'
                                ? 'bg-blue-100 text-blue-800'
                                : notification.type === 'receiving_completed'
                                ? 'bg-green-100 text-green-800'
                                : notification.type === 'release_completed' || notification.type === 'release_mobile_view'
                                ? 'bg-purple-100 text-purple-800'
                                : notification.type === 'po_pending_approval'
                                ? 'bg-amber-100 text-amber-800'
                                : notification.type === 'po_approved'
                                ? 'bg-green-100 text-green-800'
                                : notification.type === 'po_rejected'
                                ? 'bg-red-100 text-red-800'
                                : notification.type === 'draft_po_created'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {notification.type === 'sale_completed' ? 'Sale' : 
                               notification.type === 'receiving_completed' ? 'Receiving' :
                               notification.type === 'release_completed' || notification.type === 'release_mobile_view' ? 'Release' :
                               notification.type === 'po_pending_approval' ? 'PO Pending' :
                               notification.type === 'po_approved' ? 'PO Approved' :
                               notification.type === 'po_rejected' ? 'PO Rejected' :
                               notification.type === 'draft_po_created' ? 'PO Draft' :
                               'Restock Alert'}
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
                <p className="text-sm font-medium text-gray-800">{currentUser?.name || 'Loading...'}</p>
                <p className="text-xs text-gray-500 font-medium">{currentUser?.role || 'User'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-medium shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                {currentUser?.name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default React.memo(DashboardHeader);
