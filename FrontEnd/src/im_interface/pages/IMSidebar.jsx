import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Add useNavigate
import { useAuth } from '../../contexts/AuthContext'; // Add this import
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
} from 'react-icons/fi';

const IMSidebar = ({ onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate(); // Add this
  const { logout } = useAuth(); // Add this
  const [collapsed, setCollapsed] = useState(false);

  // Add logout handler
  const handleLogout = () => {
    logout();
    navigate('/'); // Navigate to login page
  };

  // Rest of your existing useEffect code...

  const navItems = [
    { path: '/im', icon: <FiHome size={20} />, label: 'Dashboard' },
    {
      path: '/im/inventory',
      icon: <FiPackage size={20} />,
      label: 'Inventory',
    },
    {
      path: '/im/stock-transfer',
      icon: <FiRefreshCw size={20} />,
      label: 'Stock Transfer',
    },
    {
      path: '/im/restocking-request',
      icon: <FiClipboard size={20} />,
      label: 'Restocking Request',
    },
    {
      path: '/im/reports',
      icon: <FiFileText size={20} />,
      label: 'Reports and Logs',
    },
    {
      path: '/im/settings',
      icon: <FiSettings size={20} />,
      label: 'Settings',
    },
    // Change the logout item to use onClick instead of Link
    {
      path: '#', // Changed from '/logout' to '#'
      icon: <FiLogOut size={20} />,
      label: 'Logout',
      onClick: handleLogout, // Add onClick handler
    },
  ];

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div
      className={`fixed top-0 left-0 h-screen bg-white shadow-lg transition-all duration-300 ease-in-out z-50 
                 ${collapsed ? 'w-[70px]' : 'w-[250px]'}`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        {!collapsed && (
          <h2 className="text-[#ff7b54] font-bold text-lg truncate">
            Glory Star
          </h2>
        )}
        <button
          onClick={handleToggle}
          className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600
                     ${collapsed ? 'mx-auto' : 'ml-auto'}`}>
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      <ul className="mt-2">
        {navItems.map((item) => (
          <li key={item.path} className="mb-1">
            {item.onClick ? ( // If item has onClick (logout), render as button
              <button
                onClick={item.onClick}
                className={`w-full flex items-center px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 
                         border-l-4 border-transparent`}>
                <span className="text-lg text-gray-500">{item.icon}</span>
                {!collapsed && (
                  <span className="ml-3 truncate">{item.label}</span>
                )}
              </button>
            ) : (
              // Otherwise render as Link
              <Link
                to={item.path}
                className={`flex items-center px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 
                         ${
                           location.pathname === item.path
                             ? 'bg-orange-50 text-[#ff7b54] font-medium border-l-4 border-[#ff7b54]'
                             : 'border-l-4 border-transparent'
                         }`}>
                <span
                  className={`text-lg ${
                    location.pathname === item.path
                      ? 'text-[#ff7b54]'
                      : 'text-gray-500'
                  }`}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="ml-3 truncate">{item.label}</span>
                )}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default IMSidebar;
