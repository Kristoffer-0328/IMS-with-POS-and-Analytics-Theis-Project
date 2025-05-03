import React from 'react';
import { FiShoppingCart, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default function BulkOrderChoiceModal({ onChoice }) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
        <FiShoppingCart size={40} className="mx-auto mb-4 text-orange-500" />
        <h2 className="text-xl font-semibold text-gray-800 mb-4">New Sale</h2>
        <p className="text-gray-600 mb-6">Is this a bulk order requiring specific customer details?</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => onChoice(true)} // Call onChoice with true for Yes
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <FiCheckCircle size={18} /> Yes, Enter Details
          </button>
          <button
            onClick={() => onChoice(false)} // Call onChoice with false for No
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
          >
            <FiXCircle size={18} /> No, Walk-in
          </button>
        </div>
      </div>
    </div>
  );
}