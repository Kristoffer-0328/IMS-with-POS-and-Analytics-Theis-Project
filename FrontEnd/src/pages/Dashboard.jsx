import React, { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import './css/Dashboard.css'

const Dashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/Users")
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched Data:", data);
        setData(data);
      })
      .catch((error) => console.error("Error fetching users:", error));
  }, []);

  return (
    <div className="container">
      <h1>Dashboard</h1>
        {data?.length > 0 ? (
        data.map((d, i) => (
          <div key={i}>
          <p>UserName: {d.Username}</p>
          </div>
        ))
      ) : (
        <p>Loading users...</p>
      )}
    </div>
  );
};

export default Dashboard;
