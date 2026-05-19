'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Rocket, Globe, Settings, Check, Loader2, ExternalLink,
  AlertTriangle, ChevronRight, Copy, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type DeployProvider = 'vercel' | 'netlify';
type DeployStatus = 'idle' | 'preparing' | 'building' | 'deploying' | 'success' | 'failed';

interface DeployConfig {
  provider: DeployProvider;
  projectName: string;
  framework: string;
  buildCommand: string;
  outputDir: string;
  installCommand: string;
  environmentVariables: { key: string; value: string }[];
  region: string;
}

interface DeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectFiles: Record<string, string>;
  projectName?: string;
}

const FRAMEWORKS = [
  { id: 'nextjs', name: 'Next.js', build: 'next build', output: '.next', install: 'npm install' },
  { id: 'react', name: 'React (Vite)', build: 'vite build', output: 'dist', install: 'npm install' },
  { id: 'vue', name: 'Vue.js', build: 'vite build', output: 'dist', install: 'npm install' },
  { id: 'angular', name: 'Angular', build: 'ng build', output: 'dist', install: 'npm install' },
  { id: 'node', name: 'Node.js', build: 'npm run build', output: '.', install: 'npm install' },
  { id: 'static', name: 'Static HTML', build: '', output: '.', install: '' },
  { id: 'python', name: 'Python', build: '', output: '.', install: 'pip install -r requirements.txt' },
];

const REGIONS = [
  { id: 'auto', name: 'Auto (Nearest)' },
  { id: 'us-east', name: 'US East (N. Virginia)' },
  { id: 'us-west', name: 'US West (Oregon)' },
  { id: 'eu-west', name: 'Europe (Frankfurt)' },
  { id: 'ap-southeast', name: 'Asia Pacific (Singapore)' },
];

export function DeployModal({
  open, onOpenChange, projectId, projectFiles, projectName: initialName,
}: DeployModalProps) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<DeployStatus>('idle');
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [config, setConfig] = useState<DeployConfig>({
    provider: 'vercel',
    projectName: initialName || 'my-app',
    framework: 'nextjs',
    buildCommand: 'next build',
    outputDir: '.next',
    installCommand: 'npm install',
    environmentVariables: [],
    region: 'auto',
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  const framework = FRAMEWORKS.find((f) => f.id === config.framework);

  const handleFrameworkChange = useCallback((frameworkId: string) => {
    const fw = FRAMEWORKS.find((f) => f.id === frameworkId);
    if (fw) {
      setConfig((prev) => ({
        ...prev,
        framework: fw.id,
        buildCommand: fw.build,
        outputDir: fw.output,
        installCommand: fw.install,
      }));
    }
  }, []);

  const addEnvVar = () => {
    if (!newEnvKey.trim()) return;
    setConfig((prev) => ({
      ...prev,
      environmentVariables: [
        ...prev.environmentVariables.filter((e) => e.key !== newEnvKey.trim()),
        { key: newEnvKey.trim(), value: newEnvValue.trim() },
      ],
    }));
    setNewEnvKey('');
    setNewEnvValue('');
  };

  const removeEnvVar = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      environmentVariables: prev.environmentVariables.filter((e) => e.key !== key),
    }));
  };

  const handleDeploy = useCallback(async () => {
    setStatus('preparing');
    setDeployLogs([]);
    setLogs([]);

    const addLog = (msg: string) => {
      setLogs((prev) => [...prev, msg]);
      setDeployLogs((prev) => [...prev, msg]);
    };

    try {
      addLog(`🚀 Starting deployment to ${config.provider.toUpperCase()}...`);
      addLog(`📦 Project: ${config.projectName}`);
      addLog(`🔧 Framework: ${config.framework}`);

      setStatus('building');
      addLog('📤 Preparing project files...');

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addLog('❌ Authentication required');
        setStatus('failed');
        return;
      }

      // 1. Create deployment record
      addLog('💾 Creating deployment record...');
      const { data: deployment, error: deployError } = await supabase
        .from('deployments')
        .insert({
          project_id: projectId,
          user_id: session.user.id,
          provider: config.provider,
          environment: 'production',
          status: 'building',
          config: {
            framework: config.framework,
            buildCommand: config.buildCommand,
            outputDir: config.outputDir,
            installCommand: config.installCommand,
            region: config.region,
          },
        })
        .select('id')
        .single();

      if (deployError) {
        addLog(`❌ Failed to create deployment: ${deployError.message}`);
        setStatus('failed');
        return;
      }

      const deploymentId = deployment?.id;
      addLog(`✅ Deployment record created (${deploymentId})`);

      // 2. Get a signed URL for uploading the project archive
      addLog('📦 Creating project archive...');
      const archiveRes = await fetch('/api/deploy/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          deploymentId,
          files: projectFiles,
          config: {
            framework: config.framework,
            buildCommand: config.buildCommand,
            outputDir: config.outputDir,
            installCommand: config.installCommand,
            env: Object.fromEntries(
              config.environmentVariables.map((e) => [e.key, e.value])
            ),
            region: config.region,
          },
        }),
      });

      if (!archiveRes.ok) {
        const errData = await archiveRes.json().catch(() => ({}));
        addLog(`❌ Archive failed: ${errData.error || 'Unknown error'}`);
        await supabase
          .from('deployments')
          .update({ status: 'failed', error: errData.error || 'Archive failed' })
          .eq('id', deploymentId);
        setStatus('failed');
        return;
      }

      const archiveData = await archiveRes.json();
      addLog(`✅ Archive created: ${archiveData.filename}`);

      // 3. Trigger the provider deploy
      setStatus('deploying');
      addLog(`🚀 Triggering ${config.provider.toUpperCase()} deployment...`);

      const deployRes = await fetch('/api/deploy/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          deploymentId,
          provider: config.provider,
          projectName: config.projectName,
          archivePath: archiveData.path,
          config: {
            framework: config.framework,
            buildCommand: config.buildCommand,
            outputDir: config.outputDir,
            installCommand: config.installCommand,
            env: Object.fromEntries(
              config.environmentVariables.map((e) => [e.key, e.value])
            ),
            region: config.region,
          },
        }),
      });

      if (!deployRes.ok) {
        const errData = await deployRes.json().catch(() => ({}));
        addLog(`❌ Deploy trigger failed: ${errData.error || 'Unknown error'}`);
        await supabase
          .from('deployments')
          .update({ status: 'failed', error: errData.error || 'Deploy trigger failed' })
          .eq('id', deploymentId);
        setStatus('failed');
        return;
      }

      const deployData = await deployRes.json();
      const url = deployData.url || deployData.deployUrl || `https://${config.projectName}.vercel.app`;
      setDeployUrl(url);

      // 4. Mark deployment as success
      await supabase
        .from('deployments')
        .update({
          status: 'success',
          deployment_url: url,
          completed_at: new Date().toISOString(),
        })
        .eq('id', deploymentId);

      addLog(`✅ Deployment successful!`);
      addLog(`🌐 URL: ${url}`);
      setStatus('success');
      toast.success('Deployment completed!');
    } catch (error) {
      addLog(`❌ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('failed');
      toast.error('Deployment failed');
    }
  }, [projectId, projectFiles, config]);

  const handleCopyUrl = () => {
    if (deployUrl) {
      navigator.clipboard.writeText(deployUrl);
      toast.success('URL copied');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (status === 'preparing' || status === 'building' || status === 'deploying') return;
      onOpenChange(v);
      if (!v) {
        setStep(0);
        setStatus('idle');
        setDeployUrl(null);
        setLogs([]);
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] text-[var(--app-text)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px] font-medium">
            <Rocket className="h-5 w-5 text-[var(--app-accent)]" />
            Deploy Project
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[var(--app-text-muted)]">
            Deploy your project to Vercel or Netlify with one click.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Stepper */}
        <div className="flex items-center gap-2 px-1 py-3">
          {[
            { step: 0, label: 'Configure' },
            { step: 1, label: 'Preview' },
            { step: 2, label: 'Deploy' },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all',
                step > s.step ? 'bg-[var(--app-accent)] text-[#071006]' :
                step === s.step ? 'bg-[var(--app-accent)] text-[#071006] ring-2 ring-[var(--app-accent)]/30' :
                'bg-[var(--app-surface)] text-[var(--app-text-dim)] border border-[var(--app-border)]'
              )}>
                {step > s.step ? <Check className="h-3.5 w-3.5" /> : s.step + 1}
              </div>
              <span className={cn(
                'text-[11px] font-medium',
                step >= s.step ? 'text-[var(--app-text)]' : 'text-[var(--app-text-dim)]'
              )}>
                {s.label}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-[var(--app-border)] mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 0: Configure */}
        {step === 0 && status === 'idle' && (
          <div className="space-y-5 py-2">
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-[var(--app-text-muted)]">Deployment Provider</label>
              <div className="grid grid-cols-2 gap-3">
                {(['vercel', 'netlify'] as DeployProvider[]).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setConfig((prev) => ({ ...prev, provider }))}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-[6px] border transition-all text-left',
                      config.provider === provider
                        ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)]'
                        : 'border-[var(--app-border)] bg-[var(--app-panel)] hover:border-[var(--app-text-dim)]'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-[6px] flex items-center justify-center text-sm font-bold uppercase',
                      provider === 'vercel' ? 'bg-black text-white' : 'bg-green-500 text-white'
                    )}>
                      {provider === 'vercel' ? 'V' : 'N'}
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-medium text-[var(--app-text)] capitalize">{provider}</p>
                      <p className="text-[10px] text-[var(--app-text-dim)]">
                        {provider === 'vercel' ? 'Global edge network' : 'Jamstack platform'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Project Name */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--app-text-muted)]">Project Name</label>
              <input
                value={config.projectName}
                onChange={(e) => setConfig((prev) => ({ ...prev, projectName: e.target.value }))}
                className="w-full h-9 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] px-3 text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              />
            </div>

            {/* Framework */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-[var(--app-text-muted)]">Framework</label>
              <div className="grid grid-cols-4 gap-2">
                {FRAMEWORKS.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => handleFrameworkChange(fw.id)}
                    className={cn(
                      'h-9 rounded-[6px] text-[11px] font-medium border transition-colors',
                      config.framework === fw.id
                        ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                        : 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    )}
                  >
                    {fw.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Build Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--app-text-muted)]">Build Command</label>
                <input
                  value={config.buildCommand}
                  onChange={(e) => setConfig((prev) => ({ ...prev, buildCommand: e.target.value }))}
                  className="w-full h-9 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] px-3 text-[12px] text-[var(--app-text)] font-mono outline-none focus:border-[var(--app-accent)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--app-text-muted)]">Output Directory</label>
                <input
                  value={config.outputDir}
                  onChange={(e) => setConfig((prev) => ({ ...prev, outputDir: e.target.value }))}
                  className="w-full h-9 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] px-3 text-[12px] text-[var(--app-text)] font-mono outline-none focus:border-[var(--app-accent)]"
                />
              </div>
            </div>

            {/* Region */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--app-text-muted)]">Deployment Region</label>
              <select
                value={config.region}
                onChange={(e) => setConfig((prev) => ({ ...prev, region: e.target.value }))}
                className="w-full h-9 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] px-3 text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Environment Variables */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-[var(--app-text-muted)]">Environment Variables</label>
              <div className="space-y-2">
                {config.environmentVariables.map((env) => (
                  <div key={env.key} className="flex items-center gap-2">
                    <span className="h-8 px-2 rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[11px] font-mono text-[var(--app-text)] flex items-center">{env.key}</span>
                    <span className="flex-1 h-8 px-2 rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[11px] font-mono text-[var(--app-text-dim)] flex items-center">••••••••</span>
                    <button
                      className="h-8 w-8 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:text-red-400 transition-colors"
                      onClick={() => removeEnvVar(env.key)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    placeholder="KEY"
                    className="h-8 w-[120px] rounded-[4px] bg-[var(--app-panel)] border border-[var(--app-border)] px-2 text-[11px] font-mono text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none"
                  />
                  <input
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    placeholder="value"
                    className="flex-1 h-8 rounded-[4px] bg-[var(--app-panel)] border border-[var(--app-border)] px-2 text-[11px] font-mono text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none"
                  />
                  <button
                    onClick={addEnvVar}
                    className="h-8 px-2 rounded-[4px] text-[11px] font-medium bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--app-border)]">
              <button
                onClick={() => onOpenChange(false)}
                className="h-8 px-3 rounded-[6px] text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(1)}
                className="h-8 px-4 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[12px] font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
              >
                Review
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Review */}
        {step === 1 && status === 'idle' && (
          <div className="space-y-4 py-2">
            <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 space-y-3">
              <h3 className="text-[12px] font-semibold text-[var(--app-text)]">Deployment Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                {[
                  ['Provider', config.provider.toUpperCase()],
                  ['Project', config.projectName],
                  ['Framework', framework?.name || config.framework],
                  ['Build Command', config.buildCommand || 'None'],
                  ['Output Dir', config.outputDir],
                  ['Region', REGIONS.find((r) => r.id === config.region)?.name || config.region],
                  ['Env Variables', `${config.environmentVariables.length} configured`],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[var(--app-text-dim)] uppercase tracking-wider">{label}</span>
                    <span className="text-[12px] text-[var(--app-text)] font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
              <h3 className="text-[12px] font-semibold text-[var(--app-text)] mb-2">Project Files</h3>
              <div className="grid grid-cols-2 gap-1">
                {Object.keys(projectFiles).slice(0, 12).map((path) => (
                  <div key={path} className="text-[10px] font-mono text-[var(--app-text-dim)] truncate">
                    📄 {path}
                  </div>
                ))}
                {Object.keys(projectFiles).length > 12 && (
                  <div className="text-[10px] text-[var(--app-text-muted)] italic">
                    +{Object.keys(projectFiles).length - 12} more files
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--app-border)]">
              <button
                onClick={() => setStep(0)}
                className="h-8 px-3 rounded-[6px] text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => { setStep(2); handleDeploy(); }}
                className="h-8 px-4 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[12px] font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
              >
                <Rocket className="h-3.5 w-3.5" />
                Deploy Now
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Deploy Progress */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            {/* Status indicator */}
            <div className="flex items-center gap-3 p-4 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]">
              {status === 'preparing' || status === 'building' || status === 'deploying' ? (
                <Loader2 className="h-5 w-5 animate-spin text-[var(--app-accent)]" />
              ) : status === 'success' ? (
                <div className="w-5 h-5 rounded-full bg-[var(--app-success)] flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : (
                <AlertTriangle className="h-5 w-5 text-[var(--app-danger)]" />
              )}
              <div>
                <p className="text-[13px] font-medium text-[var(--app-text)]">
                  {status === 'preparing' && 'Preparing deployment...'}
                  {status === 'building' && 'Building project...'}
                  {status === 'deploying' && 'Deploying to cloud...'}
                  {status === 'success' && 'Deployment successful!'}
                  {status === 'failed' && 'Deployment failed'}
                </p>
                {deployUrl && (
                  <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] text-[var(--app-accent)] hover:underline inline-flex items-center gap-1">
                    {deployUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Live Logs */}
            <div className="rounded-[6px] bg-[#0C0F0C] font-mono text-[11px] p-4 h-[240px] overflow-y-auto space-y-1">
              {logs.length === 0 && (
                <span className="text-[var(--app-text-dim)] italic">Waiting...</span>
              )}
              {logs.map((log, i) => (
                <div key={i} className={cn(
                  'text-[11px] leading-relaxed',
                  log.startsWith('✅') && 'text-[var(--app-success)]',
                  log.startsWith('❌') && 'text-[var(--app-danger)]',
                  log.startsWith('🚀') && 'text-[var(--app-accent)]',
                  log.startsWith('📦') && 'text-blue-400',
                  log.startsWith('🌐') && 'text-cyan-400',
                  !log.startsWith('✅') && !log.startsWith('❌') && !log.startsWith('🚀') && !log.startsWith('📦') && !log.startsWith('🌐') && 'text-[var(--app-text-dim)]'
                )}>
                  {log}
                </div>
              ))}
              {(status === 'preparing' || status === 'building' || status === 'deploying') && (
                <span className="inline-block w-1.5 h-3 bg-[var(--app-accent)] animate-pulse" />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => { onOpenChange(false); setStep(0); setStatus('idle'); setDeployUrl(null); setLogs([]); }}
                className="h-8 px-3 rounded-[6px] text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
                disabled={status === 'preparing' || status === 'building' || status === 'deploying'}
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {deployUrl && (
                  <>
                    <button
                      onClick={handleCopyUrl}
                      className="h-8 px-3 rounded-[6px] border border-[var(--app-border)] text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors inline-flex items-center gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy URL
                    </button>
                    <a
                      href={deployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[12px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Site
                    </a>
                  </>
                )}

                {status === 'failed' && (
                  <button
                    onClick={() => { setStatus('idle'); setStep(1); setLogs([]); }}
                    className="h-8 px-3 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[12px] font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RotateCw(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
