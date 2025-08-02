const lottieCache = new Map<string, any>();

export async function preloadLottie(id: string, src: string): Promise<any> {
  if (lottieCache.has(id)) return lottieCache.get(id);

  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to load Lottie: ${src}`);
  const json = await res.json();
  lottieCache.set(id, json);
  return json;
}

export function getCachedLottie(id: string): any | null {
  return lottieCache.get(id) || null;
}
