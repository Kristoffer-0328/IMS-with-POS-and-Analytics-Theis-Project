import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import CreateOrder from "./pages/CreateOrder";
import ProductsStock from "./pages/ProductsStock";
import Invoice from "./pages/Invoice";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Logout from "./pages/Logout";
import Sidebar from "./Sidebar"; 
import "./App.css"; // ✅ Add CSS file for layout fixes

const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  return isAuthenticated ? children : <Navigate to="/" />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <div className="layout">  {/* ✅ Fix layout */}
                <Sidebar />
                <div className="content">  
                  <Dashboard />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/products"
          element={
            <PrivateRoute>
              <div className="layout">
                <Sidebar />
                <div className="content">
                  <Products />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/create_order"
          element={
            <PrivateRoute>
              <div className="layout">
                <Sidebar />
                <div className="content">
                  <CreateOrder />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/products_stock"
          element={
            <PrivateRoute>
              <div className="layout">
                <Sidebar />
                <div className="content">
                  <ProductsStock />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/invoice"
          element={
            <PrivateRoute>
              <div className="layout">
                <Sidebar />
                <div className="content">
                  <Invoice />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/team"
          element={
            <PrivateRoute>
              <div className="layout">
                <Sidebar />
                <div className="content">
                  <Team />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <div className="layout">
                <Sidebar />
                <div className="content">
                  <Settings />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route path="/logout" element={<Logout />} />
      </Routes>
    </Router>
  );
};

export default App;
