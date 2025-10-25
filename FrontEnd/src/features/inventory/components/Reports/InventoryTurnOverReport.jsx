import React, { useState, useEffect } from 'react';
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

  // Function to generate professional PDF
  const generatePDF = () => {
    const reportPeriod = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;
    let currentPageNum = 1;

    const inventoryData = data.productData;

    const addFooter = (pageNum, totalPages) => {
      const footerY = pageHeight - 15;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, footerY, pageWidth - margin, footerY);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Glory Star Hardware - Construction Materials Corporation', pageWidth / 2, footerY + 5, { align: 'center' });
      pdf.text(`Page ${pageNum} | Report generated on ${reportDate}`, pageWidth / 2, footerY + 9, { align: 'center' });
    };

    // Header with company branding
    const addLogoToPDF = async () => {
      try {
        // Fetch the logo image and convert to base64
        const response = await fetch('/Glory_Star_Logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        
        return new Promise((resolve) => {
          reader.onload = () => {
            const base64 = reader.result;
            const logoWidth = 80;
            const logoHeight = 30;
            const logoX = (pageWidth - logoWidth) / 2;
            pdf.addImage(base64, 'PNG', logoX, yPos, logoWidth, logoHeight);
            yPos += logoHeight + 4;
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        // Fallback to text if image fails
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Glory Star Hardware', pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
        return Promise.resolve();
      }
    };

    // Make generatePDF async to handle logo loading
    const generatePDFAsync = async () => {
      await addLogoToPDF();

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Construction Materials Corporation', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Document title with underline
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('INVENTORY TURNOVER REPORT', pageWidth / 2, yPos, { align: 'center' });
      pdf.setLineWidth(2);
      pdf.setDrawColor(31, 41, 55); // Dark gray color like border-gray-800
      pdf.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
      yPos += 12;

      // Report metadata
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, yPos, contentWidth / 2 - 2, 12, 'FD');
      pdf.rect(margin + contentWidth / 2 + 2, yPos, contentWidth / 2 - 2, 12, 'FD');

      pdf.setTextColor(60, 60, 60);
      pdf.text(`Report Period: ${reportPeriod}`, margin + 3, yPos + 5);
      pdf.text(`Generated: ${reportDate}`, margin + contentWidth / 2 + 5, yPos + 5);
      pdf.text(`Total Products: ${inventoryData.length} items`, margin + 3, yPos + 9);
      pdf.text(`Report Type: Turnover Analysis`, margin + contentWidth / 2 + 5, yPos + 9);
      yPos += 18;

      // Report Summary
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('REPORT SUMMARY', margin, yPos);
      yPos += 7;

      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(250, 250, 250);
      const summaryHeight = 22;
      pdf.rect(margin, yPos, contentWidth, summaryHeight, 'FD');

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(50, 50, 50);

      const col1X = margin + 5;
      const col2X = margin + contentWidth / 2 + 5;
      let summaryY = yPos + 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Sales:', col1X, summaryY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`P${totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, col1X + 25, summaryY);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Average Inventory:', col2X, summaryY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`P${Math.round(averageInventory).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, col2X + 35, summaryY);

      summaryY += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Products:', col1X, summaryY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${inventoryData.length} items`, col1X + 25, summaryY);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Qty Sold:', col2X, summaryY);
      pdf.setFont('helvetica', 'normal');
      const totalQty = inventoryData.reduce((sum, item) => sum + item.quantitySold, 0);
      pdf.text(`${totalQty} units`, col2X + 35, summaryY);

      yPos += summaryHeight + 12;

      // Product Table
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('PRODUCT MOVEMENT DETAILS', margin, yPos);
      yPos += 7;

      // Table setup - adjusted widths for better fit
      const colWidths = [40, 22, 24, 16, 26, 16, 18, 18];
      const headers = ['Product Name', 'Category', 'Sales (P)', 'Qty Sold', 'Avg Inv (P)', 'Avg Days', 'Turnover', 'Status'];

      const drawTableHeader = () => {
        pdf.setFillColor(50, 50, 50);
        pdf.rect(margin, yPos, contentWidth, 7, 'F');
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);

        let xPos = margin + 2;
        headers.forEach((header, i) => {
          pdf.text(header, xPos, yPos + 4.5);
          xPos += colWidths[i];
        });
        yPos += 7;
      };

      drawTableHeader();

      // Draw rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);

      inventoryData.forEach((product, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 35) {
          addFooter(currentPageNum, Math.ceil(inventoryData.length / 20));
          pdf.addPage();
          currentPageNum++;
          yPos = margin;
          drawTableHeader();
        }

        // Alternating row colors
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, yPos, contentWidth, 6, 'F');
        }

        const { status, avgDays } = getProductStatus(product.turnoverRate);

        let xPos = margin + 2;
        const rowData = [
          product.productName.length > 20 ? product.productName.substring(0, 18) + '..' : product.productName,
          product.category.length > 12 ? product.category.substring(0, 10) + '..' : product.category,
          product.sales.toLocaleString('en-PH'),
          product.quantitySold.toString(),
          product.averageInventory.toLocaleString('en-PH'),
          `${avgDays}d`,
          `${product.turnoverRate.toFixed(2)}x`,
          status
        ];

        rowData.forEach((data, i) => {
          pdf.text(data, xPos, yPos + 4);
          xPos += colWidths[i];
        });
        yPos += 6;
      });

      // Add footer to last page
      addFooter(currentPageNum, Math.ceil(inventoryData.length / 20));

      return pdf;
    };

    return generatePDFAsync();
  };

  const handlePrint = () => {
    window.print();
  };
  // Function to handle report generation and direct download
  const handleGenerateReport = async () => {
    console.log('Generate Report button clicked');
    console.log('Data available:', !!data);
    console.log('Data object:', data);

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

      // Set the report content for modal (in case user wants to preview)
      setReportContent(report);

      // Automatically download PDF
      console.log('Generating PDF...');
      const pdf = await generatePDF();
      const start = startDate.replace(/-/g, '');
      const end = endDate.replace(/-/g, '');
      const filename = `Inventory_Turnover_Report_${start}_${end}`;

      console.log('Downloading PDF...');
      // Download PDF
      pdf.save(`${filename}.pdf`);

      console.log('PDF download completed, showing modal...');
      // Optional: Show modal for preview (comment out if not needed)
      setShowReportModal(true);

      console.log('Report generation completed successfully');

    } catch (error) {
      console.error('Error generating report:', error);
      alert('An error occurred while generating the report. Please check the console for details.');
    }
  };  // Function to generate test data for demonstration
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

  const totalSales = data && data.productData ? data.productData.reduce((sum, item) => sum + item.sales, 0) : 0;
  const averageInventory = data && data.productData ? data.productData.reduce((sum, item) => sum + item.averageInventory, 0) / data.productData.length : 0;

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
          <span>Generate Report</span>
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
<div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
{/* Modal Header */}
<div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between print:hidden">
<h2 className="text-xl font-semibold">Inventory Turnover Report</h2>
<div className="flex items-center gap-2">
<button
onClick={async () => { const pdf = await generatePDF(); pdf.save(`Inventory_Report_${new Date().getTime()}.pdf`); }}
className="p-2 hover:bg-gray-700 rounded transition-colors"
title="Download PDF"
>
<Download size={20} />
</button>
<button
onClick={handlePrint}
className="p-2 hover:bg-gray-700 rounded transition-colors"
title="Print Report"
>
<Printer size={20} />
</button>
<button
onClick={() => setShowReportModal(false)}
className="p-2 hover:bg-gray-700 rounded transition-colors"
>
<X size={20} />
</button>
</div>
</div>

{/* Modal Body - Scrollable */}
<div className="flex-1 overflow-y-auto p-8 bg-white max-h-[60vh]">
{/* Report Document */}
<div className="max-w-4xl mx-auto bg-white">
{/* Document Header */}
<div className="border-b-4 border-gray-800 pb-6 mb-6">
<h1 className="text-3xl font-bold text-gray-900 text-center mb-1">
Glory Star Hardware
</h1>
<p className="text-center text-gray-600 text-sm mb-3">
Construction Materials Corporation
</p>
<h2 className="text-2xl font-bold text-gray-900 text-center">
INVENTORY TURNOVER REPORT
</h2>
</div>

{/* Report Information */}
<div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
<div className="grid grid-cols-2 gap-4 text-sm mb-4">
<div>
<p className="text-gray-600">Report Period:</p>
<p className="font-semibold text-gray-900">{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</p>
</div>
<div>
<p className="text-gray-600">Generated:</p>
<p className="font-semibold text-gray-900">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
</div>
</div>

<h3 className="text-base font-semibold text-gray-800 mb-3 mt-4">REPORT SUMMARY</h3>
<div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded border border-gray-200">
<div>
<p className="text-gray-600">Total Products:</p>
<p className="font-semibold text-gray-900">{data.productData.length} items</p>
</div>
<div>
<p className="text-gray-600">Report Type:</p>
<p className="font-semibold text-gray-900">Inventory Turnover Analysis</p>
</div>
<div>
<p className="text-gray-600">Total Sales:</p>
<p className="font-semibold text-gray-900">₱{totalSales.toLocaleString()}</p>
</div>
<div>
<p className="text-gray-600">Average Inventory:</p>
<p className="font-semibold text-gray-900">₱{Math.round(averageInventory).toLocaleString()}</p>
</div>
</div>
</div>

{/* Inventory Table */}
<div className="mb-8">
<h2 className="text-lg font-semibold text-gray-800 mb-4">PRODUCT MOVEMENT DETAILS</h2>
<div className="overflow-x-auto border border-gray-300 rounded-lg">
<table className="w-full text-sm">
<thead className="bg-gray-800 text-white">
<tr>
<th className="px-3 py-3 text-left font-semibold">Product Name</th>
<th className="px-3 py-3 text-left font-semibold">Category</th>
<th className="px-3 py-3 text-right font-semibold">Sales</th>
<th className="px-3 py-3 text-center font-semibold">Qty Sold</th>
<th className="px-3 py-3 text-right font-semibold">Avg Inventory</th>
<th className="px-3 py-3 text-center font-semibold">Avg Days</th>
<th className="px-3 py-3 text-center font-semibold">Turnover Rate</th>
<th className="px-3 py-3 text-center font-semibold">Status</th>
</tr>
</thead>
<tbody className="divide-y divide-gray-200">
{currentItems.map((item, index) => {
const { status, color, avgDays } = getProductStatus(item.turnoverRate);
return (
<tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
<td className="px-3 py-3 font-medium text-gray-900">{item.productName}</td>
<td className="px-3 py-3 text-gray-700">{item.category}</td>
<td className="px-3 py-3 text-right text-gray-900">₱{item.sales.toLocaleString()}</td>
<td className="px-3 py-3 text-center text-gray-900">{item.quantitySold}</td>
<td className="px-3 py-3 text-right text-gray-900">₱{item.averageInventory.toLocaleString()}</td>
<td className="px-3 py-3 text-center text-gray-700">{avgDays}d</td>
<td className="px-3 py-3 text-center font-semibold text-gray-900">{item.turnoverRate.toFixed(2)}x</td>
<td className="px-3 py-3 text-center">
<span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
{status}
</span>
</td>
</tr>
);
})}
</tbody>
</table>
</div>
</div>

{/* Document Footer */}
<div className="border-t-2 border-gray-300 pt-4 mt-8">
<div className="text-center text-sm text-gray-600">
<p className="font-semibold text-gray-900">Glory Star Hardware - Construction Materials Corporation</p>
<p className="text-xs mt-1">Report generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
</div>
</div>
</div>
</div>

{/* Pagination Controls */}
<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between print:hidden">
<button
onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
disabled={currentPage === 1}
className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
<ChevronLeft size={18} />
Previous
</button>

<span className="text-sm text-gray-600">
Page {currentPage} of {totalPages} ({data.productData.length} total items)
</span>

<button
onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
disabled={currentPage === totalPages}
className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
Next
<ChevronRight size={18} />
</button>
</div>

{/* Enhanced Footer with Actions */}
<div className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-5 rounded-b-xl">
<div className="flex justify-between items-center">
<div className="flex items-center gap-2 text-slate-600">
<div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
<span className="text-xs font-semibold">Glory Star Hardware - Official Document</span>
</div>
<div className="flex gap-3">
<button
onClick={() => setShowReportModal(false)}
className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all duration-200 flex items-center gap-2 font-semibold text-sm shadow-sm"
>
<FiX size={16} />
<span>Close</span>
</button>
<button
onClick={async () => { const pdf = await generatePDF(); pdf.save(`Inventory_Report_${new Date().getTime()}.pdf`); }}
className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 flex items-center gap-2 font-semibold text-sm shadow-lg hover:shadow-xl"
>
<AiOutlineFilePdf size={18} />
<span>Download PDF</span>
</button>
</div>
</div>
</div>
</div>
</div>
)}    </div>
  );
}

<style jsx>{`
@media print {
  body * {
    visibility: hidden;
  }
  .print\\:hidden {
    display: none !important;
  }
  .fixed.inset-0 {
    position: static;
  }
  .bg-black.bg-opacity-50 {
    background: white;
  }
  .rounded-lg.shadow-2xl {
    box-shadow: none;
  }
  .max-h-\\[90vh\\] {
    max-height: none;
  }
  .overflow-y-auto {
    overflow: visible;
  }
}
`}</style>

export default InventoryTurnoverReport; 
