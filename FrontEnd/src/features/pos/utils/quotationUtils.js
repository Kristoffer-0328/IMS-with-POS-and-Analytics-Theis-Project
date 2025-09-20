export const QuotationUtils = {
  // Generate unique quotation number
  generateQuotationNumber: () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    return `GS-${year}${month}${day}-${time}`;
  },

  // Format date for display
  formatDate: (date = new Date()) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Calculate validity date
  calculateValidityDate: (days = 30) => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + parseInt(days));
    return validUntil.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Format currency
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  // Calculate totals
  calculateTotals: (cartItems, discountPercent = 0, deliveryFee = 0) => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discount = (subtotal * discountPercent) / 100;
    const subtotalAfterDiscount = subtotal - discount;
    const tax = subtotalAfterDiscount * 0.12; // 12% VAT
    const grandTotal = subtotalAfterDiscount + tax + deliveryFee;

    return {
      subtotal,
      discount,
      tax,
      deliveryFee,
      grandTotal,
      formattedSubtotal: QuotationUtils.formatCurrency(subtotal),
      formattedDiscount: QuotationUtils.formatCurrency(discount),
      formattedTax: QuotationUtils.formatCurrency(tax),
      formattedDeliveryFee: QuotationUtils.formatCurrency(deliveryFee),
      formattedGrandTotal: QuotationUtils.formatCurrency(grandTotal)
    };
  },

  // Prepare cart items for quotation
  prepareCartItems: (cartItems) => {
    return cartItems.map(item => ({
      ...item,
      formattedPrice: QuotationUtils.formatCurrency(item.price),
      formattedTotal: QuotationUtils.formatCurrency(item.price * item.qty)
    }));
  },

  // Default company information
  getDefaultCompanyInfo: () => ({
    name: 'Glory Star Hardware',
    tagline: 'Construction Materials Corporation',
    address: 'Brgy. [Your Barangay], [Your City]',
    city: '[Your City], [Province], [ZIP Code]',
    phone: '+63 XXX XXX XXXX',
    email: 'info@glorystarhardware.com',
    website: 'www.glorystarhardware.com'
  }),

  // Validate required customer fields
  validateCustomerInfo: (customerInfo) => {
    const errors = {};
    
    if (!customerInfo.name?.trim()) {
      errors.name = 'Customer name is required';
    }
    
    if (!customerInfo.address?.trim()) {
      errors.address = 'Address is required';
    }
    
    if (!customerInfo.phone?.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    if (customerInfo.email && !/\S+@\S+\.\S+/.test(customerInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Create quotation data object
  createQuotationData: (customerInfo, cartItems, currentUser, options = {}) => {
    const {
      discountPercent = 0,
      deliveryFee = 0,
      salesRep = null
    } = options;

    const quotationNumber = QuotationUtils.generateQuotationNumber();
    const formattedDate = QuotationUtils.formatDate();
    const validUntilDate = QuotationUtils.calculateValidityDate(customerInfo.validityDays);
    const items = QuotationUtils.prepareCartItems(cartItems);
    const totals = QuotationUtils.calculateTotals(cartItems, discountPercent, deliveryFee);
    const companyInfo = QuotationUtils.getDefaultCompanyInfo();

    return {
      quotationNumber,
      formattedDate,
      validUntilDate,
      customer: customerInfo,
      items,
      totals,
      salesRep: salesRep || currentUser?.displayName || currentUser?.email || 'Sales Representative',
      companyInfo,
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || 'unknown',
        discountPercent,
        deliveryFee,
        itemCount: cartItems.length
      }
    };
  }
};

export default QuotationUtils;