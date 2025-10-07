# Cloudinary Image Upload Integration

## Overview
This project uses Cloudinary for cloud-based image storage, replacing the previous temporary URL approach with permanent CDN-hosted images.

### ✅ Benefits of Cloudinary
- **Permanent Storage**: Images are stored permanently on Cloudinary CDN
- **Fast Loading**: CDN delivery ensures fast image loading worldwide
- **Image Optimization**: Automatic format conversion and quality optimization
- **Transformations**: On-the-fly image resizing and manipulation
- **Reliable**: 99.9% uptime SLA
- **No Backend Required**: Direct browser upload using unsigned presets

### ❌ Previous Issue
The old implementation used `URL.createObjectURL()` which created temporary `blob://` URLs that:
- Expired on page reload
- Were not shareable
- Existed only in browser memory
- Were not actually uploaded anywhere

---

## Setup Instructions

### 1. Create Cloudinary Account
1. Go to [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Sign up for a free account (25GB storage, 25GB bandwidth/month)
3. Verify your email address
4. Login to your dashboard

### 2. Get Your Cloud Name
1. After logging in, you'll see your **Dashboard**
2. Copy your **Cloud name** (e.g., `dxxxxxx`)
3. Save this for the environment variables

### 3. Create Upload Preset
**Important**: The upload preset must be "unsigned" for browser uploads to work.

1. Navigate to: **Settings** (gear icon) → **Upload** tab
2. Scroll down to **Upload presets** section
3. Click **Add upload preset**
4. Configure the preset:
   - **Preset name**: `ims_products_unsigned` (or your choice)
   - **Signing Mode**: Select **Unsigned** ⚠️ (Critical!)
   - **Folder**: `ims-products` (optional, organizes uploads)
   - **Unique filename**: Enable (recommended)
   - **Overwrite**: Disable (recommended)
   - **Access mode**: Public (for CDN access)
5. Click **Save**
6. Copy the **preset name** you created

### 4. Configure Environment Variables
1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` file with your Cloudinary credentials:
   ```env
   # Cloudinary Configuration
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
   VITE_CLOUDINARY_UPLOAD_PRESET=ims_products_unsigned
   VITE_CLOUDINARY_FOLDER=ims-products
   ```

3. Replace the values:
   - `VITE_CLOUDINARY_CLOUD_NAME`: Your cloud name from step 2
   - `VITE_CLOUDINARY_UPLOAD_PRESET`: The preset name from step 3
   - `VITE_CLOUDINARY_FOLDER`: Custom folder name (optional)

### 5. Restart Development Server
After updating `.env`, restart your Vite dev server:
```powershell
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

---

## Implementation Details

### Updated Files
The following components have been updated to use Cloudinary:

#### 1. **ViewProductModal.jsx**
- **Location**: `src/features/inventory/components/Inventory/ViewProductModal.jsx`
- **Purpose**: Upload images when viewing/editing existing products
- **Changes**:
  - Added Cloudinary upload with progress tracking
  - Replaced temporary URL with permanent CDN URL
  - Added upload progress bar (0-100%)
  - Stores images in folder: `ims-products/{category}`

#### 2. **NewProductForm.jsx**
- **Location**: `src/features/inventory/components/Inventory/CategoryModal/NewProductForm.jsx`
- **Purpose**: Upload images when creating new products
- **Changes**:
  - Async upload to Cloudinary before saving product
  - Progress indicator during upload
  - Stores permanent URL in Firebase
  - Tags: category + product name

#### 3. **NewVariantForm.jsx**
- **Location**: `src/features/inventory/components/Inventory/CategoryModal/NewVariantForm.jsx`
- **Status**: Ready for future implementation (currently stores null)

### Cloudinary Service
**Location**: `src/services/cloudinary/CloudinaryService.js`

#### Main Functions

##### `uploadImage(file, onProgress, options)`
Upload image to Cloudinary with progress tracking.

**Parameters:**
- `file` (File): The image file to upload
- `onProgress` (Function): Callback for progress updates (0-100)
- `options` (Object):
  - `folder`: Custom folder path (default: `ims-products`)
  - `publicId`: Custom public ID
  - `tags`: Array of tags for the image

**Returns:**
```javascript
{
  success: true,
  url: "https://res.cloudinary.com/...",  // Permanent CDN URL
  publicId: "ims-products/cement/product123",
  format: "jpg",
  width: 1920,
  height: 1080,
  bytes: 245678
}
```

**Example Usage:**
```javascript
import { uploadImage } from '../services/cloudinary/CloudinaryService';

const handleUpload = async (file) => {
  try {
    const result = await uploadImage(
      file,
      (progress) => setUploadProgress(progress),
      {
        folder: 'ims-products/cement',
        tags: ['cement', 'portland-cement']
      }
    );
    
    console.log('Uploaded successfully!');
    console.log('Image URL:', result.url);
    
    // Save result.url to Firebase
    await updateDoc(productRef, {
      imageUrl: result.url
    });
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};
```

##### `getTransformedUrl(publicId, transformations)`
Generate URLs with image transformations (resize, crop, format).

**Example:**
```javascript
import { getTransformedUrl } from '../services/cloudinary/CloudinaryService';

// Create thumbnail (300x300)
const thumbnailUrl = getTransformedUrl('ims-products/cement/img123', {
  width: 300,
  height: 300,
  crop: 'fill',
  quality: 'auto',
  format: 'webp'
});

// Result: https://res.cloudinary.com/.../w_300,h_300,c_fill,q_auto,f_webp/ims-products/cement/img123
```

##### `getThumbnailUrl(url, size)`
Quick thumbnail generation from any Cloudinary URL.

**Example:**
```javascript
import { getThumbnailUrl } from '../services/cloudinary/CloudinaryService';

const originalUrl = product.imageUrl;
const thumbnailUrl = getThumbnailUrl(originalUrl, 200);  // 200x200px
```

##### `isCloudinaryUrl(url)`
Check if a URL is a Cloudinary URL.

**Example:**
```javascript
import { isCloudinaryUrl } from '../services/cloudinary/CloudinaryService';

if (isCloudinaryUrl(product.imageUrl)) {
  console.log('This is a Cloudinary image!');
} else {
  console.log('This might be an old temp URL or external image');
}
```

---

## Validation & Testing

### Test Upload Functionality
1. **Start the application**:
   ```powershell
   npm run dev
   ```

2. **Test in ViewProductModal**:
   - Navigate to any product
   - Click the camera icon (upload button)
   - Select an image (JPG, PNG, GIF, WebP under 10MB)
   - Watch the progress bar (0% → 100%)
   - Check that image appears immediately
   - Reload page - image should still be there ✅

3. **Test in NewProductForm**:
   - Click "Add New Product"
   - Fill in product details
   - Upload an image
   - Observe upload progress
   - Submit the product
   - Image should be saved with product ✅

4. **Verify in Cloudinary Dashboard**:
   - Go to [Cloudinary Media Library](https://cloudinary.com/console/media_library)
   - Check `ims-products/` folder
   - You should see your uploaded images
   - Each image has a permanent URL

### Common Issues & Solutions

#### ❌ Error: "VITE_CLOUDINARY_CLOUD_NAME is not defined"
**Solution**: 
- Check `.env` file exists in project root
- Verify variable names start with `VITE_`
- Restart dev server after changing `.env`

#### ❌ Error: "Upload failed with status: 401"
**Solution**:
- Upload preset is not set to "Unsigned"
- Go to Cloudinary Settings → Upload → Upload presets
- Edit your preset and set **Signing Mode** to **Unsigned**

#### ❌ Error: "Invalid file type"
**Solution**:
- Only images are allowed: JPG, JPEG, PNG, GIF, WebP
- Max file size: 10MB
- Check file extension matches content type

#### ❌ Error: "File size exceeds maximum"
**Solution**:
- Maximum file size is 10MB
- Compress images before uploading
- Use online tools like TinyPNG or Squoosh

#### ❌ Image doesn't appear after reload
**Solution**:
- Check browser console for errors
- Verify image URL starts with `https://res.cloudinary.com/`
- If it starts with `blob:`, the upload failed - check errors

---

## File Size & Format Limits

### Current Restrictions
- **Max File Size**: 10MB (configurable in CloudinaryService.js)
- **Allowed Formats**: JPEG, JPG, PNG, GIF, WebP
- **Recommended Size**: 2-5MB for optimal upload speed

### Cloudinary Free Tier Limits
- **Storage**: 25GB total
- **Bandwidth**: 25GB/month
- **Transformations**: 25,000/month
- **Images**: Unlimited count (within storage limit)

**Tip**: Images are automatically optimized by Cloudinary, so a 5MB upload might only use 1-2MB of storage.

---

## Image Transformation Examples

### Thumbnails for Lists
```javascript
// In product listing components
const thumbnailUrl = getThumbnailUrl(product.imageUrl, 150);

<img src={thumbnailUrl} alt={product.name} className="w-32 h-32" />
```

### Responsive Images
```javascript
// Different sizes for different screens
const smallUrl = getTransformedUrl(publicId, { width: 400, quality: 'auto' });
const mediumUrl = getTransformedUrl(publicId, { width: 800, quality: 'auto' });
const largeUrl = getTransformedUrl(publicId, { width: 1200, quality: 'auto' });

<picture>
  <source media="(max-width: 640px)" srcSet={smallUrl} />
  <source media="(max-width: 1024px)" srcSet={mediumUrl} />
  <img src={largeUrl} alt="Product" />
</picture>
```

### Auto-Format WebP
```javascript
// Automatically serve WebP to supported browsers
const optimizedUrl = getTransformedUrl(publicId, {
  format: 'auto',  // Chooses best format per browser
  quality: 'auto'  // Optimizes quality vs size
});
```

---

## Migration Plan (Optional)

### If you have existing products with temp URLs:

#### Step 1: Identify Products with Temp URLs
```javascript
// Run this in browser console on Products page
const db = getFirestore(app);
const productsRef = collection(db, 'Products');
const snapshot = await getDocs(productsRef);

const brokenImages = [];
snapshot.forEach(doc => {
  const data = doc.data();
  if (data.imageUrl && data.imageUrl.startsWith('blob:')) {
    brokenImages.push({
      id: doc.id,
      name: data.name,
      url: data.imageUrl
    });
  }
});

console.log(`Found ${brokenImages.length} products with temporary URLs`);
console.table(brokenImages);
```

#### Step 2: Re-upload Images
- Go to each product with a `blob:` URL
- Click the upload button
- Select the image again
- The new Cloudinary URL will replace the old temp URL

---

## Future Enhancements

### 1. **Variant Images**
NewVariantForm.jsx currently doesn't have image upload UI. To add:
```javascript
// Similar to NewProductForm.jsx
const handleVariantImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    setIsUploading(true);
    const result = await uploadImage(file, setUploadProgress, {
      folder: `ims-products/${category}/variants`,
      tags: [category, productName, variantSize]
    });
    setVariantImage(result.url);
  } catch (error) {
    console.error('Upload failed:', error);
  } finally {
    setIsUploading(false);
  }
};
```

### 2. **Document Uploads**
For PDF receipts, invoices, PO documents:
```javascript
// Cloudinary supports PDFs too!
const uploadResult = await uploadDocument(file, onProgress, {
  folder: 'ims-documents/purchase-orders',
  resourceType: 'raw'  // For non-image files
});
```

### 3. **Bulk Image Upload**
For importing products with images:
```javascript
const uploadMultiple = async (files) => {
  const results = await Promise.all(
    files.map(file => uploadImage(file, null, { folder: 'ims-products/bulk' }))
  );
  return results.map(r => r.url);
};
```

### 4. **Image Deletion**
Currently, deletion requires backend implementation. For future:
- Create Node.js Cloud Function
- Use Cloudinary Admin API with signature
- Delete images when products are deleted

---

## Security Notes

### ✅ What's Secure
- Upload preset is **unsigned** (required for browser upload)
- Cloud name is public (safe to expose)
- Images are public (for CDN delivery)
- No sensitive data in image URLs

### ⚠️ Limitations of Unsigned Upload
- Anyone with your preset name can upload (if they know it)
- No server-side validation before upload
- Can't delete images from frontend

### 🔒 Production Recommendations
1. **Use Signed Uploads** (requires backend):
   - Implement Cloud Function to generate signatures
   - More secure, prevents unauthorized uploads
   - Allows upload moderation

2. **Enable Upload Moderation**:
   - Cloudinary dashboard → Settings → Upload
   - Enable "Manual moderation"
   - Review uploads before making public

3. **Set Upload Restrictions**:
   - Max file size: 10MB
   - Allowed formats: images only
   - Folder restrictions via preset

---

## Support & Resources

### Official Documentation
- [Cloudinary Docs](https://cloudinary.com/documentation)
- [Upload Widget](https://cloudinary.com/documentation/upload_widget)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)
- [Pricing Plans](https://cloudinary.com/pricing)

### Internal Resources
- Service File: `src/services/cloudinary/CloudinaryService.js`
- Updated Components: ViewProductModal, NewProductForm
- Environment Template: `.env.example`

### Need Help?
- Check Cloudinary Dashboard → Activity Log for upload details
- Browser Console: Check for detailed error messages
- Cloudinary Support: [support.cloudinary.com](https://support.cloudinary.com)

---

## Summary

### ✅ What Changed
| Before | After |
|--------|-------|
| `URL.createObjectURL(file)` | `uploadImage(file)` |
| Temporary `blob://` URLs | Permanent CDN URLs |
| Images lost on reload | Images persist forever |
| No upload progress | Real-time progress (0-100%) |
| Browser memory storage | Cloud storage |
| No optimization | Auto-optimized images |

### 🚀 Benefits
- **Reliability**: Images never disappear
- **Performance**: CDN delivery, auto-optimization
- **Scalability**: 25GB free storage
- **Features**: Transformations, responsive images
- **Developer Experience**: Easy integration, no backend required

### 📝 Next Steps
1. Set up Cloudinary account (if not done)
2. Configure environment variables
3. Test upload functionality
4. Monitor usage in Cloudinary dashboard
5. Consider implementing variant image uploads
6. Plan for document uploads (future)

---

**Last Updated**: 2024
**Integration Status**: ✅ Complete for product images
**Pending**: Variant images, document uploads, image deletion
