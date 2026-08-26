'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  DialogFooter,
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
import { Plus, Edit, Trash2, ShoppingCart, Users, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { countersAPI, usersAPI } from '@/lib/api';
import { useStores } from '@/lib/hooks/useStores';
import { useCounters } from '@/lib/hooks/useCounters';
import Loader from '@/components/ui/loader';

export default function CountersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [storeFilter, setStoreFilter] = useState('all');
  const { data: stores = [] } = useStores();
  const { data: counters = [], isLoading: loading } = useCounters(
    storeFilter !== 'all' ? storeFilter : null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);
  const [formData, setFormData] = useState({ name: '', storeId: '', counterType: 'BILLING' });

  // POS Users panel
  const [posUsersCounter, setPosUsersCounter] = useState(null);
  const [posUsers, setPosUsers] = useState([]);
  const [posUsersLoading, setPosUsersLoading] = useState(false);

  // PIN dialog (launched from POS Users panel)
  const [pinTarget, setPinTarget] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // ── Counter CRUD ────────────────────────────────────────────────────────────
  const handleOpenModal = (counter = null) => {
    if (counter) {
      setEditingCounter(counter);
      setFormData({ name: counter.name || '', storeId: counter.storeId || '', counterType: counter.counterType || 'BILLING' });
    } else {
      setEditingCounter(null);
      setFormData({ name: '', storeId: storeFilter !== 'all' ? storeFilter : '', counterType: 'BILLING' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCounter(null);
    setFormData({ name: '', storeId: '', counterType: 'BILLING' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.token) return;
    if (!formData.storeId) { toast.error('Please select a store'); return; }
    try {
      const payload = { name: formData.name, storeId: formData.storeId, counterType: formData.counterType };
      let response;
      if (editingCounter) {
        response = await countersAPI.update(editingCounter.id, payload, user.token);
      } else {
        response = await countersAPI.create(payload, user.token);
      }
      if (response.success) {
        toast.success(response.message || `Counter ${editingCounter ? 'updated' : 'created'} successfully`);
        handleCloseModal();
        qc.invalidateQueries({ queryKey: ['counters'] });
      } else {
        toast.error(response.message || `Failed to ${editingCounter ? 'update' : 'create'} counter`);
      }
    } catch (error) {
      console.error('Error saving counter:', error);
      toast.error(`Failed to ${editingCounter ? 'update' : 'create'} counter`);
    }
  };

  const handleDelete = async (counter) => {
    if (!user?.token) return;
    if (!confirm(`Are you sure you want to delete "${counter.name}"? This action cannot be undone.`)) return;
    try {
      const response = await countersAPI.delete(counter.id, user.token);
      if (response.success) {
        toast.success('Counter deleted successfully');
        qc.invalidateQueries({ queryKey: ['counters'] });
      } else {
        toast.error(response.message || 'Failed to delete counter');
      }
    } catch (error) {
      console.error('Error deleting counter:', error);
      toast.error('Failed to delete counter');
    }
  };

  // ── POS Users panel ──────────────────────────────────────────────────────────
  const handleViewPosUsers = async (counter) => {
    setPosUsersCounter(counter);
    setPosUsers([]);
    setPosUsersLoading(true);
    try {
      // Users scoped to the counter's store
      const params = counter.storeId ? { storeId: counter.storeId } : {};
      const res = await usersAPI.getAll(user.token, params);
      if (res.success) {
        setPosUsers(res.data || []);
      } else {
        toast.error('Failed to load users for this counter');
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setPosUsersLoading(false);
    }
  };

  const handleOpenPinDialog = (usr) => {
    setPinTarget(usr);
    setPinValue('');
    setPinConfirm('');
    setPinError('');
  };

  const handleSavePin = async () => {
    setPinError('');
    if (!/^\d{4,6}$/.test(pinValue)) {
      setPinError('PIN must be 4–6 digits (numbers only)');
      return;
    }
    if (pinValue !== pinConfirm) {
      setPinError('PINs do not match');
      return;
    }
    if (!user?.token || !pinTarget) return;
    setPinLoading(true);
    try {
      const res = await usersAPI.updatePin(pinTarget.id, pinValue, user.token);
      if (res.success) {
        toast.success(`PIN set for ${pinTarget.name}`);
        setPinTarget(null);
        // Refresh POS users list
        if (posUsersCounter) handleViewPosUsers(posUsersCounter);
      } else {
        toast.error(res.error || 'Failed to set PIN');
      }
    } catch (err) {
      toast.error('Failed to set PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const filteredCounters =
    storeFilter === 'all'
      ? counters
      : counters.filter((counter) => counter.storeId === storeFilter);

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
              <h1 className="text-3xl font-bold">Counter Management</h1>
              <p className="text-muted-foreground">Manage billing counters and POS user PIN access</p>
            </div>
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Counter
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Counters</CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="storeFilter">Filter by Store:</Label>
                  <Select value={storeFilter} onValueChange={setStoreFilter}>
                    <SelectTrigger id="storeFilter" className="w-[200px]">
                      <SelectValue placeholder="All Stores" />
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
              </div>
            </CardHeader>
            <CardContent>
              {filteredCounters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {storeFilter === 'all'
                      ? 'No counters found. Create your first counter to get started.'
                      : 'No counters found for the selected store.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Counter Name</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sales Count</TableHead>
                      <TableHead>POS Users</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCounters.map((counter) => (
                      <TableRow key={counter.id}>
                        <TableCell className="font-medium">{counter.name}</TableCell>
                        <TableCell>
                          {counter.store?.name ||
                            stores.find((s) => s.id === counter.storeId)?.name ||
                            '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={counter.counterType === 'FLOOR' ? 'secondary' : 'default'} className="text-xs">
                            {counter.counterType || 'BILLING'}
                          </Badge>
                        </TableCell>
                        <TableCell>{counter._count?.sales || 0}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleViewPosUsers(counter)}
                          >
                            <Users className="h-3 w-3" />
                            Manage POS Users
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(counter)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(counter)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit Counter Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCounter ? 'Edit Counter' : 'Add New Counter'}</DialogTitle>
                <DialogDescription>
                  {editingCounter
                    ? 'Update counter information below.'
                    : 'Fill in the details to create a new counter.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeId">
                    Store <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.storeId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, storeId: value }))}
                    required
                  >
                    <SelectTrigger id="storeId">
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Counter Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Main Billing Counter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="counterType">
                    Counter Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.counterType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, counterType: value }))}
                    required
                  >
                    <SelectTrigger id="counterType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BILLING">Billing — receives orders, processes payments</SelectItem>
                      <SelectItem value="FLOOR">Floor — creates orders and hands off to billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingCounter ? 'Update' : 'Create'} Counter</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* POS Users Panel Dialog */}
          <Dialog open={!!posUsersCounter} onOpenChange={(open) => { if (!open) setPosUsersCounter(null); }}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>POS Users — {posUsersCounter?.name}</DialogTitle>
                <DialogDescription>
                  Users assigned to{' '}
                  <strong>
                    {posUsersCounter?.store?.name ||
                      stores.find((s) => s.id === posUsersCounter?.storeId)?.name ||
                      'this store'}
                  </strong>{' '}
                  can log in at this counter using their PIN.
                </DialogDescription>
              </DialogHeader>

              {posUsersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader message="Loading users..." />
                </div>
              ) : posUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <Users className="h-10 w-10 mx-auto opacity-40" />
                  <p>No users are assigned to this store yet.</p>
                  <p className="text-xs">
                    Go to <strong>Users</strong> page → edit a user → set their{' '}
                    <strong>Assigned Store</strong> to this store, then set a PIN.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>PIN</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posUsers.map((usr) => (
                      <TableRow key={usr.id}>
                        <TableCell className="font-medium">{usr.name}</TableCell>
                        <TableCell>
                          <Badge variant={usr.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                            {usr.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={usr.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                            {usr.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={usr.pin ? 'outline' : 'destructive'} className="text-xs">
                            {usr.pin ? 'PIN Set' : 'No PIN'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleOpenPinDialog(usr)}
                          >
                            <KeyRound className="h-3 w-3" />
                            {usr.pin ? 'Change PIN' : 'Set PIN'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setPosUsersCounter(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Set PIN Dialog (from POS Users panel) */}
          <Dialog open={!!pinTarget} onOpenChange={(open) => { if (!open) setPinTarget(null); }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Set POS PIN</DialogTitle>
                <DialogDescription>
                  {pinTarget ? `Set a 4–6 digit PIN for ${pinTarget.name} to log into this counter.` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>New PIN (4–6 digits)</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinValue}
                    onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                    placeholder="e.g. 1234"
                    className={pinError ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinConfirm}
                    onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                    placeholder="Re-enter PIN"
                    className={pinError ? 'border-destructive' : ''}
                  />
                </div>
                {pinError && <p className="text-sm text-destructive">{pinError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPinTarget(null)}>Cancel</Button>
                <Button onClick={handleSavePin} disabled={pinLoading}>
                  {pinLoading ? 'Saving...' : 'Set PIN'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
    </ProtectedRoute>
  );
}
