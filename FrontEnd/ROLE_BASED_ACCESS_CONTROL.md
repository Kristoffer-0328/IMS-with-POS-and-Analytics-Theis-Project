# Role-Based Access Control (RBAC) Implementation

## Overview
This document outlines the role-based access control implementation for the inventory management system. The system now supports two primary roles with different permission levels:

- **Admin**: Full control over inventory (CRUD + Status management)
- **Inventory Manager**: Limited control (Create, Read, Update only)

---

## Implementation Summary

### 1. Admin Stock Management Page
**File**: `src/features/admin/pages/AdminStockManagement.jsx`

A new page has been created for administrators to access the full inventory management interface with elevated privileges.

**Features**:
- Full CRUD operations on products
- Ability to delete products (single and bulk)
- Ability to change product status (Active/Inactive)
- Uses the same `Inventory` component with role-based props

**Route**: `/admin/stock-management`

---

### 2. Admin Sidebar Update
**File**: `src/features/admin/pages/AdminSidebar.jsx`

Added "Stock Management" navigation item to the admin sidebar under the Inventory section.

**Changes**:
- Added new menu item with route `/admin/stock-management`
- Uses `FiPackage` icon
- Positioned between "Admin Dashboard" and "Purchase Orders"

---

### 3. App Routing Configuration
**File**: `src/App.jsx`

**Changes**:
- Imported `AdminStockManagement` component
- Added protected route for `/admin/stock-management`
- Route is restricted to Admin role only

```jsx
<Route
  path="/admin/stock-management"
  element={
    <ProtectedRoute allowedRole="Admin" layout={AdminLayout}>
      <AdminStockManagement />
    </ProtectedRoute>
  }
/>
```

---

### 4. Inventory Component Updates
**File**: `src/features/inventory/pages/Inventory.jsx`

**New Props**:
- `userRole`: Determines the current user's role (defaults to context)
- `canDelete`: Boolean permission for delete operations
- `canChangeStatus`: Boolean permission for status changes
- `canAddProduct`: Boolean permission for adding products (both roles)
- `canUpdateProduct`: Boolean permission for updating products (both roles)

**Changes**:
1. **Auth Context Integration**:
   ```jsx
   const { currentUser } = useAuth();
   const userRole = propUserRole || currentUser?.role || 'InventoryManager';
   ```

2. **Permission Definitions**:
   ```jsx
   const canDelete = userRole === 'Admin';
   const canChangeStatus = userRole === 'Admin';
   const canAddProduct = true; // Both roles
   const canUpdateProduct = true; // Both roles
   ```

3. **Bulk Delete Button**: Now conditionally rendered based on `canDelete` permission
   - Shows delete button for Admin
   - Shows informational message for Inventory Manager

4. **Props Passed to ViewProductModal**:
   ```jsx
   <ViewProductModal 
     // ... existing props
     userRole={userRole}
     canDelete={canDelete}
     canChangeStatus={canChangeStatus}
   />
   ```

---

### 5. ViewProductModal Component Updates
**File**: `src/features/inventory/components/Inventory/ViewProductModal.jsx`

**New Props**:
- `userRole`: Current user's role
- `canDelete`: Permission to delete products
- `canChangeStatus`: Permission to change product status

**Changes**:

1. **Component Signature**:
   ```jsx
   const ViewProductModal = ({ 
     isOpen, 
     onClose, 
     product, 
     onProductUpdate, 
     initialTab = 'overview',
     userRole = 'InventoryManager',
     canDelete = false,
     canChangeStatus = false
   }) => {
   ```

2. **Active/Inactive Toggle**: Only visible for Admin
   ```jsx
   {canChangeStatus && (
     <div className="flex items-center gap-2">
       {/* Toggle switch UI */}
     </div>
   )}
   ```

3. **Delete Button**: Only visible for Admin
   ```jsx
   {canDelete && !isEditMode && (
     <button onClick={() => setShowDeleteModal(true)}>
       Delete
     </button>
   )}
   ```

4. **Permission Notice**: Shown to Inventory Managers
   - Displayed at the top of the Overview tab
   - Explains their limited permissions
   - Blue informational banner style

---

## Permission Matrix

| Feature | Admin | Inventory Manager |
|---------|-------|-------------------|
| View Products | ✅ | ✅ |
| Add Products | ✅ | ✅ |
| Update Product Info | ✅ | ✅ |
| Upload Product Images | ✅ | ✅ |
| Delete Products (Single) | ✅ | ❌ |
| Delete Products (Bulk) | ✅ | ❌ |
| Change Product Status | ✅ | ❌ |
| View Variants | ✅ | ✅ |
| Add Variants | ✅ | ✅ |
| Edit Variants | ✅ | ✅ |
| Manage Suppliers | ✅ | ✅ |
| Stock Transfer | ✅ | ✅ |
| Receiving Management | ✅ | ✅ |
| Restocking Requests | ✅ | ✅ |

---

## User Experience

### For Admin Users:
1. Can access Stock Management via Admin sidebar
2. See all inventory controls including delete buttons
3. Can toggle product Active/Inactive status
4. Can perform bulk delete operations
5. Full unrestricted access to all features

### For Inventory Manager Users:
1. Access inventory via Inventory Manager sidebar
2. Cannot see delete buttons (single or bulk)
3. Cannot change product Active/Inactive status
4. See informational notice about limited permissions
5. Can still add, edit, and manage inventory effectively

---

## UI Indicators

### Permission Notices:
- **Location**: Top of ViewProductModal Overview tab
- **Color**: Blue informational banner
- **Display**: Only shown to Inventory Managers
- **Content**: Explains what they can and cannot do

### Bulk Selection Bar:
- **Admin**: Shows "Delete Selected" button
- **Inventory Manager**: Shows message "Only administrators can delete products"

### Modal Header:
- **Admin**: Shows Active/Inactive toggle and Delete button
- **Inventory Manager**: Both controls are hidden

---

## Technical Implementation Details

### Permission Checking Flow:

1. **Route Level** (`App.jsx`):
   - `ProtectedRoute` component checks user role
   - Redirects unauthorized users

2. **Component Level** (`Inventory.jsx`):
   - Derives role from `useAuth()` context or props
   - Calculates permission booleans
   - Passes permissions to child components

3. **UI Level** (`ViewProductModal.jsx`):
   - Conditionally renders controls based on permissions
   - Shows/hides features dynamically
   - Displays informational messages

### Authentication Flow:
```
User Login → FirebaseAuth Context → currentUser.role
                                          ↓
                          ProtectedRoute validates role
                                          ↓
                            Component receives role
                                          ↓
                          Permissions calculated
                                          ↓
                            UI rendered accordingly
```

---

## Testing Checklist

### Admin Role Testing:
- [ ] Can access `/admin/stock-management`
- [ ] Can see "Stock Management" in admin sidebar
- [ ] Can delete individual products
- [ ] Can bulk delete products
- [ ] Can toggle product Active/Inactive status
- [ ] Does NOT see permission warnings

### Inventory Manager Role Testing:
- [ ] Can access `/im/inventory`
- [ ] Can add new products
- [ ] Can edit existing products
- [ ] Cannot see delete buttons
- [ ] Cannot toggle Active/Inactive status
- [ ] Sees permission warning in ViewProductModal
- [ ] Cannot access `/admin/stock-management` (redirected)

### Shared Features Testing:
- [ ] Both roles can add products
- [ ] Both roles can edit product information
- [ ] Both roles can upload images
- [ ] Both roles can manage variants
- [ ] Both roles can view all product details

---

## Security Considerations

1. **Frontend Protection**: UI elements are hidden based on role
2. **Route Protection**: Routes are guarded by role-based authentication
3. **Backend Validation**: ⚠️ **Important**: Backend Firebase security rules should also enforce these permissions
4. **Context-based Auth**: Uses React Context for centralized authentication state

### Recommended Backend Rules:
```javascript
// Firestore Security Rules (to be implemented)
match /Master/{productId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null && 
    (request.auth.token.role == 'Admin' || request.auth.token.role == 'InventoryManager');
  allow delete: if request.auth != null && request.auth.token.role == 'Admin';
}

match /Variants/{variantId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null && 
    (request.auth.token.role == 'Admin' || request.auth.token.role == 'InventoryManager');
  allow delete: if request.auth != null && request.auth.token.role == 'Admin';
}
```

---

## Future Enhancements

1. **Granular Permissions**: Add more specific permissions (e.g., can_edit_price, can_manage_suppliers)
2. **Audit Logging**: Log all delete and status change operations
3. **Approval Workflow**: Inventory Managers request deletion → Admin approves
4. **Custom Roles**: Allow creating custom roles with specific permission sets
5. **Permission Override**: Temporary permission elevation with approval
6. **Role Hierarchy**: Define role inheritance (e.g., Admin inherits all InventoryManager permissions)

---

## Troubleshooting

### Issue: Admin cannot see delete buttons
**Solution**: Check that the `userRole` prop is correctly set to "Admin"

### Issue: Inventory Manager sees admin controls
**Solution**: Verify authentication context is properly providing role information

### Issue: Route redirects unexpectedly
**Solution**: Check `ProtectedRoute` component and ensure role matches exactly ("Admin" not "admin")

### Issue: Permission notice not showing
**Solution**: Ensure `canDelete` is false for Inventory Manager role

---

## Code References

### Key Files Modified:
1. `src/features/admin/pages/AdminStockManagement.jsx` (New)
2. `src/features/admin/pages/AdminSidebar.jsx`
3. `src/App.jsx`
4. `src/features/inventory/pages/Inventory.jsx`
5. `src/features/inventory/components/Inventory/ViewProductModal.jsx`

### Key Components:
- `ProtectedRoute`: Route-level access control
- `useAuth`: Authentication context hook
- `AuthProvider`: Firebase authentication wrapper

### Key Props:
- `userRole`: String - "Admin" or "InventoryManager"
- `canDelete`: Boolean - Permission to delete
- `canChangeStatus`: Boolean - Permission to change status

---

## Conclusion

The role-based access control implementation provides a clear separation of permissions between Admin and Inventory Manager roles while maintaining a consistent user experience. The system is designed to be secure, maintainable, and extensible for future enhancements.

**Summary of Access Control**:
- ✅ **Inventory Manager**: Can add, view, and update products
- ❌ **Inventory Manager**: Cannot delete or change product status
- ✅ **Admin**: Full control over all inventory operations

This implementation follows the principle of least privilege while enabling both roles to perform their essential duties effectively.
