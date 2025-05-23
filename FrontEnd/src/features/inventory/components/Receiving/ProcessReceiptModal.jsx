import React, { useState } from 'react';
import { FiX, FiSave } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { useServices } from '../../../../services/firebase/ProductServices';
import { getFirestore, runTransaction, doc } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const db = getFirestore(app);

const ProcessReceiptModal = ({ po, onClose }) => {
  const [receivedItems, setReceivedItems] = useState(
    po.items.map(item => ({
      ...item,
      receivedQuantity: 0,
      remarks: ''
    }))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const poServices = usePurchaseOrderServices();
  const productServices = useServices();

  const handleQuantityChange = (index, value) => {
    const newItems = [...receivedItems];
    newItems[index].receivedQuantity = Math.min(
      Math.max(0, parseInt(value) || 0),
      newItems[index].quantity
    );
    setReceivedItems(newItems);
  };

  const handleRemarksChange = (index, value) => {
    const newItems = [...receivedItems];
    newItems[index].remarks = value;
    setReceivedItems(newItems);
  };

  const handleSubmit = async () => {
    try {
      setIsProcessing(true);

      // Validate required fields first
      const itemsToProcess = receivedItems.filter(item => item.receivedQuantity > 0);
      
      // Validate that all required fields are present
      for (const item of itemsToProcess) {
        if (!item.productId) {
          throw new Error(`Missing required data for product ${item.productName}: productId`);
        }
      }
      
      // Calculate if this is a partial or complete receipt
      const isComplete = receivedItems.every(
        item => item.receivedQuantity === item.quantity
      );

      await runTransaction(db, async (transaction) => {
        // 1. First, get all product documents
        const productDocs = await Promise.all(
          itemsToProcess.map(async (item) => {
            // Extract category from productId (first part before the first dash)
            const category = item.productId.split('-')[0];
            console.log('Reading product:', category, item.productId);
            const productRef = doc(db, 'Products', category, 'Items', item.productId);
            const snapshot = await transaction.get(productRef);
            
            if (!snapshot.exists()) {
              throw new Error(`Product ${item.productName} not found`); 
            }

            return {
              ref: productRef,
              data: snapshot.data(),
              item: item
            };
          })
        );

        // 2. Get PO document
        const poRef = doc(db, 'purchase_orders', po.id);
        const poSnapshot = await transaction.get(poRef);
        
        if (!poSnapshot.exists()) {
          throw new Error('Purchase order not found');
        }

        // 3. Now perform all writes
        // Update PO first
        transaction.update(poRef, {
          receivingStatus: isComplete ? 'completed' : 'partial',
          receivedItems: receivedItems.map(item => ({
            productId: item.productId,
            category: item.productId.split('-')[0], // Extract category from productId
            productName: item.productName,
            receivedQuantity: item.receivedQuantity,
            remarks: item.remarks,
            receivedAt: new Date()
          }))
        });

        // Update all products
        productDocs.forEach(({ ref, data, item }) => {
          if (data.variants && data.variants.length > 0) {
            const variants = [...data.variants];
            variants[0] = {
              ...variants[0],
              quantity: (variants[0].quantity || 0) + item.receivedQuantity
            };
            
            const newTotalQuantity = variants.reduce((sum, variant) => 
              sum + (Number(variant.quantity) || 0), 0
            );

            transaction.update(ref, {
              quantity: newTotalQuantity,
              variants: variants,
              lastRestockDate: new Date(),
              lastUpdated: new Date().toISOString(),
              lastUpdateBy: 'receiving'
            });
          } else {
            const newQuantity = (data.quantity || 0) + item.receivedQuantity;
            
            transaction.update(ref, {
              quantity: newQuantity,
              lastRestockDate: new Date(),
              lastUpdated: new Date().toISOString(),
              lastUpdateBy: 'receiving'
            });
          }
        });
      });

      onClose();
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Failed to process receipt: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Process Receipt - PO #{po.poNumber}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 150px)' }}>
            {/* PO Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Supplier</p>
                <p className="font-medium">{po.supplierName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expected Delivery</p>
                <p className="font-medium">
                  {po.deliveryDate
                    ? new Date(po.deliveryDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Not specified'}
                </p>
              </div>
            </div>

            {/* Items Table */}
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
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receivedItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-500">
                          Category: {item.productId.split('-')[0] || 'N/A'}
                        </div>
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
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) => handleRemarksChange(index, e.target.value)}
                          placeholder="Add remarks..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className={`px-4 py-2 bg-orange-500 text-white rounded-lg flex items-center gap-2
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'}`}
            >
              <FiSave size={18} />
              {isProcessing ? 'Processing...' : 'Process Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessReceiptModal; 