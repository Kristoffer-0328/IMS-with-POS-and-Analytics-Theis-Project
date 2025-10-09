import React, { useState } from 'react';
import { AnalyticsService } from '../../../../services/firebase/AnalyticsService';

const TestDataGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const handleGenerateTestData = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage('Generating test data...');

      const result = await AnalyticsService.createTestInventorySnapshots();

      setMessage('Test data generated successfully! Please refresh the page to see the results.');
    } catch (error) {
      console.error('Error generating test data:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setError(error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <button
          onClick={handleGenerateTestData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
        >
          {loading ? 'Generating...' : 'Generate Test Data'}
        </button>
        {message && (
          <p className={`mt-2 text-sm ${error ? 'text-red-600' : 'text-gray-600'}`}>
            {message}
          </p>
        )}
        {error && (
          <p className="mt-1 text-xs text-red-500">
            Please check the browser console for more details.
          </p>
        )}
      </div>
    </div>
  );
};

export default TestDataGenerator; 