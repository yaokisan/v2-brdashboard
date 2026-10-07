import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_SESSION_COOKIE, hasAdminSessionToken } from './auth'

// API routes independently authorize every data operation. This guards page entry.
export async function requireAdminPage(): Promise<void> {
  const cookieStore = await cookies()
  const sessions = cookieStore.getAll(ADMIN_SESSION_COOKIE)
  if (sessions.length !== 1 || !hasAdminSessionToken(sessions[0].value)) redirect('/')
}
