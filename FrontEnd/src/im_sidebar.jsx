import React from "react";
import { Link } from "react-router-dom";
import "./style.css";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>Glory Star</h2>
      <ul>
        <li><Link to="/im_dashboard">Dashboard</Link></li>
        <li><Link to="/inventory">Invetory</Link></li>
        <li><Link to="/stock_transfer">Stock Transfer </Link></li>
        <li><Link to="/reports_&_logs">Report & Logs</Link></li>
        <li><Link to="/settings">Settings</Link></li>
        <li><Link to="/logout">Logout</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;
