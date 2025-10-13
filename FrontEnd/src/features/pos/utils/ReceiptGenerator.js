/**
 * Utility functions for generating and printing receipts.
 */

// Add the currency formatter helper
const formatCurrency = (number) => {
    // Ensure we're working with a valid number
    const validNumber = typeof number === 'number' && !isNaN(number) ? number : 0;
    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(validNumber);
};

// Helper function to format Date/Time consistently
const getFormattedDateTime = (date = new Date()) => {
    const timestamp = date instanceof Date ? date : new Date(); // Ensure it's a Date object
    const formattedDate = timestamp.toLocaleDateString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric' // Example: 02-May-2025
    });
    const formattedTime = timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true // Example: 05:50 PM
    });
    return { formattedDate, formattedTime };
};

/**
 * Generates the HTML content for the receipt.
 * @param {object} data - The transaction data object.
 * @returns {string} - The complete HTML string for the receipt.
 */
export const generateReceiptHtml = (data) => {
    // Ensure data is valid
    if (!data || !data.receiptNumber || !data.items) {
        console.error("generateReceiptHtml: Invalid data provided.");
        return "<html><body>Error generating receipt: Invalid data.</body></html>";
    }

    // Use the timestamp from the data (should be client time if passed from hook/component after success)
    const displayTimestamp = data.timestamp instanceof Date ? data.timestamp : new Date();
    const { formattedDate, formattedTime } = getFormattedDateTime(displayTimestamp);

    // --- COMPLETE HTML & CSS (Same as used in Pos_NewSale's inline version) ---
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Invoice ${data.receiptNumber}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #222; width: 380px; margin: 0 auto; padding: 18px; box-sizing: border-box; background: #f8f8f8; }
                .invoice { width: 100%; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 18px; }
                .header, .footer { text-align: center; margin-bottom: 10px; }
                .header p, .footer p { margin: 2px 0; }
                .logo-img { width: 90px; height: auto; margin-bottom: 8px; }
                .store-name { font-weight: bold; font-size: 16pt; color: #d97706; letter-spacing: 1px; display: none; }
                .divider { border-top: 1px solid #e5e7eb; margin: 12px 0; }
                .section-title { text-align: left; margin: 12px 0 6px 0; font-weight: bold; text-transform: uppercase; font-size: 13pt; color: #374151; }
                .info-section { text-align: left; font-size: 10pt; margin-bottom: 8px; }
                .info-section div { margin-bottom: 2px; display: flex; justify-content: space-between; }
                .items-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt; margin-bottom: 3px; padding: 0 2px; color: #374151; }
                .item-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 10pt; text-align: right; padding: 0 2px; }
                .col-desc { text-align: left; flex-grow: 1; margin-right: 5px; word-break: break-word; }
                .col-qty { min-width: 30px; flex-shrink: 0; text-align: center;}
                .col-price { min-width: 55px; flex-shrink: 0; }
                .col-total { min-width: 60px; flex-shrink: 0; font-weight: 500;}
                .totals-section { text-align: right; margin-top: 12px; font-size: 11pt; }
                .totals-section .item-row { font-size: 11pt; margin: 3px 0; }
                .totals-section .item-row span:first-child { text-align: right; flex-grow: 1; margin-right: 10px; }
                .total-line { font-weight: bold; font-size: 13pt; margin-top: 8px; padding-top: 8px; border-top: 2px solid #d97706; color: #d97706; }
                .payment-info { margin-top: 10px; font-size: 11pt; }
                .print-button { display: block; width: 80%; margin: 20px auto 10px auto; padding: 10px; background-color: #d97706; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12pt; }
                @media print {
                    body { width: auto; margin: 0; padding: 0; font-size: 10pt; background: #fff; }
                    .print-button { display: none; }
                    .header, .footer, .section-title, .divider, .item-row, .totals-section .item-row { margin: 3px 0; }
                    .divider { margin: 5px 0; }
                    .totals-section { margin-top: 5px; }
                    .total-line { margin-top: 3px; padding-top: 3px; }
                }
            </style>
        </head>
        <body>
        <div class="invoice">
            <div class="header">
                <img src="/Glory_Star_Logo.png" alt="Glory Star Hardware Logo" class="logo-img" />
                <p>123 Main Street, Antipolo City, Philippines</p>
                <p>Phone: (123) 456-7890</p>
                <p>Email: support@glorystarhardware.com</p>
                <p>VAT Reg TIN: 000-000-000-000</p>
                <div class="divider"></div>
                <p class="section-title">INVOICE</p>
                <div class="divider"></div>
                <div class="info-section">
                    <div><span>Invoice No:</span><span>${data.receiptNumber}</span></div>
                    <div><span>Date:</span><span>${formattedDate}</span></div>
                    <div><span>Time:</span><span>${formattedTime}</span></div>
                    <div><span>Cashier:</span><span>${data.cashierName || 'N/A'}</span></div>
                    <div><span>Customer:</span><span>${data.customerName || 'N/A'} ${data.isBulkOrder ? '(Bulk)' : ''}</span></div>
                    <div><span>Payment:</span><span>${data.paymentMethod || 'N/A'}</span></div>
                    ${data.paymentReference ? `<div><span>Reference:</span><span>${data.paymentReference}</span></div>` : ''}
                    ${data.isBulkOrder && data.customerDetails?.phone ? `<div><span>Phone:</span><span>${data.customerDetails.phone}</span></div>` : ''}
                    ${data.isBulkOrder && data.customerDetails?.address ? `<div><span>Address:</span><span>${data.customerDetails.address}</span></div>` : ''}
                </div>
                <div class="divider"></div>
                <p class="section-title">ITEMS</p>
                <div class="divider"></div>
                <div class="items-header">
                    <span class="col-desc">Description</span>
                    <span class="col-qty">Qty</span>
                    <span class="col-price">Price</span>
                    <span class="col-total">Total</span>
                </div>
                <div class="divider"></div>
            </div>
            <div class="items">
                ${data.items.map(item => `
                    <div class="item-row">
                        <span class="col-desc">${item.name || 'Unknown Item'}</span>
                        <span class="col-qty">${item.quantity || 0}</span>
                        <span class="col-price">₱${formatCurrency(Number(item.price))}</span>
                        <span class="col-total">₱${formatCurrency(Number(item.price) * Number(item.quantity))}</span>
                    </div>
                `).join('')}
                <div class="divider"></div>
            </div>
            <div class="totals-section">
                <div class="item-row">
                    <span>Subtotal:</span>
                    <span>₱${formatCurrency(Number(data.subTotal))}</span>
                </div>
                <div class="item-row">
                    <span>VAT (12%):</span>
                    <span>₱${formatCurrency(Number(data.tax))}</span>
                </div>
                <div class="divider"></div>
                <div class="item-row total-line">
                    <span>TOTAL:</span>
                    <span>₱${formatCurrency(Number(data.total))}</span>
                </div>
                <div class="payment-info">
                   <div class="item-row">
                       <span>Amount Paid:</span>
                       <span>₱${formatCurrency(Number(data.amountPaid))}</span>
                   </div>
                   <div class="item-row">
                       <span>Change:</span>
                       <span>₱${formatCurrency(Number(data.change))}</span>
                   </div>
                </div>
                <div class="divider"></div>
            </div>
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Visit again for quality hardware supplies.</p>
                <p style="font-size: 9pt; margin-top: 10px; color: #374151;">This is your official invoice.</p>
            </div>
            <button class="print-button" onclick="window.print(); window.close();">Print Invoice</button>
        </div>
        </body>
        </html>
    `;

    return htmlContent;
};


/**
 * Opens a new window, writes the receipt HTML, and initiates printing.
 * @param {object} data - The transaction data object.
 */
export const printReceiptContent = (data) => {
    // Map the POS data to the format expected by generateReceiptHtml
    const receiptData = {
        receiptNumber: data.transactionId, // Map transactionId to receiptNumber
        transactionId: data.transactionId,
        customerInfo: data.customerInfo || {},
        items: data.items || [],
        totals: data.totals || { subTotal: 0, tax: 0, total: 0 },
        paymentMethod: data.paymentMethod || 'Cash',
        paymentReference: data.paymentReference || null,
        timestamp: new Date(), // Use current time for receipt
        date: data.date,
        time: data.time,
        cashier: data.cashier || 'Unknown Cashier'
    };

    const htmlContent = generateReceiptHtml(receiptData); // Generate the HTML first

    // Check if HTML generation failed (e.g., due to invalid data)
    if (htmlContent.includes("Error generating receipt")) {
         console.error("Receipt generation failed:", receiptData);
         alert("Error: Could not generate receipt HTML. Check console for details.");
         return;
    }

    const printWindow = window.open('', '_blank', 'width=320,height=650,scrollbars=yes,resizable=yes');
    if (!printWindow) {
        alert("Could not open print window. Please disable popup blockers for this site.");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(htmlContent); // Write the generated HTML
    printWindow.document.close(); // Necessary for print/load events in some browsers


    printWindow.onload = function() {
        printWindow.focus(); // Focus the window
        printWindow.print(); // Trigger print dialog
      
    };


};