import {
  Home,
  LayoutGrid,
  MessageSquare,
  Palette,
  LayoutTemplate,
} from 'lucide-react';

export const v0SidebarNav = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Projects', href: '/dashboard/home', icon: LayoutGrid },
  { label: 'Chats', href: '/dashboard/debug/history', icon: MessageSquare },
  { label: 'Design Systems', href: '/dashboard/settings', icon: Palette },
  { label: 'Templates', href: '/dashboard/web-builder', icon: LayoutTemplate },
] as const;

