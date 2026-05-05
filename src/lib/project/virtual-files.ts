export type VirtualFile = {
  path: string;
  content: string;
  language?: string;
  status?: 'added' | 'modified' | 'deleted' | 'unchanged';
};

export type VirtualProjectFiles = {
  entryPath: string;
  files: Record<string, VirtualFile>;
};

const DEFAULT_ENTRY = 'src/App.tsx';

export function extractVirtualFiles(raw: string, base?: VirtualProjectFiles): VirtualProjectFiles {
  const files = new Map<string, VirtualFile>();

  const pushFile = (path: string, content: string, language?: string) => {
    const normalized = normalizePath(path);
    if (!normalized) return;
    
    const formattedContent = content.replace(/\s+$/, '') + '\n';
    let status: VirtualFile['status'] = 'added';
    
    if (base && base.files[normalized]) {
      const original = base.files[normalized];
      status = original.content === formattedContent ? 'unchanged' : 'modified';
    }

    files.set(normalized, {
      path: normalized,
      content: formattedContent,
      language: language || languageFromPath(normalized),
      status,
    });
  };

  // 1) Markdown code fences with optional filename=...
  const fenceRegex =
    /```([a-zA-Z0-9_-]+)?(?:[^\n]*?filename=(?:"|')([^"']+)(?:"|'))?[^\n]*\n([\s\S]*?)```/g;
  for (const match of raw.matchAll(fenceRegex)) {
    const language = match[1] || undefined;
    const hintedName = match[2] || undefined;
    const code = (match[3] || '').trimEnd();
    if (!code) continue;

    const extractedName =
      hintedName ||
      extractLeadingFilenameComment(code) ||
      extractFileHeaderMarker(code);

    pushFile(extractedName || DEFAULT_ENTRY, code, language);
  }

  // 2) If no fences, attempt to split on file header markers.
  if (files.size === 0) {
    const split = splitByFileMarkers(raw);
    if (split.length > 0) {
      for (const chunk of split) {
        pushFile(chunk.path, chunk.content, languageFromPath(chunk.path));
      }
    } else {
      pushFile(DEFAULT_ENTRY, raw.trimEnd(), 'typescript');
    }
  }

  // 3) Detect deleted files (present in base but not in current result)
  if (base) {
    for (const path of Object.keys(base.files)) {
      if (!files.has(path)) {
        files.set(path, {
          ...base.files[path],
          status: 'deleted',
        });
      }
    }
  }

  const entryPath =
    files.has(DEFAULT_ENTRY) ? DEFAULT_ENTRY : [...files.keys()][0] || DEFAULT_ENTRY;

  return {
    entryPath,
    files: Object.fromEntries([...files.entries()].map(([k, v]) => [k, v])),
  };
}

export function serializeVirtualFiles(project: VirtualProjectFiles) {
  const ordered = Object.keys(project.files).sort();
  if (ordered.length === 1) {
    const only = project.files[ordered[0]!];
    return only?.content || '';
  }

  return ordered
    .map((path) => {
      const file = project.files[path];
      const language = file?.language || languageFromPath(path) || '';
      const fenceLang = language ? language : '';
      return [
        `// File: ${path}`,
        '```' + fenceLang,
        (file?.content || '').replace(/\s+$/, ''),
        '```',
        '',
      ].join('\n');
    })
    .join('\n');
}

function normalizePath(path: string) {
  const trimmed = path.trim().replace(/^(\.\/)+/, '');
  if (!trimmed) return '';
  return trimmed.replace(/\\/g, '/');
}

function languageFromPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.ts')) return 'typescript';
  if (lower.endsWith('.jsx')) return 'javascript';
  if (lower.endsWith('.js')) return 'javascript';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md')) return 'markdown';
  return undefined;
}

function extractLeadingFilenameComment(code: string) {
  const firstLine = code.split('\n', 1)[0] || '';
  // Examples: // src/App.tsx, // File: src/App.tsx
  const m =
    firstLine.match(/^\s*\/\/\s*(?:file:\s*)?([\w./-]+\.[a-zA-Z0-9]+)\s*$/i) ||
    firstLine.match(/^\s*\/\*\s*(?:file:\s*)?([\w./-]+\.[a-zA-Z0-9]+)\s*\*\/\s*$/i);
  return m?.[1] || null;
}

function extractFileHeaderMarker(code: string) {
  const marker = code.match(/^\s*(?:#|\/\/)\s*File:\s*([\w./-]+\.[a-zA-Z0-9]+)\s*$/im);
  return marker?.[1] || null;
}

function splitByFileMarkers(raw: string) {
  const lines = raw.split('\n');
  const chunks: Array<{ path: string; content: string }> = [];

  let currentPath: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentPath) return;
    const content = currentLines.join('\n').trimEnd();
    if (content) chunks.push({ path: currentPath, content });
  };

  const markerRegex =
    /^\s*(?:\/\/|#)\s*File:\s*([\w./-]+\.[a-zA-Z0-9]+)\s*$/i;

  for (const line of lines) {
    const m = line.match(markerRegex);
    const path = m?.[1];
    if (path) {
      flush();
      currentPath = normalizePath(path);
      currentLines = [];
      continue;
    }
    currentLines.push(line);
  }

  flush();
  return chunks;
}
