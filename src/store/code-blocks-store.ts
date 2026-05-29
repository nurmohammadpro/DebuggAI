/**
 * Code Blocks Store
 *
 * Manages code blocks extracted from LLM responses for display in the code pane
 */

import { create } from 'zustand';
import type { CodeBlock } from '@/lib/utils/code-extraction';

interface CodeBlocksState {
  codeBlocks: CodeBlock[];
  activeBlockId: string | null;
  isStreaming: boolean;
  streamingContent: string;

  // Actions
  setCodeBlocks: (blocks: CodeBlock[]) => void;
  addCodeBlocks: (blocks: CodeBlock[]) => void;
  updateCodeBlock: (id: string, updates: Partial<CodeBlock>) => void;
  removeCodeBlock: (id: string) => void;
  setActiveBlock: (id: string | null) => void;
  setActiveBlockByIndex: (index: number) => void;
  clearCodeBlocks: () => void;
  setStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  reset: () => void;
}

export const useCodeBlocksStore = create<CodeBlocksState>((set, get) => ({
  codeBlocks: [],
  activeBlockId: null,
  isStreaming: false,
  streamingContent: '',

  setCodeBlocks: (blocks) => set({ codeBlocks: blocks }),

  addCodeBlocks: (blocks) =>
    set((state) => {
      const existingMap = new Map(state.codeBlocks.map(b => [b.id, b]));
      blocks.forEach(block => {
        existingMap.set(block.id, block);
      });
      const newBlocks = Array.from(existingMap.values());

      // Set active to the latest block if none is active
      const activeBlockId = state.activeBlockId || blocks[blocks.length - 1]?.id || null;

      return { codeBlocks: newBlocks, activeBlockId };
    }),

  updateCodeBlock: (id, updates) =>
    set((state) => ({
      codeBlocks: state.codeBlocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      ),
    })),

  removeCodeBlock: (id) =>
    set((state) => {
      const newBlocks = state.codeBlocks.filter(b => b.id !== id);
      const activeBlockId = state.activeBlockId === id
        ? (newBlocks[0]?.id || null)
        : state.activeBlockId;

      return { codeBlocks: newBlocks, activeBlockId };
    }),

  setActiveBlock: (id) => set({ activeBlockId: id }),

  setActiveBlockByIndex: (index) =>
    set((state) => {
      const block = state.codeBlocks[index];
      return { activeBlockId: block?.id || null };
    }),

  clearCodeBlocks: () =>
    set({ codeBlocks: [], activeBlockId: null, streamingContent: '' }),

  setStreaming: (isStreaming) => set({ isStreaming }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  reset: () =>
    set({
      codeBlocks: [],
      activeBlockId: null,
      isStreaming: false,
      streamingContent: '',
    }),
}));
