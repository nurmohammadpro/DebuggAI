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
        '  return <main className="min-h-screen bg-background text-foreground dark:bg-neutral-950 dark:text-white px-6 py-12"><Badge className="bg-emerald-500/10 text-emerald-300 rounded-full px-3 py-1">New</Badge><Sparkles />{title}</main>;',
        '}',
      ].join('\n'),
      'app/globals.css': 'body { margin: 0; }',
    });

    expect(errors).toEqual([]);
    expect(js).toContain('Preview works');
    expect(js).not.toContain("from \"react\"");
    expect(css).toContain('body { margin: 0; }');
    expect(css).toContain('.min-h-screen{min-height:100vh;}');
    expect(css).toContain('.bg-background{background-color:hsl(var(--background));}');
    expect(css).toContain('.text-foreground{color:hsl(var(--foreground));}');
    expect(css).toContain('.dark .dark\\:bg-neutral-950{background-color:#0a0a0a;}');
    expect(css).toContain('.dark .dark\\:text-white{color:#fff;}');

    const html = buildPreviewHtml(js, css);
    expect(html).toContain('<html lang="en" class="dark">');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("installStorage('localStorage');");
    expect(html).toContain("installStorage('sessionStorage');");
    expect(html).toContain('Preview works');
    expect(html).not.toContain('cdn.tailwindcss.com');
  });

  it('uses preview shims when generated shadcn ui files miss named exports', async () => {
    const { js, errors } = await bundlePreview({
      'app/page.tsx': [
        "import { PricingSection } from '@/components/pricing-section';",
        'export default function Home() {',
        '  return <PricingSection />;',
        '}',
      ].join('\n'),
      'components/pricing-section.tsx': [
        "import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';",
        '',
        'export function PricingSection() {',
        '  return <Card><CardHeader><CardTitle>Pro</CardTitle><CardDescription>Best plan</CardDescription></CardHeader><CardContent>$29</CardContent><CardFooter>Start</CardFooter></Card>;',
        '}',
      ].join('\n'),
      'components/ui/card.tsx': [
        "export default function BrokenCard({ children }: { children: React.ReactNode }) {",
        '  return <div>{children}</div>;',
        '}',
      ].join('\n'),
    });

    expect(errors).toEqual([]);
    expect(js).toContain('Best plan');
  });

  it('bundles generated drag handles that import GripVertical from lucide-react', async () => {
    const { js, errors } = await bundlePreview({
      'app/page.tsx': [
        "import { TodoItem } from '@/components/todo-item';",
        'export default function Home() {',
        '  return <TodoItem />;',
        '}',
      ].join('\n'),
      'components/todo-item.tsx': [
        "import { GripVertical } from 'lucide-react';",
        '',
        'export function TodoItem() {',
        '  return <div className="flex items-center gap-2"><GripVertical className="h-4 w-4" />Drag me</div>;',
        '}',
      ].join('\n'),
    });

    expect(errors).toEqual([]);
    expect(js).toContain('Drag me');
  });

  it('renders dnd-kit generated todo apps as visual-only previews', async () => {
    const { js, errors } = await bundlePreview({
      'app/page.tsx': [
        "import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';",
        "import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';",
        "import { CSS } from '@dnd-kit/utilities';",
        "import { GripVertical } from 'lucide-react';",
        '',
        'function TodoItem({ id }: { id: string }) {',
        '  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });',
        '  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}><button {...attributes} {...listeners}><GripVertical /></button>Drag me</div>;',
        '}',
        '',
        'export default function Home() {',
        '  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));',
        '  return <DndContext sensors={sensors} collisionDetection={closestCenter}><SortableContext items={[\"one\"]} strategy={verticalListSortingStrategy}><TodoItem id="one" /></SortableContext></DndContext>;',
        '}',
      ].join('\n'),
    });

    expect(errors).toEqual([]);
    expect(js).toContain('Drag me');
    expect(js).toContain('function DndContext');
    expect(js).toContain('function SortableContext');
    expect(js).toContain('function useSortable');
  });

  it('keeps package default shims renderable as React components', async () => {
    const { js, errors } = await bundlePreview({
      'app/page.tsx': [
        "import Icons from 'lucide-react';",
        "import motionDefault, { motion } from 'framer-motion';",
        '',
        'export default function Home() {',
        '  return <main><Icons className="h-4 w-4" /><Icons.Search /><motion.div>Named motion</motion.div><motionDefault>Default motion</motionDefault></main>;',
        '}',
      ].join('\n'),
    });

    expect(errors).toEqual([]);
    expect(js).toContain('Named motion');
    expect(js).toContain('Default motion');
  });

  it('guards namespace object jsx elements from crashing the iframe', async () => {
    const { js, errors } = await bundlePreview({
      'app/page.tsx': [
        "import * as UnknownWidget from 'unknown-widget';",
        '',
        'export default function Home() {',
        '  return <main><UnknownWidget>Still renders</UnknownWidget></main>;',
        '}',
      ].join('\n'),
    });

    expect(errors).toEqual([]);
    expect(js).toContain('Still renders');
  });

  it('spreads static JSX children to avoid false missing-key warnings', async () => {
    const { js, errors } = await bundlePreview({
      'app/page.tsx': [
        'export default function Home() {',
        '  return <main><div><h1>Title</h1><p>Body</p></div></main>;',
        '}',
      ].join('\n'),
    });

    expect(errors).toEqual([]);
    expect(js).toContain('Title');
    expect(js).toContain('Body');
  });
});
