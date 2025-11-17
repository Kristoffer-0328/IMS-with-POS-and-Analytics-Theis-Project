import React, { useState, useEffect } from 'react';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { FiUserPlus, FiTrash2, FiEdit } from 'react-icons/fi';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import app from '../../../FirebaseConfig';
import { useAuth } from '../../auth/services/FirebaseAuth';

const Team = () => {
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [avatar, setAvatar] = useState('IM');
  const [authCode, setAuthCode] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editAuthCode, setEditAuthCode] = useState('');

  const db = getFirestore(app);
  const { currentUser } = useAuth(); // Get current admin user

  // Fetch team members from Firebase on component mount
  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const usersCollection = collection(db, 'User');
      const usersSnapshot = await getDocs(usersCollection);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      // Filter out deleted/inactive users
      .filter(user => user.status !== 'deleted');
      setTeamMembers(users);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setError('Failed to load team members');
    }
  };

  const toggleModal = () => {
    setShowModal(!showModal);
    // Reset form when closing
    if (showModal) {
      resetForm();
    }
  };
  
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('');
    setAvatar('IM');
    setAuthCode('');
    setError('');
    setSuccess('');
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  const handleDeleteClick = (member) => {
    setMemberToDelete(member);
    setDeleteConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;

    // Prevent deleting yourself
    if (memberToDelete.id === currentUser?.uid) {
      setError('You cannot delete your own account');
      setDeleteConfirmModal(false);
      setMemberToDelete(null);
      return;
    }

    setDeleting(true);

    try {
      // Mark user as deleted instead of actually deleting
      // This prevents login while keeping data for audit purposes
      const userDocRef = doc(db, 'User', memberToDelete.id);
      await updateDoc(userDocRef, {
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        deletedBy: currentUser?.uid,
        deletedByName: currentUser?.name || currentUser?.email
      });

      setSuccess(`${memberToDelete.name} has been removed from the team`);
      
      // Refresh team members list
      await fetchTeamMembers();
      
      // Close modal
      setDeleteConfirmModal(false);
      setMemberToDelete(null);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user: ' + error.message);
      setDeleteConfirmModal(false);
      setMemberToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmModal(false);
    setMemberToDelete(null);
  };

  const handleEditClick = (member) => {
    setEditingMember(member);
    setEditUsername(member.name);
    setEditRole(member.role);
    setEditAvatar(member.avatar || member.name?.charAt(0).toUpperCase() || 'U');
    setEditAuthCode(member.authCode || '');
    setError('');
    setSuccess('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!editUsername || !editRole) {
      setError('Name and role are required');
      return;
    }

    setLoading(true);

    try {
      const userDocRef = doc(db, 'User', editingMember.id);
      await updateDoc(userDocRef, {
        name: editUsername,
        role: editRole,
        avatar: editAvatar,
        authCode: editAuthCode,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.uid
      });

      setSuccess('Team member updated successfully!');
      
      // Refresh team members list
      await fetchTeamMembers();
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        setShowEditModal(false);
        setEditingMember(null);
        resetEditForm();
      }, 1500);

    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetEditForm = () => {
    setEditUsername('');
    setEditRole('');
    setEditAvatar('');
    setEditAuthCode('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingMember(null);
    resetEditForm();
  };

  const generateAuthCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === 'Admin' || newRole === 'InventoryManager') {
      setAuthCode(generateAuthCode());
    } else {
      setAuthCode('');
    }
  };

  const handleEditRoleChange = (newRole) => {
    setEditRole(newRole);
    if (newRole === 'Admin' || newRole === 'InventoryManager') {
      setEditAuthCode(generateAuthCode());
    } else {
      setEditAuthCode('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validation
    if (!username || !email || !password || !confirmPassword || !role) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    // Create a unique name for secondary app to avoid conflicts
    const secondaryAppName = `SecondaryApp-${Date.now()}`;
    let secondaryApp = null;

    try {
      // Get Firebase config from the main app
      const firebaseConfig = app.options;
      
      // Create a secondary Firebase app instance for user creation
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      // Create user with secondary auth (won't affect current admin session)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const user = userCredential.user;

      // Save user data to Firestore User collection using UID as document ID
      const userDocRef = doc(db, 'User', user.uid);
      await setDoc(userDocRef, {
        avatar: avatar,
        email: email,
        name: username,
        role: role,
        authCode: authCode,
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      setSuccess('Team member added successfully!');
      
      // Refresh team members list
      await fetchTeamMembers();
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        closeModal();
      }, 1500);

    } catch (error) {
      console.error('Error creating user:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Failed to create user: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': 'bg-purple-100 text-purple-700',
      'InventoryManager': 'bg-blue-100 text-blue-700',
      'Cashier': 'bg-green-100 text-green-700',
      'Manager': 'bg-orange-100 text-orange-700',
      'Owner': 'bg-red-100 text-red-700',
      'Lead': 'bg-cyan-100 text-cyan-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleDisplay = (role) => {
    const roleNames = {
      'Admin': 'Admin',
      'InventoryManager': 'Inventory Manager',
      'Cashier': 'Cashier'
    };
    return roleNames[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Team</h1>
              <p className="text-gray-600 text-sm mt-1">Manage team members and their roles</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-6 py-3 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Total Members</div>
              <div className="text-2xl font-bold text-gray-800">{teamMembers.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Success/Error Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {/* Team Grid */}
        {teamMembers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <FiUserPlus size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Team Members Yet</h3>
            <p className="text-gray-600 mb-6">Start building your team by adding your first member</p>
            <button
              onClick={toggleModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
              <FiUserPlus size={20} />
              Add First Member
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 relative group">
                {/* Delete Button - Only show if not current user */}
                {member.id !== currentUser?.uid && (
                  <button
                    onClick={() => handleDeleteClick(member)}
                    className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete user">
                    <FiTrash2 size={18} />
                  </button>
                )}
                
                {/* Edit Button */}
                <button
                  onClick={() => handleEditClick(member)}
                  className="absolute top-3 left-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Edit user">
                  <FiEdit size={18} />
                </button>
                
                {/* Avatar */}
                <div className="w-24 h-24 bg-gray-100 rounded-full mb-4 flex items-center justify-center border-2 border-gray-200">
                  <span className="text-2xl font-bold text-gray-700">
                    {member.avatar || member.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                
                {/* Name */}
                <h2 className="text-lg font-semibold text-gray-800 mb-1 text-center">
                  {member.name}
                  {member.id === currentUser?.uid && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">(You)</span>
                  )}
                </h2>
                
                {/* Role Badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-medium mb-2 ${getRoleColor(member.role)}`}>
                  {getRoleDisplay(member.role)}
                </span>
                
                {/* Email */}
                <p className="text-gray-500 text-sm text-center break-all">{member.email}</p>
                
                {/* Auth Code */}
                {(member.role === 'Admin' || member.role === 'InventoryManager') && member.authCode && (
                  <p className="text-blue-600 text-xs text-center font-mono bg-blue-50 px-2 py-1 rounded mt-1">
                    Code: {member.authCode}
                  </p>
                )}
                
                {/* Status */}
                {member.status && (
                  <span className={`mt-3 text-xs font-medium ${member.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                    {member.status === 'active' ? '● Active' : '● Inactive'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Button */}
      <button
        onClick={toggleModal}
        className="fixed right-8 bottom-8 bg-gray-800 text-white p-4 rounded-full shadow-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
        <span className="hidden sm:inline">Create</span>
        <FiUserPlus size={20} />
      </button>

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Add New Team Member
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                disabled={loading}>
                ×
              </button>
            </div>

            {/* Error/Success in Modal */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                  placeholder="Enter username"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                  placeholder="Enter email"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                    placeholder="Enter password (min. 6 characters)"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}>
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
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                    placeholder="Confirm password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}>
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
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors bg-white"
                  required
                  disabled={loading}>
                  <option value="">Select role</option>
                  <option value="Admin">Admin</option>
                  <option value="InventoryManager">Inventory Manager</option>
                  <option value="Cashier">Cashier</option>
                </select>
              </div>

              {(role === 'Admin' || role === 'InventoryManager') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Authorization Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={authCode}
                      readOnly
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 outline-none"
                      placeholder="Generated code"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setAuthCode(generateAuthCode())}
                      className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      disabled={loading}>
                      Regenerate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This code allows overriding POS restrictions</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avatar Initial (optional)
                </label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value.toUpperCase().slice(0, 2))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                  placeholder="e.g., JD (max 2 characters)"
                  maxLength={2}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Default: First letter of username</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-800 text-white py-2.5 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <FiUserPlus size={18} />
                    Add Member
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Edit Team Member
              </h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                disabled={loading}>
                ×
              </button>
            </div>

            {/* Error/Success in Modal */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                  placeholder="Enter username"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => handleEditRoleChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors bg-white"
                  required
                  disabled={loading}>
                  <option value="">Select role</option>
                  <option value="Admin">Admin</option>
                  <option value="InventoryManager">Inventory Manager</option>
                  <option value="Cashier">Cashier</option>
                </select>
              </div>

              {(editRole === 'Admin' || editRole === 'InventoryManager') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Authorization Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editAuthCode}
                      readOnly
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 outline-none"
                      placeholder="Generated code"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setEditAuthCode(generateAuthCode())}
                      className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      disabled={loading}>
                      Regenerate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This code allows overriding POS restrictions</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avatar Initial (optional)
                </label>
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value.toUpperCase().slice(0, 2))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                  placeholder="e.g., JD (max 2 characters)"
                  maxLength={2}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Default: First letter of username</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-800 text-white py-2.5 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <FiEdit size={18} />
                    Update Member
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && memberToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Delete Team Member?</h2>
              <p className="text-gray-600">
                Are you sure you want to remove <span className="font-semibold">{memberToDelete.name}</span> from the team?
              </p>
              <p className="text-sm text-red-600 mt-2">
                This action cannot be undone. The user will lose access to the system.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{memberToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{memberToDelete.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Role:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(memberToDelete.role)}`}>
                  {getRoleDisplay(memberToDelete.role)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {deleting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 size={18} />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
