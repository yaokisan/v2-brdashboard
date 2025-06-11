const ADMIN_PASSWORD = 'beauty-road-admin-2024';

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function setAuthCookie() {
  if (typeof window !== 'undefined') {
    document.cookie = 'auth=true; path=/; max-age=86400';
  }
}