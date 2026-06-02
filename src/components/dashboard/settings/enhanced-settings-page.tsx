/**
 * Enhanced Settings Page Component
 *
 * Comprehensive settings interface with profile, preferences, security, and billing sections
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Key,
  Trash2,
  Moon,
  Sun,
  Globe,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronRight,
  Save,
  Download,
  Copy,
  Plus,
  Settings as SettingsIcon,
} from 'lucide-react';
import {
  INTERNAL_TEST_COUPON_CODE,
  INTERNAL_TEST_COUPON_EMAIL,
} from '@/lib/coupons/internal-test-coupon';

type SettingsTab = 'profile' | 'preferences' | 'security' | 'billing' | 'integrations' | 'danger';

export function EnhancedSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<SettingsTab>((tabParam as SettingsTab) || 'profile');
  const { user, logout } = useSessionStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: true,
    security: true,
  });

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Account deleted successfully');
      logout();
      router.push('/');
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateApiKey = () => {
    toast.success('New API key generated');
    setShowApiKey(true);
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText('dbg_ai_sk_1234567890abcdef');
    toast.success('API key copied to clipboard');
  };

  const handleRedeemInternalCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Enter a coupon code');
      return;
    }

    setCouponLoading(true);
    try {
      const response = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detectedEmail =
          typeof payload?.detectedEmail === 'string' ? payload.detectedEmail : '';
        const allowedEmail =
          typeof payload?.allowedEmail === 'string' ? payload.allowedEmail : INTERNAL_TEST_COUPON_EMAIL;
        throw new Error(
          detectedEmail
            ? `${payload?.error || 'Coupon redemption failed'} (detected: ${detectedEmail}, allowed: ${allowedEmail})`
            : payload?.error || 'Coupon redemption failed'
        );
      }

      useSessionStore.getState().updateUser({
        plan: 'enterprise',
        credits: payload?.credits ?? 1_000_000,
      });

      setCouponCode('');
      toast.success('Internal test coupon redeemed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Coupon redemption failed');
    } finally {
      setCouponLoading(false);
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'integrations', label: 'Integrations', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--app-text)] mb-2">Settings</h1>
          <p className="text-sm text-[var(--app-text-muted)]">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg overflow-hidden">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-l-2 border-[var(--app-accent)]'
                        : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}

              <div className="border-t border-[var(--app-border)]">
                <button
                  onClick={() => setActiveTab('danger')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === 'danger'
                      ? 'bg-[var(--app-danger-soft)] text-[var(--app-danger)] border-l-2 border-[var(--app-danger)]'
                      : 'text-[var(--app-danger)] hover:bg-[var(--app-danger-soft)]'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Danger Zone</span>
                </button>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-[var(--app-text)] mb-1">Profile Settings</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">Update your personal information</p>
                </div>

                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-[var(--app-accent-soft)] flex items-center justify-center">
                      <span className="text-2xl font-semibold text-[var(--app-accent)]">
                        {profileForm.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <button className="px-4 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 transition-opacity">
                        Change Avatar
                      </button>
                      <p className="text-xs text-[var(--app-text-muted)] mt-1">JPG, PNG or GIF. Max 2MB.</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.displayName}
                        onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 text-[var(--app-text)]"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        disabled
                        className="w-full px-3 py-2 text-sm bg-[var(--app-panel-2)] border border-[var(--app-border)] rounded-lg text-[var(--app-text-muted)] cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences */}
            {activeTab === 'preferences' && (
              <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-[var(--app-text)] mb-1">Preferences</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">Customize your experience</p>
                </div>

                <div className="space-y-6">
                  {/* Theme Selection */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--app-text)] mb-2">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: 'light', label: 'Light', icon: Sun },
                        { value: 'dark', label: 'Dark', icon: Moon },
                        { value: 'system', label: 'System', icon: Globe },
                      ] as const).map(themeOption => {
                        const Icon = themeOption.icon;
                        const isActive = theme === themeOption.value;

                        return (
                          <button
                            key={themeOption.value}
                            onClick={() => setTheme(themeOption.value)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                              isActive
                                ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)]'
                                : 'border-[var(--app-border)] hover:border-[var(--app-border-strong)]'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'}`} />
                            <span className={`text-sm font-medium ${isActive ? 'text-[var(--app-accent)]' : 'text-[var(--app-text)]'}`}>
                              {themeOption.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--app-text)] mb-3">Notifications</label>
                    <div className="space-y-3">
                      {[
                        { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
                        { key: 'push', label: 'Push Notifications', description: 'Receive browser notifications' },
                        { key: 'marketing', label: 'Marketing Updates', description: 'Receive product updates and offers' },
                        { key: 'security', label: 'Security Alerts', description: 'Important security notifications' },
                      ].map(notification => (
                        <div key={notification.key} className="flex items-center justify-between py-2">
                          <div>
                            <div className="text-sm font-medium text-[var(--app-text)]">{notification.label}</div>
                            <div className="text-xs text-[var(--app-text-muted)]">{notification.description}</div>
                          </div>
                          <button
                            onClick={() => setNotifications(prev => ({ ...prev, [notification.key]: !prev[notification.key as keyof typeof prev] }))}
                            className={`w-11 h-6 rounded-full transition-colors ${
                              notifications[notification.key as keyof typeof notifications]
                                ? 'bg-[var(--app-accent)]'
                                : 'bg-[var(--app-panel-2)]'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                notifications[notification.key as keyof typeof notifications] ? 'translate-x-0' : '-translate-x-0.5'
                              }`}
                              style={{
                                transform: notifications[notification.key as keyof typeof notifications] ? 'translateX(100%)' : 'translateX(0)',
                              }}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotifications}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isLoading ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-[var(--app-text)] mb-1">Security</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">Manage your security settings</p>
                </div>

                <div className="space-y-6">
                  {/* Password Change */}
                  <div className="border border-[var(--app-border)] rounded-lg p-4">
                    <h3 className="text-sm font-medium text-[var(--app-text)] mb-1">Change Password</h3>
                    <p className="text-xs text-[var(--app-text-muted)] mb-4">Update your password to keep your account secure</p>

                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Current password"
                        className="w-full px-3 py-2 text-sm bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 text-[var(--app-text)]"
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        className="w-full px-3 py-2 text-sm bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 text-[var(--app-text)]"
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        className="w-full px-3 py-2 text-sm bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 text-[var(--app-text)]"
                      />
                    </div>

                    <button className="mt-4 px-4 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 transition-opacity">
                      Update Password
                    </button>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="border border-[var(--app-border)] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-[var(--app-text)]">Two-Factor Authentication</h3>
                      <span className="text-xs bg-[var(--app-warning-soft)] text-[var(--app-warning)] px-2 py-1 rounded">Disabled</span>
                    </div>
                    <p className="text-xs text-[var(--app-text-muted)] mb-4">Add an extra layer of security to your account</p>
                    <button className="px-4 py-2 text-sm font-medium bg-[var(--app-panel-2)] text-[var(--app-text)] rounded-lg hover:bg-[var(--app-surface)] transition-colors">
                      Enable 2FA
                    </button>
                  </div>

                  {/* Active Sessions */}
                  <div className="border border-[var(--app-border)] rounded-lg p-4">
                    <h3 className="text-sm font-medium text-[var(--app-text)] mb-3">Active Sessions</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 px-3 bg-[var(--app-surface)] rounded">
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-[var(--app-text-muted)]" />
                          <div>
                            <div className="text-sm text-[var(--app-text)]">Chrome on macOS</div>
                            <div className="text-xs text-[var(--app-text-muted)]">Current session</div>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--app-accent)] bg-[var(--app-accent-soft)] px-2 py-1 rounded">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing */}
            {activeTab === 'billing' && (
              <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-[var(--app-text)] mb-1">Billing & Credits</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">Manage your subscription and credits</p>
                </div>

                <div className="space-y-6">
                  {/* Current Plan */}
                  <div className="border border-[var(--app-border)] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-[var(--app-text)]">Current Plan</h3>
                        <p className="text-xs text-[var(--app-text-muted)]">{user?.plan || 'Free'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        user?.plan === 'pro' ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]' : 'bg-[var(--app-panel-2)] text-[var(--app-text-muted)]'
                      }`}>
                        {user?.plan === 'pro' ? 'Active' : 'Free'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-[var(--app-surface)] rounded">
                        <div className="text-2xl font-semibold text-[var(--app-accent)]">{user?.credits === -1 ? '∞' : user?.credits || 0}</div>
                        <div className="text-xs text-[var(--app-text-muted)]">Credits</div>
                      </div>
                      <div className="p-3 bg-[var(--app-surface)] rounded">
                        <div className="text-2xl font-semibold text-[var(--app-text)]">{user?.plan === 'pro' ? 'Unlimited' : '100'}</div>
                        <div className="text-xs text-[var(--app-text-muted)]">Daily Limit</div>
                      </div>
                      <div className="p-3 bg-[var(--app-surface)] rounded">
                        <div className="text-2xl font-semibold text-[var(--app-text)]">Basic</div>
                        <div className="text-xs text-[var(--app-text-muted)]">Support</div>
                      </div>
                    </div>
                  </div>

                  {/* Upgrade CTA */}
                  {user?.plan !== 'pro' && (
                    <div className="bg-gradient-to-r from-[var(--app-accent-soft)] to-[var(--app-surface)] border border-[var(--app-accent)] rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-[var(--app-text)] mb-1">Upgrade to Pro</h3>
                          <p className="text-xs text-[var(--app-text-muted)]">Get unlimited credits and priority support</p>
                        </div>
                        <button
                          onClick={() => router.push('/dashboard/pricing')}
                          className="px-4 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Upgrade Now
                        </button>
                      </div>
                    </div>
                  )}

                  {user?.email?.toLowerCase() === INTERNAL_TEST_COUPON_EMAIL && (
                    <div className="border border-[var(--app-border)] rounded-lg p-4">
                      <h3 className="text-sm font-medium text-[var(--app-text)] mb-1">Internal Test Coupon</h3>
                    <p className="text-xs text-[var(--app-text-muted)] mb-3">
                      Redeem the internal test code for unlimited testing access.
                    </p>
                      <p className="text-[11px] text-[var(--app-text-dim)] mb-3 font-mono break-all">
                        Detected account: {user?.email || 'unknown'} · Allowed: {INTERNAL_TEST_COUPON_EMAIL}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder={INTERNAL_TEST_COUPON_CODE}
                          className="flex-1 px-3 py-2 text-sm bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 text-[var(--app-text)]"
                        />
                        <button
                          onClick={handleRedeemInternalCoupon}
                          disabled={couponLoading}
                          className="px-4 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {couponLoading ? 'Redeeming...' : 'Redeem'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Transaction History */}
                  <div>
                    <h3 className="text-sm font-medium text-[var(--app-text)] mb-3">Recent Transactions</h3>
                    <div className="border border-[var(--app-border)] rounded-lg divide-y divide-[var(--app-border)]">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-4 h-4 text-[var(--app-text-muted)]" />
                            <div>
                              <div className="text-sm text-[var(--app-text)]">Credit Purchase</div>
                              <div className="text-xs text-[var(--app-text-muted)]">May {i * 5}, 2026</div>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-[var(--app-success)]">+$9.99</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && (
              <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-[var(--app-text)] mb-1">API & Integrations</h2>
                  <p className="text-sm text-[var(--app-text-muted)]">Manage your API keys and integrations</p>
                </div>

                <div className="space-y-6">
                  {/* API Key Management */}
                  <div className="border border-[var(--app-border)] rounded-lg p-4">
                    <h3 className="text-sm font-medium text-[var(--app-text)] mb-2">API Keys</h3>
                    <p className="text-xs text-[var(--app-text-muted)] mb-4">Generate and manage your API keys for programmatic access</p>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-[var(--app-surface)] rounded-lg">
                        <Key className="w-4 h-4 text-[var(--app-accent)]" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[var(--app-text)]">Production Key</div>
                          <div className="text-xs text-[var(--app-text-muted)] font-mono">
                            {showApiKey ? 'dbg_ai_sk_1234567890abcdef' : 'dbg_ai_sk_****************'}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-2 text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={handleCopyApiKey}
                          className="p-2 text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleGenerateApiKey}
                        className="px-3 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Generate New Key
                      </button>
                      <button className="px-3 py-2 text-sm font-medium bg-[var(--app-panel-2)] text-[var(--app-text)] rounded-lg hover:bg-[var(--app-surface)] transition-colors">
                        View Documentation
                      </button>
                    </div>
                  </div>

                  {/* Webhooks */}
                  <div className="border border-[var(--app-border)] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-[var(--app-text)]">Webhooks</h3>
                      <button className="px-3 py-1 text-xs font-medium bg-[var(--app-accent)] text-[#071006] rounded hover:opacity-90 transition-opacity">
                        Add Webhook
                      </button>
                    </div>
                    <p className="text-xs text-[var(--app-text-muted)] mb-4">Configure webhooks to receive real-time notifications</p>
                    <div className="text-center py-4">
                      <p className="text-xs text-[var(--app-text-muted)]">No webhooks configured</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {activeTab === 'danger' && (
              <div className="bg-[var(--app-panel)] border border-[var(--app-danger)] rounded-lg p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="w-5 h-5 text-[var(--app-danger)]" />
                    <h2 className="text-lg font-medium text-[var(--app-danger)]">Danger Zone</h2>
                  </div>
                  <p className="text-sm text-[var(--app-text-muted)]">Irreversible and destructive actions</p>
                </div>

                <div className="space-y-6">
                  <div className="border border-[var(--app-border)] rounded-lg p-4">
                    <h3 className="text-sm font-medium text-[var(--app-text)] mb-1">Export Your Data</h3>
                    <p className="text-xs text-[var(--app-text-muted)] mb-4">Download all your data before deleting your account</p>
                    <button className="px-4 py-2 text-sm font-medium bg-[var(--app-panel-2)] text-[var(--app-text)] rounded-lg hover:bg-[var(--app-surface)] transition-colors flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export Data
                    </button>
                  </div>

                  <div className="border border-[var(--app-danger)] rounded-lg p-4 bg-[var(--app-danger-soft)]">
                    <h3 className="text-sm font-medium text-[var(--app-danger)] mb-1">Delete Account</h3>
                    <p className="text-xs text-[var(--app-danger)] mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium bg-[var(--app-danger)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isLoading ? 'Deleting...' : 'Delete Account'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedSettingsPage;
