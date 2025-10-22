export const mockProducts = [
  {
    id: '1',
    name: 'Organic Apples',
    category: 'Groceries',
    subcategory: 'Fruits',
    barcode: '123456789012',
    quantity: 50,
    price: 2.99,
    shelf: 'A1',
    description: 'Fresh organic apples',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=100&h=100&fit=crop'
  },
  {
    id: '2',
    name: 'Laptop Pro X',
    category: 'Electronics',
    subcategory: 'Laptops',
    barcode: '987654321098',
    quantity: 5,
    price: 1200.00,
    shelf: 'B2',
    description: 'High performance laptop',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=100&h=100&fit=crop'
  },
  {
    id: '3',
    name: 'Mystery Novel',
    category: 'Books',
    subcategory: 'Fiction',
    barcode: '112233445566',
    quantity: 15,
    price: 15.50,
    shelf: 'C1',
    description: 'Bestselling mystery novel',
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop'
  },
  {
    id: '4',
    name: 'Cotton T-Shirt',
    category: 'Clothing',
    subcategory: 'Shirts',
    barcode: '665544332211',
    quantity: 120,
    price: 19.99,
    shelf: 'A2',
    description: 'Comfortable cotton t-shirt',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop'
  },
  {
    id: '5',
    name: 'Designer Sofa',
    category: 'Home Goods',
    subcategory: 'Furniture',
    barcode: '009988776655',
    quantity: 3,
    price: 850.00,
    shelf: 'B1',
    description: 'Modern designer sofa',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&h=100&fit=crop'
  },
  {
    id: '6',
    name: 'Fresh Bread',
    category: 'Groceries',
    subcategory: 'Bakery',
    barcode: '210987654321',
    quantity: 25,
    price: 3.50,
    shelf: 'A1',
    description: 'Freshly baked bread',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop'
  },
  {
    id: '7',
    name: 'Wireless Mouse',
    category: 'Electronics',
    subcategory: 'Accessories',
    barcode: '543210987654',
    quantity: 10,
    price: 25.00,
    shelf: 'B2',
    description: 'Ergonomic wireless mouse',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=100&h=100&fit=crop'
  },
  {
    id: '8',
    name: 'Sci-Fi Epic',
    category: 'Books',
    subcategory: 'Fiction',
    barcode: '789012345678',
    quantity: 8,
    price: 22.00,
    shelf: 'C1',
    description: 'Epic science fiction novel',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=100&h=100&fit=crop'
  }
]

export const mockShelves = [
  { id: 'A1', name: 'A1', productCount: 2 },
  { id: 'A2', name: 'A2', productCount: 1 },
  { id: 'A3', name: 'A3', productCount: 0 },
  { id: 'A4', name: 'A4', productCount: 0 },
  { id: 'B1', name: 'B1', productCount: 1 },
  { id: 'B2', name: 'B2', productCount: 2 },
  { id: 'B3', name: 'B3', productCount: 0 },
  { id: 'B4', name: 'B4', productCount: 0 },
  { id: 'C1', name: 'C1', productCount: 2 },
  { id: 'C2', name: 'C2', productCount: 0 },
  { id: 'C3', name: 'C3', productCount: 0 },
  { id: 'C4', name: 'C4', productCount: 0 },
  { id: 'D1', name: 'D1', productCount: 0 },
  { id: 'D2', name: 'D2', productCount: 0 },
  { id: 'D3', name: 'D3', productCount: 0 },
  { id: 'D4', name: 'D4', productCount: 0 }
]

export const mockUsers = [
  { id: '1', name: 'John Admin', email: 'admin@example.com', role: 'admin', status: 'active' },
  { id: '2', name: 'Jane User', email: 'user@example.com', role: 'user', status: 'active' },
  { id: '3', name: 'Bob Staff', email: 'bob@example.com', role: 'user', status: 'inactive' }
]

export const mockRecentUpdates = [
  { id: '1', productName: 'Organic Apples', category: 'Groceries', status: 'Edited', date: '2024-07-28' },
  { id: '2', productName: "Women's Denim Jeans", category: 'Clothing', status: 'Added', date: '2024-07-27' },
  { id: '3', productName: 'Bluetooth Speaker X', category: 'Electronics', status: 'Edited', date: '2024-07-27' },
  { id: '4', productName: 'The Great Gatsby', category: 'Books', status: 'Added', date: '2024-07-26' },
  { id: '5', productName: 'Ceramic Coffee Mug', category: 'Home Goods', status: 'Edited', date: '2024-07-25' }
]

export const mockDashboardMetrics = {
  totalProducts: 2567,
  lowStock: 124,
  totalValue: 1200000,
  totalShelves: 48
}

export const mockInventoryDistribution = [
  { category: 'Electronics', products: 750 },
  { category: 'Clothing', products: 580 },
  { category: 'Groceries', products: 820 },
  { category: 'Books', products: 320 },
  { category: 'Home Goods', products: 450 }
]