import Script from 'next/script';

export function ThemeInitScript({ storageKey = 'theme' }: { storageKey?: string }) {
  const code = `
  (function () {
    try {
      var key = ${JSON.stringify(storageKey)};
      var theme = localStorage.getItem(key);
      if (theme !== 'light' && theme !== 'dark') theme = 'dark';
      var root = document.documentElement;
      if (theme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
      root.style.colorScheme = theme;
    } catch (e) {}
  })();
  `;

  return (
    <Script
      id="debuggai-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}

