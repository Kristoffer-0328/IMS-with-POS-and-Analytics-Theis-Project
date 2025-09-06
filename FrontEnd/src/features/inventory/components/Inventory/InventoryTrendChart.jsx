import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { FiInfo } from 'react-icons/fi';
import { ReportingService } from '../../../../services/firebase/ReportingService';
import InfoModal from '../Dashboard/InfoModal';

const InventoryTrendChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await ReportingService.getInventoryTurnover(selectedYear);
      setData(result.chartData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching inventory trend data:', err);
      setError('Failed to load trend data');
      setLoading(false);
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-blue-600">
            <span className="font-semibold">{payload[0].value.toFixed(2)}x</span> turnover rate
          </p>
        </div>
      );
    }
    return null;
  };

  const chartInfo = {
    title: "Understanding Inventory Trends",
    content: (
      <div className="space-y-4">
        <p>This chart shows your inventory turnover rate trends throughout the year:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><span className="font-medium">Vertical Axis:</span> Turnover rate (times inventory is sold)</li>
          <li><span className="font-medium">Horizontal Axis:</span> Months of the year</li>
          <li><span className="font-medium">Orange Line:</span> Target turnover rate (3x)</li>
          <li><span className="font-medium">Blue Line:</span> Actual turnover rate</li>
        </ul>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-2">How to interpret:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Higher peaks indicate faster inventory movement</li>
            <li>Valleys show slower turnover periods</li>
            <li>Above orange line = excellent performance</li>
            <li>Consistent patterns may indicate seasonal trends</li>
          </ul>
        </div>
      </div>
    )
  };

  if (loading) {
    return (
      <div className="w-full h-[280px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[280px] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Inventory Turnover Trends</h3>
          <button
            onClick={() => setShowInfo(true)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Learn about inventory trends"
          >
            <FiInfo className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm text-gray-600"
        >
          {[0, 1, 2].map((offset) => {
            const year = (new Date().getFullYear() - offset).toString();
            return (
              <option key={year} value={year}>
                {year}
              </option>
            );
          })}
        </select>
      </div>

      <div className="w-full h-[280px] bg-white rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#666' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#666' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={3} stroke="#ff7b54" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#4779FF" 
              strokeWidth={2}
              dot={{ r: 4, fill: '#4779FF', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#4779FF', strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <InfoModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title={chartInfo.title}
        content={chartInfo.content}
      />
    </div>
  );
};

export default InventoryTrendChart;
