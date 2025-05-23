import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

const ProcessReceiptModal = ({ po, onClose, onProcess }) => {
  const [receivedItems, setReceivedItems] = useState(
    po.items.map(item => ({
      ...item,
      receivedQuantity: 0,
      notes: ''
    }))
  );
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (index, value) => {
    const newItems = [...receivedItems];
    newItems[index] = {
      ...newItems[index],
      receivedQuantity: parseInt(value) || 0
    };
    setReceivedItems(newItems);
  };

  const handleNotesChange = (index, value) => {
    const newItems = [...receivedItems];
    newItems[index] = {
      ...newItems[index],
      notes: value
    };
    setReceivedItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out items with 0 quantity
      const itemsToProcess = receivedItems.filter(item => item.receivedQuantity > 0);
      
      if (itemsToProcess.length === 0) {
        alert('Please enter quantities for items to receive');
        return;
      }

      // Process the receipt
      await onProcess(po, itemsToProcess);
      onClose();
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Error processing receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[96%] max-w-4xl shadow-lg rounded-lg bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Process Receipt</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ordered Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receivedItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                      {item.variant && (
                        <span className="text-gray-500 ml-1">
                          ({item.variant})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={item.receivedQuantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        className="border rounded px-3 py-2 w-24 text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleNotesChange(index, e.target.value)}
                        placeholder="Add notes..."
                        className="border rounded px-3 py-2 w-full text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border text-gray-600 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400"
            >
              {loading ? 'Processing...' : 'Process Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProcessReceiptModal; 