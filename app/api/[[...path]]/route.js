import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

let products = [
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
    image:
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=100&h=100&fit=crop',
  },
  {
    id: '2',
    name: 'Laptop Pro X',
    category: 'Electronics',
    subcategory: 'Laptops',
    barcode: '987654321098',
    quantity: 5,
    price: 1200.0,
    shelf: 'B2',
    description: 'High performance laptop',
    image:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=100&h=100&fit=crop',
  },
  {
    id: '3',
    name: 'Mystery Novel',
    category: 'Books',
    subcategory: 'Fiction',
    barcode: '112233445566',
    quantity: 15,
    price: 15.5,
    shelf: 'C1',
    description: 'Bestselling mystery novel',
    image:
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop',
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
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop',
  },
  {
    id: '5',
    name: 'Designer Sofa',
    category: 'Home Goods',
    subcategory: 'Furniture',
    barcode: '009988776655',
    quantity: 3,
    price: 850.0,
    shelf: 'B1',
    description: 'Modern designer sofa',
    image:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&h=100&fit=crop',
  },
  {
    id: '6',
    name: 'Fresh Bread',
    category: 'Groceries',
    subcategory: 'Bakery',
    barcode: '210987654321',
    quantity: 25,
    price: 3.5,
    shelf: 'A1',
    description: 'Freshly baked bread',
    image:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop',
  },
  {
    id: '7',
    name: 'Wireless Mouse',
    category: 'Electronics',
    subcategory: 'Accessories',
    barcode: '543210987654',
    quantity: 10,
    price: 25.0,
    shelf: 'B2',
    description: 'Ergonomic wireless mouse',
    image:
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=100&h=100&fit=crop',
  },
  {
    id: '8',
    name: 'Sci-Fi Epic',
    category: 'Books',
    subcategory: 'Fiction',
    barcode: '789012345678',
    quantity: 8,
    price: 22.0,
    shelf: 'C1',
    description: 'Epic science fiction novel',
    image:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=100&h=100&fit=crop',
  },
];

let users = [
  {
    id: '1',
    name: 'John Admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
  },
  {
    id: '2',
    name: 'Jane User',
    email: 'user@example.com',
    role: 'user',
    status: 'active',
  },
  {
    id: '3',
    name: 'Bob Staff',
    email: 'bob@example.com',
    role: 'user',
    status: 'inactive',
  },
];

// Helper to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  return response;
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }));
}

// Route handler
async function handleRoute(request, { params }) {
  const { path = [] } = params;
  const route = `/${path.join('/')}`;
  const method = request.method;

  try {
    // Auth - POST /api/auth/login
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json();
      const { email, password, role } = body;

      if (email && password && role) {
        return handleCORS(
          NextResponse.json({
            success: true,
            token: `mock-jwt-token-${Date.now()}`,
            user: { email, role },
          })
        );
      }

      return handleCORS(
        NextResponse.json(
          { success: false, message: 'Invalid credentials' },
          { status: 401 }
        )
      );
    }

    // Products - GET /api/products
    if (route === '/products' && method === 'GET') {
      return handleCORS(NextResponse.json({ success: true, data: products }));
    }

    // Products - POST /api/products
    if (route === '/products' && method === 'POST') {
      const body = await request.json();
      const newProduct = {
        id: uuidv4(),
        ...body,
        quantity: parseInt(body.quantity),
        price: parseFloat(body.price),
        image:
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop',
      };
      products.push(newProduct);
      return handleCORS(
        NextResponse.json({ success: true, data: newProduct }, { status: 201 })
      );
    }

    // Products - PUT /api/products/:id
    if (route.startsWith('/products/') && method === 'PUT') {
      const id = path[1];
      const body = await request.json();
      const index = products.findIndex((p) => p.id === id);
      if (index !== -1) {
        products[index] = { ...products[index], ...body };
        return handleCORS(
          NextResponse.json({ success: true, data: products[index] })
        );
      }
      return handleCORS(
        NextResponse.json(
          { success: false, message: 'Product not found' },
          { status: 404 }
        )
      );
    }

    // Products - DELETE /api/products/:id
    if (route.startsWith('/products/') && method === 'DELETE') {
      const id = path[1];
      const index = products.findIndex((p) => p.id === id);
      if (index !== -1) {
        const deleted = products.splice(index, 1)[0];
        return handleCORS(NextResponse.json({ success: true, data: deleted }));
      }
      return handleCORS(
        NextResponse.json(
          { success: false, message: 'Product not found' },
          { status: 404 }
        )
      );
    }

    // Users - GET /api/users
    if (route === '/users' && method === 'GET') {
      return handleCORS(NextResponse.json({ success: true, data: users }));
    }

    // Users - POST /api/users
    if (route === '/users' && method === 'POST') {
      const body = await request.json();
      const newUser = { id: uuidv4(), ...body };
      users.push(newUser);
      return handleCORS(
        NextResponse.json({ success: true, data: newUser }, { status: 201 })
      );
    }

    // Dashboard metrics - GET /api/dashboard/metrics
    if (route === '/dashboard/metrics' && method === 'GET') {
      const metrics = {
        totalProducts: products.length * 321,
        lowStock: products.filter((p) => p.quantity < 10).length * 15,
        totalValue:
          products.reduce((sum, p) => sum + p.price * p.quantity, 0) * 500,
        totalShelves: 48,
      };
      return handleCORS(NextResponse.json({ success: true, data: metrics }));
    }

    // Shelves - GET /api/shelves
    if (route === '/shelves' && method === 'GET') {
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
      ].map((id) => ({
        id,
        name: id,
        productCount: products.filter((p) => p.shelf === id).length,
      }));
      return handleCORS(NextResponse.json({ success: true, data: shelves }));
    }

    // Sales update - POST /api/sales/update
    if (route === '/sales/update' && method === 'POST') {
      const body = await request.json();
      const { productId, quantity } = body;
      const product = products.find((p) => p.id === productId);

      if (product) {
        if (quantity > product.quantity) {
          return handleCORS(
            NextResponse.json(
              { success: false, message: 'Insufficient stock' },
              { status: 400 }
            )
          );
        }
        product.quantity -= quantity;
        return handleCORS(
          NextResponse.json({
            success: true,
            message: 'Sale updated successfully',
            data: product,
          })
        );
      }

      return handleCORS(
        NextResponse.json(
          { success: false, message: 'Product not found' },
          { status: 404 }
        )
      );
    }

    // Default
    if (route === '/' && method === 'GET') {
      return handleCORS(
        NextResponse.json({
          message: 'UniTrack Inventory API v1.0',
          status: 'running',
        })
      );
    }

    return handleCORS(
      NextResponse.json({ error: `Route ${route} not found` }, { status: 404 })
    );
  } catch (error) {
    console.error('API Error:', error);
    return handleCORS(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    );
  }
}

export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
export const PATCH = handleRoute;
