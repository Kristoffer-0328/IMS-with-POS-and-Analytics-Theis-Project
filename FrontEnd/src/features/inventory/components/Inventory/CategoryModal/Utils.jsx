export const validateProduct = (productData) => {
    if (!productData) {
        return {
            isValid: false,
            errors: ['No product data provided']
        };
    }

    const errors = [];
    
    // Check required fields
    if (!productData.name?.trim()) errors.push("Product name is required");
    if (!productData.quantity && productData.quantity !== 0) errors.push("Quantity is required");
    if (!productData.unitPrice && productData.unitPrice !== 0) errors.push("Unit price is required");
    if (!productData.category?.name) errors.push("Category is required");

    // Validate numeric fields
    if (isNaN(Number(productData.quantity)) || Number(productData.quantity) < 0) {
        errors.push("Quantity must be a valid positive number");
    }
    if (isNaN(Number(productData.unitPrice)) || Number(productData.unitPrice) < 0) {
        errors.push("Unit price must be a valid positive number");
    }

    // Check category-specific required fields
    const categoryFields = defaultCategoryFields[productData.category?.name]?.fields || [];
    categoryFields.forEach(field => {
        if (!field.optional && !productData[field.name]) {
            errors.push(`${field.name.charAt(0).toUpperCase() + field.name.slice(1)} is required`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

export const getStorageOptions = () => {
    const storageOptions = [];

    for (let i = 1; i <= 9; i++) {
        storageOptions.push(`Unit ${i}`);
    }
    return storageOptions;
};

export const defaultCategoryFields = {
    'Cement': {
        fields: [
            {
                name: 'weight',
                type: 'select',
                options: ['25kg', '40kg', '50kg'],
                optional: false,
                editable: true
            },
            {
                name: 'type',
                type: 'select',
                options: ['Portland', 'Masonry', 'Quick-dry'],
                optional: false,
                editable: true
            }
        ]
    },
    'Plumbing': {
        fields: [
            {
                name: 'size',
                type: 'select',
                options: ['1/2 inch', '3/4 inch', '1 inch'],
                optional: false,
                editable: true
            }
        ]
    }
    
};

export const getCategorySpecificFields = (categoryName) => {
    const fields = defaultCategoryFields[categoryName]?.fields || [];
    // Deep clone the fields to prevent modifying the original object
    return fields.map(field => ({
        ...field,
        options: [...(field.options || [])]
    }));
};

export const updateCategoryField = async (categoryName, fieldName, updates) => {
    try {
        const db = getFirestore();
        const categoryRef = doc(db, 'CategoryFields', categoryName);
        
        await setDoc(categoryRef, {
            [fieldName]: updates
        }, { merge: true });
        
        return true;
    } catch (error) {
        console.error('Error updating category field:', error);
        return false;
    }
};

export const getCategoryFields = async (categoryName) => {
    try {
        const db = getFirestore();
        const categoryRef = doc(db, 'CategoryFields', categoryName);
        const categoryDoc = await getDoc(categoryRef);
        
        if (categoryDoc.exists()) {
            return categoryDoc.data();
        }
        
        // If no custom fields exist, return default fields
        return defaultCategoryFields[categoryName]?.fields || [];
    } catch (error) {
        console.error('Error getting category fields:', error);
        return [];
    }
};

export const updateFieldOptions = async (categoryName, fieldName, options) => {
    try {
        const db = getFirestore();
        const fieldRef = doc(db, 'CategoryFields', categoryName, 'Fields', fieldName);
        
        await setDoc(fieldRef, {
            options: options
        }, { merge: true });
        
        return true;
    } catch (error) {
        console.error('Error updating field options:', error);
        return false;
    }
};
