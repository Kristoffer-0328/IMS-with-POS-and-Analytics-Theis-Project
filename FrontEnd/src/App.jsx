import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import CreateOrder from "./pages/CreateOrder.jsx";
import ProductsStock from "./pages/ProductsStock.jsx";
import Invoice from "./pages/Invoice.jsx";
import Team from "./pages/Team.jsx";
import Settings from "./pages/Settings.jsx";
import Logout from "./pages/Logout.jsx";

const App = () => {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/create_order" element={<CreateOrder />} />
            <Route path="/products_stock" element={<ProductsStock />} />
            <Route path="/invoice" element={<Invoice />} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/logout" element={<Logout />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
