import { describe, it } from 'vitest';

describe('SessionBootstrapper', () => {
  // The bootstrapper is a side-effect-only component (returns null). It runs a
  // one-shot useEffect on mount and subscribes to onAuthStateChange.
  //
  // Testing strategy: the component is exercised through integration tests
  // (auth-flow.test.ts, middleware.test.ts) that verify the full auth lifecycle.
  // Unit-level tests for the removed helper functions (shouldClearClientSession,
  // shouldClearMissingSession) were deleted alongside them since those functions
  // encapsulated logic that was only relevant to the previous dual-client approach.
  it('is verified through integration tests', () => {
    // placeholder — actual assertions live in auth-flow.test.ts
  });
});
