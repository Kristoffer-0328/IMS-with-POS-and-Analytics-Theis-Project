import React from 'react';
import { FiEdit2, FiAlertTriangle } from 'react-icons/fi';

const InventoryTable = ({ data }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'in-stock':
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            In Stock
          </span>
        );
      case 'low-stock':
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
            <FiAlertTriangle size={12} />
            Low Stock
          </span>
        );
      case 'expiring-soon':
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Expiring Soon
          </span>
        );
      default:
        return null;
    }
  };

  const getActionButton = (action, id) => {
    switch (action) {
      case 'restock':
        return (
          <button className="px-3 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
            Restock
          </button>
        );
      case 'view':
        return (
          <button className="p-1.5 text-gray-500 hover:text-gray-700">
            <FiEdit2 size={16} />
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {item.name}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{item.category}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{item.quantity + " pc"}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{ "₱ "+item.unitprice}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{"₱ "+item.totalvalue}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{item.location}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(item.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                {getActionButton(item.action, item.id)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
