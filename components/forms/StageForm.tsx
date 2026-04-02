'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { createStage, updateStage } from '@/actions/pipeline-stages'
import { useRouter } from 'next/navigation'

const COLORS = [
  { value: 'slate',  label: 'Grey',   bg: 'bg-slate-400' },
  { value: 'blue',   label: 'Blue',   bg: 'bg-blue-400' },
  { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-400' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-400' },
  { value: 'amber',  label: 'Amber',  bg: 'bg-amber-400' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-400' },
  { value: 'green',  label: 'Green',  bg: 'bg-green-400' },
  { value: 'red',    label: 'Red',    bg: 'bg-red-400' },
]

interface Stage { id: string; name: string; color: string; position: number }

interface Props {
  stage?: Stage
  nextPosition?: number
  onClose: () => void
}

export default function StageForm({ stage, nextPosition = 0, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState(stage?.name ?? '')
  const [color, setColor] = useState(stage?.color ?? 'slate')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const result = stage
      ? await updateStage(stage.id, { name: name.trim(), color })
      : await createStage({ name: name.trim(), color, position: nextPosition })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Stage name *</label>
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white transition-all"
          placeholder="e.g. Portfolio Review"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                color === c.value
                  ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                  : 'opacity-60 hover:opacity-100'
              }`}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1">
          {stage ? 'Save changes' : 'Add stage'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
