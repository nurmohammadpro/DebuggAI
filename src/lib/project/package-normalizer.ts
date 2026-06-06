type PackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

const NEXT_DEPENDENCIES: Record<string, string> = {
  next: '^16.2.7',
  react: '^19.2.4',
  'react-dom': '^19.2.4',
};

const COMMON_DEPENDENCIES: Record<string, string> = {
  '@radix-ui/react-slot': '^1.2.4',
  'class-variance-authority': '^0.7.1',
  clsx: '^2.1.1',
  'tailwind-merge': '^3.4.0',
  'lucide-react': '^0.552.0',
  'framer-motion': '^12.23.24',
  recharts: '^3.4.1',
  'date-fns': '^4.1.0',
};

const TYPESCRIPT_DEV_DEPENDENCIES: Record<string, string> = {
  typescript: '^5.9.3',
  '@types/node': '^20.19.25',
  '@types/react': '^19.2.7',
  '@types/react-dom': '^19.2.3',
};

const TAILWIND_V3_DEV_DEPENDENCIES: Record<string, string> = {
  tailwindcss: '^3.4.18',
  postcss: '^8.5.6',
  autoprefixer: '^10.4.22',
};

const TAILWIND_V4_DEV_DEPENDENCIES: Record<string, string> = {
  tailwindcss: '^4.1.17',
  '@tailwindcss/postcss': '^4.1.17',
};

export function normalizePreviewFiles(files: Record<string, string>): Record<string, string> {
  const normalized = { ...files };
  const packagePath = findPackagePath(normalized);
  if (!packagePath) return normalized;

  const packageJson = parsePackageJson(normalized[packagePath]);
  if (!packageJson) return normalized;

  packageJson.scripts = { ...(packageJson.scripts || {}) };

  packageJson.dependencies = { ...(packageJson.dependencies || {}) };
  packageJson.devDependencies = { ...(packageJson.devDependencies || {}) };

  if (isNextProject(normalized)) {
    packageJson.scripts.dev = 'next dev -H 0.0.0.0 -p 3000';
    packageJson.scripts.build ||= 'next build';
    packageJson.scripts.start = 'next start -H 0.0.0.0 -p 3000';
    addMissing(packageJson.dependencies, NEXT_DEPENDENCIES);
  }

  const fullText = Object.entries(normalized)
    .filter(([path]) => path !== packagePath)
    .map(([, content]) => content)
    .join('\n');

  for (const [name, version] of Object.entries(COMMON_DEPENDENCIES)) {
    if (importsPackage(fullText, name)) {
      packageJson.dependencies[name] ||= version;
    }
  }

  if (usesTypeScript(normalized)) {
    addMissing(packageJson.devDependencies, TYPESCRIPT_DEV_DEPENDENCIES);
  }

  if (usesTailwindV4(normalized)) {
    addMissing(packageJson.devDependencies, TAILWIND_V4_DEV_DEPENDENCIES);
  }

  if (usesTailwindV3(normalized)) {
    addMissing(packageJson.devDependencies, TAILWIND_V3_DEV_DEPENDENCIES);
  }

  normalized[packagePath] = `${JSON.stringify(packageJson, null, 2)}\n`;
  return normalized;
}

function findPackagePath(files: Record<string, string>) {
  return Object.keys(files).find((path) => path === 'package.json' || path.endsWith('/package.json'));
}

function parsePackageJson(content = ''): PackageJson | null {
  const cleaned = content
    .replace(/^\s*(?:\/\/|#)\s*(?:file:\s*)?package\.json\s*\r?\n/i, '')
    .replace(/^\s*\/\*\s*(?:file:\s*)?package\.json\s*\*\/\s*\r?\n/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as PackageJson;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function addMissing(target: Record<string, string>, packages: Record<string, string>) {
  for (const [name, version] of Object.entries(packages)) {
    target[name] ||= version;
  }
}

function importsPackage(source: string, packageName: string) {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const subpath = `(?:\\/[^'"]*)?`;
  return new RegExp(`(?:from\\s+['"]${escaped}${subpath}['"]|import\\s*\\(\\s*['"]${escaped}${subpath}['"]\\s*\\)|require\\(\\s*['"]${escaped}${subpath}['"]\\s*\\))`).test(source);
}

function isNextProject(files: Record<string, string>) {
  return Object.keys(files).some((path) => /^(src\/)?app\/(layout|page)\.(tsx|ts|jsx|js)$/.test(path));
}

function usesTypeScript(files: Record<string, string>) {
  return Object.keys(files).some((path) => /\.(tsx|ts)$/.test(path));
}

function usesTailwindV4(files: Record<string, string>) {
  const postcss = files['postcss.config.mjs'] || files['postcss.config.js'] || '';
  const globals = Object.entries(files)
    .filter(([path]) => path.endsWith('.css'))
    .map(([, content]) => content)
    .join('\n');

  return postcss.includes('@tailwindcss/postcss') || /@import\s+['"]tailwindcss['"]/.test(globals);
}

function usesTailwindV3(files: Record<string, string>) {
  const hasTailwindConfig = Object.keys(files).some((path) => /^tailwind\.config\.(ts|js|mjs|cjs)$/.test(path));
  const postcss = files['postcss.config.mjs'] || files['postcss.config.js'] || '';
  const globals = Object.entries(files)
    .filter(([path]) => path.endsWith('.css'))
    .map(([, content]) => content)
    .join('\n');

  return hasTailwindConfig || postcss.includes('autoprefixer') || /@tailwind\s+(base|components|utilities)/.test(globals);
}
