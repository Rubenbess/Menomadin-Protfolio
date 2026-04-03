/**
 * Modern Professional Design System
 * Clean, sophisticated, data-focused aesthetic
 */

export const colors = {
  // Primary: Soft professional blue
  primary: {
    50: '#f0f4f9',
    100: '#e1e8f0',
    200: '#c3d1e0',
    300: '#a5bad1',
    400: '#87a3c2',
    500: '#5a7fa8', // primary brand
    600: '#4a6a8f',
    700: '#3a5576',
    800: '#2a405d',
    900: '#1a2b44',
  },

  // Neutrals: Soft grays for professional feel
  neutral: {
    0: '#ffffff',
    50: '#fafbfc',
    100: '#f4f6f8',
    200: '#e8ecf0',
    300: '#dce2e8',
    400: '#c4ccd4',
    500: '#a8b2bc',
    600: '#8c96a2',
    700: '#707a88',
    800: '#545e6e',
    900: '#384854',
  },

  // Semantic colors (keeping existing for compatibility)
  success: '#10b981',   // emerald
  warning: '#f59e0b',   // amber
  error: '#ef4444',     // red
  info: '#3b82f6',      // blue

  // Status indicators
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    pending: '#8b5cf6',  // purple
    neutral: '#6b7280',  // gray
  },
}

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Fira Code", "Monaco", "Courier New", monospace',
  },
  sizes: {
    xs: { size: '12px', lineHeight: '16px', weight: '400' },
    sm: { size: '14px', lineHeight: '20px', weight: '400' },
    base: { size: '16px', lineHeight: '24px', weight: '400' },
    lg: { size: '18px', lineHeight: '28px', weight: '500' },
    xl: { size: '20px', lineHeight: '30px', weight: '600' },
    '2xl': { size: '24px', lineHeight: '32px', weight: '600' },
    '3xl': { size: '30px', lineHeight: '36px', weight: '700' },
  },
}

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
}

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
}

export const borderRadius = {
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
}

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
}

// Component-specific patterns
export const components = {
  button: {
    primary: {
      light: {
        bg: colors.primary[500],
        text: colors.neutral[0],
        hover: colors.primary[600],
        active: colors.primary[700],
      },
      dark: {
        bg: colors.primary[700],
        text: colors.neutral[0],
        hover: colors.primary[800],
        active: colors.primary[900],
      },
    },
    secondary: {
      light: {
        bg: colors.neutral[100],
        text: colors.neutral[900],
        hover: colors.neutral[200],
        active: colors.neutral[300],
      },
      dark: {
        bg: colors.neutral[700],
        text: colors.neutral[50],
        hover: colors.neutral[600],
        active: colors.neutral[500],
      },
    },
    ghost: {
      light: {
        bg: 'transparent',
        text: colors.primary[500],
        hover: colors.primary[50],
        active: colors.primary[100],
      },
      dark: {
        bg: 'transparent',
        text: colors.primary[400],
        hover: colors.primary[900],
        active: colors.primary[800],
      },
    },
  },

  card: {
    light: {
      bg: colors.neutral[0],
      border: colors.neutral[200],
      text: colors.neutral[900],
      shadow: shadows.base,
    },
    dark: {
      bg: colors.neutral[800],
      border: colors.neutral[700],
      text: colors.neutral[50],
      shadow: shadows.lg,
    },
  },

  input: {
    light: {
      bg: colors.neutral[50],
      border: colors.neutral[300],
      text: colors.neutral[900],
      placeholder: colors.neutral[500],
      focus: colors.primary[500],
    },
    dark: {
      bg: colors.neutral[700],
      border: colors.neutral[600],
      text: colors.neutral[50],
      placeholder: colors.neutral[400],
      focus: colors.primary[400],
    },
  },
}
