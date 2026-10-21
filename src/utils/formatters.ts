/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CurrencyCode, CurrencyConfig } from '../types/shongsar';

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  BDT: {
    code: 'BDT',
    symbol: '৳',
    name: 'Bangladeshi Taka',
    format: 'south_asian',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    format: 'standard',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    format: 'standard',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    format: 'standard',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    format: 'south_asian',
  },
};

/**
 * Formats a number according to South Asian grouping (1,00,00,000 for 1 Crore)
 * or standard Western grouping (10,000,000).
 */
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'BDT',
  includeDecimals: boolean = false
): string {
  const config = SUPPORTED_CURRENCIES[currencyCode] || {
    code: currencyCode,
    symbol: currencyCode,
    name: currencyCode,
    format: 'standard',
  };

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = includeDecimals ? absAmount.toFixed(2) : Math.round(absAmount).toString();
  const [integerPart, decimalPart] = fixed.split('.');

  let formattedInteger = integerPart;

  if (config.format === 'south_asian') {
    // South Asian numbering: last 3 digits, then groups of 2
    if (integerPart.length > 3) {
      const lastThree = integerPart.substring(integerPart.length - 3);
      const remaining = integerPart.substring(0, integerPart.length - 3);
      const groupedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      formattedInteger = `${groupedRemaining},${lastThree}`;
    }
  } else {
    // Standard 3-digit grouping
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const result = decimalPart
    ? `${config.symbol} ${formattedInteger}.${decimalPart}`
    : `${config.symbol} ${formattedInteger}`;

  return isNegative ? `-${result}` : result;
}

/**
 * Returns the exact 5-year retention cutoff date string (YYYY-MM-DD)
 */
export function getFiveYearCutoffDate(): string {
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
  return cutoff.toISOString().split('T')[0];
}

/**
 * Checks if a transaction date string (YYYY-MM-DD) is older than 5 years
 */
export function isOlderThanFiveYears(dateStr: string): boolean {
  if (!dateStr) return false;
  const cutoff = getFiveYearCutoffDate();
  return dateStr < cutoff;
}

/**
 * Formats YYYY-MM-DD to a human-readable display string
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return dateStr;
}

/**
 * Returns current month key in YYYY-MM format
 */
export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
