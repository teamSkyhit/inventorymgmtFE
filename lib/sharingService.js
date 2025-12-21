/**
 * Digital Sharing Service
 * Supports WhatsApp, SMS, and Email sharing
 */

/**
 * Share receipt via WhatsApp
 * @param {string} phoneNumber - Customer phone number (with country code, e.g., +919876543210)
 * @param {string} message - Message to share
 * @returns {string} WhatsApp URL
 */
export function shareViaWhatsApp(phoneNumber, message) {
  // Remove any non-digit characters except +
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '')
  
  // Ensure country code is present (default to +91 for India)
  const phone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)
  
  // WhatsApp Web/App URL
  const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodedMessage}`
  
  return whatsappUrl
}

/**
 * Share receipt via SMS
 * @param {string} phoneNumber - Customer phone number
 * @param {string} message - Message to share
 * @returns {string} SMS URL (opens default SMS app)
 */
export function shareViaSMS(phoneNumber, message) {
  // Remove any non-digit characters except +
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '')
  
  // Ensure country code is present
  const phone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)
  
  // SMS URL (opens default SMS app)
  const smsUrl = `sms:${phone}?body=${encodedMessage}`
  
  return smsUrl
}

/**
 * Share receipt via Email
 * @param {string} email - Customer email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body (HTML supported)
 * @returns {string} Mailto URL
 */
export function shareViaEmail(email, subject, body) {
  const encodedSubject = encodeURIComponent(subject)
  const encodedBody = encodeURIComponent(body)
  
  // Mailto URL
  const mailtoUrl = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`
  
  return mailtoUrl
}

/**
 * Generate receipt message for sharing
 * @param {object} receiptData - Receipt data
 * @returns {string} Formatted message
 */
export function generateReceiptMessage(receiptData) {
  const receiptNumber = receiptData?.saleNumber || receiptData?.sale?.saleNumber || 'N/A'
  const store = receiptData?.store || receiptData?.sale?.store
  const storeName = store?.name || 'Store'
  
  const sales = receiptData?.items || (receiptData?.sale ? [receiptData.sale] : [])
  const total = sales.reduce((sum, sale) => sum + Number(sale.finalAmount || 0), 0)
  
  const saleDate = sales[0]?.saleDate || new Date()
  const formattedDate = new Date(saleDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  
  let message = `Receipt from ${storeName}\n\n`
  message += `Receipt #: ${receiptNumber}\n`
  message += `Date: ${formattedDate}\n\n`
  message += `Items:\n`
  
  sales.forEach((sale, idx) => {
    const product = sale.product || sale
    const quantity = sale.quantitySold || sale.quantity || 1
    const itemTotal = Number(sale.finalAmount || sale.subtotal || 0)
    message += `${idx + 1}. ${product?.name || 'Product'} x${quantity} - ₹${itemTotal.toFixed(2)}\n`
  })
  
  message += `\nTotal: ₹${total.toFixed(2)}\n\n`
  message += `Thank you for your purchase!`
  
  return message
}

/**
 * Generate receipt HTML for email
 * @param {object} receiptData - Receipt data
 * @returns {string} HTML formatted receipt
 */
export function generateReceiptHTML(receiptData) {
  const receiptNumber = receiptData?.saleNumber || receiptData?.sale?.saleNumber || 'N/A'
  const store = receiptData?.store || receiptData?.sale?.store
  const storeName = store?.name || 'Store'
  const storeGstin = store?.gstin || ''
  const storeAddress = store?.address || ''
  
  const sales = receiptData?.items || (receiptData?.sale ? [receiptData.sale] : [])
  const total = sales.reduce((sum, sale) => sum + Number(sale.finalAmount || 0), 0)
  
  const saleDate = sales[0]?.saleDate || new Date()
  const formattedDate = new Date(saleDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  
  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { text-align: center; margin-bottom: 20px; }
          .store-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
          .receipt-info { margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
          .total { font-size: 18px; font-weight: bold; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${storeName}</div>
          ${storeGstin ? `<div>GSTIN: ${storeGstin}</div>` : ''}
          ${storeAddress ? `<div>${storeAddress}</div>` : ''}
        </div>
        
        <div class="receipt-info">
          <p><strong>Receipt #:</strong> ${receiptNumber}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
  `
  
  sales.forEach((sale) => {
    const product = sale.product || sale
    const quantity = sale.quantitySold || sale.quantity || 1
    const unitPrice = Number(sale.unitPrice || product?.price || 0)
    const itemTotal = Number(sale.finalAmount || sale.subtotal || unitPrice * quantity)
    
    html += `
            <tr>
              <td>${product?.name || 'Product'}</td>
              <td>${quantity}</td>
              <td>₹${unitPrice.toFixed(2)}</td>
              <td>₹${itemTotal.toFixed(2)}</td>
            </tr>
    `
  })
  
  html += `
          </tbody>
        </table>
        
        <div class="total">
          <p>Total: ₹${total.toFixed(2)}</p>
        </div>
        
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>Return Policy: Exchange only within 7 days</p>
        </div>
      </body>
    </html>
  `
  
  return html
}

/**
 * Open sharing dialog
 * @param {object} receiptData - Receipt data
 * @param {string} method - 'whatsapp', 'sms', or 'email'
 * @param {string} contact - Phone number or email
 */
export function shareReceipt(receiptData, method, contact) {
  const message = generateReceiptMessage(receiptData)
  
  let url
  
  switch (method) {
    case 'whatsapp':
      url = shareViaWhatsApp(contact, message)
      window.open(url, '_blank')
      break
      
    case 'sms':
      url = shareViaSMS(contact, message)
      window.location.href = url
      break
      
    case 'email':
      const html = generateReceiptHTML(receiptData)
      const subject = `Receipt #${receiptData?.saleNumber || receiptData?.sale?.saleNumber || 'N/A'} from ${receiptData?.store?.name || 'Store'}`
      url = shareViaEmail(contact, subject, html)
      window.location.href = url
      break
      
    default:
      console.error('Invalid sharing method:', method)
  }
}

/**
 * Check if sharing is available
 * @param {string} method - 'whatsapp', 'sms', or 'email'
 * @returns {boolean}
 */
export function isSharingAvailable(method) {
  if (typeof window === 'undefined') return false
  
  switch (method) {
    case 'whatsapp':
      return true // WhatsApp Web always available
    case 'sms':
      return 'sms' in navigator || true // Fallback to mailto-like behavior
    case 'email':
      return true // Mailto always available
    default:
      return false
  }
}

