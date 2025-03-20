import React, { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import "./css/Team.css";

const Team = () => {
  return (
    <div className="team-container">
      <Sidebar />
      <div className="team-content">
        <h1>Team</h1>
        <div className="team-grid">
          {[  
            { name: "Mark Sy", role: "Manager", email: "Mark_23@yahoo.com" },
            { name: "David Estrella", role: "Owner", email: "Dave.estrella@gmail.com" },
            { name: "Aeron Bernal", role: "Manager", email: "ae_bernal@hotmail.com" },
            { name: "Maria Fernandez", role: "Lead", email: "mariewants@gmail.com" },
            { name: "Olivia Santos", role: "Strategist", email: "olivirdr@gmail.com" },
            { name: "Andrea Valdez", role: "CEO", email: "Andreawontstop@gmail.com" },
            { name: "Liam Payne", role: "Digital Marketer", email: "l.worlfall@gmail.com" },
            { name: "Anderson Mendez", role: "Social Media", email: "delmar.king@gmail.com" }
          ].map((member, index) => (
            <div className="team-card" key={index}>
              <div className="team-avatar"></div>
              <h2>{member.name}</h2>
              <p>{member.role}</p>
              <p>{member.email}</p>
            </div>
          ))}
        </div>
        <button className="create-button">
          <span className="icon">👥</span> Create
        </button>
      </div>
    </div>
  );
};

export default Team;
