import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import ErrorModal from '../../../../components/modals/ErrorModal';

const db = getFirestore(app);

const RestockingAlertModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [restockingRequests, setRestockingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalData, setAlertModalData] = useState({ title: '', message: '', type: 'info', details: '' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({ title: '', message: '', details: '', onConfirm: null });

  const openModal = (data) => {
    setAlertModalData({
      title: data.title || 'Notice',
      message: data.message || '',
      type: data.type || 'info',
      details: data.details || ''
    });
    setShowAlertModal(true);
  };

  const openConfirmModal = (data) => {
    return new Promise((resolve) => {
      setConfirmModalData({
        title: data.title || 'Confirm Action',
        message: data.message || 'Are you sure?',
        details: data.details || '',
        onConfirm: () => {
          setShowConfirmModal(false);
          resolve(true);
        },
        onCancel: () => {
          setShowConfirmModal(false);
          resolve(false);
        }
      });
      setShowConfirmModal(true);
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    // Normalize different historical/new collection and field names into a common shape
    const normalize = (id, data, source) => {
      const variantDetails = data.variantDetails || (
        data.size || data.unit
          ? { size: data.size || 'N/A', unit: data.unit || 'pcs' }
          : undefined
      );
      const createdAtMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
      return {
        id,
        __source: source,
        productId: data.productId,
        productName: data.productName,
        category: data.category || '',
        priority: data.priority || 'urgent',
        variantDetails,
        location: data.location || data.storageLocation || null,
        currentQuantity: data.currentQuantity ?? data.currentQty ?? data.currentStock ?? 0,
        restockLevel: data.restockLevel ?? data.reorderPoint ?? data.rop ?? 0,
        safetyStock: data.safetyStock ?? data.minSafetyStock ?? 0,
        status: data.status || 'pending',
        createdAtMs
      };
    };

    let aRequests = [];
    let bRequests = [];

    const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, normal: 4 };
    const updateCombined = () => {
      const combined = [...aRequests, ...bRequests];
      combined.sort((x, y) => {
        const pa = priorityOrder[x.priority] ?? 999;
        const pb = priorityOrder[y.priority] ?? 999;
        if (pa !== pb) return pa - pb;
        return (y.createdAtMs || 0) - (x.createdAtMs || 0);
      });
      setRestockingRequests(combined);
      setLoading(false);
    };

    const qA = query(
      collection(db, 'RestockingRequests'),
      where('status', 'in', ['pending', 'acknowledged'])
    );
    const qB = query(
      collection(db, 'RestockRequests'),
      where('status', 'in', ['pending', 'acknowledged'])
    );

    const unsubA = onSnapshot(
      qA,
      (snapshot) => {
        aRequests = snapshot.docs.map((d) => normalize(d.id, d.data(), 'RestockingRequests'));
        updateCombined();
      },
      (error) => {
        console.warn('RestockingRequests snapshot error:', error);
        aRequests = [];
        updateCombined();
      }
    );

    const unsubB = onSnapshot(
      qB,
      (snapshot) => {
        bRequests = snapshot.docs.map((d) => normalize(d.id, d.data(), 'RestockRequests'));
        updateCombined();
      },
      (error) => {
        console.warn('RestockRequests snapshot error:', error);
        bRequests = [];
        updateCombined();
      }
    );

    return () => {
      unsubA();
      unsubB();
    };
  }, [isOpen]);

  // Group requests by product ID and variant details (to combine same product across locations)
  const groupedRequests = useMemo(() => {
    const groups = {};
    
    restockingRequests.forEach(request => {
      // Create a unique key combining productId and variant details
      // This ensures same product with same variant but different locations are grouped
      const variantKey = request.variantDetails 
        ? `${request.variantDetails.size || 'default'}_${request.variantDetails.unit || 'pcs'}`
        : 'no_variant';
      
      const key = `${request.productId}_${variantKey}`;
      
      if (!groups[key]) {
        groups[key] = {
          productId: request.productId,
          productName: request.productName,
          category: request.category,
          priority: request.priority,
          variantDetails: request.variantDetails,
          locations: [],
          totalCurrentQty: 0,
          highestROP: 0,
          totalSafetyStock: 0
        };
      }
      
      groups[key].locations.push(request);
      groups[key].totalCurrentQty += request.currentQuantity || 0;
      groups[key].highestROP = Math.max(groups[key].highestROP, request.restockLevel || 0);
      
      if (request.safetyStock && request.safetyStock > 0) {
        groups[key].totalSafetyStock += request.safetyStock;
      }
      
      // Use highest priority from all locations
      const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, normal: 4 };
      const currentPriorityValue = priorityOrder[groups[key].priority] || 999;
      const newPriorityValue = priorityOrder[request.priority] || 999;
      if (newPriorityValue < currentPriorityValue) {
        groups[key].priority = request.priority;
      }
    });
    
    return Object.values(groups).sort((a, b) => {
      const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, normal: 4 };
      return (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
    });
  }, [restockingRequests]);

  // Filter groups by priority
  const filteredGroups = useMemo(() => {
    if (filter === 'all') return groupedRequests;
    return groupedRequests.filter(group => group.priority === filter);
  }, [groupedRequests, filter]);

  // Count by priority
  const counts = useMemo(() => {
    return {
      critical: groupedRequests.filter(g => g.priority === 'critical').length,
      urgent: groupedRequests.filter(g => g.priority === 'urgent').length,
      high: groupedRequests.filter(g => g.priority === 'high').length,
      all: groupedRequests.length
    };
  }, [groupedRequests]);

  // Toggle group expansion
  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Get priority icon and color
  const getPriorityDisplay = (priority) => {
    const displays = {
      critical: { label: 'CRITICAL', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300', badgeBg: 'bg-red-600' },
      urgent: { label: 'URGENT', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', badgeBg: 'bg-orange-600' },
      high: { label: 'HIGH', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-300', badgeBg: 'bg-yellow-600' },
      medium: { label: 'MEDIUM', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300', badgeBg: 'bg-blue-600' },
      normal: { label: 'NORMAL', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-300', badgeBg: 'bg-green-600' }
    };
    return displays[priority] || displays.normal;
  };

  /**
   * Replenish stock using safety stock
   * Status behavior:
   * - pending: New request, shows in modal
   * - acknowledged: User saw it, remains visible
   * - resolved_safety_stock: Resolved by safety stock replenishment (removed from modal)
   * - dismissed: Ignored/removed (removed from modal)
   */
  const handleReplenish = async (group) => {
    if (processingId) return;

    // Use the first location's request data as representative
    const request = group.locations[0];
    // Attempt to determine variant identity from request
    const variantIdFromRequest = request.variantId || null;
    const variantSize = request.variantDetails?.size || request.size || null;
    const variantUnit = request.variantDetails?.unit || request.unit || null;

    const safetyStockAmount = request.safetyStock || 0;

    if (safetyStockAmount <= 0) {
      openModal({
        title: 'No Safety Stock',
        message: 'Cannot replenish: No safety stock available for this product.',
        type: 'warning'
      });
      return;
    }

    const confirmed = await openConfirmModal({
      title: 'Confirm Replenishment',
      message: 'Do you want to replenish stock using safety stock?',
      details: `Product: ${group.productName}\nCurrent Stock: ${group.totalCurrentQty} units\nSafety Stock Available: ${group.totalSafetyStock} units\nAmount to Replenish: ${safetyStockAmount} units\n\nThis will move ${safetyStockAmount} units from safety stock to normal stock.`
    });

    if (!confirmed) return;

    setProcessingId(request.id);

    try {
      await runTransaction(db, async (transaction) => {
        // NEW DATA STRUCTURE: Use Variants collection (flat structure)
        // Find the variant document directly in Variants collection
        let variantRef = null;
        let variantData = null;
        let masterProductRef = null;
        let masterProductData = null;

        console.log('🔍 Searching for variant with:', {
          variantIdFromRequest,
          productId: request.productId,
          variantSize,
          variantUnit,
          requestData: request
        });

        // 1. Try to find variant by ID first
        if (variantIdFromRequest) {
          const vRef = doc(db, 'Variants', variantIdFromRequest);
          const vSnap = await transaction.get(vRef);
          if (vSnap.exists()) {
            variantRef = vRef;
            variantData = vSnap.data();
            console.log('✅ Found variant by ID:', variantIdFromRequest, variantData);
          } else {
            console.log('❌ Variant not found by ID:', variantIdFromRequest);
          }
        }

        // 2. If no variantId, query Variants by productId + size/unit match
        if (!variantRef && request.productId) {
          console.log('🔍 Querying Variants by parentProductId:', request.productId);
          const variantsQuery = query(
            collection(db, 'Variants'),
            where('parentProductId', '==', request.productId)
          );
          const variantsSnapshot = await getDocs(variantsQuery);
          
          console.log('📦 Found', variantsSnapshot.size, 'variants for product:', request.productId);
          
          for (const vDoc of variantsSnapshot.docs) {
            const vData = vDoc.data();
            console.log('🔎 Checking variant:', vDoc.id, {
              size: vData.size,
              unit: vData.unit,
              baseUnit: vData.baseUnit,
              searching: { variantSize, variantUnit }
            });
            
            // Handle size matching: 'N/A' or null/undefined should match undefined/null
            const normalizedRequestSize = (variantSize === 'N/A' || !variantSize) ? null : variantSize;
            const normalizedVariantSize = vData.size || null;
            const sizeMatch = normalizedRequestSize === null ? true : (normalizedVariantSize === normalizedRequestSize);
            
            // Handle unit matching: check both unit and baseUnit fields
            const normalizedVariantUnit = vData.unit || vData.baseUnit || null;
            const unitMatch = variantUnit ? (normalizedVariantUnit === variantUnit) : true;
            
            console.log('🔍 Match check:', { sizeMatch, unitMatch, normalizedRequestSize, normalizedVariantSize, normalizedVariantUnit });
            
            if (sizeMatch && unitMatch) {
              variantRef = vDoc.ref;
              variantData = vData;
              console.log('✅ Matched variant:', vDoc.id);
              break;
            }
          }
          
          if (!variantRef) {
            console.log('❌ No matching variant found in', variantsSnapshot.size, 'variants');
          }
        }

        if (!variantRef || !variantData) {
          throw new Error(`Variant not found in inventory (Variants collection). Searched with: variantId=${variantIdFromRequest}, productId=${request.productId}, size=${variantSize}, unit=${variantUnit}`);
        }

        // 3. Get Master product info for logging
        const parentProductId = variantData.parentProductId || variantData.productId || request.productId;
        if (parentProductId) {
          masterProductRef = doc(db, 'Master', parentProductId);
          const masterSnap = await transaction.get(masterProductRef);
          if (masterSnap.exists()) {
            masterProductData = masterSnap.data();
          }
        }

        // Compute previous quantities & safety stock
        const previousQuantity = variantData.quantity || 0;
        const variantLevelSafety = variantData.safetyStock || 0;

        // Decrement safety stock and increment regular stock
        const newVariantSafetyStock = Math.max(0, variantLevelSafety - safetyStockAmount);
        const newQuantity = previousQuantity + safetyStockAmount;

        // Update the variant document in Variants collection
        transaction.update(variantRef, {
          quantity: newQuantity,
          safetyStock: newVariantSafetyStock,
          lastUpdated: serverTimestamp()
        });

        // Create stock movement record with variant details
        const movementRef = doc(collection(db, 'stock_movements'));
        transaction.set(movementRef, {
          movementType: 'safety_stock_replenishment',
          productId: parentProductId || request.productId,
          productName: masterProductData?.name || request.productName,
          variantId: variantData.id || variantIdFromRequest,
          variantName: variantData.variantName || variantData.name || null,
          variantSize: variantData.size || variantSize,
          variantUnit: variantData.unit || variantData.baseUnit || variantUnit,
          previousQuantity,
          newQuantity,
          usedSafetyStock: safetyStockAmount,
          location: request.location,
          storageLocation: variantData.storageLocation || request.location,
          reason: 'Replenished from safety stock',
          performedBy: currentUser?.uid || 'unknown',
          performedByName: currentUser?.displayName || currentUser?.email || 'Unknown',
          timestamp: serverTimestamp()
        });

        // Release log (legacy integration) with variant metadata
        const releaseLogRef = doc(collection(db, 'release_logs'));
        transaction.set(releaseLogRef, {
          productId: parentProductId || request.productId,
          productName: masterProductData?.name || request.productName,
          variantId: variantData.id || variantIdFromRequest,
          variantName: variantData.variantName || variantData.name || null,
          variantSize: variantData.size || variantSize,
          variantUnit: variantData.unit || variantData.baseUnit || variantUnit,
          quantityReleased: safetyStockAmount,
          relatedRequestId: request.id,
          releasedBy: currentUser?.uid || 'unknown',
          releasedByName: currentUser?.displayName || currentUser?.email || 'Unknown',
          timestamp: serverTimestamp()
        });

        // Update all grouped requests to resolved (update in original collection)
        for (const loc of group.locations) {
          const collectionName = loc.__source || 'RestockingRequests';
          const requestRef = doc(db, collectionName, loc.id);
          transaction.update(requestRef, {
            status: 'resolved_safety_stock',
            resolvedAt: serverTimestamp(),
            resolvedBy: currentUser?.uid || 'unknown',
            resolvedByName: currentUser?.displayName || currentUser?.email || 'Unknown',
            updatedAt: serverTimestamp(),
            variantResolved: true,
            variantId: variantData.id || variantIdFromRequest
          });
        }
      });

      openModal({
        title: 'Replenishment Successful',
        message: `${group.productName} has been replenished from safety stock.`,
        type: 'success',
        details: `Added: ${safetyStockAmount} units\nNew Stock: ${(group.totalCurrentQty || 0) + safetyStockAmount} units${variantSize ? `\nVariant: ${variantSize} ${variantUnit || ''}` : ''}`
      });

    } catch (error) {
      console.error('Replenishment error:', error);
      openModal({
        title: 'Replenishment Failed',
        message: `Replenishment failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Acknowledge alert (mark as seen)
  const handleAcknowledge = async (requestId) => {
    try {
      const requestRef = doc(db, 'RestockingRequests', requestId);
      await updateDoc(requestRef, {
        status: 'acknowledged',
        acknowledgedBy: currentUser?.uid || 'unknown',
        acknowledgedByName: currentUser?.displayName || currentUser?.email || 'Unknown',
        acknowledgedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error acknowledging request:', error);
      openModal({
        title: 'Action Failed',
        message: 'Failed to acknowledge alert',
        type: 'error'
      });
    }
  };

  // Dismiss alert
  const handleDismiss = async (requestId) => {
    const confirmed = await openConfirmModal({
      title: 'Dismiss Alert',
      message: 'Are you sure you want to dismiss this alert?',
      details: 'The alert will be marked as dismissed and removed from the list.'
    });

    if (!confirmed) return;

    try {
      const requestRef = doc(db, 'RestockingRequests', requestId);
      await updateDoc(requestRef, {
        status: 'dismissed',
        dismissedBy: currentUser?.uid || 'unknown',
        dismissedByName: currentUser?.displayName || currentUser?.email || 'Unknown',
        dismissedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error dismissing request:', error);
      openModal({
        title: 'Action Failed',
        message: 'Failed to dismiss alert',
        type: 'error'
      });
    }
  };

  if (!isOpen) return null;

  // Check if there are any pending requests that require attention
  const hasPendingRequests = restockingRequests.some(req => req.status === 'pending');
  const canClose = !hasPendingRequests;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={canClose ? onClose : undefined}
        />

        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Restocking Alerts
                  </h3>
                  <p className="text-sm text-orange-100">
                    {counts.all} product{counts.all !== 1 ? 's' : ''} need attention
                    {counts.critical > 0 && ` • ${counts.critical} critical`}
                    {counts.urgent > 0 && ` • ${counts.urgent} urgent`}
                    {counts.high > 0 && ` • ${counts.high} high`}
                  </p>
                </div>
              </div>
              {canClose && (
                <button
                  onClick={onClose}
                  className="text-white transition-colors hover:text-gray-200"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {!canClose && (
                <div className="text-orange-100 text-sm font-medium px-3 py-1 bg-white/10 rounded-lg">
                  Action Required
                </div>
              )}
            </div>
          </div>

          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex px-6 space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === 'all'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                onClick={() => setFilter('critical')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === 'critical'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Critical ({counts.critical})
              </button>
              <button
                onClick={() => setFilter('urgent')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === 'urgent'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Urgent ({counts.urgent})
              </button>
              <button
                onClick={() => setFilter('high')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === 'high'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                High ({counts.high})
              </button>
            </div>
          </div>

          <div className="px-6 py-4 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">Loading alerts...</p>
                </div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                  No Alerts
                </h4>
                <p className="text-gray-500">
                  {filter === 'all' 
                    ? 'All inventory levels are healthy!'
                    : `No ${filter} priority alerts at this time.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((group) => {
                  // Create the same key format used in grouping
                  const variantKey = group.variantDetails 
                    ? `${group.variantDetails.size || 'default'}_${group.variantDetails.unit || 'pcs'}`
                    : 'no_variant';
                  const groupKey = `${group.productId}_${variantKey}`;
                  
                  const display = getPriorityDisplay(group.priority);
                  const isExpanded = expandedGroups[groupKey];
                  const hasMultipleLocations = group.locations.length > 1;
                  
                  // Create display name with variant info if exists
                  const displayName = group.variantDetails && group.variantDetails.size !== 'N/A'
                    ? `${group.productName} (${group.variantDetails.size} ${group.variantDetails.unit})`
                    : group.productName;
                  
                  return (
                    <div
                      key={groupKey}
                      className={`border-2 rounded-lg ${display.border} ${display.bg} transition-all hover:shadow-md`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${display.badgeBg}`}>
                                {display.label}
                              </span>
                              <div className="flex-1">
                                <h4 className="text-lg font-bold text-gray-800">
                                  {displayName}
                                </h4>
                                <p className="text-sm text-gray-600">{group.category}</p>
                              </div>
                              {hasMultipleLocations && (
                                <button
                                  onClick={() => toggleGroup(groupKey)}
                                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <span>{group.locations.length} locations</span>
                                  <svg 
                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Total Current Stock</p>
                                <p className={`text-lg font-bold ${display.color}`}>
                                  {group.totalCurrentQty}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Reorder Point</p>
                                <p className="text-lg font-semibold text-gray-700">
                                  {group.highestROP}
                                </p>
                              </div>
                              {group.totalSafetyStock > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Safety Stock Available</p>
                                  <p className="text-lg font-bold text-blue-600">
                                    {group.totalSafetyStock}
                                  </p>
                                </div>
                              )}
                            </div>

                            {isExpanded && hasMultipleLocations && (
                              <div className="mt-3 border-t border-gray-300 pt-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Location Breakdown:</h5>
                                <div className="space-y-2">
                                  {group.locations.map((location) => (
                                    <div key={location.id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800">
                                          {location.location?.fullPath || location.fullLocation || 'Unknown Location'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Stock: {location.currentQuantity} | ROP: {location.restockLevel}
                                          {location.safetyStock > 0 && ` | Safety: ${location.safetyStock}`}
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleAcknowledge(location.id)}
                                          className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                                        >
                                          Acknowledge
                                        </button>
                                        <button
                                          onClick={() => handleDismiss(location.id)}
                                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {group.totalSafetyStock > 0 && (
                              <button
                                onClick={() => handleReplenish(group)}
                                disabled={processingId}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {processingId ? 'Processing...' : 'Replenish'}
                              </button>
                            )}

                            {!hasMultipleLocations && group.locations[0]?.status === 'pending' && (
                              <button
                                onClick={() => handleAcknowledge(group.locations[0].id)}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Acknowledge
                              </button>
                            )}

                            {!hasMultipleLocations && (
                              <button
                                onClick={() => handleDismiss(group.locations[0].id)}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Dismiss
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Real-time monitoring - Updates automatically
              </p>
              {canClose ? (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              ) : (
                <p className="text-sm font-medium text-orange-600">
                  Please acknowledge or dismiss pending alerts to close
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showAlertModal && (
        <ErrorModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          title={alertModalData.title}
          message={alertModalData.message}
          type={alertModalData.type}
          details={alertModalData.details}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onConfirm={confirmModalData.onConfirm}
          onCancel={confirmModalData.onCancel}
          title={confirmModalData.title}
          message={confirmModalData.message}
          details={confirmModalData.details}
        />
      )}
    </div>
  );
};

// Confirmation Modal Component (two-button variant)
const ConfirmModal = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = 'Confirm Action', 
  message = '', 
  details = ''
}) => {
  if (!isOpen) return null;

  // Handle ESC key
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="bg-white border-2 border-blue-300 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-blue-100 text-blue-600 rounded-full p-3 flex-shrink-0">
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label="Confirmation"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M9 12h6" />
              <path d="M12 9v6" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-blue-900 mb-2">
              {title}
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Details Section (Optional) */}
        {details && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-300">
            <p className="text-xs text-blue-800 font-mono whitespace-pre-wrap">
              {details}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestockingAlertModal;
