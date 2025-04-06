import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FiBox, FiTrendingDown, FiTrendingUp } from 'react-icons/fi';
import './css/Dashboard.css';

const chartData = [
  { name: 'Jan', current: 65, previous: 45 },
  { name: 'Feb', current: 50, previous: 35 },
  { name: 'Mar', current: 75, previous: 55 },
  { name: 'Apr', current: 85, previous: 65 },
  { name: 'May', current: 60, previous: 45 },
  { name: 'Jun', current: 95, previous: 75 },
  { name: 'Jul', current: 70, previous: 55 },
  { name: 'Aug', current: 80, previous: 65 },
];

const Dashboard = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/Users')
      .then((response) => response.json())
      .then((data) => {
        console.log('Fetched Data:', data);
        setUsers(data);
      })
      .catch((error) => console.error('Error fetching users:', error));
  }, []);

  const stockMovements = [
    {
      productName: 'Hammer',
      from: 'Receiving',
      to: 'STR A1',
      quantity: '50 pcs',
      date: '12.09.24',
      status: 'Completed',
    },
    {
      productName: 'Nails',
      from: 'STR A2',
      to: 'STR B1',
      quantity: '30 pcs',
      date: '12.09.24',
      status: 'Pending',
    },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Low Stock Items */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Low - Stock Items</p>
              <h3 className="text-2xl font-bold mb-2">8 Items</h3>
              <div className="flex items-center text-red-500 text-sm">
                <span className="flex items-center">
                  <span className="mr-1">Critical Stock</span>
                </span>
              </div>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <FiBox className="text-amber-600 text-xl" />
            </div>
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Sales</p>
              <h3 className="text-2xl font-bold mb-2">$89,000</h3>
              <div className="flex items-center text-red-500 text-sm">
                <FiTrendingDown className="mr-1" />
                <span>4.3% Down from yesterday</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <div className="text-green-600 text-xl">📈</div>
            </div>
          </div>
        </div>

        {/* Restocking Requests */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Restocking Requests</p>
              <h3 className="text-2xl font-bold mb-2">15 Requests</h3>
              <div className="flex items-center text-green-500 text-sm">
                <FiTrendingUp className="mr-1" />
                <span>+2 From Yesterday</span>
              </div>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <div className="text-red-600 text-xl">⏰</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Sales Overview</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="previous" fill="#FFE7BA" radius={[4, 4, 0, 0]} />
              <Bar dataKey="current" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stock Movement Log */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Stock Movement Log</h2>
          <select className="px-4 py-2 border rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>October</option>
            <option>November</option>
            <option>December</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-4">Product Name</th>
                <th className="pb-4">From</th>
                <th className="pb-4">To</th>
                <th className="pb-4">Quantity</th>
                <th className="pb-4">Date</th>
                <th className="pb-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {stockMovements.map((item, index) => (
                <tr key={index} className="border-t">
                  <td className="py-4">{item.productName}</td>
                  <td className="py-4">{item.from}</td>
                  <td className="py-4">{item.to}</td>
                  <td className="py-4">{item.quantity}</td>
                  <td className="py-4">{item.date}</td>
                  <td className="py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Completed'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
