const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'default-dev-password';

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function setAuthCookie() {
  if (typeof window !== 'undefined') {
    document.cookie = 'auth=true; path=/; max-age=86400';
  }
}