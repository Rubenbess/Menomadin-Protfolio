'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, TrendingUp, Zap } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { calcSafeConversion } from '@/lib/calculations'
import { convertSafe } from '@/actions/safes'
import type { Safe, Round } from '@/lib/types'
import { fmt$$, fmtPct } from '@/lib/calculations'

interface Props {
  safe: Safe
  rounds: Round[]
  open: boolean
  onClose: () => void
}

export default function SafeScenarioModal({ safe, rounds, open, onClose }: Props) {
  const router = useRouter()
  const [preMoney, setPreMoney]   = useState('')
  const [raise, setRaise]         = useState('')
  const [roundId, setRoundId]     = useState('')
  const [converting, setConverting] = useState(false)
  const [convertErr, setConvertErr] = useState<string | null>(null)

  const preMoneNum = parseFloat(preMoney) || 0
  const raiseNum   = parseFloat(raise)    || 0

  const result = preMoneNum > 0 && raiseNum > 0
    ? calcSafeConversion(
        safe.investment_amount,
        safe.valuation_cap,
        safe.discount_rate,
        preMoneNum,
        raiseNum,
      )
    : null

  const MECH_LABELS = {
    cap:           'Valuation Cap triggered',
    discount:      'Discount triggered',
    mfn:           'MFN — converts at round price',
    'cap+discount': safe.valuation_cap && safe.discount_rate
      ? parseFloat(preMoney) * (1 - (safe.discount_rate / 100)) < safe.valuation_cap
          ? 'Discount triggered (better for you)'
          : 'Cap triggered (better for you)'
      : 'Cap triggered',
  }

  async function handleConvert() {
    if (!roundId || !preMoneNum || !raiseNum) return
    setConverting(true)
    setConvertErr(null)
    const res = await convertSafe(safe.id, roundId, preMoneNum, raiseNum)
    setConverting(false)
    if (res.error) { setConvertErr(res.error); return }
    router.refresh()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="SAFE Scenario & Conversion">
      <div className="space-y-5">

        {/* SAFE summary */}
        <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Investment</p>
            <p className="text-sm font-bold text-slate-900">{fmt$$(safe.investment_amount)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valuation Cap</p>
            <p className="text-sm font-bold text-slate-900">{safe.valuation_cap ? fmt$$(safe.valuation_cap) : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Discount Rate</p>
            <p className="text-sm font-bold text-slate-900">{safe.discount_rate ? `${safe.discount_rate}%` : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">MFN / Pro-rata</p>
            <p className="text-sm font-bold text-slate-900">
              {[safe.has_mfn && 'MFN', safe.has_pro_rata && 'Pro-rata'].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
        </div>

        {/* Scenario inputs */}
        <div>
          <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Calculator size={15} className="text-brand-500" />
            Model next round
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Next Round Pre-money ($)</label>
              <input type="number" className="field-input" placeholder="e.g. 15000000"
                value={preMoney} onChange={e => setPreMoney(e.target.value)} min="0" step="any" />
            </div>
            <div>
              <label className="field-label">Round Raise ($)</label>
              <input type="number" className="field-input" placeholder="e.g. 3000000"
                value={raise} onChange={e => setRaise(e.target.value)} min="0" step="any" />
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-brand-50 rounded-xl p-4 ring-1 ring-violet-200 space-y-3">
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={12} /> Conversion result
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Effective Conversion Val.</p>
                <p className="text-sm font-bold text-slate-900">{fmt$$(result.effectiveVal)}</p>
                <p className="text-[11px] text-brand-500 mt-0.5">{MECH_LABELS[result.mechanism]}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Our Ownership</p>
                <p className="text-lg font-bold text-brand-600">{fmtPct(result.ownershipPct)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stake Value (post-round)</p>
                <p className="text-sm font-bold text-emerald-600">{fmt$$(result.sharesValue)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">MOIC at conversion</p>
                <p className="text-sm font-bold text-slate-900">
                  {(result.sharesValue / safe.investment_amount).toFixed(2)}x
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Convert section */}
        {safe.status === 'unconverted' && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-500" />
              Convert this SAFE
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Select the round this SAFE converted at and confirm. A cap table entry will be created automatically.
            </p>
            <div className="mb-3">
              <label className="field-label">Round</label>
              <select className="field-select" value={roundId} onChange={e => setRoundId(e.target.value)}>
                <option value="">Select round…</option>
                {rounds.map(r => (
                  <option key={r.id} value={r.id}>{r.type} — {r.date}</option>
                ))}
              </select>
            </div>
            {convertErr && <p className="text-xs text-red-500 mb-2">{convertErr}</p>}
            {!preMoneNum || !raiseNum ? (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Fill in the next round figures above to calculate ownership before converting.
              </p>
            ) : (
              <Button
                onClick={handleConvert}
                loading={converting}
                disabled={!roundId || !preMoneNum || !raiseNum}
                className="w-full"
              >
                Convert SAFE → {result ? fmtPct(result.ownershipPct) : ''} ownership
              </Button>
            )}
          </div>
        )}

        {safe.status === 'converted' && (
          <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-3 ring-1 ring-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-medium text-emerald-800">This SAFE has already been converted.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
