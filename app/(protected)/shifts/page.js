'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Search, Plus, Eye, Clock, CheckCircle, XCircle, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { shiftsAPI } from '@/lib/api';
import { useStores } from '@/lib/hooks/useStores';
import { useCounters } from '@/lib/hooks/useCounters';
import Loader from '@/components/ui/loader';

export default function ShiftsPage() {
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    storeId: 'all',
    counterId: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
  });
  const [formData, setFormData] = useState({
    counterId: '',
    openingBalance: '',
  });
  const [closeFormData, setCloseFormData] = useState({
    actualBalance: '',
    notes: '',
  });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: stores = [] } = useStores();
  const { data: counters = [] } = useCounters(
    filters.storeId !== 'all' ? filters.storeId : null
  );

  const dateRangeValid = !(filters.startDate && filters.endDate && filters.startDate > filters.endDate);
  useEffect(() => {
    if (!dateRangeValid) toast.error('Start date cannot be after end date');
  }, [dateRangeValid]);
  const shiftsQueryKey = ['shifts', filters];
  const { data: shifts = [], isLoading: loading } = useQuery({
    queryKey: shiftsQueryKey,
    queryFn: async () => {
      const params = {};
      if (filters.storeId !== 'all') params.storeId = filters.storeId;
      if (filters.counterId !== 'all') params.counterId = filters.counterId;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const response = await shiftsAPI.getAll(user.token, params);
      if (!response.success) throw new Error(response.message || 'Failed to fetch shifts');
      return response.data || [];
    },
    enabled: !!user?.token && dateRangeValid,
  });

  const handleOpenModal = () => {
    setFormData({
      counterId: '',
      openingBalance: '',
    });
    setIsOpenModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpenModalOpen(false);
    setFormData({
      counterId: '',
      openingBalance: '',
    });
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    if (!user?.token) return;

    const existingOpen = shifts.find(
      (s) =>
        (s.counter?.id === formData.counterId || s.counterId === formData.counterId) &&
        s.status === 'OPEN'
    );
    if (existingOpen) {
      toast.error(
        `Counter already has an open shift (${existingOpen.shiftNumber}). Close it first.`
      );
      return;
    }

    try {
      const payload = {
        counterId: formData.counterId,
        openingBalance: parseFloat(formData.openingBalance) || 0,
      };

      const response = await shiftsAPI.open(payload, user.token);

      if (response.success) {
        toast.success('Shift opened successfully');
        handleCloseModal();
        qc.invalidateQueries({ queryKey: ['shifts'] });
      } else {
        toast.error(response.message || 'Failed to open shift');
      }
    } catch (error) {
      console.error('Error opening shift:', error);
      toast.error('Failed to open shift');
    }
  };

  const handleCloseShiftModal = (shift) => {
    setSelectedShift(shift);
    setCloseFormData({
      actualBalance: '',
      notes: '',
    });
    setIsCloseModalOpen(true);
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!user?.token || !selectedShift) return;

    try {
      const payload = {
        actualBalance: parseFloat(closeFormData.actualBalance) || null,
        notes: closeFormData.notes || null,
      };

      const response = await shiftsAPI.close(selectedShift.id, payload, user.token);

      if (response.success) {
        toast.success('Shift closed successfully');
        setIsCloseModalOpen(false);
        setSelectedShift(null);
        qc.invalidateQueries({ queryKey: ['shifts'] });
      } else {
        toast.error(response.message || 'Failed to close shift');
      }
    } catch (error) {
      console.error('Error closing shift:', error);
      toast.error('Failed to close shift');
    }
  };

  const handleViewDetails = async (shift) => {
    if (!user?.token) return;
    try {
      const response = await shiftsAPI.getById(shift.id, user.token);
      if (response.success) {
        setSelectedShift(response.data);
        setIsDetailModalOpen(true);
      } else {
        toast.error('Failed to fetch shift details');
      }
    } catch (error) {
      console.error('Error fetching shift details:', error);
      toast.error('Failed to fetch shift details');
    }
  };

  const filteredShifts = shifts.filter((shift) => {
    const matchesSearch =
      shift.shiftNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.counter?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.openedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const openShifts = filteredShifts.filter((s) => s.status === 'OPEN').length;
    const closedShifts = filteredShifts.filter((s) => s.status === 'CLOSED').length;
    const totalOpeningBalance = filteredShifts.reduce(
      (sum, s) => sum + Number(s.openingBalance || 0),
      0
    );
    const totalClosingBalance = filteredShifts
      .filter((s) => s.status === 'CLOSED' && s.closingBalance)
      .reduce((sum, s) => sum + Number(s.closingBalance || 0), 0);
    const totalExpectedBalance = filteredShifts
      .filter((s) => s.status === 'CLOSED' && s.expectedBalance)
      .reduce((sum, s) => sum + Number(s.expectedBalance || 0), 0);
    const totalDifference = filteredShifts
      .filter((s) => s.status === 'CLOSED' && s.difference !== null)
      .reduce((sum, s) => sum + Number(s.difference || 0), 0);

    return {
      total: filteredShifts.length,
      open: openShifts,
      closed: closedShifts,
      totalOpeningBalance,
      totalClosingBalance,
      totalExpectedBalance,
      totalDifference,
    };
  }, [filteredShifts]);

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
              <h1 className="text-3xl font-bold">Shift Management</h1>
              <p className="text-muted-foreground">Manage shifts for counters</p>
            </div>
            <Button onClick={handleOpenModal} className="gap-2">
              <Plus className="h-4 w-4" />
              Open Shift
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Shifts</p>
                    <p className="text-2xl font-bold">{summaryStats.total}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Open Shifts</p>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.open}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Closed Shifts</p>
                    <p className="text-2xl font-bold text-gray-600">{summaryStats.closed}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Opening Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalOpeningBalance)}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Shifts</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search shifts..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select
                    value={filters.storeId}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, storeId: value, counterId: 'all' }))
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by store" />
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
                  <Select
                    value={filters.counterId}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, counterId: value }))
                    }
                    disabled={filters.storeId === 'all'}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by counter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Counters</SelectItem>
                      {counters.map((counter) => (
                        <SelectItem key={counter.id} value={counter.id}>
                          {counter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    className="w-48"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-xs">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    className="w-48"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                  />
                </div>
                {(filters.startDate || filters.endDate) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, startDate: '', endDate: '' }))
                    }
                    className="mt-6"
                  >
                    Clear Dates
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredShifts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No shifts found. Open a shift to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift Number</TableHead>
                      <TableHead>Counter</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Opened By</TableHead>
                      <TableHead>Opening Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Opened At</TableHead>
                      <TableHead>Closed At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.shiftNumber}</TableCell>
                        <TableCell>{shift.counter?.name || '-'}</TableCell>
                        <TableCell>{shift.counter?.store?.name || '-'}</TableCell>
                        <TableCell>{shift.openedBy?.name || '-'}</TableCell>
                        <TableCell>{formatCurrency(shift.openingBalance)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={shift.status === 'OPEN' ? 'default' : 'secondary'}
                            className={
                              shift.status === 'OPEN'
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-gray-500 hover:bg-gray-600'
                            }
                          >
                            {shift.status === 'OPEN' ? (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Open
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Closed
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(shift.openedAt)}</TableCell>
                        <TableCell>{formatDate(shift.closedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(shift)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {shift.status === 'OPEN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCloseShiftModal(shift)}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <XCircle className="h-4 w-4" />
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

          {/* Open Shift Modal */}
          <Dialog open={isOpenModalOpen} onOpenChange={setIsOpenModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Open New Shift</DialogTitle>
                <DialogDescription>
                  Select a counter and enter the opening cash balance to start a new shift.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleOpenShift} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="counterId">
                    Counter <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.counterId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, counterId: value }))
                    }
                    required
                  >
                    <SelectTrigger id="counterId">
                      <SelectValue placeholder="Select counter" />
                    </SelectTrigger>
                    <SelectContent>
                      {counters.map((counter) => (
                        <SelectItem key={counter.id} value={counter.id}>
                          {counter.name} ({counter.store?.name || 'N/A'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    name="openingBalance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.openingBalance}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, openingBalance: e.target.value }))
                    }
                    placeholder="Enter opening cash balance"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty or enter 0 if starting with no cash
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button type="submit">Open Shift</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Close Shift Modal */}
          <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Close Shift</DialogTitle>
                <DialogDescription>
                  Enter the actual cash count to close this shift. The system will calculate the
                  difference.
                </DialogDescription>
              </DialogHeader>
              {selectedShift && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Opening Balance</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(selectedShift.openingBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Balance</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(selectedShift.summary?.expectedBalance || 0)}
                      </p>
                    </div>
                  </div>
                  <form onSubmit={handleCloseShift} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="actualBalance">Actual Cash Count</Label>
                      <Input
                        id="actualBalance"
                        name="actualBalance"
                        type="number"
                        step="0.01"
                        min="0"
                        value={closeFormData.actualBalance}
                        onChange={(e) =>
                          setCloseFormData((prev) => ({
                            ...prev,
                            actualBalance: e.target.value,
                          }))
                        }
                        placeholder="Enter actual cash count"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={closeFormData.notes}
                        onChange={(e) =>
                          setCloseFormData((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Add notes about the shift or any difference"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCloseModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Close Shift</Button>
                    </div>
                  </form>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Shift Details Modal */}
          <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Shift Details - {selectedShift?.shiftNumber}</DialogTitle>
                <DialogDescription>Complete shift information and summary</DialogDescription>
              </DialogHeader>
              {selectedShift && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Counter</p>
                      <p className="font-medium">{selectedShift.counter?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Store</p>
                      <p className="font-medium">{selectedShift.counter?.store?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Opened By</p>
                      <p className="font-medium">{selectedShift.openedBy?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Closed By</p>
                      <p className="font-medium">{selectedShift.closedBy?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge
                        variant={selectedShift.status === 'OPEN' ? 'default' : 'secondary'}
                      >
                        {selectedShift.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Opened At</p>
                      <p className="font-medium">{formatDate(selectedShift.openedAt)}</p>
                    </div>
                    {selectedShift.closedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Closed At</p>
                        <p className="font-medium">{formatDate(selectedShift.closedAt)}</p>
                      </div>
                    )}
                  </div>

                  {selectedShift.summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Shift Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Opening Balance</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency(selectedShift.summary.openingBalance)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Sales</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency(selectedShift.summary.totalSales)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Expected Balance</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency(selectedShift.summary.expectedBalance)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Actual Balance</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency(selectedShift.summary.actualBalance)}
                            </p>
                          </div>
                          {selectedShift.summary.difference !== null && (
                            <div>
                              <p className="text-sm text-muted-foreground">Difference</p>
                              <p
                                className={`text-lg font-semibold ${
                                  selectedShift.summary.difference >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {formatCurrency(selectedShift.summary.difference)}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground">Transaction Count</p>
                            <p className="text-lg font-semibold">
                              {selectedShift.summary.transactionCount || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedShift.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Notes</p>
                      <p className="p-3 bg-muted rounded-lg">{selectedShift.notes}</p>
                    </div>
                  )}

                  {selectedShift.sales && selectedShift.sales.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Sales ({selectedShift.sales.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedShift.sales.map((sale) => (
                              <TableRow key={sale.id}>
                                <TableCell>{sale.product?.name || '-'}</TableCell>
                                <TableCell>{sale.quantitySold}</TableCell>
                                <TableCell>{formatCurrency(sale.product?.price)}</TableCell>
                                <TableCell>
                                  {formatCurrency(
                                    Number(sale.product?.price || 0) * sale.quantitySold
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
    </ProtectedRoute>
  );
}

