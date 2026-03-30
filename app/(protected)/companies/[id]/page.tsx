import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import CompanyDetailClient from './CompanyDetailClient'
import type { Company, Round, Investment, CapTableEntry, Document, CompanyKPI, CompanyUpdate, Safe } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const [
    { data: company },
    { data: rounds },
    { data: investments },
    { data: capTable },
    { data: documents },
    { data: kpis },
    { data: updates },
    { data: safes },
  ] = await Promise.all([
    supabase.from('companies').select('*').eq('id', id).single(),
    supabase.from('rounds').select('*').eq('company_id', id).order('date', { ascending: false }),
    supabase.from('investments').select('*').eq('company_id', id).order('date', { ascending: false }),
    supabase.from('cap_table').select('*').eq('company_id', id),
    supabase.from('documents').select('*').eq('company_id', id).order('created_at', { ascending: false }),
    supabase.from('company_kpis').select('*').eq('company_id', id).order('date', { ascending: false }),
    supabase.from('company_updates').select('*').eq('company_id', id).order('date', { ascending: false }),
    supabase.from('safes').select('*').eq('company_id', id).order('date', { ascending: false }),
  ])

  if (!company) notFound()

  return (
    <CompanyDetailClient
      company={company as Company}
      rounds={(rounds ?? []) as Round[]}
      investments={(investments ?? []) as Investment[]}
      capTable={(capTable ?? []) as CapTableEntry[]}
      documents={(documents ?? []) as Document[]}
      kpis={(kpis ?? []) as CompanyKPI[]}
      updates={(updates ?? []) as CompanyUpdate[]}
      safes={(safes ?? []) as Safe[]}
    />
  )
}
