import { describe, it, expect, beforeEach } from 'vitest';
import { useGenerationStore } from '@/store/generation-store';

describe('GenerationStore', () => {
  beforeEach(() => {
    useGenerationStore.getState().reset();
  });

  it('starts with empty state', () => {
    const state = useGenerationStore.getState();
    expect(state.currentCode).toBe('');
    expect(state.isGenerating).toBe(false);
    expect(state.files).toBeNull();
  });

  it('sets current code', () => {
    useGenerationStore.getState().setCurrentCode('const x = 1;');
    expect(useGenerationStore.getState().currentCode).toBe('const x = 1;');
  });

  it('tracks generating state', () => {
    useGenerationStore.getState().setIsGenerating(true);
    expect(useGenerationStore.getState().isGenerating).toBe(true);
    useGenerationStore.getState().setIsGenerating(false);
    expect(useGenerationStore.getState().isGenerating).toBe(false);
  });

  it('accumulates streaming text', () => {
    useGenerationStore.getState().appendAccumulated('Hello');
    useGenerationStore.getState().appendAccumulated(' World');
    expect(useGenerationStore.getState().accumulated).toBe('Hello World');
  });

  it('resets accumulated text', () => {
    useGenerationStore.getState().setAccumulated('something');
    useGenerationStore.getState().resetAccumulated();
    expect(useGenerationStore.getState().accumulated).toBe('');
  });

  it('manages versions', () => {
    useGenerationStore.getState().addVersion('v1 code', 'First version');
    const state = useGenerationStore.getState();
    expect(state.versions).toHaveLength(1);
    expect(state.versions[0].code).toBe('v1 code');
    expect(state.versions[0].description).toBe('First version');
    expect(state.currentVersionId).toBe(state.versions[0].id);
  });

  it('deletes versions', () => {
    // Manually set versions to avoid Date.now() collision in jsdom
    useGenerationStore.setState({
      versions: [
        { id: 'v1', code: 'v1 code', timestamp: 1 },
        { id: 'v2', code: 'v2 code', timestamp: 2 },
      ],
    });

    expect(useGenerationStore.getState().versions).toHaveLength(2);

    useGenerationStore.getState().deleteVersion('v1');
    expect(useGenerationStore.getState().versions).toHaveLength(1);
    expect(useGenerationStore.getState().versions[0].code).toBe('v2 code');
  });

  it('sets and clears errors', () => {
    useGenerationStore.getState().setLastError({
      message: 'TypeError',
      source: 'app.tsx',
      lineno: 42,
    });
    expect(useGenerationStore.getState().lastError?.message).toBe('TypeError');

    useGenerationStore.getState().clearError();
    expect(useGenerationStore.getState().lastError).toBeNull();
  });

  it('clears the thread when switching projects', () => {
    useGenerationStore.setState({
      currentProjectId: 'project-a',
      currentThreadId: 'thread-a',
    });

    useGenerationStore.getState().setProjectId('project-b');

    const state = useGenerationStore.getState();
    expect(state.currentProjectId).toBe('project-b');
    expect(state.currentThreadId).toBeNull();
  });
});
