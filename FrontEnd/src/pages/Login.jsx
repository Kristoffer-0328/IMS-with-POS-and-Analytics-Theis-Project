import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    
    if (username === "Toffu@gmail.com" && password === "Toffu_0928") {
      localStorage.setItem("isAuthenticated", "true"); // Store login status
      console.log("User authenticated! Redirecting...");
      navigate("./dashboard"); // Redirect to Dashboard
    } else {
      alert("Invalid username or password!");
    }
  };

  return (
  <div class="container">
    <div className="login-box">
        <h2>Login</h2>
            <form onSubmit={handleLogin}>
                <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                />
                <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />
                <button type="submit">Login</button>
            </form>
        </div>
  </div>
        
  );
};

export default Login;
