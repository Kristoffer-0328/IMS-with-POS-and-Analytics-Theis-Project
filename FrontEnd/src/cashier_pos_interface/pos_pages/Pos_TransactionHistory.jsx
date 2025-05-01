import React, { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const sampleHistory = [
  {
    id: '#1001',
    datetime: '03/14/25 10:30AM',
    customer: '$25',
    total: 'Cash',
    status: 'Delivered',
    statusColor: 'bg-green-100 text-green-700',
  },
  {
    id: '#1002',
    datetime: '03/14/25 10:30AM',
    customer: '$50',
    total: 'Cash',
    status: 'Pending',
    statusColor: 'bg-yellow-100 text-yellow-700',
  },
  {
    id: '#1003',
    datetime: '03/14/25 10:30AM',
    customer: '$60',
    total: 'Cash',
    status: 'Rejected',
    statusColor: 'bg-red-100 text-red-700',
  },
];

export default function Pos_Transaction_History() {
  const [month, setMonth] = useState('October');

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="flex items-center justify-between bg-white px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold">Transaction History</h1>
        <div className="flex items-center space-x-4">
          {/* bell icon & avatar would go here if you have them */}
          <div className="relative inline-block text-left">
            <button
              onClick={() =>
                setMonth((m) =>
                  m === 'October'
                    ? 'November'
                    : m === 'November'
                    ? 'December'
                    : 'October'
                )
              }
              className="flex items-center px-4 py-2 bg-white border rounded-lg shadow-sm text-sm"
            >
              {month}
              <FiChevronDown className="ml-2" />
            </button>
          </div>
        </div>
      </header>

      {/* Section label */}
      <div className="px-6 py-2">
        <span className="inline-block text-xs font-medium bg-gray-200 text-gray-600 rounded-full px-3 py-1">
          Section 9
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4 bg-gray-50">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                {['Order #', 'Date & Time', 'Customer ID', 'Total', 'Status', 'Action'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-sm font-medium text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleHistory.map((row) => (
                <tr key={row.id} className="border-b last:border-none">
                  <td className="px-6 py-4 text-sm text-gray-700">{row.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.datetime}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.total}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${row.statusColor}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
