import React, { useState, useEffect } from 'react';
import { FiSearch, FiCalendar, FiFilter, FiDownload, FiUser, FiPackage, FiShoppingCart, FiRefreshCw } from 'react-icons/fi';
import { getFirestore, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';
const db = getFirestore(app);

const Audit_trail = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalActions: 0,
        uniqueUsers: 0,
        todayActions: 0
    });

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const calculateStats = (logs) => {
        const uniqueUsers = new Set(logs.map(log => {
            if (typeof log.user === 'object' && log.user) {
                return log.user.name || log.user.displayName || log.user.email || log.user.id || 'unknown';
            }
            return String(log.user || 'unknown');
        })).size;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLogs = logs.filter(log => {
            const logDate = new Date(log.timestamp);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
        });

        setStats({
            totalActions: logs.length,
            uniqueUsers: uniqueUsers,
            todayActions: todayLogs.length
        });
    };

    const fetchAuditLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const logs = [];

            // Fetch POS Transactions
            try {
                const posRef = collection(db, 'posTransactions');
                const posQuery = query(posRef, orderBy('createdAt', 'desc'), limit(50));
                const posSnapshot = await getDocs(posQuery);
                posSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    logs.push({
                        id: doc.id,
                        timestamp: data.createdAt?.toDate() || new Date(),
                        user: data.cashier || 'POS User',
                        action: 'POS Sale',
                        module: 'POS',
                        details: `Invoice ${data.transactionId} - ₱${data.totals?.total?.toFixed(2) || '0.00'} - ${data.items?.length || 0} items`,
                        ipAddress: data.ipAddress || 'N/A',
                        type: 'transaction'
                    });
                });
            } catch (err) {
                console.warn('Error fetching POS transactions:', err);
            }

            // Fetch Receiving Records
            try {
                const receivingRef = collection(db, 'receivingTransactions');
                const receivingQuery = query(receivingRef, orderBy('receivingDate', 'desc'), limit(30));
                const receivingSnapshot = await getDocs(receivingQuery);
                receivingSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    logs.push({
                        id: doc.id,
                        timestamp: data.receivingDate?.toDate() || new Date(),
                        user: data.receivedBy || 'IM User',
                        action: 'Stock Received',
                        module: 'Inventory',
                        details: `PO: ${data.poNumber} - Supplier: ${data.supplierName} - ${data.acceptedProducts?.length || 0} products`,
                        ipAddress: data.ipAddress || 'N/A',
                        type: 'receiving'
                    });
                });
            } catch (err) {
                console.warn('Error fetching receiving transactions:', err);
            }

            // Fetch Release Logs
            try {
                const releaseRef = collection(db, 'release_logs');
                const releaseQuery = query(releaseRef, orderBy('releaseDate', 'desc'), limit(30));
                const releaseSnapshot = await getDocs(releaseQuery);
                releaseSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    logs.push({
                        id: doc.id,
                        timestamp: data.releaseDate?.toDate() || new Date(),
                        user: data.releasedByName || 'Warehouse Staff',
                        action: 'Stock Released',
                        module: 'Inventory',
                        details: `Released ${data.items?.length || 0} items - Customer: ${data.customerName || 'N/A'}`,
                        ipAddress: data.ipAddress || 'N/A',
                        type: 'release'
                    });
                });
            } catch (err) {
                console.warn('Error fetching release logs:', err);
            }

            // Fetch Purchase Orders
            try {
                const poRef = collection(db, 'purchase_orders');
                const poQuery = query(poRef, orderBy('createdAt', 'desc'), limit(20));
                const poSnapshot = await getDocs(poQuery);
                poSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    logs.push({
                        id: doc.id,
                        timestamp: data.createdAt?.toDate() || new Date(),
                        user: data.createdBy || 'Admin',
                        action: 'PO Created',
                        module: 'Procurement',
                        details: `PO ${data.poNumber} - ${data.supplierName} - ₱${data.totalAmount?.toFixed(2) || '0.00'}`,
                        ipAddress: data.ipAddress || 'N/A',
                        type: 'purchase_order'
                    });
                });
            } catch (err) {
                console.warn('Error fetching purchase orders:', err);
            }

            // Fetch User Management (Team)
            try {
                const usersRef = collection(db, 'User');
                const usersSnapshot = await getDocs(usersRef);
                usersSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.createdAt) {
                        // Handle different timestamp formats
                        let timestamp;
                        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                            timestamp = data.createdAt.toDate();
                        } else if (data.createdAt instanceof Date) {
                            timestamp = data.createdAt;
                        } else if (typeof data.createdAt === 'string') {
                            timestamp = new Date(data.createdAt);
                        } else {
                            timestamp = new Date();
                        }

                        logs.push({
                            id: doc.id,
                            timestamp: timestamp,
                            user: 'Admin',
                            action: 'User Created',
                            module: 'User Management',
                            details: `Created user: ${data.name} (${data.role})`,
                            ipAddress: data.ipAddress || 'N/A',
                            type: 'user_management'
                        });
                    }
                });
            } catch (err) {
                console.warn('Error fetching users:', err);
            }

            // Sort all logs by timestamp
            logs.sort((a, b) => b.timestamp - a.timestamp);

            setAuditLogs(logs);
            calculateStats(logs);

        } catch (error) {
            console.error('Error fetching audit logs:', error);
            setError('Failed to load audit logs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = auditLogs.filter(log => {
        const matchesSearch = searchTerm === '' || (() => {
            const userSearch = typeof log.user === 'object' && log.user ? 
                (log.user.name || log.user.displayName || log.user.email || '') : 
                String(log.user || '');
            return userSearch.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   log.details.toLowerCase().includes(searchTerm.toLowerCase());
        })();
        
        const matchesDate = filterDate === '' || 
            log.timestamp.toISOString().split('T')[0] === filterDate;
        
        const matchesAction = filterAction === '' || log.action === filterAction;
        const matchesUser = filterUser === '' || (() => {
            const userDisplay = typeof log.user === 'object' && log.user ? 
                (log.user.name || log.user.displayName || log.user.email || '') : 
                String(log.user || '');
            return userDisplay === filterUser;
        })();

        return matchesSearch && matchesDate && matchesAction && matchesUser;
    });

    const getActionBadge = (action) => {
        const badges = {
            'POS Sale': 'bg-green-100 text-green-700 border-green-200',
            'Stock Received': 'bg-blue-100 text-blue-700 border-blue-200',
            'Stock Released': 'bg-orange-100 text-orange-700 border-orange-200',
            'PO Created': 'bg-purple-100 text-purple-700 border-purple-200',
            'User Created': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        };
        return `px-2.5 py-1 text-xs font-medium rounded-full inline-flex items-center border ${badges[action] || 'bg-gray-100 text-gray-700 border-gray-200'}`;
    };

    const exportToCSV = () => {
        const headers = ['Timestamp', 'User', 'Action', 'Module', 'Details', 'IP Address'];
        const csvData = filteredLogs.map(log => [
            log.timestamp.toLocaleString(),
            (() => {
                if (typeof log.user === 'object' && log.user) {
                    return log.user.name || log.user.displayName || log.user.email || 'Unknown User';
                }
                return String(log.user || 'Unknown User');
            })(),
            log.action,
            log.module,
            log.details,
            log.ipAddress
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading audit trail...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="text-red-500 mb-4">
                            <FiFilter className="mx-auto mb-3" size={48} />
                            <p className="text-lg font-medium">Error Loading Audit Trail</p>
                            <p className="text-sm text-gray-600 mt-2">{error}</p>
                        </div>
                        <button
                            onClick={fetchAuditLogs}
                            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
        

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Total Actions</p>
                            <h3 className="text-2xl font-bold">{stats.totalActions}</h3>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <FiPackage className="text-blue-600 text-xl" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Unique Users</p>
                            <h3 className="text-2xl font-bold">{stats.uniqueUsers}</h3>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                            <FiUser className="text-purple-600 text-xl" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Today's Actions</p>
                            <h3 className="text-2xl font-bold">{stats.todayActions}</h3>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <FiShoppingCart className="text-green-600 text-xl" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="relative">
                        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>

                    <select
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                    >
                        <option value="">All Actions</option>
                        <option value="POS Sale">POS Sale</option>
                        <option value="Stock Received">Stock Received</option>
                        <option value="Stock Released">Stock Released</option>
                        <option value="PO Created">PO Created</option>
                        <option value="User Created">User Created</option>
                    </select>
                    
                    <button 
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors"
                    >
                        <FiDownload />
                        Export CSV
                    </button>
                    <button 
                        onClick={fetchAuditLogs}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                    >
                        <FiRefreshCw />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Timestamp
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    User
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Action
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Module
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Details
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    IP Address
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="text-gray-400">
                                            <FiFilter className="mx-auto mb-3" size={48} />
                                            <p className="text-gray-500">No audit logs found</p>
                                            <p className="text-sm text-gray-400 mt-1">
                                                {auditLogs.length === 0 
                                                    ? "No activity has been recorded yet. Data will appear here as users interact with the system."
                                                    : "Try adjusting your filters or search terms."
                                                }
                                            </p>
                                            {auditLogs.length === 0 && (
                                                <button
                                                    onClick={fetchAuditLogs}
                                                    className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                                >
                                                    Refresh Data
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            <div>{log.timestamp.toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-400">{log.timestamp.toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                                    <span className="text-xs font-medium text-gray-600">
                                                        {(() => {
                                                            const displayName = typeof log.user === 'object' && log.user ? 
                                                                (log.user.name || log.user.displayName || log.user.email || 'U') : 
                                                                String(log.user || 'U');
                                                            return displayName.substring(0, 2).toUpperCase();
                                                        })()}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {(() => {
                                                        if (typeof log.user === 'object' && log.user) {
                                                            return log.user.name || log.user.displayName || log.user.email || 'Unknown User';
                                                        }
                                                        return String(log.user || 'Unknown User');
                                                    })()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={getActionBadge(log.action)}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {log.module}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {log.details}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                            {log.ipAddress}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-sm text-gray-600">
                        Showing {filteredLogs.length} of {auditLogs.length} total actions
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Audit_trail;
