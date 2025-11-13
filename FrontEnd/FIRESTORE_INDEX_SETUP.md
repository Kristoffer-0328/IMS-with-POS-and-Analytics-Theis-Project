# Firestore Index Setup Guide

## Why Do I Need Indexes?

Firestore requires composite indexes for queries that:
1. Use multiple `where()` clauses
2. Combine `where()` with `orderBy()` on different fields
3. Query collection groups

The good news: Firebase tells you exactly which indexes you need when you try a query!

---

## Current Required Indexes for This App

### 1. Variants Collection - Parent Product Lookup (Optional but Recommended)

**Status:** ⚠️ Optional - App works without it, but slower on large datasets

**Collection:** `Variants`  
**Query:** Finding variants by parent product  
**Fields:**
- `parentProductId` (Ascending)
- `__name__` (Ascending)

**Create Index:**
```
https://console.firebase.google.com/v1/r/project/glorystarauth/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9nbG9yeXNOYXJhdXRoL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9WYXJpYW50cy9pbmRleGVzL18QARoTCg9wYXJlbnRQcm9kdWN0SWQQARoMCghfX25hbWVfXxAC
```

**Used By:**
- `MobileReceive.jsx` - Finding variants during product receiving
- `VariantServices.jsx` - `getVariantsByProduct()` function

---

## How to Create an Index

### Method 1: Click the Auto-Generated Link (Easiest)

When you see an error like:
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

1. **Click the link** - Firebase generates it for you
2. **Review the index** - Check collection and fields
3. **Click "Create Index"**
4. **Wait 2-5 minutes** - Index builds in background
5. **Retry your operation** - Should work now!

### Method 2: Manual Creation

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **glorystarauth**
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"**
5. Fill in:
   - **Collection ID:** `Variants`
   - **Fields to index:**
     - Field: `parentProductId`, Order: Ascending
     - Field: `__name__`, Order: Ascending
6. Click **Create**

---

## Index Building Time

| Number of Documents | Estimated Time |
|---------------------|----------------|
| < 1,000 | 30 seconds |
| 1,000 - 10,000 | 2-5 minutes |
| 10,000 - 100,000 | 5-15 minutes |
| > 100,000 | 15-60 minutes |

💡 **Tip:** You can continue development while the index builds. Just avoid running the specific query until it's ready.

---

## Checking Index Status

### In Firebase Console
1. Go to **Firestore Database** → **Indexes**
2. Look for your index in the list
3. Status indicators:
   - 🟢 **Enabled** - Ready to use
   - 🟡 **Building** - In progress
   - 🔴 **Error** - Failed (check logs)

### In Your App
If you try to use a query before the index is ready:
```
Error: The query requires an index. You can create it here: [link]
```

Once ready, the query will work without errors.

---

## Index Best Practices

### ✅ Do Create Indexes For:
- Frequent queries on large collections (> 1,000 docs)
- Queries with multiple filters
- Queries that combine `where()` + `orderBy()`
- Production-critical queries

### ❌ Don't Create Indexes For:
- Small collections (< 100 docs)
- One-time queries during development
- Simple queries with single `where()` clause
- Queries you're still experimenting with

### 💡 Performance Tips:
1. **Create indexes early** - Do it during development
2. **Monitor query performance** - Use Firebase Performance Monitoring
3. **Review periodically** - Delete unused indexes to save storage
4. **Test with production data size** - Small test data might not need indexes

---

## Common Index Patterns in This App

### Pattern 1: Filter + Order
```javascript
query(
  collection(db, 'Variants'),
  where('parentProductId', '==', productId),
  orderBy('createdAt', 'desc')
)
```
**Needs:** Index on `(parentProductId, createdAt)`

### Pattern 2: Multiple Filters
```javascript
query(
  collection(db, 'Variants'),
  where('category', '==', 'Cement'),
  where('storageLocation', '==', 'Unit 01')
)
```
**Needs:** Index on `(category, storageLocation)`

### Pattern 3: Filter + Range
```javascript
query(
  collection(db, 'Variants'),
  where('category', '==', 'Cement'),
  where('quantity', '>', 0),
  orderBy('quantity', 'desc')
)
```
**Needs:** Index on `(category, quantity)`

---

## Troubleshooting

### Error: "Index already exists"
- ✅ Good! Nothing to do - index is ready
- Check console to verify it's "Enabled"

### Error: "Index failed to build"
- Check Firestore quotas (Free tier: 200 indexes max)
- Verify collection name is correct
- Try deleting and recreating the index

### Query still slow after index created
- Wait for index to finish building (check status)
- Verify your query matches the index exactly
- Check if you're querying too much data (add `limit()`)

### "Missing index" error on local emulator
- Emulators don't require indexes by default
- Set `experimentalForceLongPolling: true` to test index requirements locally

---

## Summary

**For MobileReceive.jsx Update:**
- ✅ App works without the index (has fallback)
- 🚀 Create the index for better performance
- ⏱️ Takes 2-5 minutes to build
- 🔗 [Click here to create](https://console.firebase.google.com/v1/r/project/glorystarauth/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9nbG9yeXNOYXJhdXRoL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9WYXJpYW50cy9pbmRleGVzL18QARoTCg9wYXJlbnRQcm9kdWN0SWQQARoMCghfX25hbWVfXxAC)

**Quick Action:**
1. Click the link above
2. Click "Create Index" button
3. Wait 2-5 minutes
4. Test MobileReceive again
5. ✅ Done!

---

**Last Updated:** November 13, 2025  
**Status:** Active - Index creation in progress
