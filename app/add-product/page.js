'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import AdminLayout from '@/components/admin-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function AddProductPage() {
  const router = useRouter();
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

  const categories = [
    'Electronics',
    'Groceries',
    'Clothing',
    'Books',
    'Home Goods',
  ];
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

  const subcategories = {
    Electronics: ['Laptops', 'Smartphones', 'Accessories', 'Audio'],
    Groceries: ['Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Meat'],
    Clothing: ['Shorts', 'Pants', 'Saree', 'Kurta', 'Shirts', 'Dresses'],
    Books: ['Fiction', 'Non-Fiction', 'Textbooks', 'Comics'],
    'Home Goods': ['Furniture', 'Decor', 'Kitchen', 'Bathroom'],
  };

  const getSubcategories = (category) => {
    return subcategories[category] || [];
  };

  const generateBarcode = () => {
    const barcode = Math.floor(
      100000000000 + Math.random() * 900000000000
    ).toString();
    setFormData({ ...formData, barcode });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Product added successfully!');
        router.push('/inventory');
      } else {
        toast.error('Failed to add product');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Add/Edit Product</h1>
            <p className="text-muted-foreground">
              Manage product details and inventory information.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Enter the details of the product below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    placeholder="Organic Whole Milk"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleChange('category', value)}
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
                        handleChange('subcategory', value)
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
                    <div className="flex gap-2">
                      <Input
                        id="barcode"
                        placeholder="123456789012"
                        value={formData.barcode}
                        onChange={(e) =>
                          handleChange('barcode', e.target.value)
                        }
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateBarcode}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shelf">Shelf Location</Label>
                    <Select
                      value={formData.shelf}
                      onValueChange={(value) => handleChange('shelf', value)}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="150"
                      value={formData.quantity}
                      onChange={(e) => handleChange('quantity', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price/Value (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="4.99"
                      value={formData.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description/Notes</Label>
                  <Textarea
                    id="description"
                    placeholder="Organic Whole Milk, 1 Gallon. Refrigerate after opening. Best by date printed on bottle."
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      handleChange('description', e.target.value)
                    }
                  />
                </div>

                <div className="flex gap-4 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Product</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
