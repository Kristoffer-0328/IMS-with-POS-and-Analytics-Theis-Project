import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiDownload, FiCheck, FiX as FiXCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getDoc, doc ,getFirestore} from 'firebase/firestore';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { useDocumentServices } from '../../../../services/firebase/DocumentServices';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import { generatePurchaseOrderNotification } from '../../../../services/firebase/NotificationServices';
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
    console.log('🔄 handleApprovalAction called with action:', action);
    console.log('👤 Current user:', currentUser);
    console.log('📄 PO data:', poData);
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

      // Generate notification for approval/rejection
      try {
        console.log('🔔 About to generate notification for PO approval/rejection');
        console.log('Generating PO', action, 'notification for:', poData.poNumber);
        console.log('📊 PO Data dump:', JSON.stringify(poData, null, 2));
        console.log('👤 Current User dump:', JSON.stringify(currentUser, null, 2));
        if (poData) {
          await generatePurchaseOrderNotification(poData, currentUser, action, approvalNotes);
          console.log('PO', action, 'notification generated successfully');
        } else {
          console.error('No PO data available for notification');
        }
      } catch (notificationError) {
        console.error('Failed to generate PO', action, 'notification:', notificationError);
        // Don't fail the approval process if notification fails
      }        onClose();
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
        // Generate notification immediately after successful submission
        try {
          console.log('Generating PO submission notification for:', poData.poNumber);
          if (poData) {
            await generatePurchaseOrderNotification(poData, currentUser, 'submitted');
            console.log('PO submission notification generated successfully');
          } else {
            console.error('No PO data available for notification');
          }
        } catch (notificationError) {
          console.error('Failed to generate PO submission notification:', notificationError);
          // Don't fail the approval process if notification fails
        }

        // Reset loading state immediately after successful submission
        setProcessingAction(false);
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
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Purchase Order: {poData.poNumber}
            </h2>
            {showDownloadButton && (
              <div className="flex items-center gap-2 ml-4">
                {documents.length > 0 && (
                  <a
                    href={documents[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm border border-blue-200"
                  >
                    <FiDownload /> View PDF
                  </a>
                )}
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm border border-green-200"
                >
                  <FiDownload /> Download PDF
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors">
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-129px)] space-y-6">
          {/* Status Badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold gap-2 ${
              poData.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              poData.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
              poData.status === 'approved' ? 'bg-green-100 text-green-800' :
              poData.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {poData.status.replace('_', ' ').charAt(0).toUpperCase() + poData.status.slice(1).replace('_', ' ')}
            </span>
          </div>

          {/* PO Details */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Supplier</p>
              <p className="text-lg font-semibold text-gray-900">{poData.supplierName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Status</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{poData.status.replace('_', ' ')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Delivery Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(poData.deliveryDate).toLocaleDateString()}
              </p>
            </div>
           
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Total
                    </th>
                    {poData.status === 'approved' && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Received
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedItems.map((item, index) => (
                    <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        ₱{item.unitPrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
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
                            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      Total Amount:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      ₱{poData.totalAmount.toLocaleString()}
                    </td>
                    {poData.status === 'approved' && <td></td>}
                  </tr>
                </tfoot>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center">
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-semibold">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span>
                      {' '}-{' '}
                      <span className="font-semibold">
                        {Math.min(currentPage * ITEMS_PER_PAGE, poData.items.length)}
                      </span>
                      {' '}of{' '}
                      <span className="font-semibold">{poData.items.length}</span> items
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      <FiChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      <FiChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Received Products Section - Shows images from mobile receiving */}
          {poData.status === 'received' && poData.receivedProducts && poData.receivedProducts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📸 Received Products & Photos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {poData.receivedProducts.map((product, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="space-y-3">
                      {/* Product Photo */}
                      {product.photo ? (
                        <div className="relative">
                          <img
                            src={product.photo}
                            alt={`Received ${product.productName}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            ✓ Received
                          </div>
                          {/* Fallback for broken images */}
                          <div className="hidden w-full h-32 bg-gray-200 rounded-lg border border-gray-300 items-center justify-center">
                            <div className="text-center">
                              <div className="text-gray-400 text-2xl mb-1">📷</div>
                              <span className="text-gray-500 text-xs">Image unavailable</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
                          <div className="text-center">
                            <div className="text-gray-400 text-2xl mb-1">📷</div>
                            <span className="text-gray-500 text-sm">No photo taken</span>
                          </div>
                        </div>
                      )}

                      {/* Product Details */}
                      <div className="space-y-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{product.productName}</h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><span className="font-medium">SKU:</span> {product.productId}</p>
                          <p><span className="font-medium">Received:</span> {product.receivedQuantity} units</p>
                          <p><span className="font-medium">Accepted:</span> {product.receivedQuantity} | <span className="font-medium">Rejected:</span> {product.rejectedQuantity || 0}</p>
                          {product.unitPrice && (
                            <p><span className="font-medium">Unit Price:</span> ₱{product.unitPrice.toLocaleString()}</p>
                          )}
                        </div>

                        {/* Rejection Reason */}
                        {product.rejectedQuantity > 0 && product.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                            <p className="font-medium text-red-800">Rejection Reason:</p>
                            <p className="text-red-700">{product.rejectionReason}</p>
                          </div>
                        )}

                        {/* Notes */}
                        {product.notes && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <p className="font-medium text-blue-800">Notes:</p>
                            <p className="text-blue-700">{product.notes}</p>
                          </div>
                        )}

                        {/* Received By */}
                        {product.receivedBy && (
                          <div className="mt-2 text-xs text-gray-500">
                            <p><span className="font-medium">Received by:</span> {product.receivedBy.name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary of received items */}
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Receiving Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-green-700 font-medium">Total Items</p>
                    <p className="text-green-900 text-lg font-bold">{poData.receivedProducts.length}</p>
                  </div>
                  <div>
                    <p className="text-green-700 font-medium">Total Received</p>
                    <p className="text-green-900 text-lg font-bold">
                      {poData.receivedProducts.reduce((sum, p) => sum + (p.receivedQuantity || 0), 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700 font-medium">Total Rejected</p>
                    <p className="text-green-900 text-lg font-bold">
                      {poData.receivedProducts.reduce((sum, p) => sum + (p.rejectedQuantity || 0), 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700 font-medium">Photos Taken</p>
                    <p className="text-green-900 text-lg font-bold">
                      {poData.receivedProducts.filter(p => p.photo).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Section */}
          {documents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                    <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 group-hover:scale-110 transition-transform"
                    >
                      <FiDownload size={18} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
              <div className="h-24 border-b-2 border-gray-300 mb-4 flex items-center justify-center">
                {(poData.status === 'pending_approval' || poData.status === 'approved') && (
                  <img 
                    src="/src/assets/IMSignature.png" 
                    alt="Inventory Manager Signature" 
                    className="object-contain max-h-24 max-w-full"
                  />
                )}
              </div>
              <p className="font-semibold text-gray-900">Inventory Manager</p>
              <p className="text-sm text-gray-600 mt-1">Prepared by</p>
              {(poData.status === 'pending_approval' || poData.status === 'approved') && poData.submittedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Signed on {new Date(poData.submittedAt.toDate()).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center">
              <div className="h-24 border-b-2 border-green-300 mb-4 flex items-center justify-center">
                {poData.status === 'approved' && (
                  <img 
                    src="/src/assets/AdminSignature.png" 
                    alt="Admin Signature" 
                    className="object-contain max-h-24 max-w-full"
                  />
                )}
              </div>
              <p className="font-semibold text-gray-900">Admin</p>
              <p className="text-sm text-gray-600 mt-1">Approved by</p>
              {poData.status === 'approved' && poData.approvedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Signed on {new Date(poData.approvedAt.toDate()).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Admin Approval Section */}
          {canApprove && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval</h3>
              <div className="space-y-4">
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add approval notes..."
                  rows={3}
                  className="w-full border border-amber-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleApprovalAction('rejected')}
                    disabled={processingAction}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    <FiXCircle size={18} /> Reject
                  </button>
                  <button
                    onClick={() => handleApprovalAction('approved')}
                    disabled={processingAction}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    <FiCheck size={18} /> Approve
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
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
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
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewPOModal;