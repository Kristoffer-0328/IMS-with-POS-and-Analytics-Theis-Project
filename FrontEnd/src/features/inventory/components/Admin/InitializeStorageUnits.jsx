import React, { useState } from 'react';
import { initializeStorageUnitsFromConfig } from '../../../../services/firebase/StorageServices';

/**
 * One-time initialization component to set up storage units
 * Add this temporarily to your admin panel or settings page
 */
const InitializeStorageUnits = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);


  const handleInitialize = async () => {
    if (!window.confirm('This will create storage units in the StorageUnits collection. Continue?')) {
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const result = await initializeStorageUnitsFromConfig();
      
      if (result.success) {
        setStatus({
          type: 'success',
          message: `✅ Successfully created ${result.count} storage units!`
        });
      } else {
        setStatus({
          type: 'error',
          message: `❌ Error: ${result.error?.message || 'Failed to initialize storage units'}`
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: `❌ Error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-2 text-blue-900">
        🏗️ Initialize Storage Units from Config
      </h3>
      <p className="text-sm text-blue-700 mb-4">
        This will create storage units from the detailed configuration in StorageUnitsConfig.js.
        Each unit will include complete shelf and row structures with capacity details.
        You only need to run this once.
      </p>
      
      <div className="space-y-3">
        <button
          onClick={handleInitialize}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? 'Initializing...' : 'Initialize Storage Units'}
        </button>

        {status && (
          <div className={`p-4 rounded-lg ${
            status.type === 'success' 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}>
            {status.message}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-white rounded border border-blue-200">
        <h4 className="font-medium text-sm mb-2 text-gray-900">Storage Units to be created:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Unit 01 - Steel & Heavy Materials (3,936 capacity)</li>
          <li>• Unit 02 - Plywood & Sheet Materials (38 capacity)</li>
          <li>• Unit 03 - Cement & Aggregates (1,200 capacity)</li>
          <li>• Unit 04 - Electrical & Plumbing (248 capacity)</li>
          <li>• Unit 05 - Paint & Coatings (160 capacity)</li>
          <li>• Unit 06 - Insulation & Foam (16 capacity)</li>
          <li>• Unit 07 - Miscellaneous (16 capacity)</li>
          <li>• Unit 08 - Roofing Materials (16 capacity)</li>
          <li>• Unit 09 - Hardware & Fasteners (16 capacity)</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          Each unit includes detailed shelf and row configurations with capacity calculations.
        </p>
      </div>
    </div>
  );
};

export default InitializeStorageUnits;
