// クライアントからの環境変数参照は行わない。ログインは /api/login を使用します。
export {};

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function setAuthCookie() {
  if (typeof window !== 'undefined') {
    document.cookie = 'auth=true; path=/; max-age=86400';
  }
}