import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  getFirestore,
  writeBatch,
  increment,
  limit
} from 'firebase/firestore';
import app from '../../FirebaseConfig';

const db = getFirestore(app);

// Validation functions
const validatePOData = (poData) => {
  const errors = [];

  if (!poData.supplierId) errors.push('Supplier ID is required');
  if (!poData.supplierName) errors.push('Supplier name is required');
  if (!poData.items || !Array.isArray(poData.items) || poData.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    poData.items.forEach((item, index) => {
      if (!item.productId) errors.push(`Item ${index + 1}: Product ID is required`);
      if (!item.productName) errors.push(`Item ${index + 1}: Product name is required`);
      if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index + 1}: Valid quantity is required`);
      if (!item.unitPrice || item.unitPrice <= 0) errors.push(`Item ${index + 1}: Valid unit price is required`);
    });
  }
  if (!poData.deliveryDate) errors.push('Delivery date is required');
  if (!poData.createdBy?.id) errors.push('Creator information is required');

  return errors;
};

const validateApprovalData = (approvalData) => {
  const errors = [];

  if (!approvalData.approverData?.role) errors.push('Approver role is required');
  if (!approvalData.action || !['approved', 'rejected'].includes(approvalData.action)) {
    errors.push('Invalid approval action');
  }

  return errors;
};

export const usePurchaseOrderServices = () => {
  // Generate PO Number
  const generatePONumber = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      
      // Get count of POs for this month
      const q = query(
        collection(db, 'purchase_orders'),
        where('createdAt', '>=', new Date(today.getFullYear(), today.getMonth(), 1)),
        where('createdAt', '<=', new Date(today.getFullYear(), today.getMonth() + 1, 0))
      );
      
      const querySnapshot = await getDocs(q);
      const count = querySnapshot.size + 1;
      
      return `PO-${year}${month}-${count.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating PO number:', error);
      throw new Error('Failed to generate PO number');
    }
  };

  // Create Purchase Order
  const createPurchaseOrder = async (poData) => {
    try {
      // Validate PO data
      const validationErrors = validatePOData(poData);
      if (validationErrors.length > 0) {
        return { success: false, error: validationErrors.join(', ') };
      }

      const poNumber = await generatePONumber();
      const newPO = {
        ...poData,
        poNumber,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'purchase_orders'), newPO);
      return { success: true, id: docRef.id, poNumber };
    } catch (error) {
      console.error('Error creating purchase order:', error);
      return { success: false, error: error.message };
    }
  };

  // Update Purchase Order
  const updatePurchaseOrder = async (poId, updateData) => {
    try {
      if (!poId) throw new Error('Purchase Order ID is required');

      const poRef = doc(db, 'purchase_orders', poId);
      const poDoc = await getDoc(poRef);
      
      if (!poDoc.exists()) {
        throw new Error('Purchase order not found');
      }

      // Don't allow updating certain fields
      const { poNumber, createdAt, createdBy, ...allowedUpdates } = updateData;

      await updateDoc(poRef, {
        ...allowedUpdates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating purchase order:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete Purchase Order
  const deletePurchaseOrder = async (poId) => {
    try {
      if (!poId) throw new Error('Purchase Order ID is required');

      const poRef = doc(db, 'purchase_orders', poId);
      const poDoc = await getDoc(poRef);
      
      if (!poDoc.exists()) {
        throw new Error('Purchase order not found');
      }

      const poData = poDoc.data();
      if (poData.status !== 'draft') {
        throw new Error('Only draft purchase orders can be deleted');
      }

      await deleteDoc(poRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      return { success: false, error: error.message };
    }
  };

  // Get Purchase Order by ID
  const getPurchaseOrder = async (poId) => {
    try {
      if (!poId) throw new Error('Purchase Order ID is required');

      const poDoc = await getDoc(doc(db, 'purchase_orders', poId));
      if (poDoc.exists()) {
        return { success: true, data: { id: poDoc.id, ...poDoc.data() } };
      }
      return { success: false, error: 'Purchase order not found' };
    } catch (error) {
      console.error('Error getting purchase order:', error);
      return { success: false, error: error.message };
    }
  };

  // List Purchase Orders with optional filters
  const listPurchaseOrders = async (filters = {}) => {
    try {
      let q = collection(db, 'purchase_orders');
      
      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.supplierId) {
        q = query(q, where('supplierId', '==', filters.supplierId));
      }
      if (filters.startDate) {
        q = query(q, where('createdAt', '>=', filters.startDate));
      }
      if (filters.endDate) {
        q = query(q, where('createdAt', '<=', filters.endDate));
      }
      
      // Always sort by creation date
      q = query(q, orderBy('createdAt', 'desc'));
      
      // Add pagination if specified
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }
      
      const querySnapshot = await getDocs(q);
      const pos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: pos };
    } catch (error) {
      console.error('Error listing purchase orders:', error);
      return { success: false, error: error.message };
    }
  };

  // Listen to Purchase Orders (real-time updates)
  const listenToPurchaseOrders = (callback) => {
    try {

      const q = query(
        collection(db, 'purchase_orders'),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {

        const pos = snapshot.docs.map(doc => {
          const data = doc.data();

          return {
            id: doc.id,
            ...data
          };
        });
        callback(pos);
      }, (error) => {
        console.error('Error in PO listener:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Error setting up PO listener:', error);
      callback([]);
      return () => {}; // Return empty cleanup function
    }
  };

  // Submit PO for approval
  const submitPOForApproval = async (poId, submitterNotes = '') => {
    try {
      if (!poId) throw new Error('Purchase Order ID is required');

      const poRef = doc(db, 'purchase_orders', poId);
      const poDoc = await getDoc(poRef);
      
      if (!poDoc.exists()) {
        throw new Error('Purchase order not found');
      }

      const poData = poDoc.data();
      if (poData.status !== 'draft') {
        throw new Error('Only draft purchase orders can be submitted for approval');
      }

      const batch = writeBatch(db);
      const approvalRef = await addDoc(collection(db, 'po_approvals'), {
        poId,
        status: 'pending',
        submitterNotes,
        submittedAt: serverTimestamp(),
        approvalSteps: [
          {
            level: 1,
            role: 'Admin',
            status: 'pending',
            required: true
          }
        ]
      });

      batch.update(poRef, {
        status: 'pending_approval',
        approvalId: approvalRef.id,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      return { success: true, approvalId: approvalRef.id };
    } catch (error) {
      console.error('Error submitting PO for approval:', error);
      return { success: false, error: error.message };
    }
  };

  // Process an approval step
  const processApprovalStep = async (poId, approvalId, approverData, action, notes = '') => {
    try {
      // Validate required parameters
      if (!poId) throw new Error('Purchase Order ID is required');
      if (!approvalId) throw new Error('Approval ID is required');
      if (!approverData) throw new Error('Approver data is required');
      if (!action) throw new Error('Action is required');

      // Validate approval data
      const validationErrors = validateApprovalData({ approverData, action });
      if (validationErrors.length > 0) {
        return { success: false, error: validationErrors.join(', ') };
      }

      const batch = writeBatch(db);
      const approvalRef = doc(db, 'po_approvals', approvalId);
      const poRef = doc(db, 'purchase_orders', poId);
      
      const [approvalDoc, poDoc] = await Promise.all([
        getDoc(approvalRef),
        getDoc(poRef)
      ]);

      if (!approvalDoc.exists()) throw new Error('Approval record not found');
      if (!poDoc.exists()) throw new Error('Purchase order not found');

      const approvalData = approvalDoc.data();
      const poData = poDoc.data();

      if (poData.status !== 'pending_approval') {
        throw new Error('Purchase order is not pending approval');
      }
      
      // Find current step based on approver's role
      const currentStep = approvalData.approvalSteps.find(
        step => step.role === approverData.role && step.status === 'pending'
      );
      
      if (!currentStep) {
        throw new Error('No pending approval step found for this role');
      }
      
      // Update the current step - use regular timestamp for array element
      const now = new Date();
      const updatedSteps = approvalData.approvalSteps.map(step => {
        if (step.level === currentStep.level) {
          return {
            ...step,
            status: action,
            approvedBy: approverData,
            approvedAt: now,
            notes
          };
        }
        return step;
      });
      
      // Check if this is the final approval/rejection
      const isComplete = updatedSteps.every(step => 
        step.status === 'approved' || !step.required
      );
      const isRejected = updatedSteps.some(step => 
        step.status === 'rejected' && step.required
      );
      
      // Update approval document - use serverTimestamp for top-level fields
      batch.update(approvalRef, {
        'approvalSteps': updatedSteps,
        status: isRejected ? 'rejected' : (isComplete ? 'approved' : 'pending'),
        updatedAt: serverTimestamp()
      });
      
      // Update PO status
      if (isComplete || isRejected) {
        batch.update(poRef, {
          status: isRejected ? 'rejected' : 'approved',
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error processing approval step:', error);
      return { success: false, error: error.message };
    }
  };

  // Receive Purchase Order
  const receivePurchaseOrder = async (poId, receivedItems) => {
    try {
      if (!poId) throw new Error('Purchase Order ID is required');
      if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
        throw new Error('Received items are required');
      }

      const batch = writeBatch(db);
      const poRef = doc(db, 'purchase_orders', poId);
      const poDoc = await getDoc(poRef);

      if (!poDoc.exists()) throw new Error('Purchase order not found');
      const poData = poDoc.data();

      if (poData.status !== 'approved') {
        throw new Error('Only approved purchase orders can be received');
      }

      // Validate received quantities
      receivedItems.forEach(item => {
        const poItem = poData.items.find(i => i.productId === item.productId);
        if (!poItem) throw new Error(`Product ${item.productId} not found in PO`);
        if (item.receivedQuantity > poItem.quantity) {
          throw new Error(`Cannot receive more than ordered quantity for ${poItem.productName}`);
        }
      });

      // Update stock levels and create receipt entries
      for (const item of receivedItems) {
        const productRef = doc(db, 'Products', item.category, 'Items', item.productId);
        
        // Update stock quantity
        batch.update(productRef, {
          'currentStock': increment(item.receivedQuantity)
        });

        // Create receipt entry
        const receiptRef = collection(db, 'stock_receipts');
        batch.set(doc(receiptRef), {
          poId,
          productId: item.productId,
          quantity: item.receivedQuantity,
          receivedAt: serverTimestamp(),
          receivedBy: item.receivedBy,
          notes: item.notes
        });

        // If this completes the PO item, update restock request
        if (item.restockRequestId) {
          const restockRef = doc(db, 'RestockRequests', item.restockRequestId);
          batch.update(restockRef, {
            status: 'completed',
            completedAt: serverTimestamp()
          });
        }
      }

      // Update PO status if all items received
      const allItemsReceived = poData.items.every(item => {
        const receivedItem = receivedItems.find(ri => ri.productId === item.productId);
        return receivedItem && receivedItem.receivedQuantity >= item.quantity;
      });

      if (allItemsReceived) {
        batch.update(poRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error receiving purchase order:', error);
      return { success: false, error: error.message };
    }
  };

  // Process receiving items for a purchase order
  const processReceiving = async (poId, receivedItems) => {
    try {
      if (!poId) throw new Error('Purchase Order ID is required');
      if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
        throw new Error('Received items are required');
      }

      const batch = writeBatch(db);
      const poRef = doc(db, 'purchase_orders', poId);
      const poDoc = await getDoc(poRef);

      if (!poDoc.exists()) throw new Error('Purchase order not found');
      const poData = poDoc.data();

      if (poData.status !== 'approved') {
        throw new Error('Only approved purchase orders can be received');
      }

      // Validate received quantities
      receivedItems.forEach(item => {
        const poItem = poData.items.find(i => i.productId === item.productId);
        if (!poItem) throw new Error(`Product ${item.productId} not found in PO`);
        if (item.receivedQuantity > poItem.quantity) {
          throw new Error(`Cannot receive more than ordered quantity for ${poItem.productName}`);
        }
      });

      // Update stock levels and create receipt entries
      for (const item of receivedItems) {
        // Create product reference using category and productId
        const productRef = doc(db, 'Products', item.category, 'Items', item.productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
          throw new Error(`Product ${item.productId} not found in inventory`);
        }

        const productData = productDoc.data();
        
        // Update product quantity
        const currentQty = Number(productData.quantity) || 0;
        const newQty = currentQty + Number(item.receivedQuantity);
        
        batch.update(productRef, {
          quantity: newQty
        });

        // Create receipt entry
        const receiptRef = doc(collection(db, 'stock_receipts'));
        batch.set(receiptRef, {
          poId,
          productId: item.productId,
          category: item.category,
          productName: item.productName,
          quantity: item.receivedQuantity,
          receivedAt: serverTimestamp(),
          receivedBy: item.receivedBy,
          notes: item.notes || ''
        });
      }

      // Update PO receiving status
      const allItemsReceived = poData.items.every(item => {
        const receivedItem = receivedItems.find(ri => ri.productId === item.productId);
        const previouslyReceived = item.receivedQuantity || 0;
        const newlyReceived = receivedItem ? receivedItem.receivedQuantity : 0;
        return (previouslyReceived + newlyReceived) >= item.quantity;
      });

      batch.update(poRef, {
        receivingStatus: allItemsReceived ? 'completed' : 'partial',
        updatedAt: serverTimestamp(),
        items: poData.items.map(item => {
          const receivedItem = receivedItems.find(ri => ri.productId === item.productId);
          if (receivedItem) {
            return {
              ...item,
              receivedQuantity: (item.receivedQuantity || 0) + receivedItem.receivedQuantity
            };
          }
          return item;
        })
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error processing receiving:', error);
      return { success: false, error: error.message };
    }
  };

  // Analytics
  const getAnalytics = async (startDate, endDate) => {
    try {
      if (!startDate || !endDate) {
        throw new Error('Start and end dates are required');
      }

      const q = query(
        collection(db, 'purchase_orders'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      
      const querySnapshot = await getDocs(q);
      const pos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate metrics
      const metrics = {
        totalPOs: pos.length,
        totalValue: pos.reduce((sum, po) => sum + (po.totalAmount || 0), 0),
        statusBreakdown: pos.reduce((acc, po) => {
          acc[po.status] = (acc[po.status] || 0) + 1;
          return acc;
        }, {}),
        supplierMetrics: pos.reduce((acc, po) => {
          if (!acc[po.supplierId]) {
            acc[po.supplierId] = {
              name: po.supplierName,
              totalOrders: 0,
              totalValue: 0
            };
          }
          acc[po.supplierId].totalOrders++;
          acc[po.supplierId].totalValue += po.totalAmount || 0;
          return acc;
        }, {}),
        averageProcessingTime: calculateAverageProcessingTime(pos),
        topProducts: calculateTopProducts(pos)
      };

      return { success: true, metrics };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return { success: false, error: error.message };
    }
  };

  const calculateAverageProcessingTime = (pos) => {
    const completedPOs = pos.filter(po => 
      po.status === 'completed' && po.submittedAt && po.completedAt
    );
    
    if (completedPOs.length === 0) return 0;
    
    const totalTime = completedPOs.reduce((sum, po) => {
      const submitTime = po.submittedAt.toDate();
      const completeTime = po.completedAt.toDate();
      return sum + (completeTime - submitTime);
    }, 0);
    
    return totalTime / completedPOs.length / (1000 * 60 * 60 * 24); // Convert to days
  };

  const calculateTopProducts = (pos) => {
    const productCounts = {};
    pos.forEach(po => {
      po.items.forEach(item => {
        if (!productCounts[item.productId]) {
          productCounts[item.productId] = {
            name: item.productName,
            totalQuantity: 0,
            totalValue: 0,
            orderCount: 0
          };
        }
        productCounts[item.productId].totalQuantity += item.quantity;
        productCounts[item.productId].totalValue += item.total;
        productCounts[item.productId].orderCount++;
      });
    });
    
    return Object.entries(productCounts)
      .sort((a, b) => b[1].totalValue - a[1].totalValue)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));
  };

  return {
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    getPurchaseOrder,
    listPurchaseOrders,
    listenToPurchaseOrders,
    submitPOForApproval,
    processApprovalStep,
    receivePurchaseOrder,
    processReceiving,
    getAnalytics
  };
}; 