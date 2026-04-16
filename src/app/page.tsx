/**
 * Landing Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Check,
  Play,
  ChevronDown,
  Star,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [terminalReplay, setTerminalReplay] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

    // Active nav link on scroll
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      sections.forEach((section) => {
        const el = section as HTMLElement;
        if (window.scrollY >= el.offsetTop - 120) {
          current = section.getAttribute('id') || '';
        }
      });
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-5 w-auto" />
            <span className="font-semibold text-base">DeBuggAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="btn-sm primary">
                Get Started
              </Button>
            </Link>
          </nav>
          {/* Mobile menu button */}
          <div className="flex items-center gap-2">
            <button
              className="nav-link p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-surface">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
              <Link href="/features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                ✨ Features
              </Link>
              <Link href="/demo" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                🎬 Live Demo
              </Link>
              <Link href="/languages" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                💻 Languages
              </Link>
              <Link href="/pricing" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                💳 Pricing
              </Link>
              <Link href="/faq" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                ❓ FAQ
              </Link>
              <div className="border-t border-border my-2"></div>
              <Link href="/login" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                🔑 Sign In
              </Link>
              <Link href="/signup" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                🚀 Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-20 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(0,200,83,0.06)_0%,transparent_70%)] -z-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="fade-up badge badge-pill bg-green mb-5" style={{ display: 'inline-flex', fontSize: '10px', padding: '3px 12px' }}>
            <span className="badge-dot" style={{ background: 'var(--ds-green)', animation: 'dot-pulse 2s infinite' }}></span>
            AI-Powered Development Platform
          </div>

          {/* Hero heading */}
          <h1 className="fade-up fade-up-delay-1 mb-4" style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1.1 }}>
            Debug Code & Build<br />
            <span style={{ color: 'var(--ds-green)' }}>Apps with AI</span>
          </h1>

          {/* Hero description */}
          <p className="fade-up fade-up-delay-2 text-lg text-text2 mb-8 max-w-2xl mx-auto leading-relaxed">
            Instant debugging for 10+ languages and a visual web builder powered by AI. Ship faster with DeBuggAI.
          </p>

          {/* CTA Buttons */}
          <div className="fade-up fade-up-delay-3 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="btn-primary btn-lg w-full">
                Start Debugging Now
                <ArrowRight style={{ fontSize: '16px' }} />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="btn-lg w-auto">
              Watch Demo
              <Play style={{ fontSize: '14px' }} />
            </Button>
          </div>

          {/* Trust badges */}
          <div className="fade-up fade-up-delay-3 flex items-center justify-center gap-4 flex-wrap mt-5">
            <span className="text-xs text-text3 flex items-center gap-1">
              <span style={{ color: 'var(--ds-green)' }}>✓</span> Free forever plan
            </span>
            <span className="w-1 h-1 rounded-full bg-text3"></span>
            <span className="text-xs text-text3 flex items-center gap-1">
              <span style={{ color: 'var(--ds-green)' }}>✓</span> No credit card required
            </span>
            <span className="w-1 h-1 rounded-full bg-text3"></span>
            <span className="text-xs text-text3 flex items-center gap-1">
              <span style={{ color: 'var(--ds-green)' }}>✓</span> Setup in 2 minutes
            </span>
          </div>
        </div>
      </section>

      {/* Live Activity Feed */}
      <section className="container mx-auto px-4 pb-16">
        <div className="fade-up max-w-2xl mx-auto">
          <Card className="card-sm" style={{ padding: '12px 16px' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="badge-dot" style={{ background: 'var(--ds-green)', animation: 'dot-pulse 2s infinite' }}></span>
              <span className="text-[10px] font-mono text-text3 uppercase tracking-widest">Live Activity</span>
            </div>
            <div className="feed-item">
              <div className="feed-dot" style={{ background: 'var(--ds-green)' }}></div>
              <div className="feed-text">
                <strong>Sarah K.</strong> fixed a <span style={{ color: '#FF7777' }}>NullPointerException</span> in Java
              </div>
              <span className="feed-time">12s ago</span>
            </div>
            <div className="feed-item">
              <div className="feed-dot" style={{ background: 'var(--ds-blue)' }}></div>
              <div className="feed-text">
                <strong>Mike R.</strong> debugged a <span style={{ color: '#40C4FF' }}>TypeError</span> in TypeScript
              </div>
              <span className="feed-time">34s ago</span>
            </div>
            <div className="feed-item" style={{ borderBottom: 'none' }}>
              <div className="feed-dot" style={{ background: 'var(--ds-amber)' }}></div>
              <div className="feed-text">
                <strong>Alex T.</strong> built a landing page with the <span style={{ color: '#FFC107' }}>Web Builder</span>
              </div>
              <span className="feed-time">1m ago</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="badge badge-pill bg-green mb-4 fade-up" style={{ display: 'inline-flex' }}>
              Features
            </div>
            <h2 className="h1 mb-3 fade-up">Everything you need to build faster</h2>
            <p className="text-lg text-text2 max-w-2xl mx-auto fade-up">
              Powerful AI tools to debug, analyze, and generate production-ready code
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {[
              { icon: '🐛', title: 'AI Debugging', desc: 'Paste your error and get instant fixes with explanations. Supports 10+ languages out of the box.', badge: 'Most Used', color: 'blue' },
              { icon: '⎘', title: 'Web Builder', desc: 'Describe what you want and watch AI create it live. Monaco editor + iframe preview.', badge: 'New', color: 'purple' },
              { icon: '⚡', title: 'Instant Answers', desc: 'Code reviews, best practices, and explanations in seconds. No more Stack Overflow.', badge: 'Fast', color: 'amber' },
              { icon: '⟳', title: 'Project Templates', desc: 'Generate MERN, Laravel, Django, Flask, Rails, and Go stacks in seconds.', badge: '6 Stacks', color: 'purple' },
              { icon: '◎', title: 'Zero-Knowledge Mode', desc: 'Your code is never stored. All analysis happens in-memory and is discarded immediately.', badge: 'Pro', color: 'red' },
              { icon: '≡', title: 'SSE Streaming', desc: 'Watch the AI think in real-time with server-sent events. No loading spinners.', badge: 'Live', color: 'green' },
            ].map((feature, i) => (
              <Card key={i} className="group card card-interactive fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <CardContent className="p-5">
                  <div className="mb-4">
                    <div
                      className="inline-flex p-2.5 rounded-ds card-icon"
                      style={{
                        background: feature.color === 'green' ? 'var(--ds-green-glow)' : `rgba(${colorToRgb(feature.color)}, 0.12)`,
                        color: `var(--ds-${feature.color})`
                      }}
                    >
                      <span className="text-lg">{feature.icon}</span>
                    </div>
                  </div>
                  <h3 className="h3 mb-2">{feature.title}</h3>
                  <p className="text-text2 text-sm leading-relaxed mb-3">{feature.desc}</p>
                  <span className="badge bg-blue" style={{ fontSize: '9px' }}>{feature.badge}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Terminal */}
      <section id="demo" className="border-t border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="badge badge-pill bg-green mb-4 fade-up" style={{ display: 'inline-flex' }}>
              Live Demo
            </div>
            <h2 className="h1 mb-3 fade-up">See it in action</h2>
            <p className="text-lg text-text2 max-w-2xl mx-auto fade-up">
              Watch how DeBuggAI identifies and fixes a real error — in real time
            </p>
          </div>

          <div className="fade-up max-w-3xl mx-auto">
            <div className="terminal" key={terminalReplay}>
              <div className="terminal-header">
                <div className="code-dots">
                  <div className="code-dot" style={{ background: '#FF5F57' }}></div>
                  <div className="code-dot" style={{ background: '#FEBC2E' }}></div>
                  <div className="code-dot" style={{ background: '#28C840' }}></div>
                </div>
                <span className="terminal-title">debuggai — session</span>
                <div className="ml-auto flex gap-1.5">
                  <span className="kbd">⌘K</span>
                  <span className="kbd">Esc</span>
                </div>
              </div>
              <div className="terminal-body">
                <div className="typing-line" style={{ animationDelay: '0.3s' }}>
                  <span className="term-prompt">$ </span>
                  <span className="term-cmd">debuggai analyze</span>
                </div>
                <div className="typing-line" style={{ animationDelay: '0.8s' }}>
                  <span className="term-output">→ Language detected: <span style={{ color: 'var(--ds-blue)' }}>Python</span></span>
                </div>
                <div className="typing-line" style={{ animationDelay: '1.2s' }}>
                  <span className="term-output">→ Error type: <span className="term-error">TypeError</span> — unsupported operand</span>
                </div>
                <div className="typing-line" style={{ animationDelay: '1.8s' }}>
                  <span className="term-output">→ Analyzing stack trace...</span>
                </div>
                <div className="typing-line" style={{ animationDelay: '2.5s' }}>
                  <span className="term-success">✓ Root cause found: str + int concatenation</span>
                </div>
                <div className="typing-line" style={{ animationDelay: '3.0s' }}>
                  <span className="term-output">→ Generating fix...</span>
                </div>
                <div className="typing-line" style={{ animationDelay: '3.6s' }}>
                  <span className="term-success" style={{
                    display: 'block',
                    padding: '8px 12px',
                    background: 'var(--ds-green-muted)',
                    border: '1px solid rgba(0,200,83,0.15)',
                    borderRadius: '6px',
                    marginTop: '4px'
                  }}>
                    <span className="err" style={{ textDecoration: 'line-through', opacity: 0.5 }}>total = &quot;Price: &quot; + 49.99</span><br />
                    <span className="s">total = f&quot;Price: {49.99}&quot;</span>
                  </span>
                </div>
                <div className="typing-line" style={{ animationDelay: '4.2s' }}>
                  <span className="term-success">✓ Fix applied · 1 credit used · 2.1s</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span className="term-prompt">$ </span>
                  <span className="term-cursor"></span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTerminalReplay(prev => prev + 1)}
                className="btn-sm ghost"
              >
                ↻ Replay
              </Button>
              <Link href="/signup">
                <Button size="sm" className="btn-sm primary">
                  Try It Yourself →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Languages */}
      <section id="languages" className="border-t border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="badge badge-pill bg-green mb-4 fade-up" style={{ display: 'inline-flex' }}>
              Languages
            </div>
            <h2 className="h1 mb-3 fade-up">10+ languages supported</h2>
            <p className="text-lg text-text2 fade-up">
              Automatic detection — just paste your code and go
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
              { name: '+ more', color: 'var(--ds-text3)' },
            ].map((lang, i) => (
              <div key={i} className="lang-tag">
                <div className="lang-dot" style={{ background: lang.color }}></div>
                {lang.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="badge badge-pill bg-green mb-4 fade-up" style={{ display: 'inline-flex' }}>
              How It Works
            </div>
            <h2 className="h1 mb-3 fade-up">Three steps to better code</h2>
          </div>

          <div className="fade-up max-w-3xl mx-auto grid md:grid-cols-3 gap-6">
            {[
              { step: 1, title: 'Paste Your Code', desc: 'Copy your error or code snippet into DeBuggAI' },
              { step: 2, title: 'AI Analyzes', desc: 'Identifies the root cause and generates a fix in real-time' },
              { step: 3, title: 'Copy & Deploy', desc: 'Get corrected code with explanations and ship it' },
            ].map((item, index) => (
              <div key={index} className="text-center relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-0 w-[calc(50%+12px)] h-px bg-border2"></div>
                )}
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3.5 text-lg font-semibold text-black font-mono" style={{
                  background: 'var(--ds-green)',
                  boxShadow: '0 0 0 4px rgba(0,200,83,0.12)'
                }}>
                  {item.step}
                </div>
                <h3 className="h3 mb-2">{item.title}</h3>
                <p className="text-text2 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border bg-card py-16">
        <div className="container mx-auto px-4">
          <div className="fade-up grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Card className="card card-interactive text-center" style={{ padding: '24px' }}>
              <div className="stat" style={{ color: 'var(--ds-green)' }}>10K+</div>
              <div className="card-stat-label">Happy Developers</div>
            </Card>
            <Card className="card card-interactive text-center" style={{ padding: '24px' }}>
              <div className="stat" style={{ color: 'var(--ds-green)' }}>10x</div>
              <div className="card-stat-label">Faster Debugging</div>
            </Card>
            <Card className="card card-interactive text-center" style={{ padding: '24px' }}>
              <div className="stat" style={{ color: 'var(--ds-green)' }}>2.1s</div>
              <div className="card-stat-label">Avg. Fix Time</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Before & After Code Preview */}
      <section className="border-t border-border py-20">
        <div className="container mx-auto px-4">
          <div className="fade-up grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
            <div>
              <div className="badge badge-pill bg-green mb-4" style={{ display: 'inline-flex' }}>
                Before & After
              </div>
              <h2 className="h1 mb-3" style={{ fontSize: '22px' }}>See the difference</h2>
              <p className="text-text2 text-sm leading-relaxed mb-5">
                DeBuggAI doesn't just point out errors — it rewrites the code with best practices and explains every change.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  { icon: '✕', color: 'var(--ds-red)', text: 'Removes dead code paths' },
                  { icon: '✓', color: 'var(--ds-green)', text: 'Adds proper error handling' },
                  { icon: '✓', color: 'var(--ds-green)', text: 'Follows language conventions' },
                  { icon: '✓', color: 'var(--ds-green)', text: 'Explains each change' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-text2 text-sm">
                    <span style={{ color: item.color, fontSize: '14px' }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="code-window">
              <div className="code-header">
                <div className="code-dots">
                  <div className="code-dot" style={{ background: '#FF5F57' }}></div>
                  <div className="code-dot" style={{ background: '#FEBC2E' }}></div>
                  <div className="code-dot" style={{ background: '#28C840' }}></div>
                </div>
                <span className="code-lang">python</span>
              </div>
              <div className="code-body">
                <div className="mb-3">
                  <div className="text-[10px] font-mono mb-1.5 flex items-center gap-1" style={{ color: 'var(--ds-red)' }}>
                    <span>✕</span> Before
                  </div>
                  <div>
                    <span className="err">def get_user(id):</span><br />
                    <span className="err">&nbsp;&nbsp;user = db.find(id)</span><br />
                    <span className="err">&nbsp;&nbsp;return user.name</span>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] font-mono mb-1.5 flex items-center gap-1" style={{ color: 'var(--ds-green)' }}>
                    <span>✓</span> After
                  </div>
                  <div>
                    <span className="k">def </span><span className="n">get_user</span><span className="p">(user_id: int) -&gt; str:</span><br />
                    <span className="c">&nbsp;&nbsp;&quot;&quot;Fetch username by ID.&quot;&quot;&quot;</span><br />
                    <span className="k">if not </span><span className="n">isinstance</span><span className="p">(user_id, int):</span><br />
                    <span className="k">&nbsp;&nbsp;&nbsp;&nbsp;raise </span><span className="err">TypeError</span><span className="p">(</span><span className="s">&quot;id must be int&quot;</span><span className="p">)</span><br />
                    <span className="n">&nbsp;&nbsp;user</span><span className="p"> = </span><span className="n">db.find_one</span><span className="p">(user_id)</span><br />
                    <span className="k">if not </span><span className="n">user</span><span className="p">:</span><br />
                    <span className="k">&nbsp;&nbsp;&nbsp;&nbsp;raise </span><span className="err">ValueError</span><span className="p">(</span><span className="s">&quot;User not found&quot;</span><span className="p">)</span><br />
                    <span className="k">return </span><span className="n">user</span><span className="p">.name</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="badge badge-pill bg-green mb-4 fade-up" style={{ display: 'inline-flex' }}>
              Testimonials
            </div>
            <h2 className="h1 mb-3 fade-up">Loved by developers</h2>
          </div>

          <div className="fade-up grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              {
                name: 'Sarah Kim',
                role: 'Backend Engineer · Stripe',
                quote: '"Fixed a null pointer in my Java Spring app in 3 seconds. Would have taken me 30 minutes easy. This is insane."',
                color: 'var(--ds-blue)',
                initial: 'S'
              },
              {
                name: 'Mike Rodriguez',
                role: 'Full-Stack Dev · Freelance',
                quote: '"The web builder is magic. I described a dashboard UI and it built the whole thing with working charts in under a minute."',
                color: 'var(--ds-purple)',
                initial: 'M'
              },
              {
                name: 'Alex Torres',
                role: 'Senior Engineer · Goldman Sachs',
                quote: '"Zero-Knowledge Mode is the killer feature. I debug proprietary code at work without any compliance concerns."',
                color: 'var(--ds-green)',
                initial: 'A'
              },
            ].map((testimonial, i) => (
              <Card key={i} className="testimonial-card">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="star" style={{ color: 'var(--ds-amber)', fontSize: '12px' }} />
                    ))}
                  </div>
                  <p className="testimonial-quote text-sm text-text2 leading-relaxed mb-4">
                    {testimonial.quote}
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ background: `${testimonial.color}15`, color: testimonial.color }}
                    >
                      {testimonial.initial}
                    </div>
                    <div>
                      <div className="testimonial-name text-sm font-medium">{testimonial.name}</div>
                      <div className="testimonial-role text-xs text-text3">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="badge badge-pill bg-green mb-4 fade-up" style={{ display: 'inline-flex' }}>
              Pricing
            </div>
            <h2 className="h1 mb-3 fade-up">Simple, transparent pricing</h2>
            <p className="text-lg text-text2 fade-up">
              Start free, upgrade when you need more power
            </p>
          </div>

          <div className="fade-up grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="card card-interactive">
              <CardContent className="p-6">
                <div className="text-xs text-text3 font-mono mb-1">FREE</div>
                <div className="stat mb-1">$0<span className="text-sm text-text3 font-normal">/mo</span></div>
                <p className="text-text2 text-sm mb-5">For individuals learning</p>
                <div className="flex flex-col gap-2.5 mb-6">
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> 30 credits/month
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> Basic debugging
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> 7-day history
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text3">
                    <span style={{ color: 'var(--ds-text3)' }}>✕</span> Web Builder
                  </div>
                </div>
                <Link href="/signup" className="block">
                  <Button variant="outline" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="card card-green card-interactive glow-border" style={{ padding: '24px' }}>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                <span className="badge bg-green" style={{ fontSize: '9px', padding: '3px 12px' }}>Most Popular</span>
              </div>
              <CardContent className="pt-10 pb-6 px-6">
                <div className="text-xs font-mono mb-1" style={{ color: 'var(--ds-green)' }}>PRO</div>
                <div className="stat mb-1" style={{ color: 'var(--ds-green)' }}>
                  $9<span className="text-sm text-text3 font-normal">/mo</span>
                </div>
                <p className="text-text2 text-sm mb-5">For serious developers</p>
                <div className="flex flex-col gap-2.5 mb-6">
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> 300 credits/month
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> Priority AI responses
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> 90-day history
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> Web Builder + Templates
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> Zero-Knowledge Mode
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> Referral program
                  </div>
                </div>
                <Link href="/signup" className="block">
                  <Button className="w-full group">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="card card-interactive">
              <CardContent className="p-6">
                <div className="text-xs text-text3 font-mono mb-1">ENTERPRISE</div>
                <div className="stat mb-1">$49<span className="text-sm text-text3 font-normal">/mo</span></div>
                <p className="text-text2 text-sm mb-5">For teams and organizations</p>
                <div className="flex flex-col gap-2.5 mb-6">
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> Unlimited credits
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> Dedicated AI instances
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> Unlimited history
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> SLA guarantee
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ds-green)' }} /> Priority support
                  </div>
                </div>
                <Link href="/signup" className="block">
                  <Button variant="ghost" className="w-full">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="badge badge-pill bg-green mb-4 fade-up" style={{ display: 'inline-flex' }}>
              FAQ
            </div>
            <h2 className="h1 mb-3 fade-up">Frequently asked questions</h2>
          </div>

          <div className="fade-up max-w-2xl mx-auto">
            {[
              {
                q: 'What is Zero-Knowledge Mode?',
                a: 'Your code and error logs are never stored on our servers. All analysis happens in-memory and is immediately discarded after the response. Available on Pro and Enterprise plans.',
                icon: '⬡'
              },
              {
                q: 'How do credits work?',
                a: 'Each debug analysis costs 1 credit. Web Builder generation costs 25 credits. Multi-target export costs 35 credits. Credits reset monthly with your subscription.',
                icon: '💳'
              },
              {
                q: 'Can I use DeBuggAI for proprietary code?',
                a: 'Yes! Enable Zero-Knowledge Mode on Pro or Enterprise plans. Your code is never persisted, logged, or used for training. We also offer on-premise deployment for Enterprise.',
                icon: '⎘'
              },
              {
                q: 'Can I upgrade or downgrade anytime?',
                a: 'Yes. Upgrades take effect immediately. Downgrades apply at the end of your current billing period. You keep your remaining credits until they expire.',
                icon: '⚡'
              },
              {
                q: 'What stacks does the Web Builder support?',
                a: 'MERN, Laravel (PHP), Django (Python), Flask (Python), Ruby on Rails, and Go. Each template generates a complete project structure with best practices baked in.',
                icon: '≡'
              },
            ].map((item, index) => (
              <div key={index} className="collapse-item mb-1.5">
                <button
                  className="collapse-trigger flex items-center gap-2.5 w-full text-sm font-medium text-text"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--ds-surface)',
                    borderRadius: 'var(--ds-r8)'
                  }}
                >
                  <span className="collapse-icon" style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    background: 'var(--ds-green-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: 'var(--ds-green)'
                  }}>
                    {item.icon}
                  </span>
                  {item.q}
                  <ChevronDown
                    className="collapse-arrow ml-auto transition-transform duration-200"
                    style={{
                      fontSize: '11px',
                      color: 'var(--ds-text3)',
                      transform: openFaq === index ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  />
                </button>
                <div
                  className="collapse-body border-t border-border overflow-hidden transition-all duration-200"
                  style={{
                    maxHeight: openFaq === index ? '200px' : '0px',
                    paddingTop: openFaq === index ? '14px' : '0px',
                    paddingBottom: openFaq === index ? '14px' : '0px',
                  }}
                >
                  <p className="text-sm text-text2 leading-relaxed px-4">
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="fade-up max-w-lg mx-auto">
            <Card className="card-sm" style={{ padding: '16px 20px' }}>
              <div className="text-[10px] font-mono text-text3 uppercase tracking-widest mb-2.5">
                Keyboard Shortcuts
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-xs text-text2">
                  <span className="kbd">⌘K</span> New session
                </div>
                <div className="flex items-center gap-2 text-xs text-text2">
                  <span className="kbd">⌘⏎</span> Analyze
                </div>
                <div className="flex items-center gap-2 text-xs text-text2">
                  <span className="kbd">⌘⇧C</span> Copy result
                </div>
                <div className="flex items-center gap-2 text-xs text-text2">
                  <span className="kbd">Esc</span> Cancel
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="fade-up max-w-2xl mx-auto">
            <Card className="card card-green" style={{ padding: '40px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[radial-gradient(circle,rgba(0,200,83,0.06),transparent_70%)] pointer-events-none"></div>
              <Badge variant="green" pill className="mb-4" style={{ display: 'inline-flex' }}>
                Ready?
              </Badge>
              <h2 className="h2 mb-2">Start building faster today</h2>
              <p className="text-text2 mb-6 max-w-md mx-auto">
                Join 10,000+ developers using DeBuggAI to ship better code, faster.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="btn-primary btn-lg">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="ghost" className="btn-lg btn-ghost">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Logo className="h-4 w-auto" />
              </div>
              <p className="text-xs text-text3 leading-relaxed max-w-xs">
                AI-powered debugging and web building platform for developers. Ship faster, stress less.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-text2 mb-3 tracking-wider">PRODUCT</h4>
              <ul className="space-y-2 text-sm text-text2">
                <li><a href="#features" className="footer-link">Features</a></li>
                <li><a href="#pricing" className="footer-link">Pricing</a></li>
                <li><a href="#" className="footer-link">Web Builder</a></li>
                <li><a href="#" className="footer-link">Templates</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-text2 mb-3 tracking-wider">COMPANY</h4>
              <ul className="space-y-2 text-sm text-text2">
                <li><a href="#" className="footer-link">About</a></li>
                <li><a href="#" className="footer-link">Blog</a></li>
                <li><a href="#" className="footer-link">Careers</a></li>
                <li><a href="#" className="footer-link">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-text2 mb-3 tracking-wider">LEGAL</h4>
              <ul className="space-y-2 text-sm text-text2">
                <li><a href="#" className="footer-link">Privacy</a></li>
                <li><a href="#" className="footer-link">Terms</a></li>
                <li><a href="#" className="footer-link">Security</a></li>
                <li><a href="#" className="footer-link">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-5 flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-text3 font-mono">© 2026 DeBuggAI. All rights reserved.</span>
            <div className="flex items-center gap-3">
              <a href="#" className="text-text3 hover:text-green transition-colors" title="GitHub">
                ⊞
              </a>
              <a href="#" className="text-text3 hover:text-green transition-colors" title="Twitter">
                ◇
              </a>
              <a href="#" className="text-text3 hover:text-green transition-colors" title="Discord">
                ◎
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Toast */}
      <div id="floatingToast" className="fixed bottom-6 right-6 z-50 opacity-0 translate-y-2.5 transition-all duration-300 pointer-events-none">
        <div className="toast">
          <div className="toast-dot" style={{ background: 'var(--ds-green)' }}></div>
          <span className="text-xs">Someone just fixed a bug · 2s ago</span>
        </div>
      </div>
    </div>
  );
}

// Helper function for color conversion
function colorToRgb(color: string): string {
  const colors: Record<string, string> = {
    blue: '64, 196, 255',
    purple: '206, 147, 216',
    amber: '255, 171, 0',
    red: '255, 82, 82',
    green: '0, 200, 83',
  };
  return colors[color] || '0, 0, 0';
}
