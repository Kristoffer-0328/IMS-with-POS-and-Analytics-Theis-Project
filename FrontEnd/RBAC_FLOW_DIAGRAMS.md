# Role-Based Access Control - Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Login                          │
│                     (Firebase Auth)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─────────────────────┬─────────────────────┐
                  │                     │                     │
          ┌───────▼────────┐    ┌──────▼──────┐    ┌────────▼────────┐
          │     Admin      │    │  Inventory  │    │    Cashier      │
          │   role: Admin  │    │   Manager   │    │  role: Cashier  │
          └───────┬────────┘    └──────┬──────┘    └────────┬────────┘
                  │                     │                     │
                  │                     │                     │
    ┌─────────────▼──────────┐  ┌──────▼───────────┐  ┌─────▼──────┐
    │   Admin Dashboard      │  │  IM Dashboard    │  │  POS       │
    │  /admin                │  │  /im             │  │  /pos      │
    └─────────────┬──────────┘  └──────┬───────────┘  └────────────┘
                  │                     │
                  │                     │
    ┌─────────────▼──────────┐  ┌──────▼───────────┐
    │  Stock Management      │  │  Inventory       │
    │  /admin/stock-mgmt     │  │  /im/inventory   │
    │                        │  │                  │
    │  ✅ View Products      │  │  ✅ View Products│
    │  ✅ Add Products       │  │  ✅ Add Products │
    │  ✅ Edit Products      │  │  ✅ Edit Products│
    │  ✅ Delete Products    │  │  ❌ Delete       │
    │  ✅ Bulk Delete        │  │  ❌ Bulk Delete  │
    │  ✅ Change Status      │  │  ❌ Change Status│
    └────────────────────────┘  └──────────────────┘
```

---

## Component Hierarchy

```
┌──────────────────────────────────────────────────┐
│                    App.jsx                       │
│  - Defines routes                                │
│  - Implements ProtectedRoute                     │
└──────────────┬───────────────────────────────────┘
               │
               ├────────────────────┬───────────────┐
               │                    │               │
    ┌──────────▼─────────┐  ┌──────▼────────┐  ┌──▼─────┐
    │  AdminLayout       │  │  IMLayout     │  │  Etc.  │
    │  - AdminSidebar    │  │  - IMSidebar  │  │        │
    └──────────┬─────────┘  └──────┬────────┘  └────────┘
               │                    │
    ┌──────────▼──────────┐  ┌─────▼──────────┐
    │ AdminStockMgmt      │  │  Inventory     │
    │  (New Component)    │  │  (Modified)    │
    └──────────┬──────────┘  └─────┬──────────┘
               │                    │
               └────────┬───────────┘
                        │
              ┌─────────▼──────────┐
              │  Inventory.jsx     │
              │  Props:            │
              │  - userRole        │
              │  - canDelete       │
              │  - canChangeStatus │
              └─────────┬──────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼─────┐  ┌────▼──────┐  ┌───▼──────────┐
    │ Filters  │  │  Table    │  │ ViewProduct  │
    │          │  │  Cards    │  │    Modal     │
    └──────────┘  └───────────┘  └───┬──────────┘
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                  ┌───────▼────────┐      ┌──────▼────────┐
                  │  Delete Button │      │ Status Toggle │
                  │  (if canDelete)│      │(if canChange) │
                  └────────────────┘      └───────────────┘
```

---

## Permission Flow

```
┌──────────────────────────────────────────────────────────┐
│         Authentication (FirebaseAuth Context)            │
│  User logs in → currentUser object with role property    │
└─────────────────────────┬────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Route Protection (App.jsx)                  │
│  <ProtectedRoute allowedRole="Admin">                    │
│     Check if currentUser.role === allowedRole            │
│     If no → Redirect to /unauthorized                    │
│     If yes → Render component                            │
│  </ProtectedRoute>                                       │
└─────────────────────────┬────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│          Component Level (Inventory.jsx)                 │
│  const userRole = propUserRole || currentUser?.role      │
│  const canDelete = userRole === 'Admin'                  │
│  const canChangeStatus = userRole === 'Admin'            │
│  Pass permissions as props to child components           │
└─────────────────────────┬────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│           UI Level (ViewProductModal.jsx)                │
│  {canDelete && <DeleteButton />}                         │
│  {canChangeStatus && <StatusToggle />}                   │
│  {!canDelete && <PermissionNotice />}                    │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow for Admin

```
Admin User
    │
    ├─ Logs in (role: "Admin")
    │
    ├─ Navigates to /admin/stock-management
    │       │
    │       └─ ProtectedRoute validates ✅
    │
    ├─ AdminStockManagement renders
    │       │
    │       └─ Passes userRole="Admin" to Inventory
    │
    ├─ Inventory.jsx receives userRole
    │       │
    │       ├─ canDelete = true ✅
    │       ├─ canChangeStatus = true ✅
    │       └─ Passes to ViewProductModal
    │
    └─ ViewProductModal shows:
            ├─ Delete button ✅
            ├─ Status toggle ✅
            └─ No permission notice
```

---

## Data Flow for Inventory Manager

```
IM User
    │
    ├─ Logs in (role: "InventoryManager")
    │
    ├─ Navigates to /im/inventory
    │       │
    │       └─ ProtectedRoute validates ✅
    │
    ├─ Inventory.jsx loads
    │       │
    │       ├─ Gets userRole from useAuth()
    │       ├─ canDelete = false ❌
    │       ├─ canChangeStatus = false ❌
    │       └─ Passes to ViewProductModal
    │
    ├─ ViewProductModal shows:
    │       ├─ Delete button ❌ (hidden)
    │       ├─ Status toggle ❌ (hidden)
    │       └─ Permission notice ✅
    │
    └─ Attempts to access /admin/stock-management
            │
            └─ ProtectedRoute redirects to /unauthorized ❌
```

---

## UI State Diagram

```
┌─────────────────────────────────────────────────────────┐
│              ViewProductModal Component                 │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌───────────────┐                   ┌───────────────┐
│ canDelete =   │                   │ canDelete =   │
│    true       │                   │    false      │
│ (Admin)       │                   │ (IM)          │
└───────┬───────┘                   └───────┬───────┘
        │                                   │
        ├─ Show Delete Button               ├─ Hide Delete Button
        ├─ Show Status Toggle               ├─ Hide Status Toggle
        ├─ No Permission Notice             ├─ Show Permission Notice
        └─ Enable Bulk Delete               └─ Disable Bulk Delete
```

---

## Security Layers

```
┌──────────────────────────────────────────────────────────┐
│ Layer 1: Firebase Authentication                        │
│   - User login with email/password                       │
│   - Role stored in Firestore User document               │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 2: Route Protection (ProtectedRoute)              │
│   - Check authentication status                          │
│   - Validate user role matches allowed role              │
│   - Redirect unauthorized access                         │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 3: Component-Level Permissions                    │
│   - Calculate boolean permissions                        │
│   - Pass to child components                             │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 4: UI Conditional Rendering                       │
│   - Show/hide controls based on permissions              │
│   - Display informational messages                       │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 5: Backend Security (TO BE IMPLEMENTED)           │
│   ⚠️ REQUIRED: Firestore Security Rules                 │
│   - Validate role on database operations                 │
│   - Prevent unauthorized deletes                         │
└──────────────────────────────────────────────────────────┘
```

---

## State Management Flow

```
┌─────────────────────────────────────────────┐
│          AuthContext Provider               │
│  Wraps entire app                           │
│  Manages: currentUser, login, logout        │
└──────────────────┬──────────────────────────┘
                   │
                   ├─── Component A (useAuth)
                   │         │
                   │         └─ Gets currentUser.role
                   │
                   ├─── Component B (useAuth)
                   │         │
                   │         └─ Gets currentUser.role
                   │
                   └─── Component C (useAuth)
                             │
                             └─ Gets currentUser.role
```

---

## Permission Calculation Logic

```javascript
// In Inventory.jsx
const { currentUser } = useAuth();
const userRole = propUserRole || currentUser?.role || 'InventoryManager';

// Permission flags
const canDelete = userRole === 'Admin';
const canChangeStatus = userRole === 'Admin';
const canAddProduct = true; // Both roles
const canUpdateProduct = true; // Both roles

// Pass to child components
<ViewProductModal
  userRole={userRole}
  canDelete={canDelete}
  canChangeStatus={canChangeStatus}
/>
```

---

## Conditional Rendering Pattern

```jsx
{/* Admin-only feature */}
{canDelete && (
  <button onClick={handleDelete}>
    Delete Product
  </button>
)}

{/* Inventory Manager info message */}
{!canDelete && (
  <div className="info-message">
    Only administrators can delete products
  </div>
)}

{/* Feature available to both */}
<button onClick={handleEdit}>
  Edit Product
</button>
```

---

## Testing Flow

```
┌──────────────────────────────────────────────┐
│         Test Admin Permissions               │
├──────────────────────────────────────────────┤
│ 1. Login as Admin                            │
│ 2. Navigate to Stock Management              │
│ 3. Open a product                            │
│ 4. Verify delete button visible ✅           │
│ 5. Verify status toggle visible ✅           │
│ 6. Try deleting → Should work ✅             │
│ 7. Select multiple products                  │
│ 8. Verify bulk delete available ✅           │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│    Test Inventory Manager Restrictions       │
├──────────────────────────────────────────────┤
│ 1. Login as Inventory Manager                │
│ 2. Navigate to Inventory                     │
│ 3. Open a product                            │
│ 4. Verify delete button hidden ✅            │
│ 5. Verify status toggle hidden ✅            │
│ 6. Verify permission notice shown ✅         │
│ 7. Select multiple products                  │
│ 8. Verify bulk delete hidden ✅              │
│ 9. Try accessing /admin/stock-management     │
│ 10. Should redirect to unauthorized ✅       │
└──────────────────────────────────────────────┘
```

---

**Visual Guide Created**: November 13, 2025
