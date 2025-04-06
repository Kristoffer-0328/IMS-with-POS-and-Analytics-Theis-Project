import React from 'react';

const ReportCard = ({ title, description, icon, onClick }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <p className="text-gray-600 text-sm mt-1">{description}</p>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg">{icon}</div>
        </div>
        <div className="mt-auto pt-4">
          <button
            onClick={onClick}
            className="w-full py-2.5 rounded-md bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 transition-colors">
            View Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
