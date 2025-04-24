import React, { useState, useEffect } from 'react';
import InventoryHeader from '../components/Inventory/InventoryHeader';
import InventoryChart from '../components/Inventory/InventoryChart';
import InventoryTrendChart from '../components/Inventory/InventoryTrendChart';
import InventoryTable from '../components/Inventory/InventoryTable';
import InventoryFilters from '../components/Inventory/InventoryFilters';
import AddProductModal from '../components/Inventory/AddProductPopUp';
import { useServices } from '../../FirebaseBackEndQuerry/ProductServices';
import { FiPlusCircle, FiUpload } from 'react-icons/fi';
import ImportCVGModal from '../components/Inventory/ImportCVGModal';

const Inventory = () => {
  const [currentFilter, setCurrentFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStorageRoom, setSelectedStorageRoom] = useState('all');
  const [selectedChart, setSelectedChart] = useState('Stock Level');
  const [currentMonth, setCurrentMonth] = useState('October');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setImportIsModalOpen] = useState(false);
  const { listenToProducts } = useServices();
  const [products, setProduct] = useState([]);

  useEffect(() => {
    const unsubscribe = listenToProducts(setProduct);
    return () => unsubscribe();
  }, []);
  
const monthlyInventoryData = [
  { name: 'Jan', value: 1250 },
  { name: 'Feb', value: 1320 },
  { name: 'Mar', value: 800 },  // Lower stock in March
  { name: 'Apr', value: 1400 },
  { name: 'May', value: 1345 },
  { name: 'Jun', value: 950 },  // Lower stock in June
  { name: 'Jul', value: 1420 },
  { name: 'Aug', value: 1380 },
  { name: 'Sep', value: 1440 },
  { name: 'Oct', value: 1555 },
  { name: 'Nov', value: 720 },  // Lower stock in November
  { name: 'Dec', value: 1600 },
];

  

  const getFilteredData = () => {
    let filtered = [...products];
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }
    if (currentFilter === 'low-stock') {
      filtered = filtered.filter((item) => item.status === 'low-stock');
    } else if (currentFilter === 'expiring-soon') {
      filtered = filtered.filter((item) => item.status === 'expiring-soon');
    }
    if (selectedStorageRoom !== 'all') {
      filtered = filtered.filter((item) => item.location === selectedStorageRoom);
    }
    return filtered;
  };

  const chartData = getFilteredData().map((p) => {
    let color = '#4779FF';
    if (p.quantity <= 40) color = '#FF4D4D';
    else if (p.quantity <= 60) color = '#FFC554';

    return {
      name: p.name,
      value: p.quantity,
      color,
    };
  });

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 bg-gray-50">
      <InventoryHeader />

      <div className="bg-gradient-to-r from-orange-100/80 to-amber-100/30 rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
            <p className="text-gray-600">View & Update Stock Levels</p>
          </div>
          <div className="w-full md:w-auto">
            <InventoryFilters
              currentFilter={currentFilter}
              setCurrentFilter={setCurrentFilter}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedStorageRoom={selectedStorageRoom}
              setSelectedStorageRoom={setSelectedStorageRoom}
              selectedChart={selectedChart}
              setSelectedChart={setSelectedChart}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
          <div>
            <h3 className="text-gray-800 font-semibold">Glory Star Hardware</h3>
            <p className="text-xl font-bold">
              Total Stock: {products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)}
            </p>
          </div>
        </div>

        {selectedChart === 'Stock Level' ? (
          <InventoryChart data={chartData} />
        ) : selectedChart === 'Stock Trend' ? (
          <InventoryTrendChart data={monthlyInventoryData} />
        ) : null}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="text-gray-800 font-semibold">Inventory Table</h3>
          <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
            <button
              onClick={() => setImportIsModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto"
            >
              <FiUpload size={18} />
              <span>Import Excel</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto"
            >
              <FiPlusCircle size={18} />
              <span>Add product</span>
            </button>
            
          </div>
        </div>

        <div className="overflow-x-auto">
          <InventoryTable className="bg-opacity-50 w-full" data={getFilteredData()} />
        </div>
      </div>

      <ImportCVGModal isOpen={isImportModalOpen} onClose={() => setImportIsModalOpen(false)} />
      <AddProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Inventory;
