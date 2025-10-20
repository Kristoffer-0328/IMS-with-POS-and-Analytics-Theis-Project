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
  FiShoppingBag,
  FiSettings, // Add this for settings
  FiMap // Add this for storage facility map
} from 'react-icons/fi';
import GloryStarLogo from '../../../assets/Glory_Star_Logo.png';

const AdminSidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    // Inventory Management Section
    {
      section: 'Inventory',
      items: [
        {
          path: '/admin',
          icon: <FiBox size={20} />,
          label: 'Admin Dashboard',
        },
        {
          path: '/admin/purchase-orders',
          icon: <FiShoppingBag size={20} />,
          label: 'Purchase Orders',
        },
        {
          path: '/admin/storage-map',
          icon: <FiMap size={20} />,
          label: 'Storage Facility Map',
        },
      ]
    },
    // Sales Section
    {
      section: 'Sales',
      items: [
        {
          path: '/admin/transaction-history',
          icon: <FiShoppingCart size={20} />,
          label: 'Transaction History',
        },
      ]
    },
    // Reports Section
    {
      section: 'Reports',
      items: [
        {
          path: '/admin/reports',
          icon: <FiFileText size={20} />,
          label: 'Reports & Logs',
        },
      ]
    },
  
    // Users Section
    {
      section: 'Users',
      items: [
          {
          path: '/admin/settings',
          icon: <FiSettings size={20} />,
          label: 'Settings',
        },
        {
          path: '/admin/team',
          icon: <FiUsers size={20} />,
          label: 'Team',
        },
      ]
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
          <img
            src={GloryStarLogo}
            alt="Logo"
            className="w-30 h-25 object-contain center mx-auto"
          />
        )}
        <button
          onClick={handleToggle}
          className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600
                     ${collapsed ? 'mx-auto' : 'ml-auto'}`}>
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      <ul className="mt-2">
        {navItems.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {/* Section Header */}
            {!collapsed && (
              <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.section}
              </div>
            )}
            {collapsed && sectionIndex > 0 && (
              <div className="mx-4 my-2 border-t border-gray-200"></div>
            )}
            
            {/* Section Items */}
            {section.items.map((item) => (
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
          </div>
        ))}
        
        {/* Logout Button - Separate from grouped items */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-t border-gray-200 mt-4">
            Account
          </div>
        )}
        {collapsed && (
          <div className="mx-4 my-2 border-t border-gray-200"></div>
        )}
        <li className="mb-1">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 
                     border-l-4 border-transparent`}>
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
  );
};

export default AdminSidebar;
