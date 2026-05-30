'use client';

import { Project, Idea } from '@/lib/types';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { structureIdea } from '@/lib/generators';

interface IdeaDumpProps {
  project: Project;
  onChange: (updates: Partial<Project>) => void;
}

function updateIdea(project: Project, onChange: (u: Partial<Project>) => void, field: keyof Idea, value: string) {
  onChange({ idea: { ...project.idea, [field]: value } });
}

export function IdeaDump({ project, onChange }: IdeaDumpProps) {
  const handleStructure = () => {
    const updates = structureIdea(project);
    onChange(updates);
  };

  const handleEmotionalCore = () => {
    onChange({
      idea: {
        ...project.idea,
        excitement: project.idea.excitement || `The most exciting moment is when: ${project.idea.messyIdea.split('.')[0]}. This matters because it makes the viewer recognize something invisible about themselves.`,
      },
      mainEmotion: project.mainEmotion || 'Amused recognition → quiet dread',
    });
  };

  const handleVisualMetaphor = () => {
    onChange({
      idea: {
        ...project.idea,
        randomImages: project.idea.randomImages
          ? project.idea.randomImages
          : `Key images: ${project.idea.messyIdea.split(',')[0]?.trim()}, scale contrast, light vs shadow, small object enormous consequence.`,
      },
    });
  };

  const handleSimpler = () => {
    const core = project.idea.messyIdea.split('.')[0]?.trim() ?? project.idea.messyIdea;
    onChange({
      idea: {
        ...project.idea,
        messyIdea: `SIMPLIFIED: ${core}. One character. One moment. One consequence.`,
      },
    });
  };

  const handleWeirder = () => {
    onChange({
      idea: {
        ...project.idea,
        messyIdea: `WEIRDER: ${project.idea.messyIdea} — But what if the phone was the protagonist? What if the viewer is the real monster? What if the ending subverts everything?`,
      },
    });
  };

  const handleCinematic = () => {
    onChange({
      idea: {
        ...project.idea,
        randomImages: `CINEMATIC LAYER: ${project.idea.randomImages}\n\n— Epic wide establishing shot\n— Intimate close-up revealing character\n— POV shot that puts viewer inside the scene\n— Final pull-back to reveal true scale`,
      },
    });
  };

  const handlePunch = () => {
    onChange({
      idea: {
        ...project.idea,
        excitement: `THE PUNCH: ${project.idea.excitement || 'The final moment that changes everything.'}\n\nThe viewer should leave with one image burned in their memory: ${project.idea.messyIdea.split('.').pop()?.trim() || 'the final frame.'}`,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Idea Dump</h2>
        <p className="text-sm text-zinc-500 mt-1">Put everything out. No judgment. Chaos is the starting point.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={handleStructure}>Structure this idea</Button>
        <Button variant="ghost" size="sm" onClick={handleEmotionalCore}>Find emotional core</Button>
        <Button variant="ghost" size="sm" onClick={handleVisualMetaphor}>Find visual metaphor</Button>
        <Button variant="ghost" size="sm" onClick={handleSimpler}>Make it simpler</Button>
        <Button variant="ghost" size="sm" onClick={handleWeirder}>Make it weirder</Button>
        <Button variant="ghost" size="sm" onClick={handleCinematic}>Make it more cinematic</Button>
        <Button variant="ghost" size="sm" onClick={handlePunch}>Find the punch</Button>
      </div>

      <Textarea
        label="Messy Idea"
        value={project.idea.messyIdea}
        onChange={(e) => updateIdea(project, onChange, 'messyIdea', e.target.value)}
        placeholder="Dump everything here. The more chaotic, the better. Just write."
        className="min-h-[140px]"
      />

      <Textarea
        label="Random Images in My Head"
        value={project.idea.randomImages}
        onChange={(e) => updateIdea(project, onChange, 'randomImages', e.target.value)}
        placeholder="Specific visual moments, colors, compositions, textures, frames..."
        className="min-h-[100px]"
      />

      <Textarea
        label="References"
        value={project.idea.references}
        onChange={(e) => updateIdea(project, onChange, 'references', e.target.value)}
        placeholder="Films, videos, images, aesthetics, directors, moods..."
        className="min-h-[80px]"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Textarea
          label="Things I Know I Want"
          value={project.idea.wants}
          onChange={(e) => updateIdea(project, onChange, 'wants', e.target.value)}
          placeholder="Non-negotiables. What must be in this film."
          className="min-h-[100px]"
        />
        <Textarea
          label="Things I Want to Avoid"
          value={project.idea.avoid}
          onChange={(e) => updateIdea(project, onChange, 'avoid', e.target.value)}
          placeholder="What would kill this project. Hard noes."
          className="min-h-[100px]"
        />
        <Textarea
          label="What Scares Me About This"
          value={project.idea.fears}
          onChange={(e) => updateIdea(project, onChange, 'fears', e.target.value)}
          placeholder="What could go wrong. What keeps you up at night."
          className="min-h-[100px]"
        />
        <Textarea
          label="What Excites Me About This"
          value={project.idea.excitement}
          onChange={(e) => updateIdea(project, onChange, 'excitement', e.target.value)}
          placeholder="The moment you keep coming back to. The thing that made you start."
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
}
