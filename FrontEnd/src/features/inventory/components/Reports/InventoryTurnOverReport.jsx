import React, { useState, useEffect } from 'react';
import { printInventoryReportContent } from '../../utils/InventoryReportHtmlGenerator';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { FiDownload, FiPrinter, FiLoader, FiFileText, FiX, FiInfo, FiChevronLeft, FiChevronRight, FiDatabase } from 'react-icons/fi';
import { X, Printer, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { AiOutlineFilePdf } from 'react-icons/ai';
import { ReportingService } from '../../../../services/firebase/ReportingService';
import jsPDF from 'jspdf';
import InfoModal from '../Dashboard/InfoModal';
import { AnalyticsService } from '../../../../services/firebase/AnalyticsService';

function InventoryTurnoverReport({
  yearFilter,
  monthFilter,
  setYearFilter,
  setMonthFilter,
  onBack,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState(null);
  const [activeInfoModal, setActiveInfoModal] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  // Date range filters
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDayOfMonth.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Add chart update key to force re-render
  const [chartUpdateKey, setChartUpdateKey] = useState(0);

  // Helper function to determine granularity based on date range
  const getGranularity = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    return daysDiff <= 31 ? 'weekly' : 'monthly';
  };

  // Helper function to get status based on turnover rate
  const getProductStatus = (turnoverRate) => {
    const avgDays = Math.round(365 / turnoverRate);
    if (turnoverRate >= 10) {
      return { status: 'Very High', color: 'text-green-700 bg-green-50', avgDays };
    } else if (turnoverRate >= 6) {
      return { status: 'High', color: 'text-blue-700 bg-blue-50', avgDays };
    } else if (turnoverRate >= 3) {
      return { status: 'Medium', color: 'text-yellow-700 bg-yellow-50', avgDays };
    } else {
      return { status: 'Low', color: 'text-red-700 bg-red-50', avgDays };
    }
  };

  // Helper function to get concise paragraph-style performance analysis
const getPerformanceAnalysis = (turnoverRate, sales, avgInventory) => {
    const rate = turnoverRate.toFixed(2);
    
    if (turnoverRate >= 3) {
      return `Your inventory is showing excellent performance with a turnover rate of ${rate}x. This indicates that your products are moving quickly through your store and your stock levels are perfectly aligned with customer demand. You're doing a great job at managing your inventory - keep monitoring your best-selling items and maintain healthy stock levels of popular products to continue this strong performance.`;
    } else if (turnoverRate >= 2) {
      return `With a turnover rate of ${rate}x, your inventory is performing well. Your store has achieved a good balance between stock levels and sales. To maintain this positive trend, consider focusing on your most successful product categories and explore opportunities for bulk purchasing. Your current approach to inventory management is effective, and with some fine-tuning, you can make it even better.`;
    } else if (turnoverRate >= 1) {
      return `Your current turnover rate of ${rate}x indicates that while your inventory is moving, there's potential for improvement. We've noticed that some products could sell faster. Consider reviewing which items are moving slower than others and think about adjusting your pricing or running targeted promotions. Small improvements in how you manage your stock levels could make a significant difference in your overall performance.`;
    } else {
      return `Currently, your inventory turnover rate is ${rate}x, which suggests your stock is moving slower than ideal. However, this is something we can work on improving. A good start would be running a clearance sale for older stock and adjusting your pricing strategy. Consider ordering smaller quantities in future purchases and focus on promoting your faster-moving products. These adjustments will help improve your stock flow and business performance.`;
    }
  };

  // Helper function to get performance level string
  const getPerformanceLevel = (turnoverRate) => {
    if (turnoverRate >= 3) return 'EXCELLENT';
    if (turnoverRate >= 2) return 'GOOD';
    if (turnoverRate >= 1) return 'MODERATE';
    return 'NEEDS IMPROVEMENT';
  };
  

  const getTurnoverColor = (rate) => {
    switch(rate) {
      case 'Fast-moving': return 'text-green-700 bg-green-50';
      case 'Moderate': return 'text-yellow-700 bg-yellow-50';
      case 'Slow-moving': return 'text-red-700 bg-red-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  // Function to generate analysis report
  const generateAnalysisReport = () => {
    if (!data) return;

    const period = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;

    const analysis = getPerformanceAnalysis(
      data.averageTurnoverRate,
      data.totalSales,
      data.averageInventory
    );

    const performanceLevel = getPerformanceLevel(data.averageTurnoverRate);
    const performanceColor = {
      'EXCELLENT': 'text-green-600',
      'GOOD': 'text-blue-600',
      'MODERATE': 'text-yellow-600',
      'NEEDS IMPROVEMENT': 'text-red-600'
    }[performanceLevel];

    return {
      period,
      generatedAt: new Date().toLocaleString(),
      metrics: {
        turnoverRate: data.averageTurnoverRate.toFixed(2),
        performanceLevel,
        performanceColor,
        totalSales: data.totalSales.toLocaleString(),
        averageInventory: data.averageInventory.toLocaleString()
      },
      analysis,
      monthlyData: data.monthlyData,
      productData: data.productData || []
    };
  };

  // Function to generate professional PDF (redesigned to match ReceiptGenerator style)
  const generatePDF = () => {
    const reportPeriod = `${new Date(startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 15; // Reduced margin from 20 to 15 for better space utilization
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;
    let currentPageNum = 1;

    const inventoryData = data.productData;
    const performanceLevel = getPerformanceLevel(data.averageTurnoverRate);

    // Orange brand color (matching ReceiptGenerator)
    const brandColor = { r: 217, g: 119, b: 6 }; // #d97706

    const addFooter = (pageNum) => {
      const footerY = pageHeight - 20;
      // Footer border line
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.5);
      pdf.line(margin, footerY, pageWidth - margin, footerY);
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(brandColor.r, brandColor.g, brandColor.b);
      pdf.text('Glory Star Hardware', pageWidth / 2, footerY + 5, { align: 'center' });
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Construction Materials Corporation', pageWidth / 2, footerY + 9, { align: 'center' });
      pdf.text(`Page ${pageNum}`, pageWidth / 2, footerY + 13, { align: 'center' });
    };

    const addNewPage = () => {
      pdf.addPage();
      currentPageNum++;
      yPos = margin;
      addFooter(currentPageNum);
    };

    const checkPageBreak = (requiredSpace) => {
      if (yPos + requiredSpace > pageHeight - 25) { // Reduced footer space from 30 to 25
        addNewPage();
        return true;
      }
      return false;
    };

    // Header with company branding (similar to ReceiptGenerator)
    const addLogoToPDF = async () => {
      try {
        const logoPath = '/Glory_Star_Logo.png';
        const img = new Image();
        img.src = logoPath;
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              pdf.addImage(img, 'PNG', margin, yPos, 40, 15);
              resolve();
            } catch (err) {
              console.warn('Could not add logo to PDF:', err);
              resolve();
            }
          };
          img.onerror = () => {
            console.warn('Logo not found, continuing without it');
            resolve();
          };
          setTimeout(() => resolve(), 1000);
        });
        
        yPos += 18;
      } catch (error) {
        console.warn('Error loading logo:', error);
        yPos += 5;
      }
    };

    // Main PDF generation function
    const generatePDFAsync = async () => {
      // Add logo
      



      // Header row: logo/company info left, report title/metadata right
      const headerY = yPos;
      // Logo (left)
      try {
        const logoPath = '/Glory_Star_Logo.png';
        const img = new Image();
        img.src = logoPath;
        await new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              pdf.addImage(img, 'PNG', margin, headerY, 40, 15);
              resolve();
            } catch (err) {
              resolve();
            }
          };
          img.onerror = () => resolve();
          setTimeout(() => resolve(), 1000);
        });
      } catch {}

      // Company info (left, below logo)
      let infoX = margin;
      let infoY = headerY + 17;
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(brandColor.r, brandColor.g, brandColor.b);
      pdf.text('Glory Star Hardware', infoX, infoY);
      infoY += 6;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Construction Materials Corporation', infoX, infoY);
      infoY += 4;
      pdf.text('123 Main Street, Antipolo City, Philippines', infoX, infoY);
      infoY += 4;
      pdf.text('Phone: (123) 456-7890 | Email: support@glorystarhardware.com', infoX, infoY);

      // Report title/metadata (right)
      let metaX = pageWidth - margin;
      let metaY = headerY + 5;
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('INVENTORY TURNOVER', metaX, metaY, { align: 'right' });
      metaY += 10;
      pdf.text('REPORT', metaX, metaY, { align: 'right' });
      metaY += 10;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Report No: TR-${new Date().getTime()}`, metaX, metaY, { align: 'right' });
      metaY += 4;
      pdf.text(`Date Issued: ${reportDate}`, metaX, metaY, { align: 'right' });
      metaY += 4;
      pdf.text(`Time: ${reportTime}`, metaX, metaY, { align: 'right' });
      metaY += 4;
      pdf.text(`Period: ${reportPeriod}`, metaX, metaY, { align: 'right' });

      // Set yPos for next section
      yPos = Math.max(infoY, metaY) + 10;

  // Orange separator line (moved below title and metadata)
  pdf.setDrawColor(brandColor.r, brandColor.g, brandColor.b);
  pdf.setLineWidth(1);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

      // Performance badge (right-aligned)
      const badgeWidth = 45;
      const badgeHeight = 8;
      const badgeX = pageWidth - margin - badgeWidth;
      
      let badgeColor;
      if (performanceLevel === 'EXCELLENT') badgeColor = { r: 209, g: 250, b: 229, text: { r: 6, g: 95, b: 70 } };
      else if (performanceLevel === 'GOOD') badgeColor = { r: 219, g: 234, b: 254, text: { r: 30, g: 58, b: 138 } };
      else if (performanceLevel === 'MODERATE') badgeColor = { r: 254, g: 243, b: 199, text: { r: 146, g: 64, b: 14 } };
      else badgeColor = { r: 254, g: 226, b: 226, text: { r: 153, g: 27, b: 27 } };

      pdf.setFillColor(badgeColor.r, badgeColor.g, badgeColor.b);
      pdf.roundedRect(badgeX, yPos, badgeWidth, badgeHeight, 2, 2, 'F');
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(badgeColor.text.r, badgeColor.text.g, badgeColor.text.b);
      pdf.text(performanceLevel, badgeX + badgeWidth / 2, yPos + 5.5, { align: 'center' });
      yPos += 15;


  // Key Metrics Section - 3 separate boxes like in the image
  const boxWidth = (contentWidth - 8) / 3; // 3 boxes with gaps
  const boxHeight = 28;
  const boxGap = 4;
      

  // Box 1: Turnover Rate
  let boxX = margin;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
      
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('AVERAGE TURNOVER RATE', boxX + boxWidth / 2, yPos + 6, { align: 'center' });
      
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(brandColor.r, brandColor.g, brandColor.b);
  pdf.text(`${data.averageTurnoverRate.toFixed(2)}x`, boxX + boxWidth / 2, yPos + 17, { align: 'center' });
      
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Times Inventory turned', boxX + boxWidth / 2, yPos + 23, { align: 'center' });

  // Box 2: Total Sales
  boxX += boxWidth + boxGap;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
      
  pdf.setFontSize(7);
  pdf.text('TOTAL SALES', boxX + boxWidth / 2, yPos + 6, { align: 'center' });
      
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(`₱${(data.totalSales / 1000).toFixed(1)}K`, boxX + boxWidth / 2, yPos + 17, { align: 'center' });
      
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Period revenue', boxX + boxWidth / 2, yPos + 23, { align: 'center' });

  // Box 3: Average Inventory
  boxX += boxWidth + boxGap;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
      
  pdf.setFontSize(7);
  pdf.text('AVERAGE INVENTORY', boxX + boxWidth / 2, yPos + 6, { align: 'center' });
      
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(`₱${(data.averageInventory / 1000).toFixed(1)}K`, boxX + boxWidth / 2, yPos + 17, { align: 'center' });
      
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Average stock value', boxX + boxWidth / 2, yPos + 23, { align: 'center' });

  yPos += boxHeight + 5;

  // Additional metrics in a single row below the boxes
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Total Products:', margin, yPos);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${inventoryData.length}`, margin + 23, yPos);

  const centerX = pageWidth / 2;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Avg Days to Sell:', centerX - 15, yPos);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${Math.round(365 / data.averageTurnoverRate)}d`, centerX + 13, yPos);
      
  const rightX = pageWidth - margin;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Total Qty Sold:', rightX - 30, yPos);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'bold');
  const totalQty = inventoryData.reduce((sum, p) => sum + p.quantitySold, 0);
  pdf.text(`${totalQty}`, rightX, yPos, { align: 'right' });

      // Product Performance Table
      checkPageBreak(40);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      yPos += 8;

      // Table header
      pdf.setFillColor(243, 244, 246);
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(margin, yPos, contentWidth, 8, 'FD');

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      
      const colWidths = {
        product: 55,  // Increased for better product name display
        category: 28,
        sales: 23,
        qty: 15,
        avgInv: 23,
        rate: 15,
        status: 22
      };

      let colX = margin + 2;
      pdf.text('PRODUCT NAME', colX, yPos + 5.5);
      colX += colWidths.product;
      pdf.text('CATEGORY', colX, yPos + 5.5);
      colX += colWidths.category;
      pdf.text('SALES', colX, yPos + 5.5, { align: 'right' });
      colX += colWidths.sales;
      pdf.text('QTY', colX, yPos + 5.5, { align: 'center' });
      colX += colWidths.qty;
      pdf.text('AVG INV', colX, yPos + 5.5, { align: 'right' });
      colX += colWidths.avgInv;
      pdf.text('RATE', colX, yPos + 5.5, { align: 'center' });
      colX += colWidths.rate;
      pdf.text('STATUS', colX, yPos + 5.5, { align: 'center' });

      yPos += 8;

      // Table rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      inventoryData.forEach((product, index) => {
        checkPageBreak(10);

        const { status, color } = getProductStatus(product.turnoverRate);
        const rowY = yPos;

        // Alternating row background
        if (index % 2 === 0) {
          pdf.setFillColor(255, 255, 255);
        } else {
          pdf.setFillColor(249, 250, 251);
        }
        pdf.rect(margin, rowY, contentWidth, 8, 'F');

        // Border line
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.1);
        pdf.line(margin, rowY + 8, pageWidth - margin, rowY + 8);

        pdf.setTextColor(31, 41, 55);
        
        colX = margin + 2;
        // Product name (truncate if too long)
        const productName = product.productName.length > 30 ? product.productName.substring(0, 27) + '...' : product.productName;
        pdf.setFont('helvetica', 'bold');
        pdf.text(productName, colX, rowY + 5.5);
        
        colX += colWidths.product;
        pdf.setFont('helvetica', 'normal');
        const categoryName = product.category.length > 15 ? product.category.substring(0, 12) + '...' : product.category;
        pdf.text(categoryName, colX, rowY + 5.5);
        
  colX += colWidths.category;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`₱${product.sales.toLocaleString()}`, colX, rowY + 5.5, { align: 'right' });
        
  colX += colWidths.sales;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${product.quantitySold}`, colX, rowY + 5.5, { align: 'center' });
        
  colX += colWidths.qty;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`₱${product.averageInventory.toLocaleString()}`, colX, rowY + 5.5, { align: 'right' });
        
        colX += colWidths.avgInv;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${product.turnoverRate.toFixed(2)}x`, colX, rowY + 5.5, { align: 'center' });
        
        colX += colWidths.rate;
        // Status badge
        const statusWidth = 22;
        const statusHeight = 5;
        const statusX = colX - statusWidth / 2 + 12;
        
        let statusColor;
        if (status === 'Very High') statusColor = { bg: { r: 209, g: 250, b: 229 }, text: { r: 6, g: 95, b: 70 } };
        else if (status === 'High') statusColor = { bg: { r: 191, g: 219, b: 254 }, text: { r: 30, g: 64, b: 175 } };
        else if (status === 'Moderate') statusColor = { bg: { r: 254, g: 243, b: 199 }, text: { r: 146, g: 64, b: 14 } };
        else statusColor = { bg: { r: 254, g: 226, b: 226 }, text: { r: 153, g: 27, b: 27 } };

        pdf.setFillColor(statusColor.bg.r, statusColor.bg.g, statusColor.bg.b);
        pdf.roundedRect(statusX, rowY + 2, statusWidth, statusHeight, 1, 1, 'F');
        
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(statusColor.text.r, statusColor.text.g, statusColor.text.b);
        pdf.text(status, statusX + statusWidth / 2, rowY + 5.5, { align: 'center' });

        yPos += 8;
      });

      yPos += 10;

      // Footer note
      checkPageBreak(20);
      
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(margin, yPos, contentWidth, 18, 2, 2, 'FD');

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(brandColor.r, brandColor.g, brandColor.b);
      pdf.text('Thank you for reviewing this report!', pageWidth / 2, yPos + 6, { align: 'center' });
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('For questions about this report, please contact us at support@glorystarhardware.com', pageWidth / 2, yPos + 11, { align: 'center' });
      pdf.text('This is a computer-generated report and is valid without signature.', pageWidth / 2, yPos + 15, { align: 'center' });

      // Add footer to all pages
      addFooter(currentPageNum);

      return pdf;
    };

    return generatePDFAsync();
  };

  const handlePrint = () => {
    window.print();
  };
  
  // Function to handle report generation - only shows modal, no auto-download
  const handleGenerateReport = async () => {
    if (!data) {
      console.error('No data available for report generation');
      alert('No data available. Please ensure data is loaded before generating reports.');
      return;
    }

    try {
      const report = generateAnalysisReport();
      console.log('Report generated:', report);

      if (!report) {
        console.error('Failed to generate report - generateAnalysisReport returned null');
        alert('Failed to generate report. Please try again.');
        return;
      }

      // Set the report content and show modal
      setReportContent(report);
      setShowReportModal(true);

      console.log('Report generation completed successfully');

    } catch (error) {
      console.error('Error generating report:', error);
      alert('An error occurred while generating the report. Please check the console for details.');
    }
  };
  
  // Function to generate test data for demonstration
  const handleGenerateTestData = async () => {
    try {
      setLoading(true);
      console.log('Generating test analytics data...');
      
      // Generate test inventory snapshots
      const inventorySnapshots = await AnalyticsService.createTestInventorySnapshots();
      console.log('Created inventory snapshots:', inventorySnapshots);
      
      // Generate test sales aggregations
      const salesAggregations = await AnalyticsService.createTestSalesAggregations();
      console.log('Created sales aggregations:', salesAggregations);
      
      alert('Test data generated successfully! You can now view the inventory turnover report.');
      
      // Refresh the data
      const granularity = getGranularity(startDate, endDate);
      const result = await ReportingService.getInventoryTurnover(
        startDate,
        endDate,
        granularity
      );
      console.log('Refreshed data after test generation:', result);
      setData(result);
      // Force chart re-render
      setChartUpdateKey(prev => prev + 1);
      
    } catch (error) {
      console.error('Error generating test data:', error);
      alert('Error generating test data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching turnover data for:', { startDate, endDate });
        
        const granularity = getGranularity(startDate, endDate);
        
        const result = await ReportingService.getInventoryTurnover(
          startDate,
          endDate,
          granularity
        );
        
        setData(result);
        // Force chart re-render by updating the key
        setChartUpdateKey(prev => prev + 1);
      } catch (err) {
        console.error('Error fetching turnover data:', err);
        setError('Failed to load report data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const itemsPerPage = 8;
  const totalPages = data && data.productData ? Math.ceil(data.productData.length / itemsPerPage) : 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = data && data.productData ? data.productData.slice(startIndex, endIndex) : [];

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const granularity = data?.granularity || 'monthly';
      const periodType = granularity === 'weekly' ? 'Week' : 'Month';
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-sm">{periodType}: {label}</p>
          <p className="text-sm text-blue-600">
            <span className="font-semibold">{payload[0].value.toFixed(2)}</span>
            x turnover rate
          </p>
        </div>
      );
    }
    return null;
  };

  // Chart information content
  const chartInfo = {
    turnoverRate: {
      title: "Understanding Turnover Rate",
      content: (
        <div className="space-y-4">
          <p>The turnover rate measures how many times your inventory is sold and replaced over a period:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="font-medium">Excellent (≥3x):</span> Very efficient inventory management</li>
            <li><span className="font-medium">Good (2-3x):</span> Healthy inventory movement</li>
            <li><span className="font-medium">Moderate (1-2x):</span> Room for improvement</li>
            <li><span className="font-medium">&lt;1x:</span> Potential overstocking issues</li>
          </ul>
          <p>The chart automatically adjusts its granularity based on your selected date range:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="font-medium">Short periods (≤31 days):</span> Shows weekly data points</li>
            <li><span className="font-medium">Long periods (&gt;31 days):</span> Shows monthly data points</li>
          </ul>
          <p>The orange reference line at 3x marks the threshold for excellent performance.</p>
        </div>
      )
    },
    totalSales: {
      title: "About Total Sales",
      content: (
        <div className="space-y-4">
          <p>Total Sales represents the gross revenue from all inventory sold during the selected period:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Helps track revenue performance</li>
            <li>Used in turnover rate calculation</li>
            <li>Indicates market demand</li>
          </ul>
        </div>
      )
    },
    avgInventory: {
      title: "About Average Inventory",
      content: (
        <div className="space-y-4">
          <p>Average Inventory shows the typical value of stock held during the period:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Calculated as (Beginning + Ending Inventory) ÷ 2</li>
            <li>Helps assess capital tied up in stock</li>
            <li>Used to calculate turnover efficiency</li>
          </ul>
        </div>
      )
    },
    monthlyTable: {
      title: "Monthly Performance Table",
      content: (
        <div className="space-y-4">
          <p>The monthly breakdown table shows detailed performance metrics:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Month-by-month comparison</li>
            <li>Individual turnover rates</li>
            <li>Sales and inventory trends</li>
            <li>Color-coded performance levels</li>
          </ul>
          <p>Use this to identify seasonal patterns and opportunities for improvement.</p>
        </div>
      )
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-600">Loading report data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full p-6 bg-yellow-50 rounded-lg">
        <p className="text-yellow-600">No data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Inventory Turnover Report
          </h1>
          <p className="text-gray-600">
            View and analyze your inventory turnover metrics
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center gap-2">
            Back to Reports
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div className="flex flex-wrap gap-3 justify-end mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-200 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-200 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* KPI Cards with Info Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Average Turnover Rate */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-3">
              AVERAGE TURNOVER RATE
            </h3>
            <button
              onClick={() => setActiveInfoModal('turnoverRate')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about turnover rate"
            >
              <FiInfo className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-4xl font-bold text-gray-800">
            {data.averageTurnoverRate.toFixed(2)}x
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Times inventory turned over
          </p>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-3">
              TOTAL SALES
            </h3>
            <button
              onClick={() => setActiveInfoModal('totalSales')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about total sales"
            >
              <FiInfo className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-4xl font-bold text-gray-800">
            ₱{data.totalSales.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Period total sales
          </p>
        </div>

        {/* Average Inventory */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-3">
              AVERAGE INVENTORY
            </h3>
            <button
              onClick={() => setActiveInfoModal('avgInventory')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about average inventory"
            >
              <FiInfo className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-4xl font-bold text-gray-800">
            ₱{data.averageInventory.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Average inventory value
          </p>
        </div>
      </div>

      {/* Generate Report Button */}
      <div className="flex justify-end gap-3 mb-6">
        <button 
          onClick={handleGenerateTestData}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <FiDatabase size={16} />
          <span>Generate Test Data</span>
        </button>
        <button 
          onClick={handleGenerateReport}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FiFileText size={16} />
          <span>Generate Report (Modal)</span>
        </button>
        <button
          onClick={() => {
            if (!data) {
              alert('No data available. Please ensure data is loaded before printing.');
              return;
            }
            printInventoryReportContent(data, { startDate, endDate });
          }}
          className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
        >
          <FiFileText size={16} />
          <span>Print HTML Report</span>
        </button>
      </div>

      {/* Chart with Info Button */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-gray-800 font-semibold">
            Inventory Turnover {data?.granularity === 'weekly' ? '(Weekly)' : '(Monthly)'}
          </h3>
          <button
            onClick={() => setActiveInfoModal('turnoverRate')}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="How to read this chart"
          >
            <FiInfo className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              key={`${startDate}-${endDate}-${chartUpdateKey}`} // Force re-render when date range or data changes
              data={data.chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f1f1"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#888', fontSize: 11 }}
                tickFormatter={tick => {
                  // Format '20251001' as 'Oct 01' for weekly, 'Oct' or 'Oct 2025' for monthly
                  if (!tick) return '';
                  if (data?.granularity === 'weekly') {
                    // Show 'Oct 01' (month short + day)
                    const year = tick.slice(0, 4);
                    const month = tick.slice(4, 6);
                    const day = tick.slice(6, 8);
                    const date = new Date(`${year}-${month}-${day}`);
                    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                  } else if (data?.granularity === 'monthly') {
                    // Show 'Oct 2025'
                    const year = tick.slice(0, 4);
                    const month = tick.slice(4, 6);
                    const date = new Date(`${year}-${month}-01`);
                    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  }
                  return tick;
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#888', fontSize: 11 }}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={3} stroke="#ff7b54" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorValue)"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{
                  r: 6,
                  fill: '#3b82f6',
                  strokeWidth: 2,
                  stroke: '#fff',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product-Level Turnover Table */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
        <h3 className="text-gray-800 font-semibold mb-4">Product Turnover Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales (₱)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Inventory (₱)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turnover Rate (x)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.productData && data.productData.length > 0 ? (
                data.productData.map((product, index) => {
                  const { status, color } = getProductStatus(product.turnoverRate);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.productName}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {product.category}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        ₱{product.sales.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {product.quantitySold} pcs
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        ₱{product.averageInventory.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {product.turnoverRate.toFixed(2)}x
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500" colSpan="7">
                    No product data available for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Data Table with Info Button */}
      

      {/* Info Modal */}
      <InfoModal
        isOpen={!!activeInfoModal}
        onClose={() => setActiveInfoModal(null)}
        title={activeInfoModal ? chartInfo[activeInfoModal].title : ''}
        content={activeInfoModal ? chartInfo[activeInfoModal].content : ''}
      />

      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header - Orange branded */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-8 py-5 flex items-center justify-between print:hidden">
              <div>
                <h2 className="text-2xl font-bold">Inventory Turnover Report</h2>
                <p className="text-orange-100 text-sm mt-1">
                  {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
                  title="Close"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body - Professional Invoice Style */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="max-w-5xl mx-auto p-8">
                {/* Invoice-style Document Container */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  
                  {/* Header Section */}
                  <div className="border-b-2 border-orange-600 p-8">
                    <div className="flex justify-between items-start">
                      {/* Company Info */}
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <img 
                            src="/Glory_Star_Logo.png" 
                            alt="Glory Star Hardware" 
                            className="h-12 w-auto"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div>
                            <h1 className="text-2xl font-bold text-orange-600">Glory Star Hardware</h1>
                            <p className="text-sm text-gray-600">Construction Materials Corporation</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p>123 Main Street, Antipolo City, Philippines</p>
                          <p>Phone: (123) 456-7890 | Email: support@glorystarhardware.com</p>
                          <p>VAT Reg TIN: 000-000-000-000</p>
                        </div>
                      </div>

                      {/* Report Title & Info */}
                      <div className="text-right">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">INVENTORY</h2>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">TURNOVER REPORT</h2>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-semibold">Report No:</span> TR-{new Date().getTime()}</p>
                          <p><span className="font-semibold">Date Issued:</span> {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
                          <p><span className="font-semibold">Time:</span> {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                          <p><span className="font-semibold">Period:</span> {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
                        </div>
                        {/* Performance Badge */}
                        <div className="mt-3 inline-block">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                            getPerformanceLevel(data.averageTurnoverRate) === 'EXCELLENT' ? 'bg-green-100 text-green-700' :
                            getPerformanceLevel(data.averageTurnoverRate) === 'GOOD' ? 'bg-blue-100 text-blue-700' :
                            getPerformanceLevel(data.averageTurnoverRate) === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {getPerformanceLevel(data.averageTurnoverRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics Section - Invoice-style */}
                  <div className="bg-gray-50 p-8 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-6">
                      {/* Turnover Rate */}
                      <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Average Turnover Rate</p>
                        <p className="text-3xl font-bold text-orange-600">{data.averageTurnoverRate.toFixed(2)}x</p>
                        <p className="text-xs text-gray-600 mt-1">Times inventory turned</p>
                      </div>

                      {/* Total Sales */}
                      <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Sales</p>
                        <p className="text-3xl font-bold text-gray-800">₱{(data.totalSales / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-gray-600 mt-1">Period revenue</p>
                      </div>

                      {/* Average Inventory */}
                      <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Average Inventory</p>
                        <p className="text-3xl font-bold text-gray-800">₱{(data.averageInventory / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-gray-600 mt-1">Average stock value</p>
                      </div>
                    </div>

                    {/* Additional Metrics Row */}
                    <div className="grid grid-cols-3 gap-6 mt-4">
                      <div className="bg-white rounded-lg px-5 py-3 border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-600">Total Products: <span className="font-bold text-gray-800">{data.productData.length}</span></p>
                      </div>
                      <div className="bg-white rounded-lg px-5 py-3 border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-600">Avg Days to Sell: <span className="font-bold text-gray-800">{Math.round(365 / data.averageTurnoverRate)}d</span></p>
                      </div>
                      <div className="bg-white rounded-lg px-5 py-3 border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-600">Total Qty Sold: <span className="font-bold text-gray-800">{data.productData.reduce((sum, item) => sum + item.quantitySold, 0)}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Product Table Section - Invoice-style */}
                  <div className="p-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide">Product Turnover Analysis</h3>
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Product Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Category</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Sales</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Qty Sold</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Avg Inventory</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Turnover</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {currentItems.map((item, index) => {
                            const { status, color, avgDays } = getProductStatus(item.turnoverRate);
                            return (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.productName}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.category}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₱{item.sales.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm text-center text-gray-900">{item.quantitySold}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₱{item.averageInventory.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">{item.turnoverRate.toFixed(2)}x <span className="text-xs text-gray-500">({avgDays}d)</span></td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
                                    {status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination within table section */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={16} />
                          Previous
                        </button>

                        <span className="text-sm text-gray-600 font-medium">
                          Page {currentPage} of {totalPages} <span className="text-gray-400">•</span> {data.productData.length} products
                        </span>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Footer Section - Invoice-style */}
                  <div className="bg-gray-50 p-8 border-t-2 border-gray-200">
                    <div className="text-center space-y-2">
                      <p className="text-sm font-bold text-orange-600">Thank you for reviewing this report!</p>
                      <p className="text-xs text-gray-600">For questions about this report, please contact us at support@glorystarhardware.com</p>
                      <p className="text-xs text-gray-500 italic">This is a computer-generated report and is valid without signature.</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-white border-t border-gray-200 px-8 py-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                <span className="text-xs font-medium">Glory Star Hardware - Official Document</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Close
                </button>

                <button
                  onClick={async () => { 
                    const pdf = await generatePDF(); 
                    pdf.save(`Inventory_Turnover_Report_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.pdf`); 
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all font-semibold text-sm shadow-lg flex items-center gap-2"
                >
                  <AiOutlineFilePdf size={18} />
                  Download PDF

                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryTurnoverReport;
