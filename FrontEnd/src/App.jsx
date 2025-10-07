import React, { useState, useEffect } from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth, AuthProvider } from './features/auth/services/FirebaseAuth';
import { ServicesProvider } from './services/firebase/ProductServices';
import { AnalyticsService } from './services/firebase/AnalyticsService';

// Auth
import Login from './auth/Login';
import Logout from './features/auth/services/Logout';

// Admin Interface
import ProductsStock from './features/admin/pages/Products_stock';
import Audit_trail from './features/admin/pages/Audit_trail';
import SystemLogs from './features/admin/pages/System_log';
import Team from './features/admin/pages/Team';
import AdminSidebar from './features/admin/pages/AdminSidebar';
import AdminPurchaseOrders from './features/admin/pages/AdminPurchaseOrders';
import ReportsAndLogs from './features/admin/pages/ReportsAndLogs';

// IM Interface
import IMDashboard from './features/inventory/pages/IMDashboard';
import Inventory from './features/inventory/pages/Inventory';
import StockTransfer from './features/inventory/pages/StockTransfer';
import RestockingRequest from './features/inventory/pages/RestockingRequest';
import Settings from './features/inventory/pages/Settings';
import IMSidebar from './features/inventory/pages/IMSidebar';
import LoadingScreen from './features/inventory/components/LoadingScreen';
import PurchaseOrders from './features/inventory/pages/PurchaseOrders';
import ReceivingManagement from './features/inventory/pages/ReceivingManagement';
import SupplierManagement from './features/inventory/pages/SupplierManagement';
import ReceivingMobileView from './features/inventory/pages/receiving_mobile_view';
import ReleaseMobileView from './features/inventory/pages/release_mobile_view';
// POS cashier Interface

import Pos_Sidebar from './features/pos/pages/Pos_Sidebar';
import Pos_NewSale from './features/pos/pages/Pos_NewSale';
import Pos_Quotation from './features/pos/pages/Pos_Quotation';
import Pos_Settings from './features/pos/pages/Pos_Settings';
import Pos_Transaction_History from './features/pos/pages/Pos_TransactionHistory';
// Layouts
const AdminLayout = ({ children }) => (
  <div className="flex min-h-screen w-full bg-gray-50">
    <AdminSidebar />
    <main id="content" className="flex-1 transition-all duration-300 ml-[250px]">
      <div className="p-6">{children}</div>
    </main>
  </div>
);

const IMLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Debug: Log when IMLayout renders
  

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <IMSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        id="content"
        className={`flex-1 transition-all duration-300
          ${collapsed ? 'ml-0 sm:ml-[70px]' : 'ml-0 sm:ml-[250px]'}
        `}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
const pos_CashierLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <Pos_Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <main
        id="content"
        className={`flex-1 transition-all duration-300
          ${collapsed ? 'ml-0 sm:ml-[70px]' : 'ml-0 sm:ml-[250px]'}
        `}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

// Access Control Wrapper
const ProtectedRoute = ({ allowedRole, layout: Layout, children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <LoadingScreen/>;
  
  // Check if user is logged in and has the correct role
  if (!currentUser || currentUser.role !== allowedRole) {

    return <Navigate to="/unauthorized" />;
  }
  
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
      <Route path="/receiving_mobile" element={<ReceivingMobileView/>}/>
      <Route path="/release_mobile" element={<ReleaseMobileView/>}/>
      
      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <ProductsStock/>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-trail"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <Audit_trail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/system-logs"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <SystemLogs />
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
      <Route
        path="/admin/purchase-orders"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <AdminPurchaseOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <ReportsAndLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transaction-history"
        element={
          <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
            <Pos_Transaction_History />
          </ProtectedRoute>
        }
      />

      {/* Inventory Manager */}
      <Route
        path="/im"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <IMDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/inventory"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/receiving"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <ReceivingManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/purchase-orders"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <PurchaseOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/stock-transfer"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <StockTransfer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/im/restocking-request"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <RestockingRequest />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/im/suppliers"
        element={
          <ProtectedRoute allowedRole="InventoryManager" layout={IMLayout}>
            <SupplierManagement/>
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

         <Route
        path='/pos/newsale'
        element={
          <ProtectedRoute allowedRole="Cashier"layout={pos_CashierLayout}>
            <Pos_NewSale/>
          </ProtectedRoute>
        }
        />
         <Route
        path='/pos/quotation'
        element={
          <ProtectedRoute allowedRole="Cashier"layout={pos_CashierLayout}>
            <Pos_Quotation/>
          </ProtectedRoute>
        }
        />
         <Route
        path='/pos/settings'
        element={
          <ProtectedRoute allowedRole="Cashier"layout={pos_CashierLayout}>
            <Pos_Settings/>
          </ProtectedRoute>
        }
        />
      {/* Errors */}
      <Route path="/unauthorized" element={<UnauthorizedAccess />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  useEffect(() => {
    // Check and create daily analytics records when app starts
    const checkDailyAnalytics = async () => {
      try {
        await AnalyticsService.checkAndCreateDailyRecords();
      } catch (error) {
        console.error('Error checking daily analytics:', error);
      }
    };

    checkDailyAnalytics();
  }, []); // Run once when app starts

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ServicesProvider>
          <AppRoutes />
        </ServicesProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
