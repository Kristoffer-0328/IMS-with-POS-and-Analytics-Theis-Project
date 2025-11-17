import React, { useState, useEffect } from 'react';
import { FiSearch, FiEye, FiCheck, FiX, FiEdit } from 'react-icons/fi';
import { getFirestore, collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const db = getFirestore(app);

const getFormattedDateTime = (timestamp) => {
  if (!timestamp || !timestamp.toDate) {
    return 'N/A';
  }
  const date = timestamp.toDate();
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function IM_RefundReports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: 'pending',
    resolutionNotes: ''
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchQuery, statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const reportsRef = collection(db, 'refundReports');
      const q = query(reportsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedReports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(fetchedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.submittedByName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.reason?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    setFilteredReports(filtered);
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = (report) => {
    setSelectedReport(report);
    setUpdateForm({
      status: report.status || 'pending',
      resolutionNotes: report.resolutionNotes || ''
    });
    setShowUpdateModal(true);
  };

  const handleSubmitUpdate = async () => {
    if (!selectedReport) return;

    try {
      await updateDoc(doc(db, 'refundReports', selectedReport.id), {
        status: updateForm.status,
        resolutionNotes: updateForm.resolutionNotes,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setReports(reports.map(report =>
        report.id === selectedReport.id
          ? { ...report, status: updateForm.status, resolutionNotes: updateForm.resolutionNotes }
          : report
      ));

      setShowUpdateModal(false);
      setSelectedReport(null);
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Refund & Damage Reports</h1>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by transaction ID, submitter, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 w-full transition-shadow"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Transaction ID', 'Product', 'Type', 'Reason', 'Submitted By', 'Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredReports.map((report) => {
                  // Get product information
                  let productName = 'Unknown Product';
                  if (report.productData) {
                    const item = report.productData;
                    if (item.name) {
                      productName = item.name;
                    } else if (item.productName && item.variantName) {
                      productName = `${item.productName} - ${item.variantName}`;
                    } else {
                      productName = item.productName || item.variantName || 'Unknown Product';
                    }
                  }

                  return (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {report.transactionId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {productName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {(() => {
                          const typeLabels = {
                            'defective_damaged': 'Product Defect/Damage',
                            'wrong_item': 'Incorrect Item Shipped',
                            'no_longer_wanted': 'Change of Mind',
                            'quality_complaint': 'Quality Issue',
                            'other': 'Other'
                          };
                          return typeLabels[report.type] || report.type || 'Unknown';
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {report.reason}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {report.submittedByName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getFormattedDateTime(report.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}`}>
                          {report.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(report)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(report)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Update Status"
                          >
                            <FiEdit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {filteredReports.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No reports found matching your criteria.
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedReport && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl pointer-events-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Report Details</h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                      <p className="text-sm text-gray-900">{selectedReport.transactionId}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="text-sm text-gray-900">
                        {(() => {
                          const typeLabels = {
                            'defective_damaged': 'Product Defect/Damage',
                            'wrong_item': 'Incorrect Item Shipped',
                            'no_longer_wanted': 'Change of Mind',
                            'quality_complaint': 'Quality Issue',
                            'other': 'Other'
                          };
                          return typeLabels[selectedReport.type] || selectedReport.type || 'Unknown';
                        })()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedReport.status)}`}>
                        {selectedReport.status || 'pending'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Submitted By</label>
                      <p className="text-sm text-gray-900">{selectedReport.submittedByName}</p>
                    </div>
                  </div>

                  {selectedReport.productData && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reported Product</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        {(() => {
                          const item = selectedReport.productData;
                          let productName = 'Unknown Product';
                          if (item.name) {
                            productName = item.name;
                          } else if (item.productName && item.variantName) {
                            productName = `${item.productName} - ${item.variantName}`;
                          } else {
                            productName = item.productName || item.variantName || 'Unknown Product';
                          }
                          const quantity = item.quantity || item.qty || 0;
                          const price = item.price || item.unitPrice || 0;
                          
                          return (
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{productName}</p>
                              <p className="text-gray-600">Quantity: {quantity} | Unit Price: ₱{price.toLocaleString()}</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason</label>
                    <p className="text-sm text-gray-900">{selectedReport.reason}</p>
                  </div>

                  {selectedReport.details && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Additional Details</label>
                      <p className="text-sm text-gray-900">{selectedReport.details}</p>
                    </div>
                  )}

                  {selectedReport.resolutionNotes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Resolution Notes</label>
                      <p className="text-sm text-gray-900">{selectedReport.resolutionNotes}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted Date</label>
                    <p className="text-sm text-gray-900">{getFormattedDateTime(selectedReport.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && selectedReport && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUpdateModal(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Update Report Status</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes</label>
                    <textarea
                      value={updateForm.resolutionNotes}
                      onChange={(e) => setUpdateForm({...updateForm, resolutionNotes: e.target.value})}
                      placeholder="Add notes about the resolution..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowUpdateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitUpdate}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}