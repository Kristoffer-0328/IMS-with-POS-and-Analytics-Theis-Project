export const ProductFactory = {
    generateProductId(productName, category) {
        const cleanName = productName.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
        const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, '_');
        return `${cleanCategory}-${cleanName}`;
    },

    generateVariantId(productId, size, index) {
        const cleanSize = size 
            ? size.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')
            : `variant_${index}`;
        return `${productId}-${cleanSize}`;
    },

    normalizeProductData(data) {
        return {
            name: data.ProductName || data.name,
            category: data.Category || data.category?.name,
            // Make sure these are properly set
            restockLevel: Number(data.RestockLevel || data.restockLevel || 0),
            maximumStockLevel: Number(data.MaximumStockLevel || data.maximumStockLevel || 0),
            imageUrl: data.imageUrl || null,
            measurements: {
                lengthPerUnit: data.LengthPerUnit || null,
                defaultUnit: data.Unit || data.unit || 'pcs'
            },
            customFields: {
                ...(data.TotalValue && { totalValue: Number(data.TotalValue) }),
                ...(data.ExpiringDate && { expiringDate: data.ExpiringDate })
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
        const normalizedData = this.normalizeProductData(data);
        const productId = this.generateProductId(normalizedData.name, normalizedData.category);
        const timestamp = new Date().toISOString();

        // Create the base product with general attributes only
        const baseProduct = {
            id: productId,
            ...normalizedData,
            variants: [],
            createdAt: timestamp,
            lastUpdated: timestamp
        };

        // Create initial variant with variant-specific attributes
        const initialVariant = this.createVariant(baseProduct, {
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            unit: data.unit,
            location: data.location,
            size: data.categoryValues?.weight,
            type: data.categoryValues?.type,
            categoryValues: Object.entries(data.categoryValues || {})
                .reduce((acc, [key, value]) => {
                    if (key !== 'weight' && key !== 'type') {
                        acc[key] = value;
                    }
                    return acc;
                }, {}),
            createdAt: timestamp,
            lastUpdated: timestamp
        });

        baseProduct.variants = [initialVariant];
        baseProduct.quantity = initialVariant.quantity;

        return baseProduct;
    },

    createVariant(parentProduct, variantData) {
        const variantId = this.generateVariantId(
            parentProduct.id, 
            variantData.size || 'default',
            (parentProduct.variants || []).length
        );

        // Variant-specific attributes
        return {
            id: variantId,
            parentProductId: parentProduct.id,
            name: parentProduct.name,
            category: parentProduct.category,
            quantity: Number(variantData.quantity || 0),
            unitPrice: Number(variantData.unitPrice || 0),
            unit: variantData.unit || parentProduct.measurements?.defaultUnit || 'pcs',
            location: variantData.location || 'STR A1',
            size: variantData.size || 'default',
            type: variantData.type || null,
            // Include remaining category values, excluding weight and type
            ...(variantData.categoryValues || {}),
            customFields: variantData.customFields || {},
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    },

    processCSVData(csvData) {
        const groupedProducts = {};
        const timestamp = new Date().toISOString();

        csvData.forEach(row => {
            const productKey = this.generateProductId(row.ProductName, row.Category);

            if (!groupedProducts[productKey]) {
                const normalizedData = this.normalizeProductData(row);
                groupedProducts[productKey] = {
                    id: productKey,
                    ...normalizedData,
                    variants: [],
                    quantity: 0,
                    maxStock: Number(row.MaximumStockLevel || 0), // Add maxStock field
                    createdAt: timestamp,
                    lastUpdated: timestamp
                };
            }

            // Create variant with CSV data structure
            const variant = this.createVariant(groupedProducts[productKey], {
                quantity: row.Quantity,
                unitPrice: row.UnitPrice,
                unit: row.Unit,
                location: row.Location,
                size: row.Size || 'default',  // Use direct Size column
                categoryValues: {
                    lengthPerUnit: row.LengthPerUnit,
                    ...(row.ExpiringDate && { expiringDate: row.ExpiringDate }),
                    ...(row.TotalValue && { totalValue: Number(row.TotalValue) })
                },
                createdAt: timestamp,
                lastUpdated: timestamp
            });

            groupedProducts[productKey].variants.push(variant);
            
            // Update total quantity and timestamp
            groupedProducts[productKey].quantity = groupedProducts[productKey].variants
                .reduce((total, variant) => total + Number(variant.quantity), 0);
            groupedProducts[productKey].lastUpdated = timestamp;
        });

        return Object.values(groupedProducts);
    }
};

export default ProductFactory;