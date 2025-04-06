import React, { createContext, useContext, useState } from 'react';
import { initializeApp } from "firebase/app";
import {getAuth, signInWithEmailAndPassword} from "firebase/auth"
import { Firestore, getFirestore ,doc, getDoc} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgysE6OQ8AhIsM-RWkk9us6E9wdwL3PhM",
  authDomain: "glorystarauth.firebaseapp.com",
  projectId: "glorystarauth",
  storageBucket: "glorystarauth.firebasestorage.app",
  messagingSenderId: "74520742179",
  appId: "1:74520742179:web:5c8435597f8b3d878ce496"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const docRef = doc(db, "User", user.uid);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userData = {
          email: data.email,
          role: data.role,
          name: data.name,
          avatar: data.avatar,
        };
  
        setCurrentUser(userData);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('user', JSON.stringify(userData));
  
        return { success: true, user: userData };
      } else {
        return { success: false, error: 'User not found in database' };
      }
    } catch (error) {
      return { success: false, error: 'Invalid credentials' };
    }
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
