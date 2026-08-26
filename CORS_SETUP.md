# External API Server Setup for CORS

## Problem

When making API calls from your Next.js frontend to an external server (like `http://localhost:4000`), you may encounter CORS (Cross-Origin Resource Sharing) issues.

## Solutions Implemented

### 1. Frontend Changes

- Updated `auth-context.js` to make external API calls with proper CORS headers
- Added API utility functions in `lib/api.js` for better error handling
- All network calls now hit the backend directly (no Next.js proxy routes)

### 2. Environment Configuration

- Created `.env.local` with proper API base URL
- Updated `next.config.js` with CORS headers and rewrites

## External Server Requirements

Your external server at `http://localhost:4000` needs to handle CORS. Here's what you need to add:

### For Express.js Server:

```javascript
const cors = require('cors');

// Allow CORS for your Next.js app
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://your-domain.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

// Handle preflight requests
app.options('*', cors());
```

### For Node.js without Express:

```javascript
// Add these headers to all responses
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader(
  'Access-Control-Allow-Methods',
  'GET, POST, PUT, DELETE, OPTIONS'
);
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

// Handle preflight OPTIONS requests
if (req.method === 'OPTIONS') {
  res.writeHead(200);
  res.end();
  return;
}
```

## Testing

1. Start your external server on `http://localhost:4000`
2. Ensure it has the login endpoint: `POST /api/auth/login`
3. Make sure it accepts JSON body with: `{ email, password, role }`
4. Test the login from your frontend

## Environment Variables

Make sure your `.env.local` has:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Change this to your actual external server URL in production.
