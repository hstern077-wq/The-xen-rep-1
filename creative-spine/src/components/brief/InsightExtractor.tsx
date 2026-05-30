'use client';

import { Project, Insight } from '@/lib/types';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { generateInsightDraft } from '@/lib/generators';
import { exportInsightMarkdown } from '@/lib/exportMarkdown';

interface InsightExtractorProps {
  project: Project;
  onChange: (updates: Partial<Project>) => void;
}

function updateInsight(project: Project, onChange: (u: Partial<Project>) => void, field: keyof Insight, value: string) {
  onChange({ insight: { ...project.insight, [field]: value } });
}

export function InsightExtractor({ project, onChange }: InsightExtractorProps) {
  const handleGenerate = () => {
    const draft = generateInsightDraft(project);
    onChange({ insight: { ...project.insight, ...draft } });
  };

  const insightText = exportInsightMarkdown(project);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Insight Extractor</h2>
          <p className="text-sm text-zinc-500 mt-1">Turn the idea into meaning. Find what the film is really about.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleGenerate}>Generate Insight Draft</Button>
          <CopyButton text={insightText} label="Copy Insight" />
        </div>
      </div>

      {project.insight.oneSentenceSummary && (
        <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl px-5 py-4">
          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">One Sentence Summary</p>
          <p className="text-zinc-100 text-base font-medium leading-relaxed">{project.insight.oneSentenceSummary}</p>
        </div>
      )}

      <Textarea
        label="Core Insight"
        value={project.insight.coreInsight}
        onChange={(e) => updateInsight(project, onChange, 'coreInsight', e.target.value)}
        placeholder="What is this film really about? The deeper truth beneath the surface idea."
        className="min-h-[100px]"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Textarea
          label="Emotional Goal"
          value={project.insight.emotionalGoal}
          onChange={(e) => updateInsight(project, onChange, 'emotionalGoal', e.target.value)}
          placeholder="What should the viewer feel during and after the film?"
          className="min-h-[80px]"
        />
        <Textarea
          label="Viewer Takeaway"
          value={project.insight.viewerTakeaway}
          onChange={(e) => updateInsight(project, onChange, 'viewerTakeaway', e.target.value)}
          placeholder="What does the viewer understand that they didn't before?"
          className="min-h-[80px]"
        />
        <Textarea
          label="Conflict"
          value={project.insight.conflict}
          onChange={(e) => updateInsight(project, onChange, 'conflict', e.target.value)}
          placeholder="What is the central conflict driving the story?"
          className="min-h-[80px]"
        />
        <Textarea
          label="Visual Metaphor"
          value={project.insight.metaphor}
          onChange={(e) => updateInsight(project, onChange, 'metaphor', e.target.value)}
          placeholder="What image or object carries the meaning of the whole film?"
          className="min-h-[80px]"
        />
        <Textarea
          label="Creative Tension"
          value={project.insight.tension}
          onChange={(e) => updateInsight(project, onChange, 'tension', e.target.value)}
          placeholder="What contradiction sits at the heart of this story?"
          className="min-h-[80px]"
        />
        <Textarea
          label="Why It Works"
          value={project.insight.whyItWorks}
          onChange={(e) => updateInsight(project, onChange, 'whyItWorks', e.target.value)}
          placeholder="Why will this idea land with an audience?"
          className="min-h-[80px]"
        />
      </div>

      <Textarea
        label="Risks"
        value={project.insight.risks}
        onChange={(e) => updateInsight(project, onChange, 'risks', e.target.value)}
        placeholder="What could go wrong? What might not work?"
        className="min-h-[80px]"
      />

      <Textarea
        label="One Sentence Summary"
        value={project.insight.oneSentenceSummary}
        onChange={(e) => updateInsight(project, onChange, 'oneSentenceSummary', e.target.value)}
        placeholder="One sentence. No fluff. The entire film in 20 words."
        className="min-h-[60px]"
      />
    </div>
  );
}
