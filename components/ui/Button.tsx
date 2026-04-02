import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gold-600 text-white hover:bg-gold-700 shadow-refined hover:shadow-elevated focus:ring-gold-500/50 border-0 font-bold transition-all duration-200',
  secondary:
    'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border-0 font-bold transition-all duration-200',
  ghost:
    'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border-0 font-bold transition-all duration-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-refined hover:shadow-elevated focus:ring-red-500/50 border-0 font-bold transition-all duration-200',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl border
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-150
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
