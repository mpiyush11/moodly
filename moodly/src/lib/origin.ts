export interface OriginEnvironment {
  NODE_ENV?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  MOODLY_TRUSTED_ORIGINS?: string;
  CODESPACE_NAME?: string;
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?: string;
  PORT?: string;
}

export function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

function headerOrigin(host: string | null, protocol: string): string | null {
  const first = host?.split(',')[0]?.trim();
  if (!first || /[\s/@?#\\]/.test(first)) return null;
  return normalizeOrigin(`${protocol}://${first}`);
}

const codespacesOrigin = /^https:\/\/[a-z0-9\-]+-\d+\.app\.github\.dev$/i;

function developmentProxy(env: OriginEnvironment): boolean {
  return env.NODE_ENV === 'development' || Boolean(env.CODESPACE_NAME);
}

function matchesOriginHost(request: Request, origin: string): boolean {
  // TLS can terminate before Next.js, so match the public host using the
  // browser's scheme rather than depending on a rewritten proxy protocol.
  const protocol = new URL(origin).protocol.slice(0, -1);
  return ['host', 'x-forwarded-host'].some(name => headerOrigin(request.headers.get(name), protocol) === origin);
}

export function trustedRequestOrigins(request: Request, env: OriginEnvironment = process.env): Set<string> {
  const trusted = new Set<string>();
  const add = (value: string | null | undefined) => { if (value) { const origin = normalizeOrigin(value); if (origin) trusted.add(origin); } };
  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto === 'https' || forwardedProto === 'http' ? forwardedProto : url.protocol.slice(0, -1);
  add(url.origin);
  // Mutating/admin routes keep exact origins. Read-only checkout has a
  // separate, development-only Codespaces fallback in validateOrigin.
  add(headerOrigin(request.headers.get('host'), protocol));
  add(headerOrigin(request.headers.get('x-forwarded-host'), protocol));
  add(env.NEXT_PUBLIC_SITE_URL);
  for (const entry of (env.MOODLY_TRUSTED_ORIGINS ?? '').split(',')) add(entry.trim());
  if (developmentProxy(env) && env.CODESPACE_NAME && /^[a-zA-Z0-9-]+$/.test(env.CODESPACE_NAME)) {
    const domain = env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
    if (/^[a-zA-Z0-9.-]+$/.test(domain) && !domain.includes('..')) add(`https://${env.CODESPACE_NAME}-${env.PORT || '3000'}.${domain}`);
  }
  return trusted;
}

export function isTrustedRequestOrigin(request: Request, env: OriginEnvironment = process.env): boolean {
  const value = request.headers.get('origin');
  const origin = value ? normalizeOrigin(value) : null;
  if (!origin) return false;
  // A browser cross-site POST must not gain access simply by being proxied.
  if (request.headers.get('sec-fetch-site')?.trim().toLowerCase() === 'cross-site') return false;
  return trustedRequestOrigins(request, env).has(origin) || matchesOriginHost(request, origin);
}

// Checkout only returns catalogue quotes and non-binding WhatsApp drafts.
// Keep this proxy fallback separate from the strict guard used by admin writes.
export function validateOrigin(request: Request, env: OriginEnvironment = process.env): boolean {
  const site = request.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (site === 'cross-site') return false;
  const value = request.headers.get('origin');
  if (value !== null) {
    const origin = normalizeOrigin(value);
    if (!origin) return false; // Includes an explicit Origin: null.
    return isTrustedRequestOrigin(request, env) || (developmentProxy(env) && codespacesOrigin.test(origin));
  }

  // Origin-less browser requests need same-origin navigation metadata.
  // Internal callers need a valid incoming authority; Next.js may construct
  // request.url with its bind address (0.0.0.0) instead of that public host.
  if (site) return site === 'same-origin' || site === 'none';
  const url = new URL(request.url);
  const protocol = url.protocol.slice(0, -1);
  if (['host', 'x-forwarded-host'].some(name => headerOrigin(request.headers.get(name), protocol))) return true;
  return developmentProxy(env) && codespacesOrigin.test(url.origin);
}
