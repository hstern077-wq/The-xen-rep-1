'use client';

import { useState } from 'react';
import { Project, Shot, ShotStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { generateId } from '@/lib/utils';
import { generateStoryboardFromBeats } from '@/lib/generators';

interface StoryboardProps {
  project: Project;
  onChange: (updates: Partial<Project>) => void;
}

const statusOptions: { value: ShotStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'prompt_ready', label: 'Prompt Ready' },
  { value: 'generated', label: 'Generated' },
  { value: 'needs_refinement', label: 'Needs Refinement' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_edit', label: 'In Edit' },
  { value: 'final', label: 'Final' },
];

export function Storyboard({ project, onChange }: StoryboardProps) {
  const [view, setView] = useState<'cards' | 'table'>('cards');

  const updateShots = (shots: Shot[]) => onChange({ shots });

  const addShot = () => {
    const newShot: Shot = {
      id: generateId('shot'),
      shotNumber: project.shots.length + 1,
      duration: '4s',
      shotType: 'Medium',
      cameraAngle: 'Eye level',
      cameraMovement: 'Static',
      location: '',
      character: '',
      action: '',
      whatWeSee: '',
      whatWeHear: '',
      voiceOver: '',
      dialogue: '',
      soundEffects: '',
      musicNote: '',
      visualStyle: '',
      lighting: '',
      color: '',
      composition: '',
      imagePrompt: '',
      videoPrompt: '',
      negativePrompt: '',
      tool: '',
      status: 'idea',
      notes: '',
    };
    updateShots([...project.shots, newShot]);
  };

  const deleteShot = (id: string) => {
    const updated = project.shots.filter((s) => s.id !== id).map((s, i) => ({ ...s, shotNumber: i + 1 }));
    updateShots(updated);
  };

  const duplicateShot = (shot: Shot) => {
    const copy = { ...shot, id: generateId('shot'), shotNumber: project.shots.length + 1, status: 'idea' as ShotStatus };
    updateShots([...project.shots, copy]);
  };

  const moveShot = (index: number, dir: -1 | 1) => {
    const ni = index + dir;
    if (ni < 0 || ni >= project.shots.length) return;
    const updated = [...project.shots];
    [updated[index], updated[ni]] = [updated[ni], updated[index]];
    updateShots(updated.map((s, i) => ({ ...s, shotNumber: i + 1 })));
  };

  const updateShot = (id: string, updates: Partial<Shot>) => {
    updateShots(project.shots.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleGenerate = () => {
    const generated = generateStoryboardFromBeats(project);
    updateShots(generated);
  };

  if (view === 'table') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Visual Storyboard</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView('cards')}>Card View</Button>
            <Button variant="ghost" size="sm" onClick={handleGenerate}>Generate from Beats</Button>
            <Button variant="primary" size="sm" onClick={addShot}>+ Add Shot</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Duration</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3 min-w-[200px]">What We See</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Tool</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {project.shots.map((shot, index) => (
                <tr key={shot.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 px-3 text-zinc-500 font-mono">{shot.shotNumber}</td>
                  <td className="py-2 px-3 text-zinc-300">{shot.duration}</td>
                  <td className="py-2 px-3 text-zinc-400">{shot.shotType}</td>
                  <td className="py-2 px-3 text-zinc-300 max-w-xs truncate">{shot.whatWeSee}</td>
                  <td className="py-2 px-3"><StatusBadge status={shot.status} /></td>
                  <td className="py-2 px-3 text-zinc-500">{shot.tool}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setView('cards')}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => moveShot(index, -1)}>↑</Button>
                      <Button variant="ghost" size="sm" onClick={() => moveShot(index, 1)}>↓</Button>
                      <Button variant="danger" size="sm" onClick={() => deleteShot(shot.id)}>✕</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Visual Storyboard</h2>
          <p className="text-sm text-zinc-500 mt-1">{project.shots.length} shots · {project.shots.filter(s => s.status === 'final').length} final</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView('table')}>Table View</Button>
          <Button variant="ghost" size="sm" onClick={handleGenerate}>Generate from Beats</Button>
          <Button variant="primary" size="sm" onClick={addShot}>+ Add Shot</Button>
        </div>
      </div>

      <div className="space-y-6">
        {project.shots.map((shot, index) => (
          <div key={shot.id} className="border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden">
            {/* Shot header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900/80">
              <div className="flex items-center gap-3">
                <span className="font-mono text-zinc-500 text-sm">SHOT {shot.shotNumber}</span>
                <StatusBadge status={shot.status} />
                <span className="text-xs text-zinc-500">{shot.duration}</span>
                <span className="text-xs text-zinc-600">{shot.shotType} · {shot.cameraAngle}</span>
              </div>
              <div className="flex items-center gap-1">
                <Select
                  options={statusOptions}
                  value={shot.status}
                  onChange={(e) => updateShot(shot.id, { status: e.target.value as ShotStatus })}
                  className="text-xs py-1 px-2 min-w-[140px]"
                />
                <Button variant="ghost" size="sm" onClick={() => moveShot(index, -1)} disabled={index === 0}>↑</Button>
                <Button variant="ghost" size="sm" onClick={() => moveShot(index, 1)} disabled={index === project.shots.length - 1}>↓</Button>
                <Button variant="ghost" size="sm" onClick={() => duplicateShot(shot)}>Dupe</Button>
                <Button variant="danger" size="sm" onClick={() => deleteShot(shot.id)}>Del</Button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Core shot info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input label="Duration" value={shot.duration} onChange={(e) => updateShot(shot.id, { duration: e.target.value })} placeholder="e.g. 4s" />
                <Input label="Shot Type" value={shot.shotType} onChange={(e) => updateShot(shot.id, { shotType: e.target.value })} placeholder="Wide / Medium / CU" />
                <Input label="Camera Angle" value={shot.cameraAngle} onChange={(e) => updateShot(shot.id, { cameraAngle: e.target.value })} placeholder="Eye level / Low / High" />
                <Input label="Camera Movement" value={shot.cameraMovement} onChange={(e) => updateShot(shot.id, { cameraMovement: e.target.value })} placeholder="Static / Dolly / Pan" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Location" value={shot.location} onChange={(e) => updateShot(shot.id, { location: e.target.value })} />
                <Input label="Character" value={shot.character} onChange={(e) => updateShot(shot.id, { character: e.target.value })} />
              </div>

              <Textarea label="Action" value={shot.action} onChange={(e) => updateShot(shot.id, { action: e.target.value })} className="min-h-[60px]" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea label="What We See" value={shot.whatWeSee} onChange={(e) => updateShot(shot.id, { whatWeSee: e.target.value })} className="min-h-[100px]" />
                <Textarea label="What We Hear" value={shot.whatWeHear} onChange={(e) => updateShot(shot.id, { whatWeHear: e.target.value })} className="min-h-[100px]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea label="Voice Over" value={shot.voiceOver} onChange={(e) => updateShot(shot.id, { voiceOver: e.target.value })} className="min-h-[60px]" />
                <Textarea label="Sound Effects" value={shot.soundEffects} onChange={(e) => updateShot(shot.id, { soundEffects: e.target.value })} className="min-h-[60px]" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input label="Visual Style" value={shot.visualStyle} onChange={(e) => updateShot(shot.id, { visualStyle: e.target.value })} />
                <Input label="Lighting" value={shot.lighting} onChange={(e) => updateShot(shot.id, { lighting: e.target.value })} />
                <Input label="Color" value={shot.color} onChange={(e) => updateShot(shot.id, { color: e.target.value })} />
                <Input label="Tool" value={shot.tool} onChange={(e) => updateShot(shot.id, { tool: e.target.value })} />
              </div>

              {/* Prompts */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Prompts</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider">Image Prompt</label>
                      <CopyButton text={shot.imagePrompt} label="Copy" />
                    </div>
                    <Textarea value={shot.imagePrompt} onChange={(e) => updateShot(shot.id, { imagePrompt: e.target.value })} className="min-h-[80px] font-mono text-xs" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider">Video Prompt</label>
                      <CopyButton text={shot.videoPrompt} label="Copy" />
                    </div>
                    <Textarea value={shot.videoPrompt} onChange={(e) => updateShot(shot.id, { videoPrompt: e.target.value })} className="min-h-[80px] font-mono text-xs" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider">Negative Prompt</label>
                      <CopyButton text={shot.negativePrompt} label="Copy" />
                    </div>
                    <Textarea value={shot.negativePrompt} onChange={(e) => updateShot(shot.id, { negativePrompt: e.target.value })} className="min-h-[60px] font-mono text-xs" />
                  </div>
                </div>
              </div>

              <Textarea label="Notes" value={shot.notes} onChange={(e) => updateShot(shot.id, { notes: e.target.value })} className="min-h-[60px]" />
            </div>
          </div>
        ))}
      </div>

      {project.shots.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-lg mb-2">No shots yet.</p>
          <p className="text-sm">Generate from beats or add shots manually.</p>
        </div>
      )}
    </div>
  );
}
