import React, { useState } from 'react';
import { FiFileText } from 'react-icons/fi';

const ShrinkageReportModalContent = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
      {/* Original Shrinkage Report UI */}
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
          onClick={onClose}
          className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center gap-2">
          Back to Reports
        </button>
      </div>
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
  </div>
);

const ShrinkageReport = () => {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <div className='w-full flex justify-center items-center' style={{ minHeight: '200px' }}>
        <h1 className='text-2xl font-bold text-gray-800'>Not implemented yet</h1>
      </div>
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-lg hover:bg-blue-700 transition-colors"
        >
          Show UI Preview
        </button>
      </div>
      {showModal && <ShrinkageReportModalContent onClose={() => setShowModal(false)} />}
    </>
  );
};

export default ShrinkageReport;
