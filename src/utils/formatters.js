/**
 * Indian Number Formatting and Currency Helpers
 */

/**
 * Formats a number to Indian currency format (e.g., 10,50,000 or ₹10,50,000)
 * Uses the Indian numbering system: 1,00,000 (one lakh), 1,00,00,000 (one crore)
 * @param {number|string} amount
 * @param {boolean} [includeSymbol=true]
 * @returns {string}
 */
export function formatINR(amount, includeSymbol = true) {
  if (amount === undefined || amount === null || amount === '' || isNaN(Number(amount))) {
    return includeSymbol ? '₹0' : '0';
  }

  const num = Math.round(Number(amount));
  const isNegative = num < 0;
  const absNumStr = Math.abs(num).toString();

  let lastThree = absNumStr.substring(absNumStr.length - 3);
  const otherNumbers = absNumStr.substring(0, absNumStr.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }

  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const sign = isNegative ? '-' : '';

  return includeSymbol ? `${sign}₹${formatted}` : `${sign}${formatted}`;
}

/**
 * Parses an INR formatted string into a plain number.
 * e.g., "₹ 10,50,000" -> 1050000
 * @param {string|number} formattedStr
 * @returns {number}
 */
export function parseINR(formattedStr) {
  if (typeof formattedStr === 'number') return formattedStr;
  if (!formattedStr) return 0;
  const clean = formattedStr.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formats a date string (YYYY-MM-DD) into readable Indian format (DD/MM/YYYY)
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Masks sensitive PII string showing only the last 4 characters.
 * Useful for PAN, Aadhaar, Account Numbers, etc.
 * @param {string} value
 * @param {number} [visibleChars=4]
 * @returns {string}
 */
export function maskPII(value, visibleChars = 4) {
  if (!value) return '';
  const str = String(value).trim();
  if (str.length <= visibleChars) return str;
  const hiddenPart = '•'.repeat(str.length - visibleChars);
  const visiblePart = str.slice(-visibleChars);
  return `${hiddenPart}${visiblePart}`;
}

/**
 * Masks Aadhaar number into standard 4-digit groups (•••• •••• 1234)
 * @param {string} aadhaar
 * @returns {string}
 */
export function maskAadhaar(aadhaar) {
  if (!aadhaar) return '';
  const clean = aadhaar.replace(/\s+/g, '');
  if (clean.length < 12) return clean;
  return `•••• •••• ${clean.slice(-4)}`;
}

/**
 * Masks PAN into standard format (••••••1234 or ABCDE••••F)
 * As per Section B4.4: show only last 4 characters.
 * @param {string} pan
 * @returns {string}
 */
export function maskPAN(pan) {
  if (!pan) return '';
  const clean = pan.trim().toUpperCase();
  if (clean.length <= 4) return clean;
  return `••••••${clean.slice(-4)}`;
}
