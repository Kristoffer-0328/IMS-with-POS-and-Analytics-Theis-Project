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
  return (
    <div className="w-full h-[350px] relative">
      {/* Background Effects */}
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-[#FFEFD7] opacity-50"></div>
        <div className="absolute inset-y-0 left-1/4 w-1/2 bg-gradient-to-br from-amber-100/80 to-orange-50/40 transform rotate-12 translate-y-10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-1/3 h-2/3 bg-amber-100/40 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-amber-100/30 rounded-full blur-xl"></div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 25, right: 20, left: 20, bottom: 30 }}
          barSize={18}
          className="z-10 relative"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#F1F1F1"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#666', fontSize: 11 }}
            dy={10}
            interval={0}
            angle={-25}
            textAnchor="end"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 11 }}
            dx={-5}
          />
          <Tooltip
            content={CustomTooltip}
            position={{ y: 0 }} // disable cursor following
            cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
            wrapperStyle={{ pointerEvents: 'none' }} // make sure it doesn't interfere with hover
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-in-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                className="hover:opacity-80 transition-opacity"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DashboardBarChart;
