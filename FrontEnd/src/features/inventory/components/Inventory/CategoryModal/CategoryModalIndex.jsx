import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import NewProductForm_GeneralInfo from './NewProductForm_GeneralInfo';
import app from '../../../../../FirebaseConfig';
import { useServices } from '../../../../../services/firebase/ProductServices';

const CategoryModalIndex = ({ CategoryOpen, CategoryClose, onOpenViewProductModal, supplier }) => {
    const { linkProductToSupplier } = useServices();
    const [storageLocations, setStorageLocations] = useState([]);
    const [unitCapacities, setUnitCapacities] = useState({});
    const [loading, setLoading] = useState(false);
    const db = getFirestore(app);

    useEffect(() => {
        const fetchStorageLocations = async () => {
            try {
                setLoading(true);
                
                // Define storage units with their categories (static configuration)
                const storageUnitsConfig = [
                    { id: 'Unit 01', name: 'Unit 01', category: 'Steel & Heavy Materials' },
                    { id: 'Unit 02', name: 'Unit 02', category: 'Plywood & Sheet Materials' },
                    { id: 'Unit 03', name: 'Unit 03', category: 'Cement & Aggregates' },
                    { id: 'Unit 03 Yard', name: 'Unit 03 Yard', category: 'Cement & Aggregates' },
                    { id: 'Unit 04', name: 'Unit 04', category: 'Roofing Materials' },
                    { id: 'Unit 05', name: 'Unit 05', category: 'Electrical & Plumbing' },
                    { id: 'Unit 06', name: 'Unit 06', category: 'Paint & Coatings' },
                    { id: 'Unit 07', name: 'Unit 07', category: 'Insulation & Foam' },
                    { id: 'Unit 08', name: 'Unit 08', category: 'Hardware & Fasteners' },
                    { id: 'Unit 09', name: 'Unit 09', category: 'Miscellaneous' },
                ];
                
                setStorageLocations(storageUnitsConfig);
                
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
                'Unit 03 Yard': 10000, // Large bulk storage area for raw cement in m³
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

    const handleClose = () => {
        CategoryClose();
    };

    const handleProductCreated = (product) => {
        // After product is created, close modal and open ViewProductModal on Variants tab
        handleClose();
        if (onOpenViewProductModal) {
            onOpenViewProductModal(product, 'variants');
        }
    };


    if (!CategoryOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm"></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden animate-scaleUp z-10">
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-20"
                >
                    <span className="text-xl">✕</span>
                </button>

                <NewProductForm_GeneralInfo
                    storageLocations={storageLocations}
                    unitCapacities={unitCapacities}
                    onClose={handleClose}
                    onProductCreated={handleProductCreated}
                />
            </div>
        </div>
    );
};

export default CategoryModalIndex;
