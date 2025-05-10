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

    createProduct(data) {
        const baseName = data.ProductName.split('(')[0].trim();
        const productId = this.generateProductId(baseName, data.Category);
        
        return {
            id: productId,
            name: data.ProductName,
            baseProductName: baseName,
            category: data.Category,
            quantity: 0, // Initialize at 0, will be updated with total variant quantities
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
        let size = data.Size;
        if (!size && data.ProductName.includes('(')) {
            const sizeMatch = data.ProductName.match(/\((.*?)\)/);
            size = sizeMatch ? sizeMatch[1] : '';
        }

        const variantId = this.generateVariantId(productId, size, index);
        const quantity = Number(data.Quantity || 0);
        
        return {
            id: variantId,
            baseProductId: productId,
            size: size || "",
            quantity: quantity, // Individual variant quantity
            unitPrice: Number(data.UnitPrice || 0),
            unit: data.Unit || "pcs",
            location: data.Location || null,
            lengthPerUnit: data.LengthPerUnit || null,
            expiringDate: data.ExpiringDate || null,
            totalValue: quantity * Number(data.UnitPrice || 0)
        };
    },

    processCSVData(csvData) {
        const groupedProducts = {};

        csvData.forEach(row => {
            const baseName = row.ProductName.split('(')[0].trim();
            const productKey = this.generateProductId(baseName, row.Category);

            if (!groupedProducts[productKey]) {
                groupedProducts[productKey] = this.createProduct(row);
            }

            const variant = this.createVariant(row, productKey, 
                groupedProducts[productKey].variants.length);
            
            groupedProducts[productKey].variants.push(variant);
            
            // Update product's total quantity by summing all variant quantities
            groupedProducts[productKey].quantity = groupedProducts[productKey].variants.reduce(
                (total, variant) => total + variant.quantity, 
                0
            );
        });

        return Object.values(groupedProducts);
    }
};

export default ProductFactory;