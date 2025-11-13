#!/usr/bin/env python3
"""
Script to update Pos_NewSale_V2.jsx with Products + Variants merge logic
"""

# Read the current file
with open('src/features/pos/pages/Pos_NewSale_V2.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the section to replace
start_marker = "  // --- Fetch Products using Variants Collection (Real-time Listener) ---"
end_marker = "  // Products are loaded directly from Variants collection - no grouping needed!\n  const filteredProducts = products;"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker) + len(end_marker)

if start_idx == -1 or end_idx == -1:
    print("❌ Could not find markers in file")
    print(f"Start index: {start_idx}")
    print(f"End index: {end_idx}")
    exit(1)

print(f"✅ Found section to replace")
print(f"   Start: {start_idx}")
print(f"   End: {end_idx}")
print(f"   Length: {end_idx - start_idx} characters")

# New implementation
new_implementation = """  // --- Fetch Products from Products (Master) + Variants Collections ---
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
  const filteredProducts = products;"""

# Replace the content
new_content = content[:start_idx] + new_implementation + content[end_idx:]

# Write back
with open('src/features/pos/pages/Pos_NewSale_V2.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ File updated successfully!")
print(f"   Old length: {len(content)} characters")
print(f"   New length: {len(new_content)} characters")
print(f"   Difference: {len(new_content) - len(content)} characters")
print("\n📋 Changes:")
print("   • Now fetches from Products (Master) collection")
print("   • Now fetches from Variants collection")
print("   • Merges them using parentProductId/productId")
print("   • Real-time updates for both collections")
print("\n🎯 Test it now - refresh your browser!")
