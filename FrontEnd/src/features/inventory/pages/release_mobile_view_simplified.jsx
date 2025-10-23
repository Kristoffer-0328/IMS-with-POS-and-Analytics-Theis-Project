// Simplified inventory deduction logic
// This replaces the complex variant detection with direct transaction data usage

const simplifiedInventoryDeduction = async (product, location, deductQty, transaction, currentUser) => {
  const productData = location.productData;
  
  
  // Check if this is a variant product based on transaction data
  const isVariantProduct = product.variantId && product.variantId !== product.productId;
  
  if (isVariantProduct) {
    // This is a variant product - update the specific variant
    
    // Check if product has variants array
    const hasVariants = productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0;
    
    if (hasVariants) {
      // Find the variant by matching the variantId from transaction
      const variantIndex = productData.variants.findIndex(v => 
        v.id === product.variantId || 
        v.variantId === product.variantId ||
        v.size === product.variantId || 
        String(v.size) === String(product.variantId) ||
        (v.name && v.name === product.name)
      );
      
      if (variantIndex !== -1) {
        const variants = [...productData.variants];
        const variant = variants[variantIndex];
        const currentQty = Number(variant.quantity) || 0;
        const newQty = currentQty - deductQty;
        
        
        // Validate that we're not going negative (unless it's a quotation product)
        const isQuotationProduct = product.productId && product.productId.startsWith('quotation-');
        if (newQty < 0 && !isQuotationProduct) {
          throw new Error(`Insufficient stock for variant ${variant.size || variant.name}. Available: ${currentQty}, Requested: ${deductQty}`);
        }
        
        // Update the variant quantity
        variants[variantIndex] = {
          ...variant,
          quantity: Math.max(0, newQty) // Ensure we don't go below 0
        };
        
        // Update the product document with modified variants
        transaction.update(location.productRef, {
          variants: variants, 
          lastUpdated: serverTimestamp()
        });

        // Check for low stock on variant
        const restockLevel = variant.restockLevel || productData.restockLevel || productData.reorderPoint || 10;
        if (newQty <= restockLevel) {
          
          // Generate restock request using the centralized function with updated product data
          const updatedProductData = { ...productData, variants };
          await generateRestockingRequest(updatedProductData, variantIndex, location.location, currentUser);
        }
      } else {
        console.warn(`⚠️ Variant not found in product data, falling back to base product update`);
        // Fallback to base product update
        const currentQty = Number(productData.quantity) || 0;
        const newQty = currentQty - deductQty;
        
        
        transaction.update(location.productRef, {
          quantity: Math.max(0, newQty),
          lastUpdated: serverTimestamp()
        });
      }
    } else {
      console.warn(`⚠️ Product has no variants array, falling back to base product update`);
      // Fallback to base product update
      const currentQty = Number(productData.quantity) || 0;
      const newQty = currentQty - deductQty;
      
      
      transaction.update(location.productRef, {
        quantity: Math.max(0, newQty),
        lastUpdated: serverTimestamp()
      });
    }
  } else {
    // This is a non-variant product - update base product quantity
    
    const currentQty = Number(productData.quantity) || 0;
    const newQty = currentQty - deductQty;


    // Validate that we're not going negative (unless it's a quotation product)
    const isQuotationProduct = product.productId && product.productId.startsWith('quotation-');
    if (newQty < 0 && !isQuotationProduct) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${currentQty}, Requested: ${deductQty}`);
    }

    // Update product quantity
    transaction.update(location.productRef, {
      quantity: Math.max(0, newQty), // Ensure we don't go below 0
      lastUpdated: serverTimestamp()
    });

    // Generate restock request if quantity is low
    const restockLevel = productData.restockLevel || productData.reorderPoint || 10;
    if (newQty <= restockLevel) {
      
      // Generate restock request using the centralized function with updated product data
      const updatedProductData = { ...productData, quantity: newQty };
      await generateRestockingRequest(updatedProductData, -1, location.location, currentUser);
    }
  }
};

export default simplifiedInventoryDeduction;
