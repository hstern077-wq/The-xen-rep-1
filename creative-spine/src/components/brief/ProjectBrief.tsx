'use client';

import { Project, ProjectFormat } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';
import { exportBriefMarkdown } from '@/lib/exportMarkdown';

interface ProjectBriefProps {
  project: Project;
  onChange: (updates: Partial<Project>) => void;
}

const formatOptions = [
  { value: '9:16', label: '9:16 — Vertical' },
  { value: '1:1', label: '1:1 — Square' },
  { value: '16:9', label: '16:9 — Landscape' },
  { value: 'custom', label: 'Custom' },
];

const platformOptions = [
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'pitch', label: 'Pitch' },
  { value: 'other', label: 'Other' },
];

export function ProjectBrief({ project, onChange }: ProjectBriefProps) {
  const briefText = exportBriefMarkdown(project);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Project Brief</h2>
          <p className="text-sm text-zinc-500 mt-1">Define your project. Make the next action obvious.</p>
        </div>
        <CopyButton text={briefText} label="Copy Brief" />
      </div>

      {/* Summary card */}
      <Card className="border-emerald-900/30 bg-emerald-950/20">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Title</span>
            <p className="text-zinc-100 font-medium mt-0.5">{project.title || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Format</span>
            <p className="text-zinc-100 font-medium mt-0.5">{project.format} · {project.duration}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Platform</span>
            <p className="text-zinc-100 font-medium mt-0.5">{project.platform || '—'}</p>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Hook</span>
            <p className="text-zinc-300 mt-0.5">{project.hook || '—'}</p>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Payoff</span>
            <p className="text-zinc-300 mt-0.5">{project.payoff || '—'}</p>
          </div>
        </div>
      </Card>

      {/* Editable fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Project Title"
          value={project.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. The WhatsApp Bird"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Format"
            options={formatOptions}
            value={project.format}
            onChange={(e) => onChange({ format: e.target.value as ProjectFormat })}
          />
          <Input
            label="Duration"
            value={project.duration}
            onChange={(e) => onChange({ duration: e.target.value })}
            placeholder="e.g. 60s"
          />
        </div>
        <Select
          label="Platform"
          options={platformOptions}
          value={project.platform}
          onChange={(e) => onChange({ platform: e.target.value })}
        />
        <Input
          label="Target Audience"
          value={project.targetAudience}
          onChange={(e) => onChange({ targetAudience: e.target.value })}
          placeholder="Who is this for?"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Textarea
          label="Main Emotion"
          value={project.mainEmotion}
          onChange={(e) => onChange({ mainEmotion: e.target.value })}
          placeholder="What should the viewer feel?"
          className="min-h-[60px]"
        />
        <Textarea
          label="Main Message"
          value={project.mainMessage}
          onChange={(e) => onChange({ mainMessage: e.target.value })}
          placeholder="What should the viewer understand?"
          className="min-h-[60px]"
        />
      </div>

      <Textarea
        label="Creative Tension"
        value={project.creativeTension}
        onChange={(e) => onChange({ creativeTension: e.target.value })}
        placeholder="What is the central tension or contradiction?"
        className="min-h-[60px]"
      />

      <Textarea
        label="Hook"
        value={project.hook}
        onChange={(e) => onChange({ hook: e.target.value })}
        placeholder="What grabs them in the first 3 seconds?"
        className="min-h-[70px]"
      />

      <Textarea
        label="Payoff"
        value={project.payoff}
        onChange={(e) => onChange({ payoff: e.target.value })}
        placeholder="What is the final emotional moment?"
        className="min-h-[70px]"
      />

      <Textarea
        label="Visual Promise"
        value={project.visualPromise}
        onChange={(e) => onChange({ visualPromise: e.target.value })}
        placeholder="What does this film look like? Describe the visual world."
        className="min-h-[70px]"
      />

      <Textarea
        label="Tools I Want to Use"
        value={project.tools}
        onChange={(e) => onChange({ tools: e.target.value })}
        placeholder="e.g. Midjourney, Runway, ElevenLabs, Suno"
        className="min-h-[60px]"
      />

      <Textarea
        label="Notes"
        value={project.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Any other notes, instincts, or constraints..."
        className="min-h-[80px]"
      />
    </div>
  );
}
