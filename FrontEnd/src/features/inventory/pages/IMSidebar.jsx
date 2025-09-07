import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/services/FirebaseAuth';
import {
  FiHome,
  FiPackage,
  FiRefreshCw,
  FiClipboard,
  FiFileText,
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiShoppingBag,
  FiTruck,
  FiAlertCircle,
  FiUsers
} from 'react-icons/fi';
import GloryStarLogo from '../../../assets/Glory_Star_Logo.png';

const IMSidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { 
      path: '/im', 
      icon: <FiHome size={20} />, 
      label: 'Overview',
      badge: null
    },
    { 
      path: '/im/inventory', 
      icon: <FiPackage size={20} />, 
      label: 'Stock Management',
      badge: null
    },
    { 
      path: '/im/restocking-request', 
      icon: <FiAlertCircle size={20} />, 
      label: 'Restock Requests',
      badge: null
    },
    { 
      path: '/im/receiving', 
      icon: <FiTruck size={20} />, 
      label: 'Receiving',
      badge: 0
    },
    { 
      path: '/im/purchase-orders', 
      icon: <FiShoppingBag size={20} />, 
      label: 'Purchase Orders',
      badge: null
    },
    { 
      path: '/im/suppliers', 
      icon: <FiUsers size={20} />, 
      label: 'Supplier Management',
      badge: null
    },
    { 
      path: '/im/stock-transfer', 
      icon: <FiRefreshCw size={20} />, 
      label: 'Stock Transfer',
      badge: null
    },
    { 
      path: '/im/reports', 
      icon: <FiFileText size={20} />, 
      label: 'Reports & Logs',
      badge: null
    },
    { 
      path: '/im/settings', 
      icon: <FiSettings size={20} />, 
      label: 'Settings',
      badge: null
    },
  ];

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Sidebar for larger screens */}
      <div
        className={`fixed top-0 left-0 h-screen bg-white shadow-lg transition-all duration-300 ease-in-out z-50
          ${collapsed ? 'w-[70px]' : 'w-[250px]'} 
          hidden sm:flex flex-col
        `}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          {!collapsed && (
            <h2 className="">
             <img
                src={GloryStarLogo}
                alt="Glory Star Logo"
                className="h-15 w-15 mx-auto mb-2"
                />
            </h2>
          )}
          <button
            onClick={handleToggle}
            className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600
              ${collapsed ? 'mx-auto' : 'ml-auto'}`}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <ul className="mt-2 flex-1">
          {navItems.map((item) => (
            <li key={item.path} className="mb-1">
              <Link
                to={item.path}
                className={`flex items-center px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50
                  ${
                    location.pathname === item.path
                      ? 'bg-orange-50 text-[#ff7b54] font-medium border-l-4 border-[#ff7b54]'
                      : 'border-l-4 border-transparent'
                  }`}
              >
                <span
                  className={`text-lg ${
                    location.pathname === item.path
                      ? 'text-[#ff7b54]'
                      : 'text-gray-500'
                  }`}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 ml-3">
                    <span className="truncate">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
                {collapsed && item.badge > 0 && (
                  <span className="absolute right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {/* Logout Button */}
          <li className="mb-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 border-l-4 border-transparent"
            >
              <span className="text-lg text-gray-500">
                <FiLogOut size={20} />
              </span>
              {!collapsed && (
                <span className="ml-3 truncate">Logout</span>
              )}
            </button>
          </li>
        </ul>
      </div>

      {/* Bottom Navigation for mobile screens */}
      <div className="sm:hidden fixed bottom-0 left-0 w-full bg-white shadow-lg z-50 flex justify-around items-center border-t border-gray-200">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center p-3 transition-colors relative
              ${
                location.pathname === item.path
                  ? 'text-[#ff7b54] bg-orange-50'
                  : 'text-gray-500'
              }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
            {item.badge > 0 && (
              <span className="absolute top-2 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </>
  );
};

export default IMSidebar;
