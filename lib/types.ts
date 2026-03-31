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
  update_token: string | null
  created_at: string
}

export type ContactType = 'Founder' | 'Advisor' | 'Co-investor' | 'Service Provider' | 'Other'

export interface Contact {
  id: string
  company_id: string | null
  name: string
  position: string | null
  email: string | null
  phone: string | null
  address: string | null
  linkedin_url: string | null
  notes: string | null
  contact_type: ContactType | null
  relationship_owner: string | null
  last_interaction_date: string | null
  created_at: string
}

export interface ContactWithCompany extends Contact {
  companies: { id: string; name: string } | null
}

export type InteractionType = 'call' | 'meeting' | 'email' | 'other'

export interface ContactInteraction {
  id: string
  contact_id: string
  date: string
  interaction_type: InteractionType
  notes: string | null
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

export type DocumentCategory =
  | 'Term Sheet'
  | 'SHA'
  | 'Investment Agreement'
  | 'Board Minutes'
  | 'Financials'
  | 'Pitch Deck'
  | 'Legal'
  | 'Other'

export interface GlobalDocument {
  id: string
  company_id: string | null
  file_url: string
  file_name: string
  category: DocumentCategory
  doc_date: string | null
  notes: string | null
  created_at: string
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
  // Structured deal scoring (1-5 each)
  score_team: number | null
  score_market: number | null
  score_traction: number | null
  score_fit: number | null
  // Deal outcome
  pass_reason: string | null
  referred_by: string | null
  next_steps: string | null
  deck_url: string | null
  created_at: string
}

export interface Safe {
  id: string
  company_id: string
  date: string
  investment_amount: number
  valuation_cap: number | null
  discount_rate: number | null
  has_mfn: boolean
  has_pro_rata: boolean
  status: 'unconverted' | 'converted'
  converted_round_id: string | null
  notes: string | null
  created_at: string
}

// ─── Institutional Cap Table ─────────────────────────────────────────────────

export type DataCompleteness = 'minimal' | 'partial' | 'high_confidence' | 'fully_modeled'

export interface ShareSeries {
  id: string
  company_id: string
  round_id: string | null
  holder_name: string
  share_class: string
  is_preferred: boolean
  shares: number
  price_per_share: number | null
  invested_amount: number | null
  liquidation_pref_mult: number
  liquidation_seniority: number
  is_participating: boolean
  participation_cap_mult: number | null
  conversion_ratio: number
  anti_dilution: string
  created_at: string
}

export interface OptionPool {
  id: string
  company_id: string
  name: string
  shares_authorized: number
  shares_issued: number
  price_per_share: number | null
  created_at: string
}

export interface WaterfallScenario {
  id: string
  company_id: string
  name: string
  exit_value: number
  created_at: string
}

// Calculation engine types
export interface WaterfallHolder {
  id: string
  name: string
  shareClass: string
  isPreferred: boolean
  shares: number
  investedAmount: number
  liquidationPrefMult: number
  seniority: number
  isParticipating: boolean
  participationCapMult: number | null
  conversionRatio: number
}

export interface WaterfallHolderResult extends WaterfallHolder {
  proceeds: number
  ownershipPct: number
  multiple: number
  isConverting: boolean
}

export interface WaterfallResult {
  totalProceeds: number
  holders: WaterfallHolderResult[]
}

export type NotificationType =
  | 'kpi_added'
  | 'update_added'
  | 'stage_changed'
  | 'new_deal'
  | 'task_overdue'
  | 'investment_added'
  | 'company_added'
  | 'safe_added'
  | 'document_uploaded'
  | 'general'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  company_id: string | null
  link: string | null
  read: boolean
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

export interface HealthScore {
  total: number           // 0-100
  kpiScore: number        // 0-30
  runwayScore: number     // 0-30
  updateScore: number     // 0-20
  moicScore: number       // 0-20
  runwayMonths: number | null
  lastUpdateDays: number | null
  kpiTrend: 'up' | 'down' | 'flat' | null
  moic: number
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

export type UserRole = 'admin' | 'associate' | 'viewer'

export interface TeamMember {
  id: string
  user_id: string
  name: string
  email: string
  role: UserRole
  color: string
  created_at: string
}

export interface TeamInvite {
  id: string
  email: string
  role: UserRole
  status: 'pending' | 'accepted' | 'expired'
  invited_by: string
  created_at: string
  accepted_at: string | null
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
  task_participants: { team_member_id: string; team_members: { id: string; name: string; color: string } | null }[]
}
