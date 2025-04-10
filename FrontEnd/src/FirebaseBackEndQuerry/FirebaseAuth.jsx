import React, { createContext, useContext, useState } from 'react';
import {getAuth, signInWithEmailAndPassword} from "firebase/auth"
import { Firestore, getFirestore ,doc, getDoc} from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import app from '../FirebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);
const AuthContext = createContext(null);

// const appCheck = initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
//   isTokenAutoRefreshEnabled: true
// });
// console.log(appCheck);

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
        console.log(data.role);
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
