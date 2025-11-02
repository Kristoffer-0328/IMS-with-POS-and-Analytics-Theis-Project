import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import NewProductForm from './NewProductForm';
import app from '../../../../../FirebaseConfig';
import { useServices } from '../../../../../services/firebase/ProductServices';

const CategoryModalIndex = ({ CategoryOpen, CategoryClose, onOpenViewProductModal, supplier }) => {
    const { linkProductToSupplier } = useServices();
    const [storageLocations, setStorageLocations] = useState([]);
    const [selectedStorageLocation, setSelectedStorageLocation] = useState(null);
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [unitCapacities, setUnitCapacities] = useState({});
    const [loading, setLoading] = useState(false);
    const db = getFirestore(app);

    useEffect(() => {
        const fetchStorageLocations = async () => {
            try {
                setLoading(true);
                const querySnapshot = await getDocs(collection(db, "Products"));
                const fetchedStorageLocations = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.id,
                    category: doc.data().category
                }));
                setStorageLocations(fetchedStorageLocations);
                
                // Fetch capacity data for each unit
                await fetchUnitCapacities();
            } catch (error) {
                console.error("Error fetching storage locations:", error);
            } finally {
                setLoading(false);
            }
        };

        if (CategoryOpen) {
            fetchStorageLocations();
        }
    }, [CategoryOpen, db]);

    // Calculate unit capacity based on actual products vs total slots
    // UPDATED for new nested structure: Products/{unit}/products/{productId}
    const fetchUnitCapacities = async () => {
        try {
            const capacities = {};
            
            // Define total slots for each unit based on shelf layout
            const unitTotalSlots = {
                'Unit 01': 4 * 8 + 5 * 13 + 6 * 6, // Shelf A (4 cols * 8 rows) + Shelf B (5 cols * 13 rows) + Shelf C (6 cols * 6 rows)
                'Unit 02': 4 * 8, // Shelf A only (4 cols * 8 rows)
                'Unit 03': 4 * 8 + 4 * 8, // Shelf A + Shelf B (4 cols * 8 rows each)
                'Unit 04': 4 * 8 + 4 * 8, // Shelf A + Shelf B (4 cols * 8 rows each)
                'Unit 05': 4 * 8 + 4 * 8, // Shelf A + Shelf B (4 cols * 8 rows each)
                'Unit 06': 4 * 8 + 4 * 8, // Shelf A + Shelf B (4 cols * 8 rows each)
                'Unit 07': 4 * 2 + 4 * 1, // Shelf A (4 cols * 2 rows) + Shelf B (4 cols * 1 row)
                'Unit 08': 4 * 10 + 5 * 20, // Shelf A (4 cols * 10 rows) + Shelf B (5 cols * 20 rows)
                'Unit 09': 4 * 8 + 4 * 8 + 4 * 8 // Shelf A + Shelf B + Shelf C (4 cols * 8 rows each)
            };

            // Fetch products for each unit using NEW NESTED STRUCTURE
            const storageLocationsRef = collection(db, 'Products');
            const storageLocationsSnapshot = await getDocs(storageLocationsRef);
            
            for (const storageLocationDoc of storageLocationsSnapshot.docs) {
                const unitName = storageLocationDoc.id;
                let productCount = 0;
                
                try {
                    // NEW: Simply count products in the products subcollection
                    const productsRef = collection(db, 'Products', unitName, 'products');
                    const productsSnapshot = await getDocs(productsRef);
                    productCount = productsSnapshot.docs.length;
                    
                } catch (error) {
                    console.error(`Error counting products in ${unitName}:`, error);
                }
                
                const totalSlots = unitTotalSlots[unitName] || 100; // Default to 100 if not defined
                const occupancyRate = productCount / totalSlots;
                
                capacities[unitName] = {
                    productCount,
                    totalSlots,
                    occupancyRate,
                    status: getCapacityStatus(occupancyRate)
                };
            }
            
            setUnitCapacities(capacities);
        } catch (error) {
            console.error('Error fetching unit capacities:', error);
        }
    };

    // Determine capacity status based on occupancy rate
    const getCapacityStatus = (occupancyRate) => {
        if (occupancyRate >= 0.9) return 'full';      // 90%+ = full (red)
        if (occupancyRate >= 0.6) return 'occupied';  // 60-89% = occupied (yellow/orange)
        return 'available';                           // <60% = available (green)
    };

    // Get status color for unit
    const getStatusColor = (unitName) => {
        const capacity = unitCapacities[unitName];
        if (!capacity) return 'bg-gray-400'; // Loading or no data
        
        switch (capacity.status) {
            case 'full': return 'bg-red-500';      // 90%+ occupied
            case 'occupied': return 'bg-yellow-500'; // 60-89% occupied  
            case 'available': return 'bg-green-500'; // <60% occupied
            default: return 'bg-gray-400';
        }
    };

    // Get capacity info for tooltip
    const getCapacityInfo = (unitName) => {
        const capacity = unitCapacities[unitName];
        if (!capacity) return 'Loading...';
        
        const percentage = (capacity.occupancyRate * 100).toFixed(1);
        return `${capacity.productCount}/${capacity.totalSlots} slots (${percentage}%)`;
    };

    const handleStorageLocationClick = (storageLocation) => {
        setSelectedStorageLocation(storageLocation);
        setShowAddProductModal(true);
    };

    const handleClose = () => {
        setShowAddProductModal(false);
        setSelectedStorageLocation(null);
        CategoryClose();
    };

    const handleBack = () => {
        setShowAddProductModal(false);
        setSelectedStorageLocation(null);
    };


    if (!CategoryOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm"></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl p-8 animate-scaleUp z-10">
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <span className="text-xl">✕</span>
                </button>

                {!showAddProductModal ? (
                    <>
                        <h2 className="text-center text-2xl font-semibold mb-8 text-gray-800">
                            Select Storage Location
                            <span className="block text-sm text-gray-500 font-normal mt-1">Choose a storage unit to add new product</span>
                        </h2>
                        
                        {/* Storage Facility Map Layout */}
                        <div className="bg-transparent rounded-2xl p-6 relative min-h-[400px] mb-6">
                            <div className="grid grid-cols-7 grid-rows-3 gap-0.5 h-[350px] relative bg-gray-50 border-4 border-slate-800 p-1 w-full">
                                {/* Construction Materials Units 01-05 (Bottom row) */}
                                {storageLocations.filter(loc => ['Unit 01', 'Unit 02', 'Unit 03', 'Unit 04', 'Unit 05'].includes(loc.name)).map((storageLocation, index) => (
                                    <button
                                        key={storageLocation.id}
                                        onClick={() => handleStorageLocationClick(storageLocation)}
                                        className="bg-white border-2 border-slate-800 p-3 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[70px] text-sm hover:bg-blue-50 hover:border-blue-500 border-red-500 bg-red-50 row-start-3"
                                        style={{ gridColumnStart: index + 1 }}
                                        title={`${storageLocation.name} - ${getCapacityInfo(storageLocation.name)}`}
                                    >
                                        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getStatusColor(storageLocation.name)}`}></div>
                                        <div className="text-sm font-bold mb-1 text-slate-800">{storageLocation.name}</div>
                                        <div className="text-xs text-gray-600 font-medium">{storageLocation.category}</div>
                                    </button>
                                ))}
                                
                                {/* Upper units */}
                                {storageLocations.filter(loc => ['Unit 06', 'Unit 07'].includes(loc.name)).map((storageLocation, index) => (
                                    <button
                                        key={storageLocation.id}
                                        onClick={() => handleStorageLocationClick(storageLocation)}
                                        className="bg-white border-2 border-slate-800 p-3 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[70px] text-sm hover:bg-blue-50 hover:border-blue-500 border-orange-500 bg-orange-50"
                                        style={{ 
                                            gridColumnStart: 6, 
                                            gridRowStart: index === 0 ? 1 : 2 
                                        }}
                                        title={`${storageLocation.name} - ${getCapacityInfo(storageLocation.name)}`}
                                    >
                                        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getStatusColor(storageLocation.name)}`}></div>
                                        <div className="text-sm font-bold mb-1 text-slate-800">{storageLocation.name}</div>
                                        <div className="text-xs text-gray-600 font-medium">{storageLocation.category}</div>
                                    </button>
                                ))}
                                
                                {storageLocations.filter(loc => ['Unit 08', 'Unit 09'].includes(loc.name)).map((storageLocation, index) => (
                                    <button
                                        key={storageLocation.id}
                                        onClick={() => handleStorageLocationClick(storageLocation)}
                                        className="bg-white border-2 border-slate-800 p-3 cursor-pointer transition-all duration-200 relative z-10 flex flex-col justify-center items-center text-center min-h-[70px] text-sm hover:bg-blue-50 hover:border-blue-500 border-green-500 bg-green-50"
                                        style={{ 
                                            gridColumnStart: 7, 
                                            gridRowStart: index === 0 ? 1 : 2 
                                        }}
                                        title={`${storageLocation.name} - ${getCapacityInfo(storageLocation.name)}`}
                                    >
                                        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getStatusColor(storageLocation.name)}`}></div>
                                        <div className="text-sm font-bold mb-1 text-slate-800">{storageLocation.name}</div>
                                        <div className="text-xs text-gray-600 font-medium">{storageLocation.category}</div>
                                    </button>
                                ))}
                                
                                {/* Front Desk - Static, non-clickable */}
                                <div className="bg-gray-300 border-2 border-gray-500 p-3 relative z-10 flex flex-col justify-center items-center text-center min-h-[70px] text-sm font-bold row-start-3 col-start-6 col-span-2">
                                    <div className="text-xs text-gray-600 font-medium">Front Desk</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Legend */}
                        <div className="flex justify-center gap-4 mb-4 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/90 rounded-full text-xs font-medium">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>Available (&lt;60%)</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/90 rounded-full text-xs font-medium">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <span>Occupied (60-89%)</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/90 rounded-full text-xs font-medium">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span>Full (90%+)</span>
                            </div>
                            {loading && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full text-xs font-medium">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span>Loading...</span>
                                </div>
                            )}
                        </div>

                        <div className="text-center">
                            <p className="text-sm text-gray-500">
                                Available storage units are pre-configured and cannot be modified.
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="mt-8">
                        <NewProductForm
                            selectedCategory={selectedStorageLocation}
                            onClose={handleClose}
                            onBack={handleBack}
                            supplier={supplier}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryModalIndex;
