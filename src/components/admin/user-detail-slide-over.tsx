/**
 * User Detail Slide-over Component
 *
 * Slide-over panel for viewing and managing user details with server actions.
 */

'use client';

import { useState } from 'react';
import { XIcon, RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { toggleAdminStatus, adjustUserCredits, updateUserPlan, toggleZeroKnowledgeMode, banUser } from '@/lib/admin/auth';
import { useInputDialog } from './input-dialog';
import { useConfirmDialog } from './confirm-dialog';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  plan_type: 'free' | 'pro' | 'team' | 'business' | 'enterprise';
}

interface Wallet {
  id: string;
  balance: number;
}

interface UserDetailSlideOverProps {
  user: User & {
    username: string | null;
    avatar_url: string | null;
    is_ambassador: boolean;
    referral_code: string;
    zero_knowledge_mode: boolean;
    last_login_at: string | null;
    created_at: string;
  };
  wallet: Wallet | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export function UserDetailSlideOver({ user, wallet, onClose, onUpdate }: UserDetailSlideOverProps) {
  const [plan, setPlan] = useState(user.plan_type);
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [zeroKnowledge, setZeroKnowledge] = useState(user.zero_knowledge_mode);
  const [credits, setCredits] = useState(wallet?.balance || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { prompt: showInputPrompt, InputDialogComponent } = useInputDialog();
  const { confirm: showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const handlePlanChange = async (newPlan: string) => {
    if (newPlan === plan) return;

    setIsSubmitting(true);
    try {
      const result = await updateUserPlan(user.id, newPlan as any);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPlan(newPlan as any);
        toast.success('Plan updated successfully');
        onUpdate?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCredits = async () => {
    const amountStr = await showInputPrompt(
      'Enter amount to add',
      'How many credits would you like to add to this user?',
      'Enter amount...',
      '',
      'number'
    );

    if (!amountStr) return;

    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adjustUserCredits(user.id, amount, 'Admin credit addition');
      if (result.error) {
        toast.error(result.error);
      } else {
        setCredits(result.newBalance || credits + amount);
        toast.success(`Added ${amount} credits`);
        onUpdate?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to adjust credits');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeductCredits = async () => {
    const amountStr = await showInputPrompt(
      'Enter amount to deduct',
      'How many credits would you like to deduct from this user?',
      'Enter amount...',
      '',
      'number'
    );

    if (!amountStr) return;

    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adjustUserCredits(user.id, -amount, 'Admin credit deduction');
      if (result.error) {
        toast.error(result.error);
      } else {
        setCredits(result.newBalance || credits - amount);
        toast.success(`Deducted ${amount} credits`);
        onUpdate?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to adjust credits');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAdmin = async () => {
    const newAdminStatus = !isAdmin;
    const action = newAdminStatus ? 'grant' : 'revoke';

    const confirmed = await showConfirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Admin Access`,
      `Are you sure you want to ${action} admin privileges for ${user.email}?`,
      {
        confirmText: action === 'grant' ? 'Grant Access' : 'Revoke Access',
        variant: action === 'grant' ? 'default' : 'destructive',
      }
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const result = await toggleAdminStatus(user.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        setIsAdmin(result.is_admin ?? !isAdmin);
        toast.success(`Admin status ${result.is_admin ? 'granted' : 'revoked'}`);
        onUpdate?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update admin status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleZeroKnowledge = async () => {
    const enabled = !zeroKnowledge;

    setIsSubmitting(true);
    try {
      const result = await toggleZeroKnowledgeMode(user.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        setZeroKnowledge(result.enabled ?? !zeroKnowledge);
        toast.success(`Zero knowledge mode ${result.enabled ? 'enabled' : 'disabled'}`);
        onUpdate?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update zero knowledge mode');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBanUser = async () => {
    const reason = await showInputPrompt(
      'Ban User',
      `Enter the reason for banning ${user.email}:`,
      'Reason for ban...'
    );

    if (!reason) return;

    const confirmed = await showConfirm(
      'Ban User Account',
      `Are you sure you want to ban ${user.email}? This action will prevent the user from accessing their account.`,
      {
        confirmText: 'Ban User',
        variant: 'destructive',
      }
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const result = await banUser(user.id, reason);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('User has been banned');
        onClose();
        onUpdate?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to ban user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlanBadgeClass = (planType: string) => {
    switch (planType) {
      case 'pro': return 'bg-[#CE93D8]/15 text-[#CE93D8] border-[#CE93D8]/30';
      case 'team': return 'bg-[#40C4FF]/15 text-[#40C4FF] border-[#40C4FF]/30';
      case 'business': return 'bg-[#FFAB00]/15 text-[#FFAB00] border-[#FFAB00]/30';
      case 'enterprise': return 'bg-[#E8F5E9]/15 text-[#E8F5E9] border-[#E8F5E9]/30';
      default: return 'bg-[#1E261E] text-[#8BAD8B] border-[#1F2B1F]';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Dialogs */}
      <InputDialogComponent />
      <ConfirmDialogComponent />

      {/* Slide-over */}
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Slide-over */}
        <aside className="absolute right-0 top-0 h-full w-[420px] bg-[#111411] border-l border-[#1F2B1F] shadow-2xl overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 p-5 border-b border-[#1F2B1F] bg-[#111411]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center text-[#00C853] text-sm font-semibold">
                  {user.full_name?.split(' ').map(n => n?.[0]).join('') || user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#E8F5E9]">{user.full_name || 'Unnamed User'}</h2>
                  <p className="text-xs text-[#8BAD8B]">{user.email}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-[8px] bg-[#171C17] border border-[#1F2B1F] flex items-center justify-center text-[#8BAD8B] hover:border-[#00C853] hover:text-[#00C853] transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-6">
            {/* User Info */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-[#4D6B4D] font-semibold">User Information</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#8BAD8B]">User ID</label>
                  <p className="text-sm text-[#E8F5E9] font-mono truncate">{user.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <label className="text-xs text-[#8BAD8B]">Joined</label>
                  <p className="text-sm text-[#E8F5E9]">{formatDate(user.created_at)}</p>
                </div>
                <div>
                  <label className="text-xs text-[#8BAD8B]">Last Login</label>
                  <p className="text-sm text-[#E8F5E9]">{formatDate(user.last_login_at)}</p>
                </div>
                <div>
                  <label className="text-xs text-[#8BAD8B]">Referral Code</label>
                  <p className="text-sm text-[#E8F5E9] font-mono">{user.referral_code || 'None'}</p>
                </div>
              </div>
            </div>

            {/* Plan Selector */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[#4D6B4D] font-semibold mb-3">Subscription Plan</h3>
              <select
                value={plan}
                onChange={(e) => handlePlanChange(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-[#111411] border border-[#283228] rounded-[8px] text-[#E8F5E9] focus:outline-none focus:border-[#00C853] transition-colors text-sm disabled:opacity-50"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="team">Team</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Credit Balance */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[#4D6B4D] font-semibold mb-3">Credit Balance</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-3 py-2 bg-[#111411] border border-[#283228] rounded-[8px]">
                  <p className="text-2xl font-semibold text-[#00C853]">{credits.toLocaleString()}</p>
                  <p className="text-xs text-[#8BAD8B]">credits available</p>
                </div>
                <button
                  onClick={handleAddCredits}
                  disabled={isSubmitting}
                  className="h-10 px-4 rounded-[8px] bg-[#00C853] text-black text-sm font-medium hover:bg-[#00E676] transition-colors disabled:opacity-50"
                >
                  + Add
                </button>
                <button
                  onClick={handleDeductCredits}
                  disabled={isSubmitting}
                  className="h-10 px-4 rounded-[8px] bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#FF5252] hover:text-[#FF5252] transition-all text-sm font-medium disabled:opacity-50"
                >
                  - Deduct
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[#4D6B4D] font-semibold mb-3">Permissions & Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#171C17] rounded-[8px] border border-[#1F2B1F]">
                  <div>
                    <p className="text-sm font-medium text-[#E8F5E9]">Admin Access</p>
                    <p className="text-xs text-[#8BAD8B]">Full system administration</p>
                  </div>
                  <button
                    onClick={handleToggleAdmin}
                    disabled={isSubmitting}
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      isAdmin ? 'bg-[#00C853]' : 'bg-[#283228]'
                    } disabled:opacity-50`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-[#111411] absolute top-0.5 transition-all shadow-lg ${
                        isAdmin ? 'left-[26px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#171C17] rounded-[8px] border border-[#1F2B1F]">
                  <div>
                    <p className="text-sm font-medium text-[#E8F5E9]">Zero Knowledge Mode</p>
                    <p className="text-xs text-[#8BAD8B]">Enhanced privacy mode</p>
                  </div>
                  <button
                    onClick={handleToggleZeroKnowledge}
                    disabled={isSubmitting}
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      zeroKnowledge ? 'bg-[#00C853]' : 'bg-[#283228]'
                    } disabled:opacity-50`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-[#111411] absolute top-0.5 transition-all shadow-lg ${
                        zeroKnowledge ? 'left-[26px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-[8px] border p-4 bg-[#FF5252]/5 border-[#FF5252]/30">
              <h3 className="text-xs uppercase tracking-wider text-[#FF5252] font-semibold mb-3">Danger Zone</h3>
              <p className="text-xs text-[#FF5252]/80 mb-4">
                These actions are irreversible. Please be certain.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleBanUser}
                  disabled={isSubmitting}
                  className="flex-1 h-10 px-4 rounded-[8px] bg-transparent text-[#FF5252] border border-[#FF5252]/35 hover:bg-[#FF5252]/10 transition-all text-sm font-medium disabled:opacity-50"
                >
                  Ban Account
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
