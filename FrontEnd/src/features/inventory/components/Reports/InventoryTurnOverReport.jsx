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

  // List of available months for filter
  const months = [
    'All Months',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // List of available years for filter
  const currentYear = new Date().getFullYear();
  const years = [
    currentYear.toString(),
    (currentYear - 1).toString(),
    (currentYear - 2).toString(),
    (currentYear - 3).toString(),
  ];

  // Helper function to get performance level
  const getPerformanceLevel = (turnoverRate) => {
    if (turnoverRate >= 3) return "EXCELLENT";
    if (turnoverRate >= 2) return "GOOD";
    if (turnoverRate >= 1) return "MODERATE";
    return "NEEDS IMPROVEMENT";
  };

  // Helper function to get concise paragraph-style performance analysis
const getPerformanceAnalysis = (turnoverRate, sales, avgInventory) => {
    const rate = turnoverRate.toFixed(2);
  
    
    if (turnoverRate >= 3) {
      return `With a turnover rate of ${rate}x, the store demonstrates excellent inventory efficiency and strong sales momentum. Inventory is well-aligned with demand, minimizing excess stock while avoiding shortages. To sustain this, consider expanding high-performing product lines, using safety stock for popular items, and leveraging volume to negotiate supplier terms. Be mindful of the risk of stockouts and rising logistics costs due to frequent restocking.`;
    } else if (turnoverRate >= 2) {
      return `The store shows good performance with a turnover rate of ${rate}x, reflecting balanced inventory and solid demand. There's room to optimize stock levels and refine product offerings. Opportunities include bulk purchasing for margin improvement and expanding successful categories. Watch for seasonal fluctuations and ensure supplier reliability to maintain momentum.`;
    } else if (turnoverRate >= 1) {
      return `A turnover rate of ${rate}x indicates moderate performance, with potential for improvement in stock efficiency. Inventory is moving, but not at an ideal pace. Focus on clearing slow-moving items, optimizing order sizes, and reducing holding costs. There's upside through better marketing and stock control, but risks include tied-up capital and rising storage expenses.`;
    } else {
      return `The low turnover rate of ${rate}x signals poor inventory performance and overstocking. Sales aren't keeping pace with inventory levels, affecting cash flow and profitability. Immediate steps include inventory audits, clearance sales, and revised purchasing practices. While risks are high - such as obsolescence and excess holding costs - targeted actions can reverse the trend and restore efficiency.`;
    }
  };
  

  // Function to generate analysis report
  const generateAnalysisReport = () => {
    if (!data) return;

    const period = monthFilter === 'All Months' 
      ? `Year ${yearFilter}`
      : `${monthFilter} ${yearFilter}`;

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
      monthlyData: monthFilter === 'All Months' ? data.monthlyData : null
    };
  };

  // Function to generate PDF
  const generatePDF = (reportText) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Add title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const title = 'Inventory Turnover Analysis Report';
    const titleWidth = pdf.getStringUnitWidth(title) * pdf.getFontSize() / pdf.internal.scaleFactor;
    const titleX = (pageWidth - titleWidth) / 2;
    pdf.text(title, titleX, yPos);
    yPos += 10;

    // Add period
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const period = monthFilter === 'All Months' ? `Year ${yearFilter}` : `${monthFilter} ${yearFilter}`;
    pdf.text(`Period: ${period}`, margin, yPos);
    yPos += 8;

    // Add generation date
    const generatedDate = `Generated: ${new Date().toLocaleString()}`;
    pdf.text(generatedDate, margin, yPos);
    yPos += 15;

    // Add sections with proper formatting
    const sections = reportText.split('\n\n');
    sections.forEach(section => {
      if (section.includes('=')) return; // Skip separator lines

      // Check if we need a new page
      if (yPos > pdf.internal.pageSize.height - margin) {
        pdf.addPage();
        yPos = margin;
      }

      // Handle section titles
      if (section.toUpperCase() === section && section.trim().length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(section.trim(), margin, yPos);
        yPos += 8;
        // Add underline
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos - 2, margin + contentWidth / 2, yPos - 2);
        yPos += 5;
      } else {
        // Handle regular content
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(section, contentWidth);
        lines.forEach(line => {
          // Check for bullet points
          if (line.startsWith('•')) {
            pdf.text('•', margin, yPos);
            pdf.text(line.substring(1).trim(), margin + 5, yPos);
          } else if (line.startsWith('  -')) {
            pdf.text('-', margin + 5, yPos);
            pdf.text(line.substring(3).trim(), margin + 10, yPos);
          } else {
            pdf.text(line, margin, yPos);
          }
          yPos += 5;
        });
        yPos += 3;
      }
    });

    return pdf;
  };

  // Function to handle report generation and display
  const handleGenerateReport = () => {
    console.log('Generate Report clicked');
    const report = generateAnalysisReport();
    console.log('Report generated:', !!report);
    if (!report) return;

    // Set the report content and show modal
    setReportContent(report);
    setShowReportModal(true);
    console.log('Modal should be visible now');
  };

  // Function to download as PDF
  const handleDownloadPDF = () => {
    if (!reportContent) return;
    const pdf = generatePDF(reportContent.analysis);
    pdf.save(`Inventory_Turnover_Report_${yearFilter}_${monthFilter.replace(' ', '_')}.pdf`);
  };

  // Function to download as Text
  const handleDownloadText = () => {
    if (!reportContent) return;
    const blob = new Blob([reportContent.analysis], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventory_Turnover_Report_${yearFilter}_${monthFilter.replace(' ', '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Convert month name to number, null if "All Months" is selected
        let monthNumber = null;
        if (monthFilter !== 'All Months') {
          // Find the actual month number (1-12)
          const monthIndex = months.indexOf(monthFilter);
          if (monthIndex > 0) { // Skip 'All Months' at index 0
            monthNumber = (monthIndex).toString().padStart(2, '0');
          }
        }
        
        console.log('Fetching turnover data:', { yearFilter, monthFilter, monthNumber });
        
        const result = await ReportingService.getInventoryTurnover(
          yearFilter,
          monthNumber
        );
        
        console.log('Received turnover data:', result);
        setData(result);
      } catch (err) {
        console.error('Error fetching turnover data:', err);
        setError('Failed to load report data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [yearFilter, monthFilter]);

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
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center gap-2">
          Back to Reports
        </button>
      </div>

      {/* Filter Section */}
      <div className="flex flex-wrap gap-3 justify-end mb-6">
        <div className="relative inline-block">
          <select
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <div className="relative inline-block">
          <select
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
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

      {/* Action Buttons */}
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

      {/* Monthly Data Table with Info Button */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-gray-800 font-semibold">Monthly Performance</h3>
          <button
            onClick={() => setActiveInfoModal('monthlyTable')}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="About the monthly breakdown"
          >
            <FiInfo className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Inventory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turn over Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.monthlyData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.month}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                    ₱{item.sales}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                    ₱{item.avgInventory}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                    {item.turnoverRate}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Modal */}
      <InfoModal
        isOpen={!!activeInfoModal}
        onClose={() => setActiveInfoModal(null)}
        title={activeInfoModal ? chartInfo[activeInfoModal].title : ''}
        content={activeInfoModal ? chartInfo[activeInfoModal].content : ''}
      />

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Inventory Turnover Analysis</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Period: {reportContent.period} • Generated: {reportContent.generatedAt}
                </p>
              </div>
              <button 
                onClick={() => setShowReportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Key Metrics Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gray-50 border-b">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 font-medium mb-1">TURNOVER RATE</div>
                  <div className="text-2xl font-bold text-gray-900">{reportContent.metrics.turnoverRate}x</div>
                  <div className={`text-sm font-medium mt-1 ${reportContent.metrics.performanceColor}`}>
                    {reportContent.metrics.performanceLevel}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 font-medium mb-1">TOTAL SALES</div>
                  <div className="text-2xl font-bold text-gray-900">₱{reportContent.metrics.totalSales}</div>
                  <div className="text-sm text-gray-500 mt-1">Period Total</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 font-medium mb-1">AVERAGE INVENTORY</div>
                  <div className="text-2xl font-bold text-gray-900">₱{reportContent.metrics.averageInventory}</div>
                  <div className="text-sm text-gray-500 mt-1">Period Average</div>
                </div>
              </div>

              {/* Analysis Section */}
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Performance Analysis</h4>
                <div className="bg-white border border-gray-200 rounded-lg p-5 text-gray-600 leading-relaxed">
                  {reportContent.analysis}
                </div>
              </div>

              {/* Monthly Breakdown Section */}
              {reportContent.monthlyData && (
                <div className="px-6 pb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Monthly Performance Breakdown</h4>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnover Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Inventory</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportContent.monthlyData.map((month, index) => {
                          const monthlyPerformance = getPerformanceLevel(parseFloat(month.turnoverRate));
                          const monthlyColor = {
                            'EXCELLENT': 'text-green-600',
                            'GOOD': 'text-blue-600',
                            'MODERATE': 'text-yellow-600',
                            'NEEDS IMPROVEMENT': 'text-red-600'
                          }[monthlyPerformance];
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {month.month}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {month.turnoverRate}x
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                ₱{month.sales}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                ₱{month.avgInventory}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <span className={monthlyColor}>{monthlyPerformance}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t p-6 bg-gray-50">
              <div className="flex justify-end gap-4">
                <button
                  onClick={handleDownloadPDF}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <AiOutlineFilePdf size={20} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handleDownloadText}
                  className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium"
                >
                  <FiFileText size={20} />
                  <span>Download Text</span>
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