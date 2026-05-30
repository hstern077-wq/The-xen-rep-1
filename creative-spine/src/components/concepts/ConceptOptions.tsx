'use client';

import { Project, Concept, ConceptDirectionType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { generateId } from '@/lib/utils';
import { generateConceptOptions } from '@/lib/generators';

interface ConceptOptionsProps {
  project: Project;
  onChange: (updates: Partial<Project>) => void;
}

const directionColors: Record<ConceptDirectionType, string> = {
  safe: 'border-blue-800/50 bg-blue-950/20',
  cinematic: 'border-emerald-800/50 bg-emerald-950/20',
  weird: 'border-yellow-800/50 bg-yellow-950/20',
};

const directionBadge: Record<ConceptDirectionType, string> = {
  safe: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  cinematic: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
  weird: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
};

export function ConceptOptions({ project, onChange }: ConceptOptionsProps) {
  const updateConcepts = (concepts: Concept[]) => onChange({ concepts });

  const addConcept = () => {
    const newConcept: Concept = {
      id: generateId('concept'),
      title: 'New Concept',
      directionType: 'safe',
      logline: '',
      whyItWorks: '',
      character: '',
      conflict: '',
      visualWorld: '',
      beginning: '',
      middle: '',
      end: '',
      punch: '',
      risks: '',
      productionDifficulty: 'Medium',
      selected: false,
    };
    updateConcepts([...project.concepts, newConcept]);
  };

  const deleteConcept = (id: string) => updateConcepts(project.concepts.filter((c) => c.id !== id));

  const duplicateConcept = (c: Concept) => {
    const copy = { ...c, id: generateId('concept'), title: c.title + ' (copy)', selected: false };
    updateConcepts([...project.concepts, copy]);
  };

  const updateConcept = (id: string, updates: Partial<Concept>) => {
    updateConcepts(project.concepts.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const selectConcept = (id: string) => {
    updateConcepts(project.concepts.map((c) => ({ ...c, selected: c.id === id })));
  };

  const handleGenerate = () => {
    const generated = generateConceptOptions(project);
    updateConcepts(generated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Concept Options</h2>
          <p className="text-sm text-zinc-500 mt-1">Three creative directions. Pick one. Or build a fourth.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleGenerate}>Generate 3 Concepts</Button>
          <Button variant="primary" size="sm" onClick={addConcept}>+ Add Concept</Button>
        </div>
      </div>

      <div className="space-y-6">
        {project.concepts.map((concept) => (
          <div key={concept.id} className={`border rounded-xl p-5 space-y-4 ${concept.selected ? 'border-emerald-600/50 bg-emerald-950/10' : directionColors[concept.directionType]}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={concept.title}
                  onChange={(e) => updateConcept(concept.id, { title: e.target.value })}
                  placeholder="Concept title"
                  className="text-base font-semibold"
                />
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${directionBadge[concept.directionType]}`}>
                  {concept.directionType}
                </span>
                {concept.selected && (
                  <span className="shrink-0 px-2 py-0.5 bg-emerald-700 rounded-full text-xs font-medium text-white">Selected</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant={concept.selected ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => selectConcept(concept.id)}
                >
                  {concept.selected ? '✓ Selected' : 'Select'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => duplicateConcept(concept)}>Dupe</Button>
                <Button variant="danger" size="sm" onClick={() => deleteConcept(concept.id)}>Del</Button>
              </div>
            </div>

            <Select
              label="Direction Type"
              options={[
                { value: 'safe', label: 'Safe — Clean and clear' },
                { value: 'cinematic', label: 'Cinematic — Emotional and visual' },
                { value: 'weird', label: 'Weird — Unexpected and memorable' },
              ]}
              value={concept.directionType}
              onChange={(e) => updateConcept(concept.id, { directionType: e.target.value as ConceptDirectionType })}
            />

            <Textarea
              label="Logline"
              value={concept.logline}
              onChange={(e) => updateConcept(concept.id, { logline: e.target.value })}
              placeholder="One sentence. The whole story."
              className="min-h-[60px]"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="Why It Works"
                value={concept.whyItWorks}
                onChange={(e) => updateConcept(concept.id, { whyItWorks: e.target.value })}
                placeholder="Why will this land with an audience?"
                className="min-h-[70px]"
              />
              <Textarea
                label="Visual World"
                value={concept.visualWorld}
                onChange={(e) => updateConcept(concept.id, { visualWorld: e.target.value })}
                placeholder="What does this film look like?"
                className="min-h-[70px]"
              />
              <Textarea
                label="Main Character"
                value={concept.character}
                onChange={(e) => updateConcept(concept.id, { character: e.target.value })}
                placeholder="Who are we following?"
                className="min-h-[60px]"
              />
              <Textarea
                label="Conflict"
                value={concept.conflict}
                onChange={(e) => updateConcept(concept.id, { conflict: e.target.value })}
                placeholder="What is the central tension?"
                className="min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Textarea
                label="Beginning"
                value={concept.beginning}
                onChange={(e) => updateConcept(concept.id, { beginning: e.target.value })}
                className="min-h-[70px]"
              />
              <Textarea
                label="Middle"
                value={concept.middle}
                onChange={(e) => updateConcept(concept.id, { middle: e.target.value })}
                className="min-h-[70px]"
              />
              <Textarea
                label="End"
                value={concept.end}
                onChange={(e) => updateConcept(concept.id, { end: e.target.value })}
                className="min-h-[70px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Textarea
                label="The Punch"
                value={concept.punch}
                onChange={(e) => updateConcept(concept.id, { punch: e.target.value })}
                placeholder="The final moment that lands."
                className="min-h-[60px]"
              />
              <Textarea
                label="Risks"
                value={concept.risks}
                onChange={(e) => updateConcept(concept.id, { risks: e.target.value })}
                className="min-h-[60px]"
              />
              <Input
                label="Production Difficulty"
                value={concept.productionDifficulty}
                onChange={(e) => updateConcept(concept.id, { productionDifficulty: e.target.value })}
                placeholder="Low / Medium / High / Very High"
              />
            </div>
          </div>
        ))}
      </div>

      {project.concepts.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-lg mb-2">No concepts yet.</p>
          <p className="text-sm">Generate 3 concepts or add one manually.</p>
        </div>
      )}
    </div>
  );
}
