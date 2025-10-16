# Cleanup Old Storage Location Documents

## Problem
The old nested structure created documents for storage units (Unit 01, Unit 02, etc.) in the Products collection. These documents are not actual products but were appearing in the stock management view.

## Solution Applied
Updated the code to filter out these storage location documents by checking:
1. Documents must have a `name` field (all products have this)
2. Documents must NOT have a `type` field (storage locations have `type: 'storage_location'`)

## Files Updated
1. **ProductServices.jsx** - Added filter in `listenToProducts()`
2. **StorageFacilityInteractiveMap.jsx** - Added filter in `fetchUnitCapacities()`

## How to Clean Up (Optional)

If you want to delete the old storage location documents from Firebase, you can use this script:

### Option 1: Manual Deletion via Firebase Console
1. Go to Firebase Console → Firestore Database
2. Navigate to the `Products` collection
3. Look for documents with these characteristics:
   - Document ID is like "Unit 01", "Unit 02", etc.
   - Has a `type` field with value `storage_location`
   - Does NOT have a `name` field (or name is just the unit name)
4. Delete these documents manually

### Option 2: Automated Script (Run once in your app)

Create a temporary component or run this in your browser console while on the app:

```javascript
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import app from './FirebaseConfig';

const cleanupStorageDocuments = async () => {
  const db = getFirestore(app);
  const productsRef = collection(db, 'Products');
  const snapshot = await getDocs(productsRef);
  
  let deletedCount = 0;
  const deletePromises = [];
  
  snapshot.docs.forEach(docSnapshot => {
    const data = docSnapshot.data();
    
    // Identify storage location documents
    // These have 'type' field or don't have a 'name' field
    const isStorageLocation = data.type === 'storage_location' || 
                              data.type === 'shelf' || 
                              data.type === 'row' || 
                              data.type === 'column' ||
                              !data.name;
    
    if (isStorageLocation) {
      console.log(`Deleting storage document: ${docSnapshot.id}`, data);
      deletePromises.push(deleteDoc(doc(db, 'Products', docSnapshot.id)));
      deletedCount++;
    }
  });
  
  await Promise.all(deletePromises);
  console.log(`✅ Cleanup complete! Deleted ${deletedCount} storage location documents.`);
};

// Run the cleanup
cleanupStorageDocuments();
```

### Option 3: Create a Temporary Admin Button

Add this temporarily to your admin panel:

```jsx
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const CleanupButton = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState(null);

  const handleCleanup = async () => {
    if (!window.confirm('Are you sure you want to delete all storage location documents? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    const db = getFirestore(app);
    
    try {
      const productsRef = collection(db, 'Products');
      const snapshot = await getDocs(productsRef);
      
      let deletedCount = 0;
      const deletePromises = [];
      
      snapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        
        // Identify storage location documents
        const isStorageLocation = data.type === 'storage_location' || 
                                  data.type === 'shelf' || 
                                  data.type === 'row' || 
                                  data.type === 'column' ||
                                  (!data.name && docSnapshot.id.startsWith('Unit '));
        
        if (isStorageLocation) {
          deletePromises.push(deleteDoc(doc(db, 'Products', docSnapshot.id)));
          deletedCount++;
        }
      });
      
      await Promise.all(deletePromises);
      setResult({ success: true, count: deletedCount });
    } catch (error) {
      console.error('Cleanup failed:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-semibold mb-2">🧹 Database Cleanup</h3>
      <p className="text-sm text-gray-600 mb-4">
        Remove old storage location documents from the Products collection
      </p>
      <button
        onClick={handleCleanup}
        disabled={isDeleting}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
      >
        {isDeleting ? 'Deleting...' : 'Clean Up Storage Documents'}
      </button>
      
      {result && (
        <div className={`mt-3 p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result.success 
            ? `✅ Successfully deleted ${result.count} storage documents`
            : `❌ Error: ${result.error}`}
        </div>
      )}
    </div>
  );
};
```

## Important Notes

1. **Backup First**: Before deleting anything, make sure you have a backup of your Firestore database
2. **Test Environment**: If possible, test the cleanup in a development/staging environment first
3. **Not Required**: The cleanup is optional - the updated code already filters out these documents
4. **One-Time Operation**: You only need to run this cleanup once

## What Documents Get Deleted?

Documents with any of these characteristics:
- `type: 'storage_location'`
- `type: 'shelf'`
- `type: 'row'`
- `type: 'column'`
- No `name` field (or name is just the unit identifier)

## What Documents Are Kept?

All actual product documents which have:
- A `name` field (product name)
- No `type` field
- Product-related data (unitPrice, quantity, brand, etc.)

## Verification

After cleanup, verify by:
1. Check the Products collection in Firebase Console
2. Only product documents should remain
3. All products should appear correctly in the inventory view
4. Storage map should still work correctly
