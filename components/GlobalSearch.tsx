'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, Users, GitMerge, X } from 'lucide-react'

interface Result {
  type: 'company' | 'contact' | 'deal'
  id: string
  title: string
  subtitle: string
  href: string
  logo: string | null
}

const TYPE_CONFIG = {
  company: { label: 'Company',  icon: Building2, color: 'text-violet-500 bg-violet-50' },
  contact: { label: 'Contact',  icon: Users,     color: 'text-blue-500 bg-blue-50' },
  deal:    { label: 'Deal',     icon: GitMerge,  color: 'text-emerald-500 bg-emerald-50' },
}

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard shortcut Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setCursor(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setResults(json.results ?? [])
      setCursor(0)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 200)
  }

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) navigate(results[cursor].href)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs text-slate-400 transition-all"
    >
      <Search size={12} />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="hidden sm:inline text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/[0.08] overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Search companies, contacts, deals…"
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {loading && (
            <svg className="animate-spin h-4 w-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="py-2 max-h-80 overflow-y-auto">
            {results.map((r, i) => {
              const cfg = TYPE_CONFIG[r.type]
              const Icon = cfg.icon
              return (
                <button
                  key={r.id}
                  onClick={() => navigate(r.href)}
                  onMouseEnter={() => setCursor(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === cursor ? 'bg-violet-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {r.logo ? (
                    <img src={r.logo} alt="" className="w-7 h-7 rounded-lg object-contain bg-slate-50 ring-1 ring-slate-100 flex-shrink-0" />
                  ) : (
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon size={13} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </button>
              )
            })}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div className="py-10 text-center text-sm text-slate-400">No results for "{query}"</div>
        ) : query.length === 0 ? (
          <div className="py-6 px-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick navigation</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Companies', href: '/companies', icon: Building2, color: 'bg-violet-50 text-violet-600' },
                { label: 'Contacts',  href: '/contacts',  icon: Users,     color: 'bg-blue-50 text-blue-600' },
                { label: 'Pipeline',  href: '/pipeline',  icon: GitMerge,  color: 'bg-emerald-50 text-emerald-600' },
              ].map(({ label, href, icon: Icon, color }) => (
                <button
                  key={href}
                  onClick={() => navigate(href)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={12} />
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {results.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-400">
            <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">↵</kbd> open</span>
            <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  )
}
