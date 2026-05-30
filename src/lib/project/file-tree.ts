export type FileTreeNode =
  | { type: 'folder'; name: string; path: string; children: FileTreeNode[] }
  | { type: 'file'; name: string; path: string };

/**
 * Detect the entry point of a project from a list of file paths
 * Returns the path to the most likely entry point file (e.g., index.html, App.tsx)
 */
export function detectEntryPoint(paths: string[]): string | null {
  if (paths.length === 0) return null;

  // Priority list of common entry points
  const entryPointPatterns = [
    // Next.js App Router (highest priority)
    /^app\/page\.tsx?$/,
    /^app\/layout\.tsx?$/,
    /^src\/app\/page\.tsx?$/,
    /^src\/app\/layout\.tsx?$/,

    // Next.js Pages Router
    /^pages\/index\.tsx?$/,
    /^src\/pages\/index\.tsx?$/,

    // React
    /^src\/App\.tsx?$/,
    /^App\.tsx?$/,
    /^src\/index\.(tsx?|jsx?)$/,
    /^index\.(tsx?|jsx?)$/,

    // Vue
    /^src\/App\.vue$/,
    /^App\.vue$/,
    /^src\/main\.ts$/,
    /^src\/main\.js$/,

    // HTML
    /^index\.html$/,
    /^src\/index\.html$/,

    // Node.js
    /^src\/index\.ts$/,
    /^index\.ts$/,
    /^src\/index\.js$/,
    /^index\.js$/,
    /^src\/main\.ts$/,
    /^main\.ts$/,
    /^src\/main\.js$/,
    /^main\.js$/,

    // Svelte
    /^src\/App\.svelte$/,
    /^App\.svelte$/,
    /^src\/main\.ts$/,
    /^src\/main\.js$/,

    // Astro
    /^src\/pages\/index\.astro$/,
    /^src\/layouts\/Layout\.astro$/,
  ];

  // First, try to match against entry point patterns
  for (const pattern of entryPointPatterns) {
    const match = paths.find(path => pattern.test(path));
    if (match) return match;
  }

  // Fallback: look for files with "index", "main", "app", or "App" in the name
  const fallbackPatterns = [
    /index\.(tsx?|jsx?|html|vue|svelte|astro)$/,
    /main\.(tsx?|jsx?|ts|js)$/,
    /App\.(tsx?|jsx?|vue|svelte)$/,
    /layout\.(tsx?|jsx?)$/,
    /page\.(tsx?|jsx?|vue|svelte|astro)$/,
  ];

  for (const pattern of fallbackPatterns) {
    const match = paths.find(path => pattern.test(path));
    if (match) return match;
  }

  // Final fallback: return the first file in the list that's not a config file
  const ignoredPatterns = [
    /\.json$/,
    /\.config\./,
    /\.lock$/,
    /^\.env/,
    /^\.git/,
    /\.md$/,
  ];

  const nonConfigFiles = paths.filter(path => {
    return !ignoredPatterns.some(pattern => pattern.test(path));
  });

  if (nonConfigFiles.length > 0) {
    return nonConfigFiles[0];
  }

  // Last resort: return the first file
  return paths[0];
}

export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: { children: Map<string, any> } = { children: new Map() };

  for (const fullPath of paths) {
    const parts = fullPath.split('/').filter(Boolean);
    let current: any = root;
    let builtPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      builtPath = builtPath ? `${builtPath}/${part}` : part;
      const isLeaf = i === parts.length - 1;
      if (isLeaf) {
        current.children.set(part, {
          type: 'file',
          name: part,
          path: fullPath,
        });
      } else {
        if (!current.children.has(part)) {
          current.children.set(part, {
            type: 'folder',
            name: part,
            path: builtPath,
            children: new Map(),
          });
        }
        current = current.children.get(part);
      }
    }
  }

  const toNodes = (node: any): FileTreeNode[] => {
    const list: FileTreeNode[] = [];
    for (const entry of node.children.values()) {
      if (entry.type === 'file') {
        list.push(entry);
      } else {
        list.push({
          type: 'folder',
          name: entry.name,
          path: entry.path,
          children: toNodes(entry),
        });
      }
    }
    return list.sort((a, b) => {
      // Folders first, then alphabetical
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  return toNodes(root);
}

/**
 * Get file icon based on extension
 * Returns appropriate Lucide React icon component
 */
export function getFileIcon(name: string, isFolder: boolean = false): string {
  if (isFolder) {
    return 'Folder';
  }

  const ext = name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
    case 'cjs':
    case 'mjs':
    case 'html':
    case 'htm':
    case 'xml':
    case 'py':
    case 'pyc':
    case 'pyd':
    case 'go':
    case 'rs':
    case 'rb':
    case 'php':
    case 'java':
    case 'jar':
    case 'kt':
    case 'kts':
    case 'swift':
    case 'c':
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'vue':
    case 'svelte':
    case 'astro':
      return 'FileCode';

    case 'css':
    case 'scss':
    case 'sass':
      return 'Palette';
    case 'less':
      return 'FileJson';

    case 'json':
    case 'yaml':
    case 'yml':
      return 'FileJson';

    case 'md':
    case 'markdown':
    case 'txt':
    case 'pdf':
      return 'FileText';

    case 'config':
    case 'conf':
      return 'Settings';
    case 'env':
      return 'Shield';

    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'ico':
    case 'webp':
      return 'Image';

    case 'mp4':
    case 'webm':
    case 'mov':
    case 'avi':
      return 'Video';

    case 'mp3':
    case 'wav':
    case 'ogg':
      return 'Music';

    case 'zip':
    case 'tar':
    case 'gz':
      return 'Archive';

    case 'lock':
    case 'yarn':
      return 'Shield';

    default:
      return 'File';
  }
}

