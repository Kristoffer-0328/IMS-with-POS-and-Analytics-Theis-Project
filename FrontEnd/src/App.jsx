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
import Logout from './admin_interface/Logout';

// Admin Interface
import Dashboard from './admin_interface/Dashboard';
import Products from './admin_interface/Products';
import ProductsStock from './admin_interface/ProductsStock';
import CreateOrder from './admin_interface/CreateOrder';
import Invoice from './admin_interface/Invoice';
import Team from './admin_interface/Team';
import AdminSidebar from './admin_interface/AdminSidebar';

// IM Interface
import IMDashboard from './im_interface/pages/IMDashboard';
import Inventory from './im_interface/pages/Inventory';
import StockTransfer from './im_interface/pages/StockTransfer';
import RestockingRequest from './im_interface/pages/RestockingRequest';
import ReportsAndLogs from './im_interface/pages/ReportsAndLogs';
import Settings from './im_interface/pages/Settings';
import IMSidebar from './im_interface/pages/IMSidebar';
import LoadingScreen from './im_interface/components/LoadingScreen';

// Layouts
const AdminLayout = ({ children }) => (
  <div className="flex min-h-screen w-full bg-gray-50">
    <AdminSidebar />
    <main id="content" className="flex-1 transition-all duration-300 ml-[250px]">
      <div className="p-6">{children}</div>
    </main>
  </div>
);

const IMLayout = ({ children }) => (
  <div className="flex min-h-screen w-full bg-gray-50">
    <IMSidebar />
    <main id="content" className="flex-1 transition-all duration-300 ml-[250px]">
      <div className="p-6">{children}</div>
    </main>
  </div>
);

// Access Control Wrapper
const ProtectedRoute = ({ allowedRole, layout: Layout, children }) => {
  const { currentUser, loading } = useAuth();
  // if (!currentUser || currentUser.role !== allowedRole) return <Navigate to="/unauthorized" />;
 
 if(loading) return <LoadingScreen/>;
 return <Layout>{children}</Layout>;  

  
};

// Unauthorized page
const UnauthorizedAccess = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
        </p>
        <a
          href="/login"
          className="text-blue-600 hover:text-blue-800">
          Return to Login
        </a>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/loading" element={<LoadingScreen />}/>
      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <Products />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products-stock"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <ProductsStock />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/create-order"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <CreateOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/invoice"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <Invoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/team"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <Team />
          </ProtectedRoute>
        }
      />

      {/* Inventory Manager */}
      <Route
        path="/im"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <ServicesProvider>
              <IMDashboard />
            </ServicesProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/inventory"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <ServicesProvider>
              <Inventory />
            </ServicesProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/stock-transfer"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <ServicesProvider>
              <StockTransfer />
            </ServicesProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/restocking-request"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <ServicesProvider>
              <RestockingRequest />
            </ServicesProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/invoice"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <Invoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/team"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <Team />
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/reports"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <ReportsAndLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/settings"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Errors */}
      <Route path="/unauthorized" element={<UnauthorizedAccess />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <AuthProvider>
    <Router>
      <AppRoutes />
    </Router>
  </AuthProvider>
);

export default App;
