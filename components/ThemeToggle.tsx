'use client'

import { useTheme } from '@/lib/theme-context'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="p-2 text-neutral-600 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={18} />
      ) : (
        <Sun size={18} />
      )}
    </button>
  )
}
