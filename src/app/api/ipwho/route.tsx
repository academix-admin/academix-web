// app/api/ipwho/route.ts
export async function GET(req: Request) {
  let ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  // normalize IPv6-mapped IPv4 (e.g. "::ffff:192.168.1.239")
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  // regex patterns for private/reserved IPv4 & localhost
  const privateIpPattern = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.)/;
  const loopbackIpv6 = /^::1$/;

  const isPrivate = privateIpPattern.test(ip) || loopbackIpv6.test(ip);

  const queryIp = isPrivate ? "" : ip;

  const apiRes = await fetch(`https://ipwho.is/${queryIp}`);
  const data = await apiRes.json();

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
