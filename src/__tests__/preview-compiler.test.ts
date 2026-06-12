// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { bundlePreview, buildPreviewHtml } from '@/lib/preview/compile';

describe('preview compiler', () => {
  it('bundles multi-file app router pages with app alias imports', async () => {
    const { js, css, errors } = await bundlePreview({
      'app/page.tsx': [
        "import { Hero } from '@/components/hero';",
        '',
        'export default function Home() {',
        '  return <Hero title="Preview works" />;',
        '}',
      ].join('\n'),
      'components/hero.tsx': [
        "import { Sparkles } from 'lucide-react';",
        "import { Badge } from '@/components/ui/badge';",
        '',
        'export function Hero({ title }: { title: string }) {',
        '  return <main className="min-h-screen bg-neutral-950 text-white px-6 py-12"><Badge className="bg-emerald-500/10 text-emerald-300 rounded-full px-3 py-1">New</Badge><Sparkles />{title}</main>;',
        '}',
      ].join('\n'),
      'app/globals.css': 'body { margin: 0; }',
    });

    expect(errors).toEqual([]);
    expect(js).toContain('Preview works');
    expect(js).not.toContain("from \"react\"");
    expect(css).toContain('body { margin: 0; }');
    expect(css).toContain('.min-h-screen{min-height:100vh;}');
    expect(css).toContain('.bg-neutral-950{background-color:#0a0a0a;}');
    expect(css).toContain('.text-white{color:#fff;}');

    const html = buildPreviewHtml(js, css);
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('Preview works');
    expect(html).not.toContain('cdn.tailwindcss.com');
  });
});
