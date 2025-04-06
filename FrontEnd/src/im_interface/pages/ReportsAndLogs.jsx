import React, { useState } from 'react';
import { FiActivity, FiBarChart, FiFileText } from 'react-icons/fi';

import ReportCard from '../components/Reports/ReportCard';
import ReportHeader from '../components/Reports/ReportHeader';
import InventoryTurnoverReport from '../components/Reports/InventoryTurnOverReport';
import StockMovementReport from '../components/Reports/StockMovementReport';
import ShrinkageReport from '../components/Reports/ShrinkageReport';

const ReportsAndLogs = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [yearFilter, setYearFilter] = useState('This year');
  const [monthFilter, setMonthFilter] = useState('October');

  // Report data
  const reports = [
    {
      id: 'inventory-turnover',
      title: 'Inventory Turnover Report',
      description: 'View the turnover rate of your inventory',
      icon: <FiActivity size={24} className="text-green-500" />,
    },
    {
      id: 'stock-movement',
      title: 'Stock Movement History',
      description: 'Track past movements of stocks',
      icon: <FiBarChart size={24} className="text-blue-500" />,
    },
    {
      id: 'shrinkage',
      title: 'Shrinkage & Adjustment Report',
      description: 'Analyze Inventory Shrinkage and adjustments',
      icon: <FiFileText size={24} className="text-indigo-500" />,
    },
  ];

  // Inventory turnover data for demonstration
  const turnoverData = {
    averageTurnoverRate: 2.8,
    totalSales: 6580.0,
    averageInventory: 2350.0,
    chartData: [
      { name: 'Jan', value: 1.5 },
      { name: 'Feb', value: 2.2 },
      { name: 'Mar', value: 2.5 },
      { name: 'Apr', value: 4.8 },
      { name: 'May', value: 2.6 },
      { name: 'Jun', value: 2.4 },
      { name: 'Jul', value: 1.3 },
      { name: 'Aug', value: 2.2 },
      { name: 'Sep', value: 3.1 },
      { name: 'Oct', value: 2.8 },
      { name: 'Nov', value: 2.7 },
      { name: 'Dec', value: 2.9 },
    ],
    monthlyData: [
      {
        month: 'January',
        sales: '$420.00',
        avgInventory: '$2,100.00',
        turnoverRate: '0.2',
      },
      // ... rest of the monthly data
    ],
  };

  // Handle report selection
  const handleSelectReport = (reportId) => {
    setSelectedReport(reportId);
  };

  // Handle going back to the reports dashboard
  const handleBack = () => {
    setSelectedReport(null);
  };

  // Render main reports dashboard
  const renderReportsDashboard = () => {
    return (
      <div className="w-full">
        <div className="bg-gradient-to-r from-orange-100/60 to-amber-100/30 rounded-xl p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            Monthly Reports
          </h1>
          <p className="text-gray-600">
            View and generate reports for your inventory management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              title={report.title}
              description={report.description}
              icon={report.icon}
              onClick={() => handleSelectReport(report.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  // Render specific report based on selection
  const renderReport = () => {
    switch (selectedReport) {
      case 'inventory-turnover':
        return (
          <InventoryTurnoverReport
            data={turnoverData}
            yearFilter={yearFilter}
            monthFilter={monthFilter}
            setYearFilter={setYearFilter}
            setMonthFilter={setMonthFilter}
            onBack={handleBack}
          />
        );
      case 'stock-movement':
        return <StockMovementReport onBack={handleBack} />;
      case 'shrinkage':
        return <ShrinkageReport onBack={handleBack} />;
      default:
        return renderReportsDashboard();
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 bg-gray-50">
      <ReportHeader />
      {renderReport()}
    </div>
  );
};

export default ReportsAndLogs;
