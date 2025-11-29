'use client';

import { useEffect, useState } from 'react';
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
import { useCommon } from '@/lib/common-context';
import { useAuth } from '@/lib/auth-context';
import ImageUpload from '@/components/image-upload';
import { productsAPI } from '@/lib/api';
import logger from '@/lib/logger';
import { productSchema, formatZodError, getFieldErrors } from '@/lib/validations';

export default function AddProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { categories } = useCommon();
  const [subCategoryList, setSubCategoryList] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subcategoryId: '',
    barcode: '',
    quantity: '',
    price: '',
    shelfId: '',
    description: '',
    image: '',
  });

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

  useEffect(() => {
    if (formData.categoryId && categories?.length) {
      const selectedCategory =
        categories.find((cat) => cat.id === formData.categoryId) || null;
      setSubCategoryList(selectedCategory?.subcategories || []);
    } else {
      setSubCategoryList([]);
    }
  }, [formData.categoryId, categories]);

  const generateBarcode = () => {
    const barcode = Math.floor(
      100000000000 + Math.random() * 900000000000
    ).toString();
    setFormData((prev) => ({ ...prev, barcode }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!user?.token) {
      toast.error('You must be logged in to add products');
      router.push('/login');
      return;
    }

    try {
      // Prepare data for validation
      const dataToValidate = {
        ...formData,
        quantity: formData.quantity ? Number(formData.quantity) : 0,
        price: formData.price ? Number(formData.price) : 0,
        subcategoryId: formData.subcategoryId || undefined,
        shelfId: formData.shelfId || undefined,
        description: formData.description || undefined,
        image: formData.image || undefined,
      };

      // Validate input
      const validationResult = productSchema.safeParse(dataToValidate);

      if (!validationResult.success) {
        const fieldErrors = getFieldErrors(validationResult.error);
        setErrors(fieldErrors);
        const firstError = formatZodError(validationResult.error);
        toast.error(firstError);
        logger.warn('Product validation failed:', validationResult.error.errors);
        return;
      }

      const validatedData = validationResult.data;
      logger.info('Creating product:', { name: validatedData.name, barcode: validatedData.barcode });

      const payload = {
        name: validatedData.name,
        categoryId: validatedData.categoryId,
        subcategoryId: validatedData.subcategoryId || undefined,
        barcode: validatedData.barcode,
        quantity: validatedData.quantity,
        price: validatedData.price,
        shelfId: validatedData.shelfId || null,
        description: validatedData.description || null,
        image: validatedData.image || null,
      };

      const response = await productsAPI.create(payload, user.token);

      if (response.success) {
        logger.info('Product created successfully:', { name: validatedData.name });
        toast.success('Product added successfully!');
        router.push('/inventory');
      } else {
        logger.error('Product creation failed:', response.message);
        toast.error(response.message || 'Failed to add product');
      }
    } catch (error) {
      logger.error('Error creating product:', error);
      toast.error('An error occurred while adding the product');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (field === 'categoryId') {
      setSubCategoryList(
        categories?.find((cat) => cat.id === value)?.subcategories || []
      );
      setFormData((prev) => ({ ...prev, subcategoryId: '' }));
    }
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
                    className={errors.name ? 'border-destructive' : ''}
                    required
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                    value={formData.categoryId}
                    onValueChange={(value) => handleChange('categoryId', value)}
                    >
                      <SelectTrigger className={errors.categoryId ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && (
                      <p className="text-sm text-destructive">{errors.categoryId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Subcategory</Label>
                    <Select
                    value={formData.subcategoryId}
                      onValueChange={(value) =>
                      handleChange('subcategoryId', value)
                      }
                    disabled={!formData.categoryId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {subCategoryList?.map((subcat) => (
                          <SelectItem key={subcat?.id} value={subcat?.id}>
                            {subcat?.name}
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
                        className={errors.barcode ? 'border-destructive' : ''}
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
                    {errors.barcode && (
                      <p className="text-sm text-destructive">{errors.barcode}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shelf">Shelf Location</Label>
                    <Select
                    value={formData.shelfId}
                    onValueChange={(value) => handleChange('shelfId', value)}
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
                      className={errors.quantity ? 'border-destructive' : ''}
                      required
                    />
                    {errors.quantity && (
                      <p className="text-sm text-destructive">{errors.quantity}</p>
                    )}
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
                      className={errors.price ? 'border-destructive' : ''}
                      required
                    />
                    {errors.price && (
                      <p className="text-sm text-destructive">{errors.price}</p>
                    )}
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

                <ImageUpload
                  value={formData.image}
                  onChange={(imageUrl) => handleChange('image', imageUrl)}
                  label="Product Image"
                />

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
