import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '@/store/workspace-store';

describe('WorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      mode: 'build',
      selectedProjectId: null,
      projectKey: null,
    });
  });

  it('defaults to build mode', () => {
    expect(useWorkspaceStore.getState().mode).toBe('build');
  });

  it('switches mode', () => {
    useWorkspaceStore.getState().setMode('debug');
    expect(useWorkspaceStore.getState().mode).toBe('debug');
  });

  it('sets selected project ID', () => {
    useWorkspaceStore.getState().setSelectedProjectId('proj-1');
    expect(useWorkspaceStore.getState().selectedProjectId).toBe('proj-1');
  });

  it('clears selected project ID', () => {
    useWorkspaceStore.getState().setSelectedProjectId('proj-1');
    useWorkspaceStore.getState().setSelectedProjectId(null);
    expect(useWorkspaceStore.getState().selectedProjectId).toBeNull();
  });

  it('sets project key', () => {
    useWorkspaceStore.getState().setProjectKey('my-project-key');
    expect(useWorkspaceStore.getState().projectKey).toBe('my-project-key');
  });
});
