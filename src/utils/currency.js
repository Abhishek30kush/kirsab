/**
 * Currency and pricing formatting utilities
 */

/**
 * Formats a numeric price into INR Indian Rupee string (₹XX)
 * @param {number|null|undefined} price 
 * @param {object} options
 * @returns {string} Formatted string
 */
export const formatCurrency = (price, options = {}) => {
  const { placeholder = 'भाव जल्द', prefix = '₹' } = options;

  if (price === null || price === undefined || isNaN(price) || price <= 0) {
    return placeholder;
  }

  // Format with Indian numbering system (e.g. 1,00,000 if large)
  return `${prefix}${Number(price).toLocaleString('en-IN')}`;
};

/**
 * Checks if a product has a valid, configured price for sale
 * @param {object} product 
 * @returns {boolean}
 */
export const isPriceConfigured = (product) => {
  return (
    product &&
    product.isConfigured === true &&
    typeof product.price === 'number' &&
    product.price > 0 &&
    product.inStock === true
  );
};
