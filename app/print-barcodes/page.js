'use client';

import { useEffect, useState, useMemo } from 'react';
import ProtectedRoute from '@/components/protected-route';
import RoleBasedLayout from '@/components/role-based-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Printer } from 'lucide-react';
import { toast } from 'sonner';
import BarcodeLabel from '@/components/barcode-label';
import Loader from '@/components/ui/loader';
import { useAuth } from '@/lib/auth-context';
import { productsAPI, storesAPI } from '@/lib/api';
import logger from '@/lib/logger';
import { cleanShelfName } from '@/lib/utils';
import JsBarcode from 'jsbarcode';

export default function PrintBarcodesPage() {
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.token) {
      fetchProducts();
      fetchStores();
    }
  }, [user?.token]);

  const fetchProducts = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const response = await productsAPI.getAll(user.token, { limit: 1000 });
      if (response.success) {
        setProducts(response.data?.products || response.data || []);
      } else {
        toast.error(response.message || 'Failed to load products');
      }
    } catch (error) {
      logger.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    if (!user?.token) return;
    try {
      const response = await storesAPI.getAll(user.token);
      if (response.success) {
        setStores(response.data || []);
      }
    } catch (error) {
      logger.error('Error fetching stores:', error);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && product.barcode; // Only show products with barcodes
    });
  }, [products, searchTerm]);

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(filteredProducts.map((p) => p.id));
      setSelectedProducts(allIds);
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId, checked) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handlePreview = () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product');
      return;
    }
    setIsPreviewOpen(true);
  };

  const getSelectedProductsList = () => {
    return filteredProducts.filter((p) => selectedProducts.has(p.id));
  };

  const handlePrint = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product');
      return;
    }

    setIsPrinting(true);
    const loadingToast = toast.loading('Generating barcode labels...');

    try {
      const selectedProductsList = getSelectedProductsList();
      
      if (selectedProductsList.length === 0) {
        throw new Error('No products selected');
      }

      toast.dismiss(loadingToast);
      const progressToast = toast.loading(`Loading barcode library... (0/${selectedProductsList.length})`);
      
      const store = stores.length > 0 ? stores[0] : null;

      // JsBarcode is imported directly, no need to load from CDN
      toast.dismiss(loadingToast);

      // Generate barcodes for all selected products with progress tracking
      const barcodeSvgs = [];
      let completed = 0;

      for (let i = 0; i < selectedProductsList.length; i++) {
        const product = selectedProductsList[i];
        const barcodeValue = String(product.barcode || '').trim();
        
        if (!barcodeValue) {
          toast.dismiss(progressToast);
          throw new Error(`Product "${product.name}" has no barcode`);
        }

        toast.dismiss(progressToast);
        const currentToast = toast.loading(`Generating barcode ${i + 1}/${selectedProductsList.length}: ${product.name}...`);

        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.style.position = 'absolute';
        tempSvg.style.left = '-9999px';
        tempSvg.style.top = '-9999px';
        tempSvg.style.visibility = 'hidden';
        document.body.appendChild(tempSvg);

        try {
          await new Promise((resolve) => setTimeout(resolve, 50));

          JsBarcode(tempSvg, barcodeValue, {
            format: 'CODE128',
            width: 1.5,
            height: 40,
            displayValue: false,
            margin: 2,
            background: '#ffffff',
            lineColor: '#000000',
          });

          await new Promise((resolve) => setTimeout(resolve, 150));

          const innerContent = tempSvg.innerHTML;
          if (!innerContent || !innerContent.trim()) {
            toast.dismiss(currentToast);
            throw new Error(`Failed to generate barcode for product "${product.name}"`);
          }

          const viewBox = tempSvg.getAttribute('viewBox') || '0 0 200 100';
          const barcodeSvg = `<svg viewBox="${viewBox}" width="100%" height="auto" class="barcode-svg" xmlns="http://www.w3.org/2000/svg">${innerContent}</svg>`;
          barcodeSvgs.push({ product, barcodeSvg });
          completed++;
          
          toast.dismiss(currentToast);
        } catch (error) {
          toast.dismiss(currentToast);
          console.error(`Error generating barcode for product ${product.name}:`, error);
          throw error;
        } finally {
          if (document.body.contains(tempSvg)) {
            document.body.removeChild(tempSvg);
          }
        }
      }

      toast.dismiss(progressToast);
      toast.success(`Successfully generated ${barcodeSvgs.length} barcode label(s)! Opening print dialog...`);

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window - popups may be blocked');
      }

      const storeName = store?.name || 'STORE';
      const storeLocation = store?.city || '';
      const storeInfo = storeLocation || '';
      const storeCode = storeName.substring(0, 3).toUpperCase() === 'BRA' ? 'SP' : (storeName.substring(0, 3).toUpperCase() || 'SP');

      // Escape HTML
      const escapeHtml = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      // Generate labels HTML in 2-column layout
      const labelsHtml = barcodeSvgs.map(({ product, barcodeSvg }) => {
        const productName = product.name || 'PRODUCT';
        const shelfName = product.shelf?.name || product.shelfId || '';
        const cleanedShelfName = cleanShelfName(shelfName);
        const productNameWithShelf = cleanedShelfName ? `${productName} - ${cleanedShelfName}` : productName;
        const productCode = product.sku || product.barcode || '';
        const sellingPrice = product.salePrice || product.price || product.mrp || 0;
        const mrp = product.mrp || 0;

        return `
          <div class="barcode-label">
            <div class="label-header">
              <div class="store-name">SRI OM GAYATRI POOJA STORES</div>
            </div>
            <div class="product-name">${escapeHtml(productNameWithShelf)}</div>
            <div class="barcode-container">
              ${barcodeSvg}
            </div>
            ${productCode ? `<div class="sku-code">${escapeHtml(productCode)}</div>` : ''}
            <div class="pricing-section">
              <div class="price-row selling-price">
                <span class="price-label">${escapeHtml(storeCode)} Rs.:</span>
                <span class="price-value selling-price">₹${Number(sellingPrice).toFixed(2)}</span>
              </div>
              <div class="price-row mrp-row">
                <span class="price-label">MRP Rs.:</span>
                <span class="price-value mrp">₹${Number(mrp).toFixed(2)}</span>
                <span class="tax-info">(Incl of All Taxes)</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Barcode Labels - Bulk Print</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: Arial, sans-serif;
                background: white;
                padding: 10px;
              }

              .labels-container {
                display: grid;
                grid-template-columns: 2in;
                gap: 18px;
                justify-content: center;
              }

              .barcode-label {
                width: 2in;
                height: 1in;
                padding: 2px 4px;
                background: white;
                border: 1px solid #ddd;
                display: flex;
                flex-direction: column;
                position: relative;
                box-sizing: border-box;
                overflow: hidden;
                page-break-inside: avoid;
              }

              .label-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1px;
                flex-shrink: 0;
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


              .product-name {
                font-size: 7px;
                font-weight: bold;
                margin-top: 4px;
                margin-bottom: 1px;
                text-transform: uppercase;
                line-height: 1.1;
                flex-shrink: 0;
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

              .barcode-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 1px 0;
                flex-shrink: 0;
              }

              .barcode-svg {
                max-width: 100%;
                max-height: 35px;
                height: auto;
                width: auto;
              }

              .barcode-number {
                font-size: 7px;
                font-weight: bold;
                font-family: 'Courier New', monospace;
                color: #000;
                margin-bottom: 1px;
                text-align: center;
                letter-spacing: 0.1px;
                line-height: 1;
              }

              .sku-code {
                font-size: 7px;
                font-weight: bold;
                color: #000;
                margin-bottom: 1px;
                text-align: center;
                flex-shrink: 0;
                line-height: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .pricing-section {
                margin-top: auto;
                flex-shrink: 0;
              }

              .price-row {
                display: flex;
                align-items: baseline;
                margin-bottom: 1px;
                gap: 3px;
                line-height: 1.1;
              }

              .price-row.selling-price {
                margin-bottom: 1px;
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
              }

              .price-value.selling-price {
                font-size: 12px;
                font-weight: bold;
              }

              .price-value.mrp {
                font-size: 8px;
                font-weight: bold;
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
                body {
                  margin: 0;
                  padding: 0;
                }

                .labels-container {
                  grid-template-columns: 2in;
                  gap: 18px;
                }

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
                  size: letter;
                  margin: 0.5in;
                }
              }
            </style>
          </head>
          <body>
            <div class="labels-container">
              ${labelsHtml}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  try {
                    window.print();
                  } catch (e) {
                    console.error('Print error:', e);
                  }
                }, 500);
              };
              
              // Fallback if onload doesn't fire
              setTimeout(function() {
                try {
                  window.print();
                } catch (e) {
                  console.error('Print error (fallback):', e);
                }
              }, 1500);
            </script>
          </body>
        </html>
      `;

      // Wait for print window to be ready
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load before triggering print
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.print();
            // Don't close immediately, let user interact with print dialog
            setTimeout(() => {
              if (printWindow && !printWindow.closed) {
                printWindow.close();
              }
            }, 1000);
          } catch (printError) {
            console.error('Error triggering print:', printError);
            toast.error('Failed to open print dialog. Please check browser settings.');
          }
        }, 500);
      };

      // Fallback if onload doesn't fire
      setTimeout(() => {
        if (printWindow && !printWindow.closed && printWindow.document) {
          try {
            printWindow.print();
          } catch (printError) {
            console.error('Error triggering print (fallback):', printError);
          }
        }
      }, 1000);

      setIsPrinting(false);
      setIsPreviewOpen(false);
      toast.dismiss(loadingToast);
      toast.success(`Successfully generated ${selectedProductsList.length} barcode label(s)`);
    } catch (error) {
      console.error('Error printing barcodes:', error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to print barcodes: ${error.message || 'Unknown error'}`);
      setIsPrinting(false);
    }
  };

  const allSelected = filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length;
  const someSelected = selectedProducts.size > 0 && selectedProducts.size < filteredProducts.length;

  return (
    <ProtectedRoute allowedRoles={['admin', 'user']}>
      <RoleBasedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Print Barcodes</h1>
              <p className="text-muted-foreground mt-1">
                Select products to generate and print barcode labels
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                disabled={selectedProducts.size === 0 || isPrinting}
              >
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? 'Printing...' : 'Print & Preview'}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Products with Barcodes</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      Select All ({filteredProducts.length})
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {selectedProducts.size} selected
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name, barcode, or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader message="Loading products..." />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchTerm
                    ? 'No products found matching your search'
                    : 'No products with barcodes found'}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>MRP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.has(product.id)}
                              onCheckedChange={(checked) =>
                                handleSelectProduct(product.id, checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {product.barcode}
                            </code>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {product.sku || '-'}
                          </TableCell>
                          <TableCell>
                            ₹{Number(product.price || product.salePrice || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            ₹{Number(product.mrp || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Dialog */}
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Barcode Labels Preview</DialogTitle>
                <DialogDescription>
                  Preview of {selectedProducts.size} barcode label(s). Layout: 1 column, 1 label per row.
                </DialogDescription>
              </DialogHeader>
              {getSelectedProductsList().length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-[18px] p-4 bg-gray-50 rounded-lg">
                    {getSelectedProductsList().map((product) => {
                      const shelfName = product.shelf?.name || product.shelfId || '';
                      const cleanedShelfName = cleanShelfName(shelfName);
                      const productName = product.name || 'PRODUCT';
                      const productNameWithShelf = cleanedShelfName
                        ? `${productName} - ${cleanedShelfName}`
                        : productName;

                      return (
                        <div key={product.id} className="flex justify-center">
                          <div className="scale-150 origin-center">
                            <BarcodeLabel
                              product={product}
                              store={stores.length > 0 ? stores[0] : null}
                              productName={productNameWithShelf}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 justify-end pt-2 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setIsPreviewOpen(false)}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setIsPreviewOpen(false);
                        handlePrint();
                      }}
                      disabled={isPrinting}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      {isPrinting ? 'Printing...' : 'Print All'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </RoleBasedLayout>
    </ProtectedRoute>
  );
}

