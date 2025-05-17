import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const InventoryTrendChart = ({ data }) => {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#4779FF" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryTrendChart;
