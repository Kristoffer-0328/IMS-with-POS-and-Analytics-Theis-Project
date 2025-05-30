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
  ReferenceLine,
} from 'recharts';

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

const InventoryChart = ({ data }) => {
  const lowStockThreshold = 60;

  return (
    <div className="w-full h-[280px] grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 relative">
      {/* Chart Background */}
      <div className="absolute inset-0 rounded-xl grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 overflow-hidden">
        <div className="absolute inset-0 bg-[#FFEFD7] grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 opacity-50"></div>
        <div className="absolute inset-y-0 left-1/4 w-1/2 bg-gradient-to-br from-amber-100/80 to-orange-50/40 transform rotate-12 translate-y-10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-1/3 h-2/3 bg-amber-100/40 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-amber-100/30  grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4rounded-full blur-xl"></div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 25, right: 20, left: 0, bottom: 30 }}
          barSize={18}
          className="z-10 relative">
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#F1F1F1"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#666', fontSize: 10 }}
            dy={10}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 11 }}
            dx={-5}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
          />
          {/* Low stock reference line */}
          <ReferenceLine
            y={lowStockThreshold}
            stroke="#FF4C76"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-in-out">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                className="hover:opacity-80 transition-opacity"
              />
            ))}
            {data.map((entry, index) => {
              // Only add labels to bars that need attention (low stock, critical)
              if (entry.value <= lowStockThreshold) {
                return (
                  <text
                    key={`label-${index}`}
                    x={0}
                    y={0}
                    dy={-6}
                    dx={0}
                    fill="#FF4C76"
                    fontSize={10}
                    textAnchor="middle"
                    dominantBaseline="middle">
                    {entry.value}
                  </text>
                );
              }
              return null;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryChart;
