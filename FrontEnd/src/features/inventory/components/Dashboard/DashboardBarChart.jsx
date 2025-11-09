import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';

// Fixed-position custom tooltip above bar
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">
            {payload[0].value}
          </span>{' '}
          units
        </p>
      </div>
    );
  }
  return null;
};

const DashboardBarChart = ({ data, CustomTooltip }) => {
  // Custom legend content
  const renderLegend = () => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4779FF' }}></div>
          <span className="text-gray-700">In Stock (&gt;60)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FFC554' }}></div>
          <span className="text-gray-700">Low Stock (≤40)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FF4D4D' }}></div>
          <span className="text-gray-700">Critical (&lt;Restock Level)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative">
      {/* Background Effects - Behind the chart */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-transparent"></div>
      </div>

      {/* Chart Container - Above background */}
      <div className="relative z-10 w-full h-full flex flex-col">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
              barSize={20}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E5E7EB"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                dy={10}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                dx={-5}
                width={50}
              />
              <Tooltip
                content={CustomTooltip}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                wrapperStyle={{ zIndex: 1000 }}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="hover:opacity-90 transition-opacity cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Custom Legend */}
        {renderLegend()}
      </div>
    </div>
  );
};

export default DashboardBarChart;
