/**
 * Real File Operations for Project File Tree
 *
 * Handles create, read, update, delete operations for project files
 */

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
  status?: 'added' | 'modified' | 'deleted' | 'unchanged';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjectFileTree {
  files: Record<string, ProjectFile>;
  rootPath: string;
}

export type FileOperation = {
  type: 'create' | 'update' | 'delete' | 'rename' | 'move';
  filePath: string;
  oldPath?: string; // for rename/move operations
  content?: string; // for create/update operations
};

/**
 * Create a new file in the project
 */
export function createFile(
  tree: ProjectFileTree,
  filePath: string,
  content: string = '',
  language?: string
): ProjectFileTree {
  const normalizedPath = normalizePath(filePath);
  if (!normalizedPath) return tree;

  const newFile: ProjectFile = {
    path: normalizedPath,
    content,
    language: language || detectLanguage(normalizedPath),
    status: 'added',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    ...tree,
    files: {
      ...tree.files,
      [normalizedPath]: newFile,
    },
  };
}

/**
 * Update an existing file's content
 */
export function updateFile(
  tree: ProjectFileTree,
  filePath: string,
  content: string
): ProjectFileTree {
  const normalizedPath = normalizePath(filePath);
  const existingFile = tree.files[normalizedPath];

  if (!existingFile) {
    return createFile(tree, normalizedPath, content);
  }

  return {
    ...tree,
    files: {
      ...tree.files,
      [normalizedPath]: {
        ...existingFile,
        content,
        status: existingFile.status === 'added' ? 'added' : 'modified',
        updatedAt: new Date(),
      },
    },
  };
}

/**
 * Delete a file from the project
 */
export function deleteFile(
  tree: ProjectFileTree,
  filePath: string
): ProjectFileTree {
  const normalizedPath = normalizePath(filePath);
  const existingFile = tree.files[normalizedPath];

  if (!existingFile) return tree;

  const newFiles = { ...tree.files };

  if (existingFile.status === 'added') {
    // If file was newly added, just remove it completely
    delete newFiles[normalizedPath];
  } else {
    // Mark as deleted instead of removing
    newFiles[normalizedPath] = {
      ...existingFile,
      status: 'deleted',
      updatedAt: new Date(),
    };
  }

  return {
    ...tree,
    files: newFiles,
  };
}

/**
 * Rename/move a file
 */
export function renameFile(
  tree: ProjectFileTree,
  oldPath: string,
  newPath: string
): ProjectFileTree {
  const normalizedOldPath = normalizePath(oldPath);
  const normalizedNewPath = normalizePath(newPath);
  const existingFile = tree.files[normalizedOldPath];

  if (!existingFile || !normalizedNewPath) return tree;

  const newFiles = { ...tree.files };
  delete newFiles[normalizedOldPath];

  newFiles[normalizedNewPath] = {
    ...existingFile,
    path: normalizedNewPath,
    status: existingFile.status === 'added' ? 'added' : 'modified',
    updatedAt: new Date(),
  };

  return {
    ...tree,
    files: newFiles,
  };
}

/**
 * Batch apply multiple file operations
 */
export function applyOperations(
  tree: ProjectFileTree,
  operations: FileOperation[]
): ProjectFileTree {
  return operations.reduce((currentTree, operation) => {
    switch (operation.type) {
      case 'create':
        return createFile(
          currentTree,
          operation.filePath,
          operation.content || '',
          operation.content ? undefined : undefined // language will be detected
        );
      case 'update':
        return updateFile(currentTree, operation.filePath, operation.content || '');
      case 'delete':
        return deleteFile(currentTree, operation.filePath);
      case 'rename':
      case 'move':
        return renameFile(currentTree, operation.oldPath!, operation.filePath);
      default:
        return currentTree;
    }
  }, tree);
}

/**
 * Get file content by path
 */
export function getFileContent(tree: ProjectFileTree, filePath: string): string | null {
  const normalizedPath = normalizePath(filePath);
  const file = tree.files[normalizedPath];
  return file?.status !== 'deleted' ? file?.content || null : null;
}

/**
 * Check if file exists
 */
export function fileExists(tree: ProjectFileTree, filePath: string): boolean {
  const normalizedPath = normalizePath(filePath);
  const file = tree.files[normalizedPath];
  return file !== undefined && file.status !== 'deleted';
}

/**
 * List all files in a directory
 */
export function listFilesInDirectory(tree: ProjectFileTree, dirPath: string): string[] {
  const normalizedDir = normalizePath(dirPath);
  const prefix = normalizedDir ? `${normalizedDir}/` : '';

  return Object.keys(tree.files)
    .filter(path => path.startsWith(prefix) && tree.files[path]?.status !== 'deleted')
    .map(path => path.slice(prefix.length))
    .filter(path => !path.includes('/')); // Only immediate children
}

/**
 * Get all modified/added files for saving
 */
export function getModifiedFiles(tree: ProjectFileTree): ProjectFile[] {
  return Object.values(tree.files).filter(
    file => file.status === 'added' || file.status === 'modified'
  );
}

/**
 * Reset file status to unchanged (after save)
 */
export function markAllAsUnchanged(tree: ProjectFileTree): ProjectFileTree {
  const newFiles: Record<string, ProjectFile> = {};

  Object.entries(tree.files).forEach(([path, file]) => {
    if (file.status !== 'deleted') {
      newFiles[path] = {
        ...file,
        status: 'unchanged',
      };
    }
  });

  return {
    ...tree,
    files: newFiles,
  };
}

/**
 * Normalize file path
 */
function normalizePath(path: string): string {
  const trimmed = path.trim().replace(/^(\.\/)+/, '');
  if (!trimmed) return '';
  return trimmed.replace(/\\/g, '/');
}

/**
 * Detect language from file extension
 */
function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'typescript';
    case 'jsx':
    case 'js':
      return 'javascript';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    default:
      return 'text';
  }
}

/**
 * Initialize a new project file tree
 */
export function createEmptyProject(rootPath: string = 'src'): ProjectFileTree {
  return {
    files: {},
    rootPath,
  };
}

/**
 * Create project from initial files
 */
export function createProjectFromFiles(
  files: Record<string, string>,
  rootPath: string = 'src'
): ProjectFileTree {
  const tree = createEmptyProject(rootPath);

  Object.entries(files).forEach(([path, content]) => {
    tree.files[path] = {
      path,
      content,
      language: detectLanguage(path),
      status: 'unchanged',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  return tree;
}
