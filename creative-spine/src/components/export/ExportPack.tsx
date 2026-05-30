'use client';

import { useState } from 'react';
import { Project } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { downloadMarkdown } from '@/lib/utils';
import {
  exportBriefMarkdown,
  exportInsightMarkdown,
  exportMindMapMarkdown,
  exportConceptsMarkdown,
  exportBeatSheetMarkdown,
  exportStoryboardMarkdown,
  exportPromptsMarkdown,
  exportAssetsMarkdown,
  exportFullProductionPackMarkdown,
  exportMakingOfMarkdown,
} from '@/lib/exportMarkdown';

interface ExportPackProps {
  project: Project;
}

type ExportType =
  | 'brief'
  | 'insight'
  | 'mindmap'
  | 'concepts'
  | 'beats'
  | 'storyboard'
  | 'prompts'
  | 'assets'
  | 'full'
  | 'making_of';

const exportOptions: { value: ExportType; label: string; description: string }[] = [
  { value: 'brief', label: 'Creative Brief', description: 'Project summary, hook, payoff, format' },
  { value: 'insight', label: 'Insight Summary', description: 'Core insight, metaphor, emotional goal' },
  { value: 'mindmap', label: 'Mind Map', description: 'All nodes by type and strength' },
  { value: 'concepts', label: 'Concept Options', description: 'All three creative directions' },
  { value: 'beats', label: 'Beat Sheet', description: 'Story structure beat by beat' },
  { value: 'storyboard', label: 'Storyboard', description: 'Full shot-by-shot production plan' },
  { value: 'prompts', label: 'Prompt List', description: 'All prompts grouped by shot' },
  { value: 'assets', label: 'Asset Tracker', description: 'Status of all assets' },
  { value: 'full', label: 'Full Production Pack', description: 'Everything in one document' },
  { value: 'making_of', label: 'Making Of', description: 'Decisions, iterations, process' },
];

function getContent(type: ExportType, project: Project): string {
  switch (type) {
    case 'brief': return exportBriefMarkdown(project);
    case 'insight': return exportInsightMarkdown(project);
    case 'mindmap': return exportMindMapMarkdown(project);
    case 'concepts': return exportConceptsMarkdown(project);
    case 'beats': return exportBeatSheetMarkdown(project);
    case 'storyboard': return exportStoryboardMarkdown(project);
    case 'prompts': return exportPromptsMarkdown(project);
    case 'assets': return exportAssetsMarkdown(project);
    case 'full': return exportFullProductionPackMarkdown(project);
    case 'making_of': return exportMakingOfMarkdown(project);
  }
}

function getFilename(type: ExportType, projectTitle: string): string {
  const slug = projectTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const names: Record<ExportType, string> = {
    brief: 'brief',
    insight: 'insight',
    mindmap: 'mindmap',
    concepts: 'concepts',
    beats: 'beatsheet',
    storyboard: 'storyboard',
    prompts: 'prompts',
    assets: 'assets',
    full: 'production-pack',
    making_of: 'making-of',
  };
  return `${slug}-${names[type]}.md`;
}

export function ExportPack({ project }: ExportPackProps) {
  const [selected, setSelected] = useState<ExportType>('full');
  const content = getContent(selected, project);
  const filename = getFilename(selected, project.title);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Export Pack</h2>
        <p className="text-sm text-zinc-500 mt-1">Export your project as markdown. Ready to paste, share or archive.</p>
      </div>

      {/* Export type selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        {exportOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
              selected === opt.value
                ? 'bg-emerald-950/40 border-emerald-700/50 text-zinc-100'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <div className="text-xs font-semibold mb-0.5">{opt.label}</div>
            <div className="text-xs text-zinc-600 leading-tight">{opt.description}</div>
          </button>
        ))}
      </div>

      {/* Preview + actions */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-300">
            {exportOptions.find((o) => o.value === selected)?.label}
          </span>
          <div className="flex items-center gap-2">
            <CopyButton text={content} label="Copy Markdown" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadMarkdown(content, filename)}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download .md
            </Button>
          </div>
        </div>
        <div className="p-4 bg-zinc-950 overflow-auto max-h-[600px]">
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
        </div>
      </div>
    </div>
  );
}
