// app/api/create-user/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Define expected request body
interface CreateUserRequest {
  users_login_type: string;
  users_email?: string;
  users_phone?: string;
  users_password: string;
  users_dob?: string;
  users_sex?: string;
  users_username: string;
  users_names: string;
  country_id: string;
  language_id: string;
  users_referred_id?: string | null;
  roles_id: string;
  users_pin: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: CreateUserRequest = await request.json();

    // Forward the request to your backend API
    const response = await fetch(
      'https://n8pk6w16kd.execute-api.eu-north-1.amazonaws.com/prod/create',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );


    // Parse response JSON
    const data = await response.json();

    // Return success with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('API route error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
