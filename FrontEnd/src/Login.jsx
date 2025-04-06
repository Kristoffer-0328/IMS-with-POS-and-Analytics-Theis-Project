import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Firestore, getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCgysE6OQ8AhIsM-RWkk9us6E9wdwL3PhM',
  authDomain: 'glorystarauth.firebaseapp.com',
  projectId: 'glorystarauth',
  storageBucket: 'glorystarauth.firebasestorage.app',
  messagingSenderId: '74520742179',
  appId: '1:74520742179:web:5c8435597f8b3d878ce496',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const Login = () => {
  const [Email, setUsername] = useState('');
  const [Password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, Email, Password)
      .then((userCredential) => {
        const user = userCredential.user;
        const docRef = doc(db, 'User', user.uid);
        getDoc(docRef).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.Role === 'Admin') {
              localStorage.setItem('isAuthenticated', 'true');
              alert('User Login');
              navigate('./dashboard');
              console.log('User is an Admin');
            } else if (data.Role === 'InventoryManager') {
              localStorage.setItem('isAuthenticated', 'true');
              alert('User Login');
              navigate('./im_dashboard');
              console.log('User is an InventoryManager');
            }
          } else {
            console.log('No such document!');
          }
        });
      })
      .catch((error) => {
        const error1 = error.code;
        const error_message = error1.message;
        alert(error_message);
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={Email}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={Password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
