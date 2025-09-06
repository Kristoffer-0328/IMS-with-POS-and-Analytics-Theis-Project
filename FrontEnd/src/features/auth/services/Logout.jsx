import React, { useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import app from '../../../FirebaseConfig';

const Logout = () => {
  const navigate = useNavigate();
  const auth = getAuth(app);

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut(auth);
        // Clear any local storage or session data if needed
        localStorage.clear();
        sessionStorage.clear();
        // Redirect to login page
        navigate('/login');
      } catch (error) {
        console.error('Error logging out:', error);
      }
    };

    handleLogout();
  }, [navigate, auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Logging Out</h1>
          <p className="text-gray-600">Please wait while we securely log you out...</p>
        </div>
      </div>
    </div>
  );
};

export default Logout;
