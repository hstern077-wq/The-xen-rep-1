'use client';

import { Project, Beat, BeatRole } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { generateId } from '@/lib/utils';
import { generateBeatSheetFromSelectedConcept } from '@/lib/generators';

interface BeatSheetProps {
  project: Project;
  onChange: (updates: Partial<Project>) => void;
}

const roleColors: Record<BeatRole, string> = {
  hook: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  setup: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  escalation: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  transformation: 'bg-violet-900/40 text-violet-300 border-violet-700/40',
  reveal: 'bg-pink-900/40 text-pink-300 border-pink-700/40',
  punch: 'bg-red-900/40 text-red-300 border-red-700/40',
};

const roleOptions: { value: BeatRole; label: string }[] = [
  { value: 'hook', label: 'Hook' },
  { value: 'setup', label: 'Setup' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'transformation', label: 'Transformation' },
  { value: 'reveal', label: 'Reveal' },
  { value: 'punch', label: 'Punch' },
];

export function BeatSheet({ project, onChange }: BeatSheetProps) {
  const updateBeats = (beats: Beat[]) => onChange({ beats });

  const addBeat = () => {
    const newBeat: Beat = {
      id: generateId('beat'),
      beatNumber: project.beats.length + 1,
      duration: '',
      role: 'setup',
      whatWeSee: '',
      whatWeHear: '',
      whatChanges: '',
      emotion: '',
      storyPurpose: '',
      visualStyle: '',
    };
    updateBeats([...project.beats, newBeat]);
  };

  const deleteBeat = (id: string) => {
    const updated = project.beats.filter((b) => b.id !== id).map((b, i) => ({ ...b, beatNumber: i + 1 }));
    updateBeats(updated);
  };

  const duplicateBeat = (beat: Beat) => {
    const copy = { ...beat, id: generateId('beat'), beatNumber: project.beats.length + 1 };
    updateBeats([...project.beats, copy]);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...project.beats];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updateBeats(updated.map((b, i) => ({ ...b, beatNumber: i + 1 })));
  };

  const moveDown = (index: number) => {
    if (index === project.beats.length - 1) return;
    const updated = [...project.beats];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updateBeats(updated.map((b, i) => ({ ...b, beatNumber: i + 1 })));
  };

  const updateBeat = (id: string, updates: Partial<Beat>) => {
    updateBeats(project.beats.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const handleGenerate = () => {
    const generated = generateBeatSheetFromSelectedConcept(project);
    updateBeats(generated);
  };

  const selectedConcept = project.concepts.find((c) => c.selected);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Beat Sheet</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {selectedConcept ? `Building from: "${selectedConcept.title}"` : 'Select a concept first for best results.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleGenerate}>Generate 6-Beat Structure</Button>
          <Button variant="primary" size="sm" onClick={addBeat}>+ Add Beat</Button>
        </div>
      </div>

      {!selectedConcept && (
        <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl px-4 py-3 text-sm text-amber-300">
          No concept selected. Go to Concepts and mark one as selected for the best beat generation.
        </div>
      )}

      <div className="space-y-4">
        {project.beats.map((beat, index) => (
          <div key={beat.id} className="border border-zinc-800 rounded-xl p-5 space-y-4 bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-zinc-600 font-mono text-sm w-8">#{beat.beatNumber}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${roleColors[beat.role]}`}>
                  {beat.role}
                </span>
                <span className="text-xs text-zinc-500">{beat.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => moveUp(index)} disabled={index === 0}>↑</Button>
                <Button variant="ghost" size="sm" onClick={() => moveDown(index)} disabled={index === project.beats.length - 1}>↓</Button>
                <Button variant="ghost" size="sm" onClick={() => duplicateBeat(beat)}>Dupe</Button>
                <Button variant="danger" size="sm" onClick={() => deleteBeat(beat.id)}>Del</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select
                label="Role"
                options={roleOptions}
                value={beat.role}
                onChange={(e) => updateBeat(beat.id, { role: e.target.value as BeatRole })}
              />
              <Input
                label="Duration"
                value={beat.duration}
                onChange={(e) => updateBeat(beat.id, { duration: e.target.value })}
                placeholder="e.g. 0:00–0:08"
              />
              <Input
                label="Emotion"
                value={beat.emotion}
                onChange={(e) => updateBeat(beat.id, { emotion: e.target.value })}
                placeholder="What the viewer feels"
              />
              <Input
                label="Visual Style"
                value={beat.visualStyle}
                onChange={(e) => updateBeat(beat.id, { visualStyle: e.target.value })}
                placeholder="Shot style / look"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="What We See"
                value={beat.whatWeSee}
                onChange={(e) => updateBeat(beat.id, { whatWeSee: e.target.value })}
                className="min-h-[80px]"
              />
              <Textarea
                label="What We Hear"
                value={beat.whatWeHear}
                onChange={(e) => updateBeat(beat.id, { whatWeHear: e.target.value })}
                className="min-h-[80px]"
              />
              <Textarea
                label="What Changes"
                value={beat.whatChanges}
                onChange={(e) => updateBeat(beat.id, { whatChanges: e.target.value })}
                className="min-h-[60px]"
              />
              <Textarea
                label="Story Purpose"
                value={beat.storyPurpose}
                onChange={(e) => updateBeat(beat.id, { storyPurpose: e.target.value })}
                className="min-h-[60px]"
              />
            </div>
          </div>
        ))}
      </div>

      {project.beats.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-lg mb-2">No beats yet.</p>
          <p className="text-sm">Generate a 6-beat structure or add beats manually.</p>
        </div>
      )}
    </div>
  );
}
