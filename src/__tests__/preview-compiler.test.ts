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
        'export function Hero({ title }: { title: string }) {',
        '  return <main className="min-h-screen bg-neutral-950 text-white">{title}</main>;',
        '}',
      ].join('\n'),
      'app/globals.css': 'body { margin: 0; }',
    });

    expect(errors).toEqual([]);
    expect(js).toContain('Preview works');
    expect(js).not.toContain("from \"react\"");
    expect(css).toContain('body { margin: 0; }');

    const html = buildPreviewHtml(js, css);
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('Preview works');
  });
});
