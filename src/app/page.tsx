/**
 * Landing Page - DeBuggAI
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Play,
  Star,
  Zap,
  Bug,
  Globe,
  RefreshCw,
  Shield,
  Activity,
  X,
} from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';
import { HomeFadeUpInit } from '@/components/public/home/home-fadeup-init';
import { HomeTerminalDemo } from '@/components/public/home/home-terminal-demo';
import { HomeFaq } from '@/components/public/home/home-faq';

/* Map feature color names to --app-* variable suffixes */
const featureColorVars: Record<string, string> = {
  blue: '--app-info',
  purple: '--app-purple',
  amber: '--app-warning',
  red: '--app-danger',
  green: '--app-accent',
};

export default function LandingPage() {
  return (
    <PublicLayout>
      <HomeFadeUpInit />
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="fade-up visible inline-flex items-center gap-2 mb-5 rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" style={{ animation: 'dot-pulse 2s infinite' }} />
            AI-Powered Development Platform
          </div>

          <h1 className="fade-up visible fade-up-delay-1 mb-4 text-[40px] font-bold tracking-[-0.8px] leading-[1.1] text-[var(--app-text)]">
            Debug Code & Build<br />
            <span className="text-[var(--app-accent)]">Apps with AI</span>
          </h1>

          <p className="fade-up visible fade-up-delay-2 text-[15px] text-[var(--app-text-muted)] mb-8 max-w-2xl mx-auto leading-relaxed">
            Instant debugging for 10+ languages and a visual web builder powered by AI. Ship faster with DeBuggAI.
          </p>

          <div className="fade-up visible fade-up-delay-3 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="w-full sm:w-auto">
              <button className="w-full inline-flex items-center justify-center gap-2 rounded-[6px] px-6 py-3 text-[13px] font-medium bg-[var(--app-accent)] text-[#071006] hover:opacity-90 transition-opacity">
                Start Debugging Now
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/demo" className="w-full sm:w-auto">
              <button className="w-full inline-flex items-center justify-center gap-2 rounded-[6px] px-6 py-3 text-[13px] font-medium border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">
                Watch Demo
                <Play className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>

          <div className="fade-up visible fade-up-delay-3 flex items-center justify-center gap-4 flex-wrap mt-5">
            <span className="text-[11px] text-[var(--app-text-muted)] flex items-center gap-1">
              <Check className="h-3 w-3 text-[var(--app-accent)]" /> Free forever plan
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--app-text-dim)]" />
            <span className="text-[11px] text-[var(--app-text-muted)] flex items-center gap-1">
              <Check className="h-3 w-3 text-[var(--app-accent)]" /> No credit card required
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--app-text-dim)]" />
            <span className="text-[11px] text-[var(--app-text-muted)] flex items-center gap-1">
              <Check className="h-3 w-3 text-[var(--app-accent)]" /> Setup in 2 minutes
            </span>
          </div>
        </div>
      </section>

      {/* Live Activity Feed */}
      <section className="container mx-auto px-4 pb-16">
        <div className="fade-up max-w-2xl mx-auto">
          <div className="rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" style={{ animation: 'dot-pulse 2s infinite' }} />
              <span className="text-[10px] font-mono text-[var(--app-text-dim)] uppercase tracking-[0.12em]">Live Activity</span>
            </div>
            {[
              { name: 'Sarah K.', action: 'fixed a', error: 'NullPointerException', lang: 'Java', color: 'var(--app-danger)', time: '12s ago' },
              { name: 'Mike R.', action: 'debugged a', error: 'TypeError', lang: 'TypeScript', color: 'var(--app-info)', time: '34s ago' },
              { name: 'Alex T.', action: 'built a landing page with the', error: 'Web Builder', lang: '', color: 'var(--app-warning)', time: '1m ago' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 py-2"
                style={{ borderBottom: i < 2 ? '1px solid var(--app-border)' : 'none' }}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <div className="text-[11px] text-[var(--app-text-muted)] min-w-0">
                  <strong className="text-[var(--app-text)]">{item.name}</strong>{' '}
                  {item.action}{' '}
                  <span style={{ color: item.color }}>{item.error}</span>
                  {item.lang && <> in {item.lang}</>}
                </div>
                <span className="text-[10px] text-[var(--app-text-dim)] ml-auto flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-[var(--app-border)] py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4 fade-up">
              Features
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight mb-3 text-[var(--app-text)] fade-up">
              Everything you need to build faster
            </h2>
            <p className="text-[15px] text-[var(--app-text-muted)] max-w-2xl mx-auto fade-up">
              Powerful AI tools to debug, analyze, and generate production-ready code
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {[
              { icon: Bug, title: 'AI Debugging', desc: 'Paste your error and get instant fixes with explanations. Supports 10+ languages out of the box.', badge: 'Most Used', color: 'blue' },
              { icon: Globe, title: 'Web Builder', desc: 'Describe what you want and watch AI create it live. Monaco editor + iframe preview.', badge: 'New', color: 'purple' },
              { icon: Zap, title: 'Instant Answers', desc: 'Code reviews, best practices, and explanations in seconds. No more Stack Overflow.', badge: 'Fast', color: 'amber' },
              { icon: RefreshCw, title: 'Project Templates', desc: 'Generate MERN, Laravel, Django, Flask, Rails, and Go stacks in seconds.', badge: '6 Stacks', color: 'purple' },
              { icon: Shield, title: 'Zero-Knowledge Mode', desc: 'Your code is never stored. All analysis happens in-memory and is discarded immediately.', badge: 'Pro', color: 'red' },
              { icon: Activity, title: 'SSE Streaming', desc: 'Watch the AI think in real-time with server-sent events. No loading spinners.', badge: 'Live', color: 'green' },
            ].map((feature, i) => {
              const varName = featureColorVars[feature.color] || '--app-accent';
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] hover:border-[var(--app-border-strong)] transition-colors p-5 fade-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="mb-4">
                    <div
                      className="inline-flex p-2.5 rounded-[6px]"
                      style={{
                        background: `rgb(from var(${varName}) r g b / 0.12)`,
                        color: `var(${varName})`,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-[16px] font-medium tracking-[-0.02em] mb-2 text-[var(--app-text)]">{feature.title}</h3>
                  <p className="text-[13px] text-[var(--app-text-muted)] leading-relaxed mb-3">{feature.desc}</p>
                  <span className="inline-flex rounded-[6px] px-2.5 py-0.5 text-[10px] font-medium bg-[var(--app-surface)] text-[var(--app-text-muted)] border border-[var(--app-border)]">
                    {feature.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live Demo Terminal */}
      <section id="demo" className="border-t border-[var(--app-border)] py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4 fade-up">
              Live Demo
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight mb-3 text-[var(--app-text)] fade-up">
              See it in action
            </h2>
            <p className="text-[15px] text-[var(--app-text-muted)] max-w-2xl mx-auto fade-up">
              Watch how DeBuggAI identifies and fixes a real error in real time
            </p>
          </div>

          <HomeTerminalDemo />
        </div>
      </section>

      {/* Supported Languages */}
      <section id="languages" className="border-t border-[var(--app-border)] py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4 fade-up">
              Languages
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight mb-3 text-[var(--app-text)] fade-up">
              10+ languages supported
            </h2>
            <p className="text-[15px] text-[var(--app-text-muted)] fade-up">
              Automatic detection: paste your code and go
            </p>
          </div>

          <div className="fade-up grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { name: 'JavaScript', color: '#F7DF1E' },
              { name: 'Python', color: '#3776AB' },
              { name: 'PHP', color: '#4F5D95' },
              { name: 'Go', color: '#00ADD8' },
              { name: 'Ruby', color: '#CC342D' },
              { name: 'TypeScript', color: '#3178C6' },
              { name: 'Java', color: '#B07219' },
              { name: 'C#', color: '#A8B9CC' },
              { name: 'HTML/CSS', color: '#E34F26' },
              { name: 'C++', color: '#00599C' },
              { name: 'Dart', color: '#68217A' },
              { name: '+ more', color: 'var(--app-text-dim)' },
            ].map((lang, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] px-4 py-3 text-[13px] text-[var(--app-text)]"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: lang.color }} />
                {lang.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-[var(--app-border)] py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4 fade-up">
              How It Works
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight text-[var(--app-text)] fade-up">
              Three steps to better code
            </h2>
          </div>

          <div className="fade-up max-w-3xl mx-auto grid md:grid-cols-3 gap-6">
            {[
              { step: 1, title: 'Paste Your Code', desc: 'Copy your error or code snippet into DeBuggAI' },
              { step: 2, title: 'AI Analyzes', desc: 'Identifies the root cause and generates a fix in real-time' },
              { step: 3, title: 'Copy & Deploy', desc: 'Get corrected code with explanations and ship it' },
            ].map((item, index) => (
              <div key={index} className="text-center relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-0 w-[calc(50%+12px)] h-px bg-[var(--app-border-strong)]" />
                )}
                <div
                  className="w-12 h-12 rounded-[6px] flex items-center justify-center mx-auto mb-3.5 text-lg font-semibold text-[#071006] font-mono"
                  style={{
                    background: 'var(--app-accent)',
                  }}
                >
                  {item.step}
                </div>
                <h3 className="text-[16px] font-medium tracking-[-0.02em] mb-2 text-[var(--app-text)]">{item.title}</h3>
                <p className="text-[13px] text-[var(--app-text-muted)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-[var(--app-border)] bg-[var(--app-panel)] py-16">
        <div className="container mx-auto px-4">
          <div className="fade-up grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { value: '10K+', label: 'Happy Developers' },
              { value: '10x', label: 'Faster Debugging' },
              { value: '2.1s', label: 'Avg. Fix Time' },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] text-center p-6 hover:border-[var(--app-border-strong)] transition-colors"
              >
                <div className="text-[28px] font-semibold tracking-tight text-[var(--app-accent)]">{stat.value}</div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before & After Code Preview */}
      <section className="border-t border-[var(--app-border)] py-20">
        <div className="container mx-auto px-4">
          <div className="fade-up grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
            <div>
              <div className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4">
                Before & After
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight mb-3 text-[var(--app-text)]">
                See the difference
              </h2>
              <p className="text-[13px] text-[var(--app-text-muted)] leading-relaxed mb-5">
                DeBuggAI does not just point out errors, it rewrites the code with best practices and explains every change.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  { icon: X, color: 'var(--app-danger)', text: 'Removes dead code paths' },
                  { icon: Check, color: 'var(--app-success)', text: 'Adds proper error handling' },
                  { icon: Check, color: 'var(--app-success)', text: 'Follows language conventions' },
                  { icon: Check, color: 'var(--app-success)', text: 'Explains each change' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 text-[13px] text-[var(--app-text-muted)]">
                      <Icon style={{ color: item.color }} className="w-4 h-4" />
                      {item.text}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                </div>
                <span className="text-[10px] font-mono text-[var(--app-text-dim)] ml-2">python</span>
              </div>
              <div className="p-4 font-mono text-[12px] leading-relaxed">
                <div className="mb-3">
                  <div className="text-[10px] mb-1.5 flex items-center gap-1 text-[var(--app-danger)]">
                    <X className="w-3 h-3" /> Before
                  </div>
                  <div className="text-[var(--app-text-muted)]">
                    <span className="text-[#FF7777]">def get_user(id):</span><br />
                    <span className="text-[#FF7777]">&nbsp;&nbsp;user = db.find(id)</span><br />
                    <span className="text-[#FF7777]">&nbsp;&nbsp;return user.name</span>
                  </div>
                </div>
                <div className="border-t border-[var(--app-border)] pt-3">
                  <div className="text-[10px] mb-1.5 flex items-center gap-1 text-[var(--app-success)]">
                    <Check className="w-4 h-4" /> After
                  </div>
                  <div>
                    <span className="text-[var(--app-info)]">def </span><span className="text-[var(--app-text)]">get_user</span><span className="text-[var(--app-text-dim)]">(user_id: int) -&gt; str:</span><br />
                    <span className="text-[var(--app-text-dim)]">&nbsp;&nbsp;&quot;&quot;&quot;Fetch username by ID.&quot;&quot;&quot;</span><br />
                    <span className="text-[var(--app-info)]">if not </span><span className="text-[var(--app-text)]">isinstance</span><span className="text-[var(--app-text-dim)]">(user_id, int):</span><br />
                    <span className="text-[var(--app-info)]">&nbsp;&nbsp;&nbsp;&nbsp;raise </span><span className="text-[var(--app-danger)]">TypeError</span><span className="text-[var(--app-text-dim)]">(</span><span className="text-[var(--app-success)]">&quot;id must be int&quot;</span><span className="text-[var(--app-text-dim)]">)</span><br />
                    <span className="text-[var(--app-text)]">&nbsp;&nbsp;user</span><span className="text-[var(--app-text-dim)]"> = </span><span className="text-[var(--app-text)]">db.find_one</span><span className="text-[var(--app-text-dim)]">(user_id)</span><br />
                    <span className="text-[var(--app-info)]">if not </span><span className="text-[var(--app-text)]">user</span><span className="text-[var(--app-text-dim)]">:</span><br />
                    <span className="text-[var(--app-info)]">&nbsp;&nbsp;&nbsp;&nbsp;raise </span><span className="text-[var(--app-danger)]">ValueError</span><span className="text-[var(--app-text-dim)]">(</span><span className="text-[var(--app-success)]">&quot;User not found&quot;</span><span className="text-[var(--app-text-dim)]">)</span><br />
                    <span className="text-[var(--app-info)]">return </span><span className="text-[var(--app-text)]">user</span><span className="text-[var(--app-text-dim)]">.name</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-[var(--app-border)] py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4 fade-up">
              Testimonials
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight text-[var(--app-text)] fade-up">
              Loved by developers
            </h2>
          </div>

          <div className="fade-up grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              {
                name: 'Sarah Kim',
                role: 'Backend Engineer · Stripe',
                quote: 'Fixed a null pointer in my Java Spring app in 3 seconds. Would have taken me 30 minutes easy. This is insane.',
                color: 'var(--app-info)',
                initial: 'S'
              },
              {
                name: 'Mike Rodriguez',
                role: 'Full-Stack Dev · Freelance',
                quote: 'The web builder is magic. I described a dashboard UI and it built the whole thing with working charts in under a minute.',
                color: 'var(--app-purple)',
                initial: 'M'
              },
              {
                name: 'Alex Torres',
                role: 'Senior Engineer · Goldman Sachs',
                quote: 'Zero-Knowledge Mode is the killer feature. I debug proprietary code at work without any compliance concerns.',
                color: 'var(--app-accent)',
                initial: 'A'
              },
            ].map((testimonial, i) => (
              <div key={i} className="rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-6">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3 w-3 text-[var(--app-warning)] fill-[var(--app-warning)]" />
                  ))}
                </div>
                <p className="text-[13px] text-[var(--app-text-muted)] leading-relaxed mb-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[11px] font-semibold"
                    style={{ background: `color-mix(in srgb, ${testimonial.color} 15%, transparent)`, color: testimonial.color }}
                  >
                    {testimonial.initial}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[var(--app-text)]">{testimonial.name}</div>
                    <div className="text-[11px] text-[var(--app-text-muted)]">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="border-t border-[var(--app-border)] py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4 fade-up">
              Pricing
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight mb-3 text-[var(--app-text)] fade-up">
              Simple, transparent pricing
            </h2>
            <p className="text-[15px] text-[var(--app-text-muted)] fade-up">
              Start free, upgrade when you need more power. No hidden fees.
            </p>
          </div>

          <div className="fade-up grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
            {/* Free */}
            <div className="rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-5 hover:border-[var(--app-border-strong)] transition-colors">
              <div className="text-[11px] tracking-[0.12em] uppercase text-[var(--app-text-dim)] mb-1">FREE</div>
              <div className="text-[28px] font-semibold tracking-tight text-[var(--app-text)] mb-1">
                $0<span className="text-[13px] font-normal text-[var(--app-text-muted)]">/mo</span>
              </div>
              <p className="text-[13px] text-[var(--app-text-muted)] mb-4">For individuals learning</p>
              <div className="flex flex-col gap-2.5 mb-5">
                {['30 credits/month', 'Basic debugging', '7-day history'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-[var(--app-text-muted)]">
                    <Check className="h-4 w-4 text-[var(--app-success)]" /> {f}
                  </div>
                ))}
                <div className="flex items-center gap-2 text-[13px] text-[var(--app-text-muted)]">
                  <X className="h-4 w-4" /> Web Builder
                </div>
              </div>
              <Link href="/signup" className="block">
                <button className="w-full rounded-[6px] px-4 py-2.5 text-[13px] font-medium border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] transition-colors">
                  Get Started
                </button>
              </Link>
            </div>

            {/* Pro */}
            <div
              className="relative rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-5 flex flex-col"
              style={{
                border: '1px solid var(--app-accent)',
                zIndex: 10,
              }}
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                <span className="font-medium text-[11px] bg-[var(--app-accent)] text-[#071006] px-4 py-1 rounded-[6px]">
                  Most Popular
                </span>
              </div>
              <div className="text-[11px] tracking-[0.12em] uppercase text-[var(--app-accent)] mb-1 mt-4">PRO</div>
              <div className="text-[28px] font-semibold tracking-tight text-[var(--app-accent)] mb-1">
                $9<span className="text-[13px] font-normal text-[var(--app-text-muted)]">/mo</span>
              </div>
              <p className="text-[13px] text-[var(--app-text-muted)] mb-4">For serious developers</p>
              <div className="flex flex-col gap-2.5 mb-5">
                {['300 credits/month', 'Priority AI responses', '90-day history', 'Web Builder + Templates', 'Zero-Knowledge Mode', 'Referral program'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-[var(--app-text-muted)]">
                    <Check className="h-4 w-4 text-[var(--app-success)]" /> {f}
                  </div>
                ))}
              </div>
              <Link href="/signup?plan=pro" className="block mt-auto">
                <button className="w-full inline-flex items-center justify-center gap-2 rounded-[6px] px-4 py-2.5 text-[13px] font-medium bg-[var(--app-accent)] text-[#071006] hover:opacity-90 transition-opacity">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>

            {/* Team */}
            <div className="rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-5 hover:border-[var(--app-border-strong)] transition-colors">
              <div className="text-[11px] tracking-[0.12em] uppercase text-[var(--app-text-dim)] mb-1">TEAM</div>
              <div className="text-[28px] font-semibold tracking-tight text-[var(--app-text)] mb-1">
                $99<span className="text-[13px] font-normal text-[var(--app-text-muted)]">/mo</span>
              </div>
              <p className="text-[13px] text-[var(--app-text-muted)] mb-4">For small teams</p>
              <div className="flex flex-col gap-2.5 mb-5">
                {['2,500 credits/month', '3 seats included', 'Shared team dashboard', 'Web Builder + Export', 'Priority queue'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-[var(--app-text-muted)]">
                    <Check className="h-4 w-4 text-[var(--app-success)]" /> {f}
                  </div>
                ))}
              </div>
              <Link href="/contact?plan=team" className="block mt-auto">
                <button className="w-full rounded-[6px] px-4 py-2.5 text-[13px] font-medium border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] transition-colors">
                  Contact Sales
                </button>
              </Link>
            </div>

            {/* Business */}
            <div className="rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-5 hover:border-[var(--app-border-strong)] transition-colors">
              <div className="text-[11px] tracking-[0.12em] uppercase text-[var(--app-text-dim)] mb-1">BUSINESS</div>
              <div className="text-[28px] font-semibold tracking-tight text-[var(--app-text)] mb-1">
                $299<span className="text-[13px] font-normal text-[var(--app-text-muted)]">/mo</span>
              </div>
              <p className="text-[13px] text-[var(--app-text-muted)] mb-4">For growing organizations</p>
              <div className="flex flex-col gap-2.5 mb-5">
                {['10,000 credits/month', '10 seats included', 'Team analytics', 'Priority AI routing', 'Integrations (Git + Deploy)'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-[var(--app-text-muted)]">
                    <Check className="h-4 w-4 text-[var(--app-success)]" /> {f}
                  </div>
                ))}
              </div>
              <Link href="/contact?plan=business" className="block mt-auto">
                <button className="w-full rounded-[6px] px-4 py-2.5 text-[13px] font-medium border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] transition-colors">
                  Contact Sales
                </button>
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-5 hover:border-[var(--app-border-strong)] transition-colors">
              <div className="text-[11px] tracking-[0.12em] uppercase text-[var(--app-text-dim)] mb-1">ENTERPRISE</div>
              <div className="text-[28px] font-semibold tracking-tight text-[var(--app-text)] mb-1">
                $999+<span className="text-[13px] font-normal text-[var(--app-text-muted)]">/mo</span>
              </div>
              <p className="text-[13px] text-[var(--app-text-muted)] mb-4">For large orgs and security needs</p>
              <div className="flex flex-col gap-2.5 mb-5">
                {['Starts at 40,000 credits/month', 'Dedicated workspace', 'Admin controls + audit logs', 'SLA support', 'Private deployment option'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-[var(--app-text-muted)]">
                    <Check className="h-4 w-4 text-[var(--app-success)]" /> {f}
                  </div>
                ))}
              </div>
              <Link href="/contact?plan=enterprise" className="block mt-auto">
                <button className="w-full rounded-[6px] px-4 py-2.5 text-[13px] font-medium border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] transition-colors">
                  Contact Sales
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-[var(--app-border)] py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4 fade-up">
              FAQ
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight text-[var(--app-text)] fade-up">
              Frequently asked questions
            </h2>
          </div>

          <HomeFaq />
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="border-t border-[var(--app-border)] py-12">
        <div className="container mx-auto px-4">
          <div className="fade-up max-w-lg mx-auto">
            <div className="rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] p-5">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
                Keyboard Shortcuts
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: '⌘K', action: 'New session' },
                  { key: '⌘⏎', action: 'Analyze' },
                  { key: '⌘⇧C', action: 'Copy result' },
                  { key: 'Esc', action: 'Cancel' },
                ].map((shortcut, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-[var(--app-text-muted)]">
                    <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-mono bg-[var(--app-surface)] text-[var(--app-text-muted)] border border-[var(--app-border)]">
                      {shortcut.key}
                    </span>
                    {shortcut.action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="fade-up max-w-2xl mx-auto">
            <div
              className="rounded-[6px] bg-[var(--app-panel)] p-10 text-center relative overflow-hidden"
              style={{ border: '1px solid var(--app-accent)' }}
            >
              <div className="relative z-10">
                <span className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4">
                  Ready?
                </span>
                <h2 className="text-[24px] font-semibold tracking-tight mb-2 text-[var(--app-text)]">
                  Start building faster today
                </h2>
                <p className="text-[13px] text-[var(--app-text-muted)] mb-6 max-w-md mx-auto">
                  Join 10,000+ developers using DeBuggAI to ship better code, faster.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/signup">
                    <button className="inline-flex items-center gap-2 rounded-[6px] px-6 py-3 text-[13px] font-medium bg-[var(--app-accent)] text-[#071006] hover:opacity-90 transition-opacity">
                      Start Free Trial
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="inline-flex items-center rounded-[6px] px-6 py-3 text-[13px] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">
                      View Pricing
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
