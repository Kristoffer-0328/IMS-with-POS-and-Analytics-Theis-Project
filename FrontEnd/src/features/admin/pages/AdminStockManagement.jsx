import React from 'react';
import Inventory from '../../inventory/pages/Inventory';

/**
 * Admin Stock Management Page
 * 
 * This page provides Admin users with full CRUD access to the inventory system.
 * It wraps the Inventory component and passes a userRole prop to enable role-based features.
 * 
 * Admin Permissions:
 * - Full CRUD: Create, Read, Update, Delete products
 * - Change product status (Active/Inactive)
 * - Bulk delete products
 * - All features available to Inventory Managers
 */
const AdminStockManagement = () => {
  return (
    <div>
      <div className="mb-6">
       
      </div>
      
      {/* Pass userRole='Admin' to enable admin-only features */}
      <Inventory userRole="Admin" />
    </div>
  );
};

export default AdminStockManagement;
