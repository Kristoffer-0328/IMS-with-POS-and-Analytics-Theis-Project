import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth, AuthProvider } from './FirebaseBackEndQuerry/FirebaseAuth';
import { ServicesProvider } from './FirebaseBackEndQuerry/ProductServices';
// Auth
import Login from './pages/auth/Login';

// Admin Interface
import Dashboard from './admin_interface/Dashboard';
import Products from './admin_interface/Products';
import ProductsStock from './admin_interface/ProductsStock';
import CreateOrder from './admin_interface/CreateOrder';
import Logout from './admin_interface/Logout';
import AdminSidebar from './admin_interface/AdminSidebar';
import Invoice from './admin_interface/Invoice';
import Team from './admin_interface/Team';

// IM Interface
import IMDashboard from './im_interface/pages/IMDashboard';
import Inventory from './im_interface/pages/Inventory';
import StockTransfer from './im_interface/pages/StockTransfer';
import RestockingRequest from './im_interface/pages/RestockingRequest';
import ReportsAndLogs from './im_interface/pages/ReportsAndLogs';
import Settings from './im_interface/pages/Settings';
import IMSidebar from './im_interface/pages/IMSidebar';
import { IoMailOpen } from 'react-icons/io5';

// Admin Layout Component
const AdminLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <AdminSidebar />
      <main
        id="content"
        className="flex-1 transition-all duration-300 ml-[250px]">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

// IM Layout Component
const IMLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <IMSidebar />
      <main
        id="content"
        className="flex-1 transition-all duration-300 ml-[250px]">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

// Update PrivateRoute to use useAuth
const PrivateRoute = ({ children, allowedRoles }) => {
  const { currentUser, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (!allowedRoles.includes(currentUser?.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

// Create an unauthorized component
const UnauthorizedAccess = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
        </p>
        <a
          href={currentUser?.role === 'Admin' ? '/admin' : '/im'}
          className="text-blue-600 hover:text-blue-800">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

// Wrap the entire Router with AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/logout" element={<Logout />} />

          {/* Admin Routes */}
          <Route path="/admin">
            <Route
              index
              element={
                <PrivateRoute allowedRoles={['Admin']}>
                  <AdminLayout>
                    <Dashboard />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="products"
              element={
                <PrivateRoute allowedRoles={['Admin']}>
                  <AdminLayout>
                    <Products />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="products-stock"
              element={
                <PrivateRoute allowedRoles={['Admin']}>
                  <AdminLayout>
                    <ProductsStock />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="create-order"
              element={
                <PrivateRoute allowedRoles={['Admin']}>
                  <AdminLayout>
                    <CreateOrder />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="invoice"
              element={
                <PrivateRoute allowedRoles={['Admin']}>
                  <AdminLayout>
                    <Invoice />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="team"
              element={
                <PrivateRoute allowedRoles={['Admin']}>
                  <AdminLayout>
                    <Team />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
          </Route>

          {/* Inventory Management Routes */}
          
          <Route path="/im">
            <Route
              index
              element={
                <PrivateRoute allowedRoles={['InventoryManager']}>
                  <IMLayout>
                    <IMDashboard />
                  </IMLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="inventory"
              element={
                <PrivateRoute allowedRoles={['InventoryManager']}>
                  <IMLayout>
                    <ServicesProvider>
                      <Inventory />
                    </ServicesProvider>
                  </IMLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="stock-transfer"
              element={
                <PrivateRoute allowedRoles={['InventoryManager']}>
                  <IMLayout>
                    <StockTransfer />
                  </IMLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="restocking-request"
              element={
                <PrivateRoute allowedRoles={['InventoryManager']}>
                  <IMLayout>
                    <RestockingRequest />
                  </IMLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="invoice"
              element={
                <PrivateRoute allowedRoles={['InventoryManager']}>
                  <IMLayout>
                    <Invoice />
                  </IMLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="team"
              element={
                <PrivateRoute allowedRoles={['InventoryManager']}>
                  <IMLayout>
                    <Team />
                  </IMLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="reports"
              element={
                <PrivateRoute allowedRoles={['InventoryManager']}>
                  <IMLayout>
                    <ReportsAndLogs />
                  </IMLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="settings"
              element={
                <PrivateRoute allowedRoles={['InventoryManager']}>
                  <IMLayout>
                    <Settings />
                  </IMLayout>
                </PrivateRoute>
              }
            />
          </Route>

          {/* Error Routes */}
          <Route path="/unauthorized" element={<UnauthorizedAccess />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
