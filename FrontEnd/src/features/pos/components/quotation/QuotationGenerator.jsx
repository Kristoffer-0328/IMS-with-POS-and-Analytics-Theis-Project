import React from 'react';

const QuotationGenerator = {
  generate: (quotationData) => {
    const {
      quotationNumber,
      formattedDate,
      validUntilDate,
      customer,
      items,
      totals,
      salesRep,
      companyInfo
    } = quotationData;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sales Quotation - Glory Star Hardware</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            size: A4;
            margin: 0;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.3;
            color: #000;
            background: white;
            padding: 0;
        }
        
        .quotation-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            padding: 15mm;
            position: relative;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #000;
        }
        
        .logo {
            width: 220px;
            height: 220px;
            margin: 0 auto 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .quotation-title {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 2px;
            margin-top: 8px;
        }
        
        .content-body {
            font-size: 11px;
        }
        
        .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ccc;
        }
        
        .info-box {
            padding: 10px;
            border: 1px solid #000;
        }
        
        .section-title {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 11px;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }
        
        .info-content {
            font-size: 10px;
            line-height: 1.5;
        }
        
        .quotation-meta {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            padding: 8px;
            border: 1px solid #000;
            font-size: 10px;
        }
        
        .quotation-meta > div {
            text-align: center;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0 10px 0;
            font-size: 10px;
        }
        
        .items-table th {
            background-color: #000;
            color: white;
            padding: 8px 6px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 9px;
            border: 1px solid #000;
        }
        
        .items-table td {
            padding: 6px;
            border: 1px solid #000;
        }
        
        .item-description {
            font-weight: 500;
        }
        
        .item-category {
            color: #333;
            font-size: 9px;
            font-style: italic;
            margin-top: 2px;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .total-section {
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #000;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 10px;
        }
        
        .total-row.subtotal {
            font-weight: 600;
            padding-top: 5px;
        }
        
        .grand-total {
            font-size: 12px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 8px;
            margin-top: 8px;
        }
        
        .terms-section {
            margin-top: 15px;
            padding: 10px;
            border: 1px solid #000;
        }
        
        .terms-title {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 11px;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }
        
        .terms-list {
            font-size: 9px;
            line-height: 1.5;
            padding-left: 15px;
            margin: 0;
        }
        
        .terms-list li {
            margin-bottom: 4px;
        }
        
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding: 0 20px;
        }
        
        .signature-box {
            text-align: center;
            width: 200px;
        }
        
        .signature-line {
            border-top: 1px solid #000;
            margin-bottom: 5px;
            margin-top: 40px;
        }
        
        .signature-label {
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
        }
        
        .signature-name {
            font-size: 9px;
            margin-top: 3px;
        }
        
        .footer {
            margin-top: 15px;
            text-align: center;
            padding: 10px;
            border-top: 2px solid #000;
            font-size: 10px;
        }
        
        .footer-title {
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            .quotation-container {
                box-shadow: none;
                page-break-after: avoid;
            }
            
            .items-table {
                page-break-inside: avoid;
            }
            
            .logo img {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="quotation-container">
        <div class="header">
            <div class="logo">
                <img src="/Glory_Star_Logo.png" alt="Glory Star Hardware Logo" />
            </div>
            <div class="quotation-title">SALES QUOTATION</div>
        </div>
        
        <div class="content-body">
            <div class="info-section">
                <div class="info-box">
                    <div class="section-title">Company Information</div>
                    <div class="info-content">
                        <strong>Glory Star Hardware</strong><br>
                        Construction Materials Corporation<br>
                        ${companyInfo.address || '[Company Address]'}<br>
                        ${companyInfo.city || '[City, State, ZIP Code]'}<br>
                        Tel: ${companyInfo.phone || '[Phone]'} | Email: ${companyInfo.email || '[Email]'}
                    </div>
                </div>
                
                <div class="info-box">
                    <div class="section-title">Client Information</div>
                    <div class="info-content">
                        <strong>${customer.name || '[Client Name]'}</strong><br>
                        ${customer.company ? `${customer.company}<br>` : ''}
                        ${customer.address || '[Client Address]'}<br>
                        Tel: ${customer.phone || '[Phone]'} | Email: ${customer.email || '[Email]'}
                        ${customer.projectName ? `<br>Project: ${customer.projectName}` : ''}
                    </div>
                </div>
                
                <div class="quotation-meta">
                    <div><strong>Quote No:</strong><br>${quotationNumber}</div>
                    <div><strong>Date:</strong><br>${formattedDate}</div>
                    <div><strong>Valid Until:</strong><br>${validUntilDate}</div>
                    <div><strong>Sales Rep:</strong><br>${salesRep || '[Rep]'}</div>
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 4%;">No.</th>
                        <th style="width: 40%;">Description</th>
                        <th style="width: 10%;">Unit</th>
                        <th style="width: 8%;">Qty</th>
                        <th style="width: 15%;">Unit Price</th>
                        <th style="width: 15%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, index) => `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td>
                                <div class="item-description">${item.name}</div>
                                ${item.category ? `<div class="item-category">${item.category}</div>` : ''}
                            </td>
                            <td class="text-center">${item.unit || 'Pc'}</td>
                            <td class="text-center">${item.qty}</td>
                            <td class="text-right">₱${item.formattedPrice}</td>
                            <td class="text-right"><strong>₱${item.formattedTotal}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="total-section">
                <div class="total-row subtotal">
                    <span>Subtotal:</span>
                    <span>₱${totals.formattedSubtotal}</span>
                </div>
                ${totals.discount > 0 ? `
                <div class="total-row">
                    <span>Less: Discount</span>
                    <span>(₱${totals.formattedDiscount})</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span>Add: VAT (12%)</span>
                    <span>₱${totals.formattedTax}</span>
                </div>
                <div class="total-row">
                    <span>Add: Delivery Fee</span>
                    <span>₱${totals.formattedDeliveryFee}</span>
                </div>
                <div class="total-row grand-total">
                    <span>TOTAL AMOUNT DUE:</span>
                    <span>₱${totals.formattedGrandTotal}</span>
                </div>
            </div>
            
            <div class="terms-section">
                <div class="terms-title">Terms and Conditions</div>
                <ol class="terms-list">
                    <li><strong>Payment:</strong> 30% down payment upon acceptance, 70% upon delivery.</li>
                    <li><strong>Delivery:</strong> 7-10 business days from receipt of down payment.</li>
                    <li><strong>Validity:</strong> Valid for ${customer.validityDays || 30} days from date of issuance.</li>
                    <li><strong>Warranty:</strong> Materials covered by manufacturer's warranty.</li>
                    <li><strong>Returns:</strong> Unopened items within 7 days, 15% restocking fee applies.</li>
                    <li><strong>Cancellation:</strong> Written notice required 48 hours prior to delivery.</li>
                </ol>
            </div>
            
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Prepared By</div>
                    <div class="signature-name">Glory Star Hardware</div>
                </div>
                
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Conforme</div>
                    <div class="signature-name">${customer.name || '[Client Name]'}</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-title">Thank you for your valued patronage</div>
            <div>Contact: ${companyInfo.phone || '[Phone]'} | ${companyInfo.email || '[Email]'}</div>
        </div>
    </div>
</body>
</html>
    `;
  },

  print: (htmlContent) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
};

export default QuotationGenerator;
