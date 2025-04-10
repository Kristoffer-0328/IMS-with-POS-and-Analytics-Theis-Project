import React, { useState, useEffect } from 'react';
import InventoryHeader from '../components/Inventory/InventoryHeader';
import InventoryChart from '../components/Inventory/InventoryChart';
import InventoryTable from '../components/Inventory/InventoryTable';
import InventoryFilters from '../components/Inventory/InventoryFilters';
import AddProductModal from '../components/Inventory/AddProductPopUp';
import { useServices } from '../../FirebaseBackEndQuerry/ProductServices';
import { FiPlusCircle , FiUpload } from 'react-icons/fi';
import ImportCVGModal from '../components/Inventory/ImportCVGModal';

const Inventory = () => {
  
  const [currentFilter, setCurrentFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStorageRoom, setSelectedStorageRoom] = useState('all');
  const [currentMonth, setCurrentMonth] = useState('October');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setImportIsModalOpen] = useState(false);
  const { getData } = useServices(); 
  const [products, setProduct] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await getData();  
    
      if (res.success) {
        setProduct(res.product);
      } else {
        console.error('Failed to fetch products:', res.error);
      }
    };

    fetchData();
  }, [getData]);

  const getFilteredData = () => {
    let filtered = [...products];

    // Filter by selected category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Filter by current filter (low-stock or expiring-soon)
    if (currentFilter === 'low-stock') {
      filtered = filtered.filter((item) => item.status === 'low-stock');
    } else if (currentFilter === 'expiring-soon') {
      filtered = filtered.filter((item) => item.status === 'expiring-soon');
    }

    // Filter by storage room
    if (selectedStorageRoom !== 'all') {
      filtered = filtered.filter((item) => item.location === selectedStorageRoom);
    }

    return filtered;
  };

  const chartData = getFilteredData().map((p) => {
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

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 bg-gray-50">
      <InventoryHeader />

      <div className="bg-gradient-to-r from-orange-100/80 to-amber-100/30 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
            <p className="text-gray-600">View & Update Stock Levels</p>
          </div>
          <InventoryFilters
            currentFilter={currentFilter}
            setCurrentFilter={setCurrentFilter}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedStorageRoom={selectedStorageRoom}
            setSelectedStorageRoom={setSelectedStorageRoom}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-gray-800 font-semibold">Glory Star Hardware</h3>
            <p className="text-xl font-bold">
              Total Stock: {products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)}
            </p>
          </div>
        </div>

        <InventoryChart data={chartData} />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-gray-800 font-semibold">Inventory Table</h3>
          <div className="flex gap-4 relative">
            <button
              onClick={() => setImportIsModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
              <FiUpload size={18} />
              <span>Import Excel</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
              <FiPlusCircle size={18} />
              <span>Add product</span>
            </button>
            <select
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}>
              <option>October</option>
              <option>September</option>
              <option>August</option>
            </select>
          </div>
        </div>
        

        <InventoryTable className="bg-opacity-50" data={getFilteredData()} />
      </div>

      <ImportCVGModal
        isOpen={isImportModalOpen}
        onClose={() => setImportIsModalOpen(false)}
      />
      <AddProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Inventory;
