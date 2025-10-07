import React, { useState, useEffect } from 'react';
import { FiSearch, FiCalendar, FiDownload, FiAlertCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const db = getFirestore(app);

const System_log = () => {
    const [systemLogs, setSystemLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [stats, setStats] = useState({
        totalLogs: 0,
        errors: 0,
        warnings: 0,
        info: 0
    });

    useEffect(() => {
        fetchSystemLogs();
    }, []);

    const fetchSystemLogs = async () => {
        setLoading(true);
        try {
            const logs = [];

            // Fetch recent stock movements for INFO logs
            const movementsRef = collection(db, 'stock_movements');
            const movementsQuery = query(movementsRef, orderBy('movementDate', 'desc'), limit(30));
            const movementsSnapshot = await getDocs(movementsQuery);
            
            movementsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                logs.push({
                    id: doc.id,
                    timestamp: data.movementDate?.toDate() || new Date(),
                    type: 'INFO',
                    module: 'Inventory',
                    message: `Stock ${data.movementType} completed`,
                    details: `Product: ${data.productName}, Quantity: ${data.quantity}, Reason: ${data.reason}`
                });
            });

            // Check for low stock items (WARNING logs)
            const productsRef = collection(db, 'Products');
            const storageSnapshot = await getDocs(productsRef);
            let lowStockCount = 0;
            
            for (const storageDoc of storageSnapshot.docs) {
                if (lowStockCount >= 10) break; // Limit to first 10 warnings
                
                const storageLocation = storageDoc.id;
                const shelvesRef = collection(db, 'Products', storageLocation, 'shelves');
                const shelvesSnapshot = await getDocs(shelvesRef);

                for (const shelfDoc of shelvesSnapshot.docs) {
                    if (lowStockCount >= 10) break;
                    
                    const shelfName = shelfDoc.id;
                    const rowsRef = collection(db, 'Products', storageLocation, 'shelves', shelfName, 'rows');
                    const rowsSnapshot = await getDocs(rowsRef);

                    for (const rowDoc of rowsSnapshot.docs) {
                        if (lowStockCount >= 10) break;
                        
                        const rowName = rowDoc.id;
                        const columnsRef = collection(db, 'Products', storageLocation, 'shelves', shelfName, 'rows', rowName, 'columns');
                        const columnsSnapshot = await getDocs(columnsRef);

                        for (const columnDoc of columnsSnapshot.docs) {
                            if (lowStockCount >= 10) break;
                            
                            const columnIndex = columnDoc.id;
                            const itemsRef = collection(db, 'Products', storageLocation, 'shelves', shelfName, 'rows', rowName, 'columns', columnIndex, 'items');
                            const itemsSnapshot = await getDocs(itemsRef);

                            itemsSnapshot.docs.forEach(productDoc => {
                                if (lowStockCount >= 10) return;
                                
                                const product = productDoc.data();
                                const qty = product.quantity || 0;
                                const minStock = product.minimumStockLevel || 60;

                                if (qty === 0) {
                                    logs.push({
                                        id: `out-of-stock-${productDoc.id}`,
                                        timestamp: new Date(),
                                        type: 'ERROR',
                                        module: 'Inventory',
                                        message: 'Out of stock',
                                        details: `Product: ${product.name} - Stock depleted in ${storageLocation}`
                                    });
                                    lowStockCount++;
                                } else if (qty <= minStock) {
                                    logs.push({
                                        id: `low-stock-${productDoc.id}`,
                                        timestamp: new Date(),
                                        type: 'WARNING',
                                        module: 'Inventory',
                                        message: 'Low stock alert',
                                        details: `Product: ${product.name} - Stock: ${qty} (Below threshold: ${minStock})`
                                    });
                                    lowStockCount++;
                                }
                            });
                        }
                    }
                }
            }

            // Check for pending POs (INFO logs)
            const posRef = collection(db, 'purchase_orders');
            const posQuery = query(posRef, orderBy('createdAt', 'desc'), limit(10));
            const posSnapshot = await getDocs(posQuery);

            posSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.status === 'pending') {
                    logs.push({
                        id: `po-pending-${doc.id}`,
                        timestamp: data.createdAt?.toDate() || new Date(),
                        type: 'INFO',
                        module: 'Procurement',
                        message: 'Purchase order awaiting approval',
                        details: `PO ${data.poNumber} - ${data.supplierName} - ₱${data.totalAmount?.toFixed(2) || '0.00'}`
                    });
                }
            });

            // Add system operation log
            logs.push({
                id: 'system-status',
                timestamp: new Date(),
                type: 'INFO',
                module: 'System',
                message: 'System operational',
                details: 'All services running normally. Last check: ' + new Date().toLocaleString()
            });

            // Sort logs by timestamp
            logs.sort((a, b) => b.timestamp - a.timestamp);

            setSystemLogs(logs);
            calculateStats(logs);

        } catch (error) {
            console.error('Error fetching system logs:', error);
            
            setSystemLogs([{
                id: 'fetch-error',
                timestamp: new Date(),
                type: 'ERROR',
                module: 'System',
                message: 'Failed to fetch system logs',
                details: error.message
            }]);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (logs) => {
        const errors = logs.filter(log => log.type === 'ERROR').length;
        const warnings = logs.filter(log => log.type === 'WARNING').length;
        const info = logs.filter(log => log.type === 'INFO').length;

        setStats({
            totalLogs: logs.length,
            errors,
            warnings,
            info
        });
    };

    const filteredLogs = systemLogs.filter(log => {
        const matchesSearch = searchTerm === '' || 
            log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesDate = filterDate === '' || 
            log.timestamp.toISOString().split('T')[0] === filterDate;
        
        const matchesType = selectedType === '' || log.type === selectedType;

        return matchesSearch && matchesDate && matchesType;
    });

    const getLogTypeBadge = (type) => {
        const badges = {
            ERROR: 'bg-red-100 text-red-800 border-red-200',
            WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            INFO: 'bg-blue-100 text-blue-800 border-blue-200',
        };
        return `px-2.5 py-0.5 text-xs font-medium rounded-full inline-flex items-center gap-1 border ${badges[type] || ''}`;
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'ERROR': return <FiAlertCircle size={12} />;
            case 'WARNING': return <FiAlertTriangle size={12} />;
            case 'INFO': return <FiInfo size={12} />;
            default: return null;
        }
    };

    const exportToCSV = () => {
        const headers = ['Timestamp', 'Type', 'Module', 'Message', 'Details'];
        const csvData = filteredLogs.map(log => [
            log.timestamp.toLocaleString(),
            log.type,
            log.module,
            log.message,
            log.details
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading system logs...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">System Logs</h1>
                <p className="text-gray-600">Monitor system events, errors, and warnings</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Total Logs</p>
                            <h3 className="text-2xl font-bold">{stats.totalLogs}</h3>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <FiInfo className="text-gray-600 text-xl" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Errors</p>
                            <h3 className="text-2xl font-bold text-red-600">{stats.errors}</h3>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                            <FiAlertCircle className="text-red-600 text-xl" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Warnings</p>
                            <h3 className="text-2xl font-bold text-yellow-600">{stats.warnings}</h3>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                            <FiAlertTriangle className="text-yellow-600 text-xl" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm mb-1">Info</p>
                            <h3 className="text-2xl font-bold text-blue-600">{stats.info}</h3>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <FiInfo className="text-blue-600 text-xl" />
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
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="ERROR">Error</option>
                        <option value="WARNING">Warning</option>
                        <option value="INFO">Info</option>
                    </select>

                    <button 
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors"
                    >
                        <FiDownload />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Timestamp
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Type
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Module
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Message
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="text-gray-400">
                                            <FiInfo className="mx-auto mb-3" size={48} />
                                            <p className="text-gray-500">No system logs found</p>
                                            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
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
                                            <span className={getLogTypeBadge(log.type)}>
                                                {getLogIcon(log.type)}
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {log.module}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {log.message}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {log.details}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-sm text-gray-600">
                        Showing {filteredLogs.length} of {systemLogs.length} total logs
                    </p>
                </div>
            </div>
        </div>
    );
};

export default System_log;
