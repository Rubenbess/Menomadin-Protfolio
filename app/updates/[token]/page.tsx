import { createClient } from '@supabase/supabase-js'
import FounderUpdateForm from './FounderUpdateForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function FounderUpdatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, sector')
    .eq('update_token', token)
    .single()

  if (!company) return notFound()

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <img src="/menomadin-icon.svg" alt="" className="h-4 w-4 invert" />
            Menomadin Group
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-slate-500 mt-1">Monthly / Quarterly Update</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.06] p-6">
          <FounderUpdateForm companyId={company.id} companyName={company.name} />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          This form is confidential and shared only with the Menomadin investment team.
        </p>
      </div>
    </div>
  )
}
