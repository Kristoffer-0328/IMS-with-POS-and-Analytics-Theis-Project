import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc
} from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);  // Initially set loading to true

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);  // Set loading to true while checking user

      try {
        if (user) {
          const docRef = doc(db, 'User', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Check if user account is deleted
            if (data.status === 'deleted') {
              console.error('Account has been deleted - signing out');
              await signOut(auth);
              setCurrentUser(null);
              localStorage.removeItem('isAuthenticated');
              localStorage.removeItem('userRole');
              localStorage.removeItem('user');
              return;
            }
            
            const userData = {
              uid: user.uid,
              email: data.email,
              role: data.role,
              name: data.name,
              avatar: data.avatar,
            };

            setCurrentUser(userData);
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            console.error('User data not found in Firestore - signing out');
            // If user is authenticated but has no Firestore document, sign them out
            await signOut(auth);
            setCurrentUser(null);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('userRole');
            localStorage.removeItem('user');
          }
        } else {
          setCurrentUser(null);
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('userRole');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // On error, clear the auth state
        setCurrentUser(null);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);  // Always set loading to false after the async operation
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true); // Set loading to true on login request
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const docRef = doc(db, 'User', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check if user account is deleted
        if (data.status === 'deleted') {
          await signOut(auth);
          setLoading(false);
          return { success: false, error: 'This account has been deactivated. Please contact administrator.' };
        }
        
        const userData = {
          uid: user.uid,
          email: data.email,
          role: data.role,
          name: data.name,
          avatar: data.avatar,
        };

        setCurrentUser(userData);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setLoading(false);  
        return { success: true, user: userData };
      } else {
        // User authenticated but no Firestore document exists - sign them out
        console.error('User authenticated but not found in Firestore database');
        await signOut(auth);
        setLoading(false);
        return { success: false, error: 'Account not properly configured. Please contact administrator.' };
      }
    } catch (error) {
      console.error('Login error in FirebaseAuth:', error);
      setLoading(false);  // Make sure to set loading false in case of error
      
      // Provide specific error messages based on error code
      let errorMessage = 'Invalid credentials';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
