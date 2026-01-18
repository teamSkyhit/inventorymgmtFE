import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Cleans a shelf name by removing the product name prefix if present.
 * Shelf names are sometimes stored as "Product Name - Shelf Name" format,
 * this function extracts just the shelf name part.
 * 
 * @param {string} name - The shelf name to clean
 * @returns {string} - The cleaned shelf name (first part before " - ")
 */
export function cleanShelfName(name) {
  if (!name) return '';
  const parts = name.split(' - ');
  return parts[0]?.trim() || name;
}

/**
 * Formats a number with Indian numbering system commas
 * Examples:
 * - 1000 → "1,000"
 * - 10000 → "10,000"
 * - 100000 → "1,00,000"
 * - 1000000 → "10,00,000"
 * - 10000000 → "1,00,00,000"
 * 
 * Indian numbering system:
 * - First comma after 3 digits from right (thousands)
 * - Then commas every 2 digits (lakhs, crores)
 * 
 * @param {number} amount - The amount to format
 * @param {boolean} showDecimals - Whether to show 2 decimal places (default: false)
 * @returns {string} - Formatted amount with Indian comma notation
 */
export function formatIndianCurrency(amount, showDecimals = false) {
  if (!amount && amount !== 0) return '0';
  
  const num = Number(amount);
  if (isNaN(num)) return '0';
  
  // Round to 2 decimal places if showDecimals is true, otherwise round to integer
  const roundedNum = showDecimals ? Math.round(num * 100) / 100 : Math.round(num);
  
  // Convert to string and split by decimal point
  const parts = roundedNum.toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Apply Indian numbering system to integer part
  let formatted = '';
  const len = integerPart.length;
  
  // Process from right to left
  for (let i = len - 1; i >= 0; i--) {
    const digit = integerPart[i];
    const position = len - 1 - i;
    
    // Add comma after first 3 digits (thousands)
    if (position === 3) {
      formatted = ',' + formatted;
    }
    // Then add comma every 2 digits (lakhs, crores)
    else if (position > 3 && (position - 3) % 2 === 0) {
      formatted = ',' + formatted;
    }
    
    formatted = digit + formatted;
  }
  
  // Add decimal part if needed
  if (showDecimals && decimalPart) {
    // Pad to 2 decimal places if needed
    const paddedDecimal = decimalPart.padEnd(2, '0').substring(0, 2);
    return formatted + '.' + paddedDecimal;
  } else if (showDecimals && !decimalPart) {
    return formatted + '.00';
  }
  
  return formatted;
}