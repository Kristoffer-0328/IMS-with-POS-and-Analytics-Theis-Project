import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/services/FirebaseAuth';
import GloryStarLogo from '../assets/Glory_Star_Logo.png';
import ErrorModal from '../components/modals/ErrorModal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', type: 'error' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorModal({ isOpen: false, title: '', message: '', type: 'error' });
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Navigate based on user role
        if (result.user.role === "Admin") {
          navigate('/admin');
        } else if (result.user.role === 'InventoryManager') {
          navigate('/im');
        } else if (result.user.role === 'Cashier') {
          navigate('/pos/newsale');
        } else {
          setErrorModal({ isOpen: true, title: 'Login Failed', message: 'Invalid user role. Please contact administrator.', type: 'error' });
          setIsLoading(false);
        }
      } else {
        setErrorModal({ isOpen: true, title: 'Login Failed', message: result.error || 'Invalid email or password. Please try again.', type: 'error' });
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorModal({ isOpen: true, title: 'Login Error', message: 'Failed to log in. Please check your connection and try again.', type: 'error' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="relative w-full max-w-md">
        {/* Login Form Container */}
        <div className="relative bg-white rounded-2xl shadow-lg p-8 mx-4 z-10">
          <div className="mb-8 text-center">
            <img
              src={GloryStarLogo}
              alt="Glory Star Logo"
              className="h-12 mx-auto mb-6"
            />
            <h2 className="text-2xl font-semibold text-gray-800">Login</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA726] focus:border-[#FFA726] outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="username@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA726] focus:border-[#FFA726] outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-[#FFA726] hover:bg-[#FF9800] text-white rounded-lg transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>

          </form>
        </div>
      </div>

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
        type={errorModal.type}
      />
    </div>
  );
};

export default Login;
