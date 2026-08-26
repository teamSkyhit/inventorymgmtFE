'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
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
import { Search, MoreVertical, Edit, Trash2, Plus, Printer, ChevronDown, ChevronRight, RefreshCw, Globe, X } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import Loader from '@/components/ui/loader';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { useAuth } from '@/lib/auth-context';
import { useCommon } from '@/lib/common-context';
import { productsAPI, storeInventoryAPI, shelvesAPI } from '@/lib/api';
import { useStores } from '@/lib/hooks/useStores';
import logger from '@/lib/logger';
import { productSchema, formatZodError, getFieldErrors } from '@/lib/validations';
import { cleanShelfName, formatIndianCurrency } from '@/lib/utils';
// import ProductAttributes from '@/components/product-attributes'; // Commented out - using variants instead

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shelfFilter, setShelfFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editingVariants, setEditingVariants] = useState([]);
  const [editingVariant, setEditingVariant] = useState(null);
  const [isVariantEditModalOpen, setIsVariantEditModalOpen] = useState(false);
  const [variantFormData, setVariantFormData] = useState({
    size: '',
    modelType: '',
    barcode: '',
    mrp: '',
    salePrice: '',
    quantity: '',
    image: '',
  });

  // Generate a new barcode for variant add/edit modal
  const generateVariantBarcode = () => {
    const randomBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString(); // 12-digit numeric
    setVariantFormData((prev) => ({
      ...prev,
      barcode: randomBarcode,
    }));
  };
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subcategoryId: '',
    barcode: '',
    mrp: '',
    salePrice: '',
    modelType: '',
    packType: '',
    size: '', // For variants
    quantity: '',
    minStockLevel: '',
    allowNegativeStock: true,
    shelfId: '',
    showOnWebsite: false,
    hidePrice: false,
    websiteSlug: '',
    websiteImages: [],
    description: '',
    image: '',
  });
  const [editSubcategories, setEditSubcategories] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { user } = useAuth();
  const { categories } = useCommon();

  const qc = useQueryClient();
  const { data: stores = [] } = useStores();

  const productsParams = {
    grouped: true,
    page: currentPage,
    limit: itemsPerPage,
    ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
    ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
  };
  const { data: productsResponse, isLoading: loading } = useQuery({
    queryKey: ['products', productsParams],
    queryFn: async () => {
      const response = await productsAPI.getAll(user.token, productsParams);
      if (!response.success) throw new Error(response.message || 'Failed to load products');
      return response;
    },
    enabled: !!user?.token,
  });
  const products = productsResponse?.data?.products || productsResponse?.data || [];
  const paginationMeta = productsResponse?.meta || { total: 0, page: 1, limit: 10, totalPages: 0 };

  const { data: editShelves = [], isLoading: loadingEditShelves } = useQuery({
    queryKey: ['shelves'],
    queryFn: async () => {
      const response = await shelvesAPI.getAll(user.token);
      if (!response.success) throw new Error(response.message || 'Failed to load shelves');
      return response.data || [];
    },
    enabled: !!user?.token,
  });

  const { data: storeInventory = [] } = useQuery({
    queryKey: ['store-inventory', storeFilter],
    queryFn: async () => {
      const response = await storeInventoryAPI.getStoreInventory(storeFilter, user.token);
      if (!response.success) throw new Error(response.message || 'Failed to load store inventory');
      return response.data || [];
    },
    enabled: !!user?.token && storeFilter !== 'all',
  });

  const shelves = useMemo(() => {
    const uniqueShelves = new Set(
      products
        .map((product) => product.shelfId || product.shelf?.id || product.shelf)
        .filter(Boolean)
    );
    return Array.from(uniqueShelves);
  }, [products]);

  // Helper function to detect if input is a barcode (numeric, 8+ digits)
  // Defined outside useEffect so it can be used in event handlers
  const isBarcode = (value) => {
    if (!value || value.trim() === '') return false;
    // Remove any whitespace or newline characters (barcode scanners often add these)
    const cleaned = value.trim().replace(/\s+/g, '');
    // Check if it's all numeric and at least 8 digits (common barcode lengths: EAN-8, UPC-A, EAN-13)
    return /^\d{8,}$/.test(cleaned);
  };

  // Debounce search term - wait 500ms after user stops typing
  // BUT immediately search if it's a barcode (for scanner input)
  useEffect(() => {
    // If it's a barcode, search immediately without debouncing
    if (isBarcode(searchTerm)) {
      setDebouncedSearchTerm(searchTerm.trim());
      return;
    }

    // For regular text input, use debouncing
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    // Cleanup function to clear the timer if user types again
    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);


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

  // Client-side filtering for shelf and stock (not supported by API)
  const filteredProducts = useMemo(() => {
    return productsWithStoreInventory.filter((product) => {
      const matchesShelf =
        shelfFilter === 'all' ||
        product.shelfId === shelfFilter ||
        product.shelf?.id === shelfFilter ||
        product.variants?.some(v => v.shelfId === shelfFilter || v.shelf?.id === shelfFilter);
      
      // Calculate total stock for parent products
      const totalStock = product.variants && product.variants.length > 0
        ? product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
        : (product.quantity || 0);
      
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && totalStock < 10) ||
        (stockFilter === 'out' && totalStock === 0);

      return matchesShelf && matchesStock;
    });
  }, [productsWithStoreInventory, shelfFilter, stockFilter]);

  // Use server-side pagination metadata
  const totalPages = paginationMeta.totalPages || 1;
  const startIndex = (paginationMeta.page - 1) * paginationMeta.limit;
  const endIndex = Math.min(startIndex + paginationMeta.limit, paginationMeta.total);

  // Reset to page 1 when filters change (that trigger API calls)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, categoryFilter]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handleDelete = async (id, productName = '', variantCount = 0) => {
    if (!user?.token) return;
    
    // Show confirmation with cascade warning if parent has variants
    const confirmMessage = variantCount > 0
      ? `Are you sure you want to delete "${productName}"? This will also delete ${variantCount} variant(s). This action cannot be undone.`
      : `Are you sure you want to delete "${productName}"? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      const response = await productsAPI.delete(id, user.token);
      if (response.success) {
        toast.success(variantCount > 0 
          ? `Product and ${variantCount} variant(s) deleted successfully`
          : 'Product deleted successfully');
        
        // If current page might be empty after deletion, go to previous page
        if (filteredProducts.length === 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        } else {
          qc.invalidateQueries({ queryKey: ['products'] });
        }
      } else {
        toast.error(response.message || 'Failed to delete product');
      }
    } catch (error) {
      logger.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const toggleExpandProduct = (productId) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleDeleteVariant = async (variantId, isLastVariant = false) => {
    if (!user?.token) return;
    
    try {
      const response = await productsAPI.deleteVariant(variantId, user.token);
      if (response.success) {
        toast.success(isLastVariant
          ? 'Variant and parent product deleted successfully'
          : 'Variant deleted successfully');
        
        // If current page might be empty after deletion, go to previous page
        if (filteredProducts.length === 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        } else {
          qc.invalidateQueries({ queryKey: ['products'] });
        }
      } else {
        toast.error(response.message || 'Failed to delete variant');
      }
    } catch (error) {
      logger.error('Error deleting variant:', error);
      toast.error('Failed to delete variant');
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
      const storeInfo = storeLocation || '';

      // Build product name with size/weight for variants
      let productName = product.name || 'PRODUCT';
      
      // If it's a variant (has parentProductId or size/weight), append size or weight to name
      if (product.parentProductId || product.size || product.weight) {
        const nameParts = [productName];
        
        // Add size if available
        if (product.size) {
          nameParts.push(product.size);
        }
        
        // Add weight if available
        if (product.weight) {
          nameParts.push(product.weight);
        }
        
        productName = nameParts.join(' - ');
      }
      
      const shelfName = product.shelf?.name || product.shelfId || '';
      const cleanedShelfName = cleanShelfName(shelfName);
      const productNameWithShelf = cleanedShelfName ? `${productName} - ${cleanedShelfName}` : productName;
      const productCode = product.sku || product.barcode || '';
      const sellingPrice = product.salePrice || product.price || product.mrp || 0;
      const mrp = product.mrp || 0;
      const formattedSellingPrice = formatIndianCurrency(Number(sellingPrice), true);
      const formattedMrp = formatIndianCurrency(Number(mrp), true);
      // Use "SP" for Showroom price (first 3 letters of store name, or default to SP)
      const storeCode = storeName.substring(0, 3).toUpperCase() === 'BRA' ? 'SP' : (storeName.substring(0, 3).toUpperCase() || 'SP');

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
            <!-- Header: Store Name -->
            <div class="label-header">
              <div class="store-name">SRI OM GAYATRI POOJA STORES</div>
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
                <span class="price-label">SP:</span>
                <span class="price-value selling-price">₹${formattedSellingPrice}</span>
              </div>
              <div class="price-row mrp-row">
                <span class="price-label">MRP:</span>
                <span class="price-value mrp">₹${formattedMrp}</span>
                <span class="tax-info">(Incl of All Taxes)</span>
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

  const handleEdit = async (product) => {
    // Close detail modal if it's open
    if (isDetailOpen) {
      closeProductDetail();
    }
    
    // Fetch product with variants using the variants endpoint
    let productWithVariants = product;
    try {
      const response = await productsAPI.getWithVariants(product.id, user?.token);
      if (response.success && response.data) {
        productWithVariants = response.data;
      } else {
        // Fallback to getById if getWithVariants fails
        const fallbackResponse = await productsAPI.getById(product.id, user?.token);
        if (fallbackResponse.success && fallbackResponse.data) {
          productWithVariants = fallbackResponse.data;
        }
      }
    } catch (error) {
      logger.error('Error fetching product with variants:', error);
      // Continue with original product if fetch fails
    }
    
    setEditingProduct(productWithVariants);
    // Set variants from the product data
    const variants = productWithVariants.variants || [];
    setEditingVariants(variants);
    
    // Debug log
    console.log('Editing product:', productWithVariants);
    console.log('Variants found:', variants);
    
    // Check if this is a variant
    const isVariant = !!productWithVariants.parentProductId;
    
    setFormData({
      name: productWithVariants.name || '',
      categoryId: productWithVariants.categoryId || '',
      subcategoryId: productWithVariants.subcategoryId || '',
      barcode: productWithVariants.barcode || '',
      mrp: productWithVariants.mrp?.toString() || '',
      salePrice: productWithVariants.salePrice?.toString() || '',
      modelType: productWithVariants.modelType || '',
      packType: productWithVariants.packType || '',
      size: productWithVariants.size || '', // For variants
      quantity: productWithVariants.quantity?.toString() || '',
      minStockLevel: productWithVariants.minStockLevel?.toString() || '',
      allowNegativeStock: productWithVariants.allowNegativeStock !== undefined ? productWithVariants.allowNegativeStock : true,
      shelfId: productWithVariants.shelfId || '',
      description: productWithVariants.description || '',
      image: productWithVariants.image || '',
      showOnWebsite: productWithVariants.showOnWebsite ?? false,
      hidePrice: productWithVariants.hidePrice ?? false,
      websiteSlug: productWithVariants.websiteSlug || '',
      websiteImages: productWithVariants.websiteImages || [],
    });
    const subs =
      categories?.find((cat) => cat.id === productWithVariants.categoryId)?.subcategories ||
      [];
    setEditSubcategories(subs);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditErrors({});
    if (!user?.token || !editingProduct) return;
    
    try {
      const isVariant = !!editingProduct.parentProductId;
      
      // For variants, only allow editing size, model, price, barcode, stock
      if (isVariant) {
        const payload = {
          size: formData.size || null,
          modelType: formData.modelType || null,
          barcode: formData.barcode,
          mrp: formData.mrp ? Number(formData.mrp) : null,
          salePrice: formData.salePrice ? Number(formData.salePrice) : null,
          quantity: formData.quantity ? Number(formData.quantity) : 0,
        };

        const response = await productsAPI.update(
          editingProduct.id,
          payload,
          user.token
        );
        if (response.success) {
          logger.info('Variant updated successfully:', { id: editingProduct.id });
          toast.success('Variant updated successfully');
          setIsEditModalOpen(false);
          qc.invalidateQueries({ queryKey: ['products'] });
        } else {
          logger.error('Variant update failed:', response.message);
          toast.error(response.message || 'Failed to update variant');
        }
        return;
      }

      // For parent products, validate and update shared fields
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
        showOnWebsite: formData.showOnWebsite ?? false,
        hidePrice: formData.hidePrice ?? false,
        websiteSlug: formData.websiteSlug || null,
        websiteImages: formData.websiteImages || [],
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
        qc.invalidateQueries({ queryKey: ['products'] });
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
      <ProtectedRoute allowedRoles={['admin', 'user']}>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader message="Loading your inventory shelves..." />
          </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'user']}>
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
                    placeholder="Search products or scan barcode..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Handle barcode scanner input (often includes newline/enter)
                      // If input ends with newline and is a barcode, remove it and search immediately
                      if (value.endsWith('\n') || value.endsWith('\r')) {
                        value = value.trim();
                        setSearchTerm(value);
                        // If it's a barcode, trigger immediate search
                        if (isBarcode(value)) {
                          setDebouncedSearchTerm(value);
                        }
                      } else {
                        setSearchTerm(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Handle Enter key for barcode scanning
                      if (e.key === 'Enter' && searchTerm.trim()) {
                        const trimmed = searchTerm.trim();
                        // If it's a barcode, search immediately
                        if (isBarcode(trimmed)) {
                          setDebouncedSearchTerm(trimmed);
                        }
                      }
                    }}
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
                        
                        // Check if this is a parent product with variants
                        const hasVariants = product.variants && product.variants.length > 0;
                        const variantCount = hasVariants ? product.variants.length : 0;
                        const isExpanded = expandedProducts.has(product.id);
                        const totalStock = hasVariants 
                          ? product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
                          : (product.quantity || 0);
                        
                        // Calculate price range for variants
                        const priceRange = hasVariants && product.variants.length > 0
                          ? (() => {
                              const prices = product.variants
                                .map(v => Number(v.salePrice || v.price || v.mrp || 0))
                                .filter(p => p > 0);
                              if (prices.length === 0) return null;
                              const min = Math.min(...prices);
                              const max = Math.max(...prices);
                              return min === max 
                                ? `₹${formatIndianCurrency(min, true)}` 
                                : `₹${formatIndianCurrency(min, true)} - ₹${formatIndianCurrency(max, true)}`;
                            })()
                          : null;
                        
                        return (
                          <>
                            {/* Parent Product Row */}
                            <TableRow
                              key={product.id}
                              className={`cursor-pointer ${hasVariants ? 'bg-muted/30' : ''}`}
                              onClick={(event) => {
                                if (
                                  event.target.closest &&
                                  (event.target.closest('[data-row-action="true"]') ||
                                   event.target.closest('[data-expand-action="true"]'))
                                ) {
                                  return;
                                }
                                // For parent products, just toggle expand/collapse instead of opening detail
                                if (hasVariants) {
                                  toggleExpandProduct(product.id);
                                } else {
                                  openProductDetail(product);
                                }
                              }}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {hasVariants && (
                                    <button
                                      data-expand-action="true"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpandProduct(product.id);
                                      }}
                                      className="p-1 hover:bg-muted rounded"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </button>
                                  )}
                                  <div className="w-12 h-12 relative rounded overflow-hidden bg-muted">
                                    <Image
                                      src={imageSrc}
                                      alt={product.name || 'Product'}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                {hasVariants ? '—' : (product.sku || '—')}
                              </TableCell>
                              <TableCell className="font-medium">
                                {(() => {
                                  // For single products (not variants), show size or weight if available
                                  let displayName = product.name;
                                  if (!hasVariants && (product.size || product.weight)) {
                                    const nameParts = [product.name];
                                    // Priority: size first, then weight
                                    if (product.size) {
                                      nameParts.push(product.size);
                                    } else if (product.weight) {
                                      nameParts.push(product.weight);
                                    }
                                    displayName = nameParts.join(' - ');
                                  }
                                  return displayName;
                                })()}
                                {hasVariants && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({variantCount} variant{variantCount !== 1 ? 's' : ''})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{categoryName}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground font-mono text-sm">
                                {hasVariants ? '—' : (product.barcode || '—')}
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
                                    totalStock < 10
                                      ? 'destructive'
                                      : 'default'
                                  }
                                >
                                  {totalStock}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {hasVariants ? (
                                  '—'
                                ) : salePrice ? (
                                  <div>
                                    <span className="line-through text-muted-foreground text-sm">
                                      ₹{formatIndianCurrency(mrp, true)}
                                    </span>
                                    <span className="ml-2 text-destructive font-semibold">
                                      ₹{formatIndianCurrency(salePrice, true)}
                                    </span>
                                  </div>
                                ) : (
                                  `₹${formatIndianCurrency(displayPrice, true)}`
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
                                          handleDelete(product.id, product.name, variantCount);
                                        }}
                                      >
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {/* Variant Rows (shown when expanded) */}
                            {hasVariants && isExpanded && product.variants.map((variant) => {
                              const variantMrp = Number(variant.mrp || 0);
                              const variantSalePrice = variant.salePrice ? Number(variant.salePrice) : null;
                              const variantDisplayPrice = variantSalePrice || variantMrp;
                              const variantImageSrc = variant.image || product.image || '/images/product-placeholder.png';
                              const variantModelTypeLabel = variant.modelType ? 
                                variant.modelType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—';
                              const variantShelfName = variant.shelf?.name || variant.shelfId || '—';
                              // Build variant display name: priority is size, then weight
                              let displayName = product.name;
                              if (variant.size) {
                                displayName = `${product.name} - ${variant.size}`;
                              } else if (variant.weight) {
                                displayName = `${product.name} - ${variant.weight}`;
                              }
                              
                              return (
                                <TableRow
                                  key={variant.id}
                                  className="cursor-pointer bg-muted/10"
                                  onClick={(event) => {
                                    if (
                                      event.target.closest &&
                                      event.target.closest('[data-row-action="true"]')
                                    ) {
                                      return;
                                    }
                                    openProductDetail(variant);
                                  }}
                                >
                                  <TableCell>
                                    <div className="pl-8">
                                      <div className="w-12 h-12 relative rounded overflow-hidden bg-muted">
                                        <Image
                                          src={variantImageSrc}
                                          alt={displayName}
                                          fill
                                          className="object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm text-muted-foreground">
                                    {variant.sku || '—'}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {displayName}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{categoryName}</Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground font-mono text-sm">
                                    {variant.barcode}
                                  </TableCell>
                                  <TableCell>
                                    {variantModelTypeLabel !== '—' && (
                                      <Badge variant="secondary">{variantModelTypeLabel}</Badge>
                                    )}
                                    {variantModelTypeLabel === '—' && '—'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        (variant.quantity || 0) < 10
                                          ? 'destructive'
                                          : 'default'
                                      }
                                    >
                                      {variant.quantity || 0}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {variantSalePrice ? (
                                      <div>
                                        <span className="line-through text-muted-foreground text-sm">
                                          ₹{formatIndianCurrency(variantMrp, true)}
                                        </span>
                                        <span className="ml-2 text-destructive font-semibold">
                                          ₹{formatIndianCurrency(variantSalePrice, true)}
                                        </span>
                                      </div>
                                    ) : (
                                      `₹${formatIndianCurrency(variantDisplayPrice, true)}`
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono">
                                    {variantShelfName}
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
                                              handleEdit(variant);
                                            }}
                                          >
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Check if this is the last variant
                                              const isLastVariant = product.variants.length === 1;
                                              const confirmMessage = isLastVariant
                                                ? `Are you sure you want to delete this variant? This is the last variant, so the parent product will also be deleted. This action cannot be undone.`
                                                : `Are you sure you want to delete this variant? This action cannot be undone.`;
                                              
                                              if (confirm(confirmMessage)) {
                                                handleDeleteVariant(variant.id, isLastVariant);
                                              }
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
                            })}
                          </>
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
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {endIndex} of {paginationMeta.total} products
                    {storeFilter !== 'all' && (
                      <span className="ml-2">
                        (Store: {stores.find((s) => s.id === storeFilter)?.name || 'Unknown'})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="itemsPerPage" className="text-sm text-muted-foreground">
                      Rows per page:
                    </Label>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Tip: Click a product row for details and barcode label.
                  {storeFilter !== 'all' && ' Quantities shown are store-specific.'}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        />
                      </PaginationItem>
                      
                      {/* Page Numbers */}
                      {(() => {
                        const pages = [];
                        const showEllipsis = totalPages > 7;
                        
                        if (!showEllipsis) {
                          // Show all pages if 7 or fewer
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(
                              <PaginationItem key={i}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(i)}
                                  isActive={currentPage === i}
                                >
                                  {i}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        } else {
                          // Always show first page
                          pages.push(
                            <PaginationItem key={1}>
                              <PaginationLink
                                onClick={() => setCurrentPage(1)}
                                isActive={currentPage === 1}
                              >
                                1
                              </PaginationLink>
                            </PaginationItem>
                          );
                          
                          // Show ellipsis if current page is far from start
                          if (currentPage > 3) {
                            pages.push(
                              <PaginationItem key="ellipsis-start">
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          
                          // Show pages around current
                          const start = Math.max(2, currentPage - 1);
                          const end = Math.min(totalPages - 1, currentPage + 1);
                          
                          for (let i = start; i <= end; i++) {
                            if (i !== 1 && i !== totalPages) {
                              pages.push(
                                <PaginationItem key={i}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(i)}
                                    isActive={currentPage === i}
                                  >
                                    {i}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                          }
                          
                          // Show ellipsis if current page is far from end
                          if (currentPage < totalPages - 2) {
                            pages.push(
                              <PaginationItem key="ellipsis-end">
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          
                          // Always show last page
                          pages.push(
                            <PaginationItem key={totalPages}>
                              <PaginationLink
                                onClick={() => setCurrentPage(totalPages)}
                                isActive={currentPage === totalPages}
                              >
                                {totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        
                        return pages;
                      })()}
                      
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct?.parentProductId ? 'Edit Variant' : editingProduct?.variants?.length > 0 ? 'Edit Product (Parent)' : 'Edit Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct?.parentProductId 
                ? 'Update variant-specific details (size, model, price, stock). Name and category are inherited from parent.'
                : editingProduct?.variants?.length > 0
                ? 'Update shared product details. Changes to name/category will apply to all variants.'
                : 'Update the product details below.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            {!editingProduct?.parentProductId && (
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
                {editingProduct?.variants?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Changing name will update all variants
                  </p>
                )}
              </div>
            )}

            {/* 3-Column Layout for Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Basic Information */}
              <div className="space-y-4 min-w-0">
                {!editingProduct?.parentProductId && (
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
                    {editingProduct?.variants?.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Changing category will update all variants
                      </p>
                    )}
                  </div>
                )}

                {!editingProduct?.parentProductId && (
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
                )}
                
                {/* Size field - only for variants */}
                {editingProduct?.parentProductId && (
                  <div className="space-y-2">
                    <Label htmlFor="size">Size</Label>
                    <Input
                      id="size"
                      value={formData.size || ''}
                      onChange={(e) => handleFormChange('size', e.target.value)}
                      placeholder="e.g., Small, Large, 500g"
                    />
                  </div>
                )}

                {/* Barcode - only for variants and single products, not for parent products */}
                {editingProduct?.parentProductId || !editingProduct?.variants?.length ? (
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
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value="—"
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Parent products don't have barcodes. Each variant has its own barcode.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="shelfId">Shelf Location (Optional)</Label>
                  <Select
                    value={formData.shelfId || 'none'}
                    onValueChange={(value) => handleFormChange('shelfId', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shelf location" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingEditShelves ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading shelves...</div>
                      ) : (
                        <>
                          <SelectItem value="none" className="text-muted-foreground italic">
                            None (Clear selection)
                          </SelectItem>
                          {editShelves.length > 0 && (
                            editShelves.map((shelf) => (
                              <SelectItem key={shelf.id} value={shelf.id}>
                                {shelf.name}
                              </SelectItem>
                            ))
                          )}
                          {editShelves.length === 0 && !loadingEditShelves && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No shelves available. Create shelves first.</div>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Column 2: Pricing & Stock - Hidden for parent products */}
              {!editingProduct?.variants?.length && (
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
              )}
              {/* For parent products, show message instead of pricing fields */}
              {editingProduct?.variants?.length > 0 && (
                <div className="space-y-4 min-w-0">
                  <div className="space-y-2 p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      Parent products don't have pricing or quantity. Each variant has its own pricing and stock.
                    </p>
                  </div>
                </div>
              )}

              {/* Column 3: Product Attributes */}
              <div className="space-y-4 min-w-0">
                {/* Model Type - for variants or standalone products */}
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
                  {editingProduct?.parentProductId && (
                    <p className="text-xs text-muted-foreground">
                      Variant-specific model type
                    </p>
                  )}
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

            {/* Image Upload - Featured Image for parent products, Product Image for variants/single */}
            {!editingProduct?.parentProductId && (
              <ImageUpload
                value={formData.image}
                onChange={(value) => handleFormChange('image', value)}
                label={editingProduct?.variants?.length > 0 ? "Featured Image" : "Product Image"}
                token={user?.token}
              />
            )}
            {/* Variants can have their own images, but we'll handle that in variant edit modal */}
            {editingProduct?.parentProductId && (
              <ImageUpload
                value={formData.image}
                onChange={(value) => handleFormChange('image', value)}
                label="Product Image"
                token={user?.token}
              />
            )}

            {/* Website Settings — only for parent products */}
            {!editingProduct?.parentProductId && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Website Settings</span>
                  </div>
                  <Switch
                    id="edit-showOnWebsite"
                    checked={formData.showOnWebsite}
                    onCheckedChange={(checked) => handleFormChange('showOnWebsite', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Show this product on the public website
                </p>
                {formData.showOnWebsite && (
                  <div className="space-y-4 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-normal">Hide price</p>
                        <p className="text-xs text-muted-foreground">Visitors see "Enquire Now" instead of the price</p>
                      </div>
                      <Switch
                        id="edit-hidePrice"
                        checked={formData.hidePrice}
                        onCheckedChange={(checked) => handleFormChange('hidePrice', checked)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-websiteSlug">URL Slug (Optional)</Label>
                      <Input
                        id="edit-websiteSlug"
                        placeholder="e.g. organic-whole-milk-1gal"
                        value={formData.websiteSlug}
                        onChange={(e) =>
                          handleFormChange('websiteSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
                        }
                        maxLength={255}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used in the website URL: /products/<strong>{formData.websiteSlug || 'your-slug'}</strong>
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label>Additional Website Images (Optional)</Label>
                      {formData.websiteImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <ImageUpload
                            value={img}
                            onChange={(url) => {
                              const updated = [...formData.websiteImages];
                              updated[idx] = url;
                              handleFormChange('websiteImages', updated);
                            }}
                            label={`Website Image ${idx + 1}`}
                            token={user?.token}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 right-0 text-destructive hover:text-destructive"
                            onClick={() =>
                              handleFormChange('websiteImages', formData.websiteImages.filter((_, i) => i !== idx))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {formData.websiteImages.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleFormChange('websiteImages', [...formData.websiteImages, ''])}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Image
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Variants Section - Always show for parent products */}
            {editingProduct && !editingProduct.parentProductId && editingProduct?.variants?.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Product Variants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Open add variant dialog
                      setVariantFormData({ size: '', modelType: '', barcode: '', mrp: '', salePrice: '', quantity: '', image: '' });
                      setEditingVariant(null);
                      setIsVariantEditModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((editingVariants.length > 0 ? editingVariants : editingProduct.variants) || []).map((variant) => (
                        <TableRow key={variant.id}>
                          <TableCell>{variant.size || '—'}</TableCell>
                          <TableCell>{variant.modelType || '—'}</TableCell>
                          <TableCell className="font-mono text-sm">{variant.barcode}</TableCell>
                          <TableCell>
                            ₹{formatIndianCurrency(Number(variant.salePrice || variant.price || variant.mrp || 0), true)}
                          </TableCell>
                          <TableCell>{variant.quantity || 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingVariant(variant);
                                  setVariantFormData({
                                    size: variant.size || '',
                                    modelType: variant.modelType || '',
                                    barcode: variant.barcode || '',
                                    mrp: variant.mrp?.toString() || '',
                                    salePrice: variant.salePrice?.toString() || '',
                                    quantity: variant.quantity?.toString() || '',
                                    image: variant.image || '',
                                  });
                                  setIsVariantEditModalOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  if (confirm('Are you sure you want to remove this variant?')) {
                                    try {
                                      const response = await productsAPI.deleteVariant(variant.id, user?.token);
                                      if (response.success) {
                                        toast.success('Variant removed successfully');
                                        setEditingVariants(editingVariants.filter(v => v.id !== variant.id));
                                        qc.invalidateQueries({ queryKey: ['products'] });
                                      } else {
                                        toast.error(response.message || 'Failed to remove variant');
                                      }
                                    } catch (error) {
                                      logger.error('Error removing variant:', error);
                                      toast.error('Failed to remove variant');
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {((editingVariants.length === 0 && (!editingProduct.variants || editingProduct.variants.length === 0))) && (
                  <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                    No variants added yet. Click "Add Variant" above to add size/weight variations.
                  </div>
                )}
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

      {/* Variant Edit/Add Modal */}
      <Dialog open={isVariantEditModalOpen} onOpenChange={setIsVariantEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
            <DialogDescription>
              {editingVariant 
                ? 'Update variant details (size, model, price, stock)'
                : 'Add a new variant to this product'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editingProduct || !user?.token) return;
            
            try {
              const payload = {
                size: variantFormData.size || null,
                modelType: variantFormData.modelType || null,
                barcode: variantFormData.barcode,
                mrp: variantFormData.mrp ? Number(variantFormData.mrp) : null,
                salePrice: variantFormData.salePrice ? Number(variantFormData.salePrice) : null,
                quantity: variantFormData.quantity ? Number(variantFormData.quantity) : 0,
                image: variantFormData.image || null,
              };

              let response;
              if (editingVariant) {
                // Update existing variant
                response = await productsAPI.update(editingVariant.id, payload, user.token);
              } else {
                // Add new variant
                response = await productsAPI.addVariant(editingProduct.id, payload, user.token);
              }

              if (response.success) {
                toast.success(editingVariant ? 'Variant updated successfully' : 'Variant added successfully');
                setIsVariantEditModalOpen(false);
                // Refresh variants list
                const productResponse = await productsAPI.getWithVariants(editingProduct.id, user.token);
                if (productResponse.success) {
                  setEditingVariants(productResponse.data.variants || []);
                  setEditingProduct(productResponse.data);
                }
                qc.invalidateQueries({ queryKey: ['products'] });
              } else {
                toast.error(response.message || 'Failed to save variant');
              }
            } catch (error) {
              logger.error('Error saving variant:', error);
              toast.error('Failed to save variant');
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="variant-size">Size *</Label>
              <Input
                id="variant-size"
                value={variantFormData.size}
                onChange={(e) => setVariantFormData(prev => ({ ...prev, size: e.target.value }))}
                placeholder="e.g., Small, Large, 500g, 1kg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variant-modelType">Model Type</Label>
              <Select
                value={variantFormData.modelType}
                onValueChange={(value) => setVariantFormData(prev => ({ ...prev, modelType: value }))}
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
              <Label htmlFor="variant-barcode">Barcode *</Label>
              <div className="flex gap-2">
                <Input
                  id="variant-barcode"
                  value={variantFormData.barcode}
                  onChange={(e) => setVariantFormData(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Unique barcode for this variant"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateVariantBarcode}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-mrp">MRP</Label>
                <Input
                  id="variant-mrp"
                  type="number"
                  step="0.01"
                  value={variantFormData.mrp}
                  onChange={(e) => setVariantFormData(prev => ({ ...prev, mrp: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-salePrice">Sale Price</Label>
                <Input
                  id="variant-salePrice"
                  type="number"
                  step="0.01"
                  value={variantFormData.salePrice}
                  onChange={(e) => setVariantFormData(prev => ({ ...prev, salePrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variant-quantity">Stock Quantity</Label>
              <Input
                id="variant-quantity"
                type="number"
                value={variantFormData.quantity}
                onChange={(e) => setVariantFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="0"
              />
            </div>

            {/* Variant Image Upload */}
            <div className="space-y-2">
              <Label>Variant Image (Optional)</Label>
              <ImageUpload
                value={variantFormData.image}
                onChange={(value) => setVariantFormData(prev => ({ ...prev, image: value }))}
                label="Upload variant image"
                token={user?.token}
              />
            </div>

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVariantEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingVariant ? 'Update Variant' : 'Add Variant'}
              </Button>
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
                {/* Show attributes - always show Size if it exists, others only if they have values */}
                {(selectedProduct.modelType || selectedProduct.size || selectedProduct.weight || selectedProduct.packType) && (
                  <>
                    <Separator />
                    {selectedProduct.modelType && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model Type</span>
                        <span className="font-medium">
                          {selectedProduct.modelType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size</span>
                      <span className="font-medium">{selectedProduct.size || '—'}</span>
                    </div>
                    {selectedProduct.weight && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weight</span>
                        <span className="font-medium">{selectedProduct.weight}</span>
                      </div>
                    )}
                    {selectedProduct.packType && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pack Type</span>
                        <span className="font-medium">
                          {selectedProduct.packType.charAt(0) + selectedProduct.packType.slice(1).toLowerCase()}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {/* Show Size even if no other attributes */}
                {!(selectedProduct.modelType || selectedProduct.size || selectedProduct.weight || selectedProduct.packType) && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size</span>
                      <span className="font-medium">{selectedProduct.size || '—'}</span>
                    </div>
                  </>
                )}
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
                            // Build product name with size/weight for variants
                            let productName = selectedProduct.name || 'PRODUCT';
                            
                            // If it's a variant (has parentProductId or size/weight), append size or weight to name
                            if (selectedProduct.parentProductId || selectedProduct.size || selectedProduct.weight) {
                              const nameParts = [productName];
                              
                              // Add size if available
                              if (selectedProduct.size) {
                                nameParts.push(selectedProduct.size);
                              }
                              
                              // Add weight if available
                              if (selectedProduct.weight) {
                                nameParts.push(selectedProduct.weight);
                              }
                              
                              productName = nameParts.join(' - ');
                            }
                            
                            const shelfName = selectedProduct.shelf?.name || selectedProduct.shelfId || '';
                            const cleanedShelfName = cleanShelfName(shelfName);
                            return cleanedShelfName 
                              ? `${productName} - ${cleanedShelfName}`
                              : productName;
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
                                return code === 'BRA' ? 'SP' : (code || 'SP');
                              })()}:
                            </span>
                            <span className="font-bold text-sm">
                              ₹{formatIndianCurrency(Number(selectedProduct.salePrice || selectedProduct.price || selectedProduct.mrp || 0), true)}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-[8px]">MRP:</span>
                            <span className="font-bold text-[10px]">
                              ₹{formatIndianCurrency(Number(selectedProduct.mrp || 0), true)}
                            </span>
                          </div>
                          <div className="text-[7px] text-gray-600 font-medium">(Incl of All Taxes)</div>
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
                      ₹{formatIndianCurrency(Number(selectedProduct.mrp || 0), true)}
                    </span>
                  </div>
                  {selectedProduct.salePrice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sale Price</span>
                      <span className="font-medium text-destructive">
                        ₹{formatIndianCurrency(Number(selectedProduct.salePrice), true)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Price</span>
                    <span className="font-medium">
                      ₹{formatIndianCurrency(Number(selectedProduct.price || 0), true)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground font-semibold">Total Value</span>
                    <span className="font-bold">
                      ₹
                      {(
                        Number(selectedProduct.price || 0) *
                        Number(selectedProduct.quantity || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              </div>

              {/* Product Attributes Section - Commented out, using variants instead */}
              {/* {selectedProduct.id && (
                <div className="border-t pt-4">
                  <ProductAttributes
                    productId={selectedProduct.id}
                    token={user?.token}
                    readonly={false}
                  />
                </div>
              )} */}
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
                        // Build product name with size/weight for variants
                        let productName = previewProduct.name || 'PRODUCT';
                        
                        // If it's a variant (has parentProductId or size/weight), append size or weight to name
                        if (previewProduct.parentProductId || previewProduct.size || previewProduct.weight) {
                          const nameParts = [productName];
                          
                          // Add size if available
                          if (previewProduct.size) {
                            nameParts.push(previewProduct.size);
                          }
                          
                          // Add weight if available
                          if (previewProduct.weight) {
                            nameParts.push(previewProduct.weight);
                          }
                          
                          productName = nameParts.join(' - ');
                        }
                        
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
