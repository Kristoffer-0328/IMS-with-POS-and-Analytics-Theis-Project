import React, { useState } from 'react';
import { FiClock, FiCheckCircle } from 'react-icons/fi';
import PendingReceipts from '../components/Receiving/PendingReceipts';

const ReceivingManagement = () => {
  const [activeTab, setActiveTab] = useState('pending');

  // Tab button component
  const TabButton = ({ id, label, icon: Icon, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center px-4 py-2 rounded-lg mr-2 ${
        activeTab === id
          ? 'bg-orange-100 text-[#ff7b54] font-medium'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="mr-2" size={18} />
      <span>{label}</span>
      {count > 0 && (
        <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
          {count}
        </span>
      )}
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'pending':
        return <PendingReceipts />;
      case 'history':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Receipt History</h2>
            <p className="text-gray-500">Receipt history will be implemented soon.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      

      {/* Tabs */}
      <div className="flex mb-6 border-b">
        <TabButton
          id="pending"
          label="Pending Receipts"
          icon={FiClock}
          count={0}
        />
        <TabButton
          id="history"
          label="Receipt History"
          icon={FiCheckCircle}
          count={0}
        />
      </div>

      {/* Content Area */}
      {renderContent()}
    </div>
  );
};

export default ReceivingManagement; 