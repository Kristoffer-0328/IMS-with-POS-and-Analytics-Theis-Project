# IMS-with-POS-and-Analytics-Theis-Project
This repository dedicated only for Thesis project. The Inventory Management System will be Web-based.

## Collaborators
- John Kristoffer D. Miranda
- John Calvin C. Santos
- Venedict M. Luceño

## Figma Design
[Figma Link](https://www.figma.com/design/UJPRXl8KHKRRz7A0QmxWHM/Inventory-Management-System?node-id=0-1&t=jMgwgm0A6hk6bD5k-1)

Okay, here's the complete system documentation, incorporating the previous sections and expanding on each module for clarity.

# IMS with POS and Analytics System Documentation

## Table of Contents

1.  System Overview
2.  Architecture
3.  Core Features
4.  Technical Implementation
5.  Component Documentation
6.  Authentication System
7.  Database Structure
8.  User Roles & Access Control
9.  API Endpoints
10. Best Practices
11. Future Enhancements

## 1. System Overview

### Purpose

The system is an integrated solution designed to streamline business operations by combining:

*   **Point of Sale (POS) operations:** Facilitates sales transactions and customer interactions.
*   **Inventory Management:** Tracks stock levels, manages product information, and automates restocking processes.
*   **Sales Analytics:** Provides insights into sales trends, customer behavior, and overall business performance.
*   **User Management:** Manages user accounts, roles, and permissions.
*   **Transaction History:** Records and provides access to past sales transactions.

### Target Users

*   **Cashiers:** Use the POS interface to process sales, manage customer orders, and handle payments.
*   **Inventory Managers:** Utilize the inventory management interface to track stock levels, manage product information, and generate reports.
*   **Administrators:** Oversee the entire system, manage user accounts, configure system settings, and access advanced analytics.
*   **Business Owners:** Gain insights into business performance through sales analytics and inventory reports.

## 2. Architecture

### Technology Stack

*   **Frontend:** React.js with Vite
*   **Backend:** Firebase
*   **Database:** Firestore
*   **Authentication:** Firebase Auth
*   **Styling:** TailwindCSS
*   **State Management:** React Context API

### Project Structure

```
FrontEnd/
├── src/
│   ├── admin_interface/      # Admin dashboard components
│   ├── cashier_pos_interface/# POS system components
│   ├── im_interface/         # Inventory management
│   ├── FirebaseBackEndQuerry/# Firebase services
│   ├── Models/              # Data models
│   └── pages/               # Route pages
```

## 3. Core Features

### Point of Sale (POS)

*   **Real-time product search:** Quickly find products by name, category, or SKU.
*   **Variable product variants:** Support products with different sizes, colors, or other attributes.
*   **Bulk order processing:** Handle large orders efficiently with customer details management.
*   **Receipt generation:** Generate digital and printable receipts for each transaction.
*   **Multiple payment methods:** Accept cash, credit cards, debit cards, and mobile payments.
*   **Customer information management:** Store and retrieve customer details for personalized service.

### Inventory Management

*   **Stock tracking:** Monitor stock levels in real-time.
*   **Product categorization:** Organize products into categories for easy management.
*   **Variant management:** Manage different variations of a product.
*   **Stock alerts:** Receive notifications when stock levels are low.
*   **Product history:** Track changes to product information and stock levels.

### Analytics

*   **Sales reports:** Generate reports on sales performance over time.
*   **Transaction history:** View and analyze past sales transactions.
*   **Payment method analysis:** Track the popularity of different payment methods.
*   **Daily sales tracking:** Monitor sales performance on a daily basis.
*   **Average transaction value:** Calculate the average amount spent per transaction.

## 4. Technical Implementation

### Firebase Integration

```javascript
// Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ...other configurations
};
```

### Authentication Flow

```javascript
const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userData = await getUserData(userCredential.user.uid);
    return { success: true, user: userData };
  } catch (error) {
    return { success: false, error: 'Invalid credentials' };
  }
};
```

## 5. Component Documentation

### POS Components

#### New Sale Component (`Pos_NewSale.jsx`)

*   **Purpose:** The main POS interface for processing sales transactions.
*   **Functionality:**
    *   Displays a search bar for finding products.
    *   Shows a grid of available products with add-to-cart buttons.
    *   Manages the shopping cart with options to remove items.
    *   Provides a payment section for completing the transaction.
    *   Generates receipts and updates inventory levels.
*   **Key States:**
    *   `cart`: Array of items in the shopping cart.
    *   `customerDetails`: Customer information for bulk orders.
    *   `searchQuery`: Current search query.
    *   `amountPaid`: Amount paid by the customer.
    *   `paymentMethod`: Selected payment method.

#### Transaction History Component (`Pos_TransactionHistory.jsx`)

*   **Purpose:** Displays a history of sales transactions.
*   **Functionality:**
    *   Fetches and displays a list of past transactions from Firestore.
    *   Allows filtering transactions by payment method and date.
    *   Provides a search bar for finding specific transactions.
    *   Shows detailed information for each transaction in a modal.
*   **Key States:**
    *   `transactions`: Array of transaction objects.
    *   `currentFilter`: Selected payment method filter.
    *   `searchQuery`: Current search query.
    *   `selectedTransaction`: The transaction object for the detailed view.

### Inventory Management Components

#### Inventory Dashboard (`IMDashboard.jsx`)

*   **Purpose:** Provides an overview of inventory status and recent activity.
*   **Functionality:**
    *   Displays key metrics such as total stock, low stock items, and pending restocks.
    *   Shows a chart of inventory distribution by category.
    *   Lists recent stock movements.
*   **Key Features:**
    *   Real-time stock level tracking.
    *   Visual representation of inventory data.
    *   Quick access to critical inventory information.

#### Product Management (`Inventory.jsx`)

*   **Purpose:** Manages product information and stock levels.
*   **Functionality:**
    *   Displays a list of products with details such as name, category, and quantity.
    *   Allows adding new products, editing existing products, and managing variants.
    *   Provides filters for searching and sorting products.
*   **Key Features:**
    *   Advanced product search.
    *   Multiple filter combinations.
    *   Bulk stock updates.

#### Restocking Request (`RestockingRequest.jsx`)

*   **Purpose:** Manages and tracks restocking requests.
*   **Functionality:**
    *   Displays a list of restocking requests with details such as product name, requested quantity, and status.
    *   Allows creating new restocking requests.
    *   Provides filters for searching and sorting requests.
*   **Key Features:**
    *   Real-time updates on request status.
    *   Automated notifications for low stock items.
    *   Trend analysis for stock levels.

#### Reports and Logs (`ReportsAndLogs.jsx`)

*   **Purpose:** Generates reports and logs for inventory management.
*   **Functionality:**
    *   Provides access to various reports such as inventory turnover and stock movement history.
    *   Allows filtering reports by date range and category.
    *   Presents data in charts and tables for easy analysis.
*   **Key Features:**
    *   Comprehensive reporting options.
    *   Visual data representation.
    *   Customizable filters.

## 6. Authentication System

### User Roles

*   **Admin:** Full system access.
*   **Cashier:** POS access only.
*   **Inventory Manager:** Stock management access.

### Role-Based Access Control

```javascript
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Authentication state management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(...);
    return () => unsubscribe();
  }, []);
};
```

## 7. Database Structure

### Collections

```javascript
Firestore Collections:
├── Products/
│   ├── id
│   ├── name
│   ├── category
│   ├── variants[]
│   └── quantity
├── Transactions/
│   ├── id
│   ├── timestamp
│   ├── items[]
│   ├── total
│   └── customerDetails
└── Users/
    ├── id
    ├── role
    ├── name
    └── email
```

## 8. User Roles & Access Control

### Admin

*   Full access to all features.
*   Can manage users, products, categories, and settings.
*   Can generate and view all reports.

### Cashier

*   Access to the POS interface for processing sales.
*   Can view transaction history and generate sales reports.
*   Limited access to inventory information.

### Inventory Manager

*   Access to the inventory management interface.
*   Can manage products, stock levels, and categories.
*   Can generate inventory reports and track stock movements.

## 9. API Endpoints

### Authentication

*   `/api/login`: Authenticates a user and returns a JWT.
*   `/api/logout`: Invalidates the user's session.
*   `/api/register`: Registers a new user.

### Products

*   `/api/products`: Returns a list of all products.
*   `/api/products/:id`: Returns a specific product by ID.
*   `/api/products`: Creates a new product.
*   `/api/products/:id`: Updates an existing product.
*   `/api/products/:id`: Deletes a product.

### Transactions

*   `/api/transactions`: Returns a list of all transactions.
*   `/api/transactions/:id`: Returns a specific transaction by ID.
*   `/api/transactions`: Creates a new transaction.

### Inventory

*   `/api/inventory`: Returns a list of all inventory items.
*   `/api/inventory/:id`: Returns a specific inventory item by ID.
*   `/api/inventory/:id`: Updates an existing inventory item.

## 10. Best Practices

### Error Handling

```javascript
try {
  // Operation logic
} catch (error) {
  console.error('Operation failed:', error);
  // User feedback
} finally {
  // Cleanup
}
```

### Data Validation

```javascript
const validateProduct = (product) => {
  if (!product.name || !product.price) {
    throw new Error('Invalid product data');
  }
};
```

### Security Rules

*   Implement proper Firebase security rules.
*   Validate user permissions.
*   Secure API endpoints.

## 11. Future Enhancements

1.  **Advanced Analytics Dashboard:**
    *   Customizable dashboards with real-time data visualization.
    *   Predictive analytics for sales forecasting and inventory optimization.
2.  **Inventory Forecasting:**
    *   Automated forecasting based on historical sales data and seasonal trends.
    *   Integration with supplier management for automated reordering.
3.  **Customer Loyalty System:**
    *   Points-based loyalty program for rewarding repeat customers.
    *   Personalized promotions and discounts based on customer purchase history.
4.  **Multi-branch Support:**
    *   Support for multiple store locations with centralized inventory management.
    *   Real-time synchronization of data across all branches.
5.  **Advanced Report Generation:**
    *   Customizable report templates with advanced filtering and sorting options.
    *   Automated report scheduling and distribution.
