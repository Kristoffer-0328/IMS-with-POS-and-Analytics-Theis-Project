import React, { useState } from 'react';
import { FiActivity, FiBarChart, FiFileText } from 'react-icons/fi';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';
import InventoryTurnoverReport from '../../inventory/components/Reports/InventoryTurnOverReport';
import StockMovementReport from '../../inventory/components/Reports/StockMovementReport';
import ShrinkageReport from '../../inventory/components/Reports/ShrinkageReport';
import TestDataGenerator from '../../inventory/components/Reports/TestDataGenerator';
import Audit_trail from './Audit_trail';
import System_log from './System_log';
const ReportsAndLogs = () => {
  const [activeTab, setActiveTab] = useState('inventory-turnover');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState(
    new Date().toLocaleString('default', { month: 'long' })
  );

  // Tabs configuration
  const tabs = [
    {
      id: 'inventory-turnover',
      label: 'Inventory Turnover',
      icon: <FiActivity size={20} />,
    },
    {
      id: 'stock-movement',
      label: 'Stock Movement',
      icon: <FiBarChart size={20} />,
    },
    {
      id: 'audit-trails',
      label: 'Audit Trails',
      icon: <FiFileText size={20} />,
    },  
    {
      id: 'system-logs',
      label: 'System Logs',
      icon: <FiFileText size={20} />,
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

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'inventory-turnover':
        return (
          <InventoryTurnoverReport
            data={turnoverData}
            yearFilter={yearFilter}
            monthFilter={monthFilter}
            setYearFilter={setYearFilter}
            setMonthFilter={setMonthFilter}
            onBack={() => {}} // No back button needed in tab view
          />
        );
      case 'stock-movement':
        return <StockMovementReport onBack={() => {}} />;
      case 'audit-trails':
        return <Audit_trail onBack={() => {}} />;
      case 'system-logs':
        return <System_log onBack={() => {}} />;
      default:
        return null;
    }
  };

  return (
    <div className="">

     
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600 bg-orange-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {renderTabContent()}
        </div>


    </div>
  );
};

export default ReportsAndLogs;
