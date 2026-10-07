import { requireAdminPage } from '@/lib/admin-page'
import PageClient from './page-client'
import demoData from '@/data/demo-data.json'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Only the bundled demo ID is public; database mutations still require API authentication.
  const { id } = await params
  if (id !== demoData.project.id) await requireAdminPage()
  return <PageClient params={params} />
}
