'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Search, Sparkles, Code2, LayoutDashboard, Smartphone, Globe,
  ShoppingCart, MessageSquare, UserCheck, FileText, Settings,
  Database, Mail, Calendar, Image, Music, Video, MapPin,
  Clock, Shield, BarChart3, CreditCard, Bell, BookOpen,
  Star, Heart, Share2, Cloud, Terminal, Layers, Box,
} from 'lucide-react';

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: TemplateCategory;
  tags: string[];
  icon: string;
}

type TemplateCategory =
  | 'landing-pages'
  | 'dashboards'
  | 'apps'
  | 'ecommerce'
  | 'auth'
  | 'forms'
  | 'data'
  | 'layouts';

const CATEGORIES: { id: TemplateCategory; label: string; icon: keyof typeof CATEGORY_ICONS }[] = [
  { id: 'landing-pages', label: 'Landing Pages', icon: 'Globe' },
  { id: 'dashboards', label: 'Dashboards', icon: 'LayoutDashboard' },
  { id: 'apps', label: 'Web Apps', icon: 'Smartphone' },
  { id: 'ecommerce', label: 'E-Commerce', icon: 'ShoppingCart' },
  { id: 'auth', label: 'Auth & Users', icon: 'UserCheck' },
  { id: 'forms', label: 'Forms & Input', icon: 'MessageSquare' },
  { id: 'data', label: 'Data Display', icon: 'BarChart3' },
  { id: 'layouts', label: 'Layouts', icon: 'Layers' },
];

const CATEGORY_ICONS = {
  Globe, LayoutDashboard, Smartphone, ShoppingCart,
  UserCheck, MessageSquare, BarChart3, Layers,
};

const TEMPLATES: PromptTemplate[] = [
  // Landing Pages
  {
    id: 'saas-landing',
    title: 'SaaS Landing Page',
    description: 'Modern SaaS landing page with hero, features, pricing, and testimonials',
    prompt: 'Create a modern SaaS landing page with: a hero section with headline and CTA button, a feature grid with 6 feature cards each having an icon and description, a pricing section with 3 tiers (Free/Pro/Enterprise), a testimonials carousel, and a footer with company info. Use a clean blue/white color scheme, smooth hover animations, and responsive layout.',
    category: 'landing-pages',
    tags: ['hero', 'features', 'pricing', 'testimonials', 'responsive'],
    icon: 'Rocket',
  },
  {
    id: 'startup-landing',
    title: 'Startup Landing',
    description: 'Bold startup landing with animated hero, logos, and waitlist',
    prompt: 'Build a startup landing page with: a full-screen hero section with animated gradient background and large headline, a social proof bar with partner logos, a "how it works" 3-step section, a features grid with hover effects, an email waitlist form, and a clean footer. Use dark mode by default with accent gradients.',
    category: 'landing-pages',
    tags: ['animate', 'waitlist', 'gradient', 'dark'],
    icon: 'Sparkles',
  },
  {
    id: 'portfolio',
    title: 'Portfolio Site',
    description: 'Developer portfolio with projects, skills, and contact form',
    prompt: 'Build a developer portfolio with: a hero section with typing animation, a project grid with filterable cards (each with image, tech stack badges, and links), a skills section with progress bars, a timeline for experience, and a contact form. Use a minimal dark theme with smooth scroll and reveal animations.',
    category: 'landing-pages',
    tags: ['portfolio', 'animation', 'filter', 'timeline'],
    icon: 'FileText',
  },

  // Dashboards
  {
    id: 'analytics-dashboard',
    title: 'Analytics Dashboard',
    description: 'Data dashboard with KPIs, charts, and activity feed',
    prompt: 'Create an analytics dashboard with: a top row of 4 KPI stat cards (Revenue, Users, Sessions, Conversion Rate) with trend indicators, a line chart showing weekly revenue, a bar chart comparing month-over-month metrics, a recent activity feed list, and a data table with sortable columns. Use a clean, professional color palette.',
    category: 'dashboards',
    tags: ['charts', 'kpi', 'stats', 'data-table', 'realtime'],
    icon: 'BarChart3',
  },
  {
    id: 'admin-panel',
    title: 'Admin Panel',
    description: 'Full admin panel with sidebar navigation and data management',
    prompt: 'Build a comprehensive admin panel with: a collapsible sidebar with icon-based navigation items (Dashboard, Users, Content, Analytics, Settings), a header with search bar and user menu, a stats overview section, a data table with pagination and search/filter, and a modal for editing records. Use a dark sidebar with light content area.',
    category: 'dashboards',
    tags: ['sidebar', 'crud', 'table', 'search', 'paginate'],
    icon: 'Settings',
  },
  {
    id: 'project-board',
    title: 'Project Board',
    description: 'Kanban-style project management board with drag and drop',
    prompt: 'Create a Kanban project board with: 4 columns (Backlog, In Progress, Review, Done), draggable task cards with priority badges and assignee avatars, a task creation modal with title/description/priority fields, a column counter showing task counts, and a top filter bar. Use color-coded priority indicators.',
    category: 'dashboards',
    tags: ['kanban', 'drag-drop', 'tasks', 'modal', 'filter'],
    icon: 'LayoutDashboard',
  },

  // Web Apps
  {
    id: 'task-manager',
    title: 'Task Manager',
    description: 'Todo app with categories, due dates, and search',
    prompt: 'Build a task management app with: a sidebar with categories (All, Today, This Week, Custom Lists), a main area showing tasks with checkboxes and due dates, a search bar with real-time filtering, a task creation form with title/description/date/priority fields, and a stats footer showing completion rate. Add local storage persistence.',
    category: 'apps',
    tags: ['todo', 'search', 'categories', 'persist'],
    icon: 'CheckSquare',
  },
  {
    id: 'note-taking',
    title: 'Note Taking App',
    description: 'Rich text notes with folders, search, and tags',
    prompt: 'Build a note-taking app with: a folder sidebar for organization, a note list with preview text and timestamps, a rich text editor area (bold, italic, lists, headings), a tag system with filtering, full-text search, and auto-save functionality. Include a trash folder for deleted notes.',
    category: 'apps',
    tags: ['editor', 'notes', 'folders', 'tags', 'search'],
    icon: 'FileText',
  },
  {
    id: 'chat-app',
    title: 'Chat Application',
    description: 'Real-time chat interface with channels and DMs',
    prompt: 'Create a chat application with: a channel/workspace sidebar, a DM contact list with online status dots, a message area with bubbles and timestamps, an input bar with emoji picker and file upload button, and typing indicators. Style it like Discord/Slack with dark sidebar and clean message area.',
    category: 'apps',
    tags: ['chat', 'realtime', 'sidebar', 'messages'],
    icon: 'MessageSquare',
  },

  // E-Commerce
  {
    id: 'product-listing',
    title: 'Product Listing',
    description: 'Product catalog with grid view, filters, and search',
    prompt: 'Build an e-commerce product listing page with: a top search bar with category dropdown, a left filter panel (price range, brand, size, color), a product grid with product cards (image, name, price, rating, add-to-cart), sorting options, and pagination. Add quick view modal on hover. Use clean, shoppable design.',
    category: 'ecommerce',
    tags: ['catalog', 'filters', 'grid', 'search', 'pagination'],
    icon: 'ShoppingCart',
  },
  {
    id: 'product-detail',
    title: 'Product Detail',
    description: 'Product page with gallery, reviews, and related items',
    prompt: 'Create a product detail page with: an image gallery with thumbnails and zoom, a product info section with price, size/color selectors, and add-to-cart button, a reviews section with star ratings and user comments, a related products carousel, and a sticky bottom bar on mobile with CTA.',
    category: 'ecommerce',
    tags: ['gallery', 'reviews', 'product', 'carousel', 'sticky'],
    icon: 'Image',
  },
  {
    id: 'cart-checkout',
    title: 'Cart & Checkout',
    description: 'Shopping cart with multi-step checkout process',
    prompt: 'Build a shopping cart and checkout flow with: a cart view with quantity controls and remove buttons, a summary sidebar with subtotal/tax/shipping, a 3-step checkout (Cart → Shipping → Payment), input forms for address and payment info, and an order confirmation page. Add progress indicator and form validation.',
    category: 'ecommerce',
    tags: ['cart', 'checkout', 'form', 'steps', 'validation'],
    icon: 'CreditCard',
  },

  // Auth & Users
  {
    id: 'login-register',
    title: 'Login & Register',
    description: 'Auth pages with social login and password management',
    prompt: 'Create a authentication UI with: a login form with email/password and "Remember me" checkbox, a registration form with name/email/password/confirm fields, social login buttons (Google, GitHub), a password reset flow, form validation with error messages, and smooth page transitions. Use a centered card layout with background gradient.',
    category: 'auth',
    tags: ['login', 'register', 'oauth', 'reset', 'validation'],
    icon: 'UserCheck',
  },
  {
    id: 'profile-settings',
    title: 'Profile & Settings',
    description: 'User profile page with avatar, bio, and preferences',
    prompt: 'Build a user profile page with: an avatar upload area with preview, a form for name/bio/location/website fields, a tabbed settings area (Account, Security, Notifications, Appearance), toggle switches for notification preferences, and a danger zone section for account deletion. Include inline editing and save indicators.',
    category: 'auth',
    tags: ['profile', 'avatar', 'settings', 'tabs', 'inline-edit'],
    icon: 'UserCheck',
  },

  // Forms & Input
  {
    id: 'multi-step-form',
    title: 'Multi-Step Form',
    description: 'Wizard-style form with step navigation and validation',
    prompt: 'Create a multi-step wizard form with: a step progress indicator at top, animated step transitions, form sections (Personal Info, Address, Preferences, Review), input validation with error messages on each step, a review step showing all entered data, and a success confirmation screen. Use card-based layout with clearly separated sections.',
    category: 'forms',
    tags: ['wizard', 'steps', 'validation', 'animation', 'progress'],
    icon: 'FileText',
  },
  {
    id: 'survey-builder',
    title: 'Survey Builder',
    description: 'Interactive form builder with various input types',
    prompt: 'Build a survey/dynamic form with: multiple question types (text, multiple choice, checkbox, dropdown, rating stars, NPS scale), required field indicators, real-time character count on text fields, conditional logic (show/hide questions based on answers), and a results summary at submission. Style it for high engagement.',
    category: 'forms',
    tags: ['survey', 'dynamic', 'conditional', 'rating', 'questions'],
    icon: 'MessageSquare',
  },

  // Data Display
  {
    id: 'data-table',
    title: 'Advanced Data Table',
    description: 'Full-featured table with sorting, filtering, and export',
    prompt: 'Create a feature-rich data table with: sortable column headers (click to sort asc/desc), a search input with debounced filtering, column visibility toggles, a row selection with checkboxes, bulk actions bar (Delete, Export, Archive), pagination with page size selector, and an export to CSV button. Use striped rows and hover highlights.',
    category: 'data',
    tags: ['table', 'sort', 'filter', 'export', 'paginate', 'bulk'],
    icon: 'Table',
  },
  {
    id: 'charts-dashboard',
    title: 'Charts & Visualizations',
    description: 'Multiple chart types with toggles and legends',
    prompt: 'Build a data visualization dashboard with: a line chart for trends (with toggleable data series), a bar chart for comparisons, a pie chart for distribution, a heatmap for density data, chart customization controls (time range, aggregation), interactive legends, and tooltips on hover. Use consistent color scheme across all charts.',
    category: 'data',
    tags: ['charts', 'visualization', 'line', 'bar', 'pie', 'interactive'],
    icon: 'BarChart3',
  },

  // Layouts
  {
    id: 'sidebar-layout',
    title: 'App Shell Layout',
    description: 'Full app shell with sidebar, header, and content area',
    prompt: 'Build a complete app shell layout with: a fixed left sidebar with icon+label navigation items, collapsible to icons-only mode, a top header bar with breadcrumbs, search bar, and user avatar dropdown, a main content area with responsive padding, and a right panel for contextual info. Support dark mode toggle.',
    category: 'layouts',
    tags: ['sidebar', 'shell', 'responsive', 'collapsible', 'dark-mode'],
    icon: 'Layers',
  },
  {
    id: 'grid-layout',
    title: 'CSS Grid Showcase',
    description: 'Responsive magazine-style grid layout',
    prompt: 'Create a magazine-style responsive grid layout with: a featured hero card spanning 2 columns, a grid of smaller cards in a masonry-like arrangement, varying card sizes and aspect ratios, smooth hover effects with elevation changes, category badges on cards, and responsive breakpoints (4-col → 2-col → 1-col). Use editorial typography.',
    category: 'layouts',
    tags: ['grid', 'masonry', 'responsive', 'cards', 'editorial'],
    icon: 'Box',
  },
];

interface PromptTemplatesProps {
  onSelect?: (prompt: string) => void;
  className?: string;
}

export function PromptTemplates({ onSelect, className }: PromptTemplatesProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('landing-pages');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let items = TEMPLATES;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    } else {
      items = items.filter((t) => t.category === activeCategory);
    }
    return items;
  }, [activeCategory, searchQuery]);

  return (
    <div className={cn('flex flex-col h-full bg-[var(--app-panel-2)] select-none', className)}>
      {/* Header */}
      <div className="px-4 h-11 flex items-center justify-between border-b border-[var(--app-border)] shrink-0">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--app-text-dim)]">
          Templates
        </h3>
      </div>

      {/* Search */}
      <div className="px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)]">
          <Search className="h-3.5 w-3.5 text-[var(--app-text-dim)] shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="bg-transparent border-0 text-[11px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none w-full"
          />
        </div>
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="px-4 pb-2 shrink-0">
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon] || Layers;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'h-7 px-2.5 rounded-[6px] text-[10px] font-medium transition-all flex items-center gap-1.5',
                    activeCategory === cat.id
                      ? 'bg-[var(--app-accent)] text-[#071006] shadow-sm'
                      : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] border border-[var(--app-border)]'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-[var(--app-text-dim)]" />
            </div>
            <p className="text-[12px] text-[var(--app-text-muted)]">
              {searchQuery ? 'No matching templates' : 'No templates in this category'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => onSelect?.(template.prompt)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: PromptTemplate;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'w-full text-left p-3 rounded-[6px] border transition-all group',
        isHovered
          ? 'border-[var(--app-accent)]/30 bg-[var(--app-surface)] shadow-sm'
          : 'border-[var(--app-border)] bg-[var(--app-panel)]'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 border transition-colors',
          isHovered
            ? 'bg-[var(--app-accent-soft)] border-[var(--app-accent)]/20 text-[var(--app-accent)]'
            : 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text-dim)]'
        )}>
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[12px] font-medium text-[var(--app-text)] truncate">
              {template.title}
            </p>
          </div>
          <p className="text-[10px] text-[var(--app-text-dim)] leading-relaxed line-clamp-2 mb-1.5">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[8px] font-medium text-[var(--app-text-muted)] uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className={cn(
          'shrink-0 mt-1.5 transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}>
          <Code2 className="h-4 w-4 text-[var(--app-accent)]" />
        </div>
      </div>
    </button>
  );
}

export { TEMPLATES, type PromptTemplate, type TemplateCategory };
