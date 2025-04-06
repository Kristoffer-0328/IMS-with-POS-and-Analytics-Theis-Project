import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

const Sidebar = ({ onToggle }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Notify parent component when sidebar state changes
  useEffect(() => {
    if (onToggle) {
      onToggle(collapsed);
    }

    // Update body style directly with Tailwind classes
    const content =
      document.querySelector('main') || document.getElementById('content');
    if (content) {
      if (collapsed) {
        content.classList.remove('ml-[250px]');
        content.classList.add('ml-[70px]');
      } else {
        content.classList.remove('ml-[70px]');
        content.classList.add('ml-[250px]');
      }
    }
  }, [collapsed, onToggle]);

  const navItems = [
    { path: '/dashboard', icon: <FiHome size={20} />, label: 'Dashboard' },
    { path: '/inventory', icon: <FiPackage size={20} />, label: 'Inventory' },
    {
      path: '/stock_transfer',
      icon: <FiRefreshCw size={20} />,
      label: 'Stock Transfer',
    },
    {
      path: '/restocking',
      icon: <FiClipboard size={20} />,
      label: 'Restocking Request',
    },
    {
      path: '/reports',
      icon: <FiFileText size={20} />,
      label: 'Reports and Logs',
    },
    { path: '/settings', icon: <FiSettings size={20} />, label: 'Settings' },
    { path: '/logout', icon: <FiLogOut size={20} />, label: 'Logout' },
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
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
