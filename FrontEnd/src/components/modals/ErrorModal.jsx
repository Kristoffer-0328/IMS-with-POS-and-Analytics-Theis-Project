import React from 'react';

/**
 * Reusable Error Modal Component
 * Can be used throughout the system for validation errors, warnings, and info messages
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {string} title - Modal title
 * @param {string} message - Main error message
 * @param {string} type - Error type: 'error', 'warning', 'info', 'success'
 * @param {string} details - Optional additional details
 * @param {string} icon - Optional custom icon (emoji or text)
 */
const ErrorModal = ({ 
  isOpen, 
  onClose, 
  title = 'Error', 
  message = '', 
  type = 'error',
  details = '',
  icon = null
}) => {
  if (!isOpen) return null;

  // Color schemes based on type
  const typeStyles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      messageColor: 'text-red-800',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      defaultIcon: '❌'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      messageColor: 'text-amber-800',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      defaultIcon: '⚠️'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      messageColor: 'text-blue-800',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      defaultIcon: 'ℹ️'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      messageColor: 'text-green-800',
      buttonBg: 'bg-green-600 hover:bg-green-700',
      defaultIcon: '✅'
    }
  };

  const styles = typeStyles[type] || typeStyles.error;
  const displayIcon = icon || styles.defaultIcon;

  // Handle ESC key
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`${styles.bg} border-2 ${styles.border} rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`${styles.iconBg} ${styles.iconColor} rounded-full p-3 flex-shrink-0`}>
            <span className="text-3xl">{displayIcon}</span>
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${styles.titleColor} mb-2`}>
              {title}
            </h3>
            <p className={`${styles.messageColor} text-sm leading-relaxed`}>
              {message}
            </p>
          </div>
        </div>

        {/* Details Section (Optional) */}
        {details && (
          <div className={`mt-4 p-4 ${styles.iconBg} rounded-lg border ${styles.border}`}>
            <p className={`text-xs ${styles.messageColor} font-mono whitespace-pre-wrap`}>
              {details}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={`${styles.buttonBg} text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-${type}-300`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
