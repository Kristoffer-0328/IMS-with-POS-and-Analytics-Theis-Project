import React from 'react';
import { FiFileText } from 'react-icons/fi';

const ShrinkageReport = ({ onBack }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Shrinkage & Adjustment Report
          </h1>
          <p className="text-gray-600">
            Analyze inventory shrinkage and adjustments
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center gap-2">
          Back to Reports
        </button>
      </div>

      {/* Placeholder for Shrinkage & Adjustment report content */}
      <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-100 text-center">
        <FiFileText size={64} className="mx-auto mb-4 text-indigo-500" />
        <h2 className="text-xl font-semibold mb-2">
          Shrinkage & Adjustment Report
        </h2>
        <p className="text-gray-500 mb-6">This report is being developed</p>
        <button className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
          Generate Placeholder Report
        </button>
      </div>
    </div>
  );
};

export default ShrinkageReport;
