'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import RoleBasedLayout from '@/components/role-based-layout';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { productsAPI, shelvesAPI } from '@/lib/api';
import logger from '@/lib/logger';
import { productSchema, formatZodError, getFieldErrors } from '@/lib/validations';

export default function AddProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { categories } = useCommon();
  const [subCategoryList, setSubCategoryList] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [loadingShelves, setLoadingShelves] = useState(true);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subcategoryId: '',
    barcode: '',
    mrp: '',
    salePrice: '',
    modelType: '',
    packType: '',
    quantity: '',
    minStockLevel: '',
    allowNegativeStock: true,
    shelfId: '',
    description: '',
    image: '',
  });

  useEffect(() => {
    if (formData.categoryId && categories?.length) {
      const selectedCategory =
        categories.find((cat) => cat.id === formData.categoryId) || null;
      setSubCategoryList(selectedCategory?.subcategories || []);
    } else {
      setSubCategoryList([]);
    }
  }, [formData.categoryId, categories]);

  useEffect(() => {
    const fetchShelves = async () => {
      if (!user?.token) {
        setLoadingShelves(false);
        return;
      }
      try {
        setLoadingShelves(true);
        const response = await shelvesAPI.getAll(user.token);
        if (response.success) {
          setShelves(response.data || []);
        } else {
          logger.error('Failed to fetch shelves:', response.message);
          toast.error('Failed to load shelf locations');
        }
      } catch (error) {
        logger.error('Error fetching shelves:', error);
        toast.error('Failed to load shelf locations');
      } finally {
        setLoadingShelves(false);
      }
    };
    fetchShelves();
  }, [user?.token]);

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
        mrp: formData.mrp ? Number(formData.mrp) : 0,
        salePrice: formData.salePrice ? Number(formData.salePrice) : null,
        modelType: formData.modelType || null,
        packType: formData.packType || null,
        quantity: formData.quantity ? Number(formData.quantity) : 0,
        minStockLevel: formData.minStockLevel ? Number(formData.minStockLevel) : null,
        allowNegativeStock: formData.allowNegativeStock !== undefined ? formData.allowNegativeStock : true,
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
        mrp: validatedData.mrp,
        salePrice: validatedData.salePrice || null,
        modelType: validatedData.modelType || null,
        packType: validatedData.packType || null,
        quantity: validatedData.quantity || 0,
        minStockLevel: validatedData.minStockLevel || null,
        allowNegativeStock: validatedData.allowNegativeStock !== undefined ? validatedData.allowNegativeStock : true,
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
    <ProtectedRoute allowedRoles={['admin', 'user']}>
      <RoleBasedLayout>
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
                        {loadingShelves ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading shelves...</div>
                        ) : shelves.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No shelves available. Create shelves first.</div>
                        ) : (
                          shelves.map((shelf) => (
                            <SelectItem key={shelf.id} value={shelf.id}>
                              {shelf.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mrp">MRP (Maximum Retail Price)</Label>
                    <Input
                      id="mrp"
                      type="number"
                      step="0.01"
                      placeholder="999.99"
                      value={formData.mrp}
                      onChange={(e) => handleChange('mrp', e.target.value)}
                      className={errors.mrp ? 'border-destructive' : ''}
                      required
                    />
                    {errors.mrp && (
                      <p className="text-sm text-destructive">{errors.mrp}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Sale Price (Optional)</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      placeholder="949.99"
                      value={formData.salePrice}
                      onChange={(e) => handleChange('salePrice', e.target.value)}
                      className={errors.salePrice ? 'border-destructive' : ''}
                    />
                    {errors.salePrice && (
                      <p className="text-sm text-destructive">{errors.salePrice}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Leave empty if no special offer price
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modelType">Model Type</Label>
                    <Select
                      value={formData.modelType}
                      onValueChange={(value) => handleChange('modelType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLAIN">Plain</SelectItem>
                        <SelectItem value="DESIGN">Design</SelectItem>
                        <SelectItem value="TWO_D">2D</SelectItem>
                        <SelectItem value="THREE_D">3D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="packType">Pack Type</Label>
                    <Select
                      value={formData.packType}
                      onValueChange={(value) => handleChange('packType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pack type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PACK">Pack</SelectItem>
                        <SelectItem value="LOOSE">Loose</SelectItem>
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
                    />
                    {errors.quantity && (
                      <p className="text-sm text-destructive">{errors.quantity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minStockLevel">Minimum Stock Level (Optional)</Label>
                    <Input
                      id="minStockLevel"
                      type="number"
                      placeholder="5"
                      value={formData.minStockLevel}
                      onChange={(e) => handleChange('minStockLevel', e.target.value)}
                      className={errors.minStockLevel ? 'border-destructive' : ''}
                    />
                    {errors.minStockLevel && (
                      <p className="text-sm text-destructive">{errors.minStockLevel}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Override category default. Leave empty to use category default.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowNegativeStock"
                      checked={formData.allowNegativeStock}
                      onCheckedChange={(checked) => handleChange('allowNegativeStock', checked)}
                    />
                    <Label htmlFor="allowNegativeStock" className="font-normal cursor-pointer">
                      Allow negative stock (allow sales when stock is 0)
                    </Label>
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
      </RoleBasedLayout>
    </ProtectedRoute>
  );
}
