import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
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

const Login = () => {
  const [Email, setUsername] = useState("");
  const [Password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, Email, Password).then((userCredential) =>{
      const user = userCredential.user;
      const docRef = doc(db, "User", user.uid);
      getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.Role === "Admin") {
            localStorage.setItem("isAuthenticated", "true");
            alert("User Login");
            navigate("./dashboard"); 
            console.log("User is an Admin");
          } 
          else if(data.Role === "InventoryManager"){
            localStorage.setItem("isAuthenticated", "true");
            alert("User Login");
            navigate("./im_dashboard"); 
            console.log("User is an InventoryManager");
          }
        } else {
          console.log("No such document!");
        }
      });      
    }).catch((error)=> {
      const error1 = error.code;
      const error_message = error1.message;
      alert(error_message);

    })
  };

  return (
  <div class="container">
    <div className="login-box">
        <h2>Login</h2>
            <form onSubmit={handleLogin}>
                <input
                type="text"
                placeholder="Username"
                value={Email}
                onChange={(e) => setUsername(e.target.value)}
                required
                />
                <input
                type="password"
                placeholder="Password"
                value={Password}
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
