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
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 20px;
        }
        
        .quotation-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border: 2px solid #e0e0e0;
            padding: 30px;
        }
        
        .header {
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 3px solid #f97316;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .logo {
            width: 60px;
            height: 60px;
            margin-right: 20px;
            background: url('/Glory_Star_Logo.png') no-repeat center center;
            background-size: contain;
        }
        
        .company-info {
            text-align: center;
        }
        
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #f97316;
            margin-bottom: 5px;
        }
        
        .company-tagline {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .quotation-title {
            font-size: 24px;
            color: #dc2626;
            font-weight: bold;
            margin-top: 15px;
        }
        
        .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 20px;
        }
        
        .company-details, .client-info, .quotation-info {
            flex: 1;
        }
        
        .section-title {
            font-weight: bold;
            color: #f97316;
            margin-bottom: 10px;
            font-size: 16px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 5px;
        }
        
        .info-content {
            font-size: 14px;
            line-height: 1.5;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        
        .items-table th {
            background-color: #f97316;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 14px;
            font-weight: bold;
        }
        
        .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
        }
        
        .items-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .total-section {
            margin-top: 20px;
            border-top: 2px solid #f97316;
            padding-top: 15px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .grand-total {
            font-size: 18px;
            font-weight: bold;
            color: #dc2626;
            border-top: 1px solid #e0e0e0;
            padding-top: 10px;
            margin-top: 10px;
        }
        
        .terms-section {
            margin-top: 30px;
            padding: 20px;
            background-color: #f5f5f5;
            border-left: 4px solid #f97316;
        }
        
        .terms-title {
            font-weight: bold;
            color: #f97316;
            margin-bottom: 15px;
            font-size: 16px;
        }
        
        .terms-list {
            font-size: 14px;
            line-height: 1.6;
        }
        
        .terms-list li {
            margin-bottom: 8px;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 2px solid #e0e0e0;
            padding-top: 20px;
        }
        
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
        }
        
        .signature-box {
            text-align: center;
            width: 200px;
        }
        
        .signature-line {
            border-top: 1px solid #333;
            margin-bottom: 5px;
            height: 50px;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            .quotation-container {
                border: none;
                box-shadow: none;
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="quotation-container">
        <div class="header">
            <div class="logo"></div>
            <div class="company-info">
                <div class="company-name">GLORY STAR HARDWARE</div>
                <div class="company-tagline">Construction Materials Corporation</div>
                <div class="quotation-title">SALES QUOTATION</div>
            </div>
        </div>
        
        <div class="info-section">
            <div class="company-details">
                <div class="section-title">FROM:</div>
                <div class="info-content">
                    <strong>Glory Star Hardware</strong><br>
                    Construction Materials Corporation<br>
                    ${companyInfo.address || '[Your Address]'}<br>
                    ${companyInfo.city || '[City, State, ZIP Code]'}<br>
                    Phone: ${companyInfo.phone || '[Your Phone Number]'}<br>
                    Email: ${companyInfo.email || '[Your Email]'}<br>
                    Website: ${companyInfo.website || '[Your Website]'}
                </div>
            </div>
            
            <div class="client-info">
                <div class="section-title">TO:</div>
                <div class="info-content">
                    <strong>${customer.name || '[Client Name]'}</strong><br>
                    ${customer.company ? `${customer.company}<br>` : ''}
                    ${customer.address || '[Client Address]'}<br>
                    Phone: ${customer.phone || '[Client Phone]'}<br>
                    Email: ${customer.email || '[Client Email]'}
                </div>
            </div>
            
            <div class="quotation-info">
                <div class="section-title">QUOTATION DETAILS:</div>
                <div class="info-content">
                    <strong>Quote #:</strong> ${quotationNumber}<br>
                    <strong>Date:</strong> ${formattedDate}<br>
                    <strong>Valid Until:</strong> ${validUntilDate}<br>
                    <strong>Project:</strong> ${customer.projectName || '[Project Name]'}<br>
                    <strong>Sales Rep:</strong> ${salesRep || '[Rep Name]'}
                </div>
            </div>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 45%;">Description</th>
                    <th style="width: 15%;">Unit</th>
                    <th style="width: 10%;">Qty</th>
                    <th style="width: 12%;">Unit Price</th>
                    <th style="width: 13%;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, index) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>
                            ${item.name}<br>
                            <small style="color: #666;">${item.category || ''}</small>
                        </td>
                        <td class="text-center">${item.unit || 'Piece'}</td>
                        <td class="text-center">${item.qty}</td>
                        <td class="text-right">₱${item.formattedPrice}</td>
                        <td class="text-right">₱${item.formattedTotal}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="total-section">
            <div class="total-row">
                <span><strong>Subtotal:</strong></span>
                <span><strong>₱${totals.formattedSubtotal}</strong></span>
            </div>
            ${totals.discount > 0 ? `
            <div class="total-row">
                <span>Discount:</span>
                <span>-₱${totals.formattedDiscount}</span>
            </div>
            ` : ''}
            <div class="total-row">
                <span>Tax (12%):</span>
                <span>₱${totals.formattedTax}</span>
            </div>
            <div class="total-row">
                <span>Delivery Fee:</span>
                <span>₱${totals.formattedDeliveryFee}</span>
            </div>
            <div class="total-row grand-total">
                <span>GRAND TOTAL:</span>
                <span>₱${totals.formattedGrandTotal}</span>
            </div>
        </div>
        
        <div class="terms-section">
            <div class="terms-title">Terms & Conditions</div>
            <ul class="terms-list">
                <li><strong>Payment Terms:</strong> 30% down payment upon acceptance, 70% upon delivery</li>
                <li><strong>Delivery:</strong> 7-10 business days after confirmation and down payment</li>
                <li><strong>Validity:</strong> This quotation is valid for ${customer.validityDays || 30} days from the date above</li>
                <li><strong>Warranty:</strong> Materials carry manufacturer's warranty against defects</li>
                <li><strong>Returns:</strong> Unopened materials may be returned within 7 days with 15% restocking fee</li>
                <li><strong>Installation:</strong> Installation services available upon request at additional cost</li>
                <li><strong>Price Changes:</strong> Prices subject to change without prior notice after validity period</li>
                <li><strong>Cancellation:</strong> Orders may be cancelled with 48-hour advance notice</li>
            </ul>
        </div>
        
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div><strong>Authorized Signature</strong></div>
                <div>Glory Star Hardware</div>
                <div>Date: ___________</div>
            </div>
            
            <div class="signature-box">
                <div class="signature-line"></div>
                <div><strong>Client Acceptance</strong></div>
                <div>${customer.name || '[Client Name]'}</div>
                <div>Date: ___________</div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Thank you for choosing Glory Star Hardware!</strong></p>
            <p style="margin-top: 10px; font-size: 14px; color: #666;">
                For questions about this quotation, please contact us at ${companyInfo.phone || '[phone]'} or ${companyInfo.email || '[email]'}
            </p>
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
    
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
};

export default QuotationGenerator;