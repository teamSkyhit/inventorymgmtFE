# UniTrack Inventory Management System

## Overview
This README provides a comprehensive guide for creating a backend application similar to the UniTrack Inventory system, including database schema, API endpoints, and implementation details.

## Database Schema

### 1. Products Table
```sql
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    barcode VARCHAR(12) UNIQUE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    shelf VARCHAR(10),
    description TEXT,
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. Users Table
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3. Sales Table (for tracking sales/updates)
```sql
CREATE TABLE sales (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    quantity_sold INTEGER NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 4. Shelves Table
```sql
CREATE TABLE shelves (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints List

### Authentication APIs
1. **POST** `/api/auth/login`
   - **Purpose**: User login
   - **Request Body**: `{ "email": "string", "password": "string", "role": "admin|user" }`
   - **Response**: `{ "success": boolean, "token": "string", "user": object }`

### Product Management APIs
2. **GET** `/api/products`
   - **Purpose**: Get all products
   - **Response**: `{ "success": boolean, "data": Product[] }`

3. **POST** `/api/products`
   - **Purpose**: Create new product
   - **Request Body**: `{ "name": "string", "category": "string", "subcategory": "string", "barcode": "string", "quantity": number, "price": number, "shelf": "string", "description": "string" }`
   - **Response**: `{ "success": boolean, "data": Product }`

4. **PUT** `/api/products/{id}`
   - **Purpose**: Update product
   - **Request Body**: `{ "name": "string", "category": "string", "subcategory": "string", "barcode": "string", "quantity": number, "price": number, "shelf": "string", "description": "string" }`
   - **Response**: `{ "success": boolean, "data": Product }`

5. **DELETE** `/api/products/{id}`
   - **Purpose**: Delete product
   - **Response**: `{ "success": boolean, "data": Product }`

### User Management APIs
6. **GET** `/api/users`
   - **Purpose**: Get all users
   - **Response**: `{ "success": boolean, "data": User[] }`

7. **POST** `/api/users`
   - **Purpose**: Create new user
   - **Request Body**: `{ "name": "string", "email": "string", "role": "admin|user", "status": "active|inactive" }`
   - **Response**: `{ "success": boolean, "data": User }`

### Dashboard APIs
8. **GET** `/api/dashboard/metrics`
   - **Purpose**: Get dashboard metrics
   - **Response**: `{ "success": boolean, "data": { "totalProducts": number, "lowStock": number, "totalValue": number, "totalShelves": number } }`

### Inventory Management APIs
9. **GET** `/api/shelves`
   - **Purpose**: Get shelf information with product counts
   - **Response**: `{ "success": boolean, "data": Shelf[] }`

10. **POST** `/api/sales/update`
    - **Purpose**: Update product quantity (sales)
    - **Request Body**: `{ "productId": "string", "quantity": number }`
    - **Response**: `{ "success": boolean, "message": "string", "data": Product }`

### Utility APIs
11. **GET** `/api/`
    - **Purpose**: API status check
    - **Response**: `{ "message": "string", "status": "string" }`

## Key Features to Implement

1. **Authentication Middleware**: JWT token validation
2. **Input Validation**: Validate all incoming data
3. **Error Handling**: Proper error responses
4. **Database Integration**: Replace in-memory arrays with actual database
5. **CORS Configuration**: For cross-origin requests
6. **Rate Limiting**: Prevent API abuse
7. **Logging**: Track API usage and errors

## Response Format Standard
All APIs follow this response structure:
```json
{
  "success": boolean,
  "data": object | array,
  "message": "string (optional)",
  "error": "string (on error)"
}
```

## Implementation Notes

### Database Setup
- Use a relational database (MySQL, PostgreSQL, or SQLite for development)
- Implement proper indexing on frequently queried fields (id, barcode, category, shelf)
- Set up database migrations for version control

### Security Considerations
- Hash passwords before storing in database
- Implement JWT token-based authentication
- Add rate limiting to prevent API abuse
- Validate and sanitize all input data
- Use HTTPS in production

### API Development
- Use a framework like Express.js, Fastify, or Next.js API routes
- Implement proper error handling and logging
- Add input validation using libraries like Joi or Zod
- Document APIs using OpenAPI/Swagger

### Frontend Integration
- Use the provided API endpoints to connect with React/Next.js frontend
- Implement proper error handling for API failures
- Add loading states and success/error notifications
- Use authentication tokens for protected routes

## Sample Data Structure

### Product Categories
- Electronics: Laptops, Smartphones, Accessories, Audio
- Groceries: Fruits, Bakery, Dairy, Vegetables
- Clothing: Shirts, Pants, Dresses, Accessories
- Books: Fiction, Non-Fiction, Textbooks, Comics
- Home Goods: Furniture, Decor, Kitchen, Bathroom

### Shelf Locations
- A1, A2, A3, A4
- B1, B2, B3, B4
- C1, C2, C3, C4
- D1, D2, D3, D4

This schema provides a solid foundation for building a complete inventory management backend application.
