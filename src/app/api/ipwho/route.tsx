const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export async function GET(req: Request) {
  try {
    let ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";

    if (ip.startsWith("::ffff:")) ip = ip.substring(7);

    const privateIpPattern = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.)/;
    const loopbackIpv6 = /^::1$/;
    const isPrivate = privateIpPattern.test(ip) || loopbackIpv6.test(ip);
    const queryIp = isPrivate ? "" : ip;

    // --- Cache check
    const cached = cache.get(queryIp);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return jsonResponse(cached.data);
    }

    // --- Fetch from ip-api.com
    const res = await fetch(`http://ip-api.com/json/${queryIp}`);
    const raw = await res.json();

    if (raw.status !== "success") {
      throw new Error(raw.message || "Failed to fetch IP info");
    }

    // --- Normalize to your LocationData type
    const data = {
      ip: raw.query ?? "",
      success: raw.status === "success",
      type: "IPv4", // ip-api doesn’t specify type; assume IPv4
      continent: "", // not provided
      continent_code: "",
      country: raw.country ?? "",
      country_code: raw.countryCode?.toLowerCase?.() ?? "",
      region: raw.regionName ?? "",
      region_code: raw.region ?? "",
      city: raw.city ?? "",
      latitude: raw.lat ?? 0,
      longitude: raw.lon ?? 0,
      is_eu: false, // ip-api doesn't provide this
      postal: raw.zip ?? "",
      calling_code: "",
      capital: "",
      borders: "",
      flag: {
        img: `https://flagcdn.com/w80/${raw.countryCode?.toLowerCase?.() ?? "xx"}.png`,
        emoji: "",
        emoji_unicode: "",
      },
      connection: {
        asn: parseInt(raw.as?.match(/\d+/)?.[0] ?? "0", 10),
        org: raw.org ?? "",
        isp: raw.isp ?? "",
        domain: "",
      },
      timezone: {
        id: raw.timezone ?? "",
        abbr: "",
        is_dst: false,
        offset: 0,
        utc: "",
        current_time: new Date().toISOString(),
      },
    };

    // --- Cache the normalized result
    cache.set(queryIp, { data, timestamp: Date.now() });

    return jsonResponse(data);
  } catch (err: any) {
    const fallback = {
      ip: "",
      success: false,
      type: "",
      continent: "",
      continent_code: "",
      country: "Unknown",
      country_code: "",
      region: "",
      region_code: "",
      city: "",
      latitude: 0,
      longitude: 0,
      is_eu: false,
      postal: "",
      calling_code: "",
      capital: "",
      borders: "",
      flag: { img: "", emoji: "", emoji_unicode: "" },
      connection: { asn: 0, org: "", isp: "", domain: "" },
      timezone: { id: "", abbr: "", is_dst: false, offset: 0, utc: "", current_time: "" },
    };

    return jsonResponse(fallback);
  }
}

// --- Helper for consistent JSON + CORS
function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

