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
  company: { label: 'Company',  icon: Building2, color: 'text-primary-500 bg-gold-50' },
  contact: { label: 'Contact',  icon: Users,     color: 'text-blue-500 bg-blue-50' },
  deal:    { label: 'Deal',     icon: GitMerge,  color: 'text-emerald-500 bg-emerald-50' },
}

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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
      setHasMore(false)
      setCursor(0)
    }
    return () => abortRef.current?.abort()
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setHasMore(false); return }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      const json = await res.json()
      setResults(json.results ?? [])
      setHasMore(json.hasMore ?? false)
      setCursor(0)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      throw err
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
      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs text-neutral-500 dark:text-neutral-400 transition-all"
    >
      <Search size={12} />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="hidden sm:inline text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-lg shadow-2xl ring-1 ring-black/[0.08] dark:ring-white/[0.08] overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-700">
          <Search size={16} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Search companies, contacts, deals…"
            className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none"
          />
          {loading && (
            <svg className="animate-spin h-4 w-4 text-slate-300 dark:text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <button onClick={() => setOpen(false)} className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition-colors flex-shrink-0">
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
                    i === cursor ? 'bg-gold-50 dark:bg-gold-900/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  {r.logo ? (
                    <img src={r.logo} alt="" className="w-7 h-7 rounded-lg object-contain bg-neutral-50 dark:bg-neutral-800 ring-1 ring-slate-100 dark:ring-neutral-700 flex-shrink-0" />
                  ) : (
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon size={13} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{r.subtitle}</p>}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </button>
              )
            })}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">No results for "{query}"</div>
        ) : query.length === 0 ? (
          <div className="py-6 px-4">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Quick navigation</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Companies', href: '/companies', icon: Building2, color: 'bg-gold-50 text-primary-500' },
                { label: 'Contacts',  href: '/contacts',  icon: Users,     color: 'bg-blue-50 text-blue-600' },
                { label: 'Pipeline',  href: '/pipeline',  icon: GitMerge,  color: 'bg-emerald-50 text-emerald-600' },
              ].map(({ label, href, icon: Icon, color }) => (
                <button
                  key={href}
                  onClick={() => navigate(href)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-colors"
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
          <div className="px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span><kbd className="bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 px-1.5 py-0.5 rounded font-mono">↵</kbd> open</span>
            <span><kbd className="bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 px-1.5 py-0.5 rounded font-mono">Esc</kbd> close</span>
            {hasMore && (
              <span className="ml-auto text-neutral-400 dark:text-neutral-500">More results — refine your query</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
