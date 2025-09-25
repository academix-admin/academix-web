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
