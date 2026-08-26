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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Building2, Package } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { storesAPI } from '@/lib/api';
import { useStores } from '@/lib/hooks/useStores';
import Loader from '@/components/ui/loader';

export default function StoresPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: stores = [], isLoading: loading } = useStores();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact: '',
    email: '',
    website: '',
    logoUrl: '',
    isActive: true,
  });
  const handleOpenModal = (store = null) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name || '',
        code: store.code || '',
        gstin: store.gstin || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        pincode: store.pincode || '',
        contact: store.contact || '',
        email: store.email || '',
        website: store.website || '',
        logoUrl: store.logoUrl || '',
        isActive: store.isActive !== undefined ? store.isActive : true,
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: '',
        code: '',
        gstin: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contact: '',
        email: '',
        website: '',
        logoUrl: '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStore(null);
    setFormData({
      name: '',
      code: '',
      gstin: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact: '',
      email: '',
      website: '',
      logoUrl: '',
      isActive: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.token) return;

    try {
      const payload = {
        ...formData,
        code: formData.code || null,
        gstin: formData.gstin || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        contact: formData.contact || null,
        email: formData.email || null,
        website: formData.website || null,
        logoUrl: formData.logoUrl || null,
      };

      let response;
      if (editingStore) {
        response = await storesAPI.update(editingStore.id, payload, user.token);
      } else {
        response = await storesAPI.create(payload, user.token);
      }

      if (response.success) {
        toast.success(response.message || `Store ${editingStore ? 'updated' : 'created'} successfully`);
        handleCloseModal();
        qc.invalidateQueries({ queryKey: ['stores'] });
      } else {
        toast.error(response.message || `Failed to ${editingStore ? 'update' : 'create'} store`);
      }
    } catch (error) {
      console.error('Error saving store:', error);
      toast.error(`Failed to ${editingStore ? 'update' : 'create'} store`);
    }
  };

  const handleDelete = async (store) => {
    if (!user?.token) return;
    if (!confirm(`Are you sure you want to delete "${store.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await storesAPI.delete(store.id, user.token);
      if (response.success) {
        toast.success('Store deleted successfully');
        qc.invalidateQueries({ queryKey: ['stores'] });
      } else {
        toast.error(response.message || 'Failed to delete store');
      }
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

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
              <h1 className="text-3xl font-bold">Store Management</h1>
              <p className="text-muted-foreground">Manage your stores and locations</p>
            </div>
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Store
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Stores</CardTitle>
            </CardHeader>
            <CardContent>
              {stores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stores found. Create your first store to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Counters</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>{store.code || '-'}</TableCell>
                        <TableCell>{store.gstin || '-'}</TableCell>
                        <TableCell>{store.city || '-'}</TableCell>
                        <TableCell>{store.contact || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={store.isActive ? 'default' : 'secondary'}>
                            {store.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{store._count?.counters || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/stores/${store.id}/inventory`}>
                              <Button variant="ghost" size="sm" title="Manage Inventory">
                                <Package className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(store)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(store)}
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

          {/* Add/Edit Store Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingStore ? 'Edit Store' : 'Add New Store'}</DialogTitle>
                <DialogDescription>
                  {editingStore
                    ? 'Update store information below.'
                    : 'Fill in the details to create a new store.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Store Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Main Store"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Store Code</Label>
                    <Input
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      placeholder="STORE-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="29ABCDE1234F1Z5"
                      maxLength={15}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      name="contact"
                      value={formData.contact}
                      onChange={handleChange}
                      placeholder="+91-9876543210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="store@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://store.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Bangalore"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Karnataka"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="560001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      name="logoUrl"
                      type="url"
                      value={formData.logoUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main Street"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => {
                      setFormData((prev) => ({ ...prev, isActive: checked }));
                    }}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Store is active
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingStore ? 'Update' : 'Create'} Store</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
    </ProtectedRoute>
  );
}

