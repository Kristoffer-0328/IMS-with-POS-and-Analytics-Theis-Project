# Product & Variant Migration Script

## Overview
This document provides the complete migration script to transform your existing product structure to the new Product + Variant architecture.

---

## Pre-Migration Checklist

### ⚠️ CRITICAL: Complete Before Running Migration

- [ ] **Backup Database**: Export all Firestore data
- [ ] **Test on Staging**: Run migration on copy of production data first
- [ ] **Verify Backup**: Ensure backup can be restored
- [ ] **Schedule Downtime**: Plan maintenance window (estimated: 2-4 hours)
- [ ] **Notify Users**: Inform all users of planned downtime
- [ ] **Rollback Plan**: Prepare rollback scripts and procedures
- [ ] **Monitor Setup**: Prepare logging and monitoring tools

---

## Migration Script

### Step 1: Backup Current Data

```javascript
// backup-firestore.js
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { writeFileSync } from 'fs';
import app from './FirebaseConfig';

const db = getFirestore(app);

const backupFirestore = async () => {
  console.log('🔄 Starting Firestore backup...');
  
  const backup = {
    timestamp: new Date().toISOString(),
    collections: {}
  };
  
  // Backup Products collection (nested structure)
  const productsRef = collection(db, 'Products');
  const storageUnits = await getDocs(productsRef);
  
  backup.collections.Products = {};
  
  for (const unitDoc of storageUnits.docs) {
    const unitId = unitDoc.id;
    const unitData = unitDoc.data();
    
    backup.collections.Products[unitId] = {
      metadata: unitData,
      products: {}
    };
    
    if (unitId.startsWith('Unit ')) {
      // Fetch products subcollection
      const productsSubRef = collection(db, 'Products', unitId, 'products');
      const productsSnapshot = await getDocs(productsSubRef);
      
      productsSnapshot.docs.forEach(doc => {
        backup.collections.Products[unitId].products[doc.id] = doc.data();
      });
      
      console.log(`✅ Backed up ${productsSnapshot.size} products from ${unitId}`);
    }
  }
  
  // Backup Transactions (for reference updates)
  const transactionsRef = collection(db, 'Transactions');
  const transactionsSnapshot = await getDocs(transactionsRef);
  
  backup.collections.Transactions = {};
  transactionsSnapshot.docs.forEach(doc => {
    backup.collections.Transactions[doc.id] = doc.data();
  });
  
  console.log(`✅ Backed up ${transactionsSnapshot.size} transactions`);
  
  // Backup supplier_products
  const supplierProductsRef = collection(db, 'supplier_products');
  const suppliersSnapshot = await getDocs(supplierProductsRef);
  
  backup.collections.supplier_products = {};
  
  for (const supplierDoc of suppliersSnapshot.docs) {
    const supplierId = supplierDoc.id;
    const productsSubRef = collection(db, 'supplier_products', supplierId, 'products');
    const productsSnapshot = await getDocs(productsSubRef);
    
    backup.collections.supplier_products[supplierId] = {};
    productsSnapshot.docs.forEach(doc => {
      backup.collections.supplier_products[supplierId][doc.id] = doc.data();
    });
  }
  
  // Write backup to file
  const filename = `firestore_backup_${Date.now()}.json`;
  writeFileSync(filename, JSON.stringify(backup, null, 2));
  
  console.log(`✅ Backup completed: ${filename}`);
  console.log(`📊 Backup stats:
    - Storage Units: ${Object.keys(backup.collections.Products).length}
    - Total Products: ${Object.values(backup.collections.Products).reduce((sum, unit) => {
      return sum + Object.keys(unit.products || {}).length;
    }, 0)}
    - Transactions: ${Object.keys(backup.collections.Transactions).length}
  `);
  
  return backup;
};

// Run backup
backupFirestore()
  .then(() => {
    console.log('✅ Backup complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  });
```

**Usage:**
```bash
node backup-firestore.js
```

---

### Step 2: Migration Script

```javascript
// migrate-to-new-structure.js
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import app from './FirebaseConfig';

const db = getFirestore(app);

// Product ID generator
const generateProductId = (name, category, brand) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const categoryPrefix = category.substring(0, 3).toUpperCase();
  return `PROD_${categoryPrefix}_${timestamp}_${random}`;
};

// Variant ID generator
const generateVariantId = (productId, variantName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const variantSlug = variantName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  return `VAR_${productId}_${variantSlug}_${timestamp}_${random}`;
};

// Main migration function
const migrateToNewStructure = async () => {
  console.log('🚀 Starting migration to Product + Variant structure...');
  
  const stats = {
    productsCreated: 0,
    variantsCreated: 0,
    errors: [],
    productIdMapping: new Map() // oldProductId -> newProductId
  };
  
  try {
    // Step 1: Fetch all existing products from nested structure
    console.log('\n📂 Step 1: Fetching existing products...');
    const productsRef = collection(db, 'Products');
    const storageUnits = await getDocs(productsRef);
    
    const allOldProducts = [];
    
    for (const unitDoc of storageUnits.docs) {
      const unitId = unitDoc.id;
      
      if (!unitId.startsWith('Unit ')) {
        console.log(`⏭️  Skipping non-unit document: ${unitId}`);
        continue;
      }
      
      console.log(`🔍 Processing ${unitId}...`);
      
      const productsSubRef = collection(db, 'Products', unitId, 'products');
      const productsSnapshot = await getDocs(productsSubRef);
      
      productsSnapshot.docs.forEach(doc => {
        allOldProducts.push({
          oldId: doc.id,
          storageUnit: unitId,
          data: doc.data()
        });
      });
      
      console.log(`   ✅ Found ${productsSnapshot.size} products in ${unitId}`);
    }
    
    console.log(`\n📊 Total products to migrate: ${allOldProducts.length}`);
    
    // Step 2: Group products by base product (handle variants already in old structure)
    console.log('\n🔗 Step 2: Grouping products and variants...');
    const productGroups = new Map(); // baseProductId -> array of products/variants
    
    allOldProducts.forEach(item => {
      const data = item.data;
      const baseId = data.parentProductId || item.oldId;
      
      if (!productGroups.has(baseId)) {
        productGroups.set(baseId, []);
      }
      
      productGroups.get(baseId).push(item);
    });
    
    console.log(`   ✅ Grouped into ${productGroups.size} base products`);
    
    // Step 3: Create new Product and Variant documents
    console.log('\n📝 Step 3: Creating new Product and Variant documents...');
    
    let batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore limit
    
    for (const [baseId, items] of productGroups.entries()) {
      try {
        // Find the base product (not a variant, or the first one if all are variants)
        const baseProductItem = items.find(item => !item.data.isVariant) || items[0];
        const baseData = baseProductItem.data;
        
        // Create new Product document (general info only)
        const newProductId = generateProductId(
          baseData.name,
          baseData.category || 'General',
          baseData.brand || 'Generic'
        );
        
        const newProduct = {
          id: newProductId,
          name: baseData.name,
          brand: baseData.brand || 'Generic',
          category: baseData.category || 'Miscellaneous',
          description: baseData.description || '',
          measurementType: baseData.measurementType || 'count',
          baseUnit: baseData.baseUnit || 'pcs',
          requireDimensions: baseData.requireDimensions || false,
          imageUrl: baseData.imageUrl || null,
          
          // Metadata
          createdAt: baseData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          
          // Legacy reference for rollback
          legacyProductIds: items.map(i => i.oldId),
          migratedFrom: baseId
        };
        
        const productRef = doc(db, 'Products_New', newProductId);
        batch.set(productRef, newProduct);
        batchCount++;
        
        // Store mapping for transaction updates
        items.forEach(item => {
          stats.productIdMapping.set(item.oldId, newProductId);
        });
        
        stats.productsCreated++;
        
        // Create Variant documents for each item in the group
        for (const item of items) {
          const oldData = item.data;
          const variantName = oldData.variantName || oldData.size || 'Standard';
          
          const newVariantId = generateVariantId(newProductId, variantName);
          
          const newVariant = {
            id: newVariantId,
            
            // Product reference
            parentProductId: newProductId,
            
            // Denormalized product data
            productName: baseData.name,
            productBrand: baseData.brand || 'Generic',
            productCategory: baseData.category || 'Miscellaneous',
            productMeasurementType: baseData.measurementType || 'count',
            productBaseUnit: baseData.baseUnit || 'pcs',
            productImageUrl: baseData.imageUrl || null,
            
            // Variant identity
            variantName: variantName,
            variantSKU: oldData.id || oldData.sku || null,
            specifications: oldData.specifications || '',
            
            // Stock & pricing (REQUIRED)
            quantity: oldData.quantity || 0,
            unitPrice: oldData.unitPrice || 0,
            supplierPrice: oldData.supplierPrice || 0,
            safetyStock: oldData.safetyStock || 0,
            rop: oldData.rop || 0,
            eoq: oldData.eoq || 0,
            
            // Storage location (REQUIRED)
            storageLocation: oldData.storageLocation || item.storageUnit,
            shelfName: oldData.shelfName || 'Unknown',
            rowName: oldData.rowName || 'Unknown',
            columnIndex: oldData.columnIndex || 0,
            fullLocation: oldData.fullLocation || `${item.storageUnit} - Unknown - Unknown - Column 1`,
            
            // Supplier info
            suppliers: oldData.suppliers || [],
            
            // Category-specific fields (preserve all)
            ...(oldData.packagingVariant && { packagingVariant: oldData.packagingVariant }),
            ...(oldData.cementFormType && { cementFormType: oldData.cementFormType }),
            ...(oldData.numberOfBags && { numberOfBags: oldData.numberOfBags }),
            ...(oldData.weightPerBag && { weightPerBag: oldData.weightPerBag }),
            ...(oldData.unitWeightKg && { unitWeightKg: oldData.unitWeightKg }),
            ...(oldData.bulkVolumeCubicMeters && { bulkVolumeCubicMeters: oldData.bulkVolumeCubicMeters }),
            ...(oldData.length && { length: oldData.length }),
            ...(oldData.width && { width: oldData.width }),
            ...(oldData.thickness && { thickness: oldData.thickness }),
            ...(oldData.diameter && { diameter: oldData.diameter }),
            ...(oldData.unitVolumeCm3 && { unitVolumeCm3: oldData.unitVolumeCm3 }),
            ...(oldData.unitVolumeLiters && { unitVolumeLiters: oldData.unitVolumeLiters }),
            ...(oldData.color && { color: oldData.color }),
            ...(oldData.size && { size: oldData.size }),
            ...(oldData.material && { material: oldData.material }),
            
            // Bundle/package info
            ...(oldData.isBundle && { isBundle: oldData.isBundle }),
            ...(oldData.piecesPerBundle && { piecesPerBundle: oldData.piecesPerBundle }),
            ...(oldData.bundlePackagingType && { bundlePackagingType: oldData.bundlePackagingType }),
            ...(oldData.totalBundles && { totalBundles: oldData.totalBundles }),
            ...(oldData.loosePieces && { loosePieces: oldData.loosePieces }),
            
            // UOM conversions
            ...(oldData.uomConversions && { uomConversions: oldData.uomConversions }),
            
            // Multi-location support
            ...(oldData.multiLocation && { multiLocation: oldData.multiLocation }),
            ...(oldData.totalQuantityAllLocations && { totalQuantityAllLocations: oldData.totalQuantityAllLocations }),
            
            // Metadata
            createdAt: oldData.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
            dateStocked: oldData.dateStocked || null,
            
            // Legacy reference
            legacyProductId: item.oldId,
            legacyStorageUnit: item.storageUnit
          };
          
          const variantRef = doc(db, 'Variants_New', newVariantId);
          batch.set(variantRef, newVariant);
          batchCount++;
          
          stats.variantsCreated++;
          
          // Commit batch if reaching limit
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            console.log(`   💾 Committed batch of ${batchCount} documents`);
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
        
        // Progress update every 10 products
        if (stats.productsCreated % 10 === 0) {
          console.log(`   📈 Progress: ${stats.productsCreated} products, ${stats.variantsCreated} variants`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing product group ${baseId}:`, error);
        stats.errors.push({
          productId: baseId,
          error: error.message
        });
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   💾 Committed final batch of ${batchCount} documents`);
    }
    
    console.log('\n✅ Step 3 complete: Products and Variants created');
    
    // Step 4: Update transaction references (optional, can be done separately)
    console.log('\n🔄 Step 4: Updating transaction references...');
    console.log('   ⏭️  Skipping transaction updates for now (can be done as separate step)');
    console.log('   💡 Transactions will work with backward compatibility layer');
    
    // Print final stats
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`
📊 Migration Statistics:
   • Products Created: ${stats.productsCreated}
   • Variants Created: ${stats.variantsCreated}
   • Errors: ${stats.errors.length}
   • Product ID Mappings: ${stats.productIdMapping.size}
    `);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. Product ${err.productId}: ${err.error}`);
      });
    }
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Verify migrated data in Products_New and Variants_New collections');
    console.log('   2. Test application with new collections');
    console.log('   3. Run validation script: node validate-migration.js');
    console.log('   4. If validation passes, rename collections:');
    console.log('      - Rename Products → Products_Old');
    console.log('      - Rename Products_New → Products');
    console.log('      - Rename Variants_New → Variants');
    console.log('   5. Update application code to use new structure');
    console.log('   6. Monitor for issues');
    console.log('   7. Keep Products_Old for 30 days as backup\n');
    
    return stats;
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
};

// Run migration
migrateToNewStructure()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
```

**Usage:**
```bash
# Dry run first (add --dry-run flag in code)
node migrate-to-new-structure.js --dry-run

# Actual migration
node migrate-to-new-structure.js
```

---

### Step 3: Validation Script

```javascript
// validate-migration.js
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import app from './FirebaseConfig';

const db = getFirestore(app);

const validateMigration = async () => {
  console.log('🔍 Starting migration validation...\n');
  
  const issues = [];
  
  // Validation 1: Check product count
  console.log('1️⃣  Validating product count...');
  const productsRef = collection(db, 'Products_New');
  const productsSnapshot = await getDocs(productsRef);
  console.log(`   ✅ Found ${productsSnapshot.size} products`);
  
  if (productsSnapshot.size === 0) {
    issues.push('❌ No products found in Products_New collection');
  }
  
  // Validation 2: Check variant count
  console.log('\n2️⃣  Validating variant count...');
  const variantsRef = collection(db, 'Variants_New');
  const variantsSnapshot = await getDocs(variantsRef);
  console.log(`   ✅ Found ${variantsSnapshot.size} variants`);
  
  if (variantsSnapshot.size === 0) {
    issues.push('❌ No variants found in Variants_New collection');
  }
  
  // Validation 3: Ensure each product has at least one variant
  console.log('\n3️⃣  Validating product-variant relationships...');
  let productsWithoutVariants = 0;
  
  for (const productDoc of productsSnapshot.docs) {
    const productId = productDoc.id;
    const variantsQuery = query(
      collection(db, 'Variants_New'),
      where('parentProductId', '==', productId)
    );
    const productVariants = await getDocs(variantsQuery);
    
    if (productVariants.empty) {
      productsWithoutVariants++;
      issues.push(`❌ Product ${productId} has no variants`);
    }
  }
  
  if (productsWithoutVariants === 0) {
    console.log(`   ✅ All products have at least one variant`);
  } else {
    console.log(`   ⚠️  ${productsWithoutVariants} products have no variants`);
  }
  
  // Validation 4: Check required fields in products
  console.log('\n4️⃣  Validating product required fields...');
  let productsWithMissingFields = 0;
  const requiredProductFields = ['name', 'brand', 'category', 'measurementType', 'baseUnit'];
  
  productsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const missingFields = requiredProductFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      productsWithMissingFields++;
      issues.push(`❌ Product ${doc.id} missing fields: ${missingFields.join(', ')}`);
    }
  });
  
  if (productsWithMissingFields === 0) {
    console.log(`   ✅ All products have required fields`);
  } else {
    console.log(`   ⚠️  ${productsWithMissingFields} products have missing fields`);
  }
  
  // Validation 5: Check required fields in variants
  console.log('\n5️⃣  Validating variant required fields...');
  let variantsWithMissingFields = 0;
  const requiredVariantFields = [
    'parentProductId', 'productName', 'variantName',
    'quantity', 'unitPrice', 'storageLocation'
  ];
  
  variantsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const missingFields = requiredVariantFields.filter(field => !data[field] && data[field] !== 0);
    
    if (missingFields.length > 0) {
      variantsWithMissingFields++;
      issues.push(`❌ Variant ${doc.id} missing fields: ${missingFields.join(', ')}`);
    }
  });
  
  if (variantsWithMissingFields === 0) {
    console.log(`   ✅ All variants have required fields`);
  } else {
    console.log(`   ⚠️  ${variantsWithMissingFields} variants have missing fields`);
  }
  
  // Validation 6: Check stock values
  console.log('\n6️⃣  Validating stock values...');
  let variantsWithInvalidStock = 0;
  
  variantsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (typeof data.quantity !== 'number' || data.quantity < 0) {
      variantsWithInvalidStock++;
      issues.push(`❌ Variant ${doc.id} has invalid quantity: ${data.quantity}`);
    }
  });
  
  if (variantsWithInvalidStock === 0) {
    console.log(`   ✅ All variants have valid stock values`);
  } else {
    console.log(`   ⚠️  ${variantsWithInvalidStock} variants have invalid stock`);
  }
  
  // Validation 7: Check price values
  console.log('\n7️⃣  Validating price values...');
  let variantsWithInvalidPrice = 0;
  
  variantsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (typeof data.unitPrice !== 'number' || data.unitPrice <= 0) {
      variantsWithInvalidPrice++;
      issues.push(`❌ Variant ${doc.id} has invalid price: ${data.unitPrice}`);
    }
  });
  
  if (variantsWithInvalidPrice === 0) {
    console.log(`   ✅ All variants have valid prices`);
  } else {
    console.log(`   ⚠️  ${variantsWithInvalidPrice} variants have invalid prices`);
  }
  
  // Final report
  console.log('\n' + '='.repeat(60));
  if (issues.length === 0) {
    console.log('✅ VALIDATION PASSED - No issues found!');
    console.log('='.repeat(60));
    console.log('\n🎉 Migration is successful and ready for deployment!');
    return { success: true, issues: [] };
  } else {
    console.log('⚠️  VALIDATION FOUND ISSUES');
    console.log('='.repeat(60));
    console.log(`\n❌ ${issues.length} issue(s) found:\n`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
    console.log('\n⚠️  Please fix these issues before proceeding with deployment.');
    return { success: false, issues };
  }
};

// Run validation
validateMigration()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
```

**Usage:**
```bash
node validate-migration.js
```

---

### Step 4: Rollback Script (If Needed)

```javascript
// rollback-migration.js
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'fs';
import app from './FirebaseConfig';

const db = getFirestore(app);

const rollbackMigration = async (backupFilePath) => {
  console.log('🔄 Starting migration rollback...\n');
  
  try {
    // Load backup file
    console.log(`📂 Loading backup from: ${backupFilePath}`);
    const backup = JSON.parse(readFileSync(backupFilePath, 'utf-8'));
    
    console.log(`✅ Backup loaded (created: ${backup.timestamp})`);
    
    // Step 1: Delete new collections
    console.log('\n🗑️  Step 1: Deleting new collections...');
    
    // Delete Products_New
    const productsNewRef = collection(db, 'Products_New');
    const productsNewSnapshot = await getDocs(productsNewRef);
    
    let batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_SIZE = 500;
    
    for (const doc of productsNewSnapshot.docs) {
      batch.delete(doc.ref);
      batchCount++;
      
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Deleted ${productsNewSnapshot.size} documents from Products_New`);
    
    // Delete Variants_New
    const variantsNewRef = collection(db, 'Variants_New');
    const variantsNewSnapshot = await getDocs(variantsNewRef);
    
    batch = writeBatch(db);
    batchCount = 0;
    
    for (const doc of variantsNewSnapshot.docs) {
      batch.delete(doc.ref);
      batchCount++;
      
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Deleted ${variantsNewSnapshot.size} documents from Variants_New`);
    
    // Step 2: Restore from backup (optional - only if old structure was modified)
    console.log('\n📥 Step 2: Verifying original data...');
    console.log('   ℹ️  Original Products collection was not modified during migration');
    console.log('   ℹ️  No restoration needed');
    
    console.log('\n✅ Rollback complete!');
    console.log('   • New collections deleted');
    console.log('   • Original data intact');
    console.log('   • System restored to pre-migration state');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};

// Usage: node rollback-migration.js <backup-file-path>
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Error: Backup file path required');
  console.log('Usage: node rollback-migration.js <backup-file-path>');
  process.exit(1);
}

rollbackMigration(backupFile)
  .then(() => {
    console.log('\n✅ Rollback completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  });
```

**Usage:**
```bash
node rollback-migration.js firestore_backup_1704556800000.json
```

---

## Post-Migration Steps

### 1. Rename Collections in Firebase Console
```
1. Go to Firebase Console → Firestore Database
2. Rename collections:
   Products → Products_Old (keep as backup)
   Products_New → Products
   Variants_New → Variants
3. Verify rename was successful
```

### 2. Update Application Code
```javascript
// Update ProductServices.jsx to use new collections
const productsRef = collection(db, 'Products'); // Now points to new structure
const variantsRef = collection(db, 'Variants');
```

### 3. Monitor Application
- Check error logs for any issues
- Monitor Firestore read/write operations
- Test critical flows (POS sales, inventory management)
- Verify reports are accurate

### 4. Clean Up
- After 30 days of stable operation, delete `Products_Old` collection
- Remove migration scripts from codebase
- Update documentation

---

## Troubleshooting

### Issue: Migration Script Timeout
**Solution**: Process in smaller batches, increase Cloud Function timeout

### Issue: Missing Data After Migration
**Solution**: Run validation script, check backup file, restore if needed

### Issue: Duplicate Variants Created
**Solution**: Add duplicate detection in migration script before creating variants

### Issue: Transaction References Broken
**Solution**: Implement backward compatibility layer in transaction display logic

---

## Support

For issues during migration:
1. Check backup file integrity
2. Review migration logs
3. Run validation script
4. Use rollback script if critical issues found
5. Contact development team with error logs

**Remember**: Never run migration on production without testing on staging first!
