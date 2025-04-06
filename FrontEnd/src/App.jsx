import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import StockTransfer from './pages/StockTransfer';
import RequestRestocking from './pages/RestockingRequest';
import ReportsAndLogs from './pages/ReportsAndLogs';
import Settings from './pages/Settings';
import Logout from './pages/Logout';
import Sidebar from './Sidebar';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated');
  return isAuthenticated ? children : <Navigate to="/" />;
};

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <Sidebar />
      <main
        id="content"
        className="flex-1 transition-all duration-300 ml-[250px]">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Inventory */}
        <Route
          path="/inventory"
          element={
            <PrivateRoute>
              <Layout>
                <Inventory />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Stock Transfer */}
        <Route
          path="/stock_transfer"
          element={
            <PrivateRoute>
              <Layout>
                <StockTransfer />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Restocking Request */}
        <Route
          path="/restocking"
          element={
            <PrivateRoute>
              <Layout>
                <RequestRestocking />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Reports and Logs */}
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Layout>
                <ReportsAndLogs />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Layout>
                <Settings />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Logout */}
        <Route path="/logout" element={<Logout />} />
      </Routes>
    </Router>
  );
};

export default App;
