import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../FirebaseBackEndQuerry/FirebaseAuth';
import GloryStarLogo from '../../assets/Glory_Star_Logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      navigate('/loading');
      const randomTime = Math.floor(Math.random() * (7 - 3 + 1)) + 3;
      const result = await login(email, password);
      setTimeout(function () { 
        if (result.success) {
        
          if (result.user.role === "Admin") {
            navigate('/admin');
          } else if (result.user.role === 'InventoryManager') {
            navigate('/im');
          }
          else if(result.user.role === 'Cashier'){
            navigate('/pos/newsale');
          }
        } else {
          setError('Invalid credentials');
        }
    }, randomTime * 1000); 
      
    } catch (err) {
      setError('Failed to log in');
      
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

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA726] focus:border-[#FFA726] outline-none transition-colors"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA726] focus:border-[#FFA726] outline-none transition-colors"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-[#FFA726] hover:bg-[#FF9800] text-white rounded-lg transition-colors duration-200 font-medium">
              Sign In
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
