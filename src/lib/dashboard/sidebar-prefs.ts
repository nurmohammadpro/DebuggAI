export type SidebarPrefs = {
  collapsed: boolean;
  pinnedProjectIds: string[];
  pinnedChatIds: string[];
  chatTitleOverrides: Record<string, string>;
};

const STORAGE_KEY = 'debuggai.dashboard.sidebar.prefs';

const defaultPrefs: SidebarPrefs = {
  collapsed: false,
  pinnedProjectIds: [],
  pinnedChatIds: [],
  chatTitleOverrides: {},
};

export function readSidebarPrefs(): SidebarPrefs {
  if (typeof window === 'undefined') return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<SidebarPrefs>;
    return {
      collapsed: !!parsed.collapsed,
      pinnedProjectIds: Array.isArray(parsed.pinnedProjectIds) ? parsed.pinnedProjectIds : [],
      pinnedChatIds: Array.isArray(parsed.pinnedChatIds) ? parsed.pinnedChatIds : [],
      chatTitleOverrides:
        parsed.chatTitleOverrides && typeof parsed.chatTitleOverrides === 'object'
          ? (parsed.chatTitleOverrides as Record<string, string>)
          : {},
    };
  } catch {
    return defaultPrefs;
  }
}

export function writeSidebarPrefs(next: SidebarPrefs) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
