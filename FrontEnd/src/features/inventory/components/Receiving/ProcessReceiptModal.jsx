import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { getFirestore, doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const db = getFirestore(app);

const ProcessReceiptModal = ({ po, onClose, onProcess }) => {
  const [receivedItems, setReceivedItems] = useState(
    po.items.map(item => ({
      ...item,
      receivedQuantity: 0,
      notes: '',
      variantId: item.variantId || null,
      brand: item.brand || null,
      category: item.category || item.productId.split('-')[0]
    }))
  );
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (index, value) => {
    const newItems = [...receivedItems];
    const numValue = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    newItems[index] = {
      ...newItems[index],
      receivedQuantity: numValue
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

  const updateRestockRequestStatus = async (productId) => {
    try {
      // Query for restock requests matching this product
      const restockRequestsRef = collection(db, 'RestockRequests');
      const q = query(
        restockRequestsRef,
        where('productId', '==', productId),
        where('status', 'in', ['pending', 'approved', 'processing'])
      );
      
      const querySnapshot = await getDocs(q);
      
      // Update each matching restock request
      const updatePromises = querySnapshot.docs.map(async (docSnapshot) => {
        const requestRef = doc(db, 'RestockRequests', docSnapshot.id);
        await updateDoc(requestRef, {
          status: 'completed',
          completedAt: new Date(),
          notes: `Completed via PO: ${po.poNumber || 'N/A'}`
        });
      });
      
      await Promise.all(updatePromises);

    } catch (error) {
      console.error('Error updating restock request status:', error);
    }
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

      // Update restock request status for each processed item
      const updatePromises = itemsToProcess.map(item => 
        updateRestockRequestStatus(item.productId)
      );

      // Wait for all status updates to complete
      await Promise.all(updatePromises);

      // Process the receipt
      await onProcess(po, itemsToProcess);
      onClose();
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Error processing receipt: ' + error.message);
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
                    Brand
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
                      {item.productName || item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.brand || 'N/A'}
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
