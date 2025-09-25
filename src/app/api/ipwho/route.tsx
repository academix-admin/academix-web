// app/api/ipwho/route.tsx
export async function GET(req: Request) {
  const response = await fetch("https://ipwho.is/");
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Allow frontend
    },
  });
}

// // // app/api/ipwho/route.ts
// // export async function GET(req: Request) {
// //   try {
// //     const forwarded = req.headers.get("x-forwarded-for");
// //     const realIp = req.headers.get("x-real-ip");
// //     const cfConnectingIp = req.headers.get("cf-connecting-ip");
// //
// //     // More comprehensive IP extraction
// //     let ip: string | null = null;
// //
// //     if (cfConnectingIp) {
// //       ip = cfConnectingIp;
// //     } else if (realIp) {
// //       ip = realIp;
// //     } else if (forwarded) {
// //       ip = forwarded.split(",")[0].trim();
// //     }
// //
// //     const url = ip ? `https://ipwho.is/${ip}` : "https://ipwho.is/";
// //
// //     const response = await fetch(url);
// //
// //     if (!response.ok) {
// //       throw new Error(`IPWHO API responded with status: ${response.status}`);
// //     }
// //
// //     const data = await response.json();
// //
// //     // Validate response structure
// //     if (data.success === false) {
// //       return new Response(
// //         JSON.stringify({
// //           error: "Failed to fetch IP information",
// //           message: data.message
// //         }),
// //         {
// //           status: 400,
// //           headers: {
// //             "Content-Type": "application/json",
// //             "Access-Control-Allow-Origin": "*",
// //           },
// //         }
// //       );
// //     }
// //
// //     return new Response(JSON.stringify(data), {
// //       headers: {
// //         "Content-Type": "application/json",
// //         "Access-Control-Allow-Origin": "*",
// //         "Cache-Control": "public, s-maxage=3600", // Cache for 1 hour
// //       },
// //     });
// //
// //   } catch (error) {
// //     console.error("IPWHO API Error:", error);
// //
// //     return new Response(
// //       JSON.stringify({
// //         error: "Internal server error",
// //         message: error instanceof Error ? error.message : "Unknown error"
// //       }),
// //       {
// //         status: 500,
// //         headers: {
// //           "Content-Type": "application/json",
// //           "Access-Control-Allow-Origin": "*",
// //         },
// //       }
// //     );
// //   }
// // }
//
// import type { NextRequest } from "next/server";
//
// export const runtime = "edge"; // run on Vercel Edge Network
//
// // Handle GET request
// export async function GET(req: NextRequest) {
//   try {
//     // Extract client IP
//     const ip =
//       req.headers.get("cf-connecting-ip") ||
//       req.headers.get("x-real-ip") ||
//       req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
//       req.ip ||
//       null;
//
//     // Build API URL
//     const url = ip ? `https://ipwho.is/${ip}` : "https://ipwho.is/";
//
//     const response = await fetch(url);
//     if (!response.ok) {
//       throw new Error(`IPWHO API responded with status: ${response.status}`);
//     }
//
//     const data = await response.json();
//
//     if (data.success === false) {
//       return Response.json(
//         { error: "Failed to fetch IP information", message: data.message },
//         {
//           status: 400,
//           headers: corsHeaders,
//         }
//       );
//     }
//
//     return Response.json(data, { headers: corsHeaders });
//   } catch (error) {
//     console.error("IPWHO API Error:", error);
//     return Response.json(
//       {
//         error: "Internal server error",
//         message: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500, headers: corsHeaders }
//     );
//   }
// }
//
// // Handle OPTIONS for CORS preflight
// export async function OPTIONS() {
//   return new Response(null, {
//     status: 204,
//     headers: corsHeaders,
//   });
// }
//
// const corsHeaders = {
//   "Content-Type": "application/json",
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET,OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type",
//   "Cache-Control": "public, s-maxage=3600", // cache 1h
// };
