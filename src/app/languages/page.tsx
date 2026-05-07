import Link from 'next/link';
import { PublicLayout } from '@/components/public-layout';

const languages = [
  { name: 'JavaScript', color: '#F7DF1E', description: 'Node.js, React, Vue, Angular' },
  { name: 'TypeScript', color: '#3178C6', description: 'Type-safe JavaScript development' },
  { name: 'Python', color: '#3776AB', description: 'Django, Flask, FastAPI scripts' },
  { name: 'Go', color: '#00ADD8', description: 'High-performance backend services' },
  { name: 'Rust', color: '#CE422B', description: 'Systems programming and WebAssembly' },
  { name: 'Java', color: '#ED8B00', description: 'Spring Boot, enterprise applications' },
  { name: 'C#', color: '#68217A', description: '.NET applications and services' },
  { name: 'PHP', color: '#777BB4', description: 'WordPress, Laravel, custom apps' },
  { name: 'Ruby', color: '#CC342D', description: 'Rails, Sinatra web applications' },
  { name: 'Swift', color: '#FA7343', description: 'iOS and macOS development' },
  { name: 'Kotlin', color: '#7F52FF', description: 'Android and backend development' },
  { name: 'C++', color: '#00599C', description: 'Performance-critical applications' },
];

export default function LanguagesPage() {
  return (
    <PublicLayout>
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--app-accent)' }}>
            Languages
          </p>
          <h1 className="text-display mb-4" style={{ color: 'var(--app-text)' }}>
            Supported Languages
          </h1>
          <p className="text-body max-w-2xl mx-auto" style={{ color: 'var(--app-text-muted)' }}>
            Debug code in 10+ programming languages with deep AI-powered context analysis.
          </p>
        </div>

        {/* Languages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {languages.map((lang) => (
            <div key={lang.name} className="card-sm card-interactive flex items-start gap-4">
              {/* Language Dot - using exact global CSS class */}
              <div 
                className="lang-dot mt-1.5 shrink-0" 
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  background: lang.color,
                  boxShadow: `0 0 8px ${lang.color}40`
                }} 
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-h3" style={{ color: 'var(--app-text)', marginBottom: '2px' }}>
                  {lang.name}
                </h3>
                <p className="text-caption" style={{ color: 'var(--app-text-dim)' }}>
                  {lang.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <div className="text-center mt-16">
          <div style={{ borderTop: '1px solid var(--app-border)', width: '80px', margin: '0 auto 24px auto' }}></div>
          <p className="text-body mb-2" style={{ color: 'var(--app-text-muted)' }}>
            Don&apos;t see your language?
          </p>
          <p className="text-caption mb-8" style={{ color: 'var(--app-text-dim)' }}>
            We&apos;re constantly adding support for new languages and frameworks.
          </p>
          <Link href="/signup">
            <button className="btn btn-lg btn-primary">
              Start Debugging
            </button>
          </Link>
        </div>
      </main>
    </PublicLayout>
  );
}