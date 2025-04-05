import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./css/im_dashboard.css";
const Dashboard = () => {
  return (

    <div class="main-content">
        <h1>Welcome to the Admin Dashboard</h1>

        <div class="card-container">
            <div class="card">
                <h3>Total Users</h3>
                <p>120</p>
            </div>
            <div class="card">
                <h3>Inventory Items</h3>
                <p>450</p>
            </div>
            <div class="card">
                <h3>Pending Orders</h3>
                <p>35</p>
            </div>
            <div class="card">
                <h3>Revenue</h3>
                <p>$12,000</p>
            </div>
        </div>

        <div class="chart-container">
            <h2>Monthly Sales Overview</h2>
            <canvas id="salesChart" width="600" height="300"></canvas>
        </div>

        <div class="table-container">
            <h2>Recent Inventory Activity</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>2025-04-01</td>
                        <td>Hammer</td>
                        <td>10</td>
                        <td>Added</td>
                    </tr>
                    <tr>
                        <td>2025-04-02</td>
                        <td>Nails</td>
                        <td>100</td>
                        <td>Removed</td>
                    </tr>
                    <tr>
                        <td>2025-04-03</td>
                        <td>Paint</td>
                        <td>5</td>
                        <td>Added</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default Dashboard;
