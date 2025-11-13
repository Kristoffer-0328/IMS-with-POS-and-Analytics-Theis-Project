// ==============================================================================
// REPLACEMENT CODE FOR Pos_NewSale_V2.jsx
// Replace lines 136-214 (the entire useEffect for fetching products)
// ==============================================================================

  // --- Fetch Products from Products (Master) + Variants Collections ---
  useEffect(() => {
    setLoadingProducts(true);
    
    const productsRef = collection(db, 'Products');
    const variantsRef = collection(db, 'Variants');
    
    let productsData = [];
    let variantsData = [];
    let unsubscribeProducts = null;
    let unsubscribeVariants = null;
    
    const mergeAndSetProducts = () => {
      console.log('🔄 Merging products and variants...');
      console.log('📦 Products (Master):', productsData.length);
      console.log('📦 Variants:', variantsData.length);
      
      // Group variants by parentProductId
      const variantsByProduct = {};
      variantsData.forEach(variant => {
        const productId = variant.parentProductId || variant.productId;
        if (!variantsByProduct[productId]) {
          variantsByProduct[productId] = [];
        }
        variantsByProduct[productId].push(variant);
      });
      
      console.log('🔗 Variants grouped by product:', Object.keys(variantsByProduct).length, 'products');
      
      // Merge product info with variants
      const mergedProducts = productsData.map(product => {
        const productVariants = variantsByProduct[product.id] || [];
        
        return {
          id: product.id,
          name: product.name,
          image: product.image || product.imageUrl,
          category: product.category || 'Uncategorized',
          brand: product.brand || 'Generic',
          description: product.description,
          // Wrap variants with proper structure
          variants: productVariants.map(v => ({
            variantId: v.id,
            unitPrice: v.unitPrice || 0,
            price: v.unitPrice || 0,
            quantity: v.quantity || 0,
            totalQuantity: v.quantity || 0,
            size: v.size,
            unit: v.unit || v.baseUnit || 'pcs',
            image: v.image || v.imageUrl || product.image,
            storageLocation: v.storageLocation,
            shelfName: v.shelfName,
            rowName: v.rowName
          }))
        };
      }).filter(p => p.variants.length > 0); // Only show products with variants
      
      console.log('✅ Merged products (with variants):', mergedProducts.length);
      
      // Apply filters
      let filtered = mergedProducts;
      
      // Category filter
      if (selectedCategory) {
        filtered = filtered.filter(p => p.category === selectedCategory);
      }
      
      // Brand filter
      if (selectedBrand) {
        filtered = filtered.filter(p => p.brand === selectedBrand);
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
          p.name?.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
        );
      }
      
      console.log('✅ Filtered products:', filtered.length);
      setProducts(filtered);
      setLoadingProducts(false);
    };
    
    // Listen to Products collection (Master data)
    unsubscribeProducts = onSnapshot(
      productsRef,
      (snapshot) => {
        console.log('📦 Products (Master) loaded:', snapshot.size);
        productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        if (variantsData.length > 0) {
          mergeAndSetProducts();
        }
      },
      (error) => {
        console.error('❌ Error loading Products:', error);
        alert('Failed to load products from master collection.');
        setLoadingProducts(false);
      }
    );
    
    // Listen to Variants collection (Stock & Price data)
    unsubscribeVariants = onSnapshot(
      variantsRef,
      (snapshot) => {
        console.log('📦 Variants loaded:', snapshot.size);
        variantsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        if (productsData.length > 0) {
          mergeAndSetProducts();
        }
      },
      (error) => {
        console.error('❌ Error loading Variants:', error);
        alert('Failed to load product variants.');
        setLoadingProducts(false);
      }
    );
    
    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeVariants) unsubscribeVariants();
    };
  }, [searchQuery, selectedCategory, selectedBrand]);

  // Products are merged from Products (Master) + Variants collections
  const filteredProducts = products;

// ==============================================================================
// END OF REPLACEMENT CODE
// ==============================================================================

/* 
INSTRUCTIONS:
1. Open Pos_NewSale_V2.jsx
2. Find line 136: "// --- Fetch Products using Variants Collection"
3. Select from line 136 to line 214 (the entire useEffect + filteredProducts line)
4. Delete the selected lines
5. Paste the code above (lines 7-148) in their place
6. Save the file

WHAT THIS DOES:
- Fetches from Products collection (master data: name, brand, category, image)
- Fetches from Variants collection (stock, price, location)
- Merges them together using parentProductId/productId
- Groups variants under their parent product
- Applies search and filter logic
- Real-time updates when either collection changes

CONSOLE OUTPUT TO VERIFY:
- "🔄 Merging products and variants..."
- "📦 Products (Master): X"
- "📦 Variants: Y"
- "🔗 Variants grouped by product: Z products"
- "✅ Merged products (with variants): W"
- "✅ Filtered products: V"
*/
