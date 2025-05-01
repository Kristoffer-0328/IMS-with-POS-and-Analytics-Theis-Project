import React, { useState, useEffect } from 'react';
import { FiBell } from 'react-icons/fi';

export default function Pos_SalesReport() {
  const [now, setNow] = useState(new Date());
  const [showReceipt, setShowReceipt] = useState(false);

  // update time every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) =>
    date.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });

  const receiptText = `
========================================
                   Glory Star Hardware                    
              123 Main Street, City, Country              
                 Phone: (123) 456-7890                    
        Email: support@glorystarhardware.com              
========================================
                        SALES RECEIPT                    
----------------------------------------------------------
Receipt No:      GS-20250331-001                         
Date:            31-Mar-2025                             
Cashier:         John Doe                                
----------------------------------------------------------

SOLD ITEMS
----------------------------------------------------------
 Description            Qty    Unit Price    Total     
----------------------------------------------------------
 Cement (40kg)           5     $  350.00     $ 350.00  
 Plywood (4x8 ft)        3     $  250.00     $ 250.00  
 Hammer                  2     $  140.00     $ 140.00  
 Screws (100 pcs)        1     $   60.00     $  60.00  
 Paint (1 gal)           2     $  150.00     $ 150.00  
----------------------------------------------------------
 Subtotal:                              $ 850.50    
 VAT (12%):                            $  16.38    
----------------------------------------------------------
 TOTAL AMOUNT:                        $ 950.00     
 AMOUNT PAID:                         $ 160.00     
 CHANGE:                              $   7.12   
========================================

         Thank you for shopping with us!                
    Visit again for quality hardware supplies.          
========================================
`;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="flex items-center justify-between bg-white px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold">Sales Report</h1>
        <div className="flex items-center space-x-4">
          <FiBell size={20} className="text-gray-600" />
          <div className="w-8 h-8 rounded-full bg-gray-200" />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-gray-50">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Shift Details */}
          <div className="flex justify-center">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Shift Details
            </button>
          </div>

          {/* Current Time & Date */}
          <div className="flex justify-end">
            <div className="bg-blue-100 text-blue-800 text-sm p-4 rounded-lg">
              <p>Current Time: {formatTime(now)}</p>
              <p>Date: {formatDate(now)}</p>
            </div>
          </div>

          {/* Profile + Shift Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="h-40 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-medium">Pfp</span>
            </div>
            <div className="bg-blue-100 rounded-lg p-4 space-y-1 text-sm text-blue-800">
              <p>
                <span className="font-semibold">Name:</span> John Kristoffer Miranda
              </p>
              <p>
                <span className="font-semibold">ID:</span> #0110123
              </p>
              <p>
                <span className="font-semibold">Position:</span> Cashier
              </p>
              <p>
                <span className="font-semibold">Shift Start Time:</span> —
              </p>
              <p>
                <span className="font-semibold">Shift End Time:</span> —
              </p>
            </div>
          </div>

          {/* Sales Performance & Payment Summary */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-100 rounded-lg p-4 space-y-1 text-sm text-blue-800">
              <h3 className="font-semibold mb-2">Sales Performance</h3>
              <p>
                <span className="font-medium">Total Sales Amount:</span> —
              </p>
              <p>
                <span className="font-medium">Total Number Transaction:</span> —
              </p>
              <p>
                <span className="font-medium">Highest Sale:</span> —
              </p>
              <p>
                <span className="font-medium">Average Sale:</span> —
              </p>
            </div>
            <div className="bg-blue-100 rounded-lg p-4 space-y-1 text-sm text-blue-800">
              <h3 className="font-semibold mb-2">Payment Summary</h3>
              <p>
                <span className="font-medium">Total Cash Received:</span> —
              </p>
              <p>
                <span className="font-medium">Discrepancy:</span> —
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
              Close Shift
            </button>
            <button
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              onClick={() => setShowReceipt(true)}
            >
              Print Report
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Overlay */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="relative bg-white p-6 rounded-xl max-w-xl w-full overflow-auto"
            style={{ maxHeight: '90vh' }}
          >
            {/* Close */}
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 text-2xl"
            >
              &times;
            </button>

            {/* Receipt text */}
            <pre className="font-mono text-sm leading-snug whitespace-pre-wrap">
              {receiptText}
            </pre>

            {/* Print button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
