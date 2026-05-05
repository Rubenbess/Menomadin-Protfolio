/**
 * Shared form-field Tailwind class strings.
 *
 * Form components previously each declared their own `const input` and
 * `const label` literals — they drifted independently and none included
 * `dark:` variants, so dark mode rendered fields as black-on-white. Centralize
 * here so dark-mode and a11y improvements happen in one place.
 *
 * Used both via `import` and via a copy of this exact substring inline in
 * legacy forms; if you change the class strings, update both call sites.
 */

export const inputClasses =
  'w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 focus:bg-white dark:focus:bg-neutral-900 transition-all'

export const labelClasses =
  'block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1.5'
