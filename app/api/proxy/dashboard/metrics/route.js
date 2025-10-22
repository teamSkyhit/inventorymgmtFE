import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const externalApiUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header missing' },
        { status: 401 }
      );
    }

    // Forward the request to the external API
    const response = await fetch(`${externalApiUrl}/api/dashboard/metrics`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
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
    console.error('Dashboard metrics proxy error:', error);
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
