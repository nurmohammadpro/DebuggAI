'use client';

import { AccountMenu } from '@/components/account/account-menu';
import { cn } from '@/lib/utils';

export function WorkspaceAccountMenu({ className }: { className?: string }) {
  return <AccountMenu align="end" className={cn('h-11 w-11 md:h-8 md:w-8', className)} />;
}
