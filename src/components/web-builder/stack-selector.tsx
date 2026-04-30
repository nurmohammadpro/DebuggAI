/**
 * Stack Selector Modal
 *
 * Modal for selecting tech stack and features for web builder.
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
      // Error handled in callbacks
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Select Your Tech Stack
          </DialogTitle>
          <DialogDescription>
            We&apos;ll generate a complete project structure for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-app"
              className="font-mono"
            />
          </div>

          {/* Stack Selection */}
          <div className="space-y-3">
            <Label>Select Technology Stack</Label>
            <div className="grid md:grid-cols-2 gap-4">
              {WEB_BUILDER_STACKS.map((stack) => (
                <Card
                  key={stack.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedStack === stack.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedStack(stack.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{stack.icon}</span>
                        <h3 className="font-semibold">{stack.name}</h3>
                      </div>
                      {selectedStack === stack.id && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{stack.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Features Selection */}
          <div className="space-y-3">
            <Label>Select Features (Optional)</Label>
            <div className="grid md:grid-cols-2 gap-4">
              {COMMON_FEATURES.map((feature) => (
                <div key={feature.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    id={feature.id}
                    checked={selectedFeatures.includes(feature.id)}
                    onChange={() => toggleFeature(feature.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <Label htmlFor={feature.id} className="cursor-pointer">
                      {feature.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedStack ? (
                <>
                  <Badge variant="outline">{selectedStack.toUpperCase()}</Badge>
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
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedStack || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Zap className="mr-2 h-4 w-4 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Code2 className="mr-2 h-4 w-4" />
                    Generate Project
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
