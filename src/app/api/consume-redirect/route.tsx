// /app/api/consume-redirect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import jwt from "jsonwebtoken";

interface ConsumeRedirectRequest {
  redirectId: string;
}

interface ConsumeRedirectResponse {
  status: string;
  session?: {
    access_token: string;
    refresh_token: string;
  };
  redirectTo?: string;
  userId?: string;
  error?: string;
}

// --- Generate Supabase-compatible JWT session ---
const generateSession = (userId: string) => {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("Missing SUPABASE_JWT_SECRET");
  }

  const access_token = jwt.sign(
    {
      sub: userId,
      aud: "authenticated",
      role: "authenticated",
    },
    secret,
    { expiresIn: "1h", algorithm: 'HS256' }
  );

  const refresh_token = jwt.sign(
    {
      sub: userId,
      aud: "authenticated",
      type: "refresh",
    },
    secret,
    { expiresIn: "30d", algorithm: 'HS256' }
  );

  return { access_token, refresh_token };
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ConsumeRedirectResponse>> {
  try {
    const { redirectId }: ConsumeRedirectRequest = await request.json();

    if (!redirectId) {
      return NextResponse.json(
        { error: "Redirect ID is required", status: "error" },
        { status: 400 }
      );
    }

    console.log("Processing redirect ID:", redirectId);

    // Call your Supabase RPC to consume the redirect
    const { data: redirectData, error: redirectError } = await supabaseAdmin
      .rpc("consume_redirect", { p_redirect_id: redirectId });

    if (redirectError) {
      console.error("Redirect consume error:", redirectError);
      return NextResponse.json(
        { error: `Database error: ${redirectError.message}`, status: "error" },
        { status: 500 }
      );
    }

    if (!redirectData || redirectData.status !== "Redirect.accept") {
      console.error("Invalid redirect data:", redirectData);
      return NextResponse.json(
        {
          error: redirectData?.error || "Invalid redirect",
          status: redirectData?.status || "invalid",
        },
        { status: 400 }
      );
    }

    const userId: string = redirectData.userId;
    const redirectTo: string = redirectData.redirectTo;

    if (!userId || !redirectTo) {
      console.error("Missing userId or redirectTo:", { userId, redirectTo });
      return NextResponse.json(
        { error: "Invalid redirect data: missing required fields", status: "error" },
        { status: 500 }
      );
    }

    // Generate JWT session
    let session;
    try {
      session = generateSession(userId);
    } catch (err: any) {
      console.error("Session generation failed:", err);
      return NextResponse.json(
        { error: "Session generation failed", status: "error" },
        { status: 500 }
      );
    }

    // Return session + redirect info to client
    return NextResponse.json({
      status: "success",
      session,
      redirectTo,
      userId,
    });
  } catch (error: any) {
    console.error("Consume redirect API error:", error);
    return NextResponse.json(
      {
        error: `Internal server error: ${error.message || "Unknown error"}`,
        status: "error",
      },
      { status: 500 }
    );
  }
}
