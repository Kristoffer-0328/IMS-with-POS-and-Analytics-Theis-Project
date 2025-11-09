// Script to find and list old Products/{Unit}/products/{id} data
// This will help you see what's in the old structure before deleting

import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import app from './src/FirebaseConfig.js';

const db = getFirestore(app);

/**
 * STEP 1: List all old products in nested structure
 */
async function listOldProducts() {
  console.log('🔍 Searching for old Products/{Unit}/products/{id} data...\n');
  
  const oldProductsData = [];
  
  try {
    // Get all storage units (top-level documents in Products collection)
    const productsRef = collection(db, 'Products');
    const unitsSnapshot = await getDocs(productsRef);
    
    console.log(`📦 Found ${unitsSnapshot.size} storage units in Products/ collection\n`);
    
    for (const unitDoc of unitsSnapshot.docs) {
      const unitId = unitDoc.id;
      console.log(`\n📍 Checking unit: ${unitId}`);
      
      // Get all products in this unit's subcollection
      const productsSubcollectionRef = collection(db, 'Products', unitId, 'products');
      const productsSnapshot = await getDocs(productsSubcollectionRef);
      
      console.log(`   └─ Found ${productsSnapshot.size} products`);
      
      productsSnapshot.forEach((productDoc) => {
        const productData = productDoc.data();
        oldProductsData.push({
          unit: unitId,
          productId: productDoc.id,
          path: `Products/${unitId}/products/${productDoc.id}`,
          name: productData.name || 'Unknown',
          brand: productData.brand || 'Unknown',
          category: productData.category || 'Unknown',
          quantity: productData.quantity || 0,
          unitPrice: productData.unitPrice || 0,
        });
      });
    }
    
    // Print summary
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📊 OLD PRODUCTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total old products found: ${oldProductsData.length}\n`);
    
    if (oldProductsData.length > 0) {
      console.log('Products by unit:');
      const byUnit = {};
      oldProductsData.forEach(p => {
        if (!byUnit[p.unit]) byUnit[p.unit] = [];
        byUnit[p.unit].push(p);
      });
      
      Object.entries(byUnit).forEach(([unit, products]) => {
        console.log(`\n📦 ${unit} (${products.length} products):`);
        products.forEach((p, idx) => {
          console.log(`   ${idx + 1}. ${p.name} - ${p.brand} (${p.category})`);
          console.log(`      Qty: ${p.quantity}, Price: ₱${p.unitPrice}`);
          console.log(`      Path: ${p.path}`);
        });
      });
      
      // Export to JSON file for backup
      const fs = require('fs');
      const backupFile = `old_products_backup_${Date.now()}.json`;
      fs.writeFileSync(backupFile, JSON.stringify(oldProductsData, null, 2));
      console.log(`\n💾 Backup saved to: ${backupFile}`);
    } else {
      console.log('✅ No old products found! Database is clean.');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    return oldProductsData;
    
  } catch (error) {
    console.error('❌ Error listing old products:', error);
    throw error;
  }
}

/**
 * STEP 2: Delete old products (USE WITH CAUTION!)
 */
async function deleteOldProducts() {
  console.log('⚠️  WARNING: This will DELETE all old Products/{Unit}/products/{id} data!\n');
  console.log('Please make sure you have a backup before proceeding.\n');
  
  // Uncomment the following lines ONLY when you're ready to delete:
  /*
  const oldProducts = await listOldProducts();
  
  if (oldProducts.length === 0) {
    console.log('✅ Nothing to delete!');
    return;
  }
  
  console.log('\n🗑️  Deleting old products...\n');
  
  let deletedCount = 0;
  
  for (const product of oldProducts) {
    try {
      const productRef = doc(db, 'Products', product.unit, 'products', product.productId);
      await deleteDoc(productRef);
      deletedCount++;
      console.log(`✅ Deleted: ${product.path}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${product.path}:`, error.message);
    }
  }
  
  console.log(`\n✅ Deleted ${deletedCount} out of ${oldProducts.length} products`);
  */
  
  console.log('\n⚠️  Deletion code is commented out for safety.');
  console.log('Uncomment the code in deleteOldProducts() function to enable deletion.');
}

// Run the script
console.log('═══════════════════════════════════════════════════════════');
console.log('🧹 OLD PRODUCTS CLEANUP TOOL');
console.log('═══════════════════════════════════════════════════════════\n');

listOldProducts()
  .then((oldProducts) => {
    console.log('\n✅ Script completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Review the backup JSON file');
    console.log('2. Verify these are actually old products to delete');
    console.log('3. Uncomment deletion code in deleteOldProducts() if needed');
    console.log('4. Run: node cleanup_old_products.js\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
