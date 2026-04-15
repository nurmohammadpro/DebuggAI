/**
 * Preview Builder
 *
 * Builds HTML for iframe preview with Babel transformation.
 * Includes React runtime and error capture.
 */

export function buildPreviewHTML(code: string): string {
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
      background: #f5f5f5;
      padding: 20px;
    }
    #root {
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
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
      // User code
      ${code}

      // If code exports a component, render it
      if (typeof module !== 'undefined' && module.exports) {
        const Component = module.exports.default || module.exports;
        if (Component && typeof Component === 'function') {
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(Component));
        }
      }
    } catch (error) {
      window.parent.postMessage({
        type: 'runtime-error',
        payload: {
          message: 'Render error: ' + error.message,
          source: error.stack || 'unknown',
        }
      }, '*');
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
