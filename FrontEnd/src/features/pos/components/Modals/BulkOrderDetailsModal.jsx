import React from 'react';
import { FiUser, FiPhone, FiMapPin, FiCheckCircle } from 'react-icons/fi';

export default function BulkOrderDetailsModal({
  customerDetails,
  setCustomerDetails,
  onSubmit,
  onClose
}) {
  const handleChange = (e) => {
    const { id, value } = e.target;
    setCustomerDetails(prevDetails => ({
      ...prevDetails,
      [id.replace('customer', '').toLowerCase()]: value // Match state keys (name, phone, address)
    }));
  };

  const formatCurrency = (number) => {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Bulk Order Customer Details</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="customerName" // Keep ID for label association
                name="name" // Use name attribute matching state key
                required
                value={customerDetails.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                id="customerPhone" // Keep ID for label association
                name="phone" // Use name attribute matching state key
                value={customerDetails.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="customerAddress" // Keep ID for label association
                name="address" // Use name attribute matching state key
                value={customerDetails.address}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="submit" className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2">
            <FiCheckCircle size={18} /> Confirm Customer
          </button>
        </div>
      </form>
    </div>
  );
}
