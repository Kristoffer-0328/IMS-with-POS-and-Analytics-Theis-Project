/**
 * ProductFactory - Product & Variant Creation
 * 
 * NEW ARCHITECTURE:
 * - Products contain ONLY general information (name, brand, category, image, etc.)
 * - Variants contain stock, price, location, supplier info
 */

export const ProductFactory = {
    generateProductId(productName, category, brand) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const categoryPrefix = category.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'GEN';
        const cleanName = productName.split('(')[0].trim().substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        return `PROD_${categoryPrefix}_${cleanName}_${timestamp}_${random}`;
    },

    generateVariantId(parentProductId, variantName = 'Standard', additionalInfo = '') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const cleanVariantName = variantName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 20);
        const cleanInfo = additionalInfo ? `_${additionalInfo.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10)}` : '';
        return `VAR_${parentProductId}_${cleanVariantName}${cleanInfo}_${timestamp}_${random}`;
    },

    createProduct(data) {
        const timestamp = new Date().toISOString();
        const productId = data.id || this.generateProductId(data.name, data.category, data.brand);

        return {
            id: productId,
            name: data.name,
            brand: data.brand || 'Generic',
            category: data.category,
            measurementType: data.measurementType || 'count',
            baseUnit: data.baseUnit || 'pcs',
            requireDimensions: data.requireDimensions || false,
            description: data.description || '',
            specifications: data.specifications || '',
            imageUrl: data.imageUrl || null,
            totalVariants: 0,
            totalStock: 0,
            lowestPrice: null,
            highestPrice: null,
            createdAt: timestamp,
            lastUpdated: timestamp,
            createdBy: data.createdBy || null,
            categoryValues: data.categoryValues || {},
            customFields: data.customFields || {}
        };
    },

    createVariant(parentProductId, data) {
        const timestamp = new Date().toISOString();
        const variantId = data.id || this.generateVariantId(parentProductId, data.variantName || 'Standard', data.additionalInfo || '');

        // Build variant object with multi-location support
        const variant = {
            id: variantId,
            parentProductId: parentProductId,
            productName: data.productInfo?.name || data.name || '',
            productBrand: data.productInfo?.brand || data.brand || 'Generic',
            productCategory: data.productInfo?.category || data.category || '',
            productImageUrl: data.productInfo?.imageUrl || data.imageUrl || null,
            variantName: data.variantName || 'Standard',
            quantity: Number(data.quantity) || 0,
            safetyStock: Number(data.safetyStock) || 0,
            unitPrice: Number(data.unitPrice) || 0,
            supplierPrice: Number(data.supplierPrice) || 0,
            suppliers: data.suppliers || [],
            measurementType: data.measurementType || 'count',
            baseUnit: data.baseUnit || 'pcs',
            specifications: data.specifications || '',
            categoryValues: data.categoryValues || {},
            customFields: data.customFields || {},
            // Bundle fields
            isBundle: data.isBundle || false,
            piecesPerBundle: data.piecesPerBundle !== undefined && data.piecesPerBundle !== null
                ? Number(data.piecesPerBundle)
                : 0,
            bundlePackagingType: data.bundlePackagingType || 'bundle',
            dateStocked: data.dateStocked || new Date().toISOString().split('T')[0],
            createdAt: timestamp,
            lastUpdated: timestamp,
            createdBy: data.createdBy || null,
            legacyProductId: data.legacyProductId || null
        };

        // Handle multi-location storage
        if (data.locations && Array.isArray(data.locations) && data.locations.length > 0) {
            // NEW: Multi-location support
            variant.multiLocation = data.locations.length > 1;
            variant.locations = data.locations; // Store all locations with their quantities
            
            // For backward compatibility, store first location in legacy fields
            const firstLocation = data.locations[0];
            variant.storageLocation = firstLocation.unit || firstLocation.storageLocation || '';
            variant.shelfName = firstLocation.shelfName || firstLocation.shelf || '';
            variant.rowName = firstLocation.rowName || firstLocation.row || '';
            variant.columnIndex = firstLocation.columnIndex ?? 0;
            variant.fullLocation = firstLocation.location || this.buildFullLocation(firstLocation);
        } else {
            // OLD: Single location (backward compatibility)
            variant.multiLocation = false;
            variant.storageLocation = data.storageLocation || '';
            variant.shelfName = data.shelfName || '';
            variant.rowName = data.rowName || '';
            variant.columnIndex = data.columnIndex ?? 0;
            variant.fullLocation = data.fullLocation || this.buildFullLocation(data);
            
            // Create locations array from single location for consistency
            if (variant.storageLocation) {
                variant.locations = [{
                    unit: variant.storageLocation,
                    shelfName: variant.shelfName,
                    rowName: variant.rowName,
                    columnIndex: variant.columnIndex,
                    quantity: variant.quantity,
                    location: variant.fullLocation
                }];
            }
        }

        return variant;
    },

    buildFullLocation(data) {
        if (!data.storageLocation) return '';
        const parts = [data.storageLocation];
        if (data.shelfName) parts.push(data.shelfName);
        if (data.rowName) parts.push(data.rowName);
        if (data.columnIndex !== undefined) parts.push(`Column ${data.columnIndex + 1}`);
        return parts.join(' - ');
    },

    createLegacyProduct(data) {
        const timestamp = new Date().toISOString();
        return {
            id: data.id || this.generateProductId(data.name, data.category, data.brand),
            name: data.name,
            brand: data.brand || 'Generic',
            category: data.category,
            quantity: Number(data.quantity) || 0,
            unitPrice: Number(data.unitPrice) || 0,
            unit: data.unit || 'pcs',
            storageLocation: data.storageLocation || '',
            shelfName: data.shelfName || '',
            rowName: data.rowName || '',
            columnIndex: data.columnIndex ?? 0,
            fullLocation: data.fullLocation || '',
            specifications: data.specifications || '',
            imageUrl: data.imageUrl || null,
            supplier: data.supplier || { name: 'Unknown', code: '', primaryCode: '' },
            suppliers: data.suppliers || (data.supplier ? [data.supplier] : []),
            supplierPrice: Number(data.supplierPrice) || 0,
            measurementType: data.measurementType || 'count',
            baseUnit: data.baseUnit || 'pcs',
            safetyStock: Number(data.safetyStock) || 0,
            multiLocation: data.multiLocation || false,
            totalQuantityAllLocations: Number(data.totalQuantityAllLocations) || 0,
            categoryValues: data.categoryValues || {},
            customFields: data.customFields || {},
            isBundle: data.isBundle || false,
            piecesPerBundle: data.piecesPerBundle !== undefined && data.piecesPerBundle !== null
                ? Number(data.piecesPerBundle)
                : 0,
            bundlePackagingType: data.bundlePackagingType || 'bundle',
            dateStocked: data.dateStocked || new Date().toISOString().split('T')[0],
            createdAt: data.createdAt || timestamp,
            lastUpdated: data.lastUpdated || timestamp
        };
    }
};

export default ProductFactory;
