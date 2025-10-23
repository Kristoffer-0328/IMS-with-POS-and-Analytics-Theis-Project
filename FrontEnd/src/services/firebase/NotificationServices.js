// NotificationServices.js - Service for generating system notifications
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import app from './config';

const db = getFirestore(app);

/**
 * Generate a purchase order notification
 * @param {Object} poData - Purchase order data
 * @param {Object} currentUser - Current user information
 * @param {string} action - 'created', 'approved', or 'rejected'
 * @param {string} notes - Optional approval/rejection notes
 * @returns {Promise<Object|null>} - Notification object or null if failed
 */
export const generatePurchaseOrderNotification = async (poData, currentUser, action, notes = '') => {
  try {
    if (!poData || !currentUser) {
      return null;
    }

    // Validate required fields
    const requiredFields = ['poNumber', 'totalAmount', 'supplierName'];
    const missingFields = requiredFields.filter(field => !poData[field]);
    if (missingFields.length > 0) {
      console.error('❌ Missing required PO fields:', missingFields, 'Available fields:', Object.keys(poData));
      console.error('❌ PO Data dump:', JSON.stringify(poData, null, 2));
      return null;
    }

    const notificationId = `PO-NOT-${action.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let notificationConfig = {};

    switch (action) {
      case 'created':
        notificationConfig = {
          type: 'draft_po_created',
          priority: 'high',
          title: 'Purchase Order Draft Created',
          message: `PO ${poData.poNumber} Created for ₱${poData.totalAmount?.toLocaleString() || 'N/A'}`,
          targetRoles: ['Admin']
        };
        break;

      case 'approved':
        notificationConfig = {
          type: 'po_approved',
          priority: 'normal',
          title: 'Purchase Order Approved',
          message: `PO ${poData.poNumber} has been approved for ₱${poData.totalAmount?.toLocaleString() || 'N/A'}`,
          targetRoles: ['Admin', 'InventoryManager']
        };
        break;

      case 'rejected':
        notificationConfig = {
          type: 'po_rejected',
          priority: 'high',
          title: 'Purchase Order Rejected',
          message: `PO ${poData.poNumber} has been rejected`,
          targetRoles: ['Admin', 'InventoryManager']
        };
        break;

      case 'submitted':
        notificationConfig = {
          type: 'po_pending_approval',
          priority: 'high',
          title: 'Purchase Order Submitted for Approval',
          message: `PO ${poData.poNumber} submitted for approval for ₱${poData.totalAmount?.toLocaleString() || 'N/A'}`,
          targetRoles: ['Admin']
        };
        break;
    }

    const notification = {
      notificationId,
      ...notificationConfig,
      details: {
        poId: poData.id || poData.poId,
        poNumber: poData.poNumber,
        supplierName: poData.supplierName,
        totalAmount: poData.totalAmount,
        itemCount: poData.items?.length || 0,
        deliveryDate: poData.deliveryDate,
        paymentTerms: poData.paymentTerms,
        items: poData.items?.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })) || [],
        ...(notes && { approvalNotes: notes }),
        action,
        actionTimestamp: serverTimestamp()
      },
      targetRoles: notificationConfig.targetRoles,
      triggeredBy: currentUser.uid || 'system',
      triggeredByName: currentUser.name || currentUser.displayName || currentUser.email || 'System',
      relatedPoId: poData.id || poData.poId,
      isRead: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save to notifications collection
    await addDoc(collection(db, 'Notifications'), notification);

    return notification;
  } catch (error) {
    console.error('❌ Error generating purchase order notification:', error);
    return null;
  }
};

/**
 * Generate a receiving notification
 * @param {Object} receivingTransactionData - Receiving transaction data
 * @param {Object} currentUser - Current user information
 * @returns {Promise<Object|null>} - Notification object or null if failed
 */
export const generateReceivingNotification = async (receivingTransactionData, currentUser) => {
  try {
    if (!receivingTransactionData || !currentUser) return null;

    const notificationId = `RCV-NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification = {
      notificationId,
      type: 'receiving_completed',
      priority: 'normal',
      title: 'Receiving Completed',
      message: `Receiving transaction ${receivingTransactionData.transactionId || receivingTransactionData.id} completed`,
      details: {
        transactionId: receivingTransactionData.transactionId || receivingTransactionData.id,
        poNumber: receivingTransactionData.poNumber,
        supplierName: receivingTransactionData.supplierName,
        itemCount: receivingTransactionData.items?.length || 0,
        totalValue: receivingTransactionData.totalValue,
        items: receivingTransactionData.items?.map(item => ({
          productName: item.productName,
          receivedQuantity: item.receivedQuantity,
          unitPrice: item.unitPrice,
          totalValue: item.receivedQuantity * item.unitPrice
        })) || [],
        receivedAt: serverTimestamp()
      },
      targetRoles: ['InventoryManager', 'Admin'],
      triggeredBy: currentUser.uid || 'system',
      triggeredByName: currentUser.name || currentUser.displayName || currentUser.email || 'System',
      relatedTransactionId: receivingTransactionData.transactionId || receivingTransactionData.id,
      isRead: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save to notifications collection
    await addDoc(collection(db, 'Notifications'), notification);

    return notification;
  } catch (error) {
    console.error('Error generating receiving notification:', error);
    return null;
  }
};

/**
 * Generate a release notification
 * @param {Object} releaseData - Release transaction data
 * @param {Object} currentUser - Current user information
 * @returns {Promise<Object|null>} - Notification object or null if failed
 */
export const generateReleaseNotification = async (releaseData, currentUser) => {
  try {
    if (!releaseData || !currentUser) return null;

    const notificationId = `REL-NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification = {
      notificationId,
      type: 'release_completed',
      priority: 'normal',
      title: 'Release Completed',
      message: `Release transaction ${releaseData.releaseId || releaseData.transactionId} completed`,
      details: {
        releaseId: releaseData.releaseId || releaseData.transactionId,
        transactionId: releaseData.transactionId,
        releasedByName: releaseData.releasedByName || currentUser.name || currentUser.displayName || currentUser.email,
        itemCount: releaseData.items?.length || 0,
        totalValue: releaseData.totalValue,
        items: releaseData.items?.map(item => ({
          productName: item.productName,
          releasedQuantity: item.releasedQuantity || item.quantity,
          unitPrice: item.unitPrice,
          totalValue: (item.releasedQuantity || item.quantity) * item.unitPrice
        })) || [],
        releasedAt: serverTimestamp()
      },
      targetRoles: ['InventoryManager', 'Admin'],
      triggeredBy: currentUser.uid || 'system',
      triggeredByName: currentUser.name || currentUser.displayName || currentUser.email || 'System',
      relatedTransactionId: releaseData.releaseId || releaseData.transactionId,
      isRead: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save to notifications collection
    await addDoc(collection(db, 'Notifications'), notification);

    return notification;
  } catch (error) {
    console.error('Error generating release notification:', error);
    return null;
  }
};
