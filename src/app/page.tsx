'use client';

import { useRef } from 'react';
import Link from 'next/link';
import {
  Terminal, Braces, Zap, ArrowRight, Star, Command,
  Layers, Check, Send, BugPlay, Cloud, Blocks,
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { Navigation } from '@/components/navigation';


/* ──────────────────────────────────────────────
   stagger helpers
   ────────────────────────────────────────────── */

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const itemFade = {
  hidden: { opacity: 0, y: 16 } as const,
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80, damping: 18 } } as const,
};

function InViewStagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      variants={container}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FadeItem({ children }: { children: React.ReactNode }) {
  return <motion.div variants={itemFade}>{children}</motion.div>;
}

/* ──────────────────────────────────────────────
   Hero
   ────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="min-h-[100dvh] flex items-center px-6 pt-24 pb-16">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 70, damping: 16 }}
        >
          <div
            suppressHydrationWarning
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-6"
          >
            <Zap size={10} className="text-[var(--app-accent)]" />
            Public beta
          </div>
          <h1 className="text-[40px] md:text-[56px] font-semibold tracking-[-1.5px] leading-[1.08] max-w-[580px]">
            A sharper workspace
            <br />
            <span className="text-[var(--app-text-dim)]">for debugging and </span>
            <span className="text-[var(--app-accent)]">building.</span>
          </h1>
          <p className="mt-5 text-[15px] text-[var(--app-text-muted)] leading-relaxed max-w-[460px]">
            Bring an error, a stack trace, or a feature prompt. DeBuggAI keeps the conversation,
            files, preview, and project history in one focused workspace.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 h-11 px-6 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-sm font-semibold hover:opacity-90 transition-all active:scale-[0.97]"
            >
              Start a project <ArrowRight size={15} />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-1.5 h-11 px-6 rounded-[6px] border border-[var(--app-border-strong)] text-sm font-medium hover:bg-[var(--app-panel-2)] transition-all active:scale-[0.97]"
            >
              <Star size={14} /> View pricing
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Integrations</span>
              <div className="flex gap-3 mt-2 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                <Braces size={18} />
                <Terminal size={18} />
                <Layers size={18} />
              </div>
            </div>
            <div className="w-px h-10 bg-[var(--app-border)]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Shortcut</span>
              <div className="mt-2 flex items-center gap-2">
                <kbd className="inline-flex items-center gap-0.5 h-6 px-2 rounded-[4px] border border-[var(--app-border)] bg-[var(--app-panel-2)] text-[10px] font-mono text-[var(--app-text-dim)]">
                  <Command size={9} /> K
                </kbd>
                <span className="text-[11px] text-[var(--app-text-muted)]">to search</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right terminal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, type: 'spring', stiffness: 60, damping: 14 }}
          className="relative"
        >
          <div className="rounded-[10px] overflow-hidden border border-[var(--app-border-strong)] bg-[var(--app-panel-2)] shadow-2xl">
            <div className="flex items-center gap-1.5 h-9 px-4 bg-[var(--app-panel)] border-b border-[var(--app-border)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              <span className="ml-3 text-[10px] font-mono text-[var(--app-text-dim)]">workspace/debug-session</span>
            </div>
            <div className="p-5 font-mono text-[12px] leading-relaxed">
              <div className="flex gap-3">
                <span className="text-[var(--app-accent)]">$</span>
                <span className="text-[var(--app-text)]">analyze ./src/auth.ts</span>
              </div>
              <div className="mt-4 space-y-1.5 text-[var(--app-text-dim)]">
                <div className="flex gap-3"><span>[1/3]</span><span>Reading the stack trace</span></div>
                <div className="flex gap-3"><span>[2/3]</span><span>Checking the related auth branch</span></div>
              </div>
              <div className="mt-4 p-3 rounded-[6px] border-l-2 border-[var(--app-danger)] bg-[rgba(255,82,82,0.04)]">
                <span className="font-bold text-[var(--app-danger)]">Likely cause:</span>
                <span className="ml-2 text-[var(--app-text-muted)]">Profile fetch runs after the session has expired.</span>
              </div>
              <div className="mt-4 flex gap-3">
                <span className="text-[var(--app-accent)]">$</span>
                <span className="text-[var(--app-text)]">suggest patch</span>
              </div>
              <div className="mt-3 text-[var(--app-accent)]">
                Add a session guard before fetching profile data.
                <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--app-accent)] animate-pulse align-middle" />
              </div>
            </div>
          </div>

          {/* Floating snippet */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 70, damping: 14 }}
            className="absolute -bottom-5 -right-5 hidden sm:block w-56"
          >
            <div className="rounded-[8px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-panel)] shadow-lg">
              <div className="flex items-center gap-2 h-6 px-3 bg-[var(--app-panel-2)] border-b border-[var(--app-border)]">
                <span className="text-[9px] font-mono text-[var(--app-text-dim)]">auth_patch.js</span>
              </div>
              <div className="p-3 font-mono text-[9px] leading-loose">
                <span className="text-[var(--app-text-dim)]">const</span> controller = <span className="text-[var(--app-text-dim)]">new</span> AbortController();<br />
                <span className="text-[var(--app-text-muted)] italic">{'// Cancel stale profile request'}</span><br />
                <span className="text-[var(--app-text-dim)]">return</span> () =&gt; controller.abort();
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Capabilities
   ────────────────────────────────────────────── */

const capabilities = [
  {
    icon: BugPlay,
    title: 'Debug with context',
    desc: 'Paste the error and relevant code. Get a plain-language cause, a proposed patch, and follow-up checks to run.',
    badge: 'debug',
    badgeColor: 'var(--app-accent)',
    code: (
      <pre className="mt-4 rounded-[6px] bg-[var(--app-bg)] border border-[var(--app-border)] p-3 font-mono text-[10px] leading-[1.7] text-[var(--app-text-muted)] overflow-x-auto">
        <span className="text-[var(--app-danger)]">- user = db.query(f&quot;SELECT * FROM<br />  users WHERE id = {'{'}id{'}'}&quot;)</span><br />
        <span className="text-[var(--app-accent)]">+ import re; sanitized =<br />  re.sub(r&apos;[^\w]&apos;,&apos;&apos;,str(id))<br />+ db.query(&quot;SELECT * FROM users<br />  WHERE id = ?&quot;, [sanitized])</span>
      </pre>
    ),
  },
  {
    icon: Blocks,
    title: 'Build from a prompt',
    desc: 'Generate project files, inspect them in the editor, and preview once the workspace has a runnable app.',
    badge: 'build',
    badgeColor: 'var(--app-info)',
    code: (
      <pre className="mt-4 rounded-[6px] bg-[var(--app-bg)] border border-[var(--app-border)] p-3 font-mono text-[10px] leading-[1.7] text-[var(--app-text-muted)] overflow-x-auto">
        <span className="text-[var(--app-info)]">&gt; Build a todo app with dark<br />  mode toggle and localStorage<br />  persistence</span><br /><br />
        <span className="text-[var(--app-text-dim)]">&rarr; Generated app files<br />  Ready for review</span>
      </pre>
    ),
  },
  {
    icon: Cloud,
    title: 'Keep project history',
    desc: 'Threads, generated files, versions, preview attempts, and export actions stay attached to the project.',
    badge: 'deploy',
    badgeColor: 'var(--app-purple)',
    code: (
      <pre className="mt-4 rounded-[6px] bg-[var(--app-bg)] border border-[var(--app-border)] p-3 font-mono text-[10px] leading-[1.7] overflow-x-auto">
        <span className="text-[var(--app-text-dim)]">{'$'} project status<br />  Files generated<br />  Preview queued</span><br />
        <span className="text-[var(--app-accent)]">  Export available on paid plans</span>
      </pre>
    ),
  },
];

function Capabilities() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="features" className="bg-[var(--app-panel)]">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
            Capabilities
          </div>
          <h2 className="text-[28px] font-semibold tracking-[-0.5px] mb-2">One loop from prompt to proof</h2>
          <p className="text-sm text-[var(--app-text-muted)] max-w-[480px] mb-10">
            Chat, files, code review, and preview status stay in one workspace instead of scattering across tabs.
          </p>
        </motion.div>

        <InViewStagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px rounded-[8px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-border)]">
          {capabilities.map((c) => (
            <FadeItem key={c.title}>
              <div className="bg-[var(--app-panel-2)] p-7 flex flex-col h-full">
                <div className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[4px] border border-[var(--app-border)] text-[9px] font-semibold uppercase tracking-[0.12em] self-start" style={{ color: c.badgeColor, borderColor: `${c.badgeColor}30` }}>
                  {c.badge}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center">
                    <c.icon size={15} className="text-[var(--app-accent)]" />
                  </div>
                  <h3 className="text-[16px] font-semibold tracking-[-0.2px]">{c.title}</h3>
                </div>
                <p className="mt-2 text-[13px] text-[var(--app-text-muted)] leading-relaxed flex-1">{c.desc}</p>
                {c.code}
              </div>
            </FadeItem>
          ))}
        </InViewStagger>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Debug demo
   ────────────────────────────────────────────── */

function DebugDemo() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
          Workspace Example
        </div>
        <h2 className="text-[28px] font-semibold tracking-[-0.5px] mb-2">See the debugging loop</h2>
        <p className="text-sm text-[var(--app-text-muted)] max-w-[480px] mb-10">
          Paste code and an error message. DeBuggAI explains the likely cause and gives you a patch to inspect.
        </p>
      </motion.div>

      <InViewStagger>
        <FadeItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px rounded-[8px] overflow-hidden border border-[var(--app-border-strong)] bg-[var(--app-border-strong)]">
            {/* Input panel */}
            <div className="bg-[var(--app-panel)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">Input</div>
              <textarea
                readOnly
                className="w-full h-[140px] resize-y rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border-strong)] text-[var(--app-text)] font-mono text-[11px] p-3 leading-relaxed outline-none"
                defaultValue={`def get_user(id):
    user = db.query(f"SELECT * FROM users WHERE id = {id}")
    return user.name

# Usage
name = get_user(42)
print(f"Hello, {name}")`}
              />
              <textarea
                readOnly
                className="w-full h-20 mt-2.5 resize-y rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border-strong)] text-[var(--app-text)] font-mono text-[11px] p-3 leading-relaxed outline-none"
                defaultValue={`Traceback (most recent call last):
  File "app.py", line 7, in <module>
    print(f"Hello, {name}")
NameError: name 'name' is not defined`}
              />
              <div className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-xs font-semibold active:scale-[0.97] transition-all cursor-pointer">
                <Send className="h-3.5 w-3.5" />
                Analyze
              </div>
            </div>

            {/* Result panel */}
            <div className="bg-[var(--app-panel)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">Result</div>
              <pre className="font-mono text-[11px] leading-[1.8] text-[var(--app-text-muted)] whitespace-pre-wrap">
                <span className="text-[var(--app-text-dim)]">## Summary</span>{'\n'}
                <span className="text-[var(--app-danger)]">NameError</span>: <span className="text-[var(--app-text-dim)]">variable</span> name <span className="text-[var(--app-text-dim)]">referenced before assignment</span>{'\n\n'}
                <span className="text-[var(--app-text-dim)]">## Root Cause</span>{'\n'}
                get_user() <span className="text-[var(--app-text-dim)]">may return</span> None <span className="text-[var(--app-text-dim)]">when the query finds no row.</span>{'\n'}
                <span className="text-[var(--app-text-dim)]">The</span> NameError <span className="text-[var(--app-text-dim)]">at line 7 is a cascade: the try/except swallowed the</span>{'\n'}
                <span className="text-[var(--app-text-dim)]">original error, so</span> name <span className="text-[var(--app-text-dim)]">was never assigned.</span>{'\n\n'}
                <span className="text-[var(--app-text-dim)]">## Fix</span>{'\n'}
                <span className="text-[var(--app-accent)]">+ def get_user(user_id: int) -&gt; dict | None:</span>{'\n'}
                <span className="text-[var(--app-accent)]">+     result = db.query(&quot;SELECT * FROM users WHERE id = ?&quot;, [user_id])</span>{'\n'}
                <span className="text-[var(--app-accent)]">+     return result[0] if result else None</span>{'\n'}
              </pre>
            </div>
          </div>
        </FadeItem>
      </InViewStagger>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Pricing data
   ────────────────────────────────────────────── */

const planData = [
  {
    key: 'FREE',
    name: 'Free',
    price: '$0',
    desc: 'Evaluate the workflow',
    features: [
      { text: '30 credits/month', included: true },
      { text: 'Basic debugging', included: true },
      { text: '7-day history', included: true },
      { text: 'Web Builder', included: false },
    ],
    cta: 'Get started',
    href: '/signup',
    popular: false,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: '$9',
    desc: 'For regular solo use',
    features: [
      { text: '300 credits/month', included: true },
      { text: 'Priority AI responses', included: true },
      { text: '90-day history', included: true },
      { text: 'Web Builder + Templates', included: true },
      { text: 'Extended project history', included: true },
      { text: 'Referral program', included: true },
    ],
    cta: 'Start free trial',
    href: '/signup?plan=pro',
    popular: true,
  },
  {
    key: 'TEAM',
    name: 'Team',
    price: '$99',
    desc: 'For shared project work',
    features: [
      { text: '2,500 credits/month', included: true },
      { text: '3 seats included', included: true },
      { text: 'Shared team dashboard', included: true },
      { text: 'Web Builder + Export', included: true },
      { text: 'Priority queue', included: true },
    ],
    cta: 'Contact sales',
    href: '/contact?plan=team',
    popular: false,
  },
  {
    key: 'BUSINESS',
    name: 'Business',
    price: '$299',
    desc: 'For teams that need controls',
    features: [
      { text: '10,000 credits/month', included: true },
      { text: '10 seats included', included: true },
      { text: 'Team activity reporting', included: true },
      { text: 'Priority AI routing', included: true },
      { text: 'Integrations (Git + Deploy)', included: true },
    ],
    cta: 'Contact sales',
    href: '/contact?plan=business',
    popular: false,
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    price: '$999',
    desc: 'For custom security needs',
    features: [
      { text: '40,000+ credits/month', included: true },
      { text: 'Dedicated workspace', included: true },
      { text: 'Admin controls + audit', included: true },
      { text: 'Priority support terms', included: true },
      { text: 'Private deployment option', included: true },
    ],
    cta: 'Contact sales',
    href: '/contact?plan=enterprise',
    popular: false,
  },
];

function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="pricing" className="bg-[var(--app-panel)]">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
            Pricing
          </div>
          <h2 className="text-[28px] font-semibold tracking-[-0.5px] mb-2">Start free, upgrade when you need more</h2>
          <p className="text-sm text-[var(--app-text-muted)] mb-10">No credit card required. Cancel anytime.</p>
        </motion.div>

        <InViewStagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-px rounded-[8px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-border)]">
          {planData.map((plan) => (
            <FadeItem key={plan.key}>
              <div
                className={`bg-[var(--app-panel-2)] p-6 flex flex-col relative ${plan.popular ? 'xl:-mt-3 xl:mb-[-12px] xl:pt-9 xl:pb-8 xl:rounded-[4px] xl:border xl:border-[var(--app-accent)] xl:shadow-[0_0_0_1px_var(--app-accent)]' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span className="text-[10px] font-semibold bg-[var(--app-accent)] text-[#071006] px-3 py-1 rounded-[4px] whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-0.5">
                  <span className="text-[32px] font-semibold tracking-[-0.8px] text-[var(--app-accent)]">{plan.price}</span>
                  <span className="text-[11px] text-[var(--app-text-muted)]">/month</span>
                </div>
                <p className="text-[11px] text-[var(--app-text-muted)] mt-1">{plan.desc}</p>

                <ul className="mt-5 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-[12px]">
                      {f.included ? (
                        <Check size={13} className="text-[var(--app-accent)] mt-0.5 shrink-0" />
                      ) : (
                        <span className="w-3.5 block shrink-0" />
                      )}
                      <span className={f.included ? 'text-[var(--app-text)]' : 'text-[var(--app-text-dim)]'}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`inline-flex items-center justify-center h-10 px-4 mt-6 rounded-[6px] text-xs font-semibold transition-all active:scale-[0.97] ${
                    plan.popular
                      ? 'bg-[var(--app-accent)] text-[#071006] hover:opacity-90'
                      : 'border border-[var(--app-border-strong)] text-[var(--app-text-muted)] hover:bg-[var(--app-panel)]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </FadeItem>
          ))}
        </InViewStagger>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 text-center"
        >
          <Link
            href="/pricing"
            className="text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
          >
            See full comparison &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   CTA
   ────────────────────────────────────────────── */

function Cta() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 70, damping: 14 }}
      >
        <h2 className="text-[32px] font-semibold tracking-[-0.8px] mb-3">Start with a real project</h2>
        <p className="text-sm text-[var(--app-text-muted)] mb-8 max-w-md mx-auto">
          Create a workspace, paste a bug or project prompt, and inspect the generated result.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <input
            type="email"
            placeholder="you@company.com"
            className="h-11 w-full max-w-xs rounded-[6px] border border-[var(--app-border-strong)] bg-[var(--app-panel-2)] px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)] transition-colors"
          />
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 h-11 px-6 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-sm font-semibold hover:opacity-90 transition-all active:scale-[0.97] shrink-0"
          >
            Create free account <ArrowRight size={15} />
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-[var(--app-text-muted)]">
          Built for developers who want the file, the answer, and the preview in one place.
        </p>
      </motion.div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Languages bar
   ────────────────────────────────────────────── */

const languages = [
  { name: 'JavaScript', color: '#F7DF1E' },
  { name: 'Python', color: '#3776AB' },
  { name: 'TypeScript', color: '#3178C6' },
  { name: 'Go', color: '#00ADD8' },
  { name: 'Ruby', color: '#CC342D' },
  { name: 'Rust', color: '#CE422B' },
  { name: 'Java', color: '#ED8B00' },
  { name: 'HTML/CSS', color: '#E34F26' },
];

function LanguagesBar() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-10 text-center">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <h3 className="text-[13px] font-medium text-[var(--app-text-muted)] mb-5">Supported languages</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {languages.map((lang) => (
            <span
              key={lang.name}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[6px] border border-[var(--app-border-strong)] bg-[var(--app-panel-2)] text-[11px] font-medium text-[var(--app-text-muted)]"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: lang.color }} />
              {lang.name}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-[rgba(0,200,83,0.25)]">
      
      <Navigation />
      <main className="flex-1">
        <Hero />
        <Capabilities />
        <DebugDemo />
        <LanguagesBar />
        <Pricing />
        <Cta />
      </main>
    </div>
  );
}
