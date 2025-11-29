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
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ImageUpload from '@/components/image-upload';
import { Separator } from '@/components/ui/separator';
import Loader from '@/components/ui/loader';
import { useAuth } from '@/lib/auth-context';
import { useCommon } from '@/lib/common-context';
import { productsAPI } from '@/lib/api';
import logger from '@/lib/logger';
import { productSchema, formatZodError, getFieldErrors } from '@/lib/validations';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shelfFilter, setShelfFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [products, setProducts] = useState([]);
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
    quantity: '',
    price: '',
    shelfId: '',
    description: '',
    image: '',
  });
  const [editSubcategories, setEditSubcategories] = useState([]);
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

  const fetchProducts = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const response = await productsAPI.getAll(user.token, { limit: 100 });
      if (response.success) {
        setProducts(response.data || []);
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

  useEffect(() => {
    if (user?.token) {
      fetchProducts();
    }
  }, [user?.token]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm);
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
  }, [products, searchTerm, categoryFilter, shelfFilter, stockFilter]);

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

  const handlePrintProduct = (product) => {
    if (typeof window === 'undefined' || !product || !product.barcode) {
      toast.error('No barcode available to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print barcode labels');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Label - ${product.barcode}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @media print {
              @page {
                margin: 0.5in;
                size: auto;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .barcode-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            #barcode-svg {
              margin: 0 auto;
              display: block;
            }
            .barcode-number {
              margin-top: 10px;
              font-size: 18px;
              font-weight: 600;
              letter-spacing: 0.15em;
              font-family: 'Courier New', monospace;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <svg id="barcode-svg"></svg>
            <div class="barcode-number">${product.barcode}</div>
          </div>
          <script>
            try {
              JsBarcode("#barcode-svg", "${product.barcode}", {
                format: "CODE128",
                width: 2,
                height: 100,
                displayValue: false,
                margin: 10,
                background: "#ffffff",
                lineColor: "#000000"
              });
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 250);
              };
            } catch (error) {
              console.error('Barcode generation error:', error);
              document.body.innerHTML = '<p style="text-align:center;padding:20px;">Error generating barcode. Please try again.</p>';
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      categoryId: product.categoryId || '',
      subcategoryId: product.subcategoryId || '',
      barcode: product.barcode || '',
      quantity: product.quantity?.toString() || '',
      price: product.price?.toString() || '',
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
        quantity: formData.quantity ? Number(formData.quantity) : 0,
        price: formData.price ? Number(formData.price) : 0,
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
        quantity: validatedData.quantity,
        price: validatedData.price,
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Shelf Location</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => {
                        const categoryName = product.category?.name || '—';
                        const shelfName =
                          product.shelf?.name || product.shelfId || '—';
                        const productPrice = Number(product.price || 0);
                        const imageSrc =
                          product.image || '/images/product-placeholder.png';
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
                            <TableCell className="font-mono">
                              {shelfName}
                            </TableCell>
                            <TableCell className="font-medium">
                              ${productPrice.toFixed(2)}
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
                                      onClick={() => handleEdit(product)}
                                    >
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDelete(product.id)}
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
                          colSpan={8}
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
                </div>
                <div className="text-xs text-muted-foreground">
                  Tip: Click a product row for details and barcode label.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    required
                  />
                  {editErrors.quantity && (
                    <p className="text-sm text-destructive">{editErrors.quantity}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price/Value (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleFormChange('price', e.target.value)}
                    className={editErrors.price ? 'border-destructive' : ''}
                    required
                  />
                  {editErrors.price && (
                    <p className="text-sm text-destructive">{editErrors.price}</p>
                  )}
                </div>
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View product information and a barcode label ready for scanning.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid grid-cols-1 md:grid-cols-[2fr,1.5fr] gap-6 mt-2">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{selectedProduct.name}</span>
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shelf</span>
                  <span className="font-medium">
                    {selectedProduct.shelf?.name ||
                      selectedProduct.shelfId ||
                      '—'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">
                    {selectedProduct.quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Price</span>
                  <span className="font-medium">
                    ${Number(selectedProduct.price || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-bold">
                    $
                    {(
                      Number(selectedProduct.price || 0) *
                      Number(selectedProduct.quantity || 0)
                    ).toFixed(2)}
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

              <div className="flex flex-col items-center justify-between gap-4 border rounded-lg p-4">
                <div className="w-full text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    Barcode Number
                  </p>
                  <p className="font-mono text-lg tracking-[0.2em] font-semibold">
                    {selectedProduct.barcode || '—'}
                  </p>
                </div>
                <div className="w-full flex-1 flex items-center justify-center bg-white p-4 rounded-md border">
                  {selectedProduct.barcode ? (
                    <div className="flex flex-col items-center gap-2">
                      <Barcode
                        value={selectedProduct.barcode}
                        format="CODE128"
                        width={2}
                        height={80}
                        displayValue={true}
                        fontSize={14}
                        margin={10}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Scan this barcode with your scanner
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      No barcode available for this product
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handlePrintProduct(selectedProduct)}
                  disabled={!selectedProduct.barcode}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Barcode Label
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
