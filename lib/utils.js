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