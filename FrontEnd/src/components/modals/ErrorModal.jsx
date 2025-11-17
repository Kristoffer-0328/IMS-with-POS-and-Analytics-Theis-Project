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
 * @param {React.ReactNode|string} icon - Optional custom icon (React node or text)
 * @param {React.ReactNode} children - Optional additional content (e.g., input fields)
 * @param {boolean} showDefaultButton - Whether to show the default "Got it" button
 */
const ErrorModal = ({ 
  isOpen, 
  onClose, 
  title = 'Error', 
  message = '', 
  type = 'error',
  details = '',
  icon = null,
  children = null,
  showDefaultButton = true
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
      defaultIcon: null
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      messageColor: 'text-amber-800',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      defaultIcon: null
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      messageColor: 'text-blue-800',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      defaultIcon: null
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      messageColor: 'text-green-800',
      buttonBg: 'bg-green-600 hover:bg-green-700',
      defaultIcon: null
    }
  };

  const styles = typeStyles[type] || typeStyles.error;
  // Tailwind focus ring classes must be static; map by type
  const ringClassByType = {
    error: 'focus:ring-red-300',
    warning: 'focus:ring-amber-300',
    info: 'focus:ring-blue-300',
    success: 'focus:ring-green-300'
  };
  const ringClass = ringClassByType[type] || ringClassByType.error;
  // SVG icons per type (stroke uses currentColor for easy theming)
  const iconComponents = {
    error: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Error"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-6 6" />
        <path d="M9 9l6 6" />
      </svg>
    ),
    warning: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Warning"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    info: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Information"
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="8" />
        <path d="M11 12h1v4h1" />
      </svg>
    ),
    success: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Success"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  };

  const defaultIconNode = iconComponents[type] || iconComponents.error;
  const displayIcon = icon ?? defaultIconNode;

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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`${styles.bg} border-2 ${styles.border} rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`${styles.iconBg} ${styles.iconColor} rounded-full p-3 flex-shrink-0`}>
            {typeof displayIcon === 'string' ? (
              <span className="text-3xl" aria-hidden="true">{displayIcon}</span>
            ) : (
              displayIcon
            )}
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

        {/* Additional Content (Optional) */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}

        {/* Action Button */}
        {showDefaultButton && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className={`${styles.buttonBg} text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-4 ${ringClass}`}
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

ErrorModal.displayName = 'ErrorModal';

export default ErrorModal;
