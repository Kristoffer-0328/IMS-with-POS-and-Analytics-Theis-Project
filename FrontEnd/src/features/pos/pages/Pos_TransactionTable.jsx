import React, { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import { getFirestore, collection, query, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import ReceiptModal from '../components/Modals/ReceiptModal';
import DashboardHeader from '../../inventory/components/Dashboard/DashboardHeader';

const db = getFirestore(app);

// Helper function to format date and time
const getFormattedDateTime = (timestamp) => {
  if (!timestamp || !timestamp.toDate) {
    return {
      dateString: 'N/A',
      timeString: 'N/A'
    };
  }

  const date = timestamp.toDate();

  const dateString = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/,/g, '').toUpperCase();

  const timeString = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return {
    dateString,
    timeString
  };
};

export default function Pos_TransactionTable() {
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const transactionsRef = collection(db, 'Transactions');
        const q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(15));
        const querySnapshot = await getDocs(q);
        const fetchedTransactions = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.transactionId || doc.id,
            transactionId: data.transactionId,
            customerName: data.customerInfo?.name || 'Unknown',
            total: data.amountPaid || data.totals?.total || 0,
            paymentMethod: data.paymentMethod || 'Unknown',
            status: data.status || 'completed',
            createdAt: data.createdAt,
            items: data.items || [],
            customerInfo: data.customerInfo || {},
            totals: data.totals || {},
            saleDate: data.saleDate,
            saleTime: data.saleTime,
            cashier: data.cashier,
            cashierName: data.cashierName,
            releaseStatus: data.releaseStatus || 'pending_release',
            ...data
          };
        });

        setTransactions(fetchedTransactions);
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === 15);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Load more transactions
  const loadMoreTransactions = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const transactionsRef = collection(db, 'Transactions');
      const q = query(transactionsRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(15));
      const querySnapshot = await getDocs(q);
      const newTransactions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.transactionId || doc.id,
          transactionId: data.transactionId,
          customerName: data.customerInfo?.name || 'Unknown',
          total: data.amountPaid || data.totals?.total || 0,
          paymentMethod: data.paymentMethod || 'Unknown',
          status: data.status || 'completed',
          createdAt: data.createdAt,
          items: data.items || [],
          customerInfo: data.customerInfo || {},
          totals: data.totals || {},
          saleDate: data.saleDate,
          saleTime: data.saleTime,
          cashier: data.cashier,
          cashierName: data.cashierName,
          releaseStatus: data.releaseStatus || 'pending_release',
          ...data
        };
      });

      setTransactions(prev => [...prev, ...newTransactions]);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === 15);
    } catch (err) {
      console.error('Error loading more transactions:', err);
      setError('Failed to load more transactions');
    } finally {
      setLoadingMore(false);
    }
  };

  // Filter transactions based on search
  const filteredTransactions = transactions.filter(transaction =>
    (transaction.transactionId || transaction.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  return (
    <div className="p-6">
      <DashboardHeader />
      <div className="mb-6">
   

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search Receipt #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 w-full transition-shadow"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="w-full overflow-x-auto rounded-xl border border-gray-100">
          {loading ? (
            <div className="text-center py-4">Loading transactions...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-4">{error}</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Receipt #', 'Date & Time', 'Customer', 'Total', 'Payment Method', 'Status'].map((h) => (
                    <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredTransactions.map((transaction) => {
                  const { dateString, timeString } = getFormattedDateTime(transaction.createdAt);
                  return (
                    <tr
                      key={transaction.transactionId || transaction.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(transaction)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {transaction.transactionId || transaction.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {`${dateString} ${timeString}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transaction.customerName}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ₱{transaction.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transaction.paymentMethod}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.releaseStatus === 'released'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {transaction.releaseStatus === 'released' ? 'Released' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 mt-4">
          <div className="text-sm text-gray-700">
            Showing {filteredTransactions.length} transactions
          </div>
          {hasMore && (
            <button
              onClick={loadMoreTransactions}
              disabled={loadingMore}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedTransaction && (
        <ReceiptModal
          transaction={selectedTransaction}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}