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

const DEFAULT_ENTRY = 'app/page.tsx';
const IGNORED_PATH_RE = /(^|\/)(?:\.next|node_modules|\.turbo|dist|build|out|\.vercel|\.cache)(?:\/|$)/;
const FILE_PATH_RE = '[\\w./()\\-\\[\\]]+';

export function shouldIgnorePreviewPath(path: string): boolean {
  const normalized = normalizePath(path);
  return IGNORED_PATH_RE.test(normalized);
}

export function filterIgnoredPreviewPaths<T>(files: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(files).filter(([path]) => !shouldIgnorePreviewPath(path)),
  );
}

export function normalizePreviewCode(code: string): string {
  return serializeVirtualFiles(extractVirtualFiles(code));
}

export function extractVirtualFiles(raw: string, base?: VirtualProjectFiles): VirtualProjectFiles {
  if (!raw.trim()) {
    return {
      entryPath: DEFAULT_ENTRY,
      files: base ? filterIgnoredPreviewPaths(base.files) : {},
    };
  }

  const files = new Map<string, VirtualFile>();

  const pushFile = (path: string, content: string, language?: string) => {
    const normalized = normalizePath(path);
    if (!normalized || shouldIgnorePreviewPath(normalized)) return;
    
    const formattedContent = stripLeadingFilenameHeader(content, normalized).replace(/\s+$/, '') + '\n';
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
  const fenceRegex = new RegExp(
    '(?:(?:^|\\n)\\s*(?:\\/\\/|#|<!--)\\s*(?:file|path):\\s*(' + FILE_PATH_RE + '\\.[a-zA-Z0-9]+)\\s*(?:-->)?\\s*\\n)?\\s*```([a-zA-Z0-9_-]+)?(?:[^\\n]*?filename=(?:"|\')([^"\']+)(?:"|\'))?[^\\n]*\\n([\\s\\S]*?)```',
    'gi',
  );
  for (const match of raw.matchAll(fenceRegex)) {
    const precedingName = match[1] || undefined;
    const language = match[2] || undefined;
    const hintedName = match[3] || undefined;
    const code = (match[4] || '').trimEnd();
    if (!code) continue;

    const extractedName =
      precedingName ||
      hintedName ||
      extractLeadingFilenameComment(code) ||
      extractFileHeaderMarker(code);

    // If the preceding marker name looks like a config explanation or
    // narration rather than a real file path, try harder to find one.
    if (!extractedName) {
      const inlineMatch = code.match(new RegExp(`^\\s*(?:\\/\\/|#)\\s*File:\\s*(${FILE_PATH_RE}\\.[a-zA-Z0-9]+)\\s*$`, 'im'));
      if (inlineMatch) {
        pushFile(inlineMatch[1], code, language);
        continue;
      }
    }

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
      // 2b) Try aggressive free-text extraction: look for any file-path-like
      //     patterns followed by code blocks, even without strict // File: markers.
      //     Some models (especially smaller ones) may write:
      //       "Here's the updated app/page.tsx:\n```tsx\n...\n```"
      const aggressive = extractFilesAggressive(raw);
      if (aggressive.length > 0) {
        for (const chunk of aggressive) {
          pushFile(chunk.path, chunk.content, languageFromPath(chunk.path));
        }
      } else {
        pushFile(DEFAULT_ENTRY, raw.trimEnd(), 'typescript');
      }
    }
  }

  // 3) Carry forward base files not mentioned in the new response as unchanged.
  //    Refactors / fixes / polishes typically only emit changed files; silently
  //    dropping everything else would strip package.json, config files, etc.
  //    from the sandbox and break the preview.
  if (base) {
    for (const path of Object.keys(base.files)) {
      if (shouldIgnorePreviewPath(path)) continue;
      if (!files.has(path)) {
        files.set(path, {
          ...base.files[path],
          status: 'unchanged',
        });
      }
    }
  }

  const entryPath =
    files.has(DEFAULT_ENTRY) ? DEFAULT_ENTRY : [...files.keys()][0] || DEFAULT_ENTRY;

  return {
    entryPath,
    files: filterIgnoredPreviewPaths(Object.fromEntries([...files.entries()].map(([k, v]) => [k, v]))),
  };
}

export function serializeVirtualFiles(project: VirtualProjectFiles) {
  const ordered = Object.keys(project.files)
    .filter((path) => !shouldIgnorePreviewPath(path))
    .sort();
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
    firstLine.match(new RegExp(`^\\s*\\/\\/\\s*(?:file:\\s*)?(${FILE_PATH_RE}\\.[a-zA-Z0-9]+)\\s*$`, 'i')) ||
    firstLine.match(new RegExp(`^\\s*\\/\\*\\s*(?:file:\\s*)?(${FILE_PATH_RE}\\.[a-zA-Z0-9]+)\\s*\\*\\/\\s*$`, 'i'));
  return m?.[1] || null;
}

function stripLeadingFilenameHeader(content: string, path: string) {
  const normalized = normalizePath(path);
  const escapedPath = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const basename = normalized.split('/').pop() || normalized;
  const escapedBase = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const firstLineMarker = new RegExp(
    `^\\s*(?:(?:\\/\\/|#)\\s*(?:file:\\s*)?(?:${escapedPath}|${escapedBase})|\\/\\*\\s*(?:file:\\s*)?(?:${escapedPath}|${escapedBase})\\s*\\*\\/)\\s*\\r?\\n`,
    'i',
  );
  return content.replace(firstLineMarker, '');
}

function extractFileHeaderMarker(code: string) {
  const marker = code.match(new RegExp(`^\\s*(?:#|\\/\\/)\\s*File:\\s*(${FILE_PATH_RE}\\.[a-zA-Z0-9]+)\\s*$`, 'im'));
  return marker?.[1] || null;
}

function extractFilesAggressive(raw: string) {
  const chunks: Array<{ path: string; content: string }> = [];

  // Pattern: file path mention followed by a code block.
  // Captures cases like:
  //   "app/page.tsx:\n```tsx\n...\n```"
  //   "**app/page.tsx**\n```tsx\n...\n```"
  //   "### components/hero.tsx\n```tsx\n...\n```"
  const segmentRegex = new RegExp(
    '(?:^|\\n)\\s*(?:\\*{1,2}|#{1,3}\\s*)?\\s*(' + FILE_PATH_RE + '\\.[a-zA-Z0-9]+)\\s*(?:\\*{1,2})?\\s*(?::)?\\s*(?:\\n|$)\\s*```[a-zA-Z0-9_-]*\\s*\\n([\\s\\S]*?)```',
    'gi',
  );

  let match: RegExpExecArray | null;
  while ((match = segmentRegex.exec(raw)) !== null) {
    const path = normalizePath(match[1] || '');
    const code = (match[2] || '').trimEnd();
    if (path && code && code.length > 20) {
      chunks.push({ path, content: code });
    }
  }

  // If the aggressive regex found nothing, try even looser: find any code block
  // and try to infer the filename from the line immediately preceding it.
  if (chunks.length === 0) {
    const looseRegex = /(?:^|\n)([^\n]{0,200}?)\n\s*```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)```/gi;
    while ((match = looseRegex.exec(raw)) !== null) {
      const preceding = (match[1] || '').trim();
      const code = (match[2] || '').trimEnd();
      if (!code || code.length < 20) continue;

      // Try to find a file path in the preceding line
      const pathMatch = preceding.match(new RegExp(`(${FILE_PATH_RE}\\.[a-zA-Z0-9]+)`));
      const path = pathMatch ? normalizePath(pathMatch[1]) : '';

      if (path) {
        chunks.push({ path, content: code });
      }
    }
  }

  return chunks;
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

  // Match various file marker styles:
  //   // File: path/to/file.tsx
  //   # File: path/to/file.tsx
  //   ### File: path/to/file.tsx
  //   // path/to/file.tsx
  //   **File: path/to/file.tsx**
  const markerRegex =
    new RegExp(`^\\s*(?:\\/\\/|#|###\\s|\\*\\*)\\s*(?:File:\\s*)?(${FILE_PATH_RE}\\.[a-zA-Z0-9]+)\\s*(?:\\*\\*)?\\s*$`, 'i');

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
