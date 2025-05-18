import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getFirestore
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import app from '../../FirebaseConfig';

const db = getFirestore(app);
const storage = getStorage(app);

export const useDocumentServices = () => {
  // Generate PDF for Purchase Order
  const generatePOPDF = async (poData) => {
    try {
      const doc = new jsPDF();
      
      // Add company logo and header
      doc.setFontSize(24);
      doc.setTextColor(31, 41, 55); // text-gray-800
      doc.text('Glory Star Hardware', 105, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.setTextColor(107, 114, 128); // text-gray-500
      doc.text('Purchase Order', 105, 30, { align: 'center' });
      
      // Add company details
      doc.setFontSize(10);
      doc.text('Antipolo City, Philippines', 105, 35, { align: 'center' });
      doc.text('Contact: (02) 8123-4567 | Email: info@glorystarhardware.com', 105, 40, { align: 'center' });
      doc.text('VAT Reg TIN: 123-456-789-000', 105, 45, { align: 'center' });
      
      // Add PO details in a modern card-like format
      doc.setDrawColor(229, 231, 235); // border-gray-200
      doc.setFillColor(249, 250, 251); // bg-gray-50
      doc.roundedRect(15, 55, 180, 35, 3, 3, 'FD');
      
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('PO Number:', 25, 65);
      doc.setFont(undefined, 'bold');
      doc.text(poData.poNumber || '', 85, 65);
      
      doc.setFont(undefined, 'normal');
      doc.text('Created Date:', 25, 72);
      doc.text(new Date().toLocaleDateString('en-PH'), 85, 72);
      
      doc.text('Expected Delivery:', 25, 79);
      doc.text(new Date(poData.deliveryDate).toLocaleDateString('en-PH'), 85, 79);
      
      doc.text('Payment Terms:', 25, 86);
      doc.text(poData.paymentTerms || '', 85, 86);
      
      // Add items table with modern styling
      const tableData = poData.items.map(item => [
        item.productName,
        `${item.currentStock || 0}`,
        item.quantity.toString(),
        `₱${item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        `₱${item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        item.supplier?.name || poData.supplierName
      ]);
      
      autoTable(doc, {
        startY: 100,
        head: [['Product', 'Current', 'Requested', 'Unit Price', 'Total', 'Supplier']],
        body: tableData,
        foot: [['', '', '', '', 'Total:', `₱${poData.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246], // bg-blue-500
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: { 
          fillColor: [243, 244, 246], // bg-gray-100
          textColor: [31, 41, 55], // text-gray-800
          fontStyle: 'bold',
          fontSize: 10
        },
        styles: { 
          fontSize: 9,
          cellPadding: 5,
          lineColor: [229, 231, 235], // border-gray-200
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 35 }
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // bg-gray-50
        }
      });
      
      // Add notes section in a card-like format
      if (poData.notes) {
        const notesY = doc.lastAutoTable.finalY + 15;
        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(15, notesY, 180, 25, 3, 3, 'FD');
        
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55);
        doc.setFont(undefined, 'bold');
        doc.text('Notes:', 25, notesY + 10);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(poData.notes, 25, notesY + 18);
      }
      
      // Add signature section
      const signatureY = doc.lastAutoTable.finalY + (poData.notes ? 50 : 30);
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      
      // Signature boxes with modern styling
      const drawSignatureBox = (x, y, title, role) => {
        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(x, y, 50, 35, 2, 2, 'FD');
        doc.setFont(undefined, 'bold');
        doc.text(title, x + 25, y + 7, { align: 'center' });
        doc.line(x + 5, y + 25, x + 45, y + 25);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(role, x + 25, y + 32, { align: 'center' });
      };
      
      drawSignatureBox(20, signatureY, 'Prepared by', poData.createdBy?.role || 'Staff');
      drawSignatureBox(80, signatureY, 'Reviewed by', 'Inventory Manager');
      drawSignatureBox(140, signatureY, 'Approved by', 'Admin');
      
      // Add footer with modern styling
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128); // text-gray-500
      doc.text('This document is computer-generated and does not require a physical signature.', 105, 280, { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleString('en-PH')}`, 105, 285, { align: 'center' });
      
      return doc;
    } catch (error) {
      console.error('Error generating PO PDF:', error);
      throw error;
    }
  };

  // Upload document to Firebase Storage
  const uploadDocument = async (file, path) => {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { success: true, url: downloadURL };
    } catch (error) {
      console.error('Error uploading document:', error);
      return { success: false, error: error.message };
    }
  };

  // Save document metadata to Firestore
  const saveDocumentMetadata = async (metadata) => {
    try {
      const docRef = await addDoc(collection(db, 'documents'), {
        ...metadata,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving document metadata:', error);
      return { success: false, error: error.message };
    }
  };

  // Get documents by reference ID (e.g., PO ID)
  const getDocumentsByRefId = async (refId, type) => {
    try {
      const q = query(
        collection(db, 'documents'),
        where('referenceId', '==', refId),
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, documents };
    } catch (error) {
      console.error('Error getting documents:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    generatePOPDF,
    uploadDocument,
    saveDocumentMetadata,
    getDocumentsByRefId
  };
}; 