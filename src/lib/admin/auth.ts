/**
 * Admin Authentication Utilities
 *
 * Server-side utilities for admin authentication and authorization.
 */

'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { isEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  plan_type: 'free' | 'pro' | 'team' | 'business' | 'enterprise';
}

export interface AdminAuthResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

/**
 * Get current authenticated user from server component
 */
export async function getCurrentUser(): Promise<AdminUser | null> {
  try {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Fetch profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, plan_type')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      is_admin: profile.is_admin || isEmailAdminAllowlisted(profile.email),
      plan_type: profile.plan_type,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.is_admin ?? false;
}

/**
 * Require admin access - throws if not admin
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  if (!user.is_admin) {
    throw new Error('Admin access required');
  }

  return user;
}

/**
 * Sign in with email and password (admin-only)
 */
export async function adminSignIn(formData: FormData): Promise<AdminAuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Check if user is admin BEFORE returning success
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_admin, plan_type')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || (!profile.is_admin && !isEmailAdminAllowlisted(profile.email))) {
    // Sign out the user since they're not an admin
    await supabase.auth.signOut();
    return { success: false, error: 'Admin access required. You do not have permission to access the admin console.' };
  }

  return { success: true, user: profile as unknown as AdminUser };
}

/**
 * Sign out admin user
 */
export async function adminSignOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(limit = 50, offset = 0): Promise<{
  users: AdminUser[];
  count: number;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error, count } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, plan_type', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { users: [], count: 0, error: error.message };
    }

    return {
      users: (data || []) as AdminUser[],
      count: count || 0,
    };
  } catch (error) {
    return {
      users: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update user plan (admin only)
 */
export async function updateUserPlan(
  userId: string,
  planType: 'free' | 'pro' | 'team' | 'business' | 'enterprise'
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from('profiles')
      .update({ plan_type: planType })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Toggle admin status (admin only)
 */
export async function toggleAdminStatus(
  userId: string
): Promise<{ success: boolean; error?: string; is_admin?: boolean }> {
  try {
    const currentUser = await requireAdmin();

    // Prevent self-demotion
    if (currentUser.id === userId) {
      return { success: false, error: 'Cannot modify your own admin status' };
    }

    const supabase = await createClient();

    // Get current status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: 'User not found' };
    }

    const newStatus = !profile.is_admin;

    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: newStatus })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, is_admin: newStatus };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get detailed user info with wallet and credits
 */
export async function getUserDetails(userId: string): Promise<{
  user: AdminUser & {
    username: string | null;
    avatar_url: string | null;
    is_ambassador: boolean;
    referral_code: string;
    zero_knowledge_mode: boolean;
    last_login_at: string | null;
    created_at: string;
  };
  wallet: {
    id: string;
    balance: number;
  } | null;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return { user: profile, wallet: null, error: profileError?.message || 'User not found' };
    }

    const { data: wallet } = await supabase
      .from('credit_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      user: profile as any,
      wallet: wallet,
    };
  } catch (error) {
    return {
      user: null as any,
      wallet: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Adjust user credits (admin only)
 */
export async function adjustUserCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: wallet } = await supabase
      .from('credit_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    const newBalance = Math.max(0, wallet.balance + amount);

    const { error: updateError } = await supabase
      .from('credit_wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        wallet_id: wallet.id,
        amount: amount,
        type: amount > 0 ? 'admin_adjustment' : 'credit_spent',
        description: reason || 'Admin credit adjustment',
        metadata: { admin_action: true },
      });

    if (txError) {
      console.error('Failed to record transaction:', txError);
    }

    return { success: true, newBalance };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ban user (admin only) - prevents login
 */
export async function banUser(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();

    // Prevent self-ban
    if (currentUser.id === userId) {
      return { success: false, error: 'Cannot ban yourself' };
    }

    const supabase = await createClient();
    const adminAuth = createServiceRoleClient();

    // Set user's plan to a banned state (you could add a banned status to the schema)
    const { error } = await adminAuth.auth.admin.updateUserById(userId, {
      user_metadata: { banned: true, ban_reason: reason, banned_at: new Date().toISOString() },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Log to audit events
    await supabase
      .from('audit_events')
      .insert({
        user_id: currentUser.id,
        action: 'admin.ban_user',
        target_id: userId,
        target_type: 'profile',
        metadata: { reason },
      });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete user (admin only) - CAREFUL: This is irreversible
 */
export async function deleteUser(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();

    // Prevent self-deletion
    if (currentUser.id === userId) {
      return { success: false, error: 'Cannot delete yourself' };
    }

    const supabase = await createClient();
    const adminAuth = createServiceRoleClient();

    // Delete from auth (this will cascade to all tables via ON DELETE CASCADE)
    const { error } = await adminAuth.auth.admin.deleteUser(userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log to audit events before deletion
    await supabase
      .from('audit_events')
      .insert({
        user_id: currentUser.id,
        action: 'admin.delete_user',
        target_id: userId,
        target_type: 'profile',
        metadata: { reason },
      });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Toggle zero knowledge mode
 */
export async function toggleZeroKnowledgeMode(
  userId: string
): Promise<{ success: boolean; error?: string; enabled?: boolean }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // Get current status
    const { data: profile } = await supabase
      .from('profiles')
      .select('zero_knowledge_mode')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: 'User not found' };
    }

    const newStatus = !profile.zero_knowledge_mode;

    const { error } = await supabase
      .from('profiles')
      .update({ zero_knowledge_mode: newStatus })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, enabled: newStatus };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get dashboard stats (admin only)
 */
export async function getDashboardStats(): Promise<{
  stats: {
    totalUsers: number;
    totalCredits: number;
    debugSessions: number;
    builderSessions: number;
  };
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // Get user count
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total credits
    const { data: creditData } = await supabase
      .from('credit_wallets')
      .select('balance');

    const totalCredits = creditData?.reduce((sum, w) => sum + w.balance, 0) || 0;

    // Get session counts
    const { count: debugCount } = await supabase
      .from('debug_sessions')
      .select('*', { count: 'exact', head: true });

    const { count: builderCount } = await supabase
      .from('web_builder_sessions')
      .select('*', { count: 'exact', head: true });

    return {
      stats: {
        totalUsers: userCount || 0,
        totalCredits,
        debugSessions: debugCount || 0,
        builderSessions: builderCount || 0,
      },
    };
  } catch (error) {
    return {
      stats: {
        totalUsers: 0,
        totalCredits: 0,
        debugSessions: 0,
        builderSessions: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recent activity (admin only)
 */
export async function getRecentActivity(limit = 20): Promise<{
  activities: Array<{
    id: string;
    actor: string;
    action: string;
    target_type: string | null;
    metadata: any;
    created_at: string;
  }>;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { activities: [], error: error.message };
    }

    // Join with profiles to get actor emails
    const activities = await Promise.all(
      (data || []).map(async (event) => {
        let actor = 'System';
        if (event.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', event.user_id)
            .maybeSingle();
          actor = profile?.email || 'Unknown';
        }
        return {
          id: event.id,
          actor,
          action: event.action,
          target_type: event.target_type,
          metadata: event.metadata,
          created_at: event.created_at,
        };
      })
    );

    return { activities };
  } catch (error) {
    return {
      activities: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get credit transactions (admin only)
 */
export async function getCreditTransactions(limit = 50): Promise<{
  transactions: Array<{
    id: string;
    user_email: string;
    amount: number;
    type: string;
    description: string | null;
    created_at: string;
  }>;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('credit_transactions')
      .select(`
        *,
        credit_wallets (
          user_id,
          profiles (
            email
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { transactions: [], error: error.message };
    }

    const transactions = (data || []).map((tx: any) => ({
      id: tx.id,
      user_email: tx.credit_wallets?.profiles?.email || 'Unknown',
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      created_at: tx.created_at,
    }));

    return { transactions };
  } catch (error) {
    return {
      transactions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get referral statistics (admin only)
 */
export async function getReferralStats(limit = 50): Promise<{
  ambassadors: Array<{
    id: string;
    email: string;
    full_name: string | null;
    referral_count: number;
    total_earned: number;
    tier: 'bronze' | 'silver' | 'gold';
  }>;
  total_referrals: number;
  total_payouts: number;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // Get all users with their referral counts
    const { data: referrers, error: referrersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        referral_code
      `)
      .not('referral_code', 'is', null)
      .order('created_at', { ascending: false });

    if (referrersError) {
      return { ambassadors: [], total_referrals: 0, total_payouts: 0, error: referrersError.message };
    }

    // Get referral counts for each user
    const ambassadors = await Promise.all(
      (referrers || []).map(async (referrer) => {
        const { data: referrals } = await supabase
          .from('referrals')
          .select('id')
          .eq('referrer_id', referrer.id)
          .eq('status', 'completed');

        const referralCount = referrals?.length || 0;
        const totalEarned = referralCount * 10; // 10 credits per referral

        let tier: 'bronze' | 'silver' | 'gold' = 'bronze';
        if (referralCount >= 50) tier = 'gold';
        else if (referralCount >= 25) tier = 'silver';

        return {
          id: referrer.id,
          email: referrer.email,
          full_name: referrer.full_name,
          referral_count: referralCount,
          total_earned: totalEarned,
          tier,
        };
      })
    );

    // Sort by referral count
    ambassadors.sort((a, b) => b.referral_count - a.referral_count);

    // Get total stats
    const totalReferrals = ambassadors.reduce((sum, a) => sum + a.referral_count, 0);
    const totalPayouts = ambassadors.reduce((sum, a) => sum + a.total_earned, 0);

    return {
      ambassadors: ambassadors.slice(0, limit),
      total_referrals: totalReferrals,
      total_payouts: totalPayouts,
    };
  } catch (error) {
    return {
      ambassadors: [],
      total_referrals: 0,
      total_payouts: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user by email for admin operations
 */
export async function getUserByEmail(email: string): Promise<{
  user: AdminUser | null;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: profile as AdminUser | null };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
