/**
 * Cloudinary Service
 * Handles image uploads to Cloudinary cloud storage
 * 
 * Features:
 * - Direct browser upload (unsigned)
 * - Progress tracking
 * - Error handling
 * - Image optimization
 * - Secure CDN URLs
 */

// Cloudinary configuration from environment variables
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER || 'ims-products';

/**
 * Validates Cloudinary configuration
 * @throws {Error} If configuration is missing
 */
const validateConfig = () => {
    if (!CLOUDINARY_CLOUD_NAME) {
        throw new Error('VITE_CLOUDINARY_CLOUD_NAME is not defined in environment variables');
    }
    if (!CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('VITE_CLOUDINARY_UPLOAD_PRESET is not defined in environment variables');
    }
};

/**
 * Upload image to Cloudinary
 * 
 * @param {File} file - The image file to upload
 * @param {Function} onProgress - Callback for upload progress (0-100)
 * @param {Object} options - Additional upload options
 * @param {string} options.folder - Custom folder path (overrides default)
 * @param {string} options.publicId - Custom public ID for the image
 * @param {Array<string>} options.tags - Tags for the image
 * @returns {Promise<Object>} Upload result with URL and metadata
 * 
 * @example
 * try {
 *   const result = await uploadImage(file, (progress) => {
 *     
 *   });
 *   
 * } catch (error) {
 *   console.error('Upload failed:', error.message);
 * }
 */
export const uploadImage = async (file, onProgress = null, options = {}) => {
    try {
        // Validate configuration
        validateConfig();

        // Validate file
        if (!file) {
            throw new Error('No file provided');
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 10MB`);
        }

        // Prepare form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        // Sanitize folder path: remove special characters and spaces
        const sanitizedFolder = (options.folder || CLOUDINARY_FOLDER)
            .replace(/[&\s]+/g, '-')  // Replace spaces and & with hyphens
            .replace(/[^a-zA-Z0-9\-_\/]/g, '')  // Remove other special chars
            .replace(/--+/g, '-')  // Replace multiple hyphens with single
            .replace(/^-|-$/g, '');  // Remove leading/trailing hyphens
        
        formData.append('folder', sanitizedFolder);
        
        // Debug logging
        
        
        // Add optional parameters
        if (options.publicId) {
            formData.append('public_id', options.publicId);
        }
        if (options.tags && Array.isArray(options.tags)) {
            formData.append('tags', options.tags.join(','));
        }

        // Cloudinary upload URL
        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

        // Create XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress
            if (onProgress && typeof onProgress === 'function') {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = Math.round((e.loaded / e.total) * 100);
                        onProgress(percentComplete);
                    }
                });
            }

            // Handle successful upload
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    resolve({
                        success: true,
                        url: response.secure_url,
                        publicId: response.public_id,
                        format: response.format,
                        width: response.width,
                        height: response.height,
                        bytes: response.bytes,
                        createdAt: response.created_at,
                        resourceType: response.resource_type,
                        type: response.type,
                        version: response.version,
                        assetId: response.asset_id
                    });
                } else {
                    // Parse error response from Cloudinary
                    let errorMessage = `Upload failed with status: ${xhr.status}`;
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse.error && errorResponse.error.message) {
                            errorMessage += ` - ${errorResponse.error.message}`;
                        }
                        console.error('Cloudinary error response:', errorResponse);
                    } catch (e) {
                        console.error('Raw error response:', xhr.responseText);
                    }
                    reject(new Error(errorMessage));
                }
            });

            // Handle upload errors
            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });

            // Handle upload abortion
            xhr.addEventListener('abort', () => {
                reject(new Error('Upload was cancelled'));
            });

            // Send request
            xhr.open('POST', uploadUrl);
            xhr.send(formData);
        });

    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};

/**
 * Delete image from Cloudinary
 * Note: This requires backend implementation with signed requests
 * For unsigned uploads, deletion must be done through Cloudinary dashboard
 * 
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<Object>} Deletion result
 */
export const deleteImage = async (publicId) => {
    console.warn('Image deletion requires backend implementation with API signature');

    return {
        success: false,
        message: 'Deletion requires backend implementation'
    };
};

/**
 * Generate Cloudinary transformation URL
 * 
 * @param {string} publicId - The public ID of the image
 * @param {Object} transformations - Cloudinary transformation options
 * @param {number} transformations.width - Resize width
 * @param {number} transformations.height - Resize height
 * @param {string} transformations.crop - Crop mode (fill, fit, scale, etc.)
 * @param {string} transformations.quality - Image quality (auto, best, good, etc.)
 * @param {string} transformations.format - Output format (jpg, png, webp, auto)
 * @returns {string} Transformed image URL
 * 
 * @example
 * const thumbnailUrl = getTransformedUrl(publicId, {
 *   width: 300,
 *   height: 300,
 *   crop: 'fill',
 *   quality: 'auto',
 *   format: 'auto'
 * });
 */
export const getTransformedUrl = (publicId, transformations = {}) => {
    validateConfig();

    const {
        width,
        height,
        crop = 'fill',
        quality = 'auto',
        format = 'auto',
        gravity = 'auto'
    } = transformations;

    let transformString = '';

    if (width || height) {
        const parts = [];
        if (width) parts.push(`w_${width}`);
        if (height) parts.push(`h_${height}`);
        if (crop) parts.push(`c_${crop}`);
        if (gravity && crop === 'fill') parts.push(`g_${gravity}`);
        transformString += parts.join(',');
    }

    if (quality) {
        transformString += (transformString ? ',' : '') + `q_${quality}`;
    }

    if (format) {
        transformString += (transformString ? ',' : '') + `f_${format}`;
    }

    const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    return transformString 
        ? `${baseUrl}/${transformString}/${publicId}`
        : `${baseUrl}/${publicId}`;
};

/**
 * Extract public ID from Cloudinary URL
 * 
 * @param {string} url - The Cloudinary URL
 * @returns {string|null} The public ID or null if not a Cloudinary URL
 * 
 * @example
 * const publicId = extractPublicId('https://res.cloudinary.com/demo/image/upload/v1234567/sample.jpg');
 * // Returns: 'sample' or full path with folder
 */
export const extractPublicId = (url) => {
    if (!url || typeof url !== 'string') return null;

    // Match Cloudinary URL pattern
    const regex = /cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
    const match = url.match(regex);

    return match ? match[1] : null;
};

/**
 * Check if URL is a Cloudinary URL
 * 
 * @param {string} url - The URL to check
 * @returns {boolean} True if Cloudinary URL
 */
export const isCloudinaryUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('cloudinary.com') && url.includes('/image/upload/');
};

/**
 * Generate thumbnail URL from Cloudinary image
 * 
 * @param {string} url - Original Cloudinary URL or public ID
 * @param {number} size - Thumbnail size (width and height)
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (url, size = 200) => {
    const publicId = isCloudinaryUrl(url) ? extractPublicId(url) : url;
    
    if (!publicId) return url;

    return getTransformedUrl(publicId, {
        width: size,
        height: size,
        crop: 'fill',
        quality: 'auto',
        format: 'auto'
    });
};

export default {
    uploadImage,
    deleteImage,
    getTransformedUrl,
    extractPublicId,
    isCloudinaryUrl,
    getThumbnailUrl
};
