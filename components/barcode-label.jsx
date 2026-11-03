'use client';

import { useRef, useEffect } from 'react';
import { formatIndianCurrency } from '@/lib/utils';

/**
 * Barcode Label Component for Printing
 * Matches the format: Store name, product info, barcode, pricing
 */
export default function BarcodeLabel({ product, store, productName }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && product?.barcode) {
      const generateBarcode = () => {
        if (window.JsBarcode && barcodeRef.current) {
          try {
            // Clear any existing content
            barcodeRef.current.innerHTML = '';
            window.JsBarcode(barcodeRef.current, String(product.barcode), {
              format: 'CODE128',
              width: 1.5,
              height: 40,
              displayValue: false,
              fontSize: 8,
              margin: 2,
              background: '#ffffff',
              lineColor: '#000000',
            });
          } catch (error) {
            console.error('Barcode generation error:', error);
          }
        }
      };

      // Check if JsBarcode is already loaded
      if (window.JsBarcode) {
        generateBarcode();
      } else {
        // Load JsBarcode dynamically
        const existingScript = document.querySelector('script[src*="jsbarcode"]');
        if (existingScript) {
          existingScript.addEventListener('load', generateBarcode);
          if (window.JsBarcode) {
            generateBarcode();
          }
        } else {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
          script.onload = generateBarcode;
          script.onerror = () => console.error('Failed to load JsBarcode library');
          document.head.appendChild(script);
        }
      }
    }
  }, [product?.barcode]);

  if (!product) return null;

  const storeName = store?.name || 'STORE';
  const storeLocation = store?.city || '';
  const storeInfo = storeLocation || '';

  // Build product name with size/weight for variants
  let displayProductName = productName || product.name || 'PRODUCT';
  
  // If it's a variant (has parentProductId or size/weight), append size or weight to name
  if (product.parentProductId || product.size || product.weight) {
    const nameParts = [displayProductName];
    
    // Add size if available
    if (product.size) {
      nameParts.push(product.size);
    }
    
    // Add weight if available (and size is not present, or both if both are present)
    if (product.weight) {
      if (product.size) {
        // If both size and weight, format: "Name - Size - Weight"
        nameParts.push(product.weight);
      } else {
        // If only weight, format: "Name - Weight"
        nameParts.push(product.weight);
      }
    }
    
    displayProductName = nameParts.join(' - ');
  }
  
  const productCode = product.sku || product.barcode || '';
  const sellingPrice = product.salePrice || product.price || product.mrp || 0;
  const mrp = product.mrp || 0;

  return (
    <div className="barcode-label print-label">
      <style jsx>{`
        /* ── Outer container: fixed label size, 3-zone column ── */
        .barcode-label {
          width: 2in;
          height: 1in;
          padding: 2px 4px;
          background: white;
          border: 1px solid #ddd;
          display: flex;
          flex-direction: column;
          font-family: Arial, sans-serif;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* ── Zone 1 (top, fixed): store name ── */
        .label-header {
          flex-shrink: 0;
          margin-bottom: 1px;
        }

        .store-name {
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Zone 2 (middle, flex): product name + barcode ── */
        .label-body {
          flex: 1;
          min-height: 0;
          display: flex;
          gap: 3px;
          overflow: hidden;
        }

        .product-name-zone {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
        }

        .product-name {
          font-size: 7px;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.2;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          word-break: break-word;
        }

        .product-code {
          font-size: 7px;
          font-weight: bold;
          color: #000;
          line-height: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 1px;
        }

        .barcode-section {
          flex-shrink: 0;
          width: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .barcode-svg {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
        }

        /* ── Zone 3 (bottom, fixed): pricing ── */
        .label-footer {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
          line-height: 1.1;
          margin-bottom: 1px;
        }

        .price-label {
          font-weight: bold;
          font-size: 8px;
          white-space: nowrap;
        }

        .price-value {
          font-weight: bold;
          font-size: 9px;
          white-space: nowrap;
        }

        .tax-info {
          font-size: 6px;
          font-weight: bold;
          color: #000;
          line-height: 1;
          white-space: nowrap;
          margin-left: auto;
        }

        @media print {
          .barcode-label {
            width: 2in;
            height: 1in;
            page-break-inside: avoid;
            border: none;
            margin: 0;
            padding: 2px 4px;
            box-sizing: border-box;
            overflow: hidden;
          }

          @page {
            size: 2in 1in;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      {/* Zone 1: Store name — always visible at top */}
      <div className="label-header">
        <div className="store-name">{storeName}</div>
      </div>

      {/* Zone 2: Product name + barcode — middle gets remaining space */}
      <div className="label-body">
        <div className="product-name-zone">
          <div className="product-name">{displayProductName}</div>
          {productCode && <div className="product-code">{productCode}</div>}
        </div>
        <div className="barcode-section">
          <svg ref={barcodeRef} className="barcode-svg" />
        </div>
      </div>

      {/* Zone 3: Pricing — always visible at bottom */}
      <div className="label-footer">
        <div className="price-row">
          <span className="price-label">SP:</span>
          <span className="price-value">₹{formatIndianCurrency(Number(sellingPrice), true)}</span>
        </div>
        <div className="price-row">
          <span className="price-label">MRP:</span>
          <span className="price-value">₹{formatIndianCurrency(Number(mrp), true)}</span>
          <span className="tax-info">(Incl of All Taxes)</span>
        </div>
      </div>
    </div>
  );
}

