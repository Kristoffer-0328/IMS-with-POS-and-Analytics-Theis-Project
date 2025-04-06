import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Dummy user data
const dummyUsers = [
  {
    email: 'admin@glorystar.com',
    password: 'admin123',
    role: 'Admin',
    name: 'Glory Admin',
    avatar: 'GA',
  },
  {
    email: 'Toffu@gmail.com',
    password: 'Toffu_0928',
    role: 'InventoryManager',
    name: 'Toffu',
    avatar: 'IT',
  },
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (email, password) => {
    const user = dummyUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      const userData = {
        email: user.email,
        role: user.role,
        name: user.name,
        avatar: user.avatar,
      };
      setCurrentUser(userData);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    return { success: false, error: 'Invalid credentials' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('isAuthenticated', 'false');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
  };

  const value = {
    currentUser,
    login,
    logout,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
