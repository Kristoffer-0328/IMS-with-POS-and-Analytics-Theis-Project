import React from 'react';


const AddProductModal = ({ open, close }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/30 bg-opacity-40">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Close Button */}
        <div className="absolute top-3 right-4 text-xl text-gray-500 hover:text-red-500">
          <button
          onClick={close}
          
        >
          ✕
        </button>
        </div>

        {/* Header */}
        <div className="flex justify-center mb-4">
          <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-semibold text-center">
            Add New Variant or New Product
          </div>
        </div>

        {/* Buttons */}
        <div className="bg-gray-100 rounded-xl p-6 shadow-inner flex justify-center gap-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            New Variant
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            New Product
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
