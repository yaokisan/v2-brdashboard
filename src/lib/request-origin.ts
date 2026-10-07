// Next may build request.url with an internal/configured hostname behind a proxy.
// Browser scripts cannot arbitrarily set Host or Origin; compare public Host while
// retaining the protocol supplied by Next's request adapter. Do not trust a
// caller-supplied X-Forwarded-Host as an alternate allowed origin.
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false
  try {
    const requestUrl = new URL(request.url)
    const originUrl = new URL(origin)
    if (!['http:', 'https:'].includes(requestUrl.protocol) || origin !== originUrl.origin) return false
    const host = request.headers.get('host') ?? requestUrl.host
    // Reject userinfo, paths, whitespace and comma-separated/multiple hosts.
    if (!/^[A-Za-z0-9.:[\]-]+$/.test(host)) return false
    const publicUrl = new URL(`${requestUrl.protocol}//${host}`)
    return originUrl.origin === publicUrl.origin
  } catch {
    return false
  }
}
