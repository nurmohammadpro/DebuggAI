/**
 * Credits Service
 *
 * Handles credit operations including checking balance, deducting credits,
 * and recording transactions.
 */

import { supabase } from '@/lib/supabase';
import { CREDIT_COSTS } from '@/lib/constants';

export interface CreditCheckResult {
  hasEnough: boolean;
  balance: number;
  required: number;
}

/**
 * Check if user has enough credits for an action
 */
export async function checkCredits(
  userId: string,
  action: keyof typeof CREDIT_COSTS
): Promise<CreditCheckResult> {
  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('balance')
    .eq('owner_id', userId)
    .single();

  if (!wallet) {
    // Create wallet if it doesn't exist
    await createWallet(userId);
    return {
      hasEnough: CREDIT_COSTS[action] <= 30, // Free tier balance
      balance: 30,
      required: CREDIT_COSTS[action],
    };
  }

  const balance = wallet.balance || 0;
  const required = CREDIT_COSTS[action];

  return {
    hasEnough: balance >= required || balance === -1, // -1 means unlimited
    balance,
    required,
  };
}

/**
 * Deduct credits from user's wallet
 */
export async function deductCredits(
  userId: string,
  action: keyof typeof CREDIT_COSTS,
  description?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  // Check credits first
  const check = await checkCredits(userId, action);

  if (!check.hasEnough) {
    return {
      success: false,
      error: `Insufficient credits. Required: ${check.required}, Available: ${check.balance}`,
    };
  }

  const walletId = await getWalletId(userId);
  if (!walletId) {
    return { success: false, error: 'Wallet not found' };
  }

  // Deduct credits
  const { data: wallet } = await supabase
    .from('credit_wallets')
    .update({ balance: check.balance - check.required })
    .eq('id', walletId)
    .select('balance')
    .single();

  if (!wallet) {
    return { success: false, error: 'Failed to deduct credits' };
  }

  // Record transaction
  await supabase.from('credit_transactions').insert({
    wallet_id: walletId,
    amount: -check.required, // Negative for spent
    type: 'spent',
    source: action,
    description: description || `Used ${action} feature`,
  });

  return {
    success: true,
    newBalance: wallet.balance,
  };
}

/**
 * Add credits to user's wallet
 */
export async function addCredits(
  userId: string,
  amount: number,
  source: string,
  description?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const walletId = await getWalletId(userId);
  if (!walletId) {
    return { success: false, error: 'Wallet not found' };
  }

  // Add credits
  const { data: wallet } = await supabase
    .from('credit_wallets')
    .update({ balance: supabase.rpc('increment', { x: amount }) })
    .eq('id', walletId)
    .select('balance')
    .single();

  if (!wallet) {
    return { success: false, error: 'Failed to add credits' };
  }

  // Record transaction
  await supabase.from('credit_transactions').insert({
    wallet_id: walletId,
    amount,
    type: 'earned',
    source,
    description,
  });

  return {
    success: true,
    newBalance: wallet.balance,
  };
}

/**
 * Get user's current credit balance
 */
export async function getCredits(userId: string): Promise<number> {
  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('balance')
    .eq('owner_id', userId)
    .single();

  return wallet?.balance || 0;
}

/**
 * Get wallet ID for user
 */
async function getWalletId(userId: string): Promise<string | null> {
  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('id')
    .eq('owner_id', userId)
    .single();

  return wallet?.id || null;
}

/**
 * Create credit wallet for user
 */
async function createWallet(userId: string): Promise<void> {
  await supabase.from('credit_wallets').insert({
    owner_id: userId,
    balance: 30, // Free tier
  });
}

/**
 * Get credit transactions for user
 */
export async function getTransactions(
  userId: string,
  limit = 50
): Promise<Array<{ id: string; amount: number; type: string; source: string; description: string | null; created_at: string }>> {
  const { data: wallets } = await supabase
    .from('credit_wallets')
    .select('id')
    .eq('owner_id', userId);

  const walletIds = (wallets || []).map((w) => w.id);

  if (walletIds.length === 0) return [];

  const { data } = await supabase
    .from('credit_transactions')
    .select('id, amount, type, source, description, created_at')
    .in('wallet_id', walletIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data as Array<{ id: string; amount: number; type: string; source: string; description: string | null; created_at: string }>) || [];
}
