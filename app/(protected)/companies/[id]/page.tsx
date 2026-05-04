import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import CompanyDetailClient from './CompanyDetailClient'
import type { Company, Round, Investment, CapTableEntry, Document, CompanyKPI, CompanyUpdate, Safe, ShareSeries, OptionPool, WaterfallScenario, TaskWithRelations, LegalEntity } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const queries = await Promise.all([
    supabase.from('companies').select('*').eq('id', id).single(),
    supabase.from('rounds').select('*').eq('company_id', id).order('date', { ascending: false }),
    supabase.from('investments').select('*').eq('company_id', id).order('date', { ascending: false }),
    supabase.from('cap_table').select('*').eq('company_id', id),
    supabase.from('documents').select('*').eq('company_id', id).order('created_at', { ascending: false }),
    supabase.from('company_kpis').select('*').eq('company_id', id).order('date', { ascending: false }),
    supabase.from('company_updates').select('*').eq('company_id', id).order('date', { ascending: false }),
    supabase.from('safes').select('*').eq('company_id', id).order('date', { ascending: false }),
    supabase.from('share_series').select('*').eq('company_id', id).order('liquidation_seniority', { ascending: false }),
    supabase.from('option_pools').select('*').eq('company_id', id).order('created_at', { ascending: true }),
    supabase.from('waterfall_scenarios').select('*').eq('company_id', id).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('company_id', id).order('created_at', { ascending: false }),
    supabase.from('legal_entities').select('*').order('created_at', { ascending: true }),
  ])

  const queryNames = [
    'companies', 'rounds', 'investments', 'cap_table', 'documents', 'company_kpis',
    'company_updates', 'safes', 'share_series', 'option_pools', 'waterfall_scenarios',
    'tasks', 'legal_entities',
  ]

  // The companies row "no rows" PGRST116 is the legitimate not-found path —
  // surface as 404. Any other error on any table indicates RLS / connectivity
  // problems and must propagate so Next.js renders error.tsx; silently
  // returning empty arrays would hide real failures behind blank tables.
  const [companyRes, ...rest] = queries
  if (companyRes.error) {
    if (companyRes.error.code === 'PGRST116') notFound()
    throw new Error(`Failed to load company ${id}: ${companyRes.error.message}`)
  }
  rest.forEach((res, i) => {
    if (res.error) {
      throw new Error(`Failed to load ${queryNames[i + 1]} for company ${id}: ${res.error.message}`)
    }
  })

  const company = companyRes.data
  const [
    , // companies handled above
    { data: rounds },
    { data: investments },
    { data: capTable },
    { data: documents },
    { data: kpis },
    { data: updates },
    { data: safes },
    { data: shareSeries },
    { data: optionPools },
    { data: waterfallScenarios },
    { data: tasks },
    { data: legalEntities },
  ] = queries

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
      shareSeries={(shareSeries ?? []) as ShareSeries[]}
      optionPools={(optionPools ?? []) as OptionPool[]}
      waterfallScenarios={(waterfallScenarios ?? []) as WaterfallScenario[]}
      tasks={(tasks ?? []) as TaskWithRelations[]}
      legalEntities={(legalEntities ?? []) as LegalEntity[]}
    />
  )
}
