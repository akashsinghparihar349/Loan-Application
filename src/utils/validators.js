/**
 * LendSwift Validation Utilities
 * Includes PAN format & entity type validation, Verhoeff checksum algorithm for Aadhaar,
 * GST format validation, age calculations, and currency/number helpers.
 */

// --- Verhoeff Checksum Algorithm Lookup Tables ---
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates a 12-digit Aadhaar number using the Verhoeff checksum algorithm.
 * The checksum across all 12 digits must evaluate to 0.
 * @param {string} aadhaar
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateAadhaar(aadhaar) {
  if (!aadhaar) {
    return { isValid: false, error: 'Aadhaar number is required' };
  }
  const cleanAadhaar = aadhaar.replace(/\s+/g, '');
  if (!/^\d{12}$/.test(cleanAadhaar)) {
    return { isValid: false, error: 'Aadhaar must be exactly 12 digits' };
  }

  // Verhoeff checksum calculation
  let c = 0;
  const digits = cleanAadhaar.split('').map(Number).reverse();

  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }

  if (c !== 0) {
    return { isValid: false, error: 'Invalid Aadhaar number: failed Verhoeff checksum validation' };
  }

  return { isValid: true };
}

/**
 * Validates Indian PAN (Permanent Account Number).
 * Format: 5 uppercase letters + 4 digits + 1 uppercase letter.
 * 4th character represents entity type:
 * P = Individual, C = Company, H = HUF, A = AOP, B = BOI,
 * G = Government, J = Artificial Juridical Person, L = Local Authority, F = Firm, T = Trust.
 * @param {string} pan
 * @param {string} loanType 'Personal' | 'Home' | 'Business'
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validatePAN(pan, loanType = 'Personal') {
  if (!pan) {
    return { isValid: false, error: 'PAN is required' };
  }
  const cleanPan = pan.trim().toUpperCase();

  if (cleanPan.length !== 10) {
    return { isValid: false, error: 'PAN must be exactly 10 characters in format AAAAA9999A' };
  }

  const basicRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!basicRegex.test(cleanPan)) {
    return { isValid: false, error: 'PAN format must be 5 letters, 4 digits, and 1 letter (e.g. ABCDE1234F)' };
  }

  const fourthChar = cleanPan[3];
  const validEntityChars = ['P', 'C', 'H', 'A', 'B', 'G', 'J', 'L', 'F', 'T'];

  if (!validEntityChars.includes(fourthChar)) {
    return {
      isValid: false,
      error: 'PAN 4th character must indicate entity type (P for Individual, C for Company, etc.)',
    };
  }

  if (loanType === 'Personal' || loanType === 'Home') {
    if (fourthChar !== 'P') {
      return {
        isValid: false,
        error: `For ${loanType} Loans, PAN 4th character must be 'P' (Individual). Found '${fourthChar}'`,
      };
    }
  } else if (loanType === 'Business') {
    if (!['P', 'C', 'F'].includes(fourthChar)) {
      return {
        isValid: false,
        error: "For Business Loans, PAN 4th character must be 'P' (Individual), 'C' (Company), or 'F' (Firm)",
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates Indian GSTIN (Goods and Services Tax Identification Number)
 * Format: 2 digits (State Code) + 10 alphanumeric (PAN) + 1 alphanumeric (entity #) + 'Z' + 1 alphanumeric (checksum)
 * Total 15 characters.
 * @param {string} gst
 * @param {string} [businessPAN] Optional PAN to cross-verify against
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateGST(gst, businessPAN = '') {
  if (!gst) {
    return { isValid: false, error: 'GST number is required for business owners' };
  }
  const cleanGst = gst.trim().toUpperCase();

  if (cleanGst.length !== 15) {
    return { isValid: false, error: 'GST number must be exactly 15 characters' };
  }

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(cleanGst)) {
    return {
      isValid: false,
      error: 'Invalid GST format (2 state digits + 10 PAN chars + 1 entity num + Z + 1 checksum char)',
    };
  }

  if (businessPAN) {
    const extractedPan = cleanGst.substring(2, 12);
    if (extractedPan !== businessPAN.trim().toUpperCase()) {
      return {
        isValid: false,
        error: `GST PAN (${extractedPan}) does not match applicant PAN (${businessPAN.trim().toUpperCase()})`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Calculates precise age from date of birth.
 * Edge case: exactly 21 years old today is accepted; 20 years 364 days is rejected.
 * @param {string|Date} dobDate
 * @returns {{ years: number, isEligible: boolean, error?: string }}
 */
export function calculateAge(dobDate) {
  if (!dobDate) {
    return { years: 0, isEligible: false, error: 'Date of birth is required' };
  }

  const birthDate = new Date(dobDate);
  if (isNaN(birthDate.getTime())) {
    return { years: 0, isEligible: false, error: 'Invalid date format' };
  }

  const today = new Date();
  
  // Calculate precise age
  let years = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  const d = today.getDate() - birthDate.getDate();

  if (m < 0 || (m === 0 && d < 0)) {
    years--;
  }

  if (years < 21) {
    return {
      years,
      isEligible: false,
      error: 'Applicant must be at least 21 years old as of today',
    };
  }

  if (years > 65) {
    return {
      years,
      isEligible: false,
      error: 'Applicant age cannot exceed 65 years',
    };
  }

  return { years, isEligible: true };
}

/**
 * Validates cross-step dependency: DOB + tenure must not exceed 65 years.
 * @param {number} applicantAgeYears
 * @param {number} tenureMonths
 * @returns {{ isValid: boolean, error?: string, maxTenureMonths: number }}
 */
export function validateAgeTenure(applicantAgeYears, tenureMonths) {
  const maxTenureYears = 65 - applicantAgeYears;
  const maxTenureMonths = Math.max(0, maxTenureYears * 12);

  if (tenureMonths > maxTenureMonths) {
    return {
      isValid: false,
      maxTenureMonths,
      error: `Applicant age (${applicantAgeYears} yrs) + tenure (${tenureMonths} mos) exceeds maximum allowed age limit of 65 years. Max tenure: ${maxTenureMonths} months.`,
    };
  }

  return { isValid: true, maxTenureMonths };
}

/**
 * Validates 10-digit Indian Mobile Number starting with 6, 7, 8, or 9.
 * @param {string} mobile
 * @returns {boolean}
 */
export function isValidIndianMobile(mobile) {
  if (!mobile) return false;
  const clean = mobile.replace(/[^0-9]/g, '');
  return /^[6-9]\d{9}$/.test(clean);
}

/**
 * Validates Indian PIN code (6 digits, non-zero first digit).
 * @param {string} pin
 * @returns {boolean}
 */
export function isValidIndianPin(pin) {
  if (!pin) return false;
  return /^[1-9][0-9]{5}$/.test(pin.trim());
}

/**
 * Validates Voter ID (EPIC): 3 letters followed by 7 digits.
 * @param {string} voterId
 * @returns {boolean}
 */
export function isValidVoterId(voterId) {
  if (!voterId) return true; // optional
  return /^[A-Z]{3}[0-9]{7}$/i.test(voterId.trim());
}

/**
 * Validates Indian Passport: 1 letter followed by 7 digits.
 * @param {string} passport
 * @returns {boolean}
 */
export function isValidPassport(passport) {
  if (!passport) return true; // optional
  return /^[A-Z]{1}[0-9]{7}$/i.test(passport.trim());
}
