/**
 * Enhanced Branches Management Component
 *
 * Comprehensive branch management with comparison, merging, and history
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { toast } from 'sonner';
import {
  GitBranch,
  Plus,
  Trash2,
  GitMerge,
  GitCompare,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Edit2,
  GitCommit,
  GitPullRequest,
  Ban,
} from 'lucide-react';

type BranchStatus = 'active' | 'draft' | 'merged' | 'archived';

interface Branch {
  id: string;
  name: string;
  status: BranchStatus;
  createdAt: string;
  updatedAt: string;
  author: string;
  commitCount: number;
  fileChanges: number;
  description?: string;
  parentId?: string;
  isDefault: boolean;
}

interface Commit {
  id: string;
  message: string;
  author: string;
  timestamp: string;
  branchId: string;
}

export function EnhancedBranchesManager() {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: 'main',
      name: 'main',
      status: 'active',
      createdAt: '2026-05-01T10:00:00Z',
      updatedAt: '2026-05-29T15:30:00Z',
      author: 'nurprodev@gmail.com',
      commitCount: 42,
      fileChanges: 128,
      description: 'Main production branch',
      isDefault: true,
    },
    {
      id: 'feature-ui-upgrade',
      name: 'feature-ui-upgrade',
      status: 'draft',
      createdAt: '2026-05-25T09:00:00Z',
      updatedAt: '2026-05-30T11:20:00Z',
      author: 'nurprodev@gmail.com',
      commitCount: 15,
      fileChanges: 34,
      description: 'Upgrading UI components with new design system',
      parentId: 'main',
      isDefault: false,
    },
    {
      id: 'fix-auth-bug',
      name: 'fix-auth-bug',
      status: 'merged',
      createdAt: '2026-05-20T14:30:00Z',
      updatedAt: '2026-05-28T16:45:00Z',
      author: 'nurprodev@gmail.com',
      commitCount: 8,
      fileChanges: 12,
      description: 'Fixed authentication timeout issue',
      parentId: 'main',
      isDefault: false,
    },
    {
      id: 'experiment-new-layout',
      name: 'experiment-new-layout',
      status: 'archived',
      createdAt: '2026-05-10T11:00:00Z',
      updatedAt: '2026-05-15T09:20:00Z',
      author: 'nurprodev@gmail.com',
      commitCount: 5,
      fileChanges: 8,
      description: 'Archived layout experiment',
      parentId: 'main',
      isDefault: false,
    },
  ]);

  const [commits, setCommits] = useState<Commit[]>([
    {
      id: 'commit-1',
      message: 'Update dashboard home component',
      author: 'nurprodev@gmail.com',
      timestamp: '2026-05-30T11:20:00Z',
      branchId: 'feature-ui-upgrade',
    },
    {
      id: 'commit-2',
      message: 'Add new color scheme variables',
      author: 'nurprodev@gmail.com',
      timestamp: '2026-05-29T15:30:00Z',
      branchId: 'main',
    },
    {
      id: 'commit-3',
      message: 'Fix navigation responsive issues',
      author: 'nurprodev@gmail.com',
      timestamp: '2026-05-28T16:45:00Z',
      branchId: 'main',
    },
  ]);

  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareBranches, setCompareBranches] = useState<{ source?: string; target?: string }>({});

  const [newBranchForm, setNewBranchForm] = useState({
    name: '',
    description: '',
    sourceBranch: 'main',
  });

  const { data: projects } = useMyProjects(10, true);

  const handleSelectBranch = (branchId: string) => {
    const next = new Set(selectedBranches);
    if (next.has(branchId)) {
      next.delete(branchId);
    } else {
      if (next.size >= 2) {
        next.clear();
        next.add(branchId);
      } else {
        next.add(branchId);
      }
    }
    setSelectedBranches(next);
  };

  const handleCreateBranch = async () => {
    if (!newBranchForm.name.trim()) {
      toast.error('Please enter a branch name');
      return;
    }

    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: newBranchForm.name.trim(),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'nurprodev@gmail.com',
      commitCount: 0,
      fileChanges: 0,
      description: newBranchForm.description,
      parentId: newBranchForm.sourceBranch,
      isDefault: false,
    };

    setBranches([...branches, newBranch]);
    setNewBranchForm({ name: '', description: '', sourceBranch: 'main' });
    setCreateDialogOpen(false);
    toast.success('Branch created successfully');
  };

  const handleDeleteBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    if (branch.isDefault) {
      toast.error('Cannot delete the default branch');
      return;
    }

    if (!confirm(`Are you sure you want to delete branch "${branch.name}"?`)) {
      return;
    }

    setBranches(branches.filter(b => b.id !== branchId));
    toast.success('Branch deleted successfully');
  };

  const handleMergeBranch = async (sourceBranch: string, targetBranch: string) => {
    toast.success(`Merged ${sourceBranch} into ${targetBranch}`);
    // Update branch status
    setBranches(prev => prev.map(b =>
      b.id === sourceBranch ? { ...b, status: 'merged' } : b
    ));
  };

  const handleCompareBranches = () => {
    const selectedArray = Array.from(selectedBranches);
    if (selectedArray.length === 2) {
      setCompareBranches({
        source: selectedArray[0],
        target: selectedArray[1],
      });
      setCompareDialogOpen(true);
    }
  };

  const handleSwitchBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    toast.success(`Switched to branch "${branch.name}"`);
    // In a real app, this would switch the active branch
  };

  const getBranchIcon = (status: BranchStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-[var(--app-success)]" />;
      case 'draft':
        return <GitCommit className="w-4 h-4 text-[var(--app-warning)]" />;
      case 'merged':
        return <GitMerge className="w-4 h-4 text-[var(--app-accent)]" />;
      case 'archived':
        return <Ban className="w-4 h-4 text-[var(--app-text-dim)]" />;
    }
  };

  const getBranchStatusColor = (status: BranchStatus) => {
    switch (status) {
      case 'active':
        return 'bg-[var(--app-success-soft)] text-[var(--app-success)]';
      case 'draft':
        return 'bg-[var(--app-warning-soft)] text-[var(--app-warning)]';
      case 'merged':
        return 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]';
      case 'archived':
        return 'bg-[var(--app-panel-2)] text-[var(--app-text-dim)]';
    }
  };

  const filteredBranches = branches.filter(branch => {
    if (!selectedProject) return true;
    // In a real app, filter by project
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--app-text)] mb-2">Branches</h1>
            <p className="text-sm text-[var(--app-text-muted)]">
              Manage project branches and version control
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedBranches.size === 2 && (
              <button
                onClick={handleCompareBranches}
                className="px-4 py-2 text-sm font-medium bg-[var(--app-info)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <GitCompare className="w-4 h-4" />
                Compare Selected
              </button>
            )}
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="px-4 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Branch
            </button>
          </div>
        </div>

        {/* Project Selector */}
        {projects && projects.length > 0 && (
          <div className="mb-6">
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="w-full sm:w-64 px-3 py-2 text-sm bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 text-[var(--app-text)]"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.description || project.prompt || 'Untitled Project'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Branches List */}
        <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[var(--app-surface)] border-b border-[var(--app-border)] text-xs font-medium text-[var(--app-text-muted)]">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={selectedBranches.size === 2}
                onChange={() => setSelectedBranches(new Set())}
                className="rounded"
              />
            </div>
            <div className="col-span-3">Branch Name</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Author</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-1 text-center">Commits</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          <div className="divide-y divide-[var(--app-border)]">
            {filteredBranches.map(branch => (
              <div
                key={branch.id}
                className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-[var(--app-surface)] transition-colors ${
                  selectedBranches.has(branch.id) ? 'bg-[var(--app-accent-soft)]' : ''
                }`}
              >
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={selectedBranches.has(branch.id)}
                    onChange={() => handleSelectBranch(branch.id)}
                    className="rounded"
                  />
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    {getBranchIcon(branch.status)}
                    <div>
                      <div className="text-sm font-medium text-[var(--app-text)] flex items-center gap-2">
                        {branch.name}
                        {branch.isDefault && (
                          <span className="text-xs bg-[var(--app-accent)] text-[#071006] px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      {branch.description && (
                        <div className="text-xs text-[var(--app-text-muted)] truncate">
                          {branch.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getBranchStatusColor(branch.status)}`}>
                    {branch.status.charAt(0).toUpperCase() + branch.status.slice(1)}
                  </span>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-[var(--app-text-dim)]" />
                    <span className="text-xs text-[var(--app-text-muted)]">
                      {branch.author.split('@')[0]}
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-[var(--app-text-dim)]" />
                    <span className="text-xs text-[var(--app-text-muted)]">
                      {new Date(branch.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-sm font-medium text-[var(--app-text)]">{branch.commitCount}</span>
                </div>
                <div className="col-span-1 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleSwitchBranch(branch.id)}
                      className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] hover:bg-[var(--app-surface)] rounded transition-colors"
                      title="Switch to branch"
                    >
                      <GitBranch className="w-4 h-4" />
                    </button>
                    {branch.status === 'draft' && !branch.isDefault && (
                      <button
                        onClick={() => handleMergeBranch(branch.id, branch.parentId || 'main')}
                        className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-success)] hover:bg-[var(--app-surface)] rounded transition-colors"
                        title="Merge branch"
                      >
                        <GitMerge className="w-4 h-4" />
                      </button>
                    )}
                    {!branch.isDefault && (
                      <button
                        onClick={() => handleDeleteBranch(branch.id)}
                        className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-danger)] hover:bg-[var(--app-surface)] rounded transition-colors"
                        title="Delete branch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Commits */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-[var(--app-text)] mb-4">Recent Commits</h2>
          <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg overflow-hidden">
            <div className="divide-y divide-[var(--app-border)]">
              {commits.map(commit => (
                <div key={commit.id} className="px-4 py-3 hover:bg-[var(--app-surface)] transition-colors">
                  <div className="flex items-start gap-3">
                    <GitCommit className="w-4 h-4 text-[var(--app-accent)] mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--app-text)] font-medium">{commit.message}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[var(--app-text-muted)]">{commit.author.split('@')[0]}</span>
                        <span className="text-xs text-[var(--app-text-dim)]">
                          {new Date(commit.timestamp).toLocaleString()}
                        </span>
                        <span className="text-xs text-[var(--app-accent)] font-mono">
                          {commit.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Branch Dialog */}
      {createDialogOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--app-panel)] rounded-lg max-w-md w-full p-6 border border-[var(--app-border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--app-text)]">Create New Branch</h3>
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={newBranchForm.name}
                  onChange={e => setNewBranchForm({ ...newBranchForm, name: e.target.value })}
                  placeholder="feature/my-new-feature"
                  className="w-full px-3 py-2 text-sm bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 text-[var(--app-text)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newBranchForm.description}
                  onChange={e => setNewBranchForm({ ...newBranchForm, description: e.target.value })}
                  placeholder="Brief description of this branch..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 text-[var(--app-text)] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  Source Branch
                </label>
                <select
                  value={newBranchForm.sourceBranch}
                  onChange={e => setNewBranchForm({ ...newBranchForm, sourceBranch: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 text-[var(--app-text)]"
                >
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} {branch.isDefault ? '(default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setCreateDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium bg-[var(--app-panel-2)] text-[var(--app-text)] rounded-lg hover:bg-[var(--app-surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBranch}
                  className="px-4 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create Branch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compare Branches Dialog */}
      {compareDialogOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--app-panel)] rounded-lg max-w-4xl w-full p-6 border border-[var(--app-border)] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--app-text)]">Compare Branches</h3>
              <button
                onClick={() => setCompareDialogOpen(false)}
                className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Source</label>
                <div className="px-3 py-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)]">
                  {branches.find(b => b.id === compareBranches.source)?.name || 'Select branch'}
                </div>
              </div>
              <GitCompare className="w-5 h-5 text-[var(--app-accent)] mt-6" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Target</label>
                <div className="px-3 py-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)]">
                  {branches.find(b => b.id === compareBranches.target)?.name || 'Select branch'}
                </div>
              </div>
            </div>

            {/* Comparison Content */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[var(--app-success-soft)] rounded-lg border border-[var(--app-success)]">
                  <div className="text-2xl font-semibold text-[var(--app-success)]">12</div>
                  <div className="text-xs text-[var(--app-success)]">Files Added</div>
                </div>
                <div className="p-4 bg-[var(--app-warning-soft)] rounded-lg border border-[var(--app-warning)]">
                  <div className="text-2xl font-semibold text-[var(--app-warning)]">8</div>
                  <div className="text-xs text-[var(--app-warning)]">Files Modified</div>
                </div>
                <div className="p-4 bg-[var(--app-danger-soft)] rounded-lg border border-[var(--app-danger)]">
                  <div className="text-2xl font-semibold text-[var(--app-danger)]">3</div>
                  <div className="text-xs text-[var(--app-danger)]">Files Deleted</div>
                </div>
              </div>

              <div className="border border-[var(--app-border)] rounded-lg p-4">
                <h4 className="text-sm font-medium text-[var(--app-text)] mb-3">Changed Files</h4>
                <div className="space-y-2">
                  {['src/components/Dashboard.tsx', 'src/app/page.tsx', 'src/styles/globals.css'].map(file => (
                    <div key={file} className="flex items-center justify-between py-2 px-3 bg-[var(--app-surface)] rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--app-text-muted)]" />
                        <span className="text-sm text-[var(--app-text)]">{file}</span>
                      </div>
                      <span className="text-xs text-[var(--app-accent)]">+12 -3</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCompareDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium bg-[var(--app-panel-2)] text-[var(--app-text)] rounded-lg hover:bg-[var(--app-surface)] transition-colors"
                >
                  Close
                </button>
                {compareBranches.source && compareBranches.target && (
                  <button
                    onClick={() => handleMergeBranch(compareBranches.source!, compareBranches.target!)}
                    className="px-4 py-2 text-sm font-medium bg-[var(--app-accent)] text-[#071006] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <GitMerge className="w-4 h-4" />
                    Merge {branches.find(b => b.id === compareBranches.source)?.name} into {branches.find(b => b.id === compareBranches.target)?.name}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}