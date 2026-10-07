import { requireAdminPage } from '@/lib/admin-page'
import PageClient from './page-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Page() {
  await requireAdminPage()
  return <PageClient />
}
