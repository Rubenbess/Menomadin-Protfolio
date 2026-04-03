import {
  Home,
  Building2,
  Users,
  BarChart3,
  FileText,
  Calendar,
  Settings,
  Network,
  TrendingUp,
  Upload,
  CheckSquare,
  AlertCircle,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  section?: string
  badge?: number
  children?: NavItem[]
}

export function getMainNavItems(): NavItem[] {
  return [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <Home size={20} />,
    },
    {
      label: 'Companies',
      href: '/companies',
      icon: <Building2 size={20} />,
      section: 'portfolio',
    },
    {
      label: 'Contacts',
      href: '/contacts',
      icon: <Users size={20} />,
      section: 'portfolio',
    },
    {
      label: 'Network',
      href: '/network',
      icon: <Network size={20} />,
      section: 'portfolio',
    },
    {
      label: 'Pipeline',
      href: '/pipeline',
      icon: <TrendingUp size={20} />,
      section: 'pipeline',
    },
    {
      label: 'Tasks',
      href: '/tasks',
      icon: <CheckSquare size={20} />,
      section: 'operations',
    },
    {
      label: 'Documents',
      href: '/documents',
      icon: <FileText size={20} />,
      section: 'operations',
    },
    {
      label: 'Reminders',
      href: '/reminders',
      icon: <AlertCircle size={20} />,
      section: 'operations',
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: <BarChart3 size={20} />,
      section: 'insights',
      badge: undefined, // New feature badge when needed
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: <FileText size={20} />,
      section: 'insights',
    },
    {
      label: 'Bulk Import',
      href: '/import',
      icon: <Upload size={20} />,
      section: 'tools',
      badge: undefined, // New feature badge when needed
    },
    {
      label: 'Settings',
      href: '/settings/security',
      icon: <Settings size={20} />,
      section: 'admin',
    },
  ]
}

export function getFooterNavItems(): NavItem[] {
  return [
    {
      label: 'Settings',
      href: '/settings/security',
      icon: <Settings size={20} />,
    },
  ]
}
