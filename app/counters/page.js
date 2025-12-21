'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import AdminLayout from '@/components/admin-layout';
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
import { Plus, Edit, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { countersAPI, storesAPI } from '@/lib/api';
import Loader from '@/components/ui/loader';

export default function CountersPage() {
  const [counters, setCounters] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    storeId: '',
  });
  const [storeFilter, setStoreFilter] = useState('all');
  const { user } = useAuth();

  const fetchStores = async () => {
    if (!user?.token) return;
    try {
      const response = await storesAPI.getAll(user.token);
      if (response.success) {
        setStores(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchCounters = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const storeId = storeFilter !== 'all' ? storeFilter : null;
      const response = await countersAPI.getAll(user.token, storeId);
      if (response.success) {
        setCounters(response.data || []);
      } else {
        toast.error(response.message || 'Failed to fetch counters');
      }
    } catch (error) {
      console.error('Error fetching counters:', error);
      toast.error('Failed to fetch counters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [user?.token]);

  useEffect(() => {
    fetchCounters();
  }, [user?.token, storeFilter]);

  const handleOpenModal = (counter = null) => {
    if (counter) {
      setEditingCounter(counter);
      setFormData({
        name: counter.name || '',
        storeId: counter.storeId || '',
      });
    } else {
      setEditingCounter(null);
      setFormData({
        name: '',
        storeId: storeFilter !== 'all' ? storeFilter : '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCounter(null);
    setFormData({
      name: '',
      storeId: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.token) return;

    if (!formData.storeId) {
      toast.error('Please select a store');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        storeId: formData.storeId,
      };

      let response;
      if (editingCounter) {
        response = await countersAPI.update(editingCounter.id, payload, user.token);
      } else {
        response = await countersAPI.create(payload, user.token);
      }

      if (response.success) {
        toast.success(
          response.message || `Counter ${editingCounter ? 'updated' : 'created'} successfully`
        );
        handleCloseModal();
        fetchCounters();
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
    if (
      !confirm(
        `Are you sure you want to delete "${counter.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await countersAPI.delete(counter.id, user.token);
      if (response.success) {
        toast.success('Counter deleted successfully');
        fetchCounters();
      } else {
        toast.error(response.message || 'Failed to delete counter');
      }
    } catch (error) {
      console.error('Error deleting counter:', error);
      toast.error('Failed to delete counter');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredCounters =
    storeFilter === 'all'
      ? counters
      : counters.filter((counter) => counter.storeId === storeFilter);

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <Loader />
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Counter Management</h1>
              <p className="text-muted-foreground">Manage billing counters for each store</p>
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
                      <TableHead>Sales Count</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCounters.map((counter) => (
                      <TableRow key={counter.id}>
                        <TableCell className="font-medium">{counter.name}</TableCell>
                        <TableCell>
                          {counter.store?.name || stores.find((s) => s.id === counter.storeId)?.name || '-'}
                        </TableCell>
                        <TableCell>{counter._count?.sales || 0}</TableCell>
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
                    onChange={handleChange}
                    required
                    placeholder="Main Billing Counter"
                  />
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
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

