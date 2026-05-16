/**
 * Admin Dashboard Layout
 *
 * Server-side auth check with client-side collapsible sidebar and mobile responsive shell.
 */

export const dynamic = 'force-dynamic';

import { ReactNode } from 'react';
import { getCurrentUser, adminSignOut } from '@/lib/admin/auth';
import { redirect } from 'next/navigation';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.is_admin) {
    redirect('/');
  }

  async function handleSignOut() {
    'use server';
    await adminSignOut();
    redirect('/login');
  }

  return (
    <AdminLayoutShell
      userEmail={user.email || ''}
      userFullName={user.full_name || ''}
      signOutAction={handleSignOut}
    >
      {children}
    </AdminLayoutShell>
  );
}
