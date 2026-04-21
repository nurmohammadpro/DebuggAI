export type FileTreeNode =
  | { type: 'folder'; name: string; path: string; children: FileTreeNode[] }
  | { type: 'file'; name: string; path: string };

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
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  return toNodes(root);
}

