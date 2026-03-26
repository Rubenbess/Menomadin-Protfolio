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
  description: string | null
  logo_url: string | null
  entry_stage: string | null
  investment_owner: string | null
  board_seat: string | null
  co_investors: string[] | null
  created_at: string
}

export interface Contact {
  id: string
  company_id: string
  name: string
  position: string
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
  target_round: string | null
  notes: string | null
}

export interface Document {
  id: string
  company_id: string
  file_url: string
  file_name: string
  type: string
  created_at: string
  extracted_data: {
    summary?: string
    metrics?: Record<string, string>
    key_points?: string[]
  } | null
}

export interface CompanyKPI {
  id: string
  company_id: string
  date: string
  revenue: number | null
  arr: number | null
  run_rate: number | null
  burn_rate: number | null
  cash_runway: number | null
  headcount: number | null
  gross_margin: number | null
  notes: string | null
  custom_kpis: Record<string, string> | null
  created_at: string
}

export interface CompanyUpdate {
  id: string
  company_id: string
  date: string
  category: string
  title: string
  notes: string | null
  created_at: string
}

export interface PipelineEntry {
  id: string
  name: string
  sector: string
  stage: string
  status: string
  notes: string | null
  hq: string | null
  fundraising_ask: number | null
  lead_partner: string | null
  source: string | null
  internal_score: number | null
  next_steps: string | null
  deck_url: string | null
  created_at: string
}

export interface Reminder {
  id: string
  company_id: string | null
  title: string
  due_date: string
  category: string
  notes: string | null
  completed: boolean
  created_at: string
}

// Aggregated types used in UI
export interface CompanyWithMetrics extends Company {
  totalInvested: number
  currentValue: number
  moic: number
  ownershipPct: number
  plannedReserves: number
  deployedReserves: number
  initialInvestment: number
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

export type TaskStatus = 'not-started' | 'in-progress' | 'waiting' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface TeamMember {
  id: string
  name: string
  role: string | null
  color: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  company_id: string | null
  assignee_id: string | null
  created_at: string
  updated_at: string
}

export interface TaskWithRelations extends Task {
  companies: { id: string; name: string } | null
  team_members: { id: string; name: string; color: string; role: string | null } | null
}
