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
import { FiDownload, FiPrinter, FiLoader, FiFileText, FiX, FiInfo, FiChevronLeft, FiChevronRight, FiDatabase, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { X, Printer, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { AiOutlineFilePdf } from 'react-icons/ai';
import { ReportingService } from '../../../../services/firebase/ReportingService';
import StockMovementService from '../../../../services/StockMovementService';
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

  // Filter type: 'last7days', 'last30days', 'month'
  const [filterType, setFilterType] = useState('month');
  
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

  // Month picker state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Add chart update key to force re-render
  const [chartUpdateKey, setChartUpdateKey] = useState(0);

  // Handle filter type changes
  const handleFilterChange = (type) => {
    setFilterType(type);
    const today = new Date();
    
    if (type === 'last7days') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (type === 'last30days') {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (type === 'month') {
      // Set to selected month's first and last day
      const [year, month] = selectedMonth.split('-');
      const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(parseInt(year), parseInt(month), 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  };

  // Handle month selection
  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth);
    const [year, month] = newMonth.split('-');
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  // Helper function to get classification badge color
  const getClassificationColor = (classification) => {
    switch(classification) {
      case 'Class A':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'Class B':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Class C':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  // Helper function to format product age
  const formatProductAge = (days) => {
    if (days === 0) return 'New';
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  };

  // Function to generate analysis report
  const generateAnalysisReport = () => {
    if (!data) return;

    const period = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;

    const analysis = getPerformanceAnalysis(
      data.averageTurnoverRate,
      data.totalMovement,
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
        totalInbound: data.totalInbound?.toLocaleString() || '0',
        totalOutbound: data.totalOutbound?.toLocaleString() || '0',
        totalMovement: data.totalMovement?.toLocaleString() || '0',
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


  // Key Metrics Section - 4 separate boxes with movement data
  const boxWidth = (contentWidth - 12) / 4; // 4 boxes with gaps
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
  pdf.text('TURNOVER RATE', boxX + boxWidth / 2, yPos + 6, { align: 'center' });
      
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(brandColor.r, brandColor.g, brandColor.b);
  pdf.text(`${data.averageTurnoverRate.toFixed(2)}x`, boxX + boxWidth / 2, yPos + 17, { align: 'center' });
      
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Inventory circulated', boxX + boxWidth / 2, yPos + 23, { align: 'center' });

  // Box 2: Total Movement
  boxX += boxWidth + boxGap;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
      
  pdf.setFontSize(7);
  pdf.text('TOTAL MOVEMENT', boxX + boxWidth / 2, yPos + 6, { align: 'center' });
      
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text(`${((data.totalMovement || 0) / 1000).toFixed(1)}K`, boxX + boxWidth / 2, yPos + 17, { align: 'center' });
      
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('IN + OUT movements', boxX + boxWidth / 2, yPos + 23, { align: 'center' });

  // Box 3: Total Sales
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
  pdf.text('Outbound value', boxX + boxWidth / 2, yPos + 23, { align: 'center' });

  // Box 4: Average Inventory
  boxX += boxWidth + boxGap;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
      
  pdf.setFontSize(7);
  pdf.text('AVG INVENTORY', boxX + boxWidth / 2, yPos + 6, { align: 'center' });
      
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

  const col2X = margin + 60;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Inbound:', col2X, yPos);
  pdf.setTextColor(34, 197, 94);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${(data.totalInbound || 0).toLocaleString()}`, col2X + 17, yPos);
      
  const col3X = margin + 110;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Outbound:', col3X, yPos);
  pdf.setTextColor(239, 68, 68);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${(data.totalOutbound || 0).toLocaleString()}`, col3X + 20, yPos);
      
  const rightX = pageWidth - margin;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Avg Days:', rightX - 30, yPos);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'bold');
  const avgDays = data.averageTurnoverRate > 0 ? Math.round(365 / data.averageTurnoverRate) : 0;
  pdf.text(`${avgDays}d`, rightX, yPos, { align: 'right' });

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
        product: 45,  // Product name
        category: 22,  // Category
        inQty: 12,     // IN quantity
        outQty: 12,    // OUT quantity
        movement: 15,  // Total movement
        sales: 20,     // Sales value
        rate: 12,      // Turnover rate
        status: 20     // Status badge
      };

      let colX = margin + 2;
      pdf.text('PRODUCT', colX, yPos + 5.5);
      colX += colWidths.product;
      pdf.text('CATEGORY', colX, yPos + 5.5);
      colX += colWidths.category;
      pdf.text('IN', colX, yPos + 5.5, { align: 'center' });
      colX += colWidths.inQty;
      pdf.text('OUT', colX, yPos + 5.5, { align: 'center' });
      colX += colWidths.outQty;
      pdf.text('TOTAL', colX, yPos + 5.5, { align: 'center' });
      colX += colWidths.movement;
      pdf.text('SALES', colX, yPos + 5.5, { align: 'right' });
      colX += colWidths.sales;
      pdf.text('RATE', colX, yPos + 5.5, { align: 'center' });
      colX += colWidths.rate;
      pdf.text('STATUS', colX, yPos + 5.5, { align: 'center' });

      yPos += 8;

      // Table rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      inventoryData.forEach((product, index) => {
        checkPageBreak(10);

        const { status, color } = getProductStatus(product.turnoverRate, product.totalMovement);
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
        const productName = product.productName.length > 25 ? product.productName.substring(0, 22) + '...' : product.productName;
        pdf.setFont('helvetica', 'bold');
        pdf.text(productName, colX, rowY + 5.5);
        
        colX += colWidths.product;
        pdf.setFont('helvetica', 'normal');
        const categoryName = product.category.length > 12 ? product.category.substring(0, 9) + '...' : product.category;
        pdf.text(categoryName, colX, rowY + 5.5);
        
        colX += colWidths.category;
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(34, 197, 94); // Green for IN
        pdf.text(`${product.inQuantity || 0}`, colX, rowY + 5.5, { align: 'center' });
        
        colX += colWidths.inQty;
        pdf.setTextColor(239, 68, 68); // Red for OUT
        pdf.text(`${product.outQuantity || 0}`, colX, rowY + 5.5, { align: 'center' });
        
        colX += colWidths.outQty;
        pdf.setTextColor(31, 41, 55);
        pdf.text(`${product.totalMovement || 0}`, colX, rowY + 5.5, { align: 'center' });
        
        colX += colWidths.movement;
        pdf.text(`₱${product.sales.toLocaleString()}`, colX, rowY + 5.5, { align: 'right' });
        
        colX += colWidths.sales;
        pdf.text(`${product.turnoverRate.toFixed(2)}x`, colX, rowY + 5.5, { align: 'center' });
        
        colX += colWidths.rate;
        // Status badge
        const statusWidth = 20;
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching inventory turnover data for:', { startDate, endDate });
        
        // Call the new ReportingService method
        const result = await ReportingService.getInventoryTurnover(startDate, endDate);
        
        console.log('✅ Received data:', result);
        
        setData(result);
        setChartUpdateKey(prev => prev + 1); // Force chart re-render
        
      } catch (error) {
        console.error('❌ Error fetching inventory turnover data:', error);
        setError(error.message || 'Failed to load inventory turnover data');
      } finally {
        setLoading(false);
      }
    };

    if (startDate && endDate) {
      fetchData();
    }
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
          <p>The turnover rate measures how efficiently your inventory moves:</p>
          <div className="bg-gray-50 p-3 rounded">
            <p className="font-medium mb-2">Formula:</p>
            <p className="text-sm">Turnover Rate = Total Units Sold / Average Inventory</p>
            <p className="text-sm mt-1">Average Inventory = (Beginning Stock + Ending Stock) / 2</p>
          </div>
          <p className="font-medium">Higher turnover rates indicate better inventory performance.</p>
        </div>
      )
    },
    totalVariants: {
      title: "About Total Variants",
      content: (
        <div className="space-y-4">
          <p>This shows the total number of product variants tracked in the selected period.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Each size/unit combination counts as a separate variant</li>
            <li>Variants with stock movements or sales are included</li>
            <li>Helps understand inventory breadth and complexity</li>
          </ul>
        </div>
      )
    },
    totalSales: {
      title: "About Total Units Sold",
      content: (
        <div className="space-y-4">
          <p>Total units sold from the Transactions collection during the selected period.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Counts actual sales transactions</li>
            <li>Used in turnover rate calculation</li>
            <li>Indicates demand and product velocity</li>
          </ul>
        </div>
      )
    },
    avgInventory: {
      title: "About Average Inventory",
      content: (
        <div className="space-y-4">
          <p>Average inventory represents the typical stock level during the period:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Calculated as: (Beginning Stock + Ending Stock) / 2</li>
            <li>Beginning Stock: Oldest stock movement in period</li>
            <li>Ending Stock: Newest stock movement in period</li>
            <li>Used to calculate turnover efficiency</li>
          </ul>
        </div>
      )
    },
    classification: {
      title: "ABC Classification System",
      content: (
        <div className="space-y-4">
          <p className="font-medium">Products are classified based on turnover rate:</p>
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <p className="font-semibold text-green-800">Class A - Fast Moving</p>
              <p className="text-sm text-green-700">Turnover Rate ≥ 8x</p>
              <p className="text-sm mt-1">High demand products that move quickly. Prioritize stock availability.</p>
            </div>
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="font-semibold text-blue-800">Class B - Moderate Moving</p>
              <p className="text-sm text-blue-700">Turnover Rate 4-8x</p>
              <p className="text-sm mt-1">Steady sellers with regular demand. Maintain consistent stock levels.</p>
            </div>
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="font-semibold text-red-800">Class C - Slow Moving</p>
              <p className="text-sm text-red-700">Turnover Rate &lt; 4x</p>
              <p className="text-sm mt-1">Low demand or aging inventory. Consider promotions or reducing stock.</p>
            </div>
          </div>
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
      <div className="flex flex-wrap gap-3 items-end justify-between mb-6">
        {/* Filter Type Toggles */}
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange('last7days')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterType === 'last7days'
                ? 'bg-orange-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handleFilterChange('last30days')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterType === 'last30days'
                ? 'bg-orange-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => handleFilterChange('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterType === 'month'
                ? 'bg-orange-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            By Month
          </button>
        </div>

        {/* Month Picker (only show when filter type is 'month') */}
        {filterType === 'month' && (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Select Month</label>
            <input
              type="month"
              className="px-3 py-2 border border-gray-200 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
            />
          </div>
        )}

        {/* Date Range Display */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">Period:</span> {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
        </div>
      </div>

      {/* KPI Cards with Info Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
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
            Overall inventory turnover
          </p>
        </div>

        {/* Total Variants Tracked */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-3">
              TOTAL VARIANTS
            </h3>
            <button
              onClick={() => setActiveInfoModal('totalVariants')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Learn about total variants"
            >
              <FiInfo className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-4xl font-bold text-gray-800">
            {data.totalVariants || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Product variants tracked
          </p>
        </div>

        {/* Total Units Sold */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-3">
              TOTAL UNITS SOLD
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
            {data.totalUnitsSold?.toLocaleString() || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Units sold in period
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
            {data.totalAvgInventory?.toFixed(0).toLocaleString() || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Average stock units
          </p>
        </div>
      </div>

      {/* Classification Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Class A */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-sm border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-green-800 text-sm uppercase font-bold tracking-wider">
              Class A - Fast Moving
            </h3>
            <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
              A
            </div>
          </div>
          <p className="text-3xl font-bold text-green-900">
            {data.classACount || 0}
          </p>
          <p className="text-sm text-green-700 mt-1">
            Turnover Rate ≥ 8x
          </p>
        </div>

        {/* Class B */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-blue-800 text-sm uppercase font-bold tracking-wider">
              Class B - Moderate Moving
            </h3>
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
              B
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-900">
            {data.classBCount || 0}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Turnover Rate 4-8x
          </p>
        </div>

        {/* Class C */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 shadow-sm border border-red-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-red-800 text-sm uppercase font-bold tracking-wider">
              Class C - Slow Moving
            </h3>
            <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
              C
            </div>
          </div>
          <p className="text-3xl font-bold text-red-900">
            {data.classCCount || 0}
          </p>
          <p className="text-sm text-red-700 mt-1">
            Turnover Rate &lt; 4x
          </p>
        </div>
      </div>

      {/* Classification Chart */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-gray-800 font-semibold">
            Product Classification Distribution
          </h3>
          <button
            onClick={() => setActiveInfoModal('classification')}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Understanding classification"
          >
            <FiInfo className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {data.chartData && data.chartData.map((item, index) => (
            <div key={index} className="text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-3">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#e5e7eb"
                    strokeWidth="16"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={item.color}
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(item.value / data.totalVariants) * 352} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold" style={{ color: item.color }}>
                    {item.value}
                  </span>
                  <span className="text-xs text-gray-500">
                    {((item.value / data.totalVariants) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="font-medium text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-500">Class {item.name.split(' ')[1]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Product-Level Turnover Table */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
        <h3 className="text-gray-800 font-semibold mb-4">Variant Turnover Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product / Variant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beginning Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ending Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Inventory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turnover Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Age
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.productData && data.productData.length > 0 ? (
                data.productData.map((variant, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{variant.productName}</p>
                          <p className="text-xs text-gray-500">{variant.variantName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {variant.category}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {variant.beginningStock}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {variant.endingStock}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-blue-600 font-semibold">
                        {variant.averageInventory.toFixed(1)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {variant.totalUnitsSold}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        {variant.turnoverRate.toFixed(2)}x
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getClassificationColor(variant.classification)}`}>
                          {variant.classification}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatProductAge(variant.productAge)}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500" colSpan="9">
                    No variant data available for the selected period.
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
                    <div className="grid grid-cols-4 gap-6">
                      {/* Turnover Rate */}
                      <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Turnover Rate</p>
                        <p className="text-3xl font-bold text-orange-600">{data.averageTurnoverRate.toFixed(2)}x</p>
                        <p className="text-xs text-gray-600 mt-1">Inventory circulated</p>
                      </div>

                      {/* Total Movement */}
                      <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Movement</p>
                        <p className="text-3xl font-bold text-gray-800">{((data.totalMovement || 0) / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="text-green-600 font-semibold">{data.totalInbound?.toLocaleString() || 0} IN</span>
                          {' + '}
                          <span className="text-red-600 font-semibold">{data.totalOutbound?.toLocaleString() || 0} OUT</span>
                        </p>
                      </div>

                      {/* Total Sales */}
                      <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Sales</p>
                        <p className="text-3xl font-bold text-gray-800">₱{(data.totalSales / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-gray-600 mt-1">Outbound value</p>
                      </div>

                      {/* Average Inventory */}
                      <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Avg Inventory</p>
                        <p className="text-3xl font-bold text-gray-800">₱{(data.averageInventory / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-gray-600 mt-1">Average stock value</p>
                      </div>
                    </div>

                    {/* Additional Metrics Row */}
                    <div className="grid grid-cols-4 gap-6 mt-4">
                      <div className="bg-white rounded-lg px-5 py-3 border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-600">Total Products: <span className="font-bold text-gray-800">{data.productData.length}</span></p>
                      </div>
                      <div className="bg-white rounded-lg px-5 py-3 border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-600">Inbound Qty: <span className="font-bold text-green-600">{data.totalInbound?.toLocaleString() || 0}</span></p>
                      </div>
                      <div className="bg-white rounded-lg px-5 py-3 border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-600">Outbound Qty: <span className="font-bold text-red-600">{data.totalOutbound?.toLocaleString() || 0}</span></p>
                      </div>
                      <div className="bg-white rounded-lg px-5 py-3 border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-600">Avg Days: <span className="font-bold text-gray-800">{data.averageTurnoverRate > 0 ? Math.round(365 / data.averageTurnoverRate) : 0}d</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Product Table Section - Invoice-style */}
                  <div className="p-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide">Product Movement Analysis</h3>
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Product Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Category</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">IN Qty</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">OUT Qty</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Total Move</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Sales</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Rate</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {currentItems.map((item, index) => {
                            const { status, color, avgDays } = getProductStatus(item.turnoverRate, item.totalMovement);
                            return (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.productName}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.category}</td>
                                <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">{item.inQuantity || 0}</td>
                                <td className="px-4 py-3 text-sm text-center font-semibold text-red-600">{item.outQuantity || 0}</td>
                                <td className="px-4 py-3 text-sm text-center font-bold text-gray-900">{item.totalMovement || 0}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₱{item.sales.toLocaleString()}</td>
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
