import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/services/FirebaseAuth';
import {
  FiHome,
  FiPackage,
  FiBox,
  FiShoppingCart,
  FiFileText,
  FiUsers,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiActivity, // Add this for audit trail
  FiList, // Add this for logs
  FiShoppingBag
} from 'react-icons/fi';

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
   {
      path: '/admin',
      icon: <FiBox size={20} />,
      label: 'Products Stock',
    },
    {
      path: '/admin/purchase-orders',
      icon: <FiShoppingBag size={20} />,
      label: 'Purchase Orders',
    },
    {
      path: '/admin/audit-trail',
      icon: <FiActivity size={20} />,
      label: 'Audit Trail',
    },
    {
      path: '/admin/system-logs',
      icon: <FiList size={20} />,
      label: 'System Logs',
    },
    { path: '/admin/team', icon: <FiUsers size={20} />, label: 'Team' },
    {
      path: '#',
      icon: <FiLogOut size={20} />,
      label: 'Logout',
      onClick: handleLogout,
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
            {item.onClick ? (
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

export default AdminSidebar;
