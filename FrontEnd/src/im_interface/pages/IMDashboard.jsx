
import React, { useState, useEffect } from 'react'; 
import {
  FiTrendingUp,
  FiTrendingDown,
  FiPackage,
  FiAlertTriangle,
  FiRefreshCw,
  FiBell,
} from 'react-icons/fi';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import DashboardBarChart from '../components/Dashboard/DashboardBarChart';
import { useServices } from '../../FirebaseBackEndQuerry/ProductServices';

const IMDashboard = () => {
  const [currentMonth, setCurrentMonth] = useState('October');
  const { getData } = useServices(); 
  const [products, setProduct] = useState([]);
  const [lowStock, setLowstock] = useState([]);
  
   useEffect(() => {
      const fetchData = async () => {
        const res = await getData();  
      
        if (res.success) {
          
          setProduct(res.product);
  
        } else {
          console.error('Failed to fetch products:', res.error);
        }
      };
      let items =[];
      products.forEach(e => {
        if(e.quantity <= 60) {

          items.push(e.size);
        }
      });
      
      
      fetchData();
      setLowstock(items.size);
    }, [getData]);
  
  
    const chartData = products.map((p) => {
      let color = '#4779FF'; 
      if (p.quantity <= 40) {
        color = '#FF4D4D'; 
      } else if (p.quantity <= 60) {
        color = '#FFC554'; 
      }
    
      return {
        name: p.name,
        value: p.quantity,
        color,
      };
    });
  const stockMovements = [
   
  ];
  
  // Array of all months for the dropdown
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const total_stock = 2940;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 bg-gray-50">
      {/* Use the new DashboardHeader component */}
      <DashboardHeader />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {/* Total Stock */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm mb-1">Total Stock</p>
              <h3 className="text-2xl font-bold text-gray-800">{products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)} Items</h3>
              <div className="flex items-center text-red-500 text-xs mt-1">
                <FiTrendingDown className="mr-1" />
                <span>null</span>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <FiPackage className="text-green-500" size={24} />
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm mb-1">Low - Stock Items</p>
              <h3 className="text-2xl font-bold text-gray-800">{lowStock} Items</h3>
              <div className="flex items-center text-red-500 text-xs mt-1">
                <FiAlertTriangle className="mr-1" />
                <span className="font-medium">Critical Stock</span>
              </div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <FiAlertTriangle className="text-amber-500" size={24} />
            </div>
          </div>
        </div>

        {/* Pending Restocks */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm mb-1">Pending Restocks</p>
              <h3 className="text-2xl font-bold text-gray-800"> Requests</h3>
              <div className="flex items-center text-green-500 text-xs mt-1">
                <FiTrendingUp className="mr-1" />
                {/* <span>+2 From Yesterday</span> */}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <FiBell className="text-blue-500" size={24} />
            </div>
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm mb-1">Total Sales</p>
              <h3 className="text-2xl font-bold text-gray-800">
                 Ongoing Transfers
              </h3>
              <div className="flex items-center text-red-500 text-xs mt-1">
                <FiTrendingDown className="mr-1" />
                {/* <span>4.3% Down from yesterday</span> */}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <FiRefreshCw className="text-purple-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Chart - Using new enhanced chart component */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-gray-800 font-semibold">Glory Star Hardware</h3>
            
          </div>
        </div>

        {/* Use the enhanced chart component */}
        <DashboardBarChart data={chartData} />  
      </div>

      {/* Stock Movement Log */}
      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-gray-800 font-semibold">Stock Movement Log</h3>
          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}>
              {/* Map through all months */}
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
              <option value="all">All Time</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {stockMovements.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.from}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.to}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full capitalize
                      ${
                        item.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IMDashboard;
