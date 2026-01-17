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
 * Formats a number in Indian numbering system (thousands, lakhs, crores)
 * Examples:
 * - 1,000 → "1K"
 * - 10,500 → "10.5K"
 * - 1,00,000 → "1L"
 * - 10,50,000 → "10.5L"
 * - 1,00,00,000 → "1Cr"
 * - 10,50,00,000 → "10.5Cr"
 * 
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted amount with suffix (K, L, Cr)
 */
export function formatIndianCurrency(amount) {
  if (!amount && amount !== 0) return '0';
  
  const num = Number(amount);
  if (isNaN(num)) return '0';
  
  // For amounts less than 1000, show as is (rounded)
  if (num < 1000) {
    return Math.round(num).toString();
  }
  
  // For thousands (1,000 to 99,999)
  if (num < 100000) {
    const thousands = num / 1000;
    // Show one decimal if not a whole number, otherwise show as integer
    return thousands % 1 === 0 
      ? `${Math.round(thousands)}K` 
      : `${thousands.toFixed(1)}K`;
  }
  
  // For lakhs (1,00,000 to 99,99,999)
  if (num < 10000000) {
    const lakhs = num / 100000;
    // Show one decimal if not a whole number, otherwise show as integer
    return lakhs % 1 === 0 
      ? `${Math.round(lakhs)}L` 
      : `${lakhs.toFixed(1)}L`;
  }
  
  // For crores (1,00,00,000 and above)
  const crores = num / 10000000;
  // Show one decimal if not a whole number, otherwise show as integer
  return crores % 1 === 0 
    ? `${Math.round(crores)}Cr` 
    : `${crores.toFixed(1)}Cr`;
}