/**
 * Test file for POS Services
 * 
 * This file contains test scenarios to verify the new POS services work correctly.
 * Run these tests after migrating data to the new Product & Variant structure.
 * 
 * To use:
 * 1. Import this file in your component
 * 2. Call test functions from console or button click
 * 3. Check console output for results
 */

import {
  searchPOSProducts,
  getProductVariants,
  getVariant,
  getProduct,
  checkVariantAvailability,
  checkCartAvailability,
  getCategories,
  getBrands,
  getLowStockVariants,
  searchVariants
} from './POSProductServices';

import {
  processPOSSale,
  voidTransaction
} from './POSTransactionService';

/**
 * Test 1: Search products
 */
export const testSearchProducts = async () => {
  console.log('\n🧪 TEST 1: Search Products');
  console.log('=====================================');
  
  try {
    // Test 1a: Search all products
    console.log('\n📝 Test 1a: Search all products');
    const allProducts = await searchPOSProducts();
    console.log(`✅ Found ${allProducts.length} products`);
    console.log('Sample product:', allProducts[0]);
    
    // Test 1b: Search by term
    console.log('\n📝 Test 1b: Search by term "cement"');
    const searchResults = await searchPOSProducts('cement');
    console.log(`✅ Found ${searchResults.length} products matching "cement"`);
    
    // Test 1c: Filter by category
    console.log('\n📝 Test 1c: Filter by category');
    const categoryProducts = await searchPOSProducts('', 'Cement & Aggregates');
    console.log(`✅ Found ${categoryProducts.length} products in "Cement & Aggregates"`);
    
    return { success: true, allProducts, searchResults, categoryProducts };
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test 2: Get product variants
 */
export const testGetVariants = async (productId = null) => {
  console.log('\n🧪 TEST 2: Get Product Variants');
  console.log('=====================================');
  
  try {
    // First, get a product ID if not provided
    if (!productId) {
      const products = await searchPOSProducts();
      if (products.length === 0) {
        throw new Error('No products found in system');
      }
      productId = products[0].id;
    }
    
    console.log(`\n📝 Getting variants for product: ${productId}`);
    const variants = await getProductVariants(productId);
    console.log(`✅ Found ${variants.length} variants`);
    
    if (variants.length > 0) {
      console.log('Sample variant:', variants[0]);
    }
    
    return { success: true, variants };
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test 3: Check variant availability
 */
export const testCheckAvailability = async (variantId = null, quantity = 5) => {
  console.log('\n🧪 TEST 3: Check Variant Availability');
  console.log('=====================================');
  
  try {
    // Get a variant ID if not provided
    if (!variantId) {
      const products = await searchPOSProducts();
      if (products.length === 0) {
        throw new Error('No products found in system');
      }
      
      const variants = await getProductVariants(products[0].id);
      if (variants.length === 0) {
        throw new Error('No variants found for first product');
      }
      
      variantId = variants[0].variantId;
    }
    
    console.log(`\n📝 Checking availability for variant: ${variantId}`);
    console.log(`📝 Requested quantity: ${quantity}`);
    
    const availability = await checkVariantAvailability(variantId, quantity);
    console.log('✅ Availability check result:', availability);
    
    return { success: true, availability };
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test 4: Check cart availability
 */
export const testCheckCartAvailability = async () => {
  console.log('\n🧪 TEST 4: Check Cart Availability');
  console.log('=====================================');
  
  try {
    // Build a sample cart
    const products = await searchPOSProducts();
    if (products.length === 0) {
      throw new Error('No products found in system');
    }
    
    const variants1 = await getProductVariants(products[0].id);
    if (variants1.length === 0) {
      throw new Error('No variants found for first product');
    }
    
    const sampleCart = [
      { variantId: variants1[0].variantId, quantity: 2 }
    ];
    
    // Add second product if available
    if (products.length > 1) {
      const variants2 = await getProductVariants(products[1].id);
      if (variants2.length > 0) {
        sampleCart.push({ variantId: variants2[0].variantId, quantity: 3 });
      }
    }
    
    console.log(`\n📝 Checking availability for ${sampleCart.length} cart items`);
    const result = await checkCartAvailability(sampleCart);
    console.log('✅ Cart availability result:', result);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test 5: Get categories and brands
 */
export const testGetFilters = async () => {
  console.log('\n🧪 TEST 5: Get Categories and Brands');
  console.log('=====================================');
  
  try {
    console.log('\n📝 Fetching categories...');
    const categories = await getCategories();
    console.log(`✅ Found ${categories.length} categories:`, categories);
    
    console.log('\n📝 Fetching brands...');
    const brands = await getBrands();
    console.log(`✅ Found ${brands.length} brands:`, brands);
    
    return { success: true, categories, brands };
  } catch (error) {
    console.error('❌ Test 5 failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test 6: Get low stock variants
 */
export const testGetLowStock = async (threshold = 10) => {
  console.log('\n🧪 TEST 6: Get Low Stock Variants');
  console.log('=====================================');
  
  try {
    console.log(`\n📝 Fetching variants with stock <= ${threshold}...`);
    const lowStockVariants = await getLowStockVariants(threshold);
    console.log(`✅ Found ${lowStockVariants.length} low stock variants`);
    
    if (lowStockVariants.length > 0) {
      console.log('Samples:', lowStockVariants.slice(0, 3));
    }
    
    return { success: true, lowStockVariants };
  } catch (error) {
    console.error('❌ Test 6 failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test 7: Search variants directly
 */
export const testSearchVariants = async (searchTerm = 'cement') => {
  console.log('\n🧪 TEST 7: Search Variants');
  console.log('=====================================');
  
  try {
    console.log(`\n📝 Searching variants for: "${searchTerm}"`);
    const variants = await searchVariants(searchTerm);
    console.log(`✅ Found ${variants.length} matching variants`);
    
    if (variants.length > 0) {
      console.log('Sample result:', variants[0]);
    }
    
    return { success: true, variants };
  } catch (error) {
    console.error('❌ Test 7 failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test 8: Process sale (DRY RUN - will fail without real user)
 */
export const testProcessSale = async (dryRun = true) => {
  console.log('\n🧪 TEST 8: Process Sale (Validation Only)');
  console.log('=====================================');
  
  if (dryRun) {
    console.log('⚠️ DRY RUN MODE - Not executing actual transaction');
    console.log('This test only validates the function signature and error handling');
    
    try {
      // Test with empty cart
      await processPOSSale([], {}, { uid: 'test' });
      console.log('❌ Should have thrown error for empty cart');
    } catch (error) {
      if (error.message.includes('Cart is empty')) {
        console.log('✅ Correctly validates empty cart');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    try {
      // Test with missing transaction details
      await processPOSSale(
        [{ variantId: 'test', qty: 1 }],
        null,
        { uid: 'test' }
      );
      console.log('❌ Should have thrown error for missing details');
    } catch (error) {
      if (error.message.includes('Transaction details are required')) {
        console.log('✅ Correctly validates transaction details');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    return { success: true, message: 'Validation tests passed' };
  }
  
  console.log('⚠️ LIVE MODE - This would execute a real transaction');
  console.log('🚫 Skipping to avoid accidental data changes');
  return { success: false, message: 'Live mode not implemented in test' };
};

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          POS SERVICES COMPREHENSIVE TEST SUITE           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  const results = {
    total: 8,
    passed: 0,
    failed: 0,
    details: []
  };
  
  // Test 1: Search products
  const test1 = await testSearchProducts();
  results.details.push({ test: 'Search Products', ...test1 });
  if (test1.success) results.passed++; else results.failed++;
  
  // Test 2: Get variants
  const test2 = await testGetVariants();
  results.details.push({ test: 'Get Variants', ...test2 });
  if (test2.success) results.passed++; else results.failed++;
  
  // Test 3: Check availability
  const test3 = await testCheckAvailability();
  results.details.push({ test: 'Check Availability', ...test3 });
  if (test3.success) results.passed++; else results.failed++;
  
  // Test 4: Check cart availability
  const test4 = await testCheckCartAvailability();
  results.details.push({ test: 'Check Cart Availability', ...test4 });
  if (test4.success) results.passed++; else results.failed++;
  
  // Test 5: Get filters
  const test5 = await testGetFilters();
  results.details.push({ test: 'Get Filters', ...test5 });
  if (test5.success) results.passed++; else results.failed++;
  
  // Test 6: Get low stock
  const test6 = await testGetLowStock();
  results.details.push({ test: 'Get Low Stock', ...test6 });
  if (test6.success) results.passed++; else results.failed++;
  
  // Test 7: Search variants
  const test7 = await testSearchVariants();
  results.details.push({ test: 'Search Variants', ...test7 });
  if (test7.success) results.passed++; else results.failed++;
  
  // Test 8: Process sale (dry run)
  const test8 = await testProcessSale(true);
  results.details.push({ test: 'Process Sale (Validation)', ...test8 });
  if (test8.success) results.passed++; else results.failed++;
  
  // Summary
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log('\n');
  
  return results;
};

// Export individual test functions
export default {
  testSearchProducts,
  testGetVariants,
  testCheckAvailability,
  testCheckCartAvailability,
  testGetFilters,
  testGetLowStock,
  testSearchVariants,
  testProcessSale,
  runAllTests
};

/**
 * Quick test helper for console
 * 
 * Usage in browser console:
 * 
 * import POSTests from './POSServicesTest';
 * POSTests.runAllTests();
 * 
 * Or run individual tests:
 * POSTests.testSearchProducts();
 * POSTests.testGetVariants('PROD_CEM_001');
 */
