import React, { useState, useEffect } from 'react';
import { X, Tag, TrendingDown, Calendar, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import DiscountService from '../../../../services/firebase/DiscountService';

const DiscountModal = ({ isOpen, onClose, variant, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [customDiscount, setCustomDiscount] = useState(false);
  const [reason, setReason] = useState('Promotional Sale');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && variant) {
      analyzeVariant();
    }
  }, [isOpen, variant]);

  const analyzeVariant = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await DiscountService.analyzeSaleNeed(variant.id);

      if (result.success) {
        setAnalysis(result);
        
        // Set suggested discount if available
        if (result.suggestedDiscount) {
          setDiscountPercentage(result.suggestedDiscount.toString());
        }

        // Set reason based on analysis
        if (result.needsSale) {
          setReason(`Slow-moving inventory (${result.analytics?.classification || 'Class C'})`);
        }
      } else {
        setError(result.error || 'Failed to analyze variant');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountPercentage || discountPercentage <= 0) {
      setError('Please enter a valid discount percentage');
      return;
    }

    setApplying(true);
    setError(null);

    try {
      const result = await DiscountService.applyDiscount(
        variant.id,
        parseFloat(discountPercentage),
        {
          reason,
          updatedBy: 'current-user' // Replace with actual user ID
        }
      );

      if (result.success) {
        onSuccess && onSuccess(result);
        onClose();
      } else {
        setError(result.error || 'Failed to apply discount');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveDiscount = async () => {
    setApplying(true);
    setError(null);

    try {
      const result = await DiscountService.removeDiscount(variant.id);

      if (result.success) {
        onSuccess && onSuccess(result);
        onClose();
      } else {
        setError(result.error || 'Failed to remove discount');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const calculateSalePrice = () => {
    const originalPrice = variant.unitPrice || variant.price || 0;
    const discount = parseFloat(discountPercentage) || 0;
    return originalPrice * (1 - discount / 100);
  };

  const getSuggestionBadge = () => {
    if (!analysis || !analysis.needsSale) return null;

    const { suggestionLevel } = analysis;
    
    const badges = {
      urgent: { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle, text: 'Urgent: Needs Immediate Sale' },
      high: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: TrendingDown, text: 'High: Recommend Sale' },
      moderate: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Info, text: 'Moderate: Consider Sale' }
    };

    const badge = badges[suggestionLevel] || badges.moderate;
    const Icon = badge.icon;

    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${badge.color} mb-4`}>
        <Icon size={20} />
        <span className="font-medium">{badge.text}</span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Tag className="text-orange-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Manage Discount</h2>
              <p className="text-sm text-gray-600">
                {variant.productName} - {variant.variantName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* AI Suggestion Badge */}
              {getSuggestionBadge()}

              {/* Current Status */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Price</p>
                    <p className="text-lg font-bold text-gray-800">
                      ₱{(variant.unitPrice || variant.price || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Stock</p>
                    <p className="text-lg font-bold text-gray-800">
                      {variant.quantity || 0} {variant.baseUnit || 'units'}
                    </p>
                  </div>
                  {variant.onSale && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Current Discount</p>
                        <p className="text-lg font-bold text-green-600">
                          {variant.discountPercentage}% OFF
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Sale Price</p>
                        <p className="text-lg font-bold text-green-600">
                          ₱{(variant.salePrice || 0).toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Analytics (if available) */}
              {analysis?.analytics && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <TrendingDown size={18} className="text-blue-600" />
                    Performance Analysis (Last 30 Days)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Classification</p>
                      <p className="font-medium text-gray-800">{analysis.analytics.classification}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Turnover Rate</p>
                      <p className="font-medium text-gray-800">{analysis.analytics.turnoverRate?.toFixed(2)}x</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Product Age</p>
                      <p className="font-medium text-gray-800">{analysis.analytics.productAge} days</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Units Sold</p>
                      <p className="font-medium text-gray-800">{analysis.analytics.unitsSold}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 italic">{analysis.reason}</p>
                </div>
              )}

              {/* Discount Form */}
              {!variant.onSale ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Percentage
                    </label>
                    <div className="flex gap-2 mb-3">
                      {[10, 15, 20, 25].map(percent => (
                        <button
                          key={percent}
                          onClick={() => {
                            setDiscountPercentage(percent.toString());
                            setCustomDiscount(false);
                          }}
                          className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                            discountPercentage === percent.toString() && !customDiscount
                              ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercentage}
                        onChange={(e) => {
                          setDiscountPercentage(e.target.value);
                          setCustomDiscount(true);
                        }}
                        placeholder="Custom discount %"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <span className="flex items-center px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sale Reason
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="Promotional Sale">Promotional Sale</option>
                      <option value="Slow-moving inventory (Class C)">Slow-moving Inventory</option>
                      <option value="Clearance Sale">Clearance Sale</option>
                      <option value="Seasonal Sale">Seasonal Sale</option>
                      <option value="Special Offer">Special Offer</option>
                    </select>
                  </div>

                  {/* Sale Price Preview */}
                  {discountPercentage && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">New Sale Price</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-green-600">
                              ₱{calculateSalePrice().toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500 line-through">
                              ₱{(variant.unitPrice || variant.price || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 mb-1">You Save</p>
                          <p className="text-xl font-bold text-green-600">
                            ₱{((variant.unitPrice || variant.price || 0) - calculateSalePrice()).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-yellow-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium text-gray-800 mb-1">This variant is currently on sale</p>
                      <p className="text-sm text-gray-600">
                        {variant.discountPercentage}% discount - {variant.saleReason || 'Sale'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={applying}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {variant.onSale ? (
              <button
                onClick={handleRemoveDiscount}
                disabled={applying}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {applying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Removing...
                  </>
                ) : (
                  'Remove Discount'
                )}
              </button>
            ) : (
              <button
                onClick={handleApplyDiscount}
                disabled={applying || !discountPercentage || loading}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {applying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Applying...
                  </>
                ) : (
                  <>
                    <Tag size={18} />
                    Apply Discount
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountModal;
