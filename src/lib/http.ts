// GET a URL and parse the JSON body, throwing on a non-2xx status
export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  return (await res.json()) as T;
}
