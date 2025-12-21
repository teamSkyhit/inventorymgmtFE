'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Printer, Download, Share2 } from 'lucide-react'
import { format } from 'date-fns'

/**
 * Enhanced Receipt Component
 * Supports both Thermal (80mm) and A4 formats
 * Shows complete GST breakdown, payment methods, and store details
 */
export default function ReceiptComponent({
  receiptData,
  receiptFormat = 'thermal', // 'thermal' or 'a4'
  showActions = true,
  onPrint,
  onShare,
}) {
  const receiptRef = useRef(null)

  // Group sales by receipt number
  const receiptNumber = receiptData?.saleNumber || receiptData?.sale?.saleNumber || 'N/A'
  const sales = receiptData?.items || (receiptData?.sale ? [receiptData.sale] : [])
  
  // Calculate totals
  const totals = sales.reduce(
    (acc, sale) => {
      const quantity = sale.quantitySold || sale.quantity || 1
      acc.totalQty += quantity
      acc.subtotal += Number(sale.subtotal || sale.unitPrice * quantity || 0)
      acc.discount += Number(sale.discountAmount ?? 0)
      acc.taxable += Number(sale.taxableAmount || sale.subtotal || 0)
      
      // Get GST rate
      const gstRate = Number(sale.gstRate ?? sale.product?.category?.gstRate ?? 0)
      const gstInclusive = sale.product?.category?.gstInclusive ?? false
      const withoutGst = sale.withoutGst ?? false
      
      // Calculate GST if not already calculated (for old sales)
      let gstAmount = Number(sale.gstAmount ?? 0)
      let cgstAmount = Number(sale.cgstAmount ?? 0)
      let sgstAmount = Number(sale.sgstAmount ?? 0)
      let igstAmount = Number(sale.igstAmount ?? 0)
      
      // If GST rate exists but amounts are missing, calculate them
      if (gstRate > 0 && !withoutGst && gstAmount === 0 && cgstAmount === 0 && sgstAmount === 0) {
        const taxable = Number(sale.taxableAmount || sale.subtotal || 0)
        if (gstInclusive) {
          // Price includes GST - extract GST
          const rateMultiplier = 1 + gstRate / 100
          const extractedTaxable = taxable / rateMultiplier
          gstAmount = taxable - extractedTaxable
        } else {
          // Price excludes GST - add GST
          gstAmount = (taxable * gstRate) / 100
        }
        // Round GST amount
        gstAmount = Math.round(gstAmount * 100) / 100
        // Split into CGST/SGST (assume intra-state for now)
        cgstAmount = Math.round((gstAmount / 2) * 100) / 100
        sgstAmount = Math.round((gstAmount - cgstAmount) * 100) / 100
      }
      
      acc.gst += gstAmount
      acc.cgst += cgstAmount
      acc.sgst += sgstAmount
      acc.igst += igstAmount
      acc.final += Number(sale.finalAmount || sale.taxableAmount || 0)
      
      // Track if any sale has GST rate
      if (gstRate > 0 && !withoutGst) {
        acc.hasGstRate = true
      }
      return acc
    },
    { totalQty: 0, subtotal: 0, discount: 0, taxable: 0, gst: 0, cgst: 0, sgst: 0, igst: 0, final: 0, hasGstRate: false }
  )

  // Get store details
  const store = receiptData?.store || sales[0]?.store
  const storeName = store?.name || 'Store Name'
  const storeGstin = store?.gstin || ''
  const storeAddress = store?.address || ''
  const storeCity = store?.city || ''
  const storeState = store?.state || ''
  const storePincode = store?.pincode || ''
  const storeContact = store?.contact || ''
  const storeLogo = store?.logoUrl || ''

  // Get customer details
  const customerName = sales[0]?.customerName || ''
  const customerPhone = sales[0]?.customerPhone || ''
  const customerEmail = sales[0]?.customerEmail || ''

  // Get payment details
  const payments = sales[0]?.payments || receiptData?.payments || []
  const paymentMethods = payments.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + Number(p.amount)
    return acc
  }, {})

  // Get sale date
  const saleDate = sales[0]?.saleDate || new Date()
  const formattedDate = format(new Date(saleDate), 'dd/MM/yyyy')
  const formattedTime = format(new Date(saleDate), 'HH:mm:ss')

  // Get cashier
  const cashier = sales[0]?.createdBy?.name || sales[0]?.createdBy?.email || 'System'

  // Custom footer message (can be configured)
  const footerMessage = 'Thank you, visit again!'

  // Festival greetings (can be enhanced with date-based logic)
  const getFestivalGreeting = () => {
    const month = new Date().getMonth() + 1
    const day = new Date().getDate()
    
    // Example: Diwali (October/November)
    if ((month === 10 && day >= 20) || (month === 11 && day <= 5)) {
      return 'Happy Diwali!'
    }
    // Example: New Year
    if (month === 1 && day <= 7) {
      return 'Happy New Year!'
    }
    // Add more festival dates as needed
    return null
  }

  const festivalGreeting = getFestivalGreeting()

  const handlePrint = () => {
    if (onPrint) {
      onPrint(receiptRef.current, receiptFormat)
    } else {
      // Default print behavior
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt ${receiptNumber}</title>
              <style>
                @media print {
                  @page { size: ${receiptFormat === 'thermal' ? '80mm' : 'A4'}; margin: 0; }
                }
                body { font-family: Arial, sans-serif; padding: 20px; }
              </style>
            </head>
            <body>
              ${receiptRef.current?.innerHTML || ''}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const baseClasses = receiptFormat === 'thermal' 
    ? 'max-w-[80mm] mx-auto p-4 text-xs font-mono' 
    : 'max-w-[210mm] mx-auto p-8 text-sm'

  return (
    <div className="space-y-4">
      {/* Receipt Container */}
      <div
        ref={receiptRef}
        className={`${baseClasses} bg-white border rounded-lg shadow-sm print:shadow-none print:border-0`}
        id="receipt-content"
      >
        {/* Store Header */}
        <div className="text-center mb-4">
          {storeLogo && (
            <img
              src={storeLogo}
              alt={storeName}
              className="h-16 mx-auto mb-2 object-contain"
            />
          )}
          <h2 className="text-lg font-bold">{storeName}</h2>
          {storeGstin && <p className="text-xs">GSTIN: {storeGstin}</p>}
          {storeAddress && (
            <div className="text-xs mt-1">
              <p>{storeAddress}</p>
              {(storeCity || storeState || storePincode) && (
                <p>
                  {storeCity && `${storeCity}, `}
                  {storeState && `${storeState} `}
                  {storePincode && `- ${storePincode}`}
                </p>
              )}
              {storeContact && <p>Ph: {storeContact}</p>}
            </div>
          )}
        </div>

        <Separator className="my-3" />

        {/* Receipt Info */}
        <div className="flex justify-between text-xs mb-2">
          <span>Receipt #: {receiptNumber}</span>
          <span>{formattedDate} {formattedTime}</span>
        </div>
        {cashier && (
          <div className="text-xs text-muted-foreground mb-3">
            Cashier: {cashier}
          </div>
        )}

        {/* Customer Info */}
        {(customerName || customerPhone || customerEmail) && (
          <div className="mb-3 p-2 bg-muted rounded text-xs">
            <p className="font-semibold">Customer Details:</p>
            {customerName && <p>Name: {customerName}</p>}
            {customerPhone && <p>Phone: {customerPhone}</p>}
            {customerEmail && <p>Email: {customerEmail}</p>}
          </div>
        )}

        <Separator className="my-3" />

        {/* Items List */}
        <div className="mb-4">
          <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr className="border-b">
                <th className="text-center py-1">#</th>
                <th className="text-left py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Rate</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale, idx) => {
                const product = sale.product || sale
                const quantity = sale.quantitySold || sale.quantity || 1
                const unitPrice = Number(sale.unitPrice || product?.price || 0)
                const itemTotal = Number(sale.subtotal || unitPrice * quantity)
                const gstRate = Number(sale.gstRate || product?.category?.gstRate || 0)
                const hsnCode = product?.category?.hsnCode || ''

                return (
                  <>
                    <tr key={`${sale.id || idx}-main`}>
                      <td className="text-center py-2">{idx + 1}</td>
                      <td className="text-left py-2 px-1">
                        <span className="font-medium">{product?.name || 'Product'}</span>
                      </td>
                      <td className="text-center py-2 px-1">{quantity.toFixed(2)}</td>
                      <td className="text-right py-2 px-1">₹{unitPrice.toFixed(2)}</td>
                      <td className="text-right py-2 px-1 font-medium">₹{itemTotal.toFixed(2)}</td>
                    </tr>
                    {hsnCode && gstRate > 0 ? (
                      <tr key={`${sale.id || idx}-gst`} className={idx < sales.length - 1 ? 'border-b' : ''}>
                        <td className="py-0"></td>
                        <td className="text-left py-1 px-1 text-[10px] text-muted-foreground" style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ marginRight: '20px' }}>HSN: {hsnCode}</span>
                          <span style={{ marginRight: '20px' }}>CGST: {(gstRate / 2).toFixed(2)}%</span>
                          <span>SGST: {(gstRate / 2).toFixed(2)}%</span>
                        </td>
                        <td className="py-0"></td>
                        <td className="py-0"></td>
                        <td className="py-0"></td>
                      </tr>
                    ) : (
                      <tr key={`${sale.id || idx}-no-gst`} className={idx < sales.length - 1 ? 'border-b' : ''}>
                        <td colSpan="5" className="py-0"></td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        <Separator className="my-3" />

        {/* Totals */}
        <div className="space-y-1 text-xs mb-3">
          <div className="flex justify-between">
            <span>Total Quantity:</span>
            <span>{totals.totalQty.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Amount:</span>
            <span>₹{totals.subtotal.toFixed(2)}</span>
          </div>
          {/* Show CGST/SGST if there's a GST rate and amounts are calculated */}
          {totals.hasGstRate && totals.cgst > 0 && totals.sgst > 0 && (
            <>
              <div className="flex justify-between">
                <span>CGST Amount Incl.:</span>
                <span>₹{totals.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST Amount Incl.:</span>
                <span>₹{totals.sgst.toFixed(2)}</span>
              </div>
            </>
          )}
          {totals.igst > 0 && (
            <div className="flex justify-between">
              <span>IGST Amount Incl.:</span>
              <span>₹{totals.igst.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Credit/Exchange Note:</span>
            <span>₹0.00</span>
          </div>

          <Separator className="my-2" />
          <div className="flex justify-between text-base font-bold">
            <span>Amount Billed:</span>
            <span>₹{totals.final.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        {Object.keys(paymentMethods).length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="text-xs mb-3">
              <p className="font-semibold mb-1">Payment Methods:</p>
              {Object.entries(paymentMethods).map(([method, amount]) => (
                <div key={method} className="flex justify-between">
                  <span>{method}:</span>
                  <span>₹{Number(amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <Separator className="my-3" />

        {/* Footer */}
        <div className="text-center text-xs space-y-1">
          {festivalGreeting && (
            <p className="font-semibold text-primary">{festivalGreeting}</p>
          )}
          <p>{footerMessage}</p>
          <p className="text-muted-foreground mt-2">
            Return Policy: Exchange only within 7 days
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-2 justify-center print:hidden">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print {receiptFormat === 'thermal' ? '(80mm)' : '(A4)'}
          </Button>
          {onShare && (
            <Button onClick={() => onShare(receiptData)} variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

