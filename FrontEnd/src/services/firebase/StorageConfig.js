import { getStorage } from 'firebase/storage';
import app from '../../FirebaseConfig';

const storage = getStorage(app);

// Set custom metadata with CORS headers
export const getStorageOptions = () => ({
  customMetadata: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
});

export default storage; 