'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import AdminLayout from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, MoreVertical, Edit, Trash2, Plus } from 'lucide-react';
import { mockProducts } from '@/lib/mock-data';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shelfFilter, setShelfFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subcategory: '',
    barcode: '',
    quantity: '',
    price: '',
    shelf: '',
    description: '',
  });

  // Subcategories for editing (same as add-product)
  const categories = [
    'Electronics',
    'Groceries',
    'Clothing',
    'Books',
    'Home Goods',
  ];
  const subcategories = {
    Electronics: ['Laptops', 'Smartphones', 'Accessories', 'Audio'],
    Groceries: ['Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Meat'],
    Clothing: ['Shorts', 'Pants', 'Saree', 'Kurta', 'Shirts', 'Dresses'],
    Books: ['Fiction', 'Non-Fiction', 'Textbooks', 'Comics'],
    'Home Goods': ['Furniture', 'Decor', 'Kitchen', 'Bathroom'],
  };
  const getSubcategories = (category) => subcategories[category] || [];
  const shelves = [
    'A1',
    'A2',
    'A3',
    'A4',
    'B1',
    'B2',
    'B3',
    'B4',
    'C1',
    'C2',
    'C3',
    'C4',
    'D1',
    'D2',
    'D3',
    'D4',
  ];

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm);
    const matchesCategory =
      categoryFilter === 'all' || product.category === categoryFilter;
    const matchesShelf = shelfFilter === 'all' || product.shelf === shelfFilter;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && product.quantity < 10) ||
      (stockFilter === 'out' && product.quantity === 0);

    return matchesSearch && matchesCategory && matchesShelf && matchesStock;
  });

  const handleDelete = (id) => {
    toast.success('Product deleted successfully');
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory,
      barcode: product.barcode,
      quantity: product.quantity.toString(),
      price: product.price.toString(),
      shelf: product.shelf,
      description: product.description,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Product updated successfully');
        setIsEditModalOpen(false);
        // Refresh the page or update local state
        window.location.reload();
      } else {
        toast.error('Failed to update product');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Inventory Overview</h1>
              <p className="text-muted-foreground">
                Manage your product inventory
              </p>
            </div>
            <Link href="/add-product">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Product
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={shelfFilter} onValueChange={setShelfFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Shelf" />
                  </SelectTrigger>
                  <SelectContent>
                    {shelves.map((shelf) => (
                      <SelectItem key={shelf} value={shelf}>
                        {shelf === 'all' ? 'All Shelves' : shelf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Levels</SelectItem>
                    <SelectItem value="low">Low Stock (&lt; 10)</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Product Listing */}
          <Card>
            <CardHeader>
              <CardTitle>Product Listing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Shelf Location</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="w-12 h-12 relative rounded overflow-hidden bg-muted">
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {product.barcode}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                product.quantity < 10
                                  ? 'destructive'
                                  : 'default'
                              }
                            >
                              {product.quantity}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {product.shelf}
                          </TableCell>
                          <TableCell className="font-medium">
                            ${product.price.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() => handleEdit(product)}
                                >
                                  {/* <Edit className="h-4 w-4 mr-2" /> */}
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  {/* <Trash2 className="h-4 w-4 mr-2" /> */}
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No products found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredProducts.length} of {mockProducts.length}{' '}
                  products
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleFormChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select
                  value={formData.subcategory}
                  onValueChange={(value) =>
                    handleFormChange('subcategory', value)
                  }
                  disabled={!formData.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSubcategories(formData.category).map((subcat) => (
                      <SelectItem key={subcat} value={subcat}>
                        {subcat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => handleFormChange('barcode', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      handleFormChange('quantity', e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price/Value (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleFormChange('price', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shelf">Shelf Location</Label>
                <Select
                  value={formData.shelf}
                  onValueChange={(value) => handleFormChange('shelf', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shelf location" />
                  </SelectTrigger>
                  <SelectContent>
                    {shelves.map((shelf) => (
                      <SelectItem key={shelf} value={shelf}>
                        {shelf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description/Notes</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  handleFormChange('description', e.target.value)
                }
              />
            </div>

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
