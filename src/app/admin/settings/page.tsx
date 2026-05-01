/**
 * Admin Settings Page
 *
 * Enterprise-grade system configuration with comprehensive controls.
 */

'use client';

import { useState } from 'react';
import { HelpCircleIcon, RefreshCwIcon, Trash2Icon, MailIcon, AlertTriangleIcon, SaveIcon, SettingsIcon, ShieldIcon, BellIcon, GlobeIcon, DatabaseIcon } from 'lucide-react';

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'integrations' | 'database'>('general');

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: ShieldIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'integrations', label: 'Integrations', icon: GlobeIcon },
    { id: 'database', label: 'Database', icon: DatabaseIcon },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8F5E9]">System Configuration</h1>
          <p className="text-sm text-[#4D6B4D] mt-1">
            Manage system settings and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#00C853] text-black font-medium hover:bg-[#00E676] transition-colors text-[13.5px] disabled:opacity-50"
        >
          <SaveIcon className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#111411] border border-[#1F2B1F] rounded-md w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#00C853] text-black'
                  : 'text-[#8BAD8B] hover:text-[#E8F5E9]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'general' && (
            <>
              {/* Rate Limits */}
              <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <h3 className="text-lg font-medium text-[#E8F5E9]">Rate Limits</h3>
                  <HelpCircleIcon className="w-4 h-4 text-[#4D6B4D] cursor-help" />
                </div>

                <div className="space-y-6">
                  {['free', 'pro', 'team', 'business'].map((plan) => (
                    <div key={plan} className="p-4 rounded-md bg-[#171C17] border border-[#1F2B1F]">
                      <h4 className="text-sm font-medium text-[#E8F5E9] mb-4 capitalize flex items-center gap-2">
                        {plan} Plan
                        <span className="text-xs text-[#4D6B4D] font-normal">
                          {plan === 'free' ? 'Default limits' : 'Premium tiers'}
                        </span>
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs block mb-2 text-[#8BAD8B]">Analyze/day</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 bg-[#111411] border border-[#283228] rounded-md text-[#E8F5E9] focus:outline-none focus:border-[#00C853] transition-colors text-sm"
                            defaultValue={plan === 'free' ? 10 : plan === 'pro' ? 300 : 1000}
                          />
                        </div>
                        <div>
                          <label className="text-xs block mb-2 text-[#8BAD8B]">Reverse/day</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 bg-[#111411] border border-[#283228] rounded-md text-[#E8F5E9] focus:outline-none focus:border-[#00C853] transition-colors text-sm"
                            defaultValue={plan === 'free' ? 5 : plan === 'pro' ? 100 : 500}
                          />
                        </div>
                        <div>
                          <label className="text-xs block mb-2 text-[#8BAD8B]">Web builder/day</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 bg-[#111411] border border-[#283228] rounded-md text-[#E8F5E9] focus:outline-none focus:border-[#00C853] transition-colors text-sm"
                            defaultValue={plan === 'free' ? 2 : plan === 'pro' ? 50 : 200}
                          />
                        </div>
                        <div>
                          <label className="text-xs block mb-2 text-[#8BAD8B]">Max prompt (chars)</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 bg-[#111411] border border-[#283228] rounded-md text-[#E8F5E9] focus:outline-none focus:border-[#00C853] transition-colors text-sm"
                            defaultValue={plan === 'free' ? 2000 : plan === 'pro' ? 10000 : 50000}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Configuration */}
              <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-6">
                <h3 className="text-lg font-medium text-[#E8F5E9] mb-6">AI Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs block mb-2 text-[#8BAD8B]">Default Model</label>
                    <select className="w-full px-3 py-2 bg-[#111411] border border-[#283228] rounded-md text-[#E8F5E9] focus:outline-none focus:border-[#00C853] transition-colors text-sm">
                      <option>llama-3.3-70b-versatile</option>
                      <option>llama-3.1-8b-instant</option>
                      <option>mixtral-8x7b</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-2 text-[#8BAD8B]">Temperature: 0.7</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      defaultValue="0.7"
                      className="w-full accent-[#00C853]"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-2 text-[#8BAD8B]">Max Tokens</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-[#111411] border border-[#283228] rounded-md text-[#E8F5E9] focus:outline-none focus:border-[#00C853] transition-colors text-sm"
                      defaultValue={4096}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-6">
              <h3 className="text-lg font-medium text-[#E8F5E9] mb-6">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#171C17] rounded-md border border-[#1F2B1F]">
                  <div>
                    <p className="text-sm font-medium text-[#E8F5E9]">Two-Factor Authentication</p>
                    <p className="text-xs text-[#8BAD8B]">Require 2FA for admin accounts</p>
                  </div>
                  <button className="w-12 h-6 rounded-full bg-[#00C853] relative transition-colors">
                    <div className="w-5 h-5 rounded-full bg-[#111411] absolute top-0.5 left-[26px] shadow-lg" />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#171C17] rounded-md border border-[#1F2B1F]">
                  <div>
                    <p className="text-sm font-medium text-[#E8F5E9]">Session Timeout</p>
                    <p className="text-xs text-[#8BAD8B]">Auto-logout after inactivity</p>
                  </div>
                  <select className="h-9 px-3 bg-[#111411] border border-[#283228] rounded-md text-[#E8F5E9] text-sm focus:outline-none focus:border-[#00C853]">
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#171C17] rounded-md border border-[#1F2B1F]">
                  <div>
                    <p className="text-sm font-medium text-[#E8F5E9]">IP Whitelist</p>
                    <p className="text-xs text-[#8BAD8B]">Restrict admin access by IP</p>
                  </div>
                  <button className="w-12 h-6 rounded-full bg-[#283228] relative transition-colors">
                    <div className="w-5 h-5 rounded-full bg-[#111411] absolute top-0.5 left-0.5 shadow-lg" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-6">
              <h3 className="text-lg font-medium text-[#E8F5E9] mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { label: 'New user registrations', desc: 'Get notified when users sign up' },
                  { label: 'Credit low warnings', desc: 'Alert when system credits are low' },
                  { label: 'Abuse reports', desc: 'Notifications for suspicious activity' },
                  { label: 'System errors', desc: 'Critical error notifications' },
                ].map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between p-4 bg-[#171C17] rounded-md border border-[#1F2B1F]">
                    <div>
                      <p className="text-sm font-medium text-[#E8F5E9]">{setting.label}</p>
                      <p className="text-xs text-[#8BAD8B]">{setting.desc}</p>
                    </div>
                    <button className="w-12 h-6 rounded-full bg-[#00C853] relative transition-colors">
                      <div className="w-5 h-5 rounded-full bg-[#111411] absolute top-0.5 left-[26px] shadow-lg" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-6">
              <h3 className="text-lg font-medium text-[#E8F5E9] mb-6">Integrations</h3>
              <div className="space-y-4">
                <div className="p-4 bg-[#171C17] rounded-md border border-[#1F2B1F]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-[#E8F5E9]">OpenAI API</p>
                      <p className="text-xs text-[#8BAD8B]">AI model integration</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-[#00C853]/15 text-[#00C853]">Connected</span>
                  </div>
                  <input
                    type="password"
                    defaultValue="sk-••••••••••••••••"
                    className="w-full px-3 py-2 bg-[#111411] border border-[#283228] rounded-md text-[#E8F5E9] text-sm focus:outline-none focus:border-[#00C853]"
                  />
                </div>
                <div className="p-4 bg-[#171C17] rounded-md border border-[#1F2B1F]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-[#E8F5E9]">Stripe</p>
                      <p className="text-xs text-[#8BAD8B]">Payment processing</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-[#FFAB00]/15 text-[#FFAB00]">Test Mode</span>
                  </div>
                  <input
                    type="password"
                    defaultValue="sk_test_••••••••••••••••"
                    className="w-full px-3 py-2 bg-[#111411] border border-[#283228] rounded-md text-[#E8F5E9] text-sm focus:outline-none focus:border-[#00C853]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-6">
              <h3 className="text-lg font-medium text-[#E8F5E9] mb-6">Database Maintenance</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button className="inline-flex items-center gap-2 px-4 py-3 rounded-md bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all text-sm font-medium justify-start">
                    <RefreshCwIcon className="w-4 h-4" />
                    Reset monthly credits
                  </button>
                  <button className="inline-flex items-center gap-2 px-4 py-3 rounded-md bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all text-sm font-medium justify-start">
                    <Trash2Icon className="w-4 h-4" />
                    Purge old sessions
                  </button>
                  <button className="inline-flex items-center gap-2 px-4 py-3 rounded-md bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all text-sm font-medium justify-start">
                    <MailIcon className="w-4 h-4" />
                    Send system announcement
                  </button>
                  <button className="inline-flex items-center gap-2 px-4 py-3 rounded-md bg-transparent text-[#FF5252] border border-[#FF5252]/35 hover:bg-[#FF5252]/10 transition-all text-sm font-medium justify-start">
                    <AlertTriangleIcon className="w-4 h-4" />
                    Emergency mode toggle
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-5">
            <h3 className="text-sm font-medium text-[#E8F5E9] mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8BAD8B]">API Status</span>
                <span className="text-xs text-[#00C853]">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8BAD8B]">Database</span>
                <span className="text-xs text-[#00C853]">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8BAD8B]">Cache</span>
                <span className="text-xs text-[#00C853]">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8BAD8B]">Uptime</span>
                <span className="text-xs text-[#8BAD8B]">99.97%</span>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-5">
            <h3 className="text-sm font-medium text-[#E8F5E9] mb-2">Last Updated</h3>
            <p className="text-xs text-[#8BAD8B]">Settings were last modified 2 days ago by nurprodev@gmail.com</p>
          </div>

          {/* Help */}
          <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-5">
            <h3 className="text-sm font-medium text-[#E8F5E9] mb-2">Need Help?</h3>
            <p className="text-xs text-[#8BAD8B] mb-3">Check our documentation for detailed configuration guides.</p>
            <button className="text-xs text-[#00C853] hover:underline">View Documentation →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
