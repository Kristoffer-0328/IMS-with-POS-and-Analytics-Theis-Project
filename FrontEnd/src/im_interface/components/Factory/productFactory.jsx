export const ProductFactory = {
    generateProductId(productName, category) {
        // Remove spaces and special characters, keep alphanumeric only
        const cleanName = productName.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
        const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, '_');
        return `${cleanCategory}-${cleanName}`;
    },

    generateVariantId(productId, size, index) {
        // Handle size with units and parentheses
        const cleanSize = size 
            ? size.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')
            : `variant_${index}`;
        return `${productId}-${cleanSize}`;
    },

    createProduct(data) {
        // Extract base product name without size/unit information
        const baseName = data.ProductName.split('(')[0].trim();
        const productId = this.generateProductId(baseName, data.Category);
        
        return {
            id: productId,
            name: data.ProductName,
            baseProductName: baseName, // Add base name for consistent lookup
            category: data.Category,
            quantity: Number(data.Quantity || 0),
            unitPrice: Number(data.UnitPrice || 0),
            location: data.Location || null,
            variants: [],
            image: null,
            lastUpdated: new Date().toISOString(),
            measurements: {
                lengthPerUnit: data.LengthPerUnit || null,
                defaultUnit: data.Unit || "pcs"
            }
        };
    },

    createVariant(data, productId, index) {
        // Extract size from product name if not explicitly provided
        let size = data.Size;
        if (!size && data.ProductName.includes('(')) {
            const sizeMatch = data.ProductName.match(/\((.*?)\)/);
            size = sizeMatch ? sizeMatch[1] : '';
        }

        const variantId = this.generateVariantId(productId, size, index);
        
        return {
            id: variantId,
            baseProductId: productId,
            size: size || "",
            quantity: Number(data.Quantity || 0),
            unitPrice: Number(data.UnitPrice || 0),
            unit: data.Unit || "pcs",
            location: data.Location || null,
            lengthPerUnit: data.LengthPerUnit || null,
            expiringDate: data.ExpiringDate || null,
            totalValue: Number(data.TotalValue || 0)
        };
    },

    processCSVData(csvData) {
        const groupedProducts = {};

        csvData.forEach(row => {
            // Use base product name for grouping
            const baseName = row.ProductName.split('(')[0].trim();
            const productKey = this.generateProductId(baseName, row.Category);

            if (!groupedProducts[productKey]) {
                groupedProducts[productKey] = this.createProduct(row);
            }

            const variant = this.createVariant(row, productKey, 
                groupedProducts[productKey].variants.length);
            groupedProducts[productKey].variants.push(variant);

            // Update total quantity and price if no variants
            if (groupedProducts[productKey].variants.length === 1) {
                groupedProducts[productKey].unitPrice = Number(row.UnitPrice || 0);
            }
            groupedProducts[productKey].quantity += Number(row.Quantity || 0);
        });

        return Object.values(groupedProducts);
    }
};

export default ProductFactory;