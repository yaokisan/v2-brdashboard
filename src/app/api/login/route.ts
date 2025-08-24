import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (password === adminPassword) {
      // 既存のクライアント側判定が document.cookie を読むため、
      // 読み取れるクッキーを発行（HttpOnlyは付けない）
      const res = NextResponse.json({ ok: true });
      res.headers.append(
        'Set-Cookie',
        `auth=true; Path=/; Max-Age=86400; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      );
      return res;
    }

    return NextResponse.json({ error: 'パスワードが間違っています' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}