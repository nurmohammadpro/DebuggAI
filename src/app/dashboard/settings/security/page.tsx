/**
 * Security Settings Page - MFA/2FA Setup
 */

'use client';

import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(false);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  const enrollMFA = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (!factorId || !verifyCode) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: data.id,
        code: verifyCode,
      });

      if (verifyError) {
        toast.error(verifyError.message);
        return;
      }

      toast.success('Two-factor authentication enabled');
      setMfaEnrolled(true);
      setQrCode(null);
      setFactorId(null);
      setVerifyCode('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
          Security Settings
        </h1>
        <p className="text-[13px] text-[var(--app-text-muted)] mt-2">
          Manage two-factor authentication and security preferences
        </p>
      </div>

      <section className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-[6px] bg-[var(--app-accent-soft)] flex items-center justify-center">
            <Shield className="h-4 w-4" style={{ color: 'var(--app-accent)' }} />
          </div>
          <div>
            <h2 className="text-[13px] font-medium text-[var(--app-text)]">
              Two-Factor Authentication
            </h2>
            <p className="text-[12px] text-[var(--app-text-muted)]">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        {mfaEnrolled ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-[var(--app-success)]/10 border border-[var(--app-success)]/20">
            <div className="w-2 h-2 rounded-full bg-[var(--app-success)]" />
            <span className="text-[13px] text-[var(--app-success)]">MFA is enabled</span>
          </div>
        ) : qrCode ? (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--app-text-muted)]">
              Scan this QR code with your authenticator app, then enter the verification code.
            </p>
            <div className="bg-[var(--app-panel-2)] p-4 rounded-[6px] inline-block">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
            <div className="flex items-center gap-3 max-w-sm">
              <input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="flex-1 h-10 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 text-[16px] text-[var(--app-text)] text-center tracking-[0.3em] outline-none focus:border-[var(--app-accent)]"
              />
              <button
                onClick={verifyMFA}
                disabled={loading || verifyCode.length !== 6}
                className="h-10 px-5 rounded-[6px] bg-[var(--app-accent)] text-[var(--app-bg)] text-[13px] font-medium hover:opacity-90 disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={enrollMFA}
            disabled={loading}
            className="h-9 px-4 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] text-[13px] font-medium text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors inline-flex items-center gap-2 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Enable Two-Factor Authentication
          </button>
        )}
      </section>
    </div>
  );
}
