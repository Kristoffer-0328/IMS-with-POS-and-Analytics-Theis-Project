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
            subCategory: data.SubCategory || data.subCategory || data.category,
            specifications: data.Specifications || data.specifications || '',
            storageType: data.StorageType || data.storageType || 'Goods',
            // Supplier information
            supplier: {
                name: data.Supplier || data.supplier || 'Unknown',
                code: data.SupplierCode || data.supplierCode || '',
                address: data.SupplierAddress || data.supplierAddress || '',
                contactPerson: data.SupplierContactPerson || data.supplierContactPerson || '',
                phone: data.SupplierPhone || data.supplierPhone || '',
                email: data.SupplierEmail || data.supplierEmail || ''
            },
            // Stock levels
            restockLevel: Number(data.RestockLevel || data.restockLevel || 0),
            maximumStockLevel: Number(data.MaximumStockLevel || data.maximumStockLevel || 0),
            // Location
            location: data.Location || 'STR A1',
            // Additional fields
            imageUrl: data.imageUrl || null,
            measurements: {
                lengthPerUnit: data.LengthPerUnit || null,
                defaultUnit: data.Unit || data.unit || 'pcs'
            },
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
        const normalizedData = this.normalizeProductData(data);
        const productId = this.generateProductId(
            normalizedData.name, 
            normalizedData.category,
            normalizedData.brand
        );
        const timestamp = new Date().toISOString();

        // Create the base product
        const baseProduct = {
            id: productId,
            ...normalizedData,
            variants: [],
            createdAt: timestamp,
            lastUpdated: timestamp
        };

        // Create initial variant
        const initialVariant = this.createVariant(baseProduct, {
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            unit: data.unit,
            location: data.location,
            size: data.Size || data.size,
            specifications: data.Specifications || data.specifications,
            storageType: data.StorageType || data.storageType,
            supplier: {
                name: data.Supplier,
                code: data.SupplierCode
            },
            categoryValues: data.categoryValues || {},
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
            variantData.specifications,
            (parentProduct.variants || []).length
        );

        return {
            id: variantId,
            parentProductId: parentProduct.id,
            name: parentProduct.name,
            brand: parentProduct.brand,
            category: parentProduct.category,
            subCategory: parentProduct.subCategory,
            quantity: Number(variantData.quantity || 0),
            unitPrice: Number(variantData.unitPrice || 0),
            unit: variantData.unit || parentProduct.measurements?.defaultUnit || 'pcs',
            location: variantData.location || 'STR A1',
            storageType: variantData.storageType || 'Goods',
            size: variantData.size || 'default',
            specifications: variantData.specifications || '',
            supplier: variantData.supplier || parentProduct.supplier,
            customFields: variantData.customFields || {},
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