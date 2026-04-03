'use client'

import React, { InputHTMLAttributes, TextareaHTMLAttributes, useState } from 'react'
import { AlertCircle, Check } from 'lucide-react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  helperText?: string
  validation?: 'email' | 'number' | 'required' | 'url' | 'custom'
  onValidate?: (value: string) => string | null
  showSuccess?: boolean
}

export function FormField({
  label,
  error,
  hint,
  helperText,
  validation,
  onValidate,
  showSuccess,
  className = '',
  required,
  type,
  ...props
}: FormFieldProps) {
  const [localError, setLocalError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const displayError = error || (touched && localError)

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true)
    validateField(e.currentTarget.value)
    props.onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true)
    if (touched) {
      validateField(e.currentTarget.value)
    }
    props.onChange?.(e)
  }

  const validateField = (value: string) => {
    let fieldError: string | null = null

    if (required && !value.trim()) {
      fieldError = `${label || 'This field'} is required`
    } else if (validation === 'email' && value && !isValidEmail(value)) {
      fieldError = 'Please enter a valid email address'
    } else if (validation === 'number' && value && isNaN(Number(value))) {
      fieldError = 'Please enter a valid number'
    } else if (validation === 'url' && value && !isValidUrl(value)) {
      fieldError = 'Please enter a valid URL'
    } else if (validation === 'custom' && onValidate && value) {
      fieldError = onValidate(value)
    }

    setLocalError(fieldError)
  }

  const isValid = isDirty && !displayError && touched

  return (
    <div className="mb-4">
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type={type}
          required={required}
          {...props}
          className={`field-input ${
            displayError
              ? 'border-b-red-500 focus:border-b-red-500 focus:ring-red-500/20'
              : isValid
                ? 'border-b-emerald-500 focus:border-b-emerald-500 focus:ring-emerald-500/20'
                : ''
          } ${className}`}
          onBlur={handleBlur}
          onChange={handleChange}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? `${props.name}-error` : helperText ? `${props.name}-hint` : undefined}
        />

        {displayError && (
          <AlertCircle
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none"
          />
        )}

        {isValid && showSuccess && (
          <Check
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
          />
        )}
      </div>

      {displayError && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1" id={`${props.name}-error`}>
          <AlertCircle size={14} />
          {displayError}
        </p>
      )}

      {!displayError && helperText && (
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-500" id={`${props.name}-hint`}>
          {helperText}
        </p>
      )}

      {hint && !displayError && (
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  )
}

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  maxCharacters?: number
}

export function FormTextarea({
  label,
  error,
  helperText,
  maxCharacters,
  className = '',
  required,
  value,
  ...props
}: FormTextareaProps) {
  const [touched, setTouched] = useState(false)

  const displayError = error && touched ? error : null
  const charCount = value ? String(value).length : 0
  const isNearLimit = maxCharacters && charCount > maxCharacters * 0.8

  return (
    <div className="mb-4">
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <textarea
          required={required}
          value={value}
          {...props}
          className={`field-input resize-none ${
            displayError ? 'border-b-red-500 focus:border-b-red-500 focus:ring-red-500/20' : ''
          } ${className}`}
          onBlur={() => setTouched(true)}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? `${props.name}-error` : helperText ? `${props.name}-hint` : undefined}
        />
      </div>

      <div className="flex items-center justify-between mt-1">
        <div>
          {displayError && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1" id={`${props.name}-error`}>
              <AlertCircle size={14} />
              {displayError}
            </p>
          )}

          {!displayError && helperText && (
            <p className="text-xs text-neutral-600 dark:text-neutral-500" id={`${props.name}-hint`}>
              {helperText}
            </p>
          )}
        </div>

        {maxCharacters && (
          <p className={`text-xs ${isNearLimit ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-neutral-500 dark:text-neutral-600'}`}>
            {charCount}/{maxCharacters}
          </p>
        )}
      </div>
    </div>
  )
}

// Validation helpers
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
