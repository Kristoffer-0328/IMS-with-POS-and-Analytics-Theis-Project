import React, { useState } from 'react';
import { createDailyInventorySnapshot, createDailySalesAggregate, backfillHistoricalData } from '../services/firebase/InventorySnapshotService';

export default function DataPopulationTool() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleCreateTodaySnapshot = async () => {
    setLoading(true);
    setMessage('Creating today\'s inventory snapshot and sales aggregate...');

    try {
      const inventoryResult = await createDailyInventorySnapshot();
      const salesResult = await createDailySalesAggregate(new Date());

      if (inventoryResult.success && salesResult.success) {
        const salesMsg = salesResult.skipped ? ' (no transactions today)' : ` (₱${salesResult.totalSales?.toLocaleString()})`;
        setMessage(`✅ Today's data created! Inventory: ₱${inventoryResult.totalValue.toLocaleString()}${salesMsg}`);
      } else {
        setMessage(`❌ Error: ${inventoryResult.error || salesResult.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackfillData = async () => {
    if (!startDate || !endDate) {
      setMessage('❌ Please select both start and end dates');
      return;
    }

    setLoading(true);
    setMessage(`Backfilling data from ${startDate} to ${endDate}...`);

    try {
      const result = await backfillHistoricalData(new Date(startDate), new Date(endDate));
      if (result.success) {
        setMessage(`✅ Backfill completed! Processed ${result.results.length} days`);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Inventory Analytics Data Population Tool</h2>

      <div className="space-y-6">
        {/* Today's Snapshot */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Create Today's Snapshot</h3>
          <p className="text-sm text-gray-600 mb-4">
            Generate inventory snapshot and sales aggregate for today. Run this daily to keep analytics data current.
          </p>
          <button
            onClick={handleCreateTodaySnapshot}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Today\'s Snapshot'}
          </button>
        </div>

        {/* Historical Backfill */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Backfill Historical Data</h3>
          <p className="text-sm text-gray-600 mb-4">
            Populate missing historical data for the inventory turnover report. Select the date range you want to backfill.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleBackfillData}
            disabled={loading || !startDate || !endDate}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Backfilling...' : 'Backfill Historical Data'}
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-md ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <h4 className="text-md font-medium text-blue-800 mb-2">How to Use:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Daily Snapshots:</strong> Run "Create Today's Snapshot" every day to keep data current</li>
            <li>• <strong>Historical Data:</strong> Use backfill to populate past data for the turnover report</li>
            <li>• <strong>Automation:</strong> Consider setting up a scheduled function (Firebase Functions) to run daily snapshots automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}