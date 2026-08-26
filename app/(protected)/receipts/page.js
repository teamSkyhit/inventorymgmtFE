'use client';

import { Suspense, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import ProtectedRoute from '@/components/protected-route';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Printer, RefreshCw, Search, Share2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { salesAPI } from '@/lib/api';
import logger from '@/lib/logger';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Loader from '@/components/ui/loader';
import ReceiptComponent from '@/components/receipt/ReceiptComponent';
import SharingDialog from '@/components/receipt/SharingDialog';

const RECEIPTS_LIMIT = 100;

function ReceiptsContent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [page, setPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [receiptFormat, setReceiptFormat] = useState('thermal');
  const [isSharingDialogOpen, setIsSharingDialogOpen] = useState(false);
  const [fetchingReceipt, setFetchingReceipt] = useState(false);

  const salesParams = { page, limit: RECEIPTS_LIMIT };
  if (dateFilter) {
    salesParams.startDate = dateFilter;
    salesParams.endDate = dateFilter;
  }

  const {
    data: salesResponse,
    isLoading: loading,
  } = useQuery({
    queryKey: queryKeys.sales(salesParams),
    queryFn: async () => {
      const response = await salesAPI.getAll(user.token, salesParams);
      if (!response.success) throw new Error(response.message || 'Failed to load receipts');
      return response.data;
    },
    enabled: !!user?.token,
  });

  const salesList = salesResponse?.sales || salesResponse || [];
  const totalPages = salesResponse?.totalPages || 1;
  const totalReceipts = salesResponse?.total || 0;

  // Group sales by receipt number
  const receipts = useMemo(() => {
    const receiptMap = new Map();

    salesList.forEach((sale) => {
      const receiptNumber = sale.saleNumber || 'UNKNOWN';
      if (!receiptMap.has(receiptNumber)) {
        receiptMap.set(receiptNumber, {
          saleNumber: receiptNumber,
          saleDate: sale.saleDate,
          store: sale.store,
          counter: sale.counter,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          customerEmail: sale.customerEmail,
          createdBy: sale.createdBy,
          items: [],
          payments: [],
          totalSubtotal: 0,
          totalDiscount: 0,
          totalGst: 0,
          totalFinal: 0,
        });
      }
      const receipt = receiptMap.get(receiptNumber);
      receipt.items.push(sale);
      receipt.totalSubtotal += Number(sale.subtotal || 0);
      receipt.totalDiscount += Number(sale.discountAmount || 0);
      receipt.totalGst += Number(sale.gstAmount || 0);
      receipt.totalFinal += Number(sale.finalAmount || 0);
      
      // Collect unique payments
      if (sale.payments) {
        sale.payments.forEach((payment) => {
          if (!receipt.payments.find((p) => p.id === payment.id)) {
            receipt.payments.push(payment);
          }
        });
      }
    });

    return Array.from(receiptMap.values());
  }, [salesList]);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['sales'] });
  };

  const fetchReceiptByNumber = async (saleNumber) => {
    if (!user?.token || !saleNumber) return;
    
    setFetchingReceipt(true);
    try {
      const response = await salesAPI.getReceiptByNumber(saleNumber, user.token);
      if (response.success) {
        setReceiptData(response.data);
        return response.data;
      } else {
        toast.error(response.message || 'Failed to load receipt');
        return null;
      }
    } catch (error) {
      logger.error('Error fetching receipt:', error);
      toast.error('Failed to load receipt');
      return null;
    } finally {
      setFetchingReceipt(false);
    }
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        receipt.saleNumber?.toLowerCase().includes(term) ||
        receipt.customerName?.toLowerCase().includes(term) ||
        receipt.customerPhone?.includes(searchTerm) ||
        receipt.items.some((item) =>
          item.product?.name?.toLowerCase().includes(term)
        )
      );
    });
  }, [receipts, searchTerm]);

  const handleViewReceipt = async (receipt) => {
    setSelectedReceipt(receipt);
    // Fetch full receipt data
    const data = await fetchReceiptByNumber(receipt.saleNumber);
    if (data) {
      setReceiptData(data);
    }
  };

  const handlePrint = (element, format) => {
    if (!element) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print receipt');
      return;
    }

    const styles = format === 'thermal'
      ? `
        <style>
          @media print {
            @page { size: 80mm; margin: 0; }
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 10px;
            font-size: 12px;
            max-width: 80mm;
            margin: 0 auto;
          }
        </style>
      `
      : `
        <style>
          @media print {
            @page { size: A4; margin: 20mm; }
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            font-size: 14px;
          }
        </style>
      `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${receiptData?.saleNumber || 'N/A'}</title>
          ${styles}
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleShare = (receipt) => {
    setReceiptData(receipt);
    setIsSharingDialogOpen(true);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader message="Gathering your receipt history..." />
          </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Receipts</h1>
              <p className="text-muted-foreground">
                View and manage sales receipts
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Receipt #, Customer, Product..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Receipt Format</Label>
                  <Select value={receiptFormat} onValueChange={setReceiptFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal">Thermal (80mm)</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipts Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Receipts ({filteredReceipts.length}{totalPages > 1 ? ` on page ${page}` : ''})
              </CardTitle>
              <CardDescription>
                Click on a receipt to view details
                {totalPages > 1 && ` · ${totalReceipts} total sales across ${totalPages} pages`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payments</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.length > 0 ? (
                      filteredReceipts.map((receipt) => (
                        <TableRow
                          key={receipt.saleNumber}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewReceipt(receipt)}
                        >
                          <TableCell className="font-mono font-medium">
                            {receipt.saleNumber}
                          </TableCell>
                          <TableCell>
                            {new Date(receipt.saleDate).toLocaleString()}
                          </TableCell>
                          <TableCell>{receipt.store?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {receipt.customerName || (
                              <span className="text-muted-foreground">Walk-in</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{receipt.items.length} items</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            ₹{receipt.totalFinal.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {receipt.payments.length > 0 ? (
                                receipt.payments.map((p, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {p.method}: ₹{Number(p.amount).toFixed(2)}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewReceipt(receipt)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShare(receipt)}
                              >
                                <Share2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8"
                        >
                          No receipts found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receipt Detail Dialog */}
          <Dialog
            open={!!selectedReceipt}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedReceipt(null);
                setReceiptData(null);
              }
            }}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Receipt Details</DialogTitle>
                <DialogDescription>
                  Receipt #{selectedReceipt?.saleNumber || 'N/A'}
                </DialogDescription>
              </DialogHeader>

              {fetchingReceipt ? (
                <div className="flex items-center justify-center py-8">
                  <Loader message="Loading receipt..." />
                </div>
              ) : receiptData ? (
                <div className="space-y-4">
                  <ReceiptComponent
                    receiptData={receiptData}
                    receiptFormat={receiptFormat}
                    showActions={true}
                    onPrint={handlePrint}
                    onShare={() => handleShare(receiptData)}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Failed to load receipt details
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Sharing Dialog */}
          <SharingDialog
            open={isSharingDialogOpen}
            onOpenChange={setIsSharingDialogOpen}
            receiptData={receiptData}
          />
        </div>
    </ProtectedRoute>
  );
}

export default function ReceiptsPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute allowedRoles={['admin']}>
            <div className="flex items-center justify-center h-[60vh]">
              <Loader message="Loading receipts..." />
            </div>
        </ProtectedRoute>
      }
    >
      <ReceiptsContent />
    </Suspense>
  );
}
