'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, CheckCircle, XCircle, Truck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { stockTransfersAPI, productsAPI, storeInventoryAPI } from '@/lib/api';
import { useStores } from '@/lib/hooks/useStores';
import Loader from '@/components/ui/loader';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function StockTransfersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fromStoreId: '',
    toStoreId: '',
    productId: '',
    quantity: '',
    notes: '',
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: stores = [] } = useStores();

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['products', 'transfer-list'],
    queryFn: async () => {
      const response = await productsAPI.getAll(user.token, { limit: 1000 });
      if (!response.success) throw new Error('Failed to load products');
      return response.data?.products || response.data || [];
    },
    enabled: false,
    staleTime: Infinity,
  });

  const { data: transfers = [], isLoading: loading } = useQuery({
    queryKey: ['transfers', { statusFilter, storeFilter }],
    queryFn: async () => {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (storeFilter !== 'all') params.storeId = storeFilter;
      const response = await stockTransfersAPI.getAll(user.token, params);
      if (!response.success) throw new Error(response.message || 'Failed to fetch stock transfers');
      return response.data || [];
    },
    enabled: !!user?.token,
  });

  const { data: productInventory = [] } = useQuery({
    queryKey: ['product-inventory', formData.productId],
    queryFn: async () => {
      const response = await storeInventoryAPI.getProductInventoryAcrossStores(formData.productId, user.token);
      if (!response.success) throw new Error('Failed to load inventory');
      return response.data || [];
    },
    enabled: !!user?.token && !!formData.productId,
  });

  const handleOpenModal = () => {
    refetchProducts();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      fromStoreId: '',
      toStoreId: '',
      productId: '',
      quantity: '',
      notes: '',
    });
  };

  // Handle product selection change
  const handleProductChange = (productId) => {
    setFormData((prev) => ({
      ...prev,
      productId,
      fromStoreId: '',
      quantity: '',
    }));
  };

  // Get available stock for a store (quantity - reservedQty)
  const getAvailableStock = (storeId) => {
    const inventory = productInventory.find((inv) => inv.storeId === storeId);
    if (!inventory) return 0;
    return Math.max(0, inventory.quantity - inventory.reservedQty);
  };

  // Get total stock for a store
  const getTotalStock = (storeId) => {
    const inventory = productInventory.find((inv) => inv.storeId === storeId);
    return inventory ? inventory.quantity : 0;
  };

  // Find store with maximum available stock
  const getStoreWithMaxStock = () => {
    if (productInventory.length === 0) return null;
    return productInventory.reduce((max, inv) => {
      const available = inv.quantity - inv.reservedQty;
      const maxAvailable = max.quantity - max.reservedQty;
      return available > maxAvailable ? inv : max;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.token) return;

    if (formData.fromStoreId === formData.toStoreId) {
      toast.error('Source and destination stores must be different');
      return;
    }

    const qty = parseInt(formData.quantity);
    if (!qty || qty < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    if (formData.productId && formData.fromStoreId) {
      const availableStock = getAvailableStock(formData.fromStoreId);
      if (qty > availableStock) {
        toast.error(`Cannot transfer ${qty} units. Only ${availableStock} available in source store.`);
        return;
      }
    }

    try {
      const payload = {
        fromStoreId: formData.fromStoreId,
        toStoreId: formData.toStoreId,
        productId: formData.productId,
        quantity: qty,
        notes: formData.notes?.trim() || undefined,
      };

      const response = await stockTransfersAPI.request(payload, user.token);
      if (response.success) {
        toast.success('Stock transfer requested successfully');
        handleCloseModal();
        qc.invalidateQueries({ queryKey: ['transfers'] });
      } else {
        toast.error(response.message || 'Failed to request stock transfer');
      }
    } catch (error) {
      console.error('Error requesting stock transfer:', error);
      toast.error('Failed to request stock transfer');
    }
  };

  const handleAction = async (transfer, action) => {
    if (!user?.token) return;

    const actionMessages = {
      approve: 'approve',
      ship: 'ship',
      receive: 'receive',
      cancel: 'cancel',
    };

    const confirmMessage = {
      approve: `Are you sure you want to approve this transfer?`,
      ship: `Are you sure you want to ship this transfer? This will deduct stock from the source store.`,
      receive: `Are you sure you want to receive this transfer? This will add stock to the destination store.`,
      cancel: `Are you sure you want to cancel this transfer?`,
    };

    if (!confirm(confirmMessage[action])) {
      return;
    }

    try {
      let response;
      switch (action) {
        case 'approve':
          response = await stockTransfersAPI.approve(transfer.id, user.token);
          break;
        case 'ship':
          response = await stockTransfersAPI.ship(transfer.id, user.token);
          break;
        case 'receive':
          response = await stockTransfersAPI.receive(transfer.id, user.token);
          break;
        case 'cancel':
          response = await stockTransfersAPI.cancel(transfer.id, user.token);
          break;
        default:
          return;
      }

      if (response.success) {
        toast.success(`Transfer ${actionMessages[action]}ed successfully`);
        qc.invalidateQueries({ queryKey: ['transfers'] });
      } else {
        toast.error(response.message || `Failed to ${action} transfer`);
      }
    } catch (error) {
      console.error(`Error ${action}ing transfer:`, error);
      toast.error(`Failed to ${action} transfer`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getStatusBadge = (status) => {
    const colors = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return <Badge className={colors}>{status.replace('_', ' ')}</Badge>;
  };

  const canApprove = (transfer) => transfer.status === 'PENDING' && user?.role === 'ADMIN';
  const canShip = (transfer) =>
    (transfer.status === 'PENDING' || transfer.status === 'IN_TRANSIT') &&
    transfer.status !== 'RECEIVED' &&
    transfer.status !== 'CANCELLED';
  const canReceive = (transfer) => transfer.status === 'IN_TRANSIT';
  const canCancel = (transfer) =>
    transfer.status === 'PENDING' || transfer.status === 'IN_TRANSIT';

  if (loading) {
    return (
      <ProtectedRoute>
          <Loader />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Stock Transfers</h1>
              <p className="text-muted-foreground">Manage stock transfers between stores</p>
            </div>
            <Button onClick={handleOpenModal} className="gap-2">
              <Plus className="h-4 w-4" />
              Request Transfer
            </Button>
          </div>

          <div className="flex gap-4">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="RECEIVED">Received</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Store</Label>
                  <Select value={storeFilter} onValueChange={setStoreFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
            </CardHeader>
            <CardContent>
              {transfers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stock transfers found. Request your first transfer to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>From Store</TableHead>
                      <TableHead>To Store</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-medium">{transfer.transferNumber}</TableCell>
                        <TableCell>
                          {transfer.product?.name || '-'}
                          {transfer.product?.sku && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({transfer.product.sku})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{transfer.fromStore?.name || '-'}</TableCell>
                        <TableCell>{transfer.toStore?.name || '-'}</TableCell>
                        <TableCell>{transfer.quantity}</TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        <TableCell>
                          {transfer.requestedAt
                            ? new Date(transfer.requestedAt).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canApprove(transfer) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction(transfer, 'approve')}
                                className="gap-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Approve
                              </Button>
                            )}
                            {canShip(transfer) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction(transfer, 'ship')}
                                className="gap-1"
                              >
                                <Truck className="h-3 w-3" />
                                Ship
                              </Button>
                            )}
                            {canReceive(transfer) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction(transfer, 'receive')}
                                className="gap-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Receive
                              </Button>
                            )}
                            {canCancel(transfer) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction(transfer, 'cancel')}
                                className="gap-1 text-destructive"
                              >
                                <XCircle className="h-3 w-3" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Request Transfer Modal */}
          <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Stock Transfer</DialogTitle>
                <DialogDescription>
                  Transfer stock from one store to another. The transfer will need to be approved
                  before shipping.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productId">
                    Product <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.productId}
                    onValueChange={handleProductChange}
                    required
                  >
                    <SelectTrigger id="productId">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku || product.barcode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.productId && productInventory.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded">
                      <div className="font-medium mb-1">Stock Availability Across Stores:</div>
                      {productInventory
                        .sort((a, b) => (b.quantity - b.reservedQty) - (a.quantity - a.reservedQty))
                        .map((inv) => {
                          const available = inv.quantity - inv.reservedQty;
                          const maxStock = getStoreWithMaxStock();
                          const isMax = maxStock && inv.storeId === maxStock.storeId;
                          return (
                            <div key={inv.storeId} className="flex justify-between items-center py-1">
                              <span>
                                {inv.store?.name || 'Unknown Store'}
                                {isMax && (
                                  <Badge variant="default" className="ml-2 text-xs">
                                    Max Stock
                                  </Badge>
                                )}
                              </span>
                              <span className={available > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                                {available} available ({inv.quantity} total)
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromStoreId">
                    From Store <span className="text-destructive">*</span>
                    {formData.productId && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Select store with stock)
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.fromStoreId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, fromStoreId: value }))
                    }
                    required
                    disabled={!formData.productId}
                  >
                    <SelectTrigger id="fromStoreId">
                      <SelectValue placeholder={formData.productId ? "Select source store" : "Select product first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => {
                        const availableStock = formData.productId ? getAvailableStock(store.id) : null;
                        const totalStock = formData.productId ? getTotalStock(store.id) : null;
                        const maxStock = getStoreWithMaxStock();
                        const isMax = maxStock && store.id === maxStock.storeId;
                        return (
                          <SelectItem key={store.id} value={store.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {store.name}
                                {isMax && formData.productId && (
                                  <Badge variant="default" className="ml-2 text-xs">
                                    Max
                                  </Badge>
                                )}
                              </span>
                              {formData.productId && availableStock !== null && (
                                <span className={`ml-2 text-xs ${availableStock > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                  {availableStock} avail ({totalStock} total)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formData.fromStoreId && formData.productId && (
                    <div className="text-xs text-muted-foreground">
                      Available stock: <span className="font-medium text-green-600">{getAvailableStock(formData.fromStoreId)}</span> units
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toStoreId">
                    To Store <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.toStoreId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, toStoreId: value }))
                    }
                    required
                    disabled={!formData.productId}
                  >
                    <SelectTrigger id="toStoreId">
                      <SelectValue placeholder={formData.productId ? "Select destination store" : "Select product first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {stores
                        .filter((store) => store.id !== formData.fromStoreId)
                        .map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantity <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Add any notes about this transfer..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button type="submit">Request Transfer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
    </ProtectedRoute>
  );
}

