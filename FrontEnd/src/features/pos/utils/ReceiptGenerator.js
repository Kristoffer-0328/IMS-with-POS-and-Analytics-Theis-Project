/**
 * Utility functions for generating and printing professional invoices.
 */

// Add the currency formatter helper
const formatCurrency = (number) => {
    const validNumber = typeof number === 'number' && !isNaN(number) ? number : 0;
    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(validNumber);
};

// Helper function to format Date/Time consistently
const getFormattedDateTime = (date = new Date()) => {
    const timestamp = date instanceof Date ? date : new Date();
    const formattedDate = timestamp.toLocaleDateString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    const formattedTime = timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
    });
    return { formattedDate, formattedTime };
};

/**
 * Generates the HTML content for the professional invoice.
 * @param {object} data - The transaction data object.
 * @returns {string} - The complete HTML string for the invoice.
 */
export const generateInvoiceHtml = (data) => {
    if (!data || !data.receiptNumber || !data.items) {
        console.error("generateInvoiceHtml: Invalid data provided.");
        return "<html><body>Error generating invoice: Invalid data.</body></html>";
    }

    const displayTimestamp = data.timestamp instanceof Date ? data.timestamp : new Date();
    const { formattedDate, formattedTime } = getFormattedDateTime(displayTimestamp);

    // Calculate due date (30 days from invoice date for bulk orders)
    const dueDate = new Date(displayTimestamp);
    dueDate.setDate(dueDate.getDate() + 30);
    const formattedDueDate = dueDate.toLocaleDateString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Invoice ${data.receiptNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    font-size: 11pt; 
                    color: #1f2937; 
                    background: #f9fafb;
                    padding: 20px;
                }
    
            // Flexible item field access (match ReceiptModal.jsx)
            const getItemFields = (item) => {
                const name = item.name || item.productName || item.variantName || 'Unknown Item';
                const quantity = item.quantity || item.qty || 0;
                const price = item.price || item.unitPrice || 0;
                const total = item.totalPrice || (price * quantity);
                return { name, quantity, price, total };
            };
                .invoice-container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: #fff; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                /* Header Section */
                .invoice-header {
                    display: flex;
                    justify-content: space-between;
                    padding: 30px 40px;
                    border-bottom: 3px solid #d97706;
                }
                .company-info {
                    flex: 1;
                }
                .logo-img { 
                    width: 150px; 
                    height: auto; 
                    margin-bottom: 15px; 
                }
                .company-name {
                    font-size: 20pt;
                    font-weight: bold;
                    color: #d97706;
                    margin-bottom: 8px;
                }
                .company-details {
                    font-size: 9pt;
                    color: #6b7280;
                    line-height: 1.6;
                }
                .invoice-title-section {
                    text-align: right;
                }
                .invoice-title {
                    font-size: 32pt;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 10px;
                }
                .invoice-meta {
                    font-size: 10pt;
                    color: #6b7280;
                    line-height: 1.8;
                }
                .invoice-meta strong {
                    color: #1f2937;
                    display: inline-block;
                    min-width: 80px;
                }

                /* Billing Section */
                .billing-section {
                                        const { name, quantity, price, total } = getItemFields(item);
                    display: flex;
                    justify-content: space-between;
                    padding: 30px 40px;
                    background: #f9fafb;
                }
                .billing-box {
                    flex: 1;
                }
                .billing-box h3 {
                    font-size: 11pt;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .billing-details {
                    font-size: 10pt;
                    line-height: 1.8;
                    color: #1f2937;
                }
                .billing-details div {
                    margin-bottom: 3px;
                }
                .billing-details strong {
                    display: inline-block;
                    min-width: 90px;
                    color: #6b7280;
                    font-weight: normal;
                }

                /* Items Table */
                .items-section {
                    padding: 20px 40px;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                .items-table thead {
                    background: #f3f4f6;
                }
                .items-table th {
                    padding: 12px;
                    text-align: left;
                    font-size: 9pt;
                    font-weight: 600;
                    color: #374151;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 2px solid #d1d5db;
                }
                .items-table th.text-center { text-align: center; }
                .items-table th.text-right { text-align: right; }
                .items-table td {
                    padding: 12px;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 10pt;
                    color: #1f2937;
                }
                .items-table td.text-center { text-align: center; }
                .items-table td.text-right { text-align: right; }
                .items-table tbody tr:hover {
                    background: #f9fafb;
                }
                
                /* Sale Badge Styles */
                .sale-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    background: #fee2e2;
                    color: #991b1b;
                    border-radius: 4px;
                    font-size: 8pt;
                    font-weight: 600;
                    margin-left: 8px;
                }
                .price-original {
                    text-decoration: line-through;
                    color: #9ca3af;
                    font-size: 9pt;
                    margin-right: 6px;
                }
                .price-sale {
                    color: #dc2626;
                    font-weight: 600;
                }

                /* Totals Section */
                .totals-section {
                    padding: 20px 40px 30px 40px;
                    display: flex;
                    justify-content: flex-end;
                }
                .totals-box {
                    width: 350px;
                }
                .totals-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    font-size: 11pt;
                }
                .totals-row.subtotal {
                    color: #6b7280;
                }
                .totals-row.tax {
                    color: #6b7280;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #e5e7eb;
                }
                .totals-row.total {
                    font-size: 16pt;
                    font-weight: bold;
                    color: #d97706;
                    padding-top: 12px;
                    margin-top: 5px;
                    border-top: 2px solid #d97706;
                }
                .totals-row.payment {
                    font-size: 10pt;
                    color: #059669;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #e5e7eb;
                }

                /* Footer Section */
                .invoice-footer {
                    padding: 25px 40px;
                    background: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                }
                .payment-terms {
                    margin-bottom: 20px;
                }
                .payment-terms h4 {
                    font-size: 10pt;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }
                .payment-terms p {
                    font-size: 9pt;
                    color: #6b7280;
                    line-height: 1.6;
                }
                .footer-note {
                    text-align: center;
                    font-size: 9pt;
                    color: #6b7280;
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }
                .footer-note strong {
                    color: #d97706;
                }

                /* Status Badge */
                .status-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 9pt;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .status-paid {
                    background: #d1fae5;
                    color: #065f46;
                }
                .status-pending {
                    background: #fef3c7;
                    color: #92400e;
                }

                /* Print Button */
                .print-button {
                    display: block;
                    width: 200px;
                    margin: 20px auto;
                    padding: 12px 24px;
                    background: #d97706;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11pt;
                    font-weight: 600;
                    transition: background 0.2s;
                }
                .print-button:hover {
                    background: #b45309;
                }

                /* Print Styles */
                @media print {
                    body { 
                        background: #fff;
                        padding: 0;
                    }
                    .invoice-container {
                        box-shadow: none;
                        max-width: 100%;
                    }
                    .print-button { 
                        display: none; 
                    }
                    .items-table tbody tr:hover {
                        background: transparent;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <!-- Header -->
                <div class="invoice-header">
                    <div class="company-info">
                        <img src="/Glory_Star_Logo.png" alt="Glory Star Hardware" class="logo-img" />
                     
                        <div class="company-details">
                            123 Main Street<br>
                            Antipolo City, Philippines<br>
                            Phone: (123) 456-7890<br>
                            Email: support@glorystarhardware.com<br>
                            VAT Reg TIN: 000-000-000-000
                        </div>
                    </div>
                    <div class="invoice-title-section">
                        <div class="invoice-title">INVOICE</div>
                        <div class="invoice-meta">
                            <div><strong>Invoice No:</strong> ${data.receiptNumber}</div>
                            <div><strong>Date Issued:</strong> ${formattedDate}</div>
                            <div><strong>Time:</strong> ${formattedTime}</div>
                            ${data.isBulkOrder ? `<div><strong>Due Date:</strong> ${formattedDueDate}</div>` : ''}
                            <div style="margin-top: 10px;">
                                <span class="status-badge ${data.amountPaid >= data.total ? 'status-paid' : 'status-pending'}">
                                    ${data.amountPaid >= data.total ? 'PAID' : 'PENDING'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Billing Information -->
                <div class="billing-section">
                    <div class="billing-box">
                        <h3>Bill To</h3>
                        <div class="billing-details">
                            <div><strong>${data.customerName || 'Walk-in Customer'}</strong></div>
                            ${data.isBulkOrder && data.customerDetails?.address ? 
                                `<div>${data.customerDetails.address}</div>` : ''}
                            ${data.isBulkOrder && data.customerDetails?.phone ? 
                                `<div>Phone: ${data.customerDetails.phone}</div>` : ''}
                            ${data.isBulkOrder && data.customerDetails?.email ? 
                                `<div>Email: ${data.customerDetails.email}</div>` : ''}
                        </div>
                    </div>
                    <div class="billing-box">
                        <h3>Invoice Details</h3>
                        <div class="billing-details">
                            <div><strong>Cashier:</strong> ${data.cashierName || 'N/A'}</div>
                            <div><strong>Payment Method:</strong> ${data.paymentMethod || 'Cash'}</div>
                            ${data.paymentReference ? 
                                `<div><strong>Reference:</strong> ${data.paymentReference}</div>` : ''}
                            ${data.isBulkOrder ? 
                                `<div><strong>Order Type:</strong> Bulk Order</div>` : 
                                `<div><strong>Order Type:</strong> Retail</div>`}
                        </div>
                    </div>
                </div>

                <!-- Items Table -->
                <div class="items-section">
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">#</th>
                                <th>Description</th>
                                <th class="text-center" style="width: 80px;">Quantity</th>
                                <th class="text-right" style="width: 120px;">Unit Price</th>
                                <th class="text-right" style="width: 120px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map((item, index) => {
                                const isOnSale = item.onSale || false;
                                const originalPrice = item.originalPrice || null;
                                const discountPercentage = item.discountPercentage || 0;
                                
                                // Combine product name and variant name for clear display
                                let itemName;
                                if (item.name) {
                                    itemName = item.name; // Already formatted
                                } else if (item.productName && item.variantName) {
                                    itemName = `${item.productName} - ${item.variantName}`;
                                } else {
                                    itemName = item.productName || item.variantName || 'Unknown Item';
                                }
                                
                                const quantity = item.qty || item.quantity || 0;
                                const unitPrice = item.unitPrice || item.price || 0;
                                const total = unitPrice * quantity;
                                
                                return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>
                                        ${itemName}
                                        ${isOnSale && discountPercentage > 0 ? 
                                            `<span class="sale-badge">🏷️ ${discountPercentage}% OFF</span>` : ''}
                                    </td>
                                    <td class="text-center">${quantity}</td>
                                    <td class="text-right">
                                        ${isOnSale && originalPrice ? 
                                            `<span class="price-original">₱${formatCurrency(originalPrice)}</span>
                                             <span class="price-sale">₱${formatCurrency(unitPrice)}</span>` : 
                                            `₱${formatCurrency(unitPrice)}`}
                                    </td>
                                    <td class="text-right">₱${formatCurrency(total)}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Totals -->
                <div class="totals-section">
                    <div class="totals-box">
                        ${data.items.some(item => item.onSale) ? `
                            <div class="totals-row" style="color: #059669; background: #d1fae5; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                                <span>🏷️ Total Savings:</span>
                                <span style="font-weight: 600;">₱${formatCurrency(
                                    data.items.reduce((total, item) => {
                                        if (item.onSale && item.originalPrice) {
                                            const savings = (item.originalPrice - item.unitPrice) * item.qty;
                                            return total + savings;
                                        }
                                        return total;
                                    }, 0)
                                )}</span>
                            </div>
                        ` : ''}
                        <div class="totals-row subtotal">
                            <span>Subtotal:</span>
                            <span>₱${formatCurrency(Number(data.subTotal))}</span>
                        </div>
                        <div class="totals-row tax">
                            <span>VAT (12%):</span>
                            <span>₱${formatCurrency(Number(data.tax))}</span>
                        </div>
                        <div class="totals-row total">
                            <span>TOTAL AMOUNT DUE:</span>
                            <span>₱${formatCurrency(Number(data.total))}</span>
                        </div>
                        ${data.amountPaid > 0 ? `
                            <div class="totals-row payment">
                                <span>Amount Paid:</span>
                                <span>₱${formatCurrency(Number(data.amountPaid))}</span>
                            </div>
                            ${data.change > 0 ? `
                                <div class="totals-row payment">
                                    <span>Change:</span>
                                    <span>₱${formatCurrency(Number(data.change))}</span>
                                </div>
                            ` : ''}
                        ` : ''}
                    </div>
                </div>

                <!-- Footer -->
                <div class="invoice-footer">
                    ${data.isBulkOrder ? `
                        <div class="payment-terms">
                            <h4>Payment Terms</h4>
                            <p>Payment is due within 30 days of invoice date. Late payments may incur additional charges. 
                            Please include the invoice number with your payment.</p>
                        </div>
                    ` : ''}
                    <div class="footer-note">
                        <p><strong>Thank you for your business!</strong></p>
                        <p>For questions about this invoice, please contact us at support@glorystarhardware.com</p>
                        <p style="margin-top: 15px; font-size: 8pt;">This is a computer-generated invoice and is valid without signature.</p>
                    </div>
                </div>
            </div>

            <button class="print-button" onclick="window.print(); window.close();">
                Print Invoice
            </button>
        </body>
        </html>
    `;

    return htmlContent;
};

/**
 * Opens a new window, writes the invoice HTML, and initiates printing.
 * @param {object} data - The transaction data object.
 */
export const printInvoiceContent = (data) => {
    const invoiceData = {
        receiptNumber: data.transactionId,
        transactionId: data.transactionId,
        customerName: data.customerName,
        customerDetails: data.customerDetails,
        customerInfo: data.customerInfo || {},
        cashierName: data.cashierName,
        items: data.items || [],
        subTotal: data.subTotal,
        tax: data.tax,
        total: data.total,
        amountPaid: data.amountPaid,
        change: data.change,
        paymentMethod: data.paymentMethod || 'Cash',
        paymentReference: data.paymentReference || null,
        timestamp: data.createdAt || new Date(),
        date: data.date,
        time: data.time,
        isBulkOrder: data.isBulkOrder
    };

    const htmlContent = generateInvoiceHtml(invoiceData);

    if (htmlContent.includes("Error generating invoice")) {
        console.error("Invoice generation failed:", invoiceData);
        alert("Error: Could not generate invoice HTML. Check console for details.");
        return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=800,scrollbars=yes,resizable=yes');
    if (!printWindow) {
        alert("Could not open print window. Please disable popup blockers for this site.");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
    };
};
