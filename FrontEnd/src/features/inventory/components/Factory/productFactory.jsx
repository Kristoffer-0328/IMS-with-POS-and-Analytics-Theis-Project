export const ProductFactory = {
    generateSupplierProductId(productName, category, supplierCode) {
        const timestamp = new Date().getTime().toString().slice(-4);
        const cleanName = productName.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
        const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, '_');
        return `${supplierCode}-${cleanCategory}-${cleanName}-${timestamp}`;
    },

    generateProductId(productName, category, brand) {
        const cleanName = productName.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
        const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanBrand = brand.replace(/[^a-zA-Z0-9]/g, '_');
        return `${cleanCategory}-${cleanBrand}-${cleanName}`;
    },

    generateVariantId(productId, size, specifications, index) {
        const cleanSize = size 
            ? size.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')
            : `variant_${index}`;
        const cleanSpecs = specifications
            ? `-${specifications.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15)}`
            : '';
        return `${productId}-${cleanSize}${cleanSpecs}`;
    },

    normalizeProductData(data) {
        return {
            name: data.ProductName || data.name,
            brand: data.Brand || data.brand || 'Generic',
            category: data.Category || data.category,
            
            // NEW: Storage location fields (nested structure)
            storageLocation: data.storageLocation || data.Location || '',
            shelfName: data.shelfName || '',
            rowName: data.rowName || '',
            columnIndex: data.columnIndex ?? 0,
            fullLocation: data.fullLocation || '',
            location: data.location || data.Location || '', // Backward compatibility
            
            specifications: data.Specifications || data.specifications || '',
            
            // Supplier information
            supplier: {
                name: data.Supplier || data.supplier?.name || 'Unknown',
                code: data.SupplierCode || data.supplier?.code || '',
                primaryCode: data.supplier?.primaryCode || data.SupplierCode || ''
            },
            
            // Stock levels
            restockLevel: Number(data.RestockLevel || data.restockLevel || 0),
            maximumStockLevel: Number(data.MaximumStockLevel || data.maximumStockLevel || 0),
            
            // Product details
            imageUrl: data.imageUrl || null,
            size: data.Size || data.size || 'default',
            unit: data.Unit || data.unit || 'pcs',
            
            customFields: {
                ...(data.TotalValue && { totalValue: Number(data.TotalValue) }),
                ...(data.specifications && { specifications: data.specifications })
            },
            
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            
            categoryValues: {
                ...(data.Size && { size: data.Size }),
                ...(data.categoryValues || {})
            }
        };
    },

    createProduct(data) {
        const timestamp = new Date().toISOString();

        // Create flat product structure - NO VARIANTS
        const product = {
            id: data.id || this.generateProductId(data.name, data.category, data.brand),
            name: data.name,
            brand: data.brand || 'Generic',
            category: data.category,
            quantity: Number(data.quantity) || 0,
            unitPrice: Number(data.unitPrice) || 0,
            unit: data.unit || 'pcs',
            
            // NEW: Storage location fields (nested structure compatible)
            storageLocation: data.storageLocation || '',
            shelfName: data.shelfName || '',
            rowName: data.rowName || '',
            columnIndex: data.columnIndex ?? 0, // 0-based index
            fullLocation: data.fullLocation || '',
            location: data.location || data.storageLocation || '', // Backward compatibility
            
            // Stock levels
            restockLevel: Number(data.restockLevel) || 0,
            maximumStockLevel: Number(data.maximumStockLevel) || 0,
            
            // Product details
            size: data.size || 'default',
            specifications: data.specifications || '',
            imageUrl: data.imageUrl || null,
            
            // Supplier information
            supplier: data.supplier || {
                name: 'Unknown',
                code: '',
                primaryCode: ''
            },
            
            // Additional fields
            categoryValues: data.categoryValues || {},
            customFields: data.customFields || {},
            
            // Flat structure flags
            isVariant: data.isVariant || false,
            parentProductId: data.parentProductId || null,
            variantName: data.variantName || 'Standard',
            
            // Timestamps
            dateStocked: data.dateStocked || new Date().toISOString().split('T')[0],
            createdAt: data.createdAt || timestamp,
            lastUpdated: data.lastUpdated || timestamp
        };

        return product;
    },

    createVariant(parentProduct, variantData) {
        const variantId = this.generateVariantId(
            parentProduct.id, 
            variantData.size || 'default',
            variantData.specifications,
            0 // Index not needed for flat structure
        );

        return {
            id: variantId,
            parentProductId: parentProduct.id,
            name: parentProduct.name,
            brand: parentProduct.brand,
            category: parentProduct.category,
            quantity: Number(variantData.quantity || 0),
            unitPrice: Number(variantData.unitPrice || 0),
            unit: variantData.unit || 'pcs',
            
            // NEW: Storage location fields (nested structure compatible)
            storageLocation: variantData.storageLocation || parentProduct.storageLocation || '',
            shelfName: variantData.shelfName || parentProduct.shelfName || '',
            rowName: variantData.rowName || parentProduct.rowName || '',
            columnIndex: variantData.columnIndex ?? parentProduct.columnIndex ?? 0,
            fullLocation: variantData.fullLocation || parentProduct.fullLocation || '',
            location: variantData.location || variantData.storageLocation || '', // Backward compatibility
            
            size: variantData.size || 'default',
            specifications: variantData.specifications || '',
            supplier: variantData.supplier || parentProduct.supplier,
            customFields: variantData.customFields || {},
            imageUrl: variantData.imageUrl || parentProduct.imageUrl || null,
            
            // Flat structure flags
            isVariant: true,
            variantName: variantData.size || variantData.specifications || 'Variant',
            
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    },

    processCSVData(csvData) {
        const groupedProducts = {};
        const timestamp = new Date().toISOString();

        csvData.forEach(row => {
            const productKey = this.generateProductId(row.ProductName, row.Category, row.Brand);

            if (!groupedProducts[productKey]) {
                const normalizedData = this.normalizeProductData(row);
                groupedProducts[productKey] = {
                    id: productKey,
                    ...normalizedData,
                    variants: [],
                    quantity: 0,
                    createdAt: timestamp,
                    lastUpdated: timestamp
                };
            }

            // Create variant with enhanced CSV data structure
            const variant = this.createVariant(groupedProducts[productKey], {
                quantity: row.Quantity,
                unitPrice: row.UnitPrice,
                unit: row.Unit,
                location: row.Location,
                storageType: row.StorageType,
                size: row.Size,
                specifications: row.Specifications,
                supplier: {
                    name: row.Supplier,
                    code: row.SupplierCode
                },
                categoryValues: {
                    lengthPerUnit: row.LengthPerUnit,
                    specifications: row.Specifications,
                    ...(row.TotalValue && { totalValue: Number(row.TotalValue) })
                },
                createdAt: timestamp,
                lastUpdated: timestamp
            });

            groupedProducts[productKey].variants.push(variant);
            
            // Update total quantity
            groupedProducts[productKey].quantity = groupedProducts[productKey].variants
                .reduce((total, variant) => total + Number(variant.quantity), 0);
            groupedProducts[productKey].lastUpdated = timestamp;
        });

        return Object.values(groupedProducts);
    }
};

export default ProductFactory;
