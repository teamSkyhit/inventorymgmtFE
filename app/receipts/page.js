'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import AdminLayout from '@/components/admin-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Printer, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { salesAPI } from '@/lib/api';
import logger from '@/lib/logger';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Loader from '@/components/ui/loader';

function ReceiptsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);

  const fetchSales = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const response = await salesAPI.getAll(user.token);
      if (response.success) {
        setSales(response.data || []);
      } else {
        toast.error(response.message || 'Failed to load receipts');
      }
    } catch (error) {
      logger.error('Error fetching sales:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchSales();
    }
  }, [user?.token]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lastReceipt');
      if (stored) {
        try {
          setLastReceipt(JSON.parse(stored));
        } catch {
          setLastReceipt(null);
        }
      }
    }
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch =
        sale.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.product?.barcode?.includes(searchTerm) ||
        sale.id.includes(searchTerm);

      const matchesDate =
        !dateFilter ||
        new Date(sale.saleDate).toISOString().slice(0, 10) === dateFilter;

      return matchesSearch && matchesDate;
    });
  }, [sales, searchTerm, dateFilter]);

  const handlePrint = (sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const productName = sale.product?.name || 'Product';
    const total = (Number(sale.product?.price || 0) * sale.quantitySold).toFixed(
      2
    );
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${sale.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>Receipt ${sale.id}</h1>
          <p><strong>Date:</strong> ${new Date(sale.saleDate).toLocaleString()}</p>
          <p><strong>Product:</strong> ${productName}</p>
          <p><strong>Quantity:</strong> ${sale.quantitySold}</p>
          <p><strong>Total:</strong> $${total}</p>
          <p><strong>Processed By:</strong> ${
            sale.createdBy?.name || sale.createdBy?.email || 'System'
          }</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader message="Gathering your receipt history..." />
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
              <h1 className="text-3xl font-bold">Receipts & Sales</h1>
              <p className="text-muted-foreground">
                Review sales history and print receipts
              </p>
            </div>
            <Button variant="outline" onClick={fetchSales}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {lastReceipt && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Last Receipt</CardTitle>
                <CardDescription>
                  Most recent checkout summary
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>ID:</strong> {lastReceipt.id}
                </p>
                <p>
                  <strong>Customer:</strong> {lastReceipt.customerName}
                </p>
                <p>
                  <strong>Total:</strong> ${lastReceipt.total.toFixed(2)}
                </p>
                <p>
                  <strong>Payment Method:</strong>{' '}
                  {lastReceipt.paymentMethod.toUpperCase()}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Quickly find receipts by product, barcode, or date</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Product, barcode, or receipt ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing <span className="font-medium">{filteredSales.length}</span> receipts
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Processed By</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length ? (
                      filteredSales.map((sale) => {
                        const total =
                          Number(sale.product?.price || 0) *
                          sale.quantitySold;
                        const isHighlighted =
                          highlightId &&
                          lastReceipt?.id === highlightId &&
                          lastReceipt.sales?.some(
                            (entry) => entry.id === sale.id
                          );
                        return (
                          <TableRow
                            key={sale.id}
                            className={isHighlighted ? 'bg-primary/10' : ''}
                          >
                            <TableCell className="font-mono">
                              {sale.id}
                            </TableCell>
                            <TableCell>
                              {new Date(sale.saleDate).toLocaleString()}
                            </TableCell>
                            <TableCell>{sale.product?.name || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {sale.quantitySold}
                              </Badge>
                            </TableCell>
                            <TableCell>${total.toFixed(2)}</TableCell>
                            <TableCell>
                              {sale.createdBy?.name ||
                                sale.createdBy?.email ||
                                'System'}
                            </TableCell>
                            <TableCell className="space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSale(sale)}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrint(sale)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          No receipts found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Receipt Details</DialogTitle>
              <DialogDescription>
                Review transaction information
              </DialogDescription>
            </DialogHeader>

            {selectedSale && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt ID</span>
                  <span className="font-mono">{selectedSale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(selectedSale.saleDate).toLocaleString()}</span>
                </div>
                <Separator />
                <div>
                  <p className="font-medium">
                    {selectedSale.product?.name || 'Product'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Barcode: {selectedSale.product?.barcode || '—'}
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span>{selectedSale.quantitySold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Price</span>
                  <span>${Number(selectedSale.product?.price || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>
                    $
                    {(
                      Number(selectedSale.product?.price || 0) *
                      selectedSale.quantitySold
                    ).toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processed By</span>
                  <span>
                    {selectedSale.createdBy?.name ||
                      selectedSale.createdBy?.email ||
                      'System'}
                  </span>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handlePrint(selectedSale)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </ProtectedRoute>
  );
}

export default function ReceiptsPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout>
            <div className="flex items-center justify-center h-[60vh]">
              <Loader message="Loading receipts..." />
            </div>
          </AdminLayout>
        </ProtectedRoute>
      }
    >
      <ReceiptsContent />
    </Suspense>
  );
}

