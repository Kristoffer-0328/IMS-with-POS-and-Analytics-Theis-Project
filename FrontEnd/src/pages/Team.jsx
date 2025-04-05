import React from "react";
import Sidebar from "../Sidebar";
import "./css/Team.css";
import { useState } from "react";
import { IoEyeOutline } from "react-icons/io5";
import { IoEyeOffOutline } from "react-icons/io5";
import { CiMenuBurger } from "react-icons/ci";
import { IoMdArrowDropdown, IoMdClose } from "react-icons/io";
import { CiBellOn } from "react-icons/ci";
import BG from "../assets/BG.png";
import { IoIosArrowDropdown } from "react-icons/io";
import { CiSearch } from "react-icons/ci";

const Team = () => {
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  const toggleModal = () => {
    setShowModal(!showModal);
  };
  
  const closeModal = () => {
    setShowModal(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  return (
    <>
    <nav className="navbar">
        {/* Left Group */}
        <div className="navbar-left">
          <button className="menu-button">
            <CiMenuBurger size={20} />
          </button>
          <div className={`search-container ${searchFocused ? 'focused' : ''}`}>
            <CiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="search-input"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)} 
            />
          </div>
        </div>

        {/* Right Group */}
        <div className="navbar-right">
          <button className="notification-button">
            <CiBellOn size={20} />
          </button>
          <div className="user-profile">
            <img src={BG} alt="User" className="user-avatar" />
            <div className="user-info">
              <p className="user-name">First Name</p> 
              <p className="user-surname">Last Name</p>
            </div>
            <IoIosArrowDropdown size={20} />
          </div>
        </div>
      </nav>

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
        
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="close-button" onClick={closeModal}>×</button>
              <form>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input type="text" name="username" id="username" />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" name="email" id="email" />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-input-container">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="password" 
                      id="password" 
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <div className="password-input-container">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      name="confirm-password" 
                      id="confirm-password" 
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={toggleConfirmPasswordVisibility}
                    >
                      {showConfirmPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <input type="text" name="role" id="role" />
                </div>
                <div className="form-buttons">
                  <button type="submit">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      
        <button onClick={toggleModal} className="create-button">
          <span className="icon">👥</span> Create
        </button>
      </div>
    </div>
    </>
  );
};

export default Team;