import Link from 'next/link';
import { Send, Check, X } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero + Debug Demo */}
      <section className="mx-auto max-w-[960px] px-6 pt-16 pb-16 md:pt-20 md:pb-20">
        <h1 className="text-[40px] font-semibold leading-[1.15] tracking-[-1.2px] max-w-[640px] max-sm:text-[32px] max-sm:tracking-[-0.7px]">
          Debug and build, <span className="text-[var(--app-accent)]">faster</span>
        </h1>
        <p className="mt-4 text-[15px] text-[var(--app-text-muted)] max-w-[500px] leading-relaxed">
          Paste code, describe a bug, get an explained fix in seconds. Then build and deploy from the same workspace.
        </p>
        <div className="flex items-center gap-3.5 mt-7">
          <Link
            href="/signup"
            className="inline-flex items-center h-11 px-6 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Start debugging
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center h-11 px-6 rounded-[6px] bg-transparent text-[var(--app-text)] text-sm font-medium border border-[var(--app-border-strong)] hover:bg-[var(--app-panel-2)] transition-colors"
          >
            See pricing
          </Link>
        </div>

        {/* Debug Demo Panel */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-px rounded-[6px] overflow-hidden border border-[var(--app-border-strong)] bg-[var(--app-border-strong)]">
          {/* Left: Input */}
          <div className="bg-[var(--app-panel)] p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
              Input
            </div>
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
            <a
              href="#demo-result"
              className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-xs font-semibold no-underline"
            >
              <Send className="h-3.5 w-3.5" />
              Analyze
            </a>
          </div>

          {/* Right: Result */}
          <div id="demo-result" className="bg-[var(--app-panel)] p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
              Result
            </div>
            <pre className="font-mono text-[11px] leading-[1.8] text-[var(--app-text-muted)] whitespace-pre-wrap">
              <span className="text-[var(--app-text-dim)]">## Summary</span>{'\n'}
              <span className="text-[var(--app-danger)]">NameError</span>: <span className="text-[var(--app-text-dim)]">variable</span> name <span className="text-[var(--app-text-dim)]">referenced before assignment</span>{'\n\n'}
              <span className="text-[var(--app-text-dim)]">## Root Cause</span>{'\n'}
              get_user() <span className="text-[var(--app-text-dim)]">may return</span> None <span className="text-[var(--app-text-dim)]">when the query finds no row.</span>{'\n'}
              <span className="text-[var(--app-text-dim)]">The</span> NameError <span className="text-[var(--app-text-dim)]">at line 7 is a cascade: the try/except swallowed the</span>{'\n'}
              <span className="text-[var(--app-text-dim)]">original error, so</span> name <span className="text-[var(--app-text-dim)]">was never assigned.</span>{'\n\n'}
              <span className="text-[var(--app-text-dim)]">## Fix</span>{'\n'}
              <span className="text-[var(--app-accent)]">+ def get_user(user_id: int) -&gt; dict | None:</span>{'\n'}
              <span className="text-[var(--app-accent)]">+     result = db.query("SELECT * FROM users WHERE id = ?", [user_id])</span>{'\n'}
              <span className="text-[var(--app-accent)]">+     return result[0] if result else None</span>{'\n'}
              <span className="text-[var(--app-accent)]">+ </span>{'\n'}
              <span className="text-[var(--app-accent)]">+ user = get_user(42)</span>{'\n'}
              <span className="text-[var(--app-accent)]">+ if user is None:</span>{'\n'}
              <span className="text-[var(--app-accent)]">+     print("User not found")</span>{'\n'}
              <span className="text-[var(--app-accent)]">+ else:</span>{'\n'}
              <span className="text-[var(--app-accent)]">+     print(f"Hello, {'{'}user['name']{'}'}")</span>
            </pre>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="features" className="bg-[var(--app-panel)]">
        <div className="mx-auto max-w-[960px] px-6 py-20">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
            Capabilities
          </div>
          <h2 className="text-[28px] font-semibold tracking-[-0.5px] mb-2">Everything you need to ship</h2>
          <p className="text-sm text-[var(--app-text-muted)] max-w-[480px] mb-10">
            Three surfaces, one workspace. Debug, build, and deploy without leaving the tool.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-[6px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-border)]">
            {/* Debug */}
            <div className="bg-[var(--app-panel-2)] p-7 flex flex-col">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)] mb-3">
                Debug
              </div>
              <h3 className="text-[17px] font-semibold tracking-[-0.2px] mb-1.5">AI-powered analysis</h3>
              <p className="text-[13px] text-[var(--app-text-muted)] leading-relaxed flex-1">
                Paste code and an error. Get root cause, explained fix, and suggested tests. 10+ languages, streaming responses.
              </p>
              <pre className="mt-4 rounded-[6px] bg-[var(--app-bg)] border border-[var(--app-border)] p-3 font-mono text-[10px] leading-[1.7] text-[var(--app-text-muted)] overflow-x-auto">
                <span className="text-[var(--app-danger)]">- user = db.query(f&quot;SELECT * FROM</span>{'\n'}
                <span className="text-[var(--app-danger)]">  users WHERE id = {'{'}id{'}'}&quot;)</span>{'\n'}
                <span className="text-[var(--app-accent)]">+ import re; sanitized =</span>{'\n'}
                <span className="text-[var(--app-accent)]">  re.sub(r&apos;[^\w]&apos;,&apos;&apos;,str(id))</span>{'\n'}
                <span className="text-[var(--app-accent)]">+ db.query(&quot;SELECT * FROM users</span>{'\n'}
                <span className="text-[var(--app-accent)]">  WHERE id = ?&quot;, [sanitized])</span>
              </pre>
            </div>

            {/* Build */}
            <div className="bg-[var(--app-panel-2)] p-7 flex flex-col">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-info)] mb-3">
                Build
              </div>
              <h3 className="text-[17px] font-semibold tracking-[-0.2px] mb-1.5">Visual web builder</h3>
              <p className="text-[13px] text-[var(--app-text-muted)] leading-relaxed flex-1">
                Describe what you want. The AI generates a full app with live Monaco editor and instant iframe preview.
              </p>
              <pre className="mt-4 rounded-[6px] bg-[var(--app-bg)] border border-[var(--app-border)] p-3 font-mono text-[10px] leading-[1.7] text-[var(--app-text-muted)] overflow-x-auto">
                <span className="text-[var(--app-info)]">&gt; Build a todo app with dark</span>{'\n'}
                <span className="text-[var(--app-info)]">  mode toggle and localStorage</span>{'\n'}
                <span className="text-[var(--app-info)]">  persistence</span>{'\n\n'}
                <span className="text-[var(--app-text-dim)]">→ Generated index.html,</span>{'\n'}
                <span className="text-[var(--app-text-dim)]">   style.css, app.js</span>{'\n'}
                <span className="text-[var(--app-text-dim)]">   Ready in 4.2s</span>
              </pre>
            </div>

            {/* Deploy */}
            <div className="bg-[var(--app-panel-2)] p-7 flex flex-col">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-purple)] mb-3">
                Deploy
              </div>
              <h3 className="text-[17px] font-semibold tracking-[-0.2px] mb-1.5">Ship from the workspace</h3>
              <p className="text-[13px] text-[var(--app-text-muted)] leading-relaxed flex-1">
                One-click deploy to Vercel or Netlify. Export as zip. Project versioning and team branches built in.
              </p>
              <pre className="mt-4 rounded-[6px] bg-[var(--app-bg)] border border-[var(--app-border)] p-3 font-mono text-[10px] leading-[1.7] overflow-x-auto">
                <span className="text-[var(--app-text-dim)]">{'$'} debuggai deploy</span>{'\n'}
                <span className="text-[var(--app-text-dim)]">  Building project...</span>{'\n'}
                <span className="text-[var(--app-text-dim)]">  Uploading to Vercel</span>{'\n'}
                <span className="text-[var(--app-accent)]">  Live at →</span>{'\n'}
                <span className="text-[var(--app-accent)]">  myapp.vercel.app</span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Web Builder Demo */}
      <section className="mx-auto max-w-[960px] px-6 py-20 max-sm:pt-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
          Live Demo
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px rounded-[6px] overflow-hidden border border-[var(--app-border-strong)] bg-[var(--app-border-strong)]">
          {/* Left: prompt + generated code */}
          <div className="bg-[var(--app-panel)] flex flex-col">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--app-border)]">
              <input
                readOnly
                type="text"
                value="Build a dark-mode todo app with localStorage persistence"
                className="flex-1 h-9 px-3 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border-strong)] text-[var(--app-text)] font-mono text-[11px] outline-none"
              />
              <button className="h-9 w-9 rounded-[6px] bg-[var(--app-accent)] text-[#071006] inline-flex items-center justify-center flex-shrink-0">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex border-b border-[var(--app-border)]">
              {['index.html', 'style.css', 'app.js'].map((tab, i) => (
                <button
                  key={tab}
                  className={`h-8 px-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] border-b-2 transition-colors ${
                    i === 0
                      ? 'text-[var(--app-accent)] border-[var(--app-accent)]'
                      : 'text-[var(--app-text-dim)] border-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <pre className="flex-1 min-h-[220px] p-5 font-mono text-[10px] leading-[1.8] text-[var(--app-text-muted)] overflow-auto whitespace-pre">
              <span className="text-[var(--app-text-dim)] italic">{'<!-- index.html -->'}</span>{'\n'}
              <span className="text-[var(--app-danger)]">&lt;!DOCTYPE html&gt;</span>{'\n'}
              <span className="text-[var(--app-danger)]">&lt;html</span> <span className="text-[var(--app-warning)]">lang</span>=<span className="text-[var(--app-accent)]">&quot;en&quot;</span><span className="text-[var(--app-danger)]">&gt;</span>{'\n'}
              <span className="text-[var(--app-danger)]">&lt;head&gt;</span>{'\n'}
              {'  '}<span className="text-[var(--app-danger)]">&lt;meta</span> <span className="text-[var(--app-warning)]">charset</span>=<span className="text-[var(--app-accent)]">&quot;UTF-8&quot;</span><span className="text-[var(--app-danger)]">&gt;</span>{'\n'}
              {'  '}<span className="text-[var(--app-danger)]">&lt;title&gt;</span>Tasks<span className="text-[var(--app-danger)]">&lt;/title&gt;</span>{'\n'}
              {'  '}<span className="text-[var(--app-danger)]">&lt;link</span> <span className="text-[var(--app-warning)]">rel</span>=<span className="text-[var(--app-accent)]">&quot;stylesheet&quot;</span> <span className="text-[var(--app-warning)]">href</span>=<span className="text-[var(--app-accent)]">&quot;style.css&quot;</span><span className="text-[var(--app-danger)]">&gt;</span>{'\n'}
              <span className="text-[var(--app-danger)]">&lt;/head&gt;</span>{'\n'}
              <span className="text-[var(--app-danger)]">&lt;body&gt;</span>{'\n'}
              {'  '}<span className="text-[var(--app-danger)]">&lt;div</span> <span className="text-[var(--app-warning)]">class</span>=<span className="text-[var(--app-accent)]">&quot;container&quot;</span><span className="text-[var(--app-danger)]">&gt;</span>{'\n'}
              {'    '}<span className="text-[var(--app-danger)]">&lt;h1&gt;</span>Tasks<span className="text-[var(--app-danger)]">&lt;/h1&gt;</span>{'\n'}
              {'    '}<span className="text-[var(--app-danger)]">&lt;div</span> <span className="text-[var(--app-warning)]">class</span>=<span className="text-[var(--app-accent)]">&quot;add-row&quot;</span><span className="text-[var(--app-danger)]">&gt;</span>{'\n'}
              {'      '}<span className="text-[var(--app-danger)]">&lt;input</span> <span className="text-[var(--app-warning)]">placeholder</span>=<span className="text-[var(--app-accent)]">&quot;Add a task...&quot;</span><span className="text-[var(--app-danger)]">&gt;</span>{'\n'}
              {'      '}<span className="text-[var(--app-danger)]">&lt;button&gt;</span>Add<span className="text-[var(--app-danger)]">&lt;/button&gt;</span>{'\n'}
              {'    '}<span className="text-[var(--app-danger)]">&lt;/div&gt;</span>{'\n'}
              {'    '}<span className="text-[var(--app-danger)]">&lt;ul</span> <span className="text-[var(--app-warning)]">id</span>=<span className="text-[var(--app-accent)]">&quot;taskList&quot;</span><span className="text-[var(--app-danger)]">&gt;&lt;/ul&gt;</span>{'\n'}
              {'  '}<span className="text-[var(--app-danger)]">&lt;/div&gt;</span>{'\n'}
              {'  '}<span className="text-[var(--app-danger)]">&lt;script</span> <span className="text-[var(--app-warning)]">src</span>=<span className="text-[var(--app-accent)]">&quot;app.js&quot;</span><span className="text-[var(--app-danger)]">&gt;&lt;/script&gt;</span>{'\n'}
              <span className="text-[var(--app-danger)]">&lt;/body&gt;</span>{'\n'}
              <span className="text-[var(--app-danger)]">&lt;/html&gt;</span>
            </pre>
          </div>

          {/* Right: live preview */}
          <div className="bg-[var(--app-panel)] flex flex-col">
            <div className="h-7 px-3 flex items-center gap-1.5 bg-[var(--app-panel-2)] border-b border-[var(--app-border)]">
              <span className="w-2 h-2 rounded-full bg-[#FF5F56]" />
              <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
              <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
              <span className="ml-2 text-[10px] font-mono text-[var(--app-text-dim)] bg-[var(--app-panel)] px-2 py-0.5 rounded-[4px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                localhost:3000/preview
              </span>
            </div>
            <div className="flex-1 min-h-[340px] max-sm:min-h-[260px] bg-white flex items-center justify-center">
              <div className="w-full h-full p-6 bg-[#fafafa] text-[#1a1a1a] font-sans overflow-auto">
                <div className="max-w-[360px] mx-auto bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
                  <h4 className="text-lg font-semibold mb-4 text-[#1a1a1a]">Tasks</h4>
                  <div className="flex gap-2 mb-4">
                    <input
                      readOnly
                      type="text"
                      value="Write unit tests"
                      className="flex-1 h-9 px-2.5 rounded-[6px] border border-[#e0e0e0] text-[13px] outline-none"
                    />
                    <button className="h-9 px-3.5 rounded-[6px] bg-[#00C853] text-white text-xs font-semibold">
                      Add
                    </button>
                  </div>
                  {[
                    { text: 'Set up project', done: true },
                    { text: 'Install dependencies', done: true },
                    { text: 'Write unit tests', done: false },
                    { text: 'Add dark mode toggle', done: false },
                    { text: 'Deploy to production', done: false },
                  ].map((task) => (
                    <div
                      key={task.text}
                      className={`flex items-center gap-2.5 py-2 border-b border-[#f0f0f0] text-[13px] ${
                        task.done ? 'text-[#aaa] line-through' : 'text-[#333]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={task.done}
                        className="w-4 h-4 accent-[#00C853]"
                      />
                      {task.text}
                    </div>
                  ))}
                  <div className="text-[11px] text-[#999] mt-3 text-center">5 tasks, 3 remaining</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Languages + How it works */}
      <section className="mx-auto max-w-[960px] px-6 py-10 pb-20 text-center">
        <h2 className="text-[22px] font-semibold tracking-[-0.3px] mb-6">12 languages, one tool</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { name: 'JavaScript', color: '#F7DF1E' },
            { name: 'Python', color: '#3776AB' },
            { name: 'PHP', color: '#777BB4' },
            { name: 'Go', color: '#00ADD8' },
            { name: 'Ruby', color: '#CC342D' },
            { name: 'TypeScript', color: '#3178C6' },
            { name: 'Java', color: '#ED8B00' },
            { name: 'C#', color: '#9B4F96' },
            { name: 'HTML/CSS', color: '#E34F26' },
            { name: 'C++', color: '#00599C' },
            { name: 'Dart', color: '#00B4AB' },
            { name: 'Rust', color: '#CE422B' },
          ].map((lang) => (
            <span
              key={lang.name}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[var(--app-border-strong)] bg-[var(--app-panel-2)] text-[11px] font-medium text-[var(--app-text-muted)]"
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: lang.color }} />
              {lang.name}
            </span>
          ))}
        </div>

        <div className="mt-16">
          <p className="text-[15px] text-[var(--app-text-muted)] leading-[1.8]">
            <strong className="text-[var(--app-text)] font-semibold">Paste code and error</strong> →{' '}
            <strong className="text-[var(--app-text)] font-semibold">AI analyzes in real-time</strong> →{' '}
            <strong className="text-[var(--app-text)] font-semibold">Apply the fix or iterate.</strong>{' '}
            Or <strong className="text-[var(--app-text)] font-semibold">describe an app</strong> →{' '}
            <strong className="text-[var(--app-text)] font-semibold">AI generates it live</strong> →{' '}
            <strong className="text-[var(--app-text)] font-semibold">preview instantly.</strong>{' '}
            Two loops, one tool. No setup, no config.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[var(--app-panel)]">
        <div className="mx-auto max-w-[960px] px-6 py-20">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
            Pricing
          </div>
          <h2 className="text-[28px] font-semibold tracking-[-0.5px] mb-2">Start free, upgrade when you need more</h2>
          <p className="text-sm text-[var(--app-text-muted)] mb-8">No credit card required. Cancel anytime.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px rounded-[6px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-border)]">
            {/* Free */}
            <div className="bg-[var(--app-panel-2)] p-8 flex flex-col">
              <h3 className="text-[17px] font-semibold mb-1">Free</h3>
              <div className="text-[36px] font-semibold text-[var(--app-accent)] tracking-[-1px] mt-3 mb-1">
                $0<span className="text-sm font-normal text-[var(--app-text-muted)]">/month</span>
              </div>
              <p className="text-xs text-[var(--app-text-muted)] mb-5">For individuals learning</p>
              <ul className="text-xs text-[var(--app-text-muted)] leading-[2] flex-1 space-y-0">
                {[
                  { text: '30 credits/month', included: true },
                  { text: 'Basic debugging', included: true },
                  { text: '30-day history', included: true },
                  { text: 'Web Builder', included: false },
                ].map((f) => (
                  <li key={f.text} className="flex items-center gap-1.5">
                    {f.included ? (
                      <Check className="h-3 w-3 text-[var(--app-accent)]" />
                    ) : (
                      <X className="h-3 w-3 text-[var(--app-text-dim)]" />
                    )}
                    <span className={f.included ? '' : 'text-[var(--app-text-dim)]'}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-11 px-6 mt-5 rounded-[6px] border border-[var(--app-border-strong)] text-sm font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-panel)] transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-[var(--app-panel-2)] p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                <span className="font-medium text-[11px] bg-[var(--app-accent)] text-[#071006] px-4 py-1 rounded-[6px]">
                  Most Popular
                </span>
              </div>
              <h3 className="text-[17px] font-semibold mb-1 mt-3">Pro</h3>
              <div className="text-[36px] font-semibold text-[var(--app-accent)] tracking-[-1px] mt-3 mb-1">
                $9<span className="text-sm font-normal text-[var(--app-text-muted)]">/month</span>
              </div>
              <p className="text-xs text-[var(--app-text-muted)] mb-5">For serious developers</p>
              <ul className="text-xs text-[var(--app-text-muted)] leading-[2] flex-1 space-y-0">
                {[
                  '300 credits/month',
                  'Priority AI responses',
                  '365-day history',
                  'Web Builder + Templates',
                  'Zero-Knowledge Mode',
                  'Referral program',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-[var(--app-accent)]" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-11 px-6 mt-5 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Start free trial
              </Link>
            </div>
          </div>

          <Link
            href="/pricing"
            className="block text-center mt-5 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
          >
            See all plans → Team, Business, Enterprise
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[960px] px-6 py-16 pb-24 text-center">
        <h2 className="text-[28px] font-semibold tracking-[-0.5px] mb-2">Start debugging for free</h2>
        <p className="text-sm text-[var(--app-text-muted)] mb-6">No credit card required. Setup takes under two minutes.</p>
        <Link
          href="/signup"
          className="inline-flex items-center h-12 px-8 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[15px] font-semibold hover:opacity-90 transition-opacity"
        >
          Create free account
        </Link>
      </section>
    </PublicLayout>
  );
}
