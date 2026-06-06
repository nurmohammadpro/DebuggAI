import { describe, expect, it } from 'vitest';
import { normalizePreviewFiles } from '@/lib/project/package-normalizer';
import { extractVirtualFiles } from '@/lib/project/virtual-files';
import { sanitizeChatContent } from '@/lib/utils/code-extraction';

describe('preview generation hardening', () => {
  it('removes filename comments from package.json code blocks', () => {
    const project = extractVirtualFiles(`// File: package.json
\`\`\`json
// package.json
{
  "name": "preview-app",
  "dependencies": {}
}
\`\`\``);

    expect(project.files['package.json']?.content.trimStart()).toMatch(/^\{/);
  });

  it('adds missing shadcn and Tailwind dependencies before sandbox install', () => {
    const files = normalizePreviewFiles({
      'package.json': JSON.stringify({
        name: 'preview-app',
        scripts: { dev: 'next dev' },
        dependencies: {
          next: '^16.2.7',
          react: '^19.2.4',
          'react-dom': '^19.2.4',
        },
        devDependencies: {},
      }),
      'postcss.config.mjs': `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`,
      'tailwind.config.ts': `export default { content: ['./app/**/*.{ts,tsx}'] }`,
      'app/layout.tsx': `import './globals.css'; export default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }`,
      'components/ui/button.tsx': `import { Slot } from '@radix-ui/react-slot'; export function Button() { return <Slot />; }`,
      'lib/utils.ts': `import { clsx } from 'clsx'; import { twMerge } from 'tailwind-merge'; export const cn = (...v: string[]) => twMerge(clsx(v));`,
    });

    const packageJson = JSON.parse(files['package.json'] || '{}');
    expect(packageJson.dependencies['@radix-ui/react-slot']).toBeTruthy();
    expect(packageJson.dependencies.clsx).toBeTruthy();
    expect(packageJson.dependencies['tailwind-merge']).toBeTruthy();
    expect(packageJson.devDependencies.autoprefixer).toBeTruthy();
    expect(packageJson.devDependencies.typescript).toBeTruthy();
  });

  it('keeps generated source code out of assistant chat prose', () => {
    const chat = sanitizeChatContent(`I'll build the page now.

// File: app/page.tsx
\`\`\`tsx
export default function Page() {
  return <main />;
}
\`\`\`

Generated **1 file**: app/page.tsx`);

    expect(chat).toBe("I'll build the page now.");
  });
});
