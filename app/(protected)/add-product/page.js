'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ProtectedRoute from '@/components/protected-route';
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
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RefreshCw, X, Plus, Trash2, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
  const [errors, setErrors] = useState({});
  const [productMode, setProductMode] = useState('single'); // 'single' or 'multiple'
  const [enabledFields, setEnabledFields] = useState({
    modelType: false,
    packType: false,
    size: false,
    weight: false,
  });
  const [variants, setVariants] = useState([
    {
      id: 1,
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
      isExpanded: true, // New variant starts expanded
    },
  ]);
  const [variantTempInputs, setVariantTempInputs] = useState([
    {
      id: 1,
      modelType: '',
      packType: '',
      size: '',
      weight: '',
    },
  ]);
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
    showOnWebsite: false,
    hidePrice: false,
    websiteSlug: '',
    websiteImages: [],
  });
  const [tempInputs, setTempInputs] = useState({
    modelType: '',
    packType: '',
    size: '',
    weight: '',
  });
  const [barcodeStatus, setBarcodeStatus] = useState(null); // null | 'checking' | 'duplicate' | 'available'

  useEffect(() => {
    if (formData.categoryId && categories?.length) {
      const selectedCategory =
        categories.find((cat) => cat.id === formData.categoryId) || null;
      setSubCategoryList(selectedCategory?.subcategories || []);
    } else {
      setSubCategoryList([]);
    }
  }, [formData.categoryId, categories]);

  const { data: shelves = [], isLoading: loadingShelves } = useQuery({
    queryKey: ['shelves'],
    queryFn: async () => {
      const response = await shelvesAPI.getAll(user.token);
      if (!response.success) throw new Error(response.message || 'Failed to load shelf locations');
      return response.data || [];
    },
    enabled: !!user?.token,
  });

  const generateBarcode = () => {
    const barcode = Math.floor(
      100000000000 + Math.random() * 900000000000
    ).toString();
    setFormData((prev) => ({ ...prev, barcode }));
    // Clear barcode error when generating a new barcode
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.barcode;
      return newErrors;
    });
    setBarcodeStatus(null);
  };

  const checkBarcodeUniqueness = async (barcode) => {
    if (!barcode || !user?.token) return;
    setBarcodeStatus('checking');
    try {
      const response = await productsAPI.getAll(user.token, { search: barcode, limit: 5 });
      const found = response.data?.products || response.data || [];
      const isDuplicate = Array.isArray(found) && found.some(
        (p) => p.barcode === barcode || p.variants?.some((v) => v.barcode === barcode)
      );
      setBarcodeStatus(isDuplicate ? 'duplicate' : 'available');
    } catch {
      setBarcodeStatus(null);
    }
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
      // Check product mode FIRST before any validation
      if (productMode === 'single') {
        await handleSingleProductSubmit();
      } else {
        await handleMultipleProductsSubmit();
      }
    } catch (error) {
      logger.error('Error creating product:', error);
      toast.error('An error occurred while adding the product');
    }
  };

  const handleSingleProductSubmit = async () => {
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
      mrp: formData.mrp ? Number(formData.mrp) : null,
      salePrice: formData.salePrice ? Number(formData.salePrice) : null,
      modelType: modelTypeStr,
      packType: packTypeStr,
      size: sizeStr,
      weight: weightStr,
      quantity: formData.quantity ? Number(formData.quantity) : 0,
      minStockLevel: formData.minStockLevel && formData.minStockLevel !== '' ? Number(formData.minStockLevel) : null,
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
      showOnWebsite: validatedData.showOnWebsite ?? false,
      hidePrice: validatedData.hidePrice ?? false,
      websiteSlug: validatedData.websiteSlug || null,
      websiteImages: validatedData.websiteImages || [],
    };

    const response = await productsAPI.create(payload, user.token);

    if (response.success) {
      logger.info('Product created successfully:', { name: validatedData.name });
      toast.success('Product added successfully!');
      router.push('/inventory');
    } else {
      // Don't show error toast for session timeout - modal will handle it
      if (response.sessionExpired) {
        logger.warn('Session expired during product creation');
        return;
      }
      logger.error('Product creation failed:', response.message);
      toast.error(response.message || 'Failed to add product');
    }
  };

  const handleMultipleProductsSubmit = async () => {
    // Validate shared fields (name and category)
    if (!formData.name || !formData.name.trim()) {
      toast.error('Product name is required');
      setErrors({ name: 'Product name is required' });
      return;
    }

    if (!formData.categoryId) {
      toast.error('Category is required');
      setErrors({ categoryId: 'Category is required' });
      return;
    }

    // Validate all variants
    const variantErrors = {};
    let hasErrors = false;
    const missingBarcodeVariants = [];

    // Debug: Log variants for troubleshooting
    logger.info('Validating variants:', variants.map(v => ({ id: v.id, barcode: v.barcode, barcodeType: typeof v.barcode })));

    variants.forEach((variant, index) => {
      // Trim and check barcode
      const barcode = typeof variant.barcode === 'string' ? variant.barcode.trim() : '';
      
      // Debug: Log each variant's barcode
      logger.info(`Variant ${index + 1} (ID: ${variant.id}): barcode="${variant.barcode}", trimmed="${barcode}", isEmpty=${!barcode || barcode === ''}`);
      
      if (!barcode || barcode === '') {
        variantErrors[`variant_${variant.id}_barcode`] = 'Barcode is required';
        hasErrors = true;
        missingBarcodeVariants.push(index + 1);
        // Expand variant with error so user can see it
        setVariants(variants.map(v => 
          v.id === variant.id ? { ...v, isExpanded: true } : v
        ));
      } else if (!/^[0-9]+$/.test(barcode)) {
        variantErrors[`variant_${variant.id}_barcode`] = 'Barcode must contain only numbers';
        hasErrors = true;
        // Expand variant with error so user can see it
        setVariants(variants.map(v => 
          v.id === variant.id ? { ...v, isExpanded: true } : v
        ));
      }

      // Check for duplicate barcodes (only if current barcode is valid)
      if (barcode && barcode !== '') {
        const duplicateBarcode = variants.find((v, i) => {
          if (i === index) return false;
          const otherBarcode = typeof v.barcode === 'string' ? v.barcode.trim() : '';
          return otherBarcode === barcode && otherBarcode !== '';
        });
        if (duplicateBarcode) {
          variantErrors[`variant_${variant.id}_barcode`] = 'Barcode must be unique';
          hasErrors = true;
          // Expand variant with error so user can see it
          setVariants(variants.map(v => 
            v.id === variant.id ? { ...v, isExpanded: true } : v
          ));
        }
      }
    });

    if (hasErrors) {
      setErrors(variantErrors);
      if (missingBarcodeVariants.length > 0) {
        toast.error(`Barcode is required for variant(s): ${missingBarcodeVariants.join(', ')}. Please fill in the barcode for all variants.`);
      } else {
        toast.error('Please fix the errors in the variants');
      }
      return;
    }

    // Prepare all variant payloads - only include variants with valid barcodes
    const productPayloads = variants
      .map((variant) => {
        // Find any pending temp inputs for this variant (e.g. size typed but chip not added yet)
        const tempInput = variantTempInputs.find((v) => v.id === variant.id);
        // Debug: Log variant data before processing
        logger.info(`Processing variant ${variant.id}:`, {
          size: variant.size,
          sizeType: typeof variant.size,
          isArray: Array.isArray(variant.size),
          sizeLength: Array.isArray(variant.size) ? variant.size.length : 'N/A'
        });
        
        // Trim and validate barcode first
        const trimmedBarcode = typeof variant.barcode === 'string' ? variant.barcode.trim() : '';
        
        // Skip variants without valid barcodes (shouldn't happen due to validation above, but double-check)
        if (!trimmedBarcode || trimmedBarcode === '' || !/^[0-9]+$/.test(trimmedBarcode)) {
          logger.warn(`Skipping variant ${variant.id} - invalid barcode: "${variant.barcode}"`);
          return null;
        }

        // For variants, use first value from arrays (single value per variant)
        // Convert empty arrays to null, arrays with values to first value, or keep string/null as is
        // Also check temp inputs if no committed value
        let modelTypeStr = null;
        if (Array.isArray(variant.modelType)) {
          if (variant.modelType.length > 0) {
            const firstModelType = variant.modelType[0];
            modelTypeStr = firstModelType && String(firstModelType).trim() !== '' ? String(firstModelType).trim() : null;
          }
        } else if (variant.modelType && typeof variant.modelType === 'string') {
          modelTypeStr = variant.modelType.trim() !== '' ? variant.modelType.trim() : null;
        }
        // If no committed modelType chip but there is a temp modelType value, use that
        if (!modelTypeStr && tempInput?.modelType && String(tempInput.modelType).trim() !== '') {
          modelTypeStr = String(tempInput.modelType).trim();
        }
        
        let packTypeStr = null;
        if (Array.isArray(variant.packType)) {
          if (variant.packType.length > 0) {
            const firstPackType = variant.packType[0];
            packTypeStr = firstPackType && String(firstPackType).trim() !== '' ? String(firstPackType).trim() : null;
          }
        } else if (variant.packType && typeof variant.packType === 'string') {
          packTypeStr = variant.packType.trim() !== '' ? variant.packType.trim() : null;
        }
        // If no committed packType chip but there is a temp packType value, use that
        if (!packTypeStr && tempInput?.packType && String(tempInput.packType).trim() !== '') {
          packTypeStr = String(tempInput.packType).trim();
        }
        // Extract size - handle array, string, or null/undefined
        // Also fall back to any pending temp input value if user typed but didn't press Enter
        let sizeStr = null;
        if (Array.isArray(variant.size)) {
          if (variant.size.length > 0) {
            const firstSize = variant.size[0];
            sizeStr = firstSize && String(firstSize).trim() !== '' ? String(firstSize).trim() : null;
          }
        } else if (variant.size && typeof variant.size === 'string') {
          sizeStr = variant.size.trim() !== '' ? variant.size.trim() : null;
        }
        // If no committed size chip but there is a temp size value, use that
        if (!sizeStr && tempInput?.size && String(tempInput.size).trim() !== '') {
          sizeStr = String(tempInput.size).trim();
        }
        
        // Debug size extraction
        if (variant.size) {
          logger.info(`Variant ${variant.id} size extraction:`, {
            original: variant.size,
            extracted: sizeStr,
            type: typeof variant.size,
            isArray: Array.isArray(variant.size)
          });
        }
        // Extract weight - handle array, string, or null/undefined
        // Also fall back to any pending temp input value if user typed but didn't press Enter
        let weightStr = null;
        if (Array.isArray(variant.weight)) {
          if (variant.weight.length > 0) {
            const firstWeight = variant.weight[0];
            weightStr = firstWeight && String(firstWeight).trim() !== '' ? String(firstWeight).trim() : null;
          }
        } else if (variant.weight && typeof variant.weight === 'string') {
          weightStr = variant.weight.trim() !== '' ? variant.weight.trim() : null;
        }
        // If no committed weight chip but there is a temp weight value, use that
        if (!weightStr && tempInput?.weight && String(tempInput.weight).trim() !== '') {
          weightStr = String(tempInput.weight).trim();
        }
        
        // Debug: Log extracted values
        logger.info(`Variant ${variant.id} extracted values:`, {
          sizeStr,
          modelTypeStr,
          packTypeStr,
          weightStr
        });

        const payload = {
          // Variant-specific data (will be used to create variant with parentProductId)
          barcode: trimmedBarcode,
          size: sizeStr, // Single size per variant
          modelType: modelTypeStr, // Single model per variant
          packType: packTypeStr, // Single packType per variant
          weight: weightStr, // Single weight per variant
          mrp: variant.mrp ? Number(variant.mrp) : null,
          salePrice: variant.salePrice ? Number(variant.salePrice) : null,
          quantity: variant.quantity ? Number(variant.quantity) : 0,
          minStockLevel: variant.minStockLevel && variant.minStockLevel !== '' ? Number(variant.minStockLevel) : null,
          allowNegativeStock: variant.allowNegativeStock !== undefined ? variant.allowNegativeStock : true,
          shelfId: variant.shelfId || null,
          description: variant.description || null,
          image: variant.image || null,
        };
        
        // Debug: Log the payload before returning
        logger.info(`Variant ${variant.id} payload:`, payload);
        
        return payload;
      })
      .filter((payload) => payload !== null); // Remove any null entries (invalid variants)

    // Ensure we have at least one valid payload
    if (productPayloads.length === 0) {
      toast.error('No valid variants to add. Please ensure all variants have valid barcodes.');
      return;
    }

    // Validate variant payloads (simplified validation for variants)
    for (let i = 0; i < productPayloads.length; i++) {
      const payload = productPayloads[i];
      
      // Double-check barcode before validation
      if (!payload.barcode || payload.barcode.trim() === '' || !/^[0-9]+$/.test(payload.barcode.trim())) {
        toast.error(`Variant ${i + 1} has an invalid barcode. Please fix and try again.`);
        logger.error(`Invalid barcode in payload ${i + 1}:`, payload.barcode);
        return;
      }
    }

    // Step 1: Create parent product first (with shared fields only, NO barcode/pricing/quantity)
    logger.info(`Creating parent product for: ${formData.name}`);
    
    const parentPayload = {
      name: formData.name,
      categoryId: formData.categoryId,
      subcategoryId: formData.subcategoryId || undefined,
      // NO barcode for parent products
      // NO pricing for parent products
      // Attributes (optional on parent)
      modelType: null,
      packType: null,
      size: null,
      weight: null,
      // NO quantity for parent products
      minStockLevel: formData.minStockLevel && formData.minStockLevel !== '' ? Number(formData.minStockLevel) : null,
      allowNegativeStock: true,
      shelfId: formData.shelfId || null,
      description: formData.description || null,
      image: formData.image || null, // Featured image for parent
    };

    // Prepare variants array with variant-specific fields only
    // Use the already-extracted values from productPayloads (no need to re-extract)
    const variantsArray = productPayloads.map((payload) => {
      return {
        size: payload.size || null,
        modelType: payload.modelType || null,
        packType: payload.packType || null,
        weight: payload.weight || null,
        barcode: payload.barcode,
        mrp: payload.mrp || null,
        salePrice: payload.salePrice || null,
        quantity: payload.quantity || 0,
        minStockLevel: payload.minStockLevel || null,
        allowNegativeStock: payload.allowNegativeStock !== undefined ? payload.allowNegativeStock : true,
        shelfId: payload.shelfId || null,
        description: payload.description || null,
        image: payload.image || null,
      };
    });
    
    // Debug: Log the variants array to see what's being sent
    logger.info('Variants array being sent:', JSON.stringify(variantsArray, null, 2));

    // Create parent product with all variants in one atomic transaction
    logger.info(`Creating parent product with ${variantsArray.length} variant(s) in one transaction`);
    logger.info('Variants payload:', JSON.stringify(variantsArray, null, 2));
    
    try {
      const response = await productsAPI.createWithVariants(parentPayload, variantsArray, user.token);
      
      if (response.success) {
        toast.success(`Successfully created parent product with ${variantsArray.length} variant(s)!`);
        router.push('/inventory');
      } else {
        if (response.sessionExpired) {
          logger.warn('Session expired during product creation');
          return;
        }
        toast.error(response.message || 'Failed to create product with variants');
        logger.error('Product creation failed:', response.message);
      }
    } catch (error) {
      logger.error('Error creating product with variants:', error);
      toast.error('Failed to create product with variants');
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
        if (value && value !== '') {
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
        } else {
          // MRP is optional, so clear error if empty
          delete fieldErrors.mrp;
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

    if (field === 'barcode') setBarcodeStatus(null);

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

  // Variant management functions for Multiple mode
  const addVariant = () => {
    const newId = Math.max(...variants.map(v => v.id), 0) + 1;
    setVariants([
      ...variants,
      {
        id: newId,
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
        isExpanded: true, // New variant starts expanded
      },
    ]);
    setVariantTempInputs([
      ...variantTempInputs,
      {
        id: newId,
        modelType: '',
        packType: '',
        size: '',
        weight: '',
      },
    ]);
  };

  const toggleVariantExpansion = (variantId) => {
    setVariants(variants.map(v => 
      v.id === variantId ? { ...v, isExpanded: !v.isExpanded } : v
    ));
  };

  const handleMinimizeVariant = (variantId) => {
    // Only collapse current variant, don't add new one
    setVariants(variants.map(v => 
      v.id === variantId ? { ...v, isExpanded: false } : v
    ));
  };

  const removeVariant = (variantId) => {
    if (variants.length === 1) {
      toast.error('At least one variant is required');
      return;
    }
    setVariants(variants.filter(v => v.id !== variantId));
    setVariantTempInputs(variantTempInputs.filter(v => v.id !== variantId));
  };

  const updateVariant = (variantId, field, value) => {
    setVariants(variants.map(v => 
      v.id === variantId ? { ...v, [field]: value } : v
    ));
  };

  const updateVariantTempInput = (variantId, field, value) => {
    setVariantTempInputs(variantTempInputs.map(v => 
      v.id === variantId ? { ...v, [field]: value } : v
    ));
  };

  const handleVariantChipAdd = (variantId, field, value) => {
    if (!value || value.trim() === '') return;
    
    const trimmedValue = value.trim();
    const variant = variants.find(v => v.id === variantId);
    const currentArray = variant?.[field] || [];
    
    if (currentArray.includes(trimmedValue)) {
      toast.error(`${field} "${trimmedValue}" already exists for this variant`);
      return;
    }
    
    updateVariant(variantId, field, [...currentArray, trimmedValue]);
    updateVariantTempInput(variantId, field, '');
  };

  const handleVariantChipDelete = (variantId, field, index) => {
    const variant = variants.find(v => v.id === variantId);
    if (variant) {
      updateVariant(variantId, field, variant[field].filter((_, i) => i !== index));
    }
  };

  const handleVariantChipEdit = (variantId, field, index) => {
    const variant = variants.find(v => v.id === variantId);
    if (variant) {
      const valueToEdit = variant[field][index];
      updateVariant(variantId, field, variant[field].filter((_, i) => i !== index));
      updateVariantTempInput(variantId, field, valueToEdit);
    }
  };

  const generateVariantBarcode = (variantId) => {
    const barcode = Math.floor(
      100000000000 + Math.random() * 900000000000
    ).toString();
    updateVariant(variantId, 'barcode', barcode);
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'user']}>
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
                {/* Product Mode Selection */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <Label>Product Mode <span className="text-destructive">*</span></Label>
                  <RadioGroup value={productMode} onValueChange={setProductMode}>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="single" />
                        <Label htmlFor="single" className="font-normal cursor-pointer">
                          Single Product
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multiple" id="multiple" />
                        <Label htmlFor="multiple" className="font-normal cursor-pointer">
                          Multiple Variants
                        </Label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {productMode === 'single' 
                        ? 'Add a single product with one barcode and set of attributes'
                        : 'Add multiple product variants with the same name and category but different barcodes, sizes, prices, and photos'}
                    </p>
                  </RadioGroup>
                </div>

                {/* Shared Fields (Name and Category) - Always visible */}
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="subcategory">Subcategory (Optional)</Label>
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

                {/* Single Product Mode - Show all fields */}
                {productMode === 'single' && (
                  <>
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
                    <Label htmlFor="barcode">Barcode <span className="text-destructive">*</span></Label>
                    <div className="flex gap-2">
                      <Input
                        id="barcode"
                        placeholder="123456789012"
                        value={formData.barcode}
                        onChange={(e) =>
                          handleChange('barcode', e.target.value)
                        }
                        onBlur={(e) => {
                          handleBlur('barcode', e.target.value);
                          checkBarcodeUniqueness(e.target.value);
                        }}
                        className={errors.barcode || barcodeStatus === 'duplicate' ? 'border-destructive' : barcodeStatus === 'available' ? 'border-green-500' : ''}
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
                    {!errors.barcode && barcodeStatus === 'checking' && (
                      <p className="text-xs text-muted-foreground">Checking barcode...</p>
                    )}
                    {!errors.barcode && barcodeStatus === 'duplicate' && (
                      <p className="text-xs text-amber-600">⚠ This barcode already exists on another product</p>
                    )}
                    {!errors.barcode && barcodeStatus === 'available' && (
                      <p className="text-xs text-green-600">✓ Barcode is available</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shelf">Shelf Location (Optional)</Label>
                    <Select
                    value={formData.shelfId || 'none'}
                    onValueChange={(value) => handleChange('shelfId', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shelf location" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingShelves ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading shelves...</div>
                        ) : (
                          <>
                            <SelectItem value="none" className="text-muted-foreground italic">
                              None (Clear selection)
                            </SelectItem>
                            {shelves.length > 0 && (
                              shelves.map((shelf) => (
                                <SelectItem key={shelf.id} value={shelf.id}>
                                  {shelf.name}
                                </SelectItem>
                              ))
                            )}
                            {shelves.length === 0 && (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">No shelves available. Create shelves first.</div>
                            )}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mrp">MRP (Maximum Retail Price) (Optional)</Label>
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
                    />
                    {errors.mrp && (
                      <p className="text-sm text-destructive">{errors.mrp}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Leave empty if MRP is not applicable
                    </p>
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
                        <Label htmlFor="modelType">Model Type (Optional)</Label>
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
                        <Label htmlFor="packType">Pack Type (Optional)</Label>
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
                        <Label htmlFor="size">Size (Optional)</Label>
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
                        <Label htmlFor="weight">Weight (Optional)</Label>
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
                    <Label htmlFor="quantity">Quantity (Optional)</Label>
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
                  <Label htmlFor="description">Description/Notes (Optional)</Label>
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
                  label={productMode === 'multiple' ? "Featured Image (Optional)" : "Product Image (Optional)"}
                  token={user?.token}
                />

                {/* Website Settings */}
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Website Settings</span>
                    </div>
                    <Switch
                      id="showOnWebsite"
                      checked={formData.showOnWebsite}
                      onCheckedChange={(checked) => handleChange('showOnWebsite', checked)}
                    />
                  </div>
                  <Label htmlFor="showOnWebsite" className="text-xs text-muted-foreground -mt-2 block">
                    Show this product on the public website
                  </Label>
                  {formData.showOnWebsite && (
                    <div className="space-y-4 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-normal">Hide price</p>
                          <p className="text-xs text-muted-foreground">Visitors see "Enquire Now" instead of the price</p>
                        </div>
                        <Switch
                          id="hidePrice"
                          checked={formData.hidePrice}
                          onCheckedChange={(checked) => handleChange('hidePrice', checked)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteSlug">URL Slug (Optional)</Label>
                        <Input
                          id="websiteSlug"
                          placeholder="e.g. organic-whole-milk-1gal"
                          value={formData.websiteSlug}
                          onChange={(e) =>
                            handleChange('websiteSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
                          }
                          maxLength={255}
                        />
                        <p className="text-xs text-muted-foreground">
                          Used in the website URL: /products/<strong>{formData.websiteSlug || 'your-slug'}</strong>
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label>Additional Website Images (Optional)</Label>
                        {formData.websiteImages.map((img, idx) => (
                          <div key={idx} className="relative">
                            <ImageUpload
                              value={img}
                              onChange={(url) => {
                                const updated = [...formData.websiteImages];
                                updated[idx] = url;
                                handleChange('websiteImages', updated);
                              }}
                              label={`Website Image ${idx + 1}`}
                              token={user?.token}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute top-0 right-0 text-destructive hover:text-destructive"
                              onClick={() =>
                                handleChange('websiteImages', formData.websiteImages.filter((_, i) => i !== idx))
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {formData.websiteImages.length < 5 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleChange('websiteImages', [...formData.websiteImages, ''])}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Image
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {productMode === 'single' && (
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
                )}
                  </>
                )}

                {/* Multiple Variants Mode */}
                {productMode === 'multiple' && (
                  <>
                    {/* Featured Image for Parent Product */}
                    <div className="space-y-2">
                      <Label>Featured Image (Optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        This image will be used as the featured image for the product group.
                      </p>
                      <ImageUpload
                        value={formData.image}
                        onChange={(imageUrl) => handleChange('image', imageUrl)}
                        label=""
                        token={user?.token}
                      />
                    </div>

                    {/* Attribute Type Checkboxes - Shared for all variants */}
                    <div className="space-y-3">
                      <Label>Product Attributes (Optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        These attributes will be available for all variants. Enable the ones you want to use.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="enableModelType"
                            checked={enabledFields.modelType}
                            onCheckedChange={(checked) => {
                              setEnabledFields((prev) => ({ ...prev, modelType: checked }));
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
                            }}
                          />
                          <Label htmlFor="enableWeight" className="font-normal cursor-pointer">
                            Weight
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Variants List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">Product Variants</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addVariant}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Variant
                        </Button>
                      </div>

                      {variants.map((variant, variantIndex) => {
                        const variantTempInput = variantTempInputs.find(v => v.id === variant.id) || {
                          id: variant.id,
                          modelType: '',
                          packType: '',
                          size: '',
                          weight: '',
                        };

                        // Helper function to get variant summary and name
                        const getVariantSummary = () => {
                          const parts = [];
                          if (variant.barcode) parts.push(`Barcode: ${variant.barcode}`);
                          if (variant.size && variant.size.length > 0) parts.push(`Size: ${variant.size.join(', ')}`);
                          if (variant.modelType && variant.modelType.length > 0) parts.push(`Model: ${variant.modelType.join(', ')}`);
                          if (variant.weight && variant.weight.length > 0) parts.push(`Weight: ${variant.weight.join(', ')}`);
                          if (variant.packType && variant.packType.length > 0) parts.push(`Pack: ${variant.packType.join(', ')}`);
                          if (variant.mrp) parts.push(`MRP: ₹${variant.mrp}`);
                          if (variant.salePrice) parts.push(`Sale: ₹${variant.salePrice}`);
                          return parts.length > 0 ? parts.join(' • ') : 'Click to add details';
                        };

                        // Helper function to generate variant name with size and weight
                        const getVariantName = () => {
                          const nameParts = [formData.name];
                          
                          // Get size value (check array, string, or temp input)
                          let sizeValue = null;
                          if (Array.isArray(variant.size) && variant.size.length > 0) {
                            sizeValue = variant.size[0];
                          } else if (variant.size && typeof variant.size === 'string' && variant.size.trim() !== '') {
                            sizeValue = variant.size.trim();
                          } else if (variantTempInput?.size && String(variantTempInput.size).trim() !== '') {
                            sizeValue = String(variantTempInput.size).trim();
                          }
                          
                          // Get weight value (check array, string, or temp input)
                          let weightValue = null;
                          if (Array.isArray(variant.weight) && variant.weight.length > 0) {
                            weightValue = variant.weight[0];
                          } else if (variant.weight && typeof variant.weight === 'string' && variant.weight.trim() !== '') {
                            weightValue = variant.weight.trim();
                          } else if (variantTempInput?.weight && String(variantTempInput.weight).trim() !== '') {
                            weightValue = String(variantTempInput.weight).trim();
                          }
                          
                          // Add size and/or weight to name
                          if (sizeValue && weightValue) {
                            nameParts.push(`${sizeValue} - ${weightValue}`);
                          } else if (sizeValue) {
                            nameParts.push(sizeValue);
                          } else if (weightValue) {
                            nameParts.push(weightValue);
                          }
                          
                          return nameParts.join(' ');
                        };

                        return (
                          <Collapsible
                            key={variant.id}
                            open={variant.isExpanded}
                            onOpenChange={(open) => {
                              setVariants(variants.map(v => 
                                v.id === variant.id ? { ...v, isExpanded: open } : v
                              ));
                            }}
                          >
                            <Card className="border-2">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="flex-1 justify-between p-0 h-auto font-semibold hover:bg-transparent"
                                    >
                                      <span className="text-base">
                                        {getVariantName() || `Variant ${variantIndex + 1}`}
                                      </span>
                                      {variant.isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <div className="flex items-center gap-2">
                                    {!variant.isExpanded && (
                                      <span className="text-sm text-muted-foreground max-w-md truncate">
                                        {getVariantSummary()}
                                      </span>
                                    )}
                                    {variants.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeVariant(variant.id);
                                        }}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CollapsibleContent>
                                <CardContent className="space-y-4">
                              {/* Barcode */}
                              <div className="space-y-2">
                                <Label htmlFor={`variant-${variant.id}-barcode`}>
                                  Barcode <span className="text-destructive">*</span>
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    id={`variant-${variant.id}-barcode`}
                                    placeholder="123456789012"
                                    value={variant.barcode || ''}
                                    onChange={(e) => updateVariant(variant.id, 'barcode', e.target.value)}
                                    onBlur={(e) => {
                                      // Trim barcode on blur to remove any whitespace
                                      const trimmed = e.target.value.trim();
                                      if (trimmed !== variant.barcode) {
                                        updateVariant(variant.id, 'barcode', trimmed);
                                      }
                                    }}
                                    className={errors[`variant_${variant.id}_barcode`] ? 'border-destructive' : ''}
                                    maxLength={50}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => generateVariantBarcode(variant.id)}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </div>
                                {errors[`variant_${variant.id}_barcode`] && (
                                  <p className="text-sm text-destructive">
                                    {errors[`variant_${variant.id}_barcode`]}
                                  </p>
                                )}
                              </div>

                              {/* Pricing */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`variant-${variant.id}-mrp`}>
                                    MRP (Maximum Retail Price) (Optional)
                                  </Label>
                                  <Input
                                    id={`variant-${variant.id}-mrp`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="999999.99"
                                    placeholder="999.99"
                                    value={variant.mrp}
                                    onChange={(e) => updateVariant(variant.id, 'mrp', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`variant-${variant.id}-salePrice`}>
                                    Sale Price (Optional)
                                  </Label>
                                  <Input
                                    id={`variant-${variant.id}-salePrice`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="999999.99"
                                    placeholder="899.99"
                                    value={variant.salePrice}
                                    onChange={(e) => updateVariant(variant.id, 'salePrice', e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Attributes - Only show if enabled */}
                              {(enabledFields.modelType || enabledFields.packType || enabledFields.size || enabledFields.weight) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {enabledFields.modelType && (
                                    <div className="space-y-2">
                                      <Label htmlFor={`variant-${variant.id}-modelType`}>Model Type (Optional)</Label>
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <Input
                                            id={`variant-${variant.id}-modelType`}
                                            placeholder="Enter model type and press Enter"
                                            value={variantTempInput.modelType}
                                            onChange={(e) => updateVariantTempInput(variant.id, 'modelType', e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleVariantChipAdd(variant.id, 'modelType', variantTempInput.modelType);
                                              }
                                            }}
                                          />
                                        </div>
                                        {variant.modelType && variant.modelType.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {variant.modelType.map((value, index) => (
                                              <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => handleVariantChipEdit(variant.id, 'modelType', index)}>
                                                {value}
                                                <X className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); handleVariantChipDelete(variant.id, 'modelType', index); }} />
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {enabledFields.packType && (
                                    <div className="space-y-2">
                                      <Label htmlFor={`variant-${variant.id}-packType`}>Pack Type (Optional)</Label>
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <Input
                                            id={`variant-${variant.id}-packType`}
                                            placeholder="Enter pack type and press Enter"
                                            value={variantTempInput.packType}
                                            onChange={(e) => updateVariantTempInput(variant.id, 'packType', e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleVariantChipAdd(variant.id, 'packType', variantTempInput.packType);
                                              }
                                            }}
                                          />
                                        </div>
                                        {variant.packType && variant.packType.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {variant.packType.map((value, index) => (
                                              <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => handleVariantChipEdit(variant.id, 'packType', index)}>
                                                {value}
                                                <X className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); handleVariantChipDelete(variant.id, 'packType', index); }} />
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {enabledFields.size && (
                                    <div className="space-y-2">
                                      <Label htmlFor={`variant-${variant.id}-size`}>Size (Optional)</Label>
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <Input
                                            id={`variant-${variant.id}-size`}
                                            placeholder="Enter size and press Enter"
                                            value={variantTempInput.size}
                                            onChange={(e) => updateVariantTempInput(variant.id, 'size', e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleVariantChipAdd(variant.id, 'size', variantTempInput.size);
                                              }
                                            }}
                                          />
                                        </div>
                                        {variant.size && variant.size.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {variant.size.map((value, index) => (
                                              <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => handleVariantChipEdit(variant.id, 'size', index)}>
                                                {value}
                                                <X className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); handleVariantChipDelete(variant.id, 'size', index); }} />
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {enabledFields.weight && (
                                    <div className="space-y-2">
                                      <Label htmlFor={`variant-${variant.id}-weight`}>Weight (Optional)</Label>
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <Input
                                            id={`variant-${variant.id}-weight`}
                                            placeholder="Enter weight and press Enter"
                                            value={variantTempInput.weight}
                                            onChange={(e) => updateVariantTempInput(variant.id, 'weight', e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleVariantChipAdd(variant.id, 'weight', variantTempInput.weight);
                                              }
                                            }}
                                          />
                                        </div>
                                        {variant.weight && variant.weight.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {variant.weight.map((value, index) => (
                                              <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => handleVariantChipEdit(variant.id, 'weight', index)}>
                                                {value}
                                                <X className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); handleVariantChipDelete(variant.id, 'weight', index); }} />
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Quantity and Min Stock Level */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`variant-${variant.id}-quantity`}>Quantity (Optional)</Label>
                                  <Input
                                    id={`variant-${variant.id}-quantity`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="150"
                                    value={variant.quantity}
                                    onChange={(e) => updateVariant(variant.id, 'quantity', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`variant-${variant.id}-minStockLevel`}>
                                    Minimum Stock Level (Optional)
                                  </Label>
                                  <Input
                                    id={`variant-${variant.id}-minStockLevel`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="5"
                                    value={variant.minStockLevel}
                                    onChange={(e) => updateVariant(variant.id, 'minStockLevel', e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Shelf Location */}
                              <div className="space-y-2">
                                <Label htmlFor={`variant-${variant.id}-shelf`}>Shelf Location (Optional)</Label>
                                <Select
                                  value={variant.shelfId || 'none'}
                                  onValueChange={(value) => updateVariant(variant.id, 'shelfId', value === 'none' ? '' : value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select shelf location" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {loadingShelves ? (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading shelves...</div>
                                    ) : (
                                      <>
                                        <SelectItem value="none" className="text-muted-foreground italic">
                                          None (Clear selection)
                                        </SelectItem>
                                        {shelves.length > 0 && (
                                          shelves.map((shelf) => (
                                            <SelectItem key={shelf.id} value={shelf.id}>
                                              {shelf.name}
                                            </SelectItem>
                                          ))
                                        )}
                                        {shelves.length === 0 && (
                                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No shelves available. Create shelves first.</div>
                                        )}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Image Upload */}
                              <div className="space-y-2">
                                <Label htmlFor={`variant-${variant.id}-image`}>Product Image (Optional)</Label>
                                <ImageUpload
                                  value={variant.image}
                                  onChange={(imageUrl) => updateVariant(variant.id, 'image', imageUrl)}
                                  token={user?.token}
                                />
                              </div>

                              {/* Description */}
                              <div className="space-y-2">
                                <Label htmlFor={`variant-${variant.id}-description`}>Description (Optional)</Label>
                                <Textarea
                                  id={`variant-${variant.id}-description`}
                                  placeholder="Enter product description"
                                  value={variant.description}
                                  onChange={(e) => updateVariant(variant.id, 'description', e.target.value)}
                                  rows={3}
                                  maxLength={5000}
                                />
                              </div>

                              {/* Minimize Button - Collapse current variant */}
                              <div className="flex justify-end pt-2 border-t">
                                <Button
                                  type="button"
                                  onClick={() => handleMinimizeVariant(variant.id)}
                                  className="w-full sm:w-auto"
                                >
                                  Minimize
                                </Button>
                              </div>
                                </CardContent>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        );
                      })}
                    </div>

                    {/* Submit Button for Multiple Mode */}
                    <div className="flex justify-end gap-4 pt-4">
                      <Button type="button" variant="outline" onClick={() => router.push('/inventory')}>
                        Cancel
                      </Button>
                      <Button type="submit">Add All Variants</Button>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
    </ProtectedRoute>
  );
}
