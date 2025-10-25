import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import { useAuth } from '../../auth/services/FirebaseAuth';
import { FiPackage, FiClock, FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiDownload } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';

const db = getFirestore(app);

// Cancellation reasons
const CANCEL_REASONS = [
  'Payment didn\'t proceed',
  'Customer changed mind',
  'Items not available',
  'Technical issue',
  'Order error',
  'Customer request',
  'Other'
];

const ReleaseManagement = () => {
  const { currentUser } = useAuth();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, released, cancelled
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');

  // Listen to POS transactions that need to be released
  useEffect(() => {

    // Query for all completed transactions (status='completed')
    // These will have releaseStatus field to track release workflow
    const q = query(
      collection(db, 'posTransactions'),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const releaseData = snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,
          releaseStatus: data.releaseStatus || 'pending_release',
          createdAt: data.createdAt?.toDate() || new Date(),
          releasedAt: data.releasedAt?.toDate() || null,
          releasedBy: data.releasedBy || null,
          releasedByName: data.releasedByName || null
        };
      });

      setReleases(releaseData);
      setLoading(false);
    }, (error) => {
      console.error('ReleaseManagement: Error fetching releases:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // If it's an index error, show helpful message
      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        console.error('FIRESTORE INDEX REQUIRED! Check the error message for the index creation link.');
        alert('Firestore index required. Check browser console for the link to create the index.');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter releases
  const filteredReleases = releases.filter(release => {
    const matchesSearch = searchQuery === '' || 
      release.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.cashier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.customerInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || release.releaseStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle showing QR code
  const handleShowQR = (release) => {
    setSelectedRelease(release);
    setShowQRModal(true);
  };

  // Handle showing details modal
  const handleShowDetails = (release) => {
    setSelectedRelease(release);
    setShowDetailsModal(true);
  };

  // Handle showing cancel modal
  const handleShowCancel = (release) => {
    setSelectedRelease(release);
    setShowCancelModal(true);
  };

  // Handle marking as released (called after QR scan)
  const handleMarkAsReleased = async (releaseId) => {
    try {
      const releaseRef = doc(db, 'posTransactions', releaseId);
      await updateDoc(releaseRef, {
        releaseStatus: 'released',
        releasedAt: serverTimestamp(),
        releasedBy: currentUser?.uid || 'unknown',
        releasedByName: currentUser?.displayName || currentUser?.email || 'Unknown User'
      });
      
      alert('Items marked as released successfully!');
      setShowQRModal(false);
      setSelectedRelease(null);
    } catch (error) {
      console.error('Error marking as released:', error);
      alert('Failed to mark items as released. Please try again.');
    }
  };

  // Handle cancelling release
  const handleCancelRelease = async () => {
    if (!cancelReason.trim()) {
      alert('Please select a cancellation reason.');
      return;
    }

    const finalReason = cancelReason === 'Other' ? customCancelReason.trim() : cancelReason;

    if (cancelReason === 'Other' && !finalReason) {
      alert('Please provide a custom cancellation reason.');
      return;
    }

    try {
      const releaseRef = doc(db, 'posTransactions', selectedRelease.id);
      await updateDoc(releaseRef, {
        releaseStatus: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: currentUser?.uid || 'unknown',
        cancelledByName: currentUser?.displayName || currentUser?.email || 'Unknown User',
        cancelReason: finalReason
      });
      
      alert('Release cancelled successfully!');
      setShowCancelModal(false);
      setSelectedRelease(null);
      setCancelReason('');
      setCustomCancelReason('');
    } catch (error) {
      console.error('Error cancelling release:', error);
      alert('Failed to cancel release. Please try again.');
    }
  };

  // Calculate statistics
  const stats = {
    total: releases.length,
    pending: releases.filter(r => r.releaseStatus === 'pending_release').length,
    released: releases.filter(r => r.releaseStatus === 'released').length,
    cancelled: releases.filter(r => r.releaseStatus === 'cancelled').length,
    totalItems: releases.reduce((sum, r) => sum + (r.items?.length || 0), 0)
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Release Management</h2>
        <p className="text-gray-600">Manage outgoing stock from completed sales</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiPackage className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Release</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FiClock className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Released</p>
              <p className="text-2xl font-bold text-green-600">{stats.released}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiCheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <FiXCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiDownload className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by transaction ID, cashier, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="pending_release">Pending Release</option>
              <option value="released">Released</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Release List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredReleases.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No releases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cashier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReleases.map((release) => (
                  <tr key={release.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {release.transactionId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {release.createdAt.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {release.createdAt.toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {release.customerInfo?.name || 'Walk-in Customer'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {release.cashierName || 'Unknown Cashier'} 
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {release.items?.length || 0} items
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ₱{release.totals?.total?.toLocaleString() || release.total?.toLocaleString() || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        release.releaseStatus === 'released'
                          ? 'bg-green-100 text-green-800'
                          : release.releaseStatus === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {release.releaseStatus === 'released' ? 'Released' : 
                         release.releaseStatus === 'cancelled' ? 'Cancelled' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {release.releaseStatus === 'pending_release' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleShowQR(release)}
                            className="text-orange-600 hover:text-orange-900 font-medium"
                          >
                            Generate QR
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleShowCancel(release)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : release.releaseStatus === 'cancelled' ? (
                        <div className="text-xs text-gray-500">
                          <div>Cancelled by: {release.cancelledByName}</div>
                          <div>Reason: {release.cancelReason}</div>
                        </div>
                      ) : release.releaseStatus === 'released' ? (
                        <button
                          onClick={() => handleShowDetails(release)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View Details
                        </button>
                      ) : (
                        <div className="text-xs text-gray-500">
                          Released by: {release.releasedByName}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRModal && selectedRelease && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Release Items - QR Code</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiXCircle size={24} />
                </button>
              </div>

              {/* Transaction Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Transaction ID:</span>
                    <p className="text-gray-900">{selectedRelease.transactionId}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Customer:</span>
                    <p className="text-gray-900">{selectedRelease.customerInfo?.name || 'Walk-in'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Cashier:</span>
                    <p className="text-gray-900">{selectedRelease.cashierName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Items:</span>
                    <p className="text-gray-900">{selectedRelease.items?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-3">Items to Release:</h4>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-center">Quantity</th>
                        <th className="px-4 py-2 text-right">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedRelease.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">{item.variantName || item.productName}</td>
                          <td className="px-4 py-2 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-xs text-gray-600">
                            {item.storageLocation || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center mb-6">
                <p className="text-sm text-gray-600 mb-4">Scan this QR code to process release on mobile</p>
                <div className="p-6 bg-white border-4 border-orange-500 rounded-lg">
                  <QRCodeSVG
                    value={`${window.location.protocol}//${window.location.host}/release_mobile?releaseId=${encodeURIComponent(selectedRelease.id)}`}
                    size={256}
                    level="H"
                  />
                </div>
              </div>

              
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedRelease && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Cancel Release</h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiXCircle size={24} />
                </button>
              </div>

              {/* Transaction Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <div className="mb-2">
                    <span className="font-medium text-gray-700">Transaction ID:</span>
                    <p className="text-gray-900">{selectedRelease.transactionId}</p>
                  </div>
                  <div className="mb-2">
                    <span className="font-medium text-gray-700">Customer:</span>
                    <p className="text-gray-900">{selectedRelease.customerInfo?.name || 'Walk-in'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total:</span>
                    <p className="text-gray-900">₱{selectedRelease.totals?.total?.toLocaleString() || selectedRelease.total?.toLocaleString() || '0.00'}</p>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-3"
                >
                  <option value="">Select a reason...</option>
                  {CANCEL_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>

                {cancelReason === 'Other' && (
                  <textarea
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder="Please provide details..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows="3"
                  />
                )}
              </div>

              {/* Warning */}
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  ⚠️ <strong>Warning:</strong> Cancelling this release will mark the transaction as cancelled. 
                  The items will remain in inventory and the customer will need to be refunded if payment was processed.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Keep Release
                </button>
                <button
                  onClick={handleCancelRelease}
                  disabled={!cancelReason.trim() || (cancelReason === 'Other' && !customCancelReason.trim())}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Cancel Release
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRelease && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiXCircle size={24} />
                </button>
              </div>

              {/* Transaction Header Info */}
              <div className="mb-6 grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Transaction Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="font-medium">{selectedRelease.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-medium">
                        {selectedRelease.createdAt.toLocaleDateString()} {selectedRelease.createdAt.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cashier:</span>
                      <span className="font-medium">{selectedRelease.cashierName || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Released
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedRelease.customerInfo?.name || 'Walk-in Customer'}</span>
                    </div>
                    {selectedRelease.customerInfo?.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{selectedRelease.customerInfo.phone}</span>
                      </div>
                    )}
                    {selectedRelease.customerInfo?.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{selectedRelease.customerInfo.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">{selectedRelease.paymentMethod || 'Cash'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Release Information */}
              <div className="mb-6 bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3">Release Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Released By:</span>
                    <p className="font-medium text-green-900">{selectedRelease.releasedByName || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-green-700">Released At:</span>
                    <p className="font-medium text-green-900">
                      {selectedRelease.releasedAt ? 
                        `${selectedRelease.releasedAt.toLocaleDateString()} ${selectedRelease.releasedAt.toLocaleTimeString()}` 
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Items Released</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Image</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Product</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Unit Price</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Total</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedRelease.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                              {item.image || item.productImage ? (
                                <img
                                  src={item.image || item.productImage}
                                  alt={item.variantName || item.productName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                <FiPackage size={20} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">{item.variantName || item.productName}</div>
                              {item.category && (
                                <div className="text-xs text-gray-500">{item.category}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{item.quantity} {item.unit || 'pcs'}</td>
                          <td className="px-4 py-3 text-right">₱{item.unitPrice?.toLocaleString() || '0.00'}</td>
                          <td className="px-4 py-3 text-right font-medium">₱{item.totalPrice?.toLocaleString() || '0.00'}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600">
                              {item.storageLocation && (
                                <div>Unit: {item.storageLocation}</div>
                              )}
                              {item.shelfName && (
                                <div>Shelf: {item.shelfName}</div>
                              )}
                              {item.rowName && (
                                <div>Row: {item.rowName}</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="bg-gray-50 rounded-lg p-4 w-80">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>₱{selectedRelease.subTotal?.toLocaleString() || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax (12%):</span>
                      <span>₱{selectedRelease.tax?.toLocaleString() || '0.00'}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-300">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">₱{selectedRelease.total?.toLocaleString() || '0.00'}</span>
                    </div>
                    {selectedRelease.amountPaid && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount Paid:</span>
                        <span>₱{selectedRelease.amountPaid.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedRelease.change && selectedRelease.change > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Change:</span>
                        <span>₱{selectedRelease.change.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReleaseManagement;
