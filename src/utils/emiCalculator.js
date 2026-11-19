/**
 * EMI and Financial Computations as per Section C3.3
 */

export const LOAN_INTEREST_RATES = {
  Personal: 10.5, // 10.5% p.a.
  Home: 8.5,      // 8.5% p.a.
  Business: 14.0, // 14.0% p.a.
};

export const LOAN_LIMITS = {
  Personal: {
    minAmount: 50000,
    maxAmount: 1000000, // 10 Lakhs
    minTenure: 12,
    maxTenure: 60,
    coApplicantThreshold: 500000, // strictly > 500000 triggers co-applicant
  },
  Home: {
    minAmount: 500000,
    maxAmount: 10000000, // 1 Crore
    minTenure: 60,
    maxTenure: 360,
    coApplicantThreshold: 0, // Always triggers co-applicant
  },
  Business: {
    minAmount: 100000,
    maxAmount: 5000000, // 50 Lakhs
    minTenure: 12,
    maxTenure: 120,
    coApplicantThreshold: 2000000, // strictly > 2000000 triggers co-applicant
  },
};

/**
 * Calculates reducing balance EMI:
 * Formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * @param {number} principal - Loan amount (P)
 * @param {number} annualRate - Annual interest rate in % (e.g. 10.5)
 * @param {number} tenureMonths - Tenure in months (n)
 * @returns {number} Monthly EMI (rounded to nearest integer)
 */
export function calculateEMI(principal, annualRate, tenureMonths) {
  const P = Number(principal);
  const n = Number(tenureMonths);
  const r = (Number(annualRate) / 12) / 100;

  if (!P || P <= 0 || !n || n <= 0 || !annualRate || annualRate <= 0) {
    return 0;
  }

  const factor = Math.pow(1 + r, n);
  const emi = (P * r * factor) / (factor - 1);

  return Math.round(emi);
}

/**
 * Calculates Processing Fee: 1% of loan amount, Min ₹2,000, Max ₹25,000.
 * @param {number} principal
 * @returns {number}
 */
export function calculateProcessingFee(principal) {
  const P = Number(principal) || 0;
  if (P <= 0) return 0;
  const rawFee = P * 0.01; // 1%
  const clampedFee = Math.min(25000, Math.max(2000, rawFee));
  return Math.round(clampedFee);
}

/**
 * Computes all loan financial metrics: EMI, Total Repayment, Total Interest, Processing Fee, APR.
 * @param {Object} params
 * @param {string} params.loanType - 'Personal' | 'Home' | 'Business'
 * @param {number} params.principal - Loan amount
 * @param {number} params.tenureMonths - Tenure in months
 * @param {number} [params.monthlyIncome=0] - Primary applicant income
 * @param {number} [params.coApplicantIncome=0] - Co-applicant income
 * @param {number} [params.monthlyRent=0] - Monthly rent expense if rented
 * @returns {Object} Full financial breakdown
 */
export function computeLoanSummary({
  loanType = 'Personal',
  principal = 0,
  tenureMonths = 12,
  monthlyIncome = 0,
  coApplicantIncome = 0,
  monthlyRent = 0,
}) {
  const P = Number(principal) || 0;
  const n = Number(tenureMonths) || 12;
  const rate = LOAN_INTEREST_RATES[loanType] || 10.5;

  const emi = calculateEMI(P, rate, n);
  const totalRepayment = emi * n;
  const totalInterest = Math.max(0, totalRepayment - P);
  const processingFee = calculateProcessingFee(P);
  const gstOnFee = Math.round(processingFee * 0.18); // 18% GST on processing fee

  const totalMonthlyIncome = (Number(monthlyIncome) || 0) + (Number(coApplicantIncome) || 0);
  const netDisposableIncome = Math.max(1, totalMonthlyIncome - (Number(monthlyRent) || 0));

  // EMI-to-Income Ratio (DTI / FOIR)
  const emiToIncomeRatio = totalMonthlyIncome > 0
    ? Math.round((emi / totalMonthlyIncome) * 100)
    : 0;

  const isHighRiskRatio = emiToIncomeRatio > 50;

  return {
    loanType,
    principal: P,
    tenureMonths: n,
    tenureYears: (n / 12).toFixed(1),
    interestRate: rate,
    monthlyEMI: emi,
    totalInterest,
    totalRepayment,
    processingFee,
    gstOnFee,
    totalUpfrontFee: processingFee + gstOnFee,
    totalCostOfBorrowing: totalInterest + processingFee + gstOnFee,
    totalMonthlyIncome,
    emiToIncomeRatio,
    isHighRiskRatio,
  };
}

/**
 * Determines whether Step 6 (Co-Applicant) is required.
 * Rule:
 * (a) Personal Loan and amount > 5,00,000
 * (b) Always for Home Loan
 * (c) Business Loan and amount > 20,00,000
 * @param {string} loanType
 * @param {number} amount
 * @returns {boolean}
 */
export function isCoApplicantRequired(loanType, amount) {
  const P = Number(amount) || 0;
  if (loanType === 'Home') {
    return true; // Always for home loans
  }
  if (loanType === 'Personal') {
    return P > 500000; // Strictly > 500,000
  }
  if (loanType === 'Business') {
    return P > 2000000; // Strictly > 20,00,000
  }
  return false;
}
