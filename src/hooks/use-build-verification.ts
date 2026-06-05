'use client';

import { useCallback, useRef, useState } from 'react';
import { useGeneration } from '@/hooks/use-generation';

const MAX_AUTO_FIX_RETRIES = 3;

interface UseBuildVerificationOptions {
  onAutoFixing?: () => void;
  onAutoFixComplete?: () => void;
  onAutoFixFailed?: (error: string) => void;
}

export function useBuildVerification(options: UseBuildVerificationOptions = {}) {
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [fixAttempt, setFixAttempt] = useState(0);
  const [lastFixError, setLastFixError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const { generate } = useGeneration({
    onDone: () => {
      setIsAutoFixing(false);
      options.onAutoFixComplete?.();
    },
    onError: (err) => {
      setIsAutoFixing(false);
      setLastFixError(err.message);
      options.onAutoFixFailed?.(err.message);
    },
  });

  const triggerAutoFix = useCallback(async (buildErrors: string[]) => {
    if (retryCountRef.current >= MAX_AUTO_FIX_RETRIES) {
      const msg = `Auto-fix failed after ${MAX_AUTO_FIX_RETRIES} attempts. Please fix manually in the code editor.`;
      setLastFixError(msg);
      options.onAutoFixFailed?.(msg);
      return;
    }

    retryCountRef.current++;
    setFixAttempt(retryCountRef.current);
    setIsAutoFixing(true);
    options.onAutoFixing?.();

    const errorText = buildErrors.slice(0, 30).join('\n');
    const fixPrompt = `The build failed with these TypeScript errors:\n\n\`\`\`\n${errorText}\n\`\`\`\n\nPlease fix the code. Check for missing imports, type mismatches, and syntax errors. Output the corrected files.`;

    try {
      await generate({ prompt: fixPrompt, persistUserMessage: false });
    } catch {
      // Error handled by onError callback above
    }
  }, [generate, options]);

  const resetRetries = useCallback(() => {
    retryCountRef.current = 0;
    setFixAttempt(0);
    setLastFixError(null);
  }, []);

  return {
    isAutoFixing,
    fixAttempt,
    lastFixError,
    maxRetries: MAX_AUTO_FIX_RETRIES,
    triggerAutoFix,
    resetRetries,
  };
}
