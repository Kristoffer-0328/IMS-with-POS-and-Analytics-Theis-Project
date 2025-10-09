import React, { useState, useEffect } from 'react';
import { FiFileText, FiAlertCircle, FiTrendingDown, FiTrendingUp, FiPackage, FiDownload } from 'react-icons/fi';
import { getFirestore, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const db = getFirestore(app);

const ShrinkageReport = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [shrinkageData, setShrinkageData] = useState([]);
  const [summary, setSummary] = useState({
    totalShrinkage: 0,
    totalValue: 0,
    byReason: {},
    shrinkageRate: 0
  });
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState(new Date().toLocaleString('default', { month: 'long' }));

  const months = [
    'All Months', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => (currentYear - i).toString());

  const shrinkageReasons = [
    { id: 'damaged', label: 'Damaged', color: 'text-red-600' },
    { id: 'expired', label: 'Expired', color: 'text-orange-600' },
    { id: 'theft', label: 'Theft/Loss', color: 'text-purple-600' },
    { id: 'error', label: 'Count Error', color: 'text-blue-600' },
    { id: 'found', label: 'Found Stock', color: 'text-green-600' },
    { id: 'other', label: 'Other', color: 'text-gray-600' },
  ];

  useEffect(() => {
    fetchShrinkageData();
  }, [yearFilter, monthFilter]);

  const fetchShrinkageData = async () => {
    setLoading(true);
    try {
      // This is a placeholder - you'll need to create this collection
      // For now, we'll show example data
      
      // Simulated data for demonstration
      const exampleData = [
        {
          id: '1',
          date: new Date('2025-10-05'),
          productName: 'Portland Cement Type 1 (40kg)',
          quantity: 3,
          reason: 'damaged',
          notes: 'Bags damaged during delivery',
          value: 780.00,
          unitPrice: 260.00
        },
        {
          id: '2',
          date: new Date('2025-10-12'),
          productName: 'PVC Pipe (2" x 10ft)',
          quantity: 1,
          reason: 'damaged',
          notes: 'Broken in storage',
          value: 500.00,
          unitPrice: 500.00
        },
        {
          id: '3',
          date: new Date('2025-10-18'),
          productName: '10mm Deformed Bar',
          quantity: -2,
          reason: 'found',
          notes: 'Found during inventory count',
          value: -1560.00,
          unitPrice: 780.00
        },
        {
          id: '4',
          date: new Date('2025-10-25'),
          productName: 'Marine Plywood (4x8)',
          quantity: 1,
          reason: 'error',
          notes: 'Inventory count correction',
          value: 950.00,
          unitPrice: 950.00
        },
      ];

      setShrinkageData(exampleData);

      // Calculate summary
      const totalShrinkage = exampleData.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = exampleData.reduce((sum, item) => sum + item.value, 0);
      
      const byReason = {};
      exampleData.forEach(item => {
        if (!byReason[item.reason]) {
          byReason[item.reason] = { count: 0, value: 0 };
        }
        byReason[item.reason].count += Math.abs(item.quantity);
        byReason[item.reason].value += Math.abs(item.value);
      });

      setSummary({
        totalShrinkage: Math.abs(totalShrinkage),
        totalValue: Math.abs(totalValue),
        byReason,
        shrinkageRate: 2.3 // Example percentage
      });

    } catch (error) {
      console.error('Error fetching shrinkage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getShrinkageLevel = (rate) => {
    if (rate <= 2) return { label: 'EXCELLENT', color: 'text-green-600', bg: 'bg-green-50' };
    if (rate <= 4) return { label: 'ACCEPTABLE', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (rate <= 6) return { label: 'NEEDS ATTENTION', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'CRITICAL', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const performanceLevel = getShrinkageLevel(summary.shrinkageRate);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Shrinkage & Adjustment Report
          </h1>
          <p className="text-gray-600">
            Track inventory losses, damages, and adjustments
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center gap-2">
            Back to Reports
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 justify-end mb-6">
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          {months.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading shrinkage data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Shrinkage Rate */}
            <div className={`${performanceLevel.bg} rounded-xl p-6 border-2 border-${performanceLevel.color.split('-')[1]}-200`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Shrinkage Rate</h3>
                <FiAlertCircle className={performanceLevel.color} size={20} />
              </div>
              <p className={`text-3xl font-bold ${performanceLevel.color} mb-1`}>
                {summary.shrinkageRate}%
              </p>
              <p className={`text-xs font-medium ${performanceLevel.color}`}>
                {performanceLevel.label}
              </p>
            </div>

            {/* Total Items */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Total Items</h3>
                <FiPackage className="text-indigo-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {summary.totalShrinkage}
              </p>
              <p className="text-xs text-gray-500">Items affected</p>
            </div>

            {/* Total Value */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Total Value</h3>
                <FiTrendingDown className="text-red-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ₱{summary.totalValue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Loss value</p>
            </div>

            {/* Top Reason */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Top Reason</h3>
              </div>
              <p className="text-lg font-bold text-gray-900 mb-1">Damaged</p>
              <p className="text-xs text-gray-500">
                ₱{(summary.byReason['damaged']?.value || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Breakdown by Reason */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Breakdown by Reason</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {shrinkageReasons.map(reason => {
                const data = summary.byReason[reason.id] || { count: 0, value: 0 };
                return (
                  <div key={reason.id} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700 font-semibold mb-2 uppercase">{reason.label}</p>
                    <p className={`text-2xl font-bold ${reason.color}`}>{data.count}</p>
                    <p className="text-xs text-gray-500 mt-1">₱{data.value.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Detailed Transactions</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <FiDownload size={16} />
                Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Unit Price</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shrinkageData.map((item) => {
                    const reasonInfo = shrinkageReasons.find(r => r.id === item.reason);
                    const isPositive = item.quantity < 0;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.productName}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${reasonInfo?.color} bg-opacity-10`}>
                            <span>{reasonInfo?.icon}</span>
                            {reasonInfo?.label}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm text-right font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{Math.abs(item.quantity)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">₱{item.unitPrice.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-sm text-right font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}₱{Math.abs(item.value).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Note */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <FiAlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">About Shrinkage Rate</h4>
                <p className="text-xs text-blue-800">
                  <strong>0-2%:</strong> Excellent inventory control • 
                  <strong> 2-4%:</strong> Acceptable shrinkage • 
                  <strong> 4-6%:</strong> Needs attention • 
                  <strong> 6%+:</strong> Critical - immediate action required
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  <em>Note: This report currently shows example data. To track real shrinkage, record damaged/lost items through the inventory adjustment system.</em>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShrinkageReport;
