import React, { useState } from 'react';
import { FiSearch, FiCalendar, FiFilter } from 'react-icons/fi';

const Audit_trail = () => {
    // Static data for demonstration
    const auditLogs = [
        {
            id: 1,
            timestamp: '2024-05-03 09:30:45',
            user: 'John Doe',
            action: 'Product Added',
            details: 'Added new product: Hammer - Hardware Category',
            ipAddress: '192.168.1.100'
        },
        {
            id: 2,
            timestamp: '2024-05-03 10:15:22',
            user: 'Jane Smith',
            action: 'Stock Updated',
            details: 'Updated stock quantity for Paint Brush from 50 to 45',
            ipAddress: '192.168.1.101'
        },
        {
            id: 3,
            timestamp: '2024-05-03 11:05:33',
            user: 'Admin',
            action: 'User Created',
            details: 'Created new user account for Mark Wilson',
            ipAddress: '192.168.1.102'
        },
        // Add more static entries as needed
    ];

    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Audit Trail</h1>
                <p className="text-gray-600">Track all system activities and changes</p>
            </div>

            {/* Filters and Search */}
            <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search audit logs..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <div className="relative">
                        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                    
                    <button className="px-4 py-2 bg-white border rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                        <FiFilter />
                        Filter
                    </button>
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-xl shadow-sm border">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Timestamp
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Action
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Details
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                IP Address
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {log.timestamp}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-medium text-gray-900">
                                        {log.user}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {log.details}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {log.ipAddress}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Audit_trail;