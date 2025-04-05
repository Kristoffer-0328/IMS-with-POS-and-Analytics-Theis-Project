import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./css/Dashboard.css";

const chartData = [
  { name: "5k", value: 20 },
  { name: "10k", value: 40 },
  { name: "15k", value: 45 },
  { name: "20k", value: 100 },
  { name: "25k", value: 60 },
  { name: "30k", value: 50 },
  { name: "35k", value: 20 },
  { name: "40k", value: 70 },
  { name: "45k", value: 65 },
  { name: "50k", value: 60 },
  { name: "55k", value: 58 },
  { name: "60k", value: 62 }
];

const Dashboard = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/Users")
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched Data:", data);
        setUsers(data);
      })
      .catch((error) => console.error("Error fetching users:", error));
  }, []);

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>

      {/* User Data Display */}
      {/* <div className="user-list">
        <h2>Registered Users</h2>
        {users.length > 0 ? (
          users.map((user, index) => (
            <p key={index}>Username: {user.Username}</p>
          ))
        ) : (
          <p>Loading users...</p>
        )}
      </div> */}
      <div class="card-container">
        <div class="card">
          <p class="card-title">Total Order</p>
          <h2 class="card-value">10,293</h2>
          <p class="card-trend up">+1.3% Up from past week</p>
        </div>
        <div class="card">
          <p class="card-title">Total Sales</p>
          <h2 class="card-value">$89,000</h2>
          <p class="card-trend down">-4.3% Down from yesterday</p>
        </div>
        <div class="card">
          <p class="card-title">Total Pending</p>
          <h2 class="card-value">2,040</h2>
          <p class="card-trend up">+1.8% Up from yesterday</p>
        </div>
      </div>
      {/* Sales Chart */}
      <div className="sales-chart">
        <h2>Sales Details</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#0056b3" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Order List */}
      <div className="order-list">
        <h2>Order List</h2>
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Location</th>
              <th>Date - Time</th>
              <th>Piece</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nicole Castellano</td>
              <td>6096 Marjolaine Landing</td>
              <td>12.09.2019 - 12:53 PM</td>
              <td>423</td>
              <td>$34,295</td>
              <td className="status delivered">Delivered</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
