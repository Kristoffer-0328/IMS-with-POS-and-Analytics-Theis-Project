import React, { useState } from 'react';
import StorageFacilityInteractiveMap from '../../inventory/components/Inventory/StorageFacilityInteractiveMap';
import { initializeStorageUnitsFromConfig } from '../../../services/firebase/StorageServices';

const StorageFacilityMap = () => {
  const [initializing, setInitializing] = useState(false);
  const [initMessage, setInitMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleInitializeStorage = async () => {
    setInitializing(true);
    setInitMessage('');

    try {
      const result = await initializeStorageUnitsFromConfig();
      if (result.success) {
        setInitMessage(`Successfully initialized ${result.count} storage units`);
      } else {
        setInitMessage(`Failed to initialize storage units: ${result.error}`);
      }
    } catch (error) {
      setInitMessage(`❌ Error initializing storage units: ${error.message}`);
    } finally {
      setInitializing(false);
    }
  };

  const toggleEditMode = () => {
    if (isEditMode && hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to exit edit mode?')) {
        return;
      }
    }
    setIsEditMode(!isEditMode);
    setHasUnsavedChanges(false);
  };

  const handleSaveChanges = () => {
    // Changes are already saved in the interactive map component
    // This just resets the UI state
    setHasUnsavedChanges(false);
    setIsEditMode(false);
  };

  const handleCancelChanges = () => {
    if (confirm('Are you sure you want to cancel all changes?')) {
      setHasUnsavedChanges(false);
      setIsEditMode(false);
      // The interactive map component will handle resetting any pending changes
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Storage Facility Map</h1>
              <p className="mt-2 text-gray-600">
                Interactive map of all storage units with real-time capacity information
              </p>
              {isEditMode && (
                <div className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                  <strong>Edit Mode:</strong> You can modify storage units, add new ones, or delete existing ones.
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {!isEditMode ? (
                <>
                  <button
                    onClick={handleInitializeStorage}
                    disabled={initializing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {initializing ? 'Initializing...' : 'Initialize Storage Units'}
                  </button>
                  <button
                    onClick={toggleEditMode}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    Edit Storage Units
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelChanges}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={!hasUnsavedChanges}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
          {initMessage && (
            <div className={`mt-4 p-3 rounded-lg ${initMessage.includes('Successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {initMessage}
            </div>
          )}
          {hasUnsavedChanges && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-300">
              Warning: You have unsaved changes. Click "Save Changes" to apply them or "Cancel" to discard.
            </div>
          )}
        </div>

        <StorageFacilityInteractiveMap 
          viewOnly={!isEditMode} 
          editMode={isEditMode}
          onChangesMade={() => setHasUnsavedChanges(true)}
        />
      </div>
    </div>
  );
};

export default StorageFacilityMap;