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
  FiShoppingBag
} from 'react-icons/fi';

const IMSidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/im', icon: <FiHome size={20} />, label: 'Dashboard' },
    { path: '/im/inventory', icon: <FiPackage size={20} />, label: 'Inventory' },
    { path: '/im/purchase-orders', icon: <FiShoppingBag size={20} />, label: 'Purchase Orders' },
    { path: '/im/stock-transfer', icon: <FiRefreshCw size={20} />, label: 'Stock Transfer' },
    { path: '/im/restocking-request', icon: <FiClipboard size={20} />, label: 'Restocking Request' },
    { path: '/im/reports', icon: <FiFileText size={20} />, label: 'Reports and Logs' },
    { path: '/im/settings', icon: <FiSettings size={20} />, label: 'Settings' },
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
            <h2 className="text-[#ff7b54] font-bold text-lg truncate">
              Glory Star
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
                  <span className="ml-3 truncate">{item.label}</span>
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
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center p-3 transition-colors
              ${
                location.pathname === item.path
                  ? 'text-[#ff7b54] bg-orange-50'
                  : 'text-gray-500'
              }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center p-3 text-gray-500 hover:bg-gray-50"
        >
          <FiLogOut size={20} />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </>
  );
};

export default IMSidebar;
