import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiDownload, FiCheck, FiX as FiXCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getDoc, doc ,getFirestore} from 'firebase/firestore';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { useDocumentServices } from '../../../../services/firebase/DocumentServices';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import app from '../../../../FirebaseConfig';

const db = getFirestore(app);
const ITEMS_PER_PAGE = 5;

const ViewPOModal = ({ poId, onClose }) => {
  const { currentUser } = useAuth();
  const poServices = usePurchaseOrderServices();
  const documentServices = useDocumentServices();
  
  // State
  const [loading, setLoading] = useState(true);
  const [poData, setPoData] = useState(null);
  const [approvalData, setApprovalData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [receivedItems, setReceivedItems] = useState([]);
  const [processingAction, setProcessingAction] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);

  // Load PO data
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        // Load PO data
        const result = await poServices.getPurchaseOrder(poId);
        if (result.success) {
          setPoData(result.data);
          
          // Initialize received items if PO is approved
          if (result.data.status === 'approved') {
            setReceivedItems(result.data.items.map(item => ({
              ...item,
              receivedQuantity: 0,
              notes: ''
            })));
          }

          // Load approval data if PO is pending approval
          if (result.data.status === 'pending_approval' && result.data.approvalId) {
            const approvalDoc = await getDoc(doc(db, 'po_approvals', result.data.approvalId));
            if (approvalDoc.exists()) {
              setApprovalData(approvalDoc.data());
            }
          }
        } else {
          throw new Error(result.error || 'Failed to load purchase order');
        }

        // Load documents
        const docsResult = await documentServices.getDocumentsByRefId(poId, 'purchase_order');
        if (docsResult.success) {
          setDocuments(docsResult.documents);
        } else {
          console.error('Error loading documents:', docsResult.error);
        }
      } catch (error) {
        console.error('Error loading PO data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [poId]);

  // Pagination calculations
  const totalPages = useMemo(() => {
    if (!poData?.items?.length) return 1;
    return Math.ceil(poData.items.length / ITEMS_PER_PAGE);
  }, [poData?.items?.length]);

  const paginatedItems = useMemo(() => {
    if (!poData?.items) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return poData.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [poData?.items, currentPage]);

  // Handle approval/rejection
  const handleApprovalAction = async (action) => {
    setProcessingAction(true);
    try {
      setError(null);

      if (!poData.approvalId) {
        throw new Error('Approval ID not found. The PO may not be properly submitted for approval.');
      }

      // Process the approval step
      const result = await poServices.processApprovalStep(
        poId,
        poData.approvalId,
        {
          id: currentUser.uid,
          name: currentUser.name,
          role: currentUser.role
        },
        action,
        approvalNotes
      );

      if (result.success) {
        // Generate and save PDF after approval
        if (action === 'approved') {
          const doc = await documentServices.generatePOPDF(poData);
          const pdfBlob = doc.output('blob');
          const uploadResult = await documentServices.uploadDocument(
            pdfBlob,
            `purchase_orders/${poId}/po_${poData.poNumber}.pdf`
          );

          if (uploadResult.success) {
            await documentServices.saveDocumentMetadata({
              referenceId: poId,
              type: 'purchase_order',
              name: `PO ${poData.poNumber}`,
              url: uploadResult.url,
              fileType: 'pdf'
            });
          }
        }
        onClose();
      } else {
        throw new Error(result.error || 'Failed to process approval');
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      setError(error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle receiving items
  const handleReceiveItems = async () => {
    setProcessingAction(true);
    try {
      setError(null);
      const itemsToReceive = receivedItems.filter(item => item.receivedQuantity > 0);
      if (itemsToReceive.length === 0) {
        throw new Error('Please enter received quantities');
      }

      const result = await poServices.receivePurchaseOrder(poId, itemsToReceive.map(item => ({
        ...item,
        receivedBy: {
          id: currentUser.uid,
          name: currentUser.name
        }
      })));

      if (result.success) {
        onClose();
      } else {
        throw new Error(result.error || 'Failed to receive items');
      }
    } catch (error) {
      console.error('Error receiving items:', error);
      setError(error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle received quantity change
  const handleReceivedQuantityChange = (index, value) => {
    const newItems = [...receivedItems];
    newItems[index] = {
      ...newItems[index],
      receivedQuantity: Math.min(
        Math.max(0, Number(value)), // Don't allow negative numbers
        newItems[index].quantity // Don't allow more than ordered quantity
      )
    };
    setReceivedItems(newItems);
  };

  // Handle submit for approval
  const handleSubmitForApproval = async () => {
    setProcessingAction(true);
    try {
      setError(null);
      const result = await poServices.submitPOForApproval(poId);
      if (result.success) {
        // Generate and save PDF with signature
        const doc = await documentServices.generatePOPDF({
          ...poData,
          status: 'pending_approval',
          preparedBy: {
            id: currentUser.uid,
            name: currentUser.name,
            role: currentUser.role,
            signature: '/src/assets/IMSignature.png'
          }
        });
        
        const pdfBlob = doc.output('blob');
        const uploadResult = await documentServices.uploadDocument(
          pdfBlob,
          `purchase_orders/${poId}/po_${poData.poNumber}.pdf`
        );

        if (uploadResult.success) {
          await documentServices.saveDocumentMetadata({
            referenceId: poId,
            type: 'purchase_order',
            name: `PO ${poData.poNumber}`,
            url: uploadResult.url,
            fileType: 'pdf',
            createdBy: {
              id: currentUser.uid,
              name: currentUser.name,
              role: currentUser.role
            }
          });
        }

        // Refresh PO data to show new status
        const updatedPO = await poServices.getPurchaseOrder(poId);
        if (updatedPO.success) {
          setPoData(updatedPO.data);
        }
      } else {
        throw new Error(result.error || 'Failed to submit PO for approval');
      }
    } catch (error) {
      console.error('Error submitting for approval:', error);
      setError(error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    try {
      setError(null);
      const doc = await documentServices.generatePOPDF({
        ...poData,
        preparedBy: poData.status === 'pending_approval' || poData.status === 'approved' ? {
          id: currentUser.uid,
          name: currentUser.name,
          role: currentUser.role,
          signature: '/src/assets/IMSignature.png'
        } : null
      });
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PO-${poData.poNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!poData) {
    return null;
  }

  const canApprove = currentUser.role === 'Admin' && poData.status === 'pending_approval';
  const showSubmitButton = currentUser.role === 'InventoryManager' && poData.status === 'draft';
  const showDownloadButton = poData.status === 'approved';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">
              Purchase Order: {poData.poNumber}
            </h2>
            {showDownloadButton && (
              <div className="flex items-center gap-2">
                {documents.length > 0 && (
                  <a
                    href={documents[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FiDownload /> View PDF
                  </a>
                )}
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <FiDownload /> Download PDF
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-129px)]">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              poData.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              poData.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
              poData.status === 'approved' ? 'bg-green-100 text-green-800' :
              poData.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {poData.status.replace('_', ' ').charAt(0).toUpperCase() + poData.status.slice(1).replace('_', ' ')}
            </span>
          </div>

          {/* PO Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Supplier</p>
              <p className="font-medium">{poData.supplierName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium capitalize">{poData.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivery Date</p>
              <p className="font-medium">
                {new Date(poData.deliveryDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Terms</p>
              <p className="font-medium">{poData.paymentTerms}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    {poData.status === 'approved' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Received
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedItems.map((item, index) => (
                    <tr key={item.productId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₱{item.unitPrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₱{item.total.toLocaleString()}
                      </td>
                      {poData.status === 'approved' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={receivedItems[((currentPage - 1) * ITEMS_PER_PAGE) + index]?.receivedQuantity || 0}
                            onChange={(e) => handleReceivedQuantityChange(((currentPage - 1) * ITEMS_PER_PAGE) + index, e.target.value)}
                            className="w-24 border rounded-lg px-3 py-2"
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right font-medium">
                      Total Amount:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      ₱{poData.totalAmount.toLocaleString()}
                    </td>
                    {poData.status === 'approved' && <td></td>}
                  </tr>
                </tfoot>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                  <div className="flex items-center">
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span>
                      {' '}-{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * ITEMS_PER_PAGE, poData.items.length)}
                      </span>
                      {' '}of{' '}
                      <span className="font-medium">{poData.items.length}</span> items
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FiChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FiChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents Section */}
          {documents.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Documents</h3>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>{doc.name}</span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FiDownload />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="text-center">
              <div className="h-24 border-b border-gray-300 mb-2 flex items-center justify-center">
                {(poData.status === 'pending_approval' || poData.status === 'approved') && (
                  <img 
                    src="/src/assets/IMSignature.png" 
                    alt="Inventory Manager Signature" 
                    className="object-contain"
                    style={{ 
                      width: '500px',
                      height: '300px',
                      objectFit: 'contain'
                    }}
                  />
                )}
              </div>
              <p className="font-medium">Inventory Manager</p>
              <p className="text-sm text-gray-600">Prepared by</p>
              {(poData.status === 'pending_approval' || poData.status === 'approved') && poData.submittedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Signed on {new Date(poData.submittedAt.toDate()).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-center">
              <div className="h-24 border-b border-gray-300 mb-2 flex items-center justify-center">
                {poData.status === 'approved' && (
                  <img 
                    src="/src/assets/AdminSignature.png" 
                    alt="Admin Signature" 
                    className="object-contain"
                    style={{ 
                      width: '500px',
                      height: '300px',
                      objectFit: 'contain'
                    }}
                  />
                )}
              </div>
              <p className="font-medium">Admin</p>
              <p className="text-sm text-gray-600">Approved by</p>
              {poData.status === 'approved' && poData.approvedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Signed on {new Date(poData.approvedAt.toDate()).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Admin Approval Section */}
          {canApprove && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Approval</h3>
              <div className="space-y-4">
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add approval notes..."
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => handleApprovalAction('rejected')}
                    disabled={processingAction}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <FiXCircle /> Reject
                  </button>
                  <button
                    onClick={() => handleApprovalAction('approved')}
                    disabled={processingAction}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <FiCheck /> Approve
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit for Approval Button */}
          {showSubmitButton && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmitForApproval}
                disabled={processingAction}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {processingAction ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit for Approval'
                )}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewPOModal; 