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
import { FiDownload, FiPrinter, FiLoader, FiFileText, FiX, FiInfo } from 'react-icons/fi';
import { AiOutlineFilePdf } from 'react-icons/ai';
import { ReportingService } from '../../../../services/firebase/ReportingService';
import jsPDF from 'jspdf';
import InfoModal from '../Dashboard/InfoModal';

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

  // Helper function to get status based on turnover rate
  const getProductStatus = (turnoverRate) => {
    if (turnoverRate >= 4) return { status: 'Fast-moving', emoji: '🟩' };
    if (turnoverRate >= 2) return { status: 'Moderate', emoji: '🟧' };
    return { status: 'Slow-moving', emoji: '🟥' };
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
  const generatePDF = (report) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Header with company branding
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    const companyName = 'Glory Star Hardware';
    pdf.text(companyName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Construction Materials Corporation', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Document title with underline
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('INVENTORY TURNOVER ANALYSIS REPORT', pageWidth / 2, yPos, { align: 'center' });
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
    yPos += 12;

    // Report metadata box
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPos, contentWidth, 15, 'F');
    pdf.rect(margin, yPos, contentWidth, 15, 'S');

    pdf.text(`Period: ${report.period}`, margin + 5, yPos + 6);
    pdf.text(`Generated: ${report.generatedAt}`, margin + 5, yPos + 11);
    yPos += 20;

    // Key Metrics Section with boxes
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('KEY PERFORMANCE METRICS', margin, yPos);
    yPos += 8;

    const boxWidth = (contentWidth - 10) / 3;
    const boxHeight = 25;

    // Turnover Rate Box
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPos, boxWidth, boxHeight, 'S');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('AVERAGE TURNOVER RATE', margin + boxWidth / 2, yPos + 6, { align: 'center' });
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text(`${report.metrics.turnoverRate}x`, margin + boxWidth / 2, yPos + 15, { align: 'center' });
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(report.metrics.performanceLevel, margin + boxWidth / 2, yPos + 21, { align: 'center' });

    // Total Sales Box
    pdf.setDrawColor(34, 197, 94);
    pdf.rect(margin + boxWidth + 5, yPos, boxWidth, boxHeight, 'S');
    pdf.setFontSize(8);
    pdf.text('TOTAL SALES', margin + boxWidth + 5 + boxWidth / 2, yPos + 6, { align: 'center' });
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94);
    pdf.text(`₱${report.metrics.totalSales}`, margin + boxWidth + 5 + boxWidth / 2, yPos + 15, { align: 'center' });
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Period Total', margin + boxWidth + 5 + boxWidth / 2, yPos + 21, { align: 'center' });

    // Average Inventory Box
    pdf.setDrawColor(251, 146, 60);
    pdf.rect(margin + (boxWidth + 5) * 2, yPos, boxWidth, boxHeight, 'S');
    pdf.setFontSize(8);
    pdf.text('AVERAGE INVENTORY', margin + (boxWidth + 5) * 2 + boxWidth / 2, yPos + 6, { align: 'center' });
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(251, 146, 60);
    pdf.text(`₱${report.metrics.averageInventory}`, margin + (boxWidth + 5) * 2 + boxWidth / 2, yPos + 15, { align: 'center' });
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Period Average', margin + (boxWidth + 5) * 2 + boxWidth / 2, yPos + 21, { align: 'center' });

    yPos += boxHeight + 15;

    // Performance Analysis Section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('PERFORMANCE ANALYSIS', margin, yPos);
    yPos += 8;

    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(250, 250, 250);
    const analysisBoxHeight = 40;
    pdf.rect(margin, yPos, contentWidth, analysisBoxHeight, 'FD');

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(50, 50, 50);
    const analysisLines = pdf.splitTextToSize(report.analysis, contentWidth - 10);
    let analysisY = yPos + 6;
    analysisLines.forEach(line => {
      if (analysisY > yPos + analysisBoxHeight - 4) return;
      pdf.text(line, margin + 5, analysisY);
      analysisY += 4;
    });
    yPos += analysisBoxHeight + 15;

    // Product Turnover Breakdown
    if (report.productData && report.productData.length > 0) {
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('PRODUCT TURNOVER BREAKDOWN', margin, yPos);
      yPos += 8;

      // Table setup
      const colWidths = [45, 30, 25, 20, 30, 20, 25];
      const headers = ['Product Name', 'Category', 'Sales (₱)', 'Qty', 'Avg Inv (₱)', 'Rate', 'Status'];

      // Draw header
      pdf.setFillColor(0, 0, 0);
      pdf.rect(margin, yPos, contentWidth, 8, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);

      let xPos = margin + 2;
      headers.forEach((header, i) => {
        pdf.text(header, xPos, yPos + 5.5);
        xPos += colWidths[i];
      });
      yPos += 8;

      // Draw rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);

      report.productData.forEach((product, index) => {
        if (yPos > pageHeight - margin - 10) {
          pdf.addPage();
          yPos = margin;

          // Redraw headers
          pdf.setFillColor(0, 0, 0);
          pdf.rect(margin, yPos, contentWidth, 8, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          xPos = margin + 2;
          headers.forEach((header, i) => {
            pdf.text(header, xPos, yPos + 5.5);
            xPos += colWidths[i];
          });
          yPos += 8;
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
        }

        // Alternating row colors
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, yPos, contentWidth, 7, 'F');
        }

        const { status } = getProductStatus(product.turnoverRate);

        xPos = margin + 2;
        const rowData = [
          product.productName.length > 20 ? product.productName.substring(0, 18) + '..' : product.productName,
          product.category.length > 12 ? product.category.substring(0, 10) + '..' : product.category,
          `₱${product.sales.toLocaleString()}`,
          product.quantitySold.toString(),
          `₱${product.averageInventory.toLocaleString()}`,
          `${product.turnoverRate.toFixed(2)}x`,
          status
        ];

        rowData.forEach((data, i) => {
          pdf.text(data, xPos, yPos + 5);
          xPos += colWidths[i];
        });
        yPos += 7;
      });
    }

    // Footer
    yPos = pageHeight - 15;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Glory Star Hardware - Construction Materials Corporation', pageWidth / 2, yPos + 5, { align: 'center' });
    pdf.text(`Report generated on ${report.generatedAt}`, pageWidth / 2, yPos + 9, { align: 'center' });

    return pdf;
  };

  // Function to handle report generation and direct download
  const handleGenerateReport = () => {
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
      const pdf = generatePDF(report);
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
  };  // Function to download as PDF
  const handleDownloadPDF = () => {
    console.log('Download PDF button clicked');
    console.log('reportContent available:', !!reportContent);
    console.log('reportContent:', reportContent);

    if (!reportContent) {
      console.error('No report content available for PDF download');
      alert('No report content available. Please generate the report first.');
      return;
    }

    try {
      console.log('Generating PDF...');
      const pdf = generatePDF(reportContent);
      console.log('PDF generated:', pdf);

      const start = startDate.replace(/-/g, '');
      const end = endDate.replace(/-/g, '');
      const filename = `Inventory_Turnover_Report_${start}_${end}.pdf`;
      console.log('Saving PDF with filename:', filename);

      pdf.save(filename);
      console.log('PDF download initiated');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('An error occurred while downloading the PDF. Please check the console for details.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await ReportingService.getInventoryTurnover(
          startDate,
          endDate
        );

        setData(result);
      } catch (err) {
        console.error('Error fetching turnover data:', err);
        setError('Failed to load report data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-sm">{label}</p>
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
          <h3 className="text-gray-800 font-semibold">Inventory Turnover</h3>
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
                  const { status, emoji } = getProductStatus(product.turnoverRate);
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
                        <span className="flex items-center gap-2">
                          <span>{emoji}</span>
                          <span>{status}</span>
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

      {/* Report Modal */}
     {/* Report Modal - Enhanced Formal Document Style */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl">
            {/* Elegant Header */}
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white px-8 py-8 rounded-t-xl">
              <div className="text-center space-y-3">
                <div className="inline-block">
                  <h1 className="text-4xl font-bold tracking-tight mb-1">Glory Star Hardware</h1>
                  <div className="h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
                </div>
                <p className="text-slate-300 text-sm font-medium tracking-wide">Construction Materials Corporation</p>
                
                <div className="mt-6 pt-6 border-t border-slate-600">
                  <h2 className="text-2xl font-bold tracking-wide">INVENTORY TURNOVER ANALYSIS</h2>
                  <p className="text-slate-300 text-sm mt-2">Official Report Document</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowReportModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-all duration-200"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Report Metadata Bar */}
            <div className="bg-slate-50 border-b-2 border-slate-200 px-8 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Report Period</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{reportContent.period}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-300"></div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Generated On</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{reportContent.generatedAt}</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                  reportContent.metrics.performanceLevel === 'EXCELLENT' ? 'bg-green-100 text-green-700' :
                  reportContent.metrics.performanceLevel === 'GOOD' ? 'bg-blue-100 text-blue-700' :
                  reportContent.metrics.performanceLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {reportContent.metrics.performanceLevel}
                </div>
              </div>
            </div>

            {/* Scrollable Report Content */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50">
              <div className="p-8 space-y-8">
                
                {/* Executive Summary Section */}
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-1 w-12 bg-blue-600 rounded"></div>
                    <h3 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Executive Summary</h3>
                  </div>
                  
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Turnover Rate Card */}
                    <div className="relative overflow-hidden bg-white rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-shadow">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full"></div>
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Turnover Rate</span>
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-xl">🔄</span>
                          </div>
                        </div>
                        <p className="text-4xl font-bold text-blue-600 mb-1">{reportContent.metrics.turnoverRate}x</p>
                        <p className="text-xs text-slate-500 font-medium">Average Rate</p>
                      </div>
                    </div>

                    {/* Total Sales Card */}
                    <div className="relative overflow-hidden bg-white rounded-xl shadow-lg border-2 border-green-200 hover:shadow-xl transition-shadow">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full"></div>
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Total Sales</span>
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="text-xl">💰</span>
                          </div>
                        </div>
                        <p className="text-3xl font-bold text-green-600 mb-1">₱{reportContent.metrics.totalSales}</p>
                        <p className="text-xs text-slate-500 font-medium">Period Revenue</p>
                      </div>
                    </div>

                    {/* Average Inventory Card */}
                    <div className="relative overflow-hidden bg-white rounded-xl shadow-lg border-2 border-orange-200 hover:shadow-xl transition-shadow">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full"></div>
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">Avg Inventory</span>
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <span className="text-xl">📦</span>
                          </div>
                        </div>
                        <p className="text-3xl font-bold text-orange-600 mb-1">₱{reportContent.metrics.averageInventory}</p>
                        <p className="text-xs text-slate-500 font-medium">Average Value</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Performance Analysis Section */}
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-1 w-12 bg-blue-600 rounded"></div>
                    <h3 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Performance Analysis</h3>
                  </div>
                  <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                    <div className="prose prose-slate max-w-none">
                      <p className="text-slate-700 leading-relaxed text-justify">{reportContent.analysis}</p>
                    </div>
                  </div>
                </section>

                {/* Product Turnover Analysis - Main Focus */}
                {reportContent.productData && reportContent.productData.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-1 w-12 bg-blue-600 rounded"></div>
                      <h3 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Product Turnover Analysis</h3>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead>
                            <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                              <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                                Product Name
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                                Sales Amount
                              </th>
                              <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                                Qty Sold
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                                Avg Inventory
                              </th>
                              <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                                Turnover Rate
                              </th>
                              <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reportContent.productData.map((product, index) => {
                              const { status, emoji } = getProductStatus(product.turnoverRate);
                              return (
                                <tr 
                                  key={index} 
                                  className={`${
                                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                  } hover:bg-blue-50 transition-colors`}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-slate-900">
                                      {product.productName}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                      {product.category}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className="text-sm font-bold text-green-600">
                                      ₱{product.sales.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm font-medium text-slate-700">
                                      {product.quantitySold}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className="text-sm font-bold text-orange-600">
                                      ₱{product.averageInventory.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-blue-100 text-blue-700">
                                      {product.turnoverRate.toFixed(2)}x
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs ${
                                      status === 'Fast-moving' ? 'bg-green-100 text-green-700 border border-green-200' :
                                      status === 'Moderate' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                      'bg-red-100 text-red-700 border border-red-200'
                                    }`}>
                                      <span className="text-base">{emoji}</span>
                                      <span>{status}</span>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                )}

                {/* Report Footer Note */}
                <div className="mt-8 pt-6 border-t-2 border-slate-200">
                  <p className="text-xs text-slate-500 text-center">
                    This report is generated automatically based on sales and inventory data. For inquiries, please contact the management team.
                  </p>
                </div>
              </div>
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
                    onClick={handleDownloadPDF}
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
      )}

    </div>
  );
}

export default InventoryTurnoverReport; 
