import { NextRequest, NextResponse } from 'next/server';

// Define the expected request body structure
interface PaymentRequest {
  userId: string;
  senderProfileId: string;
  receiverProfileId: string;
  amount: number;
  type: string;
  paymentSessionId: string;
  locale: string;
  country: string;
  gender: string;
  age: number;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: PaymentRequest = await request.json();

    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Make the request to the external payment API
    const response = await fetch(
      'https://vsso71jg7d.execute-api.eu-north-1.amazonaws.com/prod/make',
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    // Parse the response
    const data = await response.json();

    // Return the response with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Payment API error:', error);

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