'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import AdminLayout from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, MoreVertical, Edit, Trash2, Plus, Printer } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import Barcode from 'react-barcode';
import BarcodeLabel from '@/components/barcode-label';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ImageUpload from '@/components/image-upload';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import Loader from '@/components/ui/loader';
import { useAuth } from '@/lib/auth-context';
import { useCommon } from '@/lib/common-context';
import { productsAPI, storesAPI, storeInventoryAPI } from '@/lib/api';
import logger from '@/lib/logger';
import { productSchema, formatZodError, getFieldErrors } from '@/lib/validations';
import { cleanShelfName } from '@/lib/utils';
import ProductAttributes from '@/components/product-attributes';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shelfFilter, setShelfFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeInventory, setStoreInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subcategoryId: '',
    barcode: '',
    mrp: '',
    salePrice: '',
    modelType: '',
    packType: '',
    quantity: '',
    minStockLevel: '',
    allowNegativeStock: true,
    shelfId: '',
    description: '',
    image: '',
  });
  const [editSubcategories, setEditSubcategories] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { user } = useAuth();
  const { categories } = useCommon();

  const shelves = useMemo(() => {
    const uniqueShelves = new Set(
      products
        .map((product) => product.shelfId || product.shelf?.id || product.shelf)
        .filter(Boolean)
    );
    return Array.from(uniqueShelves);
  }, [products]);

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

  const fetchProducts = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const response = await productsAPI.getAll(user.token, { limit: 1000 });
      if (response.success) {
        // Ensure productAttributes is included in the response
        const productsWithAttributes = (response.data?.products || response.data || []).map(product => ({
          ...product,
          productAttributes: product.productAttributes || []
        }));
        setProducts(productsWithAttributes);
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

  const fetchStoreInventory = async (storeId) => {
    if (!user?.token || !storeId) return;
    try {
      setLoading(true);
      const response = await storeInventoryAPI.getStoreInventory(storeId, user.token);
      if (response.success) {
        setStoreInventory(response.data || []);
      } else {
        toast.error(response.message || 'Failed to load store inventory');
      }
    } catch (error) {
      logger.error('Error fetching store inventory:', error);
      toast.error('Failed to load store inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchStores();
      fetchProducts();
    }
  }, [user?.token]);

  useEffect(() => {
    if (user?.token && storeFilter !== 'all') {
      fetchStoreInventory(storeFilter);
    } else {
      setStoreInventory([]);
    }
  }, [user?.token, storeFilter]);

  // Merge store inventory with products when store filter is active
  const productsWithStoreInventory = useMemo(() => {
    if (storeFilter === 'all') {
      return products;
    }

    // Create a map of productId -> store inventory
    const inventoryMap = new Map();
    storeInventory.forEach((inv) => {
      inventoryMap.set(inv.productId, inv);
    });

    // Merge products with store inventory
    return products.map((product) => {
      const storeInv = inventoryMap.get(product.id);
      if (storeInv) {
        return {
          ...product,
          quantity: storeInv.quantity,
          storeInventory: storeInv,
        };
      }
      return {
        ...product,
        quantity: 0,
        storeInventory: null,
      };
    });
  }, [products, storeInventory, storeFilter]);

  const filteredProducts = useMemo(() => {
    return productsWithStoreInventory.filter((product) => {
      const matchesSearch =
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' ||
        product.categoryId === categoryFilter ||
        product.category?.name === categoryFilter;
      const matchesShelf =
        shelfFilter === 'all' ||
        product.shelfId === shelfFilter ||
        product.shelf?.id === shelfFilter;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && product.quantity < 10) ||
        (stockFilter === 'out' && product.quantity === 0);

      return matchesSearch && matchesCategory && matchesShelf && matchesStock;
    });
  }, [productsWithStoreInventory, searchTerm, categoryFilter, shelfFilter, stockFilter]);

  const handleDelete = async (id) => {
    if (!user?.token) return;
    try {
      const response = await productsAPI.delete(id, user.token);
      if (response.success) {
        toast.success('Product deleted successfully');
        fetchProducts();
      } else {
        toast.error(response.message || 'Failed to delete product');
      }
    } catch (error) {
      logger.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const closeProductDetail = () => {
    setIsDetailOpen(false);
    setSelectedProduct(null);
  };

  const handlePreviewProduct = (product) => {
    if (!product || !product.barcode) {
      toast.error('No barcode available to preview');
      return;
    }
    setPreviewProduct(product);
    setIsPreviewOpen(true);
  };

  const handlePrintProduct = async (product) => {
    if (typeof window === 'undefined' || !product || !product.barcode) {
      toast.error('No barcode available to print');
      return;
    }

    if (isPrinting) {
      toast.info('Print in progress, please wait...');
      return;
    }

    setIsPrinting(true);
    const loadingToast = toast.loading('Generating barcode label...');

    try {
      // Get store information (use first store or default)
      const store = stores.length > 0 ? stores[0] : null;
      const storeName = store?.name || 'STORE';
      const storeLocation = store?.city || '';
      const storePhone = '+91 9701702827';
      const storeInfo = [storeLocation, storePhone].filter(Boolean).join('. ');

      const productName = product.name || 'PRODUCT';
      const shelfName = product.shelf?.name || product.shelfId || '';
      const cleanedShelfName = cleanShelfName(shelfName);
      const productNameWithShelf = cleanedShelfName ? `${productName} - ${cleanedShelfName}` : productName;
      const productCode = product.sku || product.barcode || '';
      const sellingPrice = product.salePrice || product.price || product.mrp || 0;
      const mrp = product.mrp || 0;
      // Use "SHW" for Showroom price (first 3 letters of store name, or default to SHW)
      const storeCode = storeName.substring(0, 3).toUpperCase() === 'BRA' ? 'SHW' : (storeName.substring(0, 3).toUpperCase() || 'SHW');

      // Generate barcode SVG in the main window first
      let barcodeSvg = '';
      
      try {
        // Load JsBarcode if not already loaded
        if (typeof window.JsBarcode === 'undefined') {
        const loadPromise = new Promise((resolve, reject) => {
          // Set timeout for script loading (10 seconds)
          const timeout = setTimeout(() => {
            reject(new Error('Timeout: JsBarcode library took too long to load'));
          }, 10000);

          // Check if script already exists
          const existingScript = document.querySelector('script[src*="jsbarcode"]');
          if (existingScript) {
            if (window.JsBarcode) {
              clearTimeout(timeout);
              resolve();
              return;
            }
            existingScript.addEventListener('load', () => {
              clearTimeout(timeout);
              setTimeout(() => resolve(), 100);
            });
            existingScript.addEventListener('error', () => {
              clearTimeout(timeout);
              reject(new Error('Failed to load JsBarcode library'));
            });
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
          script.onload = () => {
            clearTimeout(timeout);
            // Wait a bit for the library to initialize
            setTimeout(() => resolve(), 100);
          };
          script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load JsBarcode library from CDN'));
          };
          document.head.appendChild(script);
        });

        await loadPromise;

          // Double check it's loaded
          if (typeof window.JsBarcode === 'undefined') {
            throw new Error('JsBarcode library not available after loading');
          }
        }

        // Create a temporary SVG element to generate the barcode
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.setAttribute('id', 'temp-barcode-svg');
        tempSvg.style.position = 'absolute';
        tempSvg.style.left = '-9999px';
        tempSvg.style.top = '-9999px';
        tempSvg.style.visibility = 'hidden';
        document.body.appendChild(tempSvg);

        try {
          // Wait a moment for the element to be in the DOM
          await new Promise(resolve => setTimeout(resolve, 50));

          // Generate barcode using the element directly
          const barcodeValue = String(product.barcode || '').trim();
          if (!barcodeValue) {
            throw new Error('Barcode value is empty');
          }

          window.JsBarcode(tempSvg, barcodeValue, {
            format: "CODE128",
            width: 1.5,
            height: 40,
            displayValue: false,
            margin: 2,
            background: "#ffffff",
            lineColor: "#000000"
          });

          // Wait a bit for rendering
          await new Promise(resolve => setTimeout(resolve, 150));

          // Get the SVG HTML
          if (tempSvg.innerHTML && tempSvg.innerHTML.trim()) {
            // Get the inner content (the actual barcode paths)
            const innerContent = tempSvg.innerHTML;
            // Get attributes
            const viewBox = tempSvg.getAttribute('viewBox') || '0 0 200 100';
            const width = tempSvg.getAttribute('width') || '100%';
            const height = tempSvg.getAttribute('height') || 'auto';
            // Reconstruct the SVG with proper class - escape any special characters
            barcodeSvg = `<svg viewBox="${viewBox}" width="${width}" height="${height}" class="barcode-svg" xmlns="http://www.w3.org/2000/svg">${innerContent}</svg>`;
            console.log('Barcode SVG generated successfully, length:', barcodeSvg.length);
          } else {
            console.error('Barcode SVG is empty. innerHTML:', tempSvg.innerHTML);
            throw new Error('Barcode SVG is empty - generation may have failed');
          }
        } finally {
          // Always cleanup the temporary SVG
          if (document.body.contains(tempSvg)) {
            document.body.removeChild(tempSvg);
          }
        }

        // Validate barcode SVG was generated
        if (!barcodeSvg || barcodeSvg.trim() === '') {
          throw new Error('Barcode SVG is empty after generation');
        }
      } catch (error) {
        console.error('Error generating barcode:', error);
        toast.dismiss(loadingToast);
        toast.error(`Failed to generate barcode: ${error.message}. Please check your internet connection and try again.`);
        setIsPrinting(false);
        return;
      }

      // Escape special characters in template string values
      const escapeHtml = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      // Escape all values before using in template
      const escapedStoreName = escapeHtml(storeName);
      const escapedStoreInfo = storeInfo ? escapeHtml(storeInfo) : '';
      const escapedProductName = escapeHtml(productNameWithShelf);
      const escapedProductCode = productCode ? escapeHtml(productCode) : '';
      const escapedStoreCode = escapeHtml(storeCode);
      const escapedBarcode = escapeHtml(product.barcode || '');

      toast.dismiss(loadingToast);
      toast.success('Barcode generated! Opening print dialog...');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window - popups may be blocked');
      }

      const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Label - ${product.barcode}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              background: white;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
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
            }

            .label-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 1px;
              flex-shrink: 0;
            }

            .store-name {
              font-size: 7px;
              font-weight: bold;
              text-transform: uppercase;
              line-height: 1.1;
              margin-bottom: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .store-phone {
              font-size: 6px;
              font-weight: bold;
              text-align: right;
              line-height: 1.1;
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
              font-size: 9px;
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
            }
          </style>
        </head>
        <body>
          <div class="barcode-label">
            <!-- Header: Store Name and Phone -->
            <div class="label-header">
              <div class="store-name">SRI GAYATRI POOJA STORES</div>
              ${storePhone ? `<div class="store-phone">${escapeHtml(storePhone)}</div>` : ''}
            </div>

            <!-- Product Name -->
            <div class="product-name">${escapedProductName}</div>

            <!-- Barcode -->
            <div class="barcode-container">
              ${barcodeSvg}
            </div>

            <!-- SKU Code -->
            ${escapedProductCode ? `<div class="sku-code">${escapedProductCode}</div>` : ''}

            <!-- Pricing Section (Below SKU) -->
            <div class="pricing-section">
              <div class="price-row selling-price">
                <span class="price-label">${escapedStoreCode} Rs.:</span>
                <span class="price-value selling-price">₹${Number(sellingPrice).toFixed(2)}</span>
              </div>
              <div class="price-row mrp-row">
                <span class="price-label">MRP Rs.:</span>
                <span class="price-value mrp">₹${Number(mrp).toFixed(2)}</span>
                <span class="tax-info">(Incl of All Taxes) MHS</span>
              </div>
            </div>
          </div>
          <script>
            // Wait for content to load, then print
            if (document.readyState === 'complete') {
              setTimeout(function() {
                window.print();
                // Close the window after a delay to allow print dialog to show
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 300);
            } else {
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  // Close the window after a delay to allow print dialog to show
                  setTimeout(function() {
                    window.close();
                  }, 500);
                }, 300);
              };
            }
          </script>
        </body>
      </html>
      `;
      
      try {
        // Write content to print window
        printWindow.document.open('text/html', 'replace');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for window to load, then verify content
        printWindow.onload = () => {
          setTimeout(() => {
            if (printWindow.document && printWindow.document.body) {
              const bodyContent = printWindow.document.body.innerHTML.trim();
              if (bodyContent === '' || bodyContent.length < 100) {
                console.error('Print window is empty! Body content length:', bodyContent.length);
                toast.error('Failed to load print content. Please try again.');
                printWindow.close();
                setIsPrinting(false);
              } else {
                console.log('Print window content loaded successfully, length:', bodyContent.length);
                // Content is loaded, print will be triggered by the script in the HTML
              }
            }
          }, 100);
        };
        
        // Fallback: if onload doesn't fire, check after a delay
        setTimeout(() => {
          if (printWindow.document && printWindow.document.body) {
            const bodyContent = printWindow.document.body.innerHTML.trim();
            if (bodyContent === '' || bodyContent.length < 100) {
              console.error('Print window still empty after timeout');
              // Try to write again
              try {
                printWindow.document.open();
                printWindow.document.write(htmlContent);
                printWindow.document.close();
              } catch (retryError) {
                console.error('Retry failed:', retryError);
                toast.error('Failed to load print content. Please try again.');
                printWindow.close();
              }
            }
          }
          // Reset printing state
          setIsPrinting(false);
        }, 2000);
      } catch (error) {
        console.error('Error in print process:', error);
        toast.dismiss(loadingToast);
        toast.error(`Failed to print barcode: ${error.message}. Please try again.`);
        setIsPrinting(false);
        if (typeof printWindow !== 'undefined' && printWindow) {
          try {
            printWindow.close();
          } catch (closeError) {
            console.error('Error closing window:', closeError);
          }
        }
      }
    } catch (error) {
      console.error('Error in print process:', error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to print barcode: ${error.message}. Please try again.`);
      setIsPrinting(false);
    }
  };

  const handleEdit = (product) => {
    // Close detail modal if it's open
    if (isDetailOpen) {
      closeProductDetail();
    }
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      categoryId: product.categoryId || '',
      subcategoryId: product.subcategoryId || '',
      barcode: product.barcode || '',
      mrp: product.mrp?.toString() || '',
      salePrice: product.salePrice?.toString() || '',
      modelType: product.modelType || '',
      packType: product.packType || '',
      quantity: product.quantity?.toString() || '',
      minStockLevel: product.minStockLevel?.toString() || '',
      allowNegativeStock: product.allowNegativeStock !== undefined ? product.allowNegativeStock : true,
      shelfId: product.shelfId || '',
      description: product.description || '',
      image: product.image || '',
    });
    const subs =
      categories?.find((cat) => cat.id === product.categoryId)?.subcategories ||
      [];
    setEditSubcategories(subs);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditErrors({});
    if (!user?.token || !editingProduct) return;
    
    try {
      // Prepare data for validation
      const dataToValidate = {
        ...formData,
        mrp: formData.mrp ? Number(formData.mrp) : 0,
        salePrice: formData.salePrice ? Number(formData.salePrice) : null,
        modelType: formData.modelType || null,
        packType: formData.packType || null,
        quantity: formData.quantity ? Number(formData.quantity) : 0,
        minStockLevel: formData.minStockLevel ? Number(formData.minStockLevel) : null,
        allowNegativeStock: formData.allowNegativeStock !== undefined ? formData.allowNegativeStock : true,
        subcategoryId: formData.subcategoryId || undefined,
        shelfId: formData.shelfId || undefined,
        description: formData.description || undefined,
        image: formData.image || undefined,
      };

      // Validate input
      const validationResult = productSchema.safeParse(dataToValidate);

      if (!validationResult.success) {
        const fieldErrors = getFieldErrors(validationResult.error);
        setEditErrors(fieldErrors);
        const firstError = formatZodError(validationResult.error);
        toast.error(firstError);
        logger.warn('Product update validation failed:', validationResult.error.errors);
        return;
      }

      const validatedData = validationResult.data;
      logger.info('Updating product:', { id: editingProduct.id, name: validatedData.name });

      const payload = {
        name: validatedData.name,
        categoryId: validatedData.categoryId,
        subcategoryId: validatedData.subcategoryId || undefined,
        barcode: validatedData.barcode,
        mrp: validatedData.mrp,
        salePrice: validatedData.salePrice || null,
        modelType: validatedData.modelType || null,
        packType: validatedData.packType || null,
        quantity: validatedData.quantity || 0,
        minStockLevel: validatedData.minStockLevel || null,
        allowNegativeStock: validatedData.allowNegativeStock !== undefined ? validatedData.allowNegativeStock : true,
        shelfId: validatedData.shelfId || null,
        description: validatedData.description || null,
        image: validatedData.image || null,
      };

      const response = await productsAPI.update(
        editingProduct.id,
        payload,
        user.token
      );
      if (response.success) {
        logger.info('Product updated successfully:', { id: editingProduct.id });
        toast.success('Product updated successfully');
        setIsEditModalOpen(false);
        fetchProducts();
      } else {
        logger.error('Product update failed:', response.message);
        toast.error(response.message || 'Failed to update product');
      }
    } catch (error) {
      logger.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (editErrors[field]) {
      setEditErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (field === 'categoryId') {
      const subs =
        categories?.find((cat) => cat.id === value)?.subcategories || [];
      setEditSubcategories(subs);
      setFormData((prev) => ({ ...prev, subcategoryId: '' }));
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader message="Loading your inventory shelves..." />
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Inventory Overview</h1>
              <p className="text-muted-foreground">
                Manage your product inventory
              </p>
            </div>
            <Link href="/add-product">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Product
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={shelfFilter} onValueChange={setShelfFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Shelf" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shelves</SelectItem>
                    {shelves.map((shelf) => (
                      <SelectItem key={shelf} value={shelf}>
                        {shelf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Levels</SelectItem>
                    <SelectItem value="low">Low Stock (&lt; 10)</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores (Global)</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Product Listing */}
          <Card>
            <CardHeader>
              <CardTitle>Product Listing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Shelf</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => {
                        const categoryName = product.category?.name || '—';
                        const shelfName =
                          product.shelf?.name || product.shelfId || '—';
                        const mrp = Number(product.mrp || 0);
                        const salePrice = product.salePrice ? Number(product.salePrice) : null;
                        const displayPrice = salePrice || mrp;
                        const imageSrc =
                          product.image || '/images/product-placeholder.png';
                        const modelTypeLabel = product.modelType ? 
                          product.modelType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—';
                        return (
                          <TableRow
                            key={product.id}
                            className="cursor-pointer"
                            onClick={(event) => {
                              if (
                                event.target.closest &&
                                event.target.closest('[data-row-action="true"]')
                              ) {
                                return;
                              }
                              openProductDetail(product);
                            }}
                          >
                            <TableCell>
                              <div className="w-12 h-12 relative rounded overflow-hidden bg-muted">
                                <Image
                                  src={imageSrc}
                                  alt={product.name || 'Product'}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {product.sku || '—'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {product.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{categoryName}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-sm">
                              {product.barcode}
                            </TableCell>
                            <TableCell>
                              {modelTypeLabel !== '—' && (
                                <Badge variant="secondary">{modelTypeLabel}</Badge>
                              )}
                              {modelTypeLabel === '—' && '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  product.quantity < 10
                                    ? 'destructive'
                                    : 'default'
                                }
                              >
                                {product.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {salePrice ? (
                                <div>
                                  <span className="line-through text-muted-foreground text-sm">
                                    ${mrp.toFixed(2)}
                                  </span>
                                  <span className="ml-2 text-destructive font-semibold">
                                    ${salePrice.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                `$${displayPrice.toFixed(2)}`
                              )}
                            </TableCell>
                            <TableCell className="font-mono">
                              {shelfName}
                            </TableCell>
                            <TableCell>
                              <div data-row-action="true">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(product);
                                      }}
                                    >
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(product.id);
                                      }}
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No products found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredProducts.length} of {products.length} products
                  {storeFilter !== 'all' && (
                    <span className="ml-2">
                      (Store: {stores.find((s) => s.id === storeFilter)?.name || 'Unknown'})
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Tip: Click a product row for details and barcode label.
                  {storeFilter !== 'all' && ' Quantities shown are store-specific.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className={editErrors.name ? 'border-destructive' : ''}
                required
              />
              {editErrors.name && (
                <p className="text-sm text-destructive">{editErrors.name}</p>
              )}
            </div>

            {/* 3-Column Layout for Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Basic Information */}
              <div className="space-y-4 min-w-0">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => handleFormChange('categoryId', value)}
                  >
                    <SelectTrigger className={editErrors.categoryId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editErrors.categoryId && (
                    <p className="text-sm text-destructive">{editErrors.categoryId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategoryId">Subcategory</Label>
                  <Select
                    value={formData.subcategoryId}
                    onValueChange={(value) =>
                      handleFormChange('subcategoryId', value)
                    }
                    disabled={!formData.categoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {editSubcategories.map((subcat) => (
                        <SelectItem key={subcat.id} value={subcat.id}>
                          {subcat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => handleFormChange('barcode', e.target.value)}
                    className={editErrors.barcode ? 'border-destructive' : ''}
                    required
                  />
                  {editErrors.barcode && (
                    <p className="text-sm text-destructive">{editErrors.barcode}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shelfId">Shelf Location</Label>
                  <Select
                    value={formData.shelfId}
                    onValueChange={(value) => handleFormChange('shelfId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shelf location" />
                    </SelectTrigger>
                    <SelectContent>
                      {shelves.map((shelf) => (
                        <SelectItem key={shelf} value={shelf}>
                          {shelf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Column 2: Pricing & Stock */}
              <div className="space-y-4 min-w-0">
                <div className="space-y-2">
                  <Label htmlFor="mrp">MRP (Maximum Retail Price)</Label>
                  <Input
                    id="mrp"
                    type="number"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => handleFormChange('mrp', e.target.value)}
                    className={editErrors.mrp ? 'border-destructive' : ''}
                    required
                  />
                  {editErrors.mrp && (
                    <p className="text-sm text-destructive">{editErrors.mrp}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salePrice">Sale Price (Optional)</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    value={formData.salePrice}
                    onChange={(e) => handleFormChange('salePrice', e.target.value)}
                    className={editErrors.salePrice ? 'border-destructive' : ''}
                  />
                  {editErrors.salePrice && (
                    <p className="text-sm text-destructive">{editErrors.salePrice}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Leave empty if no special offer price
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      handleFormChange('quantity', e.target.value)
                    }
                    className={editErrors.quantity ? 'border-destructive' : ''}
                  />
                  {editErrors.quantity && (
                    <p className="text-sm text-destructive">{editErrors.quantity}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStockLevel">Minimum Stock Level (Optional)</Label>
                  <Input
                    id="minStockLevel"
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => handleFormChange('minStockLevel', e.target.value)}
                    className={editErrors.minStockLevel ? 'border-destructive' : ''}
                  />
                  {editErrors.minStockLevel && (
                    <p className="text-sm text-destructive">{editErrors.minStockLevel}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Override category default. Leave empty to use category default.
                  </p>
                </div>
              </div>

              {/* Column 3: Product Attributes */}
              <div className="space-y-4 min-w-0">
                <div className="space-y-2">
                  <Label htmlFor="modelType">Model Type</Label>
                  <Select
                    value={formData.modelType}
                    onValueChange={(value) => handleFormChange('modelType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLAIN">Plain</SelectItem>
                      <SelectItem value="DESIGN">Design</SelectItem>
                      <SelectItem value="TWO_D">2D</SelectItem>
                      <SelectItem value="THREE_D">3D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packType">Pack Type</Label>
                  <Select
                    value={formData.packType}
                    onValueChange={(value) => handleFormChange('packType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pack type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PACK">Pack</SelectItem>
                      <SelectItem value="LOOSE">Loose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowNegativeStock"
                      checked={formData.allowNegativeStock}
                      onCheckedChange={(checked) => handleFormChange('allowNegativeStock', checked)}
                    />
                    <Label htmlFor="allowNegativeStock" className="font-normal cursor-pointer">
                      Allow negative stock
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-width fields */}
            <div className="space-y-2">
              <Label htmlFor="description">Description/Notes</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  handleFormChange('description', e.target.value)
                }
              />
            </div>

            <ImageUpload
              value={formData.image}
              onChange={(value) => handleFormChange('image', value)}
              label="Product Image"
            />

            {editingProduct && editingProduct.id && (
              <div className="space-y-4 border-t pt-4">
                <ProductAttributes
                  productId={editingProduct.id}
                  token={user?.token}
                  readonly={false}
                />
              </div>
            )}

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) closeProductDetail();
        }}
      >
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View product information and a barcode label ready for scanning.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-6 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Basic Information */}
              <div className="space-y-3 text-sm min-w-0">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU</span>
                  <span className="font-mono font-medium">{selectedProduct.sku || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">
                    {selectedProduct.category?.name || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subcategory</span>
                  <span className="font-medium">
                    {selectedProduct.subcategory?.name || '—'}
                  </span>
                </div>
                {selectedProduct.category && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Category GST Info</div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">HSN Code</span>
                        <span className="font-medium">{selectedProduct.category.hsnCode || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST Rate</span>
                        <span className="font-medium">{selectedProduct.category.gstRate || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST Inclusive</span>
                        <span className="font-medium">
                          {selectedProduct.category.gstInclusive ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model Type</span>
                  <span className="font-medium">
                    {selectedProduct.modelType 
                      ? selectedProduct.modelType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pack Type</span>
                  <span className="font-medium">
                    {selectedProduct.packType 
                      ? selectedProduct.packType.charAt(0) + selectedProduct.packType.slice(1).toLowerCase()
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shelf</span>
                  <span className="font-medium">
                    {selectedProduct.shelf?.name ||
                      selectedProduct.shelfId ||
                      '—'}
                  </span>
                </div>
                {selectedProduct.description && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Description
                      </span>
                      <p className="text-sm">{selectedProduct.description}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Column 2: Additional Details */}
              <div className="space-y-3 text-sm min-w-0">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Barcode</span>
                  <span className="font-mono font-medium break-all text-right">
                    {selectedProduct.barcode || '—'}
                  </span>
                </div>
                {selectedProduct.barcode && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground text-center">
                        Label Preview (3.5" × 2")
                      </div>
                      <div className="border rounded p-2 bg-white" style={{ 
                        width: '100%', 
                        aspectRatio: '3.5/2',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '6px 8px',
                        boxSizing: 'border-box'
                      }}>
                        {/* Header: Shop Name and Address */}
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-bold text-[10px] uppercase leading-tight">
                            {stores.length > 0 ? stores[0].name : 'STORE'}®
                          </div>
                          <div className="text-[6px] text-gray-700 text-right leading-tight">
                            {stores.length > 0 && stores[0].city ? stores[0].city : ''}
                            {stores.length > 0 && stores[0].contact ? `. Ph: ${stores[0].contact}` : ''}
                          </div>
                        </div>

                        {/* Product Name */}
                        <div className="font-bold text-[9px] uppercase leading-tight mb-1">
                          {(() => {
                            const shelfName = selectedProduct.shelf?.name || selectedProduct.shelfId || '';
                            const cleanedShelfName = cleanShelfName(shelfName);
                            return cleanedShelfName 
                              ? `${selectedProduct.name} - ${cleanedShelfName}`
                              : selectedProduct.name;
                          })()}
                        </div>

                        {/* Barcode */}
                        <div className="flex flex-col items-center mb-1" style={{ maxHeight: '75px', overflow: 'hidden' }}>
                          <Barcode
                            value={selectedProduct.barcode}
                            format="CODE128"
                            width={1.8}
                            height={50}
                            displayValue={false}
                            fontSize={10}
                            margin={4}
                          />
                          <div className="font-mono text-gray-700 mt-1" style={{ fontSize: '12px' }}>
                            {selectedProduct.barcode}
                          </div>
                        </div>

                        {/* SKU Code */}
                        {selectedProduct.sku && (
                          <div className="font-mono text-gray-700 text-center mb-1" style={{ fontSize: '12px' }}>
                            {selectedProduct.sku}
                          </div>
                        )}

                        {/* Pricing Section (Below SKU) */}
                        <div className="mt-auto space-y-0.5">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-[8px]">
                              {(() => {
                                const storeName = stores.length > 0 ? stores[0].name : 'STORE';
                                const code = storeName.substring(0, 3).toUpperCase();
                                return code === 'BRA' ? 'SHW' : (code || 'SHW');
                              })()} Rs.:
                            </span>
                            <span className="font-bold text-sm">
                              ₹{Number(selectedProduct.salePrice || selectedProduct.price || selectedProduct.mrp || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-[8px]">MRP Rs.:</span>
                            <span className="font-bold text-[10px]">
                              ₹{Number(selectedProduct.mrp || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-[7px] text-gray-600 font-medium">(Incl of All Taxes) MHS</div>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handlePreviewProduct(selectedProduct)}
                        size="sm"
                        disabled={isPrinting}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        {isPrinting ? 'Generating...' : 'Preview & Print Barcode'}
                      </Button>
                    </div>
                  </>
                )}
                {selectedProduct.image && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <span className="text-muted-foreground block">Product Image</span>
                      <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={selectedProduct.image}
                          alt={selectedProduct.name}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Column 3: Stock & Inventory Info */}
              <div className="space-y-3 text-sm min-w-0">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock Status</span>
                  <Badge
                    variant={
                      selectedProduct.quantity <= (selectedProduct.minStockLevel || 0)
                        ? 'destructive'
                        : selectedProduct.quantity > (selectedProduct.minStockLevel || 0) * 2
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {selectedProduct.quantity <= (selectedProduct.minStockLevel || 0)
                      ? 'Low Stock'
                      : 'In Stock'}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Inventory Summary</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available Qty</span>
                    <span className="font-medium">{selectedProduct.quantity || 0}</span>
                  </div>
                  {selectedProduct.minStockLevel && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min Stock Level</span>
                      <span className="font-medium">{selectedProduct.minStockLevel}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allow Negative</span>
                    <span className="font-medium">
                      {selectedProduct.allowNegativeStock ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Pricing Summary</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MRP</span>
                    <span className="font-medium">
                      ${Number(selectedProduct.mrp || 0).toFixed(2)}
                    </span>
                  </div>
                  {selectedProduct.salePrice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sale Price</span>
                      <span className="font-medium text-destructive">
                        ${Number(selectedProduct.salePrice).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Price</span>
                    <span className="font-medium">
                      ${Number(selectedProduct.price || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground font-semibold">Total Value</span>
                    <span className="font-bold">
                      $
                      {(
                        Number(selectedProduct.price || 0) *
                        Number(selectedProduct.quantity || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              </div>

              {/* Product Attributes Section */}
              {selectedProduct.id && (
                <div className="border-t pt-4">
                  <ProductAttributes
                    productId={selectedProduct.id}
                    token={user?.token}
                    readonly={false}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Barcode Label Preview</DialogTitle>
            <DialogDescription>
              Preview the barcode label before printing. Size: 2in × 1in
            </DialogDescription>
          </DialogHeader>
          {previewProduct && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="text-sm text-muted-foreground text-center">
                  Preview (scaled for visibility) • Actual print size: 2in × 1in
                </div>
                <div className="flex justify-center items-center bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 min-h-[200px]">
                  <div className="scale-[2.5] origin-center">
                    <BarcodeLabel 
                      product={previewProduct} 
                      store={stores.length > 0 ? stores[0] : null}
                      productName={(() => {
                        const productName = previewProduct.name || 'PRODUCT';
                        const shelfName = previewProduct.shelf?.name || previewProduct.shelfId || '';
                        const cleanedShelfName = cleanShelfName(shelfName);
                        return cleanedShelfName ? `${productName} - ${cleanedShelfName}` : productName;
                      })()}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    handlePrintProduct(previewProduct);
                  }}
                  disabled={isPrinting}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {isPrinting ? 'Printing...' : 'Print'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
