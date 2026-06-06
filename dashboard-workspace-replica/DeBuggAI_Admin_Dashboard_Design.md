# DeBuggAI — Admin Dashboard Design Concepts

> **Design System:** DeBuggAI v1.0 (Dark-first, Green-accented)  
> **Typography:** Inter (sans), JetBrains Mono (data)  
> **Palette:** `#0A0D0A` background, `#00C853` primary, `#E8F5E9` text  
> **Principle:** Authority through restraint. Density with clarity. Actionable vigilance.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Admin Shell Layout](#2-admin-shell-layout)
3. [Overview Dashboard](#3-overview-dashboard)
4. [User Management](#4-user-management)
5. [Credit Management](#5-credit-management)
6. [Audit Logs](#6-audit-logs)
7. [Abuse Monitoring](#7-abuse-monitoring)
8. [Referral & Ambassador Management](#8-referral--ambassador-management)
9. [System Settings](#9-system-settings)
10. [Component Reference](#10-component-reference)
11. [Responsive Behavior](#11-responsive-behavior)
12. [Accessibility Notes](#12-accessibility-notes)

---

## 1. Design Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Authority through restraint** | Admin tools feel precise, not flashy | Muted colors, sharp edges, monospace for data |
| **Density with clarity** | More data per screen without clutter | 13px body, tight line-heights, generous whitespace between sections |
| **Actionable vigilance** | Warnings and anomalies surface automatically | Red/amber accents on critical items, pulse animations for alerts |
| **Audit transparency** | Every action leaves a visible trail | Immutable log styling, actor→target pattern, IP tracking |

---

## 2. Admin Shell Layout

### 2.1 Top Navigation Bar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [🐛 Logo]  Admin Console                              [🔔] [👤 Admin ▼]   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Overview    Users    Credits    Audit    Abuse    Referrals    Settings  │
│           [active: green muted bg, green text]                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
<nav className="navbar">
  <div className="flex items-center gap-3">
    <div className="nav-logo-icon">
      <BugIcon size={16} className="text-[var(--ds-green)]" />
    </div>
    <span className="text-h3">Admin Console</span>
  </div>

  <div className="flex items-center gap-1">
    {tabs.map(tab => (
      <button
        key={tab.id}
        className={cn(
          "nav-link",
          activeTab === tab.id && "active"
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>

  <div className="flex items-center gap-2">
    <button className="btn-icon w-9 h-9">
      <Bell size={16} />
    </button>
    <UserDropdown />
  </div>
</nav>
```

**Specs:**

| Property | Value | Token |
|----------|-------|-------|
| Height | 52px | — |
| Background | `#111411` | `var(--ds-surface)` |
| Border-bottom | 1px solid `#1F2B1F` | `var(--ds-border)` |
| Active tab bg | `rgba(0,200,83,0.12)` | `var(--ds-green-muted)` |
| Active tab text | `#00C853` | `var(--ds-green)` |
| Inactive tab text | `#8BAD8B` | `var(--ds-text2)` |
| Font size | 13px | — |
| Line height | 1.6 | — |

---

## 3. Overview Dashboard

### 3.1 KPI Cards Row

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   👤        │  │   🪙        │  │   🐛        │  │   🏗️        │
│  1,247      │  │  89,432     │  │  12,405     │  │  3,892      │
│ Total Users │  │ Credits     │  │ Debug Sess  │  │ Builder Sess│
│ ↑ 12%       │  │ ↑ 8%        │  │ ↑ 23%       │  │ ↑ 15%       │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

**Implementation:**

```tsx
<div className="grid grid-cols-4 gap-4">
  {stats.map(stat => (
    <div key={stat.id} className="card card-interactive">
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption uppercase tracking-wide">{stat.label}</span>
        <stat.icon size={16} className="text-[var(--ds-text3)]" />
      </div>
      <div className="stat-value mb-1">{stat.value.toLocaleString()}</div>
      <div className="flex items-center gap-1">
        <TrendingUp size={12} className="text-[var(--ds-green)]" />
        <span className="text-caption text-[var(--ds-green)]">{stat.change}%</span>
        <span className="text-caption">vs last 7d</span>
      </div>
    </div>
  ))}
</div>
```

**Specs:**

| Property | Value | Token |
|----------|-------|-------|
| Card background | `#111411` | `var(--ds-surface)` |
| Card border | 1px solid `#1F2B1F` | `var(--ds-border)` |
| Card radius | 12px | — |
| Card padding | 20px | — |
| Stat value size | 24px | `stat-value` |
| Stat value weight | 600 | — |
| Stat value color | `#00C853` | `var(--ds-green)` |
| Hover transform | translateY(-2px) | `card-interactive` |
| Trend icon | `TrendingUp`, 12px | — |

---

### 3.2 Activity Feed + Chart Split

```
┌──────────────────────────────┬─────────────────────────────────────┐
│ Live Activity                │ Usage Trends                        │
│                              │                                     │
│ ● john@example.com          │    ╭─╮                              │
│   spent 1 credit            │   ╭╯ ╰╮  ╭─╮                        │
│   2m ago                    │  ╭╯   ╰──╯ ╰──╮                     │
│                              │ ╭╯              ╰──╮                │
│ ● sarah@example.com         │╭╯                  ╰──╮             │
│   generated web component   │                                     │
│   5m ago                    │  analyze  reverse  web_builder       │
│                              │  [━━━]    [━━]      [━━━━━━]       │
│ ● New signup: alex@...      │                                     │
│   via referral JOHNDO7X3    │                                     │
│   8m ago                    │                                     │
│                              │                                     │
│ ● ⚠️ Rate limit hit         │                                     │
│   IP 192.168.1.45           │                                     │
│   12m ago                   │                                     │
│                              │                                     │
└──────────────────────────────┴─────────────────────────────────────┘
```

**Implementation:**

```tsx
<div className="grid grid-cols-2 gap-4 mt-4">
  {/* Activity Feed */}
  <div className="card">
    <h3 className="text-h3 mb-4">Live Activity</h3>
    <div className="space-y-0">
      {activities.map((item, i) => (
        <div key={i} className="feed-item">
          <div className={cn(
            "feed-dot",
            item.type === 'error' && "bg-[var(--ds-red)]",
            item.type === 'success' && "bg-[var(--ds-green)]",
            item.type === 'warning' && "bg-[var(--ds-amber)]"
          )} />
          <div className="feed-text">
            <strong>{item.actor}</strong> {item.action}
          </div>
          <span className="feed-time">{item.time}</span>
        </div>
      ))}
    </div>
  </div>

  {/* Chart */}
  <div className="card">
    <h3 className="text-h3 mb-4">Usage Trends</h3>
    <div className="h-48 flex items-end gap-3 px-2">
      {chartData.map((bar, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div 
            className="w-full rounded-t bg-[var(--ds-green)] opacity-80 hover:opacity-100 transition-opacity"
            style={{ height: `${bar.pct}%` }}
          />
          <span className="text-caption">{bar.label}</span>
        </div>
      ))}
    </div>
  </div>
</div>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Feed dot | Size | 6px × 6px | — |
| Feed dot | Radius | 50% | — |
| Feed dot | Error color | `#FF5252` | `var(--ds-red)` |
| Feed dot | Success color | `#00C853` | `var(--ds-green)` |
| Feed dot | Warning color | `#FFAB00` | `var(--ds-amber)` |
| Feed text | Size | 12px | — |
| Feed text | Color | `#8BAD8B` | `var(--ds-text2)` |
| Feed strong | Color | `#E8F5E9` | `var(--ds-text)` |
| Feed time | Size | 10px | — |
| Feed time | Font | JetBrains Mono | `font-mono` |
| Feed time | Color | `#4D6B4D` | `var(--ds-text3)` |
| Chart bar | Color | `#00C853` | `var(--ds-green)` |
| Chart bar | Opacity | 80% default, 100% hover | — |
| Chart bar | Radius | top 4px | `rounded-t` |

---

## 4. User Management

### 4.1 Search + Filter Bar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [🔍 Search users...                    ]  [Plan ▼]  [Status ▼]  [Export]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
<div className="flex items-center gap-3 mb-4">
  <div className="relative flex-1">
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text3)]" />
    <input 
      className="inp pl-9" 
      placeholder="Search users by email, name, or ID..."
    />
  </div>
  <select className="inp w-32">
    <option>All Plans</option>
    <option>Free</option>
    <option>Pro</option>
    <option>Enterprise</option>
  </select>
  <select className="inp w-32">
    <option>All Status</option>
    <option>Active</option>
    <option>Banned</option>
  </select>
  <button className="btn btn-ghost">
    <Download size={14} className="mr-2" />
    Export
  </button>
</div>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Search input | Height | 38px | `inp` |
| Search input | Radius | 8px | — |
| Search input | Background | `#171C17` | `var(--ds-surface2)` |
| Search icon | Size | 14px | — |
| Search icon | Color | `#4D6B4D` | `var(--ds-text3)` |
| Select | Height | 38px | `inp` |
| Select | Width | 128px | — |
| Export button | Style | ghost | `btn btn-ghost` |

---

### 4.2 User Table

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ User              Plan      Credits    Sessions    Joined        Actions      │
├──────────────────────────────────────────────────────────────────────────────┤
│ 👤 John Doe       [PRO]     186        42          Apr 12, 2026  [⋯]         │
│   john@email.com                                                             │
│ 👤 Sarah Smith    [FREE]    12         8           Apr 10, 2026  [⋯]         │
│   sarah@email.com                                                            │
│ 👤 Alex Chen      [ENT]     ∞          156         Mar 28, 2026  [⋯]         │
│   alex@email.com                                                             │
│ 👤 Mike Ross      [PRO]     234        67          Mar 15, 2026  [⋯]         │
│   mike@email.com                                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                        ← 1 2 3 4 5 →              Showing 1-4 of 1,247      │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
<div className="card overflow-hidden p-0">
  <table className="w-full">
    <thead>
      <tr className="border-b border-[var(--ds-border)]">
        {headers.map(h => (
          <th key={h} className="text-left text-caption uppercase tracking-wider py-3 px-4 font-medium text-[var(--ds-text3)]">
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {users.map(user => (
        <tr key={user.id} className="border-b border-[var(--ds-border)] hover:bg-[var(--ds-surface2)] transition-colors">
          <td className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="testimonial-avatar bg-[var(--ds-surface3)] text-[var(--ds-text2)]">
                {user.initials}
              </div>
              <div>
                <div className="text-h3">{user.name}</div>
                <div className="text-caption">{user.email}</div>
              </div>
            </div>
          </td>
          <td className="py-3 px-4">
            <span className={cn(
              "badge",
              user.plan === 'pro' && "bg-purple",
              user.plan === 'enterprise' && "bg-blue",
              user.plan === 'free' && "bg-gray"
            )}>
              {user.plan.toUpperCase()}
            </span>
          </td>
          <td className="py-3 px-4 font-mono text-body">
            {user.credits === -1 ? '∞' : user.credits}
          </td>
          <td className="py-3 px-4 text-body">{user.sessions}</td>
          <td className="py-3 px-4 text-caption">{user.joined}</td>
          <td className="py-3 px-4">
            <UserActionsMenu user={user} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Table header | Size | 11px | `text-caption` |
| Table header | Transform | uppercase | — |
| Table header | Tracking | 0.05em | `tracking-wider` |
| Table header | Color | `#4D6B4D` | `var(--ds-text3)` |
| Table header | Weight | 500 | — |
| Row hover | Background | `#171C17` | `var(--ds-surface2)` |
| Row border | Color | `#1F2B1F` | `var(--ds-border)` |
| Avatar | Size | 32px × 32px | `testimonial-avatar` |
| Avatar | Radius | 50% | — |
| Avatar | Background | `#1E261E` | `var(--ds-surface3)` |
| Plan badge (Pro) | Background | `rgba(206,147,216,0.15)` | `badge bg-purple` |
| Plan badge (Pro) | Text | `#CE93D8` | — |
| Plan badge (Enterprise) | Background | `rgba(64,196,255,0.15)` | `badge bg-blue` |
| Plan badge (Enterprise) | Text | `#40C4FF` | — |
| Plan badge (Free) | Background | `#1E261E` | `badge bg-gray` |
| Plan badge (Free) | Text | `#8BAD8B` | `var(--ds-text2)` |
| Credits | Font | JetBrains Mono | `font-mono` |
| Credits | Size | 13px | `text-body` |
| Joined date | Size | 11px | `text-caption` |

---

### 4.3 User Detail Slide-over

```
┌────────────────────────────────────────┐
│ 👤 John Doe                    [✕]     │
│ john@example.com                       │
│ ─────────────────────────────────────  │
│                                        │
│ Plan: [PRO ▼]              [Save]      │
│ Credits: [186        ] [+ Add] [- Deduct]│
│                                        │
│ Admin: [ ] Grant admin access          │
│ Zero Knowledge: [✓] Enabled            │
│                                        │
│ ── Activity ─────────────────────────  │
│ Apr 20  Debug session  -1 credit       │
│ Apr 19  Web builder    -10 credits     │
│ Apr 18  Referral bonus +10 credits     │
│                                        │
│ ── Danger Zone ──────────────────────  │
│ [Ban Account]  [Delete Account]        │
└────────────────────────────────────────┘
```

**Implementation:**

```tsx
<aside className="fixed right-0 top-0 h-full w-[420px] bg-[var(--ds-surface)] border-l border-[var(--ds-border)] shadow-2xl z-50">
  <div className="p-5 border-b border-[var(--ds-border)]">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="testimonial-avatar bg-[var(--ds-green-muted)] text-[var(--ds-green)] text-lg">
          JD
        </div>
        <div>
          <h2 className="text-h2">John Doe</h2>
          <p className="text-caption">john@example.com</p>
        </div>
      </div>
      <button className="btn-icon w-8 h-8">
        <X size={14} />
      </button>
    </div>
  </div>

  <div className="p-5 space-y-5">
    {/* Plan Selector */}
    <div>
      <label className="text-caption block mb-2">Plan</label>
      <select className="inp">
        <option>free</option>
        <option selected>pro</option>
        <option>enterprise</option>
      </select>
    </div>

    {/* Credit Adjustment */}
    <div>
      <label className="text-caption block mb-2">Credits</label>
      <div className="flex gap-2">
        <input className="inp" value={186} readOnly />
        <button className="btn btn-sm primary">+ Add</button>
        <button className="btn btn-sm ghost">- Deduct</button>
      </div>
    </div>

    {/* Toggles */}
    <div className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="w-9 h-5 rounded-full bg-[var(--ds-border)] relative">
          <div className="w-4 h-4 rounded-full bg-[var(--ds-surface)] absolute left-0.5 top-0.5" />
        </div>
        <span className="text-body">Grant admin access</span>
      </label>
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="w-9 h-5 rounded-full bg-[var(--ds-green)] relative">
          <div className="w-4 h-4 rounded-full bg-[var(--ds-surface)] absolute right-0.5 top-0.5" />
        </div>
        <span className="text-body">Zero knowledge mode</span>
      </label>
    </div>

    {/* Activity */}
    <div>
      <h4 className="text-h3 mb-3">Recent Activity</h4>
      <div className="space-y-0">
        {activity.map((item, i) => (
          <div key={i} className="feed-item">
            <span className="feed-time w-16">{item.date}</span>
            <span className="feed-text">{item.action}</span>
            <span className={cn(
              "badge text-xs",
              item.amount > 0 ? "bg-green" : "bg-red"
            )}>
              {item.amount > 0 ? '+' : ''}{item.amount}
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* Danger Zone */}
    <div className="card-sm border-[var(--ds-red)]/30 bg-[var(--ds-red)]/5">
      <h4 className="text-h3 text-[var(--ds-red)] mb-3">Danger Zone</h4>
      <div className="flex gap-2">
        <button className="btn btn-danger flex-1">Ban Account</button>
        <button className="btn btn-danger flex-1">Delete Account</button>
      </div>
    </div>
  </div>
</aside>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Slide-over width | 420px | — | — |
| Background | `#111411` | `var(--ds-surface)` | — |
| Border-left | 1px solid `#1F2B1F` | `var(--ds-border)` | — |
| Shadow | `0 25px 50px rgba(0,0,0,0.25)` | `shadow-2xl` | — |
| Toggle (off) | Background | `#1F2B1F` | `var(--ds-border)` |
| Toggle (on) | Background | `#00C853` | `var(--ds-green)` |
| Toggle knob | Size | 16px × 16px | — |
| Toggle knob | Color | `#111411` | `var(--ds-surface)` |
| Danger zone card | Border | `rgba(255,82,82,0.3)` | `var(--ds-red)`/30 |
| Danger zone card | Background | `rgba(255,82,82,0.05)` | `var(--ds-red)`/5 |
| Danger zone title | Color | `#FF5252` | `var(--ds-red)` |

---

## 5. Credit Management

### 5.1 Credit Overview + Adjustment Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Credit Economy Overview                                          [Refresh]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  💰         │  │  🎁         │  │  ⚡          │  │  📊         │        │
│  │  89,432     │  │  12,450     │  │  76,982     │  │  1.73       │        │
│  │ Total Supply│  │ Free Credits│  │ Spent (30d) │  │ Avg/Session │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ── Recent Transactions ──────────────────────────────────────────────────  │
│                                                                             │
│  john@example.com    analyze        -1      Apr 27, 05:12    [view]        │
│  sarah@example.com   web_builder    -10     Apr 27, 05:08    [view]        │
│  alex@example.com    referral_bonus +10     Apr 27, 04:55    [view]        │
│  mike@example.com    subscription   +300    Apr 27, 04:30    [view]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
<div className="card">
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-h1">Credit Economy Overview</h2>
    <button className="btn btn-ghost btn-sm">
      <RefreshCw size={12} className="mr-1" />
      Refresh
    </button>
  </div>

  <div className="grid grid-cols-4 gap-4 mb-6">
    {creditStats.map(stat => (
      <div key={stat.label} className="card-sm text-center">
        <div className="stat-value mb-1">{stat.value}</div>
        <div className="text-caption">{stat.label}</div>
      </div>
    ))}
  </div>

  <h3 className="text-h3 mb-3">Recent Transactions</h3>
  <div className="space-y-0">
    {transactions.map(tx => (
      <div key={tx.id} className="feed-item">
        <span className="text-body w-40 truncate">{tx.user}</span>
        <span className="badge bg-gray">{tx.type}</span>
        <span className={cn(
          "font-mono text-sm w-12 text-right",
          tx.amount > 0 ? "text-[var(--ds-green)]" : "text-[var(--ds-red)]"
        )}>
          {tx.amount > 0 ? '+' : ''}{tx.amount}
        </span>
        <span className="feed-time">{tx.time}</span>
        <button className="btn-sm ghost ml-auto">View</button>
      </div>
    ))}
  </div>
</div>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Stat card | Style | `card-sm` | — |
| Stat value | Size | 24px | `stat-value` |
| Stat value | Color | `#00C853` | `var(--ds-green)` |
| Transaction user | Width | 160px | — |
| Transaction user | Overflow | truncate | — |
| Transaction type | Style | `badge bg-gray` | — |
| Transaction amount | Font | JetBrains Mono | `font-mono` |
| Transaction amount | Positive | `#00C853` | `var(--ds-green)` |
| Transaction amount | Negative | `#FF5252` | `var(--ds-red)` |

---

### 5.2 Bulk Credit Adjustment Modal

```
┌────────────────────────────────────────┐
│ Adjust Credits                 [✕]     │
│ ─────────────────────────────────────  │
│                                        │
│ Users: [john@, sarah@, +3 more] [×]   │
│                                        │
│ Action: (•) Add    ( ) Deduct          │
│                                        │
│ Amount: [50                    ]       │
│                                        │
│ Reason: [Monthly bonus for beta testers]│
│                                        │
│ [Cancel]              [Confirm]        │
└────────────────────────────────────────┘
```

**Implementation:**

```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="card w-[480px] animate-scale-in">
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-h1">Adjust Credits</h2>
      <button className="btn-icon w-8 h-8"><X size={14} /></button>
    </div>

    <div className="space-y-4">
      <div>
        <label className="text-caption block mb-2">Target Users</label>
        <div className="flex flex-wrap gap-2 p-2 bg-[var(--ds-surface2)] rounded-lg border border-[var(--ds-border)]">
          {selectedUsers.map(u => (
            <span key={u} className="badge bg-blue flex items-center gap-1">
              {u}
              <X size={10} className="cursor-pointer" />
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="text-caption block mb-2">Action</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="w-4 h-4 rounded-full border-2 border-[var(--ds-green)] bg-[var(--ds-green)]" />
            <span className="text-body">Add</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="w-4 h-4 rounded-full border-2 border-[var(--ds-border)]" />
            <span className="text-body">Deduct</span>
          </label>
        </div>
      </div>

      <div>
        <label className="text-caption block mb-2">Amount</label>
        <input type="number" className="inp" placeholder="Enter credit amount" />
      </div>

      <div>
        <label className="text-caption block mb-2">Reason</label>
        <textarea className="inp h-20 py-2 resize-none" placeholder="Reason for adjustment..." />
      </div>
    </div>

    <div className="flex justify-end gap-2 mt-6">
      <button className="btn btn-ghost">Cancel</button>
      <button className="btn btn-primary">Confirm Adjustment</button>
    </div>
  </div>
</div>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Modal overlay | Background | `rgba(0,0,0,0.6)` | — |
| Modal overlay | Blur | 4px | `backdrop-blur-sm` |
| Modal card | Width | 480px | — |
| Modal card | Animation | `animate-scale-in` | — |
| User tags | Style | `badge bg-blue` | — |
| User tags | Remove icon | 10px | — |
| Radio (selected) | Border | 2px solid `#00C853` | `var(--ds-green)` |
| Radio (selected) | Fill | `#00C853` | `var(--ds-green)` |
| Radio (unselected) | Border | 2px solid `#1F2B1F` | `var(--ds-border)` |
| Textarea | Height | 80px | — |
| Textarea | Resize | none | — |

---

## 6. Audit Logs

### 6.1 Filterable Audit Trail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Audit Trail                                                    [Export CSV] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [Search actions...          ]  [Action ▼]  [Target ▼]  [Date Range ▼]      │
│                                                                             │
│ ──────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│ 05:12:34  auth.login        john@email.com    profile      192.168.1.45     │
│ 05:10:22  credit.adjust     admin@debugg.ai   credit_wallet 192.168.1.2      │
│           +50 credits to mike@email.com                                     │
│ 05:08:15  debug.analyze     sarah@email.com   debug_session 192.168.1.89     │
│           analyze action, 1 credit deducted                                 │
│ 05:05:01  admin.plan_override admin@debugg.ai profile      192.168.1.2      │
│           Changed john@email.com from free → pro                            │
│ 04:55:33  referral.claim    alex@email.com    referral     192.168.1.120    │
│           Used code JOHNDO7X3                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
<div className="card">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-h1">Audit Trail</h2>
    <button className="btn btn-ghost btn-sm">
      <Download size={12} className="mr-1" />
      Export CSV
    </button>
  </div>

  <div className="flex gap-2 mb-4">
    <input className="inp flex-1" placeholder="Search actions..." />
    <select className="inp w-32"><option>All Actions</option></select>
    <select className="inp w-32"><option>All Targets</option></select>
    <select className="inp w-40"><option>Last 24 hours</option></select>
  </div>

  <div className="space-y-0">
    {auditEvents.map(event => (
      <div key={event.id} className="feed-item py-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            "feed-dot mt-1.5",
            event.action.startsWith('admin') && "bg-[var(--ds-purple)]",
            event.action.startsWith('auth') && "bg-[var(--ds-blue)]",
            event.action.startsWith('credit') && "bg-[var(--ds-amber)]",
            event.action.startsWith('debug') && "bg-[var(--ds-green)]"
          )} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-[var(--ds-text3)] w-16">{event.time}</span>
              <span className="badge bg-gray">{event.action}</span>
              <span className="text-body">{event.actor}</span>
              <span className="text-caption">→ {event.target_type}</span>
            </div>
            {event.details && (
              <p className="text-caption ml-[88px]">{event.details}</p>
            )}
          </div>
        </div>
        <span className="font-mono text-caption">{event.ip}</span>
      </div>
    ))}
  </div>
</div>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Action badge (admin.*) | Background | `rgba(206,147,216,0.15)` | `badge bg-purple` |
| Action badge (admin.*) | Text | `#CE93D8` | — |
| Action badge (auth.*) | Background | `rgba(64,196,255,0.15)` | `badge bg-blue` |
| Action badge (auth.*) | Text | `#40C4FF` | — |
| Action badge (credit.*) | Background | `rgba(255,171,0,0.15)` | `badge bg-amber` |
| Action badge (credit.*) | Text | `#FFC107` | — |
| Action badge (debug.*) | Background | `rgba(0,200,83,0.15)` | `badge bg-green` |
| Action badge (debug.*) | Text | `#00E676` | — |
| Timestamp | Font | JetBrains Mono | `font-mono` |
| Timestamp | Size | 12px | — |
| Timestamp | Color | `#4D6B4D` | `var(--ds-text3)` |
| IP address | Font | JetBrains Mono | `font-mono` |
| IP address | Size | 11px | `text-caption` |
| IP address | Color | `#4D6B4D` | `var(--ds-text3)` |
| Details indent | Margin-left | 88px | — |

---

## 7. Abuse Monitoring

### 7.1 Abuse Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Abuse Monitoring                                               [Auto-refresh]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   ⚠️        │  │   🚫        │  │   🔒        │  │   📈        │        │
│  │  23         │  │  5          │  │  2          │  │  156%       │        │
│  │ Rate Limits │  │ Banned IPs  │  │ Active Bans │  │ vs Last Wk  │        │
│  │ (24h)       │  │ (24h)       │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ── Recent Violations ────────────────────────────────────────────────────  │
│                                                                             │
│  🔴 192.168.1.45    rate_limit_hit    /api/debug/analyze   12x in 1h       │
│      User: john@email.com  |  Action: Temp ban 1h  [Lift] [Ban Permanently] │
│                                                                             │
│  🟡 203.0.113.55    credit_race       /api/generate        3x in 5m         │
│      User: sarah@email.com |  Action: Warning sent  [Dismiss] [Ban]        │
│                                                                             │
│  🔴 198.51.100.22   invalid_token     /api/admin/users     45x in 10m      │
│      User: Unknown         |  Action: IP blocked    [Unblock]               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
<div className="space-y-4">
  {/* Stats */}
  <div className="grid grid-cols-4 gap-4">
    {abuseStats.map(stat => (
      <div className={cn(
        "card card-interactive",
        stat.severity === 'critical' && "border-[var(--ds-red)]/50"
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{stat.icon}</span>
          {stat.severity === 'critical' && (
            <span className="badge bg-red animate-pulse">CRITICAL</span>
          )}
        </div>
        <div className="stat-value text-[var(--ds-red)]">{stat.value}</div>
        <div className="text-caption">{stat.label}</div>
      </div>
    ))}
  </div>

  {/* Violations List */}
  <div className="card">
    <h3 className="text-h1 mb-4">Recent Violations</h3>
    <div className="space-y-3">
      {violations.map(v => (
        <div key={v.id} className={cn(
          "card-sm border-l-4",
          v.severity === 'critical' ? "border-l-[var(--ds-red)]" : "border-l-[var(--ds-amber)]"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-body font-mono">{v.ip}</span>
                <span className="badge bg-red">{v.type}</span>
                <span className="text-caption">{v.endpoint}</span>
              </div>
              <p className="text-caption mb-2">
                User: {v.user || 'Unknown'} | {v.frequency}
              </p>
              <p className="text-body text-[var(--ds-text2)]">
                Action taken: {v.action}
              </p>
            </div>
            <div className="flex gap-2">
              {v.canLift && (
                <button className="btn btn-sm ghost">Lift</button>
              )}
              <button className="btn btn-sm danger">Ban</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Critical card | Border | `rgba(255,82,82,0.5)` | `var(--ds-red)`/50 |
| Critical badge | Style | `badge bg-red animate-pulse` | — |
| Stat value (critical) | Color | `#FF5252` | `var(--ds-red)` |
| Violation card | Left border | 4px solid | — |
| Violation (critical) | Border color | `#FF5252` | `var(--ds-red)` |
| Violation (warning) | Border color | `#FFAB00` | `var(--ds-amber)` |
| IP address | Font | JetBrains Mono | `font-mono` |
| IP address | Size | 13px | `text-body` |
| Violation type | Style | `badge bg-red` | — |
| Endpoint | Size | 11px | `text-caption` |

---

## 8. Referral & Ambassador Management

### 8.1 Ambassador Leaderboard + Payout Queue

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ Ambassador Leaderboard               │ Payout Queue                         │
│                                      │                                      │
│ 🏆 #1  John Doe         🥇 Gold      │ Apr 2026    $450.00    23 refs       │
│        42 referrals | $520 earned    │ [Approve] [Reject] [Details]         │
│                                      │                                      │
│ 🥈 #2  Sarah Smith      🥈 Silver    │ Mar 2026    $320.00    18 refs       │
│        28 referrals | $340 earned    │ [Approve] [Reject] [Details]         │
│                                      │                                      │
│ 🥉 #3  Alex Chen        🥉 Silver    │ Feb 2026    $180.00    12 refs       │
│        15 referrals | $180 earned    │ [Approve] [Reject] [Details]         │
│                                      │                                      │
│ #4   Mike Ross          🥉 Bronze    │                                      │
│      8 referrals  | $80 earned       │                                      │
│                                      │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

**Implementation:**

```tsx
<div className="grid grid-cols-2 gap-4">
  {/* Leaderboard */}
  <div className="card">
    <h3 className="text-h1 mb-4">Ambassador Leaderboard</h3>
    <div className="space-y-2">
      {ambassadors.map((user, i) => (
        <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--ds-surface2)] transition-colors">
          <span className="font-mono text-lg w-8 text-center text-[var(--ds-text3)]">
            {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
          </span>
          <div className="testimonial-avatar bg-[var(--ds-surface3)]">
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-h3 truncate">{user.name}</div>
            <div className="text-caption">{user.referrals} referrals | ${user.earned} earned</div>
          </div>
          <span className={cn(
            "badge",
            user.tier === 'gold' && "bg-amber",
            user.tier === 'silver' && "bg-gray",
            user.tier === 'bronze' && "bg-purple"
          )}>
            {user.tier.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  </div>

  {/* Payout Queue */}
  <div className="card">
    <h3 className="text-h1 mb-4">Payout Queue</h3>
    <div className="space-y-3">
      {payouts.map(p => (
        <div key={p.id} className="card-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-h3">{p.period}</span>
            <span className="stat-value text-lg">${p.amount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-caption">{p.referrals} qualified referrals</span>
            <div className="flex gap-1">
              <button className="btn btn-sm primary">Approve</button>
              <button className="btn btn-sm ghost">Reject</button>
              <button className="btn btn-sm ghost">Details</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Rank emoji | #1 | 🏆 | — |
| Rank emoji | #2 | 🥈 | — |
| Rank emoji | #3 | 🥉 | — |
| Rank number | Font | JetBrains Mono | `font-mono` |
| Rank number | Size | 18px | — |
| Rank number | Color | `#4D6B4D` | `var(--ds-text3)` |
| Tier badge (Gold) | Background | `rgba(255,171,0,0.15)` | `badge bg-amber` |
| Tier badge (Gold) | Text | `#FFC107` | — |
| Tier badge (Silver) | Background | `#1E261E` | `badge bg-gray` |
| Tier badge (Silver) | Text | `#8BAD8B` | `var(--ds-text2)` |
| Tier badge (Bronze) | Background | `rgba(206,147,216,0.15)` | `badge bg-purple` |
| Tier badge (Bronze) | Text | `#CE93D8` | — |
| Payout amount | Size | 18px | `stat-value text-lg` |
| Payout amount | Color | `#00C853` | `var(--ds-green)` |

---

## 9. System Settings

### 9.1 Configuration Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ System Configuration                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ── Rate Limits ──────────────────────────────────────────────────────────  │
│                                                                             │
│ Free Plan                                                               [?] │
│   Analyze/day:    [10        ]    Reverse/day:  [5         ]               │
│   Web builder/day: [2        ]    Max prompt:   [2000 chars]               │
│                                                                             │
│ Pro Plan                                                                  [?] │
│   Analyze/day:    [300       ]    Reverse/day:  [100       ]               │
│   Web builder/day: [50       ]    Max prompt:   [10000 chars]              │
│                                                                             │
│ ── AI Configuration ─────────────────────────────────────────────────────  │
│                                                                             │
│ Default Model: [llama-3.3-70b-versatile                    ▼]              │
│ Temperature:   [0.7        ] ←→                                            │
│ Max Tokens:    [4096       ]                                               │
│                                                                             │
│ ── Maintenance ──────────────────────────────────────────────────────────  │
│                                                                             │
│ [🔄 Reset all monthly credits]    [🧹 Purge old sessions (> retention)]    │
│ [📧 Send system announcement]     [🚨 Emergency mode toggle]               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
<div className="card max-w-3xl">
  <h2 className="text-h1 mb-6">System Configuration</h2>

  <div className="space-y-8">
    {/* Rate Limits */}
    <section>
      <h3 className="text-h2 mb-4 flex items-center gap-2">
        Rate Limits
        <HelpCircle size={14} className="text-[var(--ds-text3)] cursor-help" />
      </h3>
      {plans.map(plan => (
        <div key={plan.name} className="mb-4 p-4 rounded-lg bg-[var(--ds-surface2)] border border-[var(--ds-border)]">
          <h4 className="text-h3 mb-3 capitalize">{plan.name} Plan</h4>
          <div className="grid grid-cols-2 gap-4">
            {plan.limits.map(limit => (
              <div key={limit.label}>
                <label className="text-caption block mb-1">{limit.label}</label>
                <input type="number" className="inp" defaultValue={limit.value} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>

    {/* AI Config */}
    <section>
      <h3 className="text-h2 mb-4">AI Configuration</h3>
      <div className="space-y-4">
        <div>
          <label className="text-caption block mb-1">Default Model</label>
          <select className="inp">
            <option>llama-3.3-70b-versatile</option>
            <option>llama-3.1-8b-instant</option>
            <option>mixtral-8x7b</option>
          </select>
        </div>
        <div>
          <label className="text-caption block mb-1">Temperature: {temp}</label>
          <input type="range" min="0" max="2" step="0.1" className="w-full accent-[var(--ds-green)]" />
        </div>
        <div>
          <label className="text-caption block mb-1">Max Tokens</label>
          <input type="number" className="inp" defaultValue={4096} />
        </div>
      </div>
    </section>

    {/* Maintenance Actions */}
    <section>
      <h3 className="text-h2 mb-4">Maintenance</h3>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn btn-ghost justify-start">
          <RefreshCw size={14} className="mr-2" />
          Reset all monthly credits
        </button>
        <button className="btn btn-ghost justify-start">
          <Trash2 size={14} className="mr-2" />
          Purge old sessions
        </button>
        <button className="btn btn-ghost justify-start">
          <Mail size={14} className="mr-2" />
          Send system announcement
        </button>
        <button className="btn btn-danger justify-start">
          <AlertTriangle size={14} className="mr-2" />
          Emergency mode toggle
        </button>
      </div>
    </section>
  </div>
</div>
```

**Specs:**

| Element | Property | Value | Token |
|---------|----------|-------|-------|
| Plan section | Background | `#171C17` | `var(--ds-surface2)` |
| Plan section | Border | 1px solid `#1F2B1F` | `var(--ds-border)` |
| Plan section | Radius | 8px | — |
| Plan section | Padding | 16px | — |
| Help icon | Size | 14px | — |
| Help icon | Color | `#4D6B4D` | `var(--ds-text3)` |
| Range slider | Accent | `#00C853` | `var(--ds-green)` |
| Maintenance button | Style | `btn btn-ghost justify-start` | — |
| Emergency button | Style | `btn btn-danger justify-start` | — |
| Emergency icon | `AlertTriangle` | 14px | — |

---

## 10. Component Reference

### 10.1 Class Quick Reference

| Element | Class | Background | Border | Text |
|---------|-------|------------|--------|------|
| **Page background** | `bg-[var(--ds-bg)]` | `#0A0D0A` | — | — |
| **Cards** | `card` | `#111411` | 1px `#1F2B1F` | — |
| **Small cards** | `card-sm` | `#111411` | 1px `#1F2B1F` | — |
| **Card hover** | `card-interactive` | — | — | translateY(-2px) |
| **Primary buttons** | `btn btn-primary` | `#00C853` | none | `#000000` |
| **Ghost buttons** | `btn btn-ghost` | transparent | 1px `#283228` | `#E8F5E9` |
| **Danger buttons** | `btn btn-danger` | transparent | 1px `rgba(255,82,82,0.35)` | `#FF5252` |
| **Inputs** | `inp` | `#171C17` | 1px `#283228` | `#E8F5E9` |
| **Input focus** | `inp:focus` | — | `#00C853` | — |
| **Green badge** | `badge bg-green` | `rgba(0,200,83,0.15)` | — | `#00E676` |
| **Red badge** | `badge bg-red` | `rgba(255,82,82,0.15)` | — | `#FF7777` |
| **Amber badge** | `badge bg-amber` | `rgba(255,171,0,0.15)` | — | `#FFC107` |
| **Blue badge** | `badge bg-blue` | `rgba(64,196,255,0.15)` | — | `#40C4FF` |
| **Purple badge** | `badge bg-purple` | `rgba(206,147,216,0.15)` | — | `#CE93D8` |
| **Gray badge** | `badge bg-gray` | `#1E261E` | — | `#8BAD8B` |
| **Nav links** | `nav-link` | transparent | none | `#8BAD8B` |
| **Nav active** | `nav-link.active` | `rgba(0,200,83,0.12)` | none | `#00C853` |
| **Stat values** | `stat-value` | — | — | `#00C853`, 24px, 600wt |
| **Feed items** | `feed-item` | — | bottom 1px `#1F2B1F` | — |
| **Feed dots** | `feed-dot` | 6px circle | — | varies |
| **Avatars** | `testimonial-avatar` | `#1E261E` | — | `#8BAD8B`, 32px |

### 10.2 Typography Scale

| Token | Size | Line Height | Weight | Tracking | Usage |
|-------|------|-------------|--------|----------|-------|
| `text-display` | 32px | 1.2 | 600 | -0.5px | Page titles |
| `text-h1` | 22px | 1.3 | 600 | -0.3px | Section headers |
| `text-h2` | 17px | 1.4 | 600 | -0.2px | Sub-sections |
| `text-h3` | 14px | 1.5 | 500 | — | Card titles, labels |
| `text-body` | 13px | 1.6 | 400 | — | Body text |
| `text-caption` | 11px | 1.5 | 400 | 0.01em | Metadata, timestamps |
| `stat-value` | 24px | 1.2 | 600 | — | KPI numbers |
| `font-mono` | varies | varies | 400 | — | Code, data, IPs |

### 10.3 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tight icon+text |
| `gap-2` | 8px | Inline elements |
| `gap-3` | 12px | Standard spacing |
| `gap-4` | 16px | Card padding |
| `gap-5` | 20px | Section padding |
| `gap-6` | 24px | Large sections |
| `p-3` | 12px | Compact padding |
| `p-4` | 16px | Standard padding |
| `p-5` | 20px | Card padding |

### 10.4 Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `ds-r4` | 4px | Badges, small elements |
| `ds-r6` | 6px | Buttons, nav links |
| `ds-r8` | 8px | Inputs, small cards |
| `ds-r10` | 10px | `card-sm` |
| `ds-r12` | 12px | `card` |
| `ds-r20` | 20px | Large modals |
| `ds-r-pill` | 999px | Buttons, pills |

---

## 11. Responsive Behavior

| Breakpoint | Layout Changes |
|------------|----------------|
| **Desktop (≥1024px)** | Full multi-column grids, slide-over panels, side-by-side charts |
| **Tablet (768–1023px)** | 2-column grids collapse to single, tables scroll horizontally, slide-overs become full-screen |
| **Mobile (<768px)** | Single column everywhere, cards stack vertically, tables become card lists, nav collapses to hamburger |

### Mobile-Specific Adaptations

```tsx
// Table → Card List
<div className="md:hidden space-y-3">
  {users.map(user => (
    <div key={user.id} className="card-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="testimonial-avatar">{user.initials}</div>
        <div>
          <div className="text-h3">{user.name}</div>
          <div className="text-caption">{user.email}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="badge bg-purple">{user.plan}</span>
        <span className="font-mono text-body">{user.credits} 🪙</span>
      </div>
    </div>
  ))}
</div>
```

---

## 12. Accessibility Notes

| Requirement | Implementation |
|-------------|----------------|
| **Focus states** | All interactive elements use `focus-visible` with green ring (`0 0 0 3px rgba(0,200,83,0.14)`) |
| **Color independence** | Status indicators use icons + text + color (never color alone) |
| **Table semantics** | Proper `<thead>`, `<th scope="col">`, `<tbody>` structure |
| **Modal behavior** | Focus trap, Escape to close, aria-labelledby for titles |
| **Reduced motion** | `prefers-reduced-motion` disables animations, instant transitions |
| **Keyboard nav** | Tab order follows visual flow, arrow keys for table navigation |
| **Screen readers** | `sr-only` text for icon-only buttons, live regions for activity feed |
| **Contrast ratios** | All text meets WCAG AA (4.5:1 normal, 3:1 large) |

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  html {
    scroll-behavior: auto;
  }
}
```

---

## 13. Animation Reference

| Animation | Class | Duration | Easing | Usage |
|-----------|-------|----------|--------|-------|
| Fade in | `animate-fade-in` | 200ms | ease-out | Page loads |
| Slide down | `animate-slide-down` | 200ms | ease-out | Dropdowns |
| Scale in | `animate-scale-in` | 200ms | ease-out | Modals |
| Pulse slow | `animate-pulse-slow` | 3000ms | cubic-bezier(0.4,0,0.6,1) | Critical badges |
| Card lift | `card-interactive:hover` | 200ms | ease-out | Card hover |
| Button press | `btn:active` | 150ms | ease-out | Button click |
| Feed dot pulse | `animate-pulse` | 2000ms | ease-in-out | Live indicators |

---

*DeBuggAI Admin Dashboard Design Concepts — April 2026*
