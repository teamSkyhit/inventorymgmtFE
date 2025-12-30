'use client';

import { useRef, useEffect } from 'react';

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
              width: 1.2,
              height: 30,
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
  const storePhone = store?.contact ? `Ph: ${store.contact}` : '';
  const storeInfo = [storeLocation, storePhone].filter(Boolean).join('. ');

  const displayProductName = productName || product.name || 'PRODUCT';
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
          font-size: 8px;
          font-weight: bold;
          margin-bottom: 0;
          text-transform: uppercase;
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .store-details {
          font-size: 6px;
          color: #333;
          line-height: 1;
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
          font-weight: 600;
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
        }

        .product-code {
          font-size: 6px;
          color: #666;
          margin-bottom: 1px;
          font-family: 'Courier New', monospace;
          line-height: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pricing-info {
          margin-top: auto;
          font-size: 6px;
          flex-shrink: 0;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1px;
          line-height: 1.1;
        }

        .price-label {
          font-weight: 600;
          white-space: nowrap;
        }

        .price-value {
          font-weight: bold;
          white-space: nowrap;
        }

        .tax-info {
          font-size: 5px;
          color: #666;
          margin-top: 1px;
          line-height: 1;
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
          max-height: 25px;
          height: auto;
          width: auto;
        }

        .barcode-code {
          font-size: 6px;
          color: #666;
          margin-top: 1px;
          text-align: center;
          line-height: 1;
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

      {/* Header: Store Info */}
      <div className="label-header">
        <div className="store-info">
          <div className="store-name">{storeName}®</div>
          {storeInfo && <div className="store-details">{storeInfo}</div>}
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
              <span className="price-label">{storeName.substring(0, 3).toUpperCase()} Rs.:</span>
              <span className="price-value">₹{Number(sellingPrice).toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span className="price-label">MRP Rs.:</span>
              <span className="price-value">₹{Number(mrp).toFixed(2)}</span>
            </div>
            <div className="tax-info">(Incl of All Taxes)</div>
          </div>
        </div>

        <div className="barcode-section">
          <svg ref={barcodeRef} className="barcode-svg" />
          <div className="barcode-code">{product.barcode || ''}</div>
        </div>
      </div>
    </div>
  );
}

