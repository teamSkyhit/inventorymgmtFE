import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const externalApiUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

    // Forward the request to the external API
    const response = await fetch(`${externalApiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Return the response with CORS headers
    const nextResponse = NextResponse.json(data, { status: response.status });
    nextResponse.headers.set('Access-Control-Allow-Origin', '*');
    nextResponse.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    nextResponse.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    return nextResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    const errorResponse = NextResponse.json(
      { success: false, message: 'Server connection failed' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
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
