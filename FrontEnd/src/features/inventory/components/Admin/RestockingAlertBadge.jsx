import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const db = getFirestore(app);

const RestockingAlertBadge = ({ onClick }) => {
  const [alertCounts, setAlertCounts] = useState({
    total: 0,
    critical: 0,
    urgent: 0,
    high: 0
  });
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'RestockingRequests'),
      where('status', 'in', ['pending', 'acknowledged'])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const counts = {
          total: 0,
          critical: 0,
          urgent: 0,
          high: 0
        };

        snapshot.forEach((doc) => {
          const data = doc.data();
          counts.total++;
          
          if (data.priority === 'critical') counts.critical++;
          else if (data.priority === 'urgent') counts.urgent++;
          else if (data.priority === 'high') counts.high++;
        });

        setAlertCounts(counts);
        setIsListening(true);
      },
      (error) => {
        console.error('Error listening to restocking alerts:', error);
        setIsListening(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (alertCounts.total === 0) return null;

  let badgeColor = 'bg-blue-500';
  let pulseColor = 'bg-blue-400';
  let textColor = 'text-blue-600';
  
  if (alertCounts.critical > 0) {
    badgeColor = 'bg-red-500';
    pulseColor = 'bg-red-400';
    textColor = 'text-red-600';
  } else if (alertCounts.urgent > 0) {
    badgeColor = 'bg-orange-500';
    pulseColor = 'bg-orange-400';
    textColor = 'text-orange-600';
  } else if (alertCounts.high > 0) {
    badgeColor = 'bg-yellow-500';
    pulseColor = 'bg-yellow-400';
    textColor = 'text-yellow-600';
  }

  const hasCritical = alertCounts.critical > 0;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 group"
      title="View restocking alerts"
    >
      {hasCritical && (
        <span className={`absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75 animate-ping`}></span>
      )}
      
      <div className={`relative ${badgeColor} text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110`}>
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-left">
              <p className="text-sm font-medium opacity-90">Restocking Alerts</p>
              <p className="text-2xl font-bold">{alertCounts.total}</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 whitespace-nowrap">
            <div className="space-y-1">
              <div className="flex items-center justify-between space-x-4">
                <span className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>Critical</span>
                </span>
                <span className="font-bold">{alertCounts.critical}</span>
              </div>
              <div className="flex items-center justify-between space-x-4">
                <span className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>Urgent</span>
                </span>
                <span className="font-bold">{alertCounts.urgent}</span>
              </div>
              <div className="flex items-center justify-between space-x-4">
                <span className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span>High</span>
                </span>
                <span className="font-bold">{alertCounts.high}</span>
              </div>
              <div className="border-t border-gray-700 pt-1 mt-1">
                <div className="flex items-center justify-between space-x-4 font-bold">
                  <span>Total</span>
                  <span>{alertCounts.total}</span>
                </div>
              </div>
            </div>
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md">
          <svg className={`w-4 h-4 ${textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
};

export default RestockingAlertBadge;
