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
        .barcode-label {
          width: 2in;
          height: 1in;
          padding: 2px 4px;
          background: white;
          border: 1px solid #ddd;
          display: flex;
          flex-direction: column;
          font-family: Arial, sans-serif;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }

        .label-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1px;
          flex-shrink: 0;
        }

        .store-info {
          flex: 1;
          text-align: left;
          min-width: 0;
        }

        .store-name {
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.1;
          margin-bottom: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }


        .label-body {
          display: flex;
          flex: 1;
          gap: 3px;
          align-items: flex-start;
          min-height: 0;
          overflow: hidden;
        }

        .product-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0;
          max-width: calc(100% - 85px);
          overflow: hidden;
        }

        .product-name {
          font-size: 7px;
          font-weight: bold;
          margin-top: 4px;
          margin-bottom: 1px;
          text-transform: uppercase;
          line-height: 1.1;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          white-space: normal;
          max-width: 100%;
          display: block;
          overflow: hidden;
          max-height: 16px;
          text-align: center;
        }

        .product-code {
          font-size: 7px;
          font-weight: bold;
          color: #000;
          margin-bottom: 1px;
          line-height: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pricing-info {
          margin-top: auto;
          font-size: 8px;
          flex-shrink: 0;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1px;
          line-height: 1.1;
        }

        .price-row.mrp-row {
          justify-content: space-between;
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

        .barcode-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 80px;
          max-width: 80px;
          flex-shrink: 0;
        }

        .barcode-svg {
          max-width: 100%;
          max-height: 35px;
          height: auto;
          width: auto;
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

      {/* Header: Store Name */}
      <div className="label-header">
        <div className="store-info">
          <div className="store-name">SRI OM GAYATRI POOJA STORES</div>
        </div>
      </div>

      {/* Body: Product Info and Barcode */}
      <div className="label-body">
        <div className="product-info">
          <div>
            <div className="product-name">{displayProductName}</div>
            {productCode && <div className="product-code">{productCode}</div>}
          </div>
          <div className="pricing-info">
            <div className="price-row">
              <span className="price-label">SP:</span>
              <span className="price-value">₹{formatIndianCurrency(Number(sellingPrice), true)}</span>
            </div>
            <div className="price-row mrp-row">
              <span className="price-label">MRP:</span>
              <span className="price-value">₹{formatIndianCurrency(Number(mrp), true)}</span>
              <span className="tax-info">(Incl of All Taxes)</span>
            </div>
          </div>
        </div>

        <div className="barcode-section">
          <svg ref={barcodeRef} className="barcode-svg" />
        </div>
      </div>
    </div>
  );
}

