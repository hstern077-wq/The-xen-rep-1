'use client';

import { useState } from 'react';
import { Project, Prompt, PromptType, ToolTarget } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { CopyButton } from '@/components/ui/CopyButton';
import { generateId } from '@/lib/utils';
import { generatePromptsForShot } from '@/lib/generators';

interface PromptFactoryProps {
  project: Project;
  onChange: (updates: Partial<Project>) => void;
}

const promptTypeLabels: Record<PromptType, string> = {
  image: 'Image',
  text_to_video: 'Text → Video',
  image_to_video: 'Image → Video',
  character_consistency: 'Character Consistency',
  style: 'Style',
  negative: 'Negative',
  voice_over: 'Voice Over',
  sound_design: 'Sound Design',
  lip_sync: 'Lip Sync',
  editing_note: 'Editing Note',
};

const promptTypeColors: Record<PromptType, string> = {
  image: 'bg-violet-900/40 text-violet-300 border-violet-700/40',
  text_to_video: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  image_to_video: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/40',
  character_consistency: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  style: 'bg-pink-900/40 text-pink-300 border-pink-700/40',
  negative: 'bg-red-900/40 text-red-300 border-red-700/40',
  voice_over: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  sound_design: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/40',
  lip_sync: 'bg-orange-900/40 text-orange-300 border-orange-700/40',
  editing_note: 'bg-zinc-700/60 text-zinc-300 border-zinc-600/40',
};

export function PromptFactory({ project, onChange }: PromptFactoryProps) {
  const [selectedShotId, setSelectedShotId] = useState<string>(project.shots[0]?.id ?? '');
  const [filterType, setFilterType] = useState<PromptType | 'all'>('all');

  const selectedShot = project.shots.find((s) => s.id === selectedShotId);
  const shotPrompts = project.prompts.filter((p) => p.shotId === selectedShotId);
  const filtered = filterType === 'all' ? shotPrompts : shotPrompts.filter((p) => p.type === filterType);

  const updatePrompts = (prompts: Prompt[]) => onChange({ prompts });

  const handleGenerate = () => {
    if (!selectedShot) return;
    const generated = generatePromptsForShot(project, selectedShot);
    const existing = project.prompts.filter((p) => p.shotId !== selectedShotId);
    updatePrompts([...existing, ...generated]);
  };

  const updatePrompt = (id: string, updates: Partial<Prompt>) => {
    updatePrompts(project.prompts.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePrompt = (id: string) => {
    updatePrompts(project.prompts.filter((p) => p.id !== id));
  };

  const addPrompt = () => {
    if (!selectedShotId) return;
    const newPrompt: Prompt = {
      id: generateId('prompt'),
      shotId: selectedShotId,
      type: 'image',
      toolTarget: 'General',
      version: 1,
      text: '',
      notes: '',
    };
    updatePrompts([...project.prompts, newPrompt]);
  };

  const toolTargets: ToolTarget[] = ['General', 'Midjourney', 'Sora', 'Runway', 'Kling', 'Veo', 'ElevenLabs', 'Suno', 'Lip Sync Tool', 'Editing Software'];
  const promptTypes: PromptType[] = ['image', 'text_to_video', 'image_to_video', 'character_consistency', 'style', 'negative', 'voice_over', 'sound_design', 'lip_sync', 'editing_note'];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Prompt Factory</h2>
          <p className="text-sm text-zinc-500 mt-1">Generate, edit and copy prompts by shot and type.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={!selectedShot}>Generate for Shot</Button>
          <Button variant="primary" size="sm" onClick={addPrompt} disabled={!selectedShotId}>+ Add Prompt</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select
          label="Shot"
          options={project.shots.map((s) => ({ value: s.id, label: `Shot ${s.shotNumber} — ${s.whatWeSee.slice(0, 40)}...` }))}
          value={selectedShotId}
          onChange={(e) => setSelectedShotId(e.target.value)}
          className="max-w-xs"
        />
        {selectedShot && (
          <div className="text-xs text-zinc-500 mt-5">{shotPrompts.length} prompts</div>
        )}
      </div>

      {shotPrompts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterType === 'all' ? 'bg-zinc-700 text-zinc-100 border-zinc-600' : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
          >
            All ({shotPrompts.length})
          </button>
          {promptTypes.map((type) => {
            const count = shotPrompts.filter((p) => p.type === type).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterType === type ? 'bg-zinc-700 text-zinc-100 border-zinc-600' : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
              >
                {promptTypeLabels[type]} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((prompt) => (
          <div key={prompt.id} className="border border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${promptTypeColors[prompt.type]}`}>
                  {promptTypeLabels[prompt.type]}
                </span>
                <span className="text-xs text-zinc-500">{prompt.toolTarget} · v{prompt.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={prompt.text} />
                <Button variant="danger" size="sm" onClick={() => deletePrompt(prompt.id)}>Del</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select
                label="Type"
                options={promptTypes.map((t) => ({ value: t, label: promptTypeLabels[t] }))}
                value={prompt.type}
                onChange={(e) => updatePrompt(prompt.id, { type: e.target.value as PromptType })}
              />
              <Select
                label="Tool Target"
                options={toolTargets.map((t) => ({ value: t, label: t }))}
                value={prompt.toolTarget}
                onChange={(e) => updatePrompt(prompt.id, { toolTarget: e.target.value as ToolTarget })}
              />
              <div className="col-span-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Notes</label>
                <input
                  className="mt-1.5 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 transition-colors"
                  value={prompt.notes}
                  onChange={(e) => updatePrompt(prompt.id, { notes: e.target.value })}
                  placeholder="Version notes, iteration context..."
                />
              </div>
            </div>

            <Textarea
              label="Prompt Text"
              value={prompt.text}
              onChange={(e) => updatePrompt(prompt.id, { text: e.target.value })}
              className="min-h-[120px] font-mono text-xs"
            />
          </div>
        ))}
      </div>

      {filtered.length === 0 && selectedShotId && (
        <div className="text-center py-12 text-zinc-600">
          <p className="text-base mb-2">No prompts for this shot yet.</p>
          <p className="text-sm">Generate prompts or add one manually.</p>
        </div>
      )}

      {!selectedShotId && (
        <div className="text-center py-12 text-zinc-600">
          <p className="text-base mb-2">No shots in the project.</p>
          <p className="text-sm">Build your storyboard first.</p>
        </div>
      )}
    </div>
  );
}
