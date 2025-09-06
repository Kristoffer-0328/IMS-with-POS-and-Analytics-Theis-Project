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
      console.log('onAuthStateChanged triggered'); // Debugging

      setLoading(true);  // Set loading to true while checking user

      try {
        if (user) {
          const docRef = doc(db, 'User', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
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
            console.error('User data not found in Firestore');
          }
        } else {
          setCurrentUser(null);
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('userRole');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        console.log('Finally block triggered');
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
        setLoading(false);  // Make sure to set loading false in case of failure
        return { success: false, error: 'User not found in database' };
      }
    } catch (error) {
      setLoading(false);  // Make sure to set loading false in case of error
      return { success: false, error: 'Invalid credentials' };
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
