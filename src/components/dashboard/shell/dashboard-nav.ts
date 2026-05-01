import {
  Home,
  LayoutGrid,
  Bug,
  Code2,
  CreditCard,
  Gift,
  Settings,
} from 'lucide-react';

export const dashboardPrimaryNav = [
  { label: 'Home', href: '/dashboard', icon: Home },
] as const;

export const dashboardMoreNav = [
  { label: 'Projects', href: '/dashboard/home', icon: LayoutGrid },
  { label: 'Debug', href: '/dashboard/debug', icon: Bug },
  { label: 'Web Builder', href: '/dashboard/web-builder', icon: Code2 },
  { label: 'Pricing', href: '/dashboard/pricing', icon: CreditCard },
  { label: 'Referrals', href: '/dashboard/referrals', icon: Gift },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
] as const;
