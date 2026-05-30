import { Project } from './types';

export function exportBriefMarkdown(p: Project): string {
  return `# Creative Brief: ${p.title}

**Format:** ${p.format} | **Duration:** ${p.duration} | **Platform:** ${p.platform}

## Project Details
- **Target Audience:** ${p.targetAudience}
- **Main Emotion:** ${p.mainEmotion}
- **Main Message:** ${p.mainMessage}
- **Creative Tension:** ${p.creativeTension}

## Story
- **Hook:** ${p.hook}
- **Payoff:** ${p.payoff}
- **Visual Promise:** ${p.visualPromise}

## Production
- **Tools:** ${p.tools}
- **Notes:** ${p.notes}
`;
}

export function exportInsightMarkdown(p: Project): string {
  const i = p.insight;
  return `# Core Insight: ${p.title}

## One Sentence Summary
${i.oneSentenceSummary}

## Core Insight
${i.coreInsight}

## Emotional Goal
${i.emotionalGoal}

## Viewer Takeaway
${i.viewerTakeaway}

## Conflict
${i.conflict}

## Metaphor
${i.metaphor}

## Creative Tension
${i.tension}

## Why It Works
${i.whyItWorks}

## Risks
${i.risks}
`;
}

export function exportMindMapMarkdown(p: Project): string {
  const nodes = p.mindMapNodes
    .map(
      (n) =>
        `### ${n.label} [${n.type}] ${n.isWeird ? '⚡' : ''} ${n.strength === 'high' ? '★' : n.strength === 'medium' ? '◆' : '○'}

${n.content}
`
    )
    .join('\n');

  return `# Mind Map: ${p.title}

${nodes}
`;
}

export function exportConceptsMarkdown(p: Project): string {
  const concepts = p.concepts
    .map(
      (c) =>
        `## ${c.title} [${c.directionType}]${c.selected ? ' ✓ SELECTED' : ''}

**Logline:** ${c.logline}

**Why It Works:** ${c.whyItWorks}

**Character:** ${c.character}

**Conflict:** ${c.conflict}

**Visual World:** ${c.visualWorld}

### Story Structure
- **Beginning:** ${c.beginning}
- **Middle:** ${c.middle}
- **End:** ${c.end}
- **Punch:** ${c.punch}

**Risks:** ${c.risks}

**Production Difficulty:** ${c.productionDifficulty}
`
    )
    .join('\n---\n\n');

  return `# Concept Options: ${p.title}

${concepts}
`;
}

export function exportBeatSheetMarkdown(p: Project): string {
  const beats = p.beats
    .map(
      (b) =>
        `## Beat ${b.beatNumber}: ${b.role.toUpperCase()} (${b.duration})

**Emotion:** ${b.emotion}

**What We See:** ${b.whatWeSee}

**What We Hear:** ${b.whatWeHear}

**What Changes:** ${b.whatChanges}

**Story Purpose:** ${b.storyPurpose}

**Visual Style:** ${b.visualStyle}
`
    )
    .join('\n---\n\n');

  return `# Beat Sheet: ${p.title}

${beats}
`;
}

export function exportStoryboardMarkdown(p: Project): string {
  const shots = p.shots
    .map(
      (s) =>
        `## Shot ${s.shotNumber} — ${s.shotType} | ${s.duration} | Status: ${s.status}

**Location:** ${s.location}
**Character:** ${s.character}
**Action:** ${s.action}

**What We See:** ${s.whatWeSee}

**What We Hear:** ${s.whatWeHear}

${s.voiceOver ? `**Voice Over:** ${s.voiceOver}\n` : ''}${s.dialogue ? `**Dialogue:** ${s.dialogue}\n` : ''}

### Camera
- **Shot Type:** ${s.shotType}
- **Angle:** ${s.cameraAngle}
- **Movement:** ${s.cameraMovement}

### Visual
- **Style:** ${s.visualStyle}
- **Lighting:** ${s.lighting}
- **Color:** ${s.color}
- **Composition:** ${s.composition}

### Prompts
**Image Prompt:**
\`\`\`
${s.imagePrompt}
\`\`\`

**Video Prompt:**
\`\`\`
${s.videoPrompt}
\`\`\`

**Negative Prompt:**
\`\`\`
${s.negativePrompt}
\`\`\`

**Tool:** ${s.tool}
${s.notes ? `**Notes:** ${s.notes}` : ''}
`
    )
    .join('\n---\n\n');

  return `# Visual Storyboard: ${p.title}

${shots}
`;
}

export function exportPromptsMarkdown(p: Project): string {
  const grouped = p.shots.map((shot) => {
    const shotPrompts = p.prompts.filter((pr) => pr.shotId === shot.id);
    if (shotPrompts.length === 0) return '';
    const promptList = shotPrompts
      .map(
        (pr) =>
          `### ${pr.type.replace(/_/g, ' ').toUpperCase()} — ${pr.toolTarget} (v${pr.version})

\`\`\`
${pr.text}
\`\`\`
${pr.notes ? `*${pr.notes}*` : ''}
`
      )
      .join('\n');

    return `## Shot ${shot.shotNumber}: ${shot.whatWeSee.slice(0, 60)}...

${promptList}`;
  });

  return `# Prompt List: ${p.title}

${grouped.filter(Boolean).join('\n---\n\n')}
`;
}

export function exportAssetsMarkdown(p: Project): string {
  const rows = p.assets
    .map((a) => {
      const shot = p.shots.find((s) => s.id === a.shotId);
      return `| Shot ${shot?.shotNumber ?? '?'} | ${a.assetType} | ${a.tool} | ${a.fileName || '—'} | **${a.status}** | ${a.problem || '—'} | ${a.nextAction || '—'} |`;
    })
    .join('\n');

  return `# Asset Tracker: ${p.title}

| Shot | Type | Tool | File | Status | Problem | Next Action |
|------|------|------|------|--------|---------|-------------|
${rows}
`;
}

export function exportFullProductionPackMarkdown(p: Project): string {
  return [
    exportBriefMarkdown(p),
    exportInsightMarkdown(p),
    exportConceptsMarkdown(p),
    exportBeatSheetMarkdown(p),
    exportStoryboardMarkdown(p),
    exportPromptsMarkdown(p),
    exportAssetsMarkdown(p),
  ].join('\n\n---\n\n');
}

export function exportMakingOfMarkdown(p: Project): string {
  return `# Making Of: ${p.title}

## Initial Idea
${p.idea.messyIdea}

## Creative Insight
${p.insight.coreInsight}

## Chosen Concept
${p.concepts.find((c) => c.selected)?.title ?? 'Not selected yet'}

${p.concepts.find((c) => c.selected)?.logline ?? ''}

## Character Decisions
${p.concepts.find((c) => c.selected)?.character ?? ''}

## Visual Style Decisions
${p.visualPromise}

## Tool Stack
${p.tools}

## What I Wanted to Avoid
${p.idea.avoid}

## What Excited Me
${p.idea.excitement}

## Production Notes
${p.notes}
`;
}
