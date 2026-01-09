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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, X } from 'lucide-react';
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
  const [enabledFields, setEnabledFields] = useState({
    modelType: false,
    packType: false,
    size: false,
    weight: false,
  });
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subcategoryId: '',
    barcode: '',
    mrp: '',
    salePrice: '',
    modelType: [],
    packType: [],
    size: [],
    weight: [],
    quantity: '',
    minStockLevel: '',
    allowNegativeStock: true,
    shelfId: '',
    description: '',
    image: '',
  });
  const [tempInputs, setTempInputs] = useState({
    modelType: '',
    packType: '',
    size: '',
    weight: '',
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
      // Convert arrays to comma-separated strings
      const modelTypeStr = Array.isArray(formData.modelType) && formData.modelType.length > 0
        ? formData.modelType.join(', ')
        : null;
      const packTypeStr = Array.isArray(formData.packType) && formData.packType.length > 0
        ? formData.packType.join(', ')
        : null;
      const sizeStr = Array.isArray(formData.size) && formData.size.length > 0
        ? formData.size.join(', ')
        : null;
      const weightStr = Array.isArray(formData.weight) && formData.weight.length > 0
        ? formData.weight.join(', ')
        : null;

      // Prepare data for validation
      const dataToValidate = {
        ...formData,
        mrp: formData.mrp ? Number(formData.mrp) : 0,
        salePrice: formData.salePrice ? Number(formData.salePrice) : null,
        modelType: modelTypeStr,
        packType: packTypeStr,
        size: sizeStr,
        weight: weightStr,
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
        size: validatedData.size || null,
        weight: validatedData.weight || null,
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

  const validateField = (field, value, currentFormData = formData) => {
    const fieldErrors = { ...errors };
    
    switch (field) {
      case 'name':
        if (!value || value.trim() === '') {
          fieldErrors.name = 'Product name is required';
        } else if (value.length > 200) {
          fieldErrors.name = 'Product name must be less than 200 characters';
        } else {
          delete fieldErrors.name;
        }
        break;
        
      case 'categoryId':
        if (!value) {
          fieldErrors.categoryId = 'Please select a category';
        } else {
          delete fieldErrors.categoryId;
        }
        break;
        
      case 'barcode':
        if (!value || value.trim() === '') {
          fieldErrors.barcode = 'Barcode is required';
        } else if (value.length > 50) {
          fieldErrors.barcode = 'Barcode must be less than 50 characters';
        } else if (!/^[0-9]+$/.test(value)) {
          fieldErrors.barcode = 'Barcode must contain only numbers';
        } else {
          delete fieldErrors.barcode;
        }
        break;
        
      case 'mrp':
        if (!value || value === '') {
          fieldErrors.mrp = 'MRP is required';
        } else {
          const num = Number(value);
          if (isNaN(num)) {
            fieldErrors.mrp = 'MRP must be a number';
          } else if (num < 0) {
            fieldErrors.mrp = 'MRP cannot be negative';
          } else if (num > 999999.99) {
            fieldErrors.mrp = 'MRP is too large (max: 999999.99)';
          } else {
            delete fieldErrors.mrp;
            // Re-validate sale price if it exists (check if sale price > mrp)
            if (currentFormData.salePrice && currentFormData.salePrice !== '') {
              const salePriceNum = Number(currentFormData.salePrice);
              if (!isNaN(salePriceNum) && salePriceNum > num) {
                fieldErrors.salePrice = 'Sale price should be less than or equal to MRP';
              } else if (fieldErrors.salePrice === 'Sale price should be less than or equal to MRP') {
                delete fieldErrors.salePrice;
              }
            }
          }
        }
        break;
        
      case 'salePrice':
        if (value && value !== '') {
          const num = Number(value);
          if (isNaN(num)) {
            fieldErrors.salePrice = 'Sale price must be a number';
          } else if (num < 0) {
            fieldErrors.salePrice = 'Sale price cannot be negative';
          } else if (num > 999999.99) {
            fieldErrors.salePrice = 'Sale price is too large (max: 999999.99)';
          } else {
            const mrp = Number(currentFormData.mrp);
            if (!isNaN(mrp) && mrp > 0 && num > mrp) {
              fieldErrors.salePrice = 'Sale price should be less than or equal to MRP';
            } else {
              delete fieldErrors.salePrice;
            }
          }
        } else {
          delete fieldErrors.salePrice;
        }
        break;
        
      case 'quantity':
        if (value && value !== '') {
          const num = Number(value);
          if (isNaN(num) || !Number.isInteger(num)) {
            fieldErrors.quantity = 'Quantity must be a whole number';
          } else if (num < 0) {
            fieldErrors.quantity = 'Quantity cannot be negative';
          } else {
            delete fieldErrors.quantity;
          }
        } else {
          delete fieldErrors.quantity;
        }
        break;
        
      case 'minStockLevel':
        if (value && value !== '') {
          const num = Number(value);
          if (isNaN(num) || !Number.isInteger(num)) {
            fieldErrors.minStockLevel = 'Minimum stock level must be a whole number';
          } else if (num < 0) {
            fieldErrors.minStockLevel = 'Minimum stock level cannot be negative';
          } else {
            delete fieldErrors.minStockLevel;
          }
        } else {
          delete fieldErrors.minStockLevel;
        }
        break;
        
      case 'description':
        if (value && value.length > 5000) {
          fieldErrors.description = 'Description must be less than 5000 characters';
        } else {
          delete fieldErrors.description;
        }
        break;
        
      default:
        break;
    }
    
    setErrors(fieldErrors);
    return fieldErrors;
  };

  const handleChange = (field, value) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    
    // Validate field in real-time with updated form data
    validateField(field, value, updatedFormData);
    
    if (field === 'categoryId') {
      setSubCategoryList(
        categories?.find((cat) => cat.id === value)?.subcategories || []
      );
      setFormData((prev) => ({ ...prev, subcategoryId: '' }));
    }
  };

  const handleBlur = (field, value) => {
    // Validate on blur for better UX
    validateField(field, value, formData);
  };

  // Chip management functions
  const handleChipAdd = (field, value) => {
    if (!value || value.trim() === '') return;
    
    const trimmedValue = value.trim();
    const currentArray = formData[field] || [];
    
    // Check if value already exists
    if (currentArray.includes(trimmedValue)) {
      toast.error(`${field} "${trimmedValue}" already exists`);
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      [field]: [...currentArray, trimmedValue],
    }));
    
    setTempInputs((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const handleChipDelete = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleChipEdit = (field, index) => {
    const currentArray = formData[field] || [];
    const valueToEdit = currentArray[index];
    
    // Remove the chip and put value in input
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
    
    setTempInputs((prev) => ({
      ...prev,
      [field]: valueToEdit,
    }));
  };

  const handleChipInputKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleChipAdd(field, tempInputs[field]);
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
                    onBlur={(e) => handleBlur('name', e.target.value)}
                    className={errors.name ? 'border-destructive' : ''}
                    required
                    maxLength={200}
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

                {/* Attribute Type Checkboxes */}
                <div className="space-y-3">
                  <Label>Product Attributes (Optional)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enableModelType"
                        checked={enabledFields.modelType}
                        onCheckedChange={(checked) => {
                          setEnabledFields((prev) => ({ ...prev, modelType: checked }));
                          if (!checked) {
                            setFormData((prev) => ({ ...prev, modelType: [] }));
                            setTempInputs((prev) => ({ ...prev, modelType: '' }));
                          }
                        }}
                      />
                      <Label htmlFor="enableModelType" className="font-normal cursor-pointer">
                        Model Type
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enablePackType"
                        checked={enabledFields.packType}
                        onCheckedChange={(checked) => {
                          setEnabledFields((prev) => ({ ...prev, packType: checked }));
                          if (!checked) {
                            setFormData((prev) => ({ ...prev, packType: [] }));
                            setTempInputs((prev) => ({ ...prev, packType: '' }));
                          }
                        }}
                      />
                      <Label htmlFor="enablePackType" className="font-normal cursor-pointer">
                        Pack Type
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enableSize"
                        checked={enabledFields.size}
                        onCheckedChange={(checked) => {
                          setEnabledFields((prev) => ({ ...prev, size: checked }));
                          if (!checked) {
                            setFormData((prev) => ({ ...prev, size: [] }));
                            setTempInputs((prev) => ({ ...prev, size: '' }));
                          }
                        }}
                      />
                      <Label htmlFor="enableSize" className="font-normal cursor-pointer">
                        Size
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enableWeight"
                        checked={enabledFields.weight}
                        onCheckedChange={(checked) => {
                          setEnabledFields((prev) => ({ ...prev, weight: checked }));
                          if (!checked) {
                            setFormData((prev) => ({ ...prev, weight: [] }));
                            setTempInputs((prev) => ({ ...prev, weight: '' }));
                          }
                        }}
                      />
                      <Label htmlFor="enableWeight" className="font-normal cursor-pointer">
                        Weight
                      </Label>
                    </div>
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
                        onBlur={(e) => handleBlur('barcode', e.target.value)}
                        className={errors.barcode ? 'border-destructive' : ''}
                        required
                        maxLength={50}
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
                      min="0"
                      max="999999.99"
                      placeholder="999.99"
                      value={formData.mrp}
                      onChange={(e) => handleChange('mrp', e.target.value)}
                      onBlur={(e) => handleBlur('mrp', e.target.value)}
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
                      min="0"
                      max="999999.99"
                      placeholder="949.99"
                      value={formData.salePrice}
                      onChange={(e) => handleChange('salePrice', e.target.value)}
                      onBlur={(e) => handleBlur('salePrice', e.target.value)}
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

                {/* Attribute Fields - 2 Column Layout when 2+ fields enabled */}
                {(enabledFields.modelType || enabledFields.packType || enabledFields.size || enabledFields.weight) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Model Type Field */}
                    {enabledFields.modelType && (
                      <div className="space-y-2">
                        <Label htmlFor="modelType">Model Type</Label>
                        <Input
                          id="modelType"
                          placeholder="Enter model type and press Enter"
                          value={tempInputs.modelType}
                          onChange={(e) =>
                            setTempInputs((prev) => ({ ...prev, modelType: e.target.value }))
                          }
                          onKeyDown={(e) => handleChipInputKeyDown(e, 'modelType')}
                          disabled={!enabledFields.modelType}
                        />
                        {formData.modelType.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.modelType.map((value, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={() => handleChipEdit('modelType', index)}
                              >
                                {value}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChipDelete('modelType', index);
                                  }}
                                  className="ml-2 hover:bg-secondary/60 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pack Type Field */}
                    {enabledFields.packType && (
                      <div className="space-y-2">
                        <Label htmlFor="packType">Pack Type</Label>
                        <Input
                          id="packType"
                          placeholder="Enter pack type and press Enter"
                          value={tempInputs.packType}
                          onChange={(e) =>
                            setTempInputs((prev) => ({ ...prev, packType: e.target.value }))
                          }
                          onKeyDown={(e) => handleChipInputKeyDown(e, 'packType')}
                          disabled={!enabledFields.packType}
                        />
                        {formData.packType.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.packType.map((value, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={() => handleChipEdit('packType', index)}
                              >
                                {value}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChipDelete('packType', index);
                                  }}
                                  className="ml-2 hover:bg-secondary/60 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Size Field */}
                    {enabledFields.size && (
                      <div className="space-y-2">
                        <Label htmlFor="size">Size</Label>
                        <Input
                          id="size"
                          placeholder="Enter size and press Enter"
                          value={tempInputs.size}
                          onChange={(e) =>
                            setTempInputs((prev) => ({ ...prev, size: e.target.value }))
                          }
                          onKeyDown={(e) => handleChipInputKeyDown(e, 'size')}
                          disabled={!enabledFields.size}
                        />
                        {formData.size.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.size.map((value, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={() => handleChipEdit('size', index)}
                              >
                                {value}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChipDelete('size', index);
                                  }}
                                  className="ml-2 hover:bg-secondary/60 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Weight Field */}
                    {enabledFields.weight && (
                      <div className="space-y-2">
                        <Label htmlFor="weight">Weight</Label>
                        <Input
                          id="weight"
                          placeholder="Enter weight and press Enter"
                          value={tempInputs.weight}
                          onChange={(e) =>
                            setTempInputs((prev) => ({ ...prev, weight: e.target.value }))
                          }
                          onKeyDown={(e) => handleChipInputKeyDown(e, 'weight')}
                          disabled={!enabledFields.weight}
                        />
                        {formData.weight.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.weight.map((value, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={() => handleChipEdit('weight', index)}
                              >
                                {value}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChipDelete('weight', index);
                                  }}
                                  className="ml-2 hover:bg-secondary/60 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="150"
                      value={formData.quantity}
                      onChange={(e) => handleChange('quantity', e.target.value)}
                      onBlur={(e) => handleBlur('quantity', e.target.value)}
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
                      min="0"
                      step="1"
                      placeholder="5"
                      value={formData.minStockLevel}
                      onChange={(e) => handleChange('minStockLevel', e.target.value)}
                      onBlur={(e) => handleBlur('minStockLevel', e.target.value)}
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
                    onBlur={(e) => handleBlur('description', e.target.value)}
                    className={errors.description ? 'border-destructive' : ''}
                    maxLength={5000}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                  {formData.description && (
                    <p className="text-xs text-muted-foreground">
                      {formData.description.length}/5000 characters
                    </p>
                  )}
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
