import Link from 'next/link';
import { Bug, ShieldAlert, Gauge } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';

export default function DemoPage() {
  // Bulletproof way to render curly braces in TSX without parser errors
  const openBrace = "{";
  const closeBrace = "}";

  return (
    <PublicLayout>
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        {/* Header Section */}
        <div className="text-center mb-16">
          <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--ds-green)' }}>
            Live Demo
          </p>
          <h1 className="text-display mb-4" style={{ color: 'var(--ds-text)' }}>
            Watch DeBuggAI in action
          </h1>
          <p className="text-body max-w-2xl mx-auto" style={{ color: 'var(--ds-text2)' }}>
            Follow a real-world scenario where DeBuggAI identifies a silent array mutation bug, explains the root cause, and outputs a production-ready fix in seconds.
          </p>
        </div>

        {/* Step 1: The Problem */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center" style={{ width: '28px', height: '28px', borderRadius: 'var(--ds-r6)', background: 'var(--ds-red)', color: '#fff', fontSize: '12px', fontWeight: '600' }}>
              1
            </div>
            <h2 className="text-h2" style={{ color: 'var(--ds-text)' }}>The Buggy Code</h2>
          </div>
          
          <div className="code-window">
            <div className="code-header">
              <div className="code-dots">
                <div className="code-dot" style={{ background: 'var(--ds-red)' }}></div>
                <div className="code-dot" style={{ background: 'var(--ds-amber)' }}></div>
                <div className="code-dot" style={{ background: 'var(--ds-green)' }}></div>
              </div>
              <span className="code-lang">userController.js</span>
            </div>
            <div className="code-body">
              <div><span className="k">export</span> <span className="k">const</span> <span className="n">getActiveUsers</span> = <span className="p">(</span><span className="n">users</span><span className="p">)</span> <span className="k">=&gt;</span> <span className="p">{openBrace}</span></div>
              <div>  <span className="c">&#47;&#47; BUG: .map mutates original objects &amp; returns undefined for inactive</span></div>
              <div>  <span className="k">const</span> <span className="n">active</span> = <span className="n">users</span><span className="p">.</span><span className="n">map</span><span className="p">((</span><span className="n">user</span><span className="p">)</span> <span className="k">=&gt;</span> <span className="p">{openBrace}</span></div>
              <div>    <span className="k">if</span> <span className="p">(</span><span className="n">user</span><span className="p">.</span><span className="n">isActive</span><span className="p">)</span> <span className="p">{openBrace}</span></div>
              <div>      <span className="err"><span className="n">user</span><span className="p">.</span><span className="n">lastSeen</span> = <span className="n">Date</span><span className="p">.</span><span className="n">now</span><span className="p">();</span> <span className="c">&#47;&#47; Silent mutation!</span></span></div>
              <div>      <span className="k">return</span> <span className="n">user</span><span className="p">;</span></div>
              <div>    <span className="p">{closeBrace}</span></div>
              <div>  <span className="p">);</span></div>
              <div>  </div>
              <div>  <span className="err"><span className="k">return</span> <span className="n">active</span><span className="p">.</span><span className="n">slice</span><span className="p">(</span><span className="n">0</span><span className="p">,</span> <span className="n">10</span><span className="p">);</span></span> <span className="c">&#47;&#47; Fails: array is full of undefined holes</span></div>
              <div><span className="p">{closeBrace};</span></div>
            </div>
          </div>
        </section>

        {/* Step 2: The AI Analysis (Terminal) */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center" style={{ width: '28px', height: '28px', borderRadius: 'var(--ds-r6)', background: 'var(--ds-green)', color: '#000', fontSize: '12px', fontWeight: '600' }}>
              2
            </div>
            <h2 className="text-h2" style={{ color: 'var(--ds-text)' }}>DeBuggAI Analysis</h2>
          </div>

          <div className="terminal">
            <div className="terminal-header">
              <div className="flex gap-1.5">
                <div className="code-dot" style={{ background: 'var(--ds-red)' }}></div>
                <div className="code-dot" style={{ background: 'var(--ds-amber)' }}></div>
                <div className="code-dot" style={{ background: 'var(--ds-green)' }}></div>
              </div>
              <span className="terminal-title">debuggai-cli --analyze userController.js</span>
            </div>
            <div className="terminal-body">
              <div><span className="term-prompt">$ </span><span className="term-cmd">debuggai run --file userController.js</span></div>
              <div className="term-output mt-2">  Parsing AST and evaluating execution paths...</div>
              <div className="term-error mt-2">  &#10005; Critical Error found on Line 4: Array Mutation</div>
              <div className="term-output mt-1">    &rarr; Modifying &apos;user.lastSeen&apos; alters the parent state directly.</div>
              <div className="term-error mt-3">  &#10005; Logical Error found on Line 10: Invalid Array Slice</div>
              <div className="term-output mt-1">    &rarr; Array.map() implicitly returns &apos;undefined&apos; for unmet conditions.</div>
              <div className="term-output mt-1">    &rarr; Slicing an array with undefined holes results in unexpected UI drops.</div>
              <div className="term-success mt-4">  &#10003; Generating optimized, immutable fix...</div>
              <div className="mt-4"><span className="term-prompt">$ </span><span className="term-cursor"></span></div>
            </div>
          </div>
        </section>

        {/* Step 3: AI Insights Breakdown */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center" style={{ width: '28px', height: '28px', borderRadius: 'var(--ds-r6)', background: 'var(--ds-blue)', color: '#000', fontSize: '12px', fontWeight: '600' }}>
              3
            </div>
            <h2 className="text-h2" style={{ color: 'var(--ds-text)' }}>Root Cause Breakdown</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-sm">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4" style={{ color: 'var(--ds-red)' }} />
                <span className="card-title" style={{ marginBottom: 0 }}>State Mutation</span>
              </div>
              <p className="card-sub" style={{ marginBottom: 0 }}>
                Directly assigning <span className="text-mono" style={{ fontSize: '11px', color: 'var(--ds-text)' }}>user.lastSeen</span> bypasses React/State management immutability rules, causing unpredictable re-renders.
              </p>
            </div>
            <div className="card-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="h-4 w-4" style={{ color: 'var(--ds-amber)' }} />
                <span className="card-title" style={{ marginBottom: 0 }}>Memory Leak Risk</span>
              </div>
              <p className="card-sub" style={{ marginBottom: 0 }}>
                Utilizing <span className="text-mono" style={{ fontSize: '11px', color: 'var(--ds-text)' }}>.map()</span> without a return for all branches creates sparse arrays, increasing garbage collection overhead.
              </p>
            </div>
            <div className="card-sm">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="h-4 w-4" style={{ color: 'var(--ds-green)' }} />
                <span className="card-title" style={{ marginBottom: 0 }}>Performance Hit</span>
              </div>
              <p className="card-sub" style={{ marginBottom: 0 }}>
                A combination of mutation and sparse array slicing forces the engine to dynamically resize memory buffers continuously.
              </p>
            </div>
          </div>
        </section>

        {/* Step 4: The Fixed Code */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center" style={{ width: '28px', height: '28px', borderRadius: 'var(--ds-r6)', background: 'var(--ds-green)', color: '#000', fontSize: '12px', fontWeight: '600' }}>
              4
            </div>
            <h2 className="text-h2" style={{ color: 'var(--ds-text)' }}>The Production-Ready Fix</h2>
          </div>
          
          <div className="code-window" style={{ borderColor: 'var(--ds-green)', boxShadow: '0 0 30px rgba(0,200,83,0.08)' }}>
            <div className="code-header" style={{ background: 'var(--ds-surface2)' }}>
              <div className="code-dots">
                <div className="code-dot" style={{ background: 'var(--ds-red)' }}></div>
                <div className="code-dot" style={{ background: 'var(--ds-amber)' }}></div>
                <div className="code-dot" style={{ background: 'var(--ds-green)' }}></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="code-lang">userController.js</span>
                <span className="badge bg-green" style={{ fontSize: '9px', padding: '1px 6px' }}>FIXED</span>
              </div>
            </div>
            <div className="code-body">
              <div><span className="k">export</span> <span className="k">const</span> <span className="n">getActiveUsers</span> = <span className="p">(</span><span className="n">users</span><span className="p">)</span> <span className="k">=&gt;</span> <span className="p">{openBrace}</span></div>
              <div>  <span className="c">&#47;&#47; FIX: Use .filter() for immutable boolean checks</span></div>
              <div>  <span className="k">return</span> <span className="n">users</span></div>
              <div>    <span className="p">.</span><span className="n">filter</span><span className="p">((</span><span className="n">user</span><span className="p">)</span> <span className="k">=&gt;</span> <span className="n">user</span><span className="p">.</span><span className="n">isActive</span><span className="p">)</span></div>
              <div>    <span className="p">.</span><span className="n">map</span><span className="p">((</span><span className="n">user</span><span className="p">)</span> <span className="k">=&gt;</span> <span className="p">({openBrace}</span></div>
              <div>      <span className="p">...</span><span className="n">user</span><span className="p">,</span></div>
              <div>      <span className="c">&#47;&#47; FIX: Create a new object reference to prevent parent mutation</span></div>
              <div>      <span className="n">lastSeen</span><span className="p">:</span> <span className="n">Date</span><span className="p">.</span><span className="n">now</span><span className="p">()</span></div>
              <div>    <span className="p">{closeBrace})</span></div>
              <div>    <span className="p">.</span><span className="n">slice</span><span className="p">(</span><span className="n">0</span><span className="p">,</span> <span className="n">10</span><span className="p">);</span> <span className="c">&#47;&#47; Safe: array contains only valid objects</span></div>
              <div><span className="p">{closeBrace};</span></div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <div className="text-center">
          <div style={{ borderTop: '1px solid var(--ds-border)', width: '80px', margin: '0 auto 24px auto' }}></div>
          <h2 className="text-h1 mb-3" style={{ color: 'var(--ds-text)' }}>
            Stop guessing. Start fixing.
          </h2>
          <p className="text-body max-w-md mx-auto mb-8" style={{ color: 'var(--ds-text2)' }}>
            Paste your stack trace, code block, or error logs and let DeBuggAI handle the rest.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/signup">
              <button className="btn btn-lg btn-primary">
                Try It On Your Code
              </button>
            </Link>
            <Link href="/pricing">
              <button className="btn btn-lg btn-ghost">
                View Pricing
              </button>
            </Link>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}