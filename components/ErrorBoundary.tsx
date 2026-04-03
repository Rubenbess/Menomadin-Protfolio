'use client'

import React, { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Could send to error tracking service here
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4">
          <div className="card max-w-md w-full p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h1>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mb-6 text-left">
                <summary className="text-xs font-mono text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 mb-2">
                  Error details (dev only)
                </summary>
                <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs overflow-auto max-h-40 text-red-600 dark:text-red-400 font-mono">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <Button onClick={this.resetError} className="flex-1">
                Try again
              </Button>
              <Button
                variant="secondary"
                onClick={() => (window.location.href = '/')}
                className="flex-1"
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
