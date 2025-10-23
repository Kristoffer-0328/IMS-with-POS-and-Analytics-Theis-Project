import React, { useState, useEffect } from 'react';
import { FiBell, FiPrinter, FiDownload, FiUser } from 'react-icons/fi';

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
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-100/80 to-amber-100/30 rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Sales Report</h2>
            <p className="text-gray-600">Daily shift summary and performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-600 hover:text-gray-800 transition">
              <FiBell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
              <FiUser size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Current Time & Date */}
          <div className="flex justify-between items-center">
            <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Shift Details
            </button>
            <div className="bg-blue-50 text-blue-600 text-sm p-4 rounded-lg">
              <p className="font-medium">Current Time: {formatTime(now)}</p>
              <p>Date: {formatDate(now)}</p>
            </div>
          </div>

          {/* Profile + Shift Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6 flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
                <FiUser size={36} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">John Kristoffer Miranda</h3>
                <p className="text-gray-500">#0110123 | Cashier</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-blue-800 mb-3">Shift Information</h3>
              <div className="grid grid-cols-2 gap-y-2">
                <p className="text-gray-600">Shift Start Time:</p>
                <p className="font-medium text-gray-800">8:00 AM</p>
                
                <p className="text-gray-600">Shift End Time:</p>
                <p className="font-medium text-gray-800">4:00 PM</p>
                
                <p className="text-gray-600">Total Hours:</p>
                <p className="font-medium text-gray-800">8 hours</p>
              </div>
            </div>
          </div>

          {/* Sales Performance & Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-green-800 text-lg mb-2">Sales Performance</h3>
              <div className="grid grid-cols-2 gap-y-3">
                <p className="text-gray-600">Total Sales Amount:</p>
                <p className="font-semibold text-green-600">₱12,450.00</p>
                
                <p className="text-gray-600">Total Transactions:</p>
                <p className="font-semibold text-gray-800">32</p>
                
                <p className="text-gray-600">Highest Sale:</p>
                <p className="font-semibold text-gray-800">₱2,340.00</p>
                
                <p className="text-gray-600">Average Sale:</p>
                <p className="font-semibold text-gray-800">₱389.06</p>
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-amber-800 text-lg mb-2">Payment Summary</h3>
              <div className="grid grid-cols-2 gap-y-3">
                <p className="text-gray-600">Cash Sales:</p>
                <p className="font-semibold text-gray-800">₱8,670.00</p>
                
                <p className="text-gray-600">Card Sales:</p>
                <p className="font-semibold text-gray-800">₱3,780.00</p>
                
                <p className="text-gray-600">Total Cash in Drawer:</p>
                <p className="font-semibold text-gray-800">₱9,120.00</p>
                
                <p className="text-gray-600">Discrepancy:</p>
                <p className="font-semibold text-red-500">₱450.00</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <button className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2">
              <span>End Shift</span>
            </button>
            <div className="flex gap-3">
              <button className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2">
                <FiDownload size={16} />
                <span>Download PDF</span>
              </button>
              <button
                className="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
                onClick={() => setShowReceipt(true)}
              >
                <FiPrinter size={16} />
                <span>Print Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Overlay */}
      {showReceipt && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 bg-opacity-50 flex items-center justify-center z-50">
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

            <h3 className="text-lg font-semibold mb-4 text-gray-800">Sales Receipt</h3>

            {/* Receipt text */}
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="font-mono text-sm leading-snug whitespace-pre-wrap">
                {receiptText}
              </pre>
            </div>

            {/* Print button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <FiPrinter size={16} />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
