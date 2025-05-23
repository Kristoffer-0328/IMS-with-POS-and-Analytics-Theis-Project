import React, { useState } from 'react';
import { FiSearch, FiCalendar, FiFilter, FiDownload } from 'react-icons/fi';

const System_log = () => {
    // Static log data for demonstration
    const systemLogs = [
        {
            id: 1,
            timestamp: '2024-05-03 08:15:22',
            type: 'ERROR',
            module: 'Authentication',
            message: 'Failed login attempt - Invalid credentials',
            details: 'User attempted login with incorrect password 3 times'
        },
        {
            id: 2,
            timestamp: '2024-05-03 09:30:45',
            type: 'WARNING',
            module: 'Inventory',
            message: 'Low stock alert triggered',
            details: 'Product ID: 1234 - Current stock below threshold'
        },
        {
            id: 3,
            timestamp: '2024-05-03 10:45:12',
            type: 'INFO',
            module: 'Database',
            message: 'Backup completed successfully',
            details: 'Daily backup process completed - Size: 256MB'
        },
        {
            id: 4,
            timestamp: '2024-05-03 11:20:33',
            type: 'ERROR',
            module: 'Network',
            message: 'Connection timeout',
            details: 'Failed to connect to remote server after 30s'
        }
    ];

    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [selectedType, setSelectedType] = useState('');

    const getLogTypeBadge = (type) => {
        const badges = {
            ERROR: 'bg-red-100 text-red-800 border-red-200',
            WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            INFO: 'bg-blue-100 text-blue-800 border-blue-200',
        };
        return `px-2.5 py-0.5 text-xs font-medium rounded-full inline-flex items-center border ${badges[type] || ''}`;
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">System Logs</h1>
                <p className="text-gray-600">Monitor system events, errors, and warnings</p>
            </div>

            {/* Filters and Search */}
            <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>

                    <select
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="ERROR">Error</option>
                        <option value="WARNING">Warning</option>
                        <option value="INFO">Info</option>
                    </select>

                    <button className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 flex items-center gap-2">
                        <FiDownload />
                        Export Logs
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Timestamp
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Module
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Message
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Details
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {systemLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {log.timestamp}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={getLogTypeBadge(log.type)}>
                                        {log.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {log.module}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                    {log.message}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {log.details}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default System_log;