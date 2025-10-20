import React, { useState } from 'react';
import {
  FiUser,
  FiShield,
  FiBell,
  FiDatabase,
  FiLayout,
  FiShare2,
  FiSave,
  FiToggleLeft,
  FiToggleRight,
  FiChevronRight,
} from 'react-icons/fi';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [stockAlerts, setStockAlerts] = useState(true);
  const [dataBackup, setDataBackup] = useState(false);
  const [autoLogout, setAutoLogout] = useState(false);

  // Form state for account settings
  const [accountForm, setAccountForm] = useState({
    name: 'Toff Admin',
    email: 'admin@glorystar.com',
    phone: '+63 912 345 6789',
    position: 'Administrator',
    avatar: '/avatars/admin.jpg',
  });

  // Handler for form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAccountForm({
      ...accountForm,
      [name]: value,
    });
  };

  // Render the active settings tab
  const renderTabContent = () => {
    
    switch (activeTab) {
      case 'account':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Account Settings
            </h2>
            <p className="text-gray-600">
              Manage your account information and preferences
            </p>

            <div className="flex flex-col md:flex-row gap-8 mt-6">
              <div className="md:w-1/3">
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-medium shadow-md">
                    {accountForm.name
                      .split(' ')
                      .map((name) => name[0])
                      .join('')}
                  </div>
                  <button className="mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                    Change Avatar
                  </button>
                </div>
              </div>

              <div className="md:w-2/3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={accountForm.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={accountForm.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={accountForm.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={accountForm.position}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                    Change Password
                  </button>
                </div>

                <div className="pt-4">
                  <button className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Security Settings
            </h2>
            <p className="text-gray-600">
              Manage your account security and privacy
            </p>

            <div className="space-y-6 mt-6">
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-800">
                    Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-gray-600">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                  Enable
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-800">
                    Auto Logout After Inactivity
                  </h3>
                  <p className="text-sm text-gray-600">
                    Automatically log out after 30 minutes of inactivity
                  </p>
                </div>
                <button
                  className="text-2xl text-blue-600"
                  onClick={() => setAutoLogout(!autoLogout)}>
                  {autoLogout ? <FiToggleRight /> : <FiToggleLeft />}
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-800">Data Backup</h3>
                  <p className="text-sm text-gray-600">
                    Enable automatic data backup to cloud storage
                  </p>
                </div>
                <button
                  className="text-2xl text-blue-600"
                  onClick={() => setDataBackup(!dataBackup)}>
                  {dataBackup ? <FiToggleRight /> : <FiToggleLeft />}
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-800">Login History</h3>
                  <p className="text-sm text-gray-600">
                    View your recent login activities
                  </p>
                </div>
                <button className="text-blue-600 hover:text-blue-800 transition-colors">
                  <FiChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Notification Settings
            </h2>
            <p className="text-gray-600">
              Manage how you receive notifications
            </p>

            <div className="space-y-4 mt-6">
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-800">
                    Email Notifications
                  </h3>
                  <p className="text-sm text-gray-600">
                    Receive notifications via email
                  </p>
                </div>
                <button
                  className="text-2xl text-blue-600"
                  onClick={() => setEmailNotifications(!emailNotifications)}>
                  {emailNotifications ? <FiToggleRight /> : <FiToggleLeft />}
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-800">
                    Push Notifications
                  </h3>
                  <p className="text-sm text-gray-600">
                    Receive push notifications in browser
                  </p>
                </div>
                <button
                  className="text-2xl text-blue-600"
                  onClick={() => setPushNotifications(!pushNotifications)}>
                  {pushNotifications ? <FiToggleRight /> : <FiToggleLeft />}
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-800">
                    Low Stock Alerts
                  </h3>
                  <p className="text-sm text-gray-600">
                    Get notified when inventory is running low
                  </p>
                </div>
                <button
                  className="text-2xl text-blue-600"
                  onClick={() => setStockAlerts(!stockAlerts)}>
                  {stockAlerts ? <FiToggleRight /> : <FiToggleLeft />}
                </button>
              </div>

              <div className="mt-6">
                <h3 className="font-medium text-gray-800 mb-2">
                  Notification Preferences
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="stock-transfers"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      defaultChecked
                    />
                    <label
                      htmlFor="stock-transfers"
                      className="ml-2 text-sm text-gray-700">
                      Stock Transfers
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="restock-requests"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      defaultChecked
                    />
                    <label
                      htmlFor="restock-requests"
                      className="ml-2 text-sm text-gray-700">
                      Restock Requests
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="inventory-updates"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      defaultChecked
                    />
                    <label
                      htmlFor="inventory-updates"
                      className="ml-2 text-sm text-gray-700">
                      Inventory Updates
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="system-alerts"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      defaultChecked
                    />
                    <label
                      htmlFor="system-alerts"
                      className="ml-2 text-sm text-gray-700">
                      System Alerts
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Appearance Settings
            </h2>
            <p className="text-gray-600">
              Customize the visual appearance of the application
            </p>

            <div className="space-y-6 mt-6">
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-800">Dark Mode</h3>
                  <p className="text-sm text-gray-600">
                    Switch between light and dark themes
                  </p>
                </div>
                <button
                  className="text-2xl text-blue-600"
                  onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? <FiToggleRight /> : <FiToggleLeft />}
                </button>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-3">Color Theme</h3>
                <div className="grid grid-cols-5 gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500 cursor-pointer ring-2 ring-offset-2 ring-blue-500"></div>
                  <div className="w-10 h-10 rounded-full bg-green-500 cursor-pointer"></div>
                  <div className="w-10 h-10 rounded-full bg-purple-500 cursor-pointer"></div>
                  <div className="w-10 h-10 rounded-full bg-red-500 cursor-pointer"></div>
                  <div className="w-10 h-10 rounded-full bg-yellow-500 cursor-pointer"></div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-3">Font Size</h3>
                <div className="flex items-center">
                  <span className="text-sm">Small</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    defaultValue="2"
                    className="mx-4 w-48 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm">Large</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-800">Compact Mode</h3>
                  <p className="text-sm text-gray-600">
                    Display more content with reduced spacing
                  </p>
                </div>
                <button className="text-2xl text-blue-600">
                  <FiToggleLeft />
                </button>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Integrations
            </h2>
            <p className="text-gray-600">
              Connect with other services and platforms
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24">
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path
                        d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10zM10 19.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L8 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-800">Google Drive</h3>
                    <p className="text-sm text-gray-600">
                      Connect for automatic backups
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                    Connect
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24">
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path
                        d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-800">Email Service</h3>
                    <p className="text-sm text-gray-600">
                      Set up email notifications
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-3 py-1 text-sm text-green-600 font-medium">
                    Connected
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24">
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path
                        d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-800">QuickBooks</h3>
                    <p className="text-sm text-gray-600">
                      Sync inventory with accounting
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                    Connect
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24">
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path
                        d="M21 8v8h-3v-8h3zm-6 0v8h-3v-8h3zm-6 0v8H6v-8h3zM3 8v8H0v-8h3z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-800">Slack</h3>
                    <p className="text-sm text-gray-600">
                      Get notifications in Slack
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="md:w-1/4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <nav className="space-y-1">
              <button
                className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-md transition-colors ${
                  activeTab === 'account'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('account')}>
                <FiUser
                  className={
                    activeTab === 'account' ? 'text-blue-600' : 'text-gray-500'
                  }
                />
                <span>Account</span>
              </button>

              <button
                className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-md transition-colors ${
                  activeTab === 'security'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('security')}>
                <FiShield
                  className={
                    activeTab === 'security' ? 'text-blue-600' : 'text-gray-500'
                  }
                />
                <span>Security</span>
              </button>

              <button
                className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-md transition-colors ${
                  activeTab === 'notifications'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('notifications')}>
                <FiBell
                  className={
                    activeTab === 'notifications'
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }
                />
                <span>Notifications</span>
              </button>

              <button
                className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-md transition-colors ${
                  activeTab === 'appearance'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('appearance')}>
                <FiLayout
                  className={
                    activeTab === 'appearance'
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }
                />
                <span>Appearance</span>
              </button>

              <button
                className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-md transition-colors ${
                  activeTab === 'integrations'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('integrations')}>
                <FiShare2
                  className={
                    activeTab === 'integrations'
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }
                />
                <span>Integrations</span>
              </button>
            </nav>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mt-4 border border-blue-100">
            <h3 className="font-medium text-blue-800 mb-2">Need Help?</h3>
            <p className="text-sm text-blue-700 mb-3">
              Contact our support team for assistance with settings.
            </p>
            <button className="w-full py-2 bg-white text-blue-600 text-sm rounded-md border border-blue-200 hover:bg-blue-100 transition-colors">
              Contact Support
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="md:w-3/4 bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;