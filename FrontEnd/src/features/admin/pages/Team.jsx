import React, { useState } from 'react';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { FiUserPlus } from 'react-icons/fi';

const Team = () => {
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleModal = () => setShowModal(!showModal);
  const closeModal = () => setShowModal(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const teamMembers = [
    { name: 'Mark Sy', role: 'Manager', email: 'Mark_23@yahoo.com' },
    { name: 'David Estrella', role: 'Owner', email: 'Dave.estrella@gmail.com' },
    { name: 'Aeron Bernal', role: 'Manager', email: 'ae_bernal@hotmail.com' },
    { name: 'Maria Fernandez', role: 'Lead', email: 'mariewants@gmail.com' },
    { name: 'Olivia Santos', role: 'Strategist', email: 'olivirdr@gmail.com' },
    { name: 'Andrea Valdez', role: 'CEO', email: 'Andreawontstop@gmail.com' },
    {
      name: 'Liam Payne',
      role: 'Digital Marketer',
      email: 'l.worlfall@gmail.com',
    },
    {
      name: 'Anderson Mendez',
      role: 'Social Media',
      email: 'delmar.king@gmail.com',
    },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Team</h1>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {teamMembers.map((member, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
            <div className="w-24 h-24 bg-gray-200 rounded-full mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              {member.name}
            </h2>
            <p className="text-gray-600 mb-2">{member.role}</p>
            <p className="text-gray-500 text-sm">{member.email}</p>
          </div>
        ))}
      </div>

      {/* Create Button */}
      <button
        onClick={toggleModal}
        className="fixed right-8 bottom-8 bg-[#4F46E5] text-white p-4 rounded-full shadow-lg hover:bg-[#4338CA] transition-colors flex items-center gap-2">
        <span className="hidden sm:inline">Create</span>
        <FiUserPlus size={20} />
      </button>

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Add New Team Member
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none transition-colors"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none transition-colors"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none transition-colors"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? (
                      <IoEyeOffOutline size={20} />
                    ) : (
                      <IoEyeOutline size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none transition-colors"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? (
                      <IoEyeOffOutline size={20} />
                    ) : (
                      <IoEyeOutline size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] outline-none transition-colors"
                  placeholder="Enter role"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#4F46E5] text-white py-2.5 px-4 rounded-lg hover:bg-[#4338CA] transition-colors font-medium">
                Add Member
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
