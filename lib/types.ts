export type Strategy = 'impact' | 'venture'
export type CompanyStatus = 'active' | 'exited' | 'written-off' | 'watchlist'
export type Instrument = 'SAFE' | 'Equity' | 'Note' | 'Warrant'
export type PipelineStatus =
  | 'prospecting'
  | 'initial-meeting'
  | 'due-diligence'
  | 'term-sheet'
  | 'closed'
  | 'passed'

export interface Company {
  id: string
  name: string
  sector: string
  strategy: Strategy
  hq: string
  status: CompanyStatus
  created_at: string
}

export interface Round {
  id: string
  company_id: string
  date: string
  type: string
  pre_money: number
  post_money: number
  amount_raised: number
}

export interface Investment {
  id: string
  company_id: string
  round_id: string | null
  date: string
  amount: number
  instrument: Instrument
  valuation_cap: number | null
}

export interface CapTableEntry {
  id: string
  company_id: string
  round_id: string | null
  shareholder_name: string
  ownership_percentage: number
}

export interface Reserve {
  id: string
  company_id: string
  reserved_amount: number
  deployed_amount: number
}

export interface Document {
  id: string
  company_id: string
  file_url: string
  file_name: string
  type: string
  created_at: string
}

export interface PipelineEntry {
  id: string
  name: string
  sector: string
  stage: string
  status: PipelineStatus
  notes: string | null
  created_at: string
}

// Aggregated types used in UI
export interface CompanyWithMetrics extends Company {
  totalInvested: number
  currentValue: number
  moic: number
  ownershipPct: number
}

export interface DashboardMetrics {
  totalInvested: number
  totalCurrentValue: number
  tvpi: number
  moic: number
  companyCount: number
  capitalDeployed: number
  capitalReserved: number
}
