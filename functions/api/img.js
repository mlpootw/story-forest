const ALLOWED = [/^books\.google(usercontent)?\.com$/, /^books\.googleapis\.com$/, /^covers\.openlibrary\.org$/, /^archive\.org$/, /\.archive\.org$/, /\.supabase\.co$/]

export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get('u') || ''
  let target
  try { target = new URL(u) } catch { return new Response('bad url', { status: 400 }) }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') return new Response('bad url', { status: 400 })
  if (!ALLOWED.some((re) => re.test(target.hostname))) return new Response('not allowed', { status: 403 })
  target.protocol = 'https:'
  const res = await fetch(target.toString(), { cf: { cacheTtl: 86400 * 30, cacheEverything: true }, redirect: 'follow' })
  const type = res.headers.get('content-type') || ''
  if (!res.ok || !type.startsWith('image/')) return new Response('not found', { status: 404 })
  return new Response(res.body, {
    headers: { 'content-type': type, 'cache-control': 'public, max-age=2592000', 'access-control-allow-origin': '*' }
  })
}
