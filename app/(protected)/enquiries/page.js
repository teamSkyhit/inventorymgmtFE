'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { MessageSquare, Phone, Mail, Package, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { enquiriesAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import logger from '@/lib/logger';

const STATUS_LABELS = {
  NEW: { label: 'New', variant: 'default' },
  CONTACTED: { label: 'Contacted', variant: 'secondary' },
  CLOSED: { label: 'Closed', variant: 'outline' },
};

export default function EnquiriesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const { data: enquiriesData, isLoading: loading } = useQuery({
    queryKey: ['enquiries', { page, statusFilter }],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await enquiriesAPI.getAll(user.token, params);
      if (!response.success) throw new Error(response.message || 'Failed to load enquiries');
      return response.data;
    },
    enabled: !!user?.token,
  });

  const enquiries = enquiriesData?.enquiries || [];
  const totalPages = enquiriesData?.pagination?.pages || 1;
  const total = enquiriesData?.pagination?.total || 0;

  const openDetail = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setEditStatus(enquiry.status);
    setEditNotes(enquiry.notes || '');
    setIsDetailOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedEnquiry) return;
    try {
      setUpdating(true);
      const response = await enquiriesAPI.update(
        selectedEnquiry.id,
        { status: editStatus, notes: editNotes },
        user.token
      );
      if (response.success) {
        toast.success('Enquiry updated');
        setIsDetailOpen(false);
        qc.invalidateQueries({ queryKey: ['enquiries'] });
      } else {
        toast.error(response.message || 'Failed to update enquiry');
      }
    } catch (err) {
      logger.error('Error updating enquiry:', err);
      toast.error('Failed to update enquiry');
    } finally {
      setUpdating(false);
    }
  };

  const filteredEnquiries = search.trim()
    ? enquiries.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.phone.includes(search) ||
          e.product?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : enquiries;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'user']}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Enquiries</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {total} lead{total !== 1 ? 's' : ''} from the website
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['enquiries'] })} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, phone, or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEnquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <MessageSquare className="h-10 w-10" />
                  <p className="text-sm">No enquiries found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEnquiries.map((enquiry) => (
                        <TableRow
                          key={enquiry.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openDetail(enquiry)}
                        >
                          <TableCell>
                            <div className="font-medium">{enquiry.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {enquiry.phone}
                            </div>
                            {enquiry.email && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {enquiry.email}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {enquiry.product ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                {enquiry.product.name}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">General</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-48">
                            <p className="text-sm truncate">{enquiry.message}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_LABELS[enquiry.status]?.variant ?? 'default'}>
                              {STATUS_LABELS[enquiry.status]?.label ?? enquiry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(enquiry.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); openDetail(enquiry); }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => setPage(p)}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>

        {/* Detail / Edit Dialog */}
        {selectedEnquiry && (
          <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Enquiry Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Customer info */}
                <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                  <p className="font-semibold">{selectedEnquiry.name}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedEnquiry.phone}`} className="hover:underline">
                      {selectedEnquiry.phone}
                    </a>
                  </div>
                  {selectedEnquiry.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedEnquiry.email}`} className="hover:underline">
                        {selectedEnquiry.email}
                      </a>
                    </div>
                  )}
                  {selectedEnquiry.product && (
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEnquiry.product.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(selectedEnquiry.createdAt)}</p>
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Message</Label>
                  <p className="text-sm leading-relaxed">{selectedEnquiry.message}</p>
                </div>

                {/* Status update */}
                <div className="space-y-2">
                  <Label htmlFor="enquiry-status">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger id="enquiry-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="CONTACTED">Contacted</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="enquiry-notes">Internal Notes</Label>
                  <Textarea
                    id="enquiry-notes"
                    rows={3}
                    placeholder="Add notes for your team..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    maxLength={2000}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
    </ProtectedRoute>
  );
}
