'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  LayoutGrid,
  MessageSquare,
  Palette,
  LayoutTemplate,
  Search,
  Plus,
  ChevronDown,
  X,
  Mic,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSessionStore } from '@/store/session-store';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { supabase } from '@/lib/supabase';
import { createProjectFromGeneration } from '@/lib/projects/create-project';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

const sidebarNav = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Projects', href: '/dashboard/home', icon: LayoutGrid },
  { label: 'Chats', href: '/dashboard/debug/history', icon: MessageSquare },
  { label: 'Design Systems', href: '/dashboard/settings', icon: Palette },
  { label: 'Templates', href: '/dashboard/web-builder', icon: LayoutTemplate },
];

export function V0DashboardHome() {
  const router = useRouter();
  const { user } = useSessionStore();
  const { data: projects = [] } = useMyProjects(30, true);

  const [openMobileNav, setOpenMobileNav] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  const recentChats = useMemo(() => {
    // Best-effort: treat recent generations as “recent chats/projects”
    return projects.slice(0, 6);
  }, [projects]);

  const onCreate = async () => {
    if (!prompt.trim()) return;

    setCreating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in again');
        return;
      }

      const name = prompt.trim().slice(0, 60);
      const { id } = await createProjectFromGeneration({
        userId: session.user.id,
        name: name || 'New Project',
        stack: 'mern',
        prompt,
        createdFrom: 'dashboard-home',
      });

      router.push(`/dashboard?project=${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[280px] shrink-0 border-r border-border/40 bg-card">
        <div className="h-12 px-4 flex items-center gap-3 border-b border-border/40">
          <Logo className="h-5 w-auto" />
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/40 text-sm font-medium min-w-0"
              type="button"
              title="Workspace"
            >
              <span className="truncate">Personal</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-3">
          <Button className="w-full justify-start gap-2" variant="outline">
            <Plus className="h-4 w-4" />
            New Chat
            <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search" />
          </div>
        </div>

        <nav className="px-2 space-y-1">
          {sidebarNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 px-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Recent Chats
          </div>
          <div className="space-y-1">
            {recentChats.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No recent chats yet.
              </div>
            ) : (
              recentChats.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard?project=${p.id}`}
                  className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/40 text-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  <span className="truncate">
                    {p.description || p.prompt || 'Untitled'}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Mobile topbar + drawer */}
      <div className="md:hidden fixed inset-x-0 top-0 h-12 border-b border-border/40 bg-background z-40 flex items-center px-3 gap-2">
        <Dialog open={openMobileNav} onOpenChange={setOpenMobileNav}>
          <DialogTrigger className="btn btn-ghost h-9 w-9 px-0">
            <span className="sr-only">Open menu</span>
            <div className="h-4 w-4 flex flex-col justify-between">
              <span className="block h-0.5 bg-foreground/70" />
              <span className="block h-0.5 bg-foreground/70" />
              <span className="block h-0.5 bg-foreground/70" />
            </div>
          </DialogTrigger>
          <DialogContent className="p-0 max-w-[320px] w-[92vw] sm:w-[320px] left-0 top-0 translate-x-0 translate-y-0 h-screen max-h-screen rounded-none border-r border-border/40">
            <div className="h-12 px-4 flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-2">
                <Logo className="h-5 w-auto" />
                <button className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/40 text-sm font-medium">
                  Personal <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <button
                className="btn btn-ghost h-9 w-9 px-0"
                onClick={() => setOpenMobileNav(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Plus className="h-4 w-4" />
                New Chat
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search" />
              </div>
            </div>

            <nav className="px-2 space-y-1">
              {sidebarNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  onClick={() => setOpenMobileNav(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-2">
          <Logo className="h-5 w-auto" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-muted/40" title={user?.email || 'Account'} />
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="pt-12 md:pt-0 min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-[560px]">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
              What do you want to create?
            </h1>

            <div className="mt-6 rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
              <div className="p-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask DeBuggAI to build…"
                  className="w-full min-h-[72px] resize-none bg-transparent outline-none text-sm"
                />
              </div>

              <div className="border-t border-border/40 px-3 py-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  type="button"
                  title="Attach"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <div className="text-xs text-muted-foreground px-2 py-1 rounded-md border border-border/40">
                  DeBuggAI Max
                  <ChevronDown className="inline-block ml-1 h-3.5 w-3.5" />
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <div className="text-xs text-muted-foreground px-2 py-1 rounded-md border border-border/40">
                    Project
                    <ChevronDown className="inline-block ml-1 h-3.5 w-3.5" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    type="button"
                    title="Voice"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <span className="truncate">
                  Upgrade to Pro to unlock more features and credits
                </span>
                <button
                  className="ml-auto text-primary hover:underline"
                  type="button"
                  onClick={() => router.push('/dashboard/pricing')}
                >
                  Buy credits
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <Button
                disabled={!prompt.trim() || creating}
                onClick={onCreate}
                className="min-w-[160px]"
              >
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

