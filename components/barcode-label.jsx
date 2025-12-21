'use client';

import { useRef, useEffect } from 'react';

/**
 * Barcode Label Component for Printing
 * Matches the format: Store name, product info, barcode, pricing
 */
export default function BarcodeLabel({ product, store }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && product?.barcode) {
      // Load JsBarcode dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
      script.onload = () => {
        if (window.JsBarcode) {
          try {
            window.JsBarcode(barcodeRef.current, product.barcode, {
              format: 'CODE128',
              width: 2,
              height: 80,
              displayValue: true,
              fontSize: 14,
              margin: 10,
              background: '#ffffff',
              lineColor: '#000000',
            });
          } catch (error) {
            console.error('Barcode generation error:', error);
          }
        }
      };
      document.head.appendChild(script);

      return () => {
        // Cleanup
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, [product?.barcode]);

  if (!product) return null;

  const storeName = store?.name || 'STORE';
  const storeLocation = store?.city || '';
  const storePhone = store?.contact ? `Ph: ${store.contact}` : '';
  const storeInfo = [storeLocation, storePhone].filter(Boolean).join('. ');

  const productName = product.name || 'PRODUCT';
  const productCode = product.sku || product.barcode || '';
  const sellingPrice = product.salePrice || product.price || product.mrp || 0;
  const mrp = product.mrp || 0;

  return (
    <div className="barcode-label print-label">
      <style jsx>{`
        .barcode-label {
          width: 3.5in;
          height: 2in;
          padding: 8px 12px;
          background: white;
          border: 1px solid #ddd;
          display: flex;
          flex-direction: column;
          font-family: Arial, sans-serif;
          position: relative;
        }

        .label-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .store-info {
          flex: 1;
          text-align: left;
        }

        .store-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 2px;
          text-transform: uppercase;
        }

        .store-details {
          font-size: 9px;
          color: #333;
        }

        .label-body {
          display: flex;
          flex: 1;
          gap: 8px;
          align-items: flex-start;
        }

        .product-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0;
        }

        .product-name {
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 4px;
          text-transform: uppercase;
          line-height: 1.2;
          word-wrap: break-word;
        }

        .product-code {
          font-size: 9px;
          color: #666;
          margin-bottom: 4px;
          font-family: 'Courier New', monospace;
        }

        .pricing-info {
          margin-top: auto;
          font-size: 9px;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }

        .price-label {
          font-weight: 600;
        }

        .price-value {
          font-weight: bold;
        }

        .tax-info {
          font-size: 8px;
          color: #666;
          margin-top: 2px;
        }

        .barcode-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 180px;
        }

        .barcode-svg {
          max-width: 100%;
          height: auto;
        }

        .barcode-code {
          font-size: 8px;
          color: #666;
          margin-top: 4px;
          text-align: center;
        }

        @media print {
          .barcode-label {
            width: 3.5in;
            height: 2in;
            page-break-inside: avoid;
            border: none;
            margin: 0;
            padding: 8px 12px;
          }

          @page {
            size: 3.5in 2in;
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
            <div className="product-name">{productName}</div>
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
          <div className="barcode-code">AC</div>
        </div>
      </div>
    </div>
  );
}

