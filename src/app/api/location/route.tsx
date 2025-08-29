// import { NextResponse } from "next/server";
//
// export async function GET() {
//   try {
//     const res = await fetch("http://ip-api.com/json");
//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to fetch location" },
//         { status: 500 }
//       );
//     }
//
//     const data = await res.json();
//     return NextResponse.json(data);
//   } catch (err) {
//     return NextResponse.json(
//       { error: "Location lookup failed" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://ipwho.is/");
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Location lookup failed" }, { status: 500 });
  }
}
