import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Dashboard from "./admin_interface/Dashboard";
import Products from "./admin_interface/Products";
import CreateOrder from "./admin_interface/CreateOrder";
import ProductsStock from "./admin_interface/ProductsStock";
import Invoice from "./admin_interface/Invoice";
import Team from "./admin_interface/Team";
import Settings from "./admin_interface/Settings";
import Logout from "./admin_interface/Logout";
import Sidebar from "./Sidebar"; 
import IMSidebar from "./im_sidebar";
import IMDashboard from "./im_interface/im_dashaboard"
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
        path="/im_dashboard"
        element={
          <PrivateRoute>
            <div className="layout">
              <IMSidebar/>
              <div className="content">
                <IMDashboard/>
              </div>
            </div>
          </PrivateRoute>
        }
        />
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
