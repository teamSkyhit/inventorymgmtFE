'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { productsAPI } from '@/lib/api';
import logger from '@/lib/logger';

export default function ProductAttributes({ productId, token, readonly = false }) {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [formData, setFormData] = useState({
    size: '',
    weight: '',
    price: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (productId && token) {
      fetchAttributes();
    }
  }, [productId, token]);

  const fetchAttributes = async () => {
    if (!productId || !token) return;
    
    try {
      setLoading(true);
      const response = await productsAPI.getAttributes(productId, token);
      if (response.success) {
        setAttributes(response.data || []);
      } else {
        // If product doesn't have attributes yet, that's okay
        if (response.error && !response.error.includes('not found')) {
          toast.error(response.message || 'Failed to load attributes');
        }
      }
    } catch (error) {
      logger.error('Error fetching attributes:', error);
      // Don't show error if it's just that attributes don't exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingAttribute(null);
    setFormData({ size: '', weight: '', price: '' });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleEdit = (attribute) => {
    setEditingAttribute(attribute);
    setFormData({
      size: attribute.size || '',
      weight: attribute.weight?.toString() || '',
      price: attribute.price?.toString() || '',
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleDelete = async (attributeId) => {
    if (!confirm('Are you sure you want to delete this attribute?')) {
      return;
    }

    try {
      const response = await productsAPI.deleteAttribute(productId, attributeId, token);
      if (response.success) {
        toast.success('Attribute deleted successfully');
        fetchAttributes();
      } else {
        toast.error(response.message || 'Failed to delete attribute');
      }
    } catch (error) {
      logger.error('Error deleting attribute:', error);
      toast.error('Failed to delete attribute');
    }
  };

  const handleSave = async () => {
    setErrors({});

    // Validate: at least size or weight must be provided
    if (!formData.size && !formData.weight) {
      setErrors({ general: 'Either size or weight must be provided' });
      toast.error('Either size or weight must be provided');
      return;
    }

    // Validate weight if provided
    if (formData.weight && (isNaN(formData.weight) || parseFloat(formData.weight) < 0)) {
      setErrors({ weight: 'Weight must be a valid positive number' });
      return;
    }

    // Validate price if provided
    if (formData.price && (isNaN(formData.price) || parseFloat(formData.price) < 0)) {
      setErrors({ price: 'Price must be a valid positive number' });
      return;
    }

    try {
      const payload = {
        size: formData.size || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        price: formData.price ? parseFloat(formData.price) : null,
      };

      let response;
      if (editingAttribute) {
        response = await productsAPI.updateAttribute(
          productId,
          editingAttribute.id,
          payload,
          token
        );
      } else {
        response = await productsAPI.createAttribute(productId, payload, token);
      }

      if (response.success) {
        toast.success(
          editingAttribute
            ? 'Attribute updated successfully'
            : 'Attribute added successfully'
        );
        setIsDialogOpen(false);
        fetchAttributes();
      } else {
        toast.error(response.message || 'Failed to save attribute');
      }
    } catch (error) {
      logger.error('Error saving attribute:', error);
      toast.error('Failed to save attribute');
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (readonly && attributes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No attributes defined for this product.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Product Attributes (Size/Weight)</Label>
        {!readonly && (
          <Button type="button" size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Attribute
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading attributes...</div>
      ) : attributes.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
          No attributes added yet. Click "Add Attribute" to add size/weight variations.
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Price Override</TableHead>
                {!readonly && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributes.map((attr) => (
                <TableRow key={attr.id}>
                  <TableCell>{attr.size || '—'}</TableCell>
                  <TableCell>{attr.weight ? `${attr.weight} kg` : '—'}</TableCell>
                  <TableCell>
                    {attr.price ? (
                      <span className="font-medium">₹{parseFloat(attr.price).toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Use base price</span>
                    )}
                  </TableCell>
                  {!readonly && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(attr)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(attr.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAttribute ? 'Edit Attribute' : 'Add Attribute'}
            </DialogTitle>
            <DialogDescription>
              Add size or weight variation for this product. At least one must be provided.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {errors.general && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {errors.general}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="attr-size">Size (e.g., Small, Large, 500g, 1kg)</Label>
              <Input
                id="attr-size"
                value={formData.size}
                onChange={(e) => handleFormChange('size', e.target.value)}
                placeholder="e.g., Small, Large, 500g"
                className={errors.size ? 'border-destructive' : ''}
              />
              {errors.size && (
                <p className="text-sm text-destructive">{errors.size}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="attr-weight">Weight (kg)</Label>
              <Input
                id="attr-weight"
                type="number"
                step="0.001"
                value={formData.weight}
                onChange={(e) => handleFormChange('weight', e.target.value)}
                placeholder="e.g., 0.5, 1.0"
                className={errors.weight ? 'border-destructive' : ''}
              />
              {errors.weight && (
                <p className="text-sm text-destructive">{errors.weight}</p>
              )}
              <p className="text-xs text-muted-foreground">
                At least size or weight must be provided
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attr-price">Price Override (Optional)</Label>
              <Input
                id="attr-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleFormChange('price', e.target.value)}
                placeholder="Leave empty to use base product price"
                className={errors.price ? 'border-destructive' : ''}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional: Override the base product price for this size/weight
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              {editingAttribute ? 'Update' : 'Add'} Attribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

