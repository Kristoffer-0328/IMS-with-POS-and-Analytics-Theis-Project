import React from "react";
import { Link } from "react-router-dom";
import "./style.css";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>Glory Star</h2>
      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/products">Products</Link></li>
        <li><Link to="/create_order">Create Order</Link></li>
        <li><Link to="/products_stock">Products Stock</Link></li>
        <li><Link to="/invoice">Invoice</Link></li>
        <li><Link to="/team">Team</Link></li>
        <li><Link to="/settings">Settings</Link></li>
        <li><Link to="/logout">Logout</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;
