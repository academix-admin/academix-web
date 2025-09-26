// // app/api/ipwho/route.tsx
export async function GET(req: Request) {
  const response = await fetch("https://ipwho.is/");
    const forwarded = req.headers.get("x-forwarded-for");
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded) || req.headers.get("x-real-ip")
      "";

    // detect private/reserved ranges
    const isPrivate =
      ip.startsWith("192.") ||
      ip.startsWith("10.") ||
      ip.startsWith("127.") ||
      ip.startsWith("::1");

    // if private → let ipwho.is auto-detect, else use public IP
    const queryIp = isPrivate ? "" : ip;

    const apiRes = await fetch(`https://ipwho.is/${queryIp}`);
    const data = await apiRes.json();

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Allow frontend
    },
  });
}
