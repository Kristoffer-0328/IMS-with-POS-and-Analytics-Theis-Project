import { FiAlertTriangle, FiEye } from 'react-icons/fi';
import React from 'react';

const InventoryTable = ({ data, onViewProduct }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'in-stock':
        return (
          <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-100 text-green-800 inline-flex items-center gap-1 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            In Stock
          </span>
        );
      case 'low-stock':
        return (
          <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1 border border-amber-200">
            <FiAlertTriangle className="inline" size={12} />
            Low Stock
          </span>
        );
      case 'out-of-stock':
        return (
          <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-800 inline-flex items-center gap-1 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Product Name
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Brand
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Category
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Quantity
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Unit Price
            </th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr 
              key={item.id} 
              className="hover:bg-gray-50/50 transition-colors duration-150"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{item.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600">{item.brand || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {item.category}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-700 font-medium">
                  {item.quantity} <span className="text-gray-500 font-normal">{item.unit || 'pcs'}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  ₱{item.unitPrice ? item.unitPrice.toLocaleString() : '0'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(item.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <button
                  onClick={() => onViewProduct(item)}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors duration-150 gap-1.5"
                >
                  <FiEye size={16} />
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;