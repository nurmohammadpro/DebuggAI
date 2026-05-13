'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Code2, Zap } from 'lucide-react';
import { WEB_BUILDER_STACKS } from '@/lib/constants';
import { toast } from 'sonner';
import { useGeneration } from '@/hooks/use-generation';

interface StackSelectorProps {
  children: React.ReactNode;
}

const COMMON_FEATURES = [
  { id: 'auth', label: 'Authentication', description: 'User signup, login, JWT' },
  { id: 'database', label: 'Database Models', description: 'MongoDB/PostgreSQL schemas' },
  { id: 'api', label: 'REST API', description: 'CRUD endpoints with validation' },
  { id: 'upload', label: 'File Upload', description: 'Image/file handling' },
  { id: 'docker', label: 'Docker Ready', description: 'Dockerfile included' },
  { id: 'testing', label: 'Testing Setup', description: 'Jest/Pytest included' },
];

export function StackSelector({ children }: StackSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('my-app');
  const [isGenerating, setIsGenerating] = useState(false);

  const { generate } = useGeneration({
    onDone: () => {
      setIsGenerating(false);
      setOpen(false);
      toast.success('Project generated successfully!');
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error('Failed to generate project');
      console.log(error)
    },
  });

  const handleGenerate = async () => {
    if (!selectedStack) {
      toast.error('Please select a tech stack');
      return;
    }

    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsGenerating(true);

    const prompt = `Create a ${selectedStack.toUpperCase()} stack application called "${projectName}" with features: ${selectedFeatures.join(', ')}. Generate the complete project structure with all necessary files.`;

    try {
      await generate({ prompt });
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] text-[var(--app-text)]">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-[16px] font-medium text-[var(--app-text)]">
            <Code2 className="h-5 w-5" />
            Select Your Tech Stack
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[var(--app-text-muted)]">
            We&apos;ll generate a complete project structure for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label htmlFor="projectName" className="text-[13px] font-medium text-[var(--app-text-muted)]">Project Name</label>
            <input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-app"
              className="w-full h-9 font-mono rounded-[6px] border-0 bg-[var(--app-panel)] px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20"
            />
          </div>

          {/* Stack Selection */}
          <div className="space-y-3">
            <label className="text-[13px] font-medium text-[var(--app-text-muted)]">Select Technology Stack</label>
            <div className="grid md:grid-cols-2 gap-4">
              {WEB_BUILDER_STACKS.map((stack) => (
                <div
                  key={stack.id}
                  className={`cursor-pointer transition-all rounded-[6px] bg-[var(--app-panel)] p-4 ${
                    selectedStack === stack.id ? 'ring-2 ring-[var(--app-accent)]' : ''
                  }`}
                  onClick={() => setSelectedStack(stack.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{stack.icon}</span>
                      <h3 className="text-[13px] font-medium text-[var(--app-text)]">{stack.name}</h3>
                    </div>
                    {selectedStack === stack.id && (
                      <span className="inline-flex rounded-[6px] bg-[var(--app-accent-soft)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-accent)]">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[var(--app-text-muted)]">{stack.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Features Selection */}
          <div className="space-y-3">
            <label className="text-[13px] font-medium text-[var(--app-text-muted)]">Select Features (Optional)</label>
            <div className="grid md:grid-cols-2 gap-4">
              {COMMON_FEATURES.map((feature) => (
                <div key={feature.id} className="flex items-center space-x-3 p-3 border border-[var(--app-border)] rounded-[6px]">
                  <input
                    type="checkbox"
                    id={feature.id}
                    checked={selectedFeatures.includes(feature.id)}
                    onChange={() => toggleFeature(feature.id)}
                    className="h-4 w-4 rounded-[4px] border-[var(--app-border)] accent-[var(--app-accent)]"
                  />
                  <div className="flex-1">
                    <label htmlFor={feature.id} className="cursor-pointer text-[13px] text-[var(--app-text)]">
                      {feature.label}
                    </label>
                    <p className="text-xs text-[var(--app-text-muted)]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--app-border)]">
            <div className="text-[13px] text-[var(--app-text-muted)]">
              {selectedStack ? (
                <>
                  <span className="inline-flex rounded-[6px] border border-[var(--app-border)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)]">
                    {selectedStack.toUpperCase()}
                  </span>
                  {selectedFeatures.length > 0 && (
                    <>
                      {' '}+ {selectedFeatures.length} features
                    </>
                  )}
                </>
              ) : (
                'Select a stack to continue'
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-[6px] px-4 py-2 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!selectedStack || isGenerating}
                className="inline-flex items-center gap-2 rounded-[6px] bg-[var(--app-accent)] px-4 py-2 text-[13px] font-medium text-[#071006] transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Zap className="h-4 w-4 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4" />
                    Generate Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
