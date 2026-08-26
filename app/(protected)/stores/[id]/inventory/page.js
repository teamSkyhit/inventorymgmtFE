'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, ArrowLeft, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { storesAPI, productsAPI, storeInventoryAPI } from '@/lib/api';
import Loader from '@/components/ui/loader';
import Link from 'next/link';

export default function StoreInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    minStockLevel: '',
  });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: store } = useQuery({
    queryKey: ['stores', storeId],
    queryFn: async () => {
      const response = await storesAPI.getById(storeId, user.token);
      if (!response.success) { router.push('/stores'); return null; }
      return response.data;
    },
    enabled: !!user?.token && !!storeId,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 1000 }],
    queryFn: async () => {
      const response = await productsAPI.getAll(user.token, { limit: 1000 });
      if (!response.success) throw new Error('Failed to load products');
      return response.data;
    },
    enabled: !!user?.token,
    staleTime: 2 * 60 * 1000,
  });
  const products = productsData?.products || productsData || [];

  const { data: storeInventory = [], isLoading: loading } = useQuery({
    queryKey: ['store-inventory', storeId],
    queryFn: async () => {
      const response = await storeInventoryAPI.getStoreInventory(storeId, user.token);
      if (!response.success) throw new Error(response.message || 'Failed to fetch store inventory');
      return response.data || [];
    },
    enabled: !!user?.token && !!storeId,
  });

  const handleOpenModal = (inventoryItem = null) => {
    if (inventoryItem) {
      setSelectedProduct(inventoryItem);
      setFormData({
        productId: inventoryItem.productId,
        quantity: inventoryItem.quantity.toString(),
        minStockLevel: inventoryItem.minStockLevel?.toString() || '',
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        productId: '',
        quantity: '',
        minStockLevel: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setFormData({
      productId: '',
      quantity: '',
      minStockLevel: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.token || !storeId) return;

    try {
      const payload = {
        quantity: parseInt(formData.quantity) || 0,
        minStockLevel: formData.minStockLevel ? parseInt(formData.minStockLevel) : undefined,
      };

      const response = await storeInventoryAPI.updateStoreInventory(
        storeId,
        formData.productId,
        payload,
        user.token
      );

      if (response.success) {
        toast.success(
          selectedProduct
            ? 'Store inventory updated successfully'
            : 'Product added to store successfully'
        );
        handleCloseModal();
        qc.invalidateQueries({ queryKey: ['store-inventory', storeId] });
      } else {
        toast.error(response.message || 'Failed to update store inventory');
      }
    } catch (error) {
      console.error('Error updating store inventory:', error);
      toast.error('Failed to update store inventory');
    }
  };

  const unassignedProducts = useMemo(() => {
    const assignedProductIds = new Set(storeInventory.map((inv) => inv.productId));
    return products.filter((product) => !assignedProductIds.has(product.id));
  }, [products, storeInventory]);

  const filteredInventory = useMemo(() => {
    return storeInventory.filter((inv) => {
      const product = inv.product;
      if (!product) return false;
      const matchesSearch =
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm);
      return matchesSearch;
    });
  }, [storeInventory, searchTerm]);

  if (loading && !store) {
    return (
      <ProtectedRoute>
        <Loader />
      </ProtectedRoute>
    );
  }

  if (!store) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/stores">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{store.name} - Inventory</h1>
              <p className="text-muted-foreground">Manage products and stock for this store</p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="gap-2"
            title="Add a new product to this store"
          >
            <Plus className="h-4 w-4" />
            Add Product to Store
            {unassignedProducts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unassignedProducts.length} available
              </Badge>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Store Inventory</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {searchTerm
                    ? 'No products found matching your search.'
                    : 'No products assigned to this store yet. Add products to get started.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock Quantity</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Min Stock Level</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((inv) => {
                    const available = inv.quantity - inv.reservedQty;
                    const isLowStock =
                      inv.minStockLevel !== null
                        ? inv.quantity < inv.minStockLevel
                        : inv.product?.category?.minStockLevel
                        ? inv.quantity < inv.product.category.minStockLevel
                        : false;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.product?.name || '-'}
                        </TableCell>
                        <TableCell>{inv.product?.sku || '-'}</TableCell>
                        <TableCell>{inv.product?.category?.name || '-'}</TableCell>
                        <TableCell>
                          <span className={isLowStock ? 'text-orange-600 font-medium' : ''}>
                            {inv.quantity}
                          </span>
                          {isLowStock && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Low Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={available > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {available}
                          </span>
                          {inv.reservedQty > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({inv.reservedQty} reserved)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {inv.minStockLevel !== null
                            ? inv.minStockLevel
                            : inv.product?.category?.minStockLevel || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(inv)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedProduct ? 'Update Store Inventory' : 'Add Product to Store'}
              </DialogTitle>
              <DialogDescription>
                {selectedProduct
                  ? 'Update the stock quantity and minimum stock level for this product in the store.'
                  : 'Select a product and set its initial stock quantity for this store.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productId">
                  Product <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, productId: value }))
                  }
                  required
                  disabled={!!selectedProduct}
                >
                  <SelectTrigger id="productId">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedProduct ? products : unassignedProducts).length > 0 ? (
                      (selectedProduct ? products : unassignedProducts).map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku || product.barcode})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        All products are already assigned to this store.
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {!selectedProduct && unassignedProducts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    All products are already assigned to this store. You can update existing inventory using the Edit button.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Stock Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                  required
                  placeholder="Enter initial stock quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Minimum Stock Level (Optional)</Label>
                <Input
                  id="minStockLevel"
                  name="minStockLevel"
                  type="number"
                  min="0"
                  value={formData.minStockLevel}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, minStockLevel: e.target.value }))
                  }
                  placeholder="Override category default"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use category default: {selectedProduct?.product?.category?.minStockLevel || 'N/A'}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedProduct ? 'Update' : 'Add'} Inventory
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
