import { NextRequest, NextResponse } from 'next/server';

// Define the expected request body structure
interface PinNewRequest {
  userId: string;
  pin: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: PinNewRequest = await request.json();

    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const { userId, pin } = body;

    if (!userId || !pin) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, pin' },
        { status: 400 }
      );
    }

    // Call AWS API endpoint
    const awsApiUrl = 'https://fz0b8vmhba.execute-api.eu-north-1.amazonaws.com/prod/pin/new';
    
    const response = await fetch(awsApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userPin: pin,
      }),
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('[PIN New] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
