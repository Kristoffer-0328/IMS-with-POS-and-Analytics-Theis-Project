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

const ReleaseManagement = () => {
  const { currentUser } = useAuth();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, released, cancelled
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

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

  // Calculate statistics
  const stats = {
    total: releases.length,
    pending: releases.filter(r => r.releaseStatus === 'pending_release').length,
    released: releases.filter(r => r.releaseStatus === 'released').length,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                          : release.releaseStatus === 'pending_release'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {release.releaseStatus === 'released' ? 'Released' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {release.releaseStatus === 'pending_release' ? (
                        <button
                          onClick={() => handleShowQR(release)}
                          className="text-orange-600 hover:text-orange-900 font-medium"
                        >
                          Generate QR
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
                    <p className="text-gray-900">{selectedRelease.cashier}</p>
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
                <div className="mt-4 bg-gray-50 rounded-md p-3 max-w-md">
                  <p className="text-xs text-gray-600 break-all select-all">
                    {`${window.location.protocol}//${window.location.host}/release_mobile?releaseId=${encodeURIComponent(selectedRelease.id)}`}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center max-w-md">
                  Scan this QR code with your mobile device to open the release processing screen where you can verify items and update inventory.
                </p>
                <div className="mt-3">
                  <a 
                    href={`${window.location.protocol}//${window.location.host}/release_mobile?releaseId=${encodeURIComponent(selectedRelease.id)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 text-sm underline"
                  >
                    🔗 Test this link directly
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleMarkAsReleased(selectedRelease.id)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Mark as Released
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReleaseManagement;
