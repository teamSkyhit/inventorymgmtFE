import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'user'], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
});

// Product validation schema
export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be less than 200 characters')
    .trim(),
  categoryId: z.string().uuid('Please select a valid category'),
  subcategoryId: z.string().uuid().optional().or(z.literal('')),
  barcode: z
    .string()
    .min(1, 'Barcode is required')
    .max(50, 'Barcode must be less than 50 characters')
    .regex(/^[0-9]+$/, 'Barcode must contain only numbers'),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      if (isNaN(num)) throw new Error('Quantity must be a number');
      return num;
    })
    .pipe(z.number().int('Quantity must be an integer').min(0, 'Quantity cannot be negative')),
  price: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error('Price must be a number');
      return num;
    })
    .pipe(z.number().min(0, 'Price cannot be negative').max(999999.99, 'Price is too large')),
  shelfId: z.string().max(50, 'Shelf ID must be less than 50 characters').optional().or(z.literal('')),
  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .or(z.literal('')),
  image: z.string().optional().or(z.literal('')),
});

// User validation schema
export const userSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long')
    .optional(),
  role: z.enum(['ADMIN', 'USER'], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }),
});

// Category validation schema
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
});

// Subcategory validation schema
export const subcategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Subcategory name is required')
    .max(100, 'Subcategory name must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().uuid('Please select a valid category'),
});

// Shelf validation schema
export const shelfSchema = z.object({
  id: z
    .string()
    .min(1, 'Shelf ID is required')
    .max(50, 'Shelf ID must be less than 50 characters')
    .trim(),
  name: z
    .string()
    .min(1, 'Shelf name is required')
    .max(100, 'Shelf name must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
});

// Helper function to format Zod errors for display
export const formatZodError = (error) => {
  if (!error || !error.errors) return 'Validation failed';
  
  const firstError = error.errors[0];
  return firstError?.message || 'Validation failed';
};

// Helper function to get field-specific errors
export const getFieldErrors = (error) => {
  if (!error || !error.errors) return {};
  
  const fieldErrors = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    fieldErrors[path] = err.message;
  });
  
  return fieldErrors;
};


