/**
 * Utility functions for generating and printing Inventory Turnover Report as HTML.
 */

// Currency formatter helper
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
 * Generates the HTML content for the Inventory Turnover Report.
 * @param {object} data - The report data object.
 * @param {object} options - Optional settings (startDate, endDate, etc.)
 * @returns {string} - The complete HTML string for the report.
 */
export const generateInventoryReportHtml = (data, options = {}) => {
    if (!data || !data.productData) {
        return '<html><body>Error: No report data available.</body></html>';
    }

    const { startDate, endDate } = options;
    const now = new Date();
    const { formattedDate, formattedTime } = getFormattedDateTime(now);
    const reportPeriod = startDate && endDate
        ? `${new Date(startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`
        : '';
    const totalQty = data.productData.reduce((sum, p) => sum + p.quantitySold, 0);

    // Helper for status badge color
    const getStatusClass = (status) => {
        if (status === 'Very High') return 'status-excellent';
        if (status === 'High') return 'status-good';
        if (status === 'Medium' || status === 'Moderate') return 'status-moderate';
        return 'status-low';
    };

    // Helper for product status
    const getProductStatus = (turnoverRate) => {
        if (turnoverRate >= 10) return { status: 'Very High' };
        if (turnoverRate >= 6) return { status: 'High' };
        if (turnoverRate >= 3) return { status: 'Medium' };
        return { status: 'Low' };
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Inventory Turnover Report</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1f2937; background: #f9fafb; padding: 20px; }
            .report-container { max-width: 900px; margin: 0 auto; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
            .header-section { display: flex; justify-content: space-between; padding: 32px 40px 24px 40px; border-bottom: 3px solid #d97706; }
            .company-info { flex: 1; }
            .logo-img { width: 120px; height: auto; margin-bottom: 10px; }
            .company-name { font-size: 20pt; font-weight: bold; color: #d97706; margin-bottom: 6px; }
            .company-details { font-size: 9pt; color: #6b7280; line-height: 1.6; }
            .report-title-section { text-align: right; }
            .report-title { font-size: 28pt; font-weight: bold; color: #1f2937; margin-bottom: 8px; }
            .report-meta { font-size: 10pt; color: #6b7280; line-height: 1.8; }
            .report-meta strong { color: #1f2937; display: inline-block; min-width: 80px; }
            .badge { display: inline-block; padding: 6px 18px; border-radius: 16px; font-size: 10pt; font-weight: bold; margin-top: 10px; }
            .status-excellent { background: #d1fae5; color: #065f46; }
            .status-good { background: #dbeafe; color: #1e40af; }
            .status-moderate { background: #fef3c7; color: #92400e; }
            .status-low { background: #fee2e2; color: #9f1239; }
            .metrics-section { background: #f9fafb; padding: 32px 40px 16px 40px; border-bottom: 1px solid #e5e7eb; }
            .metrics-row { display: flex; gap: 32px; }
            .metric-box { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; flex: 1; padding: 24px 18px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
            .metric-title { font-size: 10pt; color: #6b7280; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; }
            .metric-value { font-size: 28pt; font-weight: bold; color: #d97706; margin-bottom: 4px; }
            .metric-value-dark { color: #1f2937; }
            .metric-desc { font-size: 10pt; color: #6b7280; }
            .metrics-additional { display: flex; gap: 32px; margin-top: 18px; }
            .metrics-additional-box { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; flex: 1; padding: 12px 18px; text-align: center; }
            .metrics-additional-label { font-size: 10pt; color: #6b7280; }
            .metrics-additional-value { font-size: 12pt; font-weight: bold; color: #1f2937; }
            .table-section { padding: 32px 40px; }
            .table-title { font-size: 13pt; font-weight: bold; color: #1f2937; margin-bottom: 18px; text-transform: uppercase; }
            .product-table { width: 100%; border-collapse: collapse; }
            .product-table thead { background: #f3f4f6; }
            .product-table th { padding: 12px; text-align: left; font-size: 9pt; font-weight: 600; color: #374151; text-transform: uppercase; border-bottom: 2px solid #d1d5db; }
            .product-table th.text-center { text-align: center; }
            .product-table th.text-right { text-align: right; }
            .product-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 10pt; color: #1f2937; }
            .product-table td.text-center { text-align: center; }
            .product-table td.text-right { text-align: right; }
            .product-table tbody tr:hover { background: #f9fafb; }
            .footer-section { background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center; }
            .footer-note { font-size: 10pt; color: #d97706; font-weight: bold; margin-bottom: 6px; }
            .footer-desc { font-size: 9pt; color: #6b7280; }
            .footer-desc-italic { font-size: 9pt; color: #6b7280; font-style: italic; }
            .print-button { display: block; width: 200px; margin: 24px auto; padding: 12px 24px; background: #d97706; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11pt; font-weight: 600; transition: background 0.2s; }
            .print-button:hover { background: #b45309; }
            @media print {
                .print-button { display: none; }
                .footer-section {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    width: 100vw;
                    background: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                    z-index: 999;
                    box-shadow: 0 -1px 3px rgba(0,0,0,0.04);
                }
            }
        </style>
    </head>
    <body>
        <div class="report-container">
            <!-- Header -->
            <div class="header-section">
                <div class="company-info">
                    <img src="/Glory_Star_Logo.png" alt="Glory Star Hardware" class="logo-img" />
                    <div class="company-name">Glory Star Hardware</div>
                    <div class="company-details">
                        Construction Materials Corporation<br>
                        123 Main Street, Antipolo City, Philippines<br>
                        Phone: (123) 456-7890 | Email: support@glorystarhardware.com<br>
                        VAT Reg TIN: 000-000-000-000
                    </div>
                </div>
                <div class="report-title-section">
                    <div class="report-title">INVENTORY TURNOVER REPORT</div>
                    <div class="report-meta">
                        <div><strong>Report No:</strong> TR-${now.getTime()}</div>
                        <div><strong>Date Issued:</strong> ${formattedDate}</div>
                        <div><strong>Time:</strong> ${formattedTime}</div>
                        <div><strong>Period:</strong> ${reportPeriod}</div>
                    </div>
                    <div class="badge ${getStatusClass(data.performanceLevel || 'Low')}">
                        ${data.performanceLevel || 'LOW'}
                    </div>
                </div>
            </div>
            <!-- Metrics Section -->
            <div class="metrics-section">
                <div class="metrics-row">
                    <div class="metric-box">
                        <div class="metric-title">Average Turnover Rate</div>
                        <div class="metric-value">${data.averageTurnoverRate ? data.averageTurnoverRate.toFixed(2) : '0.00'}x</div>
                        <div class="metric-desc">Times inventory turned</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-title">Total Sales</div>
                        <div class="metric-value metric-value-dark">₱${data.totalSales ? (data.totalSales / 1000).toFixed(1) : '0.0'}K</div>
                        <div class="metric-desc">Period revenue</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-title">Average Inventory</div>
                        <div class="metric-value metric-value-dark">₱${data.averageInventory ? (data.averageInventory / 1000).toFixed(1) : '0.0'}K</div>
                        <div class="metric-desc">Average stock value</div>
                    </div>
                </div>
                <div class="metrics-additional">
                    <div class="metrics-additional-box">
                        <span class="metrics-additional-label">Total Products:</span>
                        <span class="metrics-additional-value">${data.productData.length}</span>
                    </div>
                    <div class="metrics-additional-box">
                        <span class="metrics-additional-label">Avg Days to Sell:</span>
                        <span class="metrics-additional-value">${data.averageTurnoverRate ? Math.round(365 / data.averageTurnoverRate) : '0'}d</span>
                    </div>
                    <div class="metrics-additional-box">
                        <span class="metrics-additional-label">Total Qty Sold:</span>
                        <span class="metrics-additional-value">${totalQty}</span>
                    </div>
                </div>
            </div>
            <!-- Product Table Section -->
            <div class="table-section">
                <div class="table-title">Product Turnover Analysis</div>
                <table class="product-table">
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th class="text-right">Sales</th>
                            <th class="text-center">Qty Sold</th>
                            <th class="text-right">Avg Inventory</th>
                            <th class="text-center">Turnover</th>
                            <th class="text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.productData.map((item) => {
                            const { status } = getProductStatus(item.turnoverRate);
                            return `
                                <tr>
                                    <td>${item.productName}</td>
                                    <td>${item.category}</td>
                                    <td class="text-right">₱${formatCurrency(item.sales)}</td>
                                    <td class="text-center">${item.quantitySold}</td>
                                    <td class="text-right">₱${formatCurrency(item.averageInventory)}</td>
                                    <td class="text-center">${item.turnoverRate.toFixed(2)}x</td>
                                    <td class="text-center"><span class="badge ${getStatusClass(status)}">${status}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <!-- Footer Section -->
            <div class="footer-section">
                <div class="footer-note">Thank you for reviewing this report!</div>
                <div class="footer-desc">For questions about this report, please contact us at support@glorystarhardware.com</div>
                <div class="footer-desc-italic">This is a computer-generated report and is valid without signature.</div>
            </div>
        </div>
        <button class="print-button" onclick="window.print(); window.close();">Print Report</button>
    </body>
    </html>
    `;
};

/**
 * Opens a new window, writes the report HTML, and initiates printing.
 * @param {object} data - The report data object.
 * @param {object} options - Optional settings (startDate, endDate, etc.)
 */
export const printInventoryReportContent = (data, options = {}) => {
    const htmlContent = generateInventoryReportHtml(data, options);
    if (htmlContent.includes('Error')) {
        alert('Error: Could not generate report HTML.');
        return;
    }
    const printWindow = window.open('', '_blank', 'width=1000,height=900,scrollbars=yes,resizable=yes');
    if (!printWindow) {
        alert('Could not open print window. Please disable popup blockers for this site.');
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
