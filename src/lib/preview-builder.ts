/**
 * Preview Builder
 *
 * Builds HTML for iframe preview with Babel transformation.
 * Includes React runtime and error capture.
 */

export function buildPreviewHTML(code: string): string {
  // Handle empty or invalid code
  if (!code || code.trim() === '') {
    code = `
export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Welcome to DeBuggAI</h1>
      <p style={{ marginTop: 8, color: '#6b7280' }}>
        Start building in the editor, or ask the assistant to generate the app.
      </p>
    </div>
  );
}
    `.trim();
  }

  const serializedCode = JSON.stringify(code);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: transparent;
      padding: 16px;
    }
    #root {
      min-height: 100vh;
    }
    .error-display {
      padding: 24px;
      color: #dc2626;
      background: #fee2e2;
      border-radius: 8px;
      font-family: system-ui;
    }
    .error-display h3 {
      margin: 0 0 8px 0;
    }
    .error-display p {
      margin: 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="root">Loading...</div>

  <script>
    const USER_CODE = ${serializedCode};

    // Error capture
    window.onerror = function(message, source, lineno, colno, error) {
      window.parent.postMessage({
        type: 'runtime-error',
        payload: {
          message: String(message),
          source: String(source),
          lineno: Number(lineno),
          colno: Number(colno),
          error: error ? String(error) : undefined
        }
      }, '*');
      return true;
    };

    // Capture unhandled promise rejections
    window.onunhandledrejection = function(event) {
      window.parent.postMessage({
        type: 'runtime-error',
        payload: {
          message: 'Unhandled Promise Rejection: ' + String(event.reason),
          source: 'Promise',
        }
      }, '*');
    };

    // Capture console errors
    const originalError = console.error;
    console.error = function(...args) {
      window.parent.postMessage({
        type: 'runtime-error',
        payload: {
          message: args.map(a => String(a)).join(' '),
          source: 'console.error',
        }
      }, '*');
      originalError.apply(console, args);
    };

    try {
      const { code: compiled } = Babel.transform(USER_CODE, {
        presets: [
          ['env', { modules: 'commonjs' }],
          'react',
          'typescript',
        ],
        sourceType: 'module',
        filename: 'App.tsx',
      });

      // Provide commonjs globals
      const exports = {};
      const module = { exports };

      // Evaluate compiled code
      const fn = new Function('React', 'ReactDOM', 'exports', 'module', compiled);
      fn(React, ReactDOM, exports, module);

      // If code exports a component, render it
      const Component = module.exports?.default || module.exports;
      if (Component && typeof Component === 'function') {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Component));
      } else {
        throw new Error('Code must export a React component as default or named export');
      }
    } catch (error) {
      console.error('Preview render error:', error);
      window.parent.postMessage({
        type: 'runtime-error',
        payload: {
          message: 'Render error: ' + error.message,
          source: error.stack || 'unknown',
        }
      }, '*');

      // Show error in preview
      document.getElementById('root').innerHTML =
        '<div class="error-display">' +
        '<h3>Preview Error</h3>' +
        '<p>' + error.message + '</p>' +
        '</div>';
    }
  </script>
</body>
</html>
  `.trim();
}

/**
 * Build preview for TypeScript/TSX code
 */
export function buildPreviewTSX(code: string): string {
  return buildPreviewHTML(code);
}

/**
 * Build preview for JavaScript/JSX code
 */
export function buildPreviewJSX(code: string): string {
  return buildPreviewHTML(code);
}
