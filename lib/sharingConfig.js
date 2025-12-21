/**
 * Sharing Configuration
 * Settings for automatic sharing after payment
 * Note: Automatic sharing after payment will be implemented in POS app
 */

// Default sharing settings (can be configured per store or globally)
export const sharingConfig = {
  // Enable automatic sharing after payment
  autoShareEnabled: false,
  
  // Default sharing method when auto-share is enabled
  defaultMethod: 'whatsapp', // 'whatsapp', 'sms', 'email', or 'all'
  
  // Require customer contact info before sharing
  requireContactInfo: true,
  
  // Auto-share only if customer provided phone/email
  shareOnlyIfContactProvided: true,
}

/**
 * Check if automatic sharing should be triggered
 * @param {object} saleData - Sale/receipt data
 * @returns {boolean}
 */
export function shouldAutoShare(saleData) {
  if (!sharingConfig.autoShareEnabled) {
    return false
  }
  
  if (sharingConfig.shareOnlyIfContactProvided) {
    const hasContact = saleData?.customerPhone || saleData?.customerEmail
    return !!hasContact
  }
  
  return true
}

/**
 * Get sharing method for auto-share
 * @param {object} saleData - Sale/receipt data
 * @returns {string|null} - Method to use or null if no contact info
 */
export function getAutoShareMethod(saleData) {
  if (!shouldAutoShare(saleData)) {
    return null
  }
  
  // Prefer phone-based methods if phone is available
  if (saleData?.customerPhone) {
    return sharingConfig.defaultMethod === 'whatsapp' ? 'whatsapp' : 'sms'
  }
  
  // Use email if available
  if (saleData?.customerEmail) {
    return 'email'
  }
  
  return null
}

