'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/protected-route';
import AdminLayout from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Folder,
  FolderTree,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { categoriesAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useCommon } from '@/lib/common-context';
import logger from '@/lib/logger';
import Loader from '@/components/ui/loader';
import { categorySchema, subcategorySchema, formatZodError, getFieldErrors } from '@/lib/validations';

export default function CategoriesPage() {
  const { user } = useAuth();
  const { categories: commonCategories, refreshCategories } = useCommon();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [deleteSubcategoryId, setDeleteSubcategoryId] = useState(null);
  const [categoryErrors, setCategoryErrors] = useState({});
  const [subcategoryErrors, setSubcategoryErrors] = useState({});
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
  });
  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
  });

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getAll(user?.token);
      if (response.success) {
        setCategories(response.data || []);
        // Also refresh common context
        if (refreshCategories) {
          refreshCategories();
        }
      } else {
        toast.error(response.message || 'Failed to fetch categories');
      }
    } catch (error) {
      logger.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchCategories();
    }
  }, [user?.token]);

  // Category handlers
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', description: '' });
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    });
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    setCategoryErrors({});
    
    try {
      const validationResult = categorySchema.safeParse(categoryFormData);
      
      if (!validationResult.success) {
        const fieldErrors = getFieldErrors(validationResult.error);
        setCategoryErrors(fieldErrors);
        const firstError = formatZodError(validationResult.error);
        toast.error(firstError);
        logger.warn('Category validation failed:', validationResult.error.errors);
        return;
      }

      const validatedData = validationResult.data;
      logger.info(editingCategory ? 'Updating category' : 'Creating category:', { name: validatedData.name });

      let response;
      if (editingCategory) {
        response = await categoriesAPI.update(
          editingCategory.id,
          validatedData,
          user?.token
        );
      } else {
        response = await categoriesAPI.create(validatedData, user?.token);
      }

      if (response.success) {
        logger.info('Category saved successfully:', { name: validatedData.name });
        toast.success(
          editingCategory
            ? 'Category updated successfully'
            : 'Category created successfully'
        );
        setIsCategoryDialogOpen(false);
        fetchCategories();
      } else {
        logger.error('Category save failed:', response.message);
        toast.error(response.message || 'Failed to save category');
      }
    } catch (error) {
      logger.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;

    try {
      const response = await categoriesAPI.delete(deleteCategoryId, user?.token);
      if (response.success) {
        toast.success('Category deleted successfully');
        setDeleteCategoryId(null);
        fetchCategories();
      } else {
        toast.error(response.message || 'Failed to delete category');
        setDeleteCategoryId(null);
      }
    } catch (error) {
      logger.error('Error deleting category:', error);
      toast.error('Failed to delete category');
      setDeleteCategoryId(null);
    }
  };

  // Subcategory handlers
  const handleAddSubcategory = (categoryId) => {
    setEditingSubcategory(null);
    setSelectedCategoryId(categoryId);
    setSubcategoryFormData({
      name: '',
      description: '',
      categoryId: categoryId,
    });
    setIsSubcategoryDialogOpen(true);
  };

  const handleEditSubcategory = (subcategory, categoryId) => {
    setEditingSubcategory(subcategory);
    setSelectedCategoryId(categoryId);
    setSubcategoryFormData({
      name: subcategory.name,
      description: subcategory.description || '',
      categoryId: categoryId,
    });
    setIsSubcategoryDialogOpen(true);
  };

  const handleSaveSubcategory = async () => {
    setSubcategoryErrors({});
    
    try {
      const validationResult = subcategorySchema.safeParse(subcategoryFormData);
      
      if (!validationResult.success) {
        const fieldErrors = getFieldErrors(validationResult.error);
        setSubcategoryErrors(fieldErrors);
        const firstError = formatZodError(validationResult.error);
        toast.error(firstError);
        logger.warn('Subcategory validation failed:', validationResult.error.errors);
        return;
      }

      const validatedData = validationResult.data;
      logger.info(editingSubcategory ? 'Updating subcategory' : 'Creating subcategory:', { name: validatedData.name });

      let response;
      if (editingSubcategory) {
        response = await categoriesAPI.updateSubcategory(
          editingSubcategory.id,
          validatedData,
          user?.token
        );
      } else {
        response = await categoriesAPI.createSubcategory(
          validatedData,
          user?.token
        );
      }

      if (response.success) {
        logger.info('Subcategory saved successfully:', { name: validatedData.name });
        toast.success(
          editingSubcategory
            ? 'Subcategory updated successfully'
            : 'Subcategory created successfully'
        );
        setIsSubcategoryDialogOpen(false);
        fetchCategories();
      } else {
        logger.error('Subcategory save failed:', response.message);
        toast.error(response.message || 'Failed to save subcategory');
      }
    } catch (error) {
      logger.error('Error saving subcategory:', error);
      toast.error('Failed to save subcategory');
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!deleteSubcategoryId) return;

    try {
      const response = await categoriesAPI.deleteSubcategory(
        deleteSubcategoryId,
        user?.token
      );
      if (response.success) {
        toast.success('Subcategory deleted successfully');
        setDeleteSubcategoryId(null);
        fetchCategories();
      } else {
        toast.error(response.message || 'Failed to delete subcategory');
        setDeleteSubcategoryId(null);
      }
    } catch (error) {
      logger.error('Error deleting subcategory:', error);
      toast.error('Failed to delete subcategory');
      setDeleteSubcategoryId(null);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader message="Loading categories & subcategories..." />
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
              <h1 className="text-3xl font-bold">Category Management</h1>
              <p className="text-muted-foreground">
                Manage product categories and subcategories
              </p>
            </div>
            <Button onClick={handleAddCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          {/* Categories List */}
          <div className="grid gap-4">
            {categories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Categories</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by creating your first category
                  </p>
                  <Button onClick={handleAddCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Category
                  </Button>
                </CardContent>
              </Card>
            ) : (
              categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Folder className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-xl">{category.name}</CardTitle>
                          {category.description && (
                            <CardDescription className="mt-1">
                              {category.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Package className="h-3 w-3 mr-1" />
                          {category._count?.products || 0} products
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditCategory(category)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Category
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAddSubcategory(category.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Subcategory
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteCategoryId(category.id)}
                              disabled={category._count?.products > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Category
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {category.subcategories && category.subcategories.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Subcategories:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {category.subcategories.map((subcategory) => (
                            <div
                              key={subcategory.id}
                              className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent"
                            >
                              <div className="flex items-center gap-2">
                                <FolderTree className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="text-sm font-medium">
                                    {subcategory.name}
                                  </div>
                                  {subcategory._count?.products > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      {subcategory._count.products} products
                                    </div>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleEditSubcategory(subcategory, category.id)
                                    }
                                  >
                                    <Edit className="h-3 w-3 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeleteSubcategoryId(subcategory.id)}
                                    disabled={subcategory._count?.products > 0}
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No subcategories yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleAddSubcategory(category.id)}
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          Add Subcategory
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Category Dialog */}
          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory
                    ? 'Update category information'
                    : 'Create a new product category'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name *</Label>
                  <Input
                    id="category-name"
                    value={categoryFormData.name}
                    onChange={(e) => {
                      setCategoryFormData({
                        ...categoryFormData,
                        name: e.target.value,
                      });
                      if (categoryErrors.name) {
                        setCategoryErrors({ ...categoryErrors, name: null });
                      }
                    }}
                    className={categoryErrors.name ? 'border-destructive' : ''}
                    placeholder="e.g., Electronics"
                    required
                  />
                  {categoryErrors.name && (
                    <p className="text-sm text-destructive">{categoryErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-description">Description</Label>
                  <Textarea
                    id="category-description"
                    value={categoryFormData.description}
                    onChange={(e) =>
                      setCategoryFormData({
                        ...categoryFormData,
                        description: e.target.value,
                      })
                    }
                    className={categoryErrors.description ? 'border-destructive' : ''}
                    placeholder="Optional description"
                    rows={3}
                    onChange={(e) => {
                      setCategoryFormData({
                        ...categoryFormData,
                        description: e.target.value,
                      });
                      if (categoryErrors.description) {
                        setCategoryErrors({ ...categoryErrors, description: null });
                      }
                    }}
                  />
                  {categoryErrors.description && (
                    <p className="text-sm text-destructive">{categoryErrors.description}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCategoryDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveCategory}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Subcategory Dialog */}
          <Dialog
            open={isSubcategoryDialogOpen}
            onOpenChange={setIsSubcategoryDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSubcategory
                    ? 'Edit Subcategory'
                    : 'Add New Subcategory'}
                </DialogTitle>
                <DialogDescription>
                  {editingSubcategory
                    ? 'Update subcategory information'
                    : 'Create a new subcategory for this category'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subcategory-name">Subcategory Name *</Label>
                  <Input
                    id="subcategory-name"
                    value={subcategoryFormData.name}
                    onChange={(e) => {
                      setSubcategoryFormData({
                        ...subcategoryFormData,
                        name: e.target.value,
                      });
                      if (subcategoryErrors.name) {
                        setSubcategoryErrors({ ...subcategoryErrors, name: null });
                      }
                    }}
                    className={subcategoryErrors.name ? 'border-destructive' : ''}
                    placeholder="e.g., Smartphones"
                    required
                  />
                  {subcategoryErrors.name && (
                    <p className="text-sm text-destructive">{subcategoryErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory-description">Description</Label>
                  <Textarea
                    id="subcategory-description"
                    value={subcategoryFormData.description}
                    onChange={(e) => {
                      setSubcategoryFormData({
                        ...subcategoryFormData,
                        description: e.target.value,
                      });
                      if (subcategoryErrors.description) {
                        setSubcategoryErrors({ ...subcategoryErrors, description: null });
                      }
                    }}
                    className={subcategoryErrors.description ? 'border-destructive' : ''}
                    placeholder="Optional description"
                    rows={3}
                  />
                  {subcategoryErrors.description && (
                    <p className="text-sm text-destructive">{subcategoryErrors.description}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsSubcategoryDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveSubcategory}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Category Confirmation */}
          <AlertDialog
            open={!!deleteCategoryId}
            onOpenChange={(open) => !open && setDeleteCategoryId(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this category? This action
                  cannot be undone. Categories with products cannot be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteCategoryId(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteCategory}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete Subcategory Confirmation */}
          <AlertDialog
            open={!!deleteSubcategoryId}
            onOpenChange={(open) => !open && setDeleteSubcategoryId(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this subcategory? This action
                  cannot be undone. Subcategories with products cannot be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteSubcategoryId(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteSubcategory}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

