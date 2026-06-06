import {
  Bug,
  Code2,
  Home,
  LayoutGrid,
} from 'lucide-react';

export const dashboardPrimaryNav = [
  { label: 'Home', href: '/dashboard', icon: Home },
] as const;

export const dashboardMoreNav = [
  { label: 'Projects', href: '/dashboard/home', icon: LayoutGrid },
  { label: 'Debug', href: '/dashboard/debug', icon: Bug },
  { label: 'Web Builder', href: '/dashboard/web-builder', icon: Code2 },
] as const;
