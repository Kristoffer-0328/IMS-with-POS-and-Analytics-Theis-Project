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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import app from '../../FirebaseConfig';
import storage, { getStorageOptions } from './StorageConfig';

const db = getFirestore(app);

export const useDocumentServices = () => {
  // Generate PDF for Purchase Order
  const generatePOPDF = async (poData) => {
    try {
      const doc = new jsPDF();
      
      // Add company name and document type
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55); // text-gray-800
      doc.text('Glory Star Hardware', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Purchase Order', 105, 28, { align: 'center' });

      // Company details box (left)
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 35, 85, 45, 2, 2, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.setFont(undefined, 'bold');
      doc.text('Glory Star Hardware', 20, 45);
      doc.setFont(undefined, 'normal');
      doc.text([
        'Sumulong Highway, Antipolo City,',
        'Rizal, Philippines',
        'Contact: (02) 8123-4567',
        'Email: info@glorystarhardware.com',
        'VAT Reg TIN: 123-456-789-000'
      ], 20, 52);

      // Supplier details box (right) - with white background
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(110, 35, 85, 45, 2, 2, 'FD');
      doc.setFont(undefined, 'bold');
      doc.text('Supplier:', 115, 45);
      doc.setFont(undefined, 'normal');
      doc.text([
        poData.supplierName || 'Electric Masters',
        '123 Voltage Street, Makati City,',
        'Metro Manila, Philippines',
        'Contact: ' + (poData.supplierContact || 'Engr. James Dela Cruz'),
        'Phone: ' + (poData.supplierPhone || '(02) 8999-1122')
      ], 115, 52);

      // Order Details box with increased height for payment terms
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 90, 180, 80, 2, 2, 'FD'); // Increased height from 50 to 80
      
      // Order details with adjusted spacing
      let currentY = 100;
      doc.setFont(undefined, 'bold');
      doc.text('Order Details:', 20, currentY);
      currentY += 10;
      
      // Left column details
      doc.setFont(undefined, 'normal');
      doc.text('PO Number:', 20, currentY);
      doc.text(poData.poNumber || '', 80, currentY);
      
      currentY += 8;
      doc.text('Created Date:', 20, currentY);
      doc.text(new Date().toLocaleDateString('en-PH'), 80, currentY);
      
      currentY += 8;
      doc.text('Expected Delivery:', 20, currentY);
      doc.text(new Date(poData.deliveryDate).toLocaleDateString('en-PH'), 80, currentY);

      // Payment Terms with proper wrapping
      currentY += 12;
      doc.setFont(undefined, 'bold');
      doc.text('Payment Terms:', 20, currentY);
      doc.setFont(undefined, 'normal');
      
      if (poData.paymentTerms) {
        const maxWidth = 165; // Maximum width for wrapped text
        const splitPaymentTerms = doc.splitTextToSize(poData.paymentTerms, maxWidth);
        doc.text(splitPaymentTerms, 20, currentY + 8);
      } else {
        // Default payment terms with proper wrapping
        const defaultTerms = 'Payment Due: Within 30 calendar days from the invoice date (Net 30). Early Payment Discount: A 2% discount will be applied if full payment is received within 10 calendar days from the invoice date (2/10 Net 30). Payment Method: Bank transfer or check. Late Payment Penalty: A 1.5% interest per month will be applied on overdue balances.';
        const splitDefaultTerms = doc.splitTextToSize(defaultTerms, 165);
        doc.text(splitDefaultTerms, 20, currentY + 8);
      }

      // Adjust table starting position based on the new box height
      const tableStartY = 180; // Adjusted to account for larger order details box
      
      // Add items table with modern styling
      const tableData = poData.items.map(item => [
        item.productName,
        item.quantity.toString(),
        'pcs',
        `₱${item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `₱${item.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        item.supplier?.name || poData.supplierName
      ]);
      
      // Create table with adjusted styling
      await autoTable(doc, {
        startY: tableStartY,
        margin: { left: 15, right: 15 },
        head: [['Product Description', 'Quantity', 'Unit', 'Unit Price', 'Total', 'Supplier']],
        body: tableData,
        foot: [['', '', '', '', 'Total:', `₱${poData.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
        theme: 'grid',
        headStyles: { 
          fillColor: [37, 99, 235],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: { 
          fillColor: [255, 255, 255],
          textColor: [31, 41, 55],
          fontStyle: 'bold',
          fontSize: 10
        },
        styles: { 
          fontSize: 9,
          cellPadding: 5,
          lineColor: [229, 231, 235],
          lineWidth: 0.1,
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 35 }
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        },
        didDrawPage: function(data) {
          data.doc.lastAutoTableY = data.cursor.y;
        }
      });

      // Notes section with proper spacing
      const notesY = doc.lastAutoTableY + 20; // Increased spacing after table
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, notesY, 180, 30, 2, 2, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.setFont(undefined, 'bold');
      doc.text('Notes:', 20, notesY + 10);
      doc.setFont(undefined, 'normal');
      
      const notes = poData.notes || 'Please include warranty certificates and installation manuals with the delivery.';
      const wrappedNotes = doc.splitTextToSize(notes, 165);
      doc.text(wrappedNotes, 20, notesY + 20);

      // Signature section with proper spacing
      const signatureY = notesY + 40;
      
      // Load signature images
      let signatureImage = null;
      let adminSignatureImage = null;
      
      if (poData.status === 'pending_approval' || poData.status === 'approved') {
        try {
          const response = await fetch('/src/assets/IMSignature.png');
          const blob = await response.blob();
          signatureImage = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error loading signature image:', error);
        }
      }

      // Load admin signature if PO is approved
      if (poData.status === 'approved') {
        try {
          const response = await fetch('/src/assets/AdminSignature.png');
          const blob = await response.blob();
          adminSignatureImage = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error loading admin signature image:', error);
        }
      }
      
      // Signature boxes with white background
      const drawSignatureBox = async (x, y, title, role, signatureImage = null) => {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, 50, 35, 2, 2, 'FD');
        doc.setFont(undefined, 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(title, x + 25, y + 7, { align: 'center' });
        
        if (signatureImage) {
          try {
            doc.addImage(signatureImage, 'PNG', x + 5, y + 10, 40, 15, undefined, 'FAST');
          } catch (error) {
            console.error('Error adding signature:', error);
          }
        } else {
          doc.setDrawColor(229, 231, 235);
          doc.line(x + 5, y + 25, x + 45, y + 25);
        }
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(role, x + 25, y + 32, { align: 'center' });
      };

      // Draw signature boxes with proper spacing
      await drawSignatureBox(20, signatureY, 'Prepared by', poData.createdBy?.role || 'Staff', 
        poData.status === 'pending_approval' || poData.status === 'approved' ? signatureImage : null);
      await drawSignatureBox(85, signatureY, 'Reviewed by', 'Inventory Manager');
      await drawSignatureBox(150, signatureY, 'Approved by', 'Admin',
        poData.status === 'approved' ? adminSignatureImage : null);
      
      // Footer with proper spacing
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const footerY = signatureY + 45;
      
      doc.text('This document is computer-generated and does not require a physical signature.', 105, footerY, { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleString('en-PH')}`, 105, footerY + 5, { align: 'center' });
      doc.text('The signature used in this document is only for testing purposes and created by Developers.', 105, footerY + 10, { align: 'center' });
      
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
      const options = getStorageOptions();
      const result = await uploadBytes(storageRef, file, options);
      const downloadURL = await getDownloadURL(result.ref);
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
