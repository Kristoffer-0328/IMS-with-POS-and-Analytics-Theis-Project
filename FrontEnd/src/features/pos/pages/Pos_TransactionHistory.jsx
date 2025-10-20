import React, { useState, useEffect, useCallback } from 'react';
import { FiChevronDown, FiSearch, FiFilter, FiCalendar } from 'react-icons/fi';
import { getFirestore ,collection, query, orderBy, getDocs, where } from 'firebase/firestore';
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
        timeString,
        // Add formatted individual components for ReceiptModal
        time: {
            hours: date.getHours().toString().padStart(2, '0'),
            minutes: date.getMinutes().toString().padStart(2, '0'),
            seconds: date.getSeconds().toString().padStart(2, '0')
        }
    };
};

// Transaction Summary Component with real data
const TransactionSummary = ({ transactions }) => {
  const calculateSummary = () => {
    const today = new Date().toLocaleDateString();
    const todayTransactions = transactions.filter(t => {
      if (t.createdAt && t.createdAt.toDate) {
        return t.createdAt.toDate().toLocaleDateString() === today;
      }
      return false;
    });

    const todaySales = todayTransactions.reduce((sum, t) => sum + (t.totals?.total || 0), 0);
    const avgTransaction = transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + (t.totals?.total || 0), 0) / transactions.length 
      : 0;

    const paymentMethods = transactions.reduce((acc, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + 1;
      return acc;
    }, {});

    const mostPopular = Object.entries(paymentMethods)
      .sort(([,a], [,b]) => b - a)[0] || [];

    return {
      todaySales,
      totalTransactions: transactions.length,
      avgTransaction,
      popularPayment: mostPopular[0] ? `${mostPopular[0]} (${Math.round(mostPopular[1]/transactions.length*100)}%)` : 'N/A'
    };
  };

  const summary = calculateSummary();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { 
          title: "Today's Sales", 
          value: `₱${summary.todaySales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-100"
        },
        { 
          title: "Total Transactions", 
          value: summary.totalTransactions, 
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-100"
        },
        { 
          title: "Average Transaction", 
          value: `₱${summary.avgTransaction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-100"
        },
        { 
          title: "Most Popular Payment", 
          value: summary.popularPayment, 
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-100"
        }
      ].map((stat, index) => (
        <div 
          key={index} 
          className={`${stat.bgColor} rounded-xl shadow-sm p-6 border ${stat.borderColor} hover:shadow-md transition-shadow duration-200`}
        >
          <p className="text-gray-600 text-sm font-medium mb-2">{stat.title}</p>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default function Pos_Transaction_History() {
  const [transactions, setTransactions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const transactionsRef = collection(db, 'posTransactions');
        let q = query(transactionsRef, orderBy('createdAt', 'desc'));

        if (currentFilter !== 'all') {
          q = query(q, where('paymentMethod', '==', currentFilter));
        }

        const querySnapshot = await getDocs(q);
        const fetchedTransactions = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.transactionId || doc.id,
            transactionId: data.transactionId,
            customerName: data.customerInfo?.name || 'Unknown',
            total: data.totals?.total || 0,
            paymentMethod: data.paymentMethod || 'Unknown',
            status: data.status || 'completed',
            createdAt: data.createdAt,
            items: data.items || [],
            customerInfo: data.customerInfo || {},
            totals: data.totals || {},
            saleDate: data.saleDate,
            saleTime: data.saleTime,
            cashier: data.cashier,
            ...data
          };
        });

        setTransactions(fetchedTransactions);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentFilter]);

  // Filter transactions based on search
  const filteredTransactions = transactions.filter(transaction =>
    (transaction.transactionId || transaction.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetails = useCallback((transaction) => {
    setSelectedTransaction(transaction);
  }, []);

  const handleCloseModal = useCallback(() => {

    setSelectedTransaction(null);
  }, []);

  return (
    <div className="">

    
      {/* Transaction Summary Cards - using the enhanced TransactionSummary component */}
      <TransactionSummary transactions={transactions} />

      {/* Enhanced Table Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>

          {/* Enhanced Search Input */}
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

        {/* Enhanced Table Styling */}
        <div className="w-full overflow-x-auto rounded-xl border border-gray-100">
          {loading ? (
            <div className="text-center py-4">Loading transactions...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-4">{error}</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Receipt #', 'Date & Time', 'Customer', 'Total', 'Payment Method', 'Status', 'Action'].map((h) => (
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
                    <tr key={transaction.transactionId || transaction.id} className="hover:bg-gray-50 transition-colors">
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
                          : transaction.releaseStatus === 'pending_release'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.releaseStatus === 'released' ? 'Released' : 'Pending'}
                      </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button 
                          onClick={() => handleViewDetails(transaction)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Enhanced Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 mt-4">
          <div className="flex flex-1 justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Next  
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of{' '}
                <span className="font-medium">24</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Previous</span>
                  &larr;
                </button>
                {[1, 2, 3].map(page => (
                  <button
                    key={page}
                    className={`relative inline-flex items-center px-4 py-2 border ${page === 1 ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                ))}
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Next</span>
                  &rarr;
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Add Receipt Modal */}
      {selectedTransaction && (
        <ReceiptModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}