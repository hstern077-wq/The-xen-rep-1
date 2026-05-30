import { Project, MindMapNode, Concept, Beat, Shot, Asset } from './types';
import { generateId } from './utils';

export function structureIdea(project: Project): Partial<Project> {
  const { idea } = project;
  return {
    hook: idea.messyIdea.split('.')[0]?.trim() + '.' || project.hook,
    mainEmotion: idea.excitement ? idea.excitement.split('.')[0]?.trim() : project.mainEmotion,
    notes: `Structured from idea dump.\n\nWants: ${idea.wants}\nAvoid: ${idea.avoid}\nFears: ${idea.fears}`,
  };
}

export function generateInsightDraft(project: Project): Partial<Project['insight']> {
  const { idea, hook, mainEmotion } = project;
  return {
    coreInsight: `The story is about: ${idea.messyIdea.slice(0, 120)}`,
    emotionalGoal: mainEmotion || `The viewer should feel: ${idea.excitement.slice(0, 80)}`,
    viewerTakeaway: `Something shifts in the viewer when they realize: ${idea.wants.slice(0, 100)}`,
    conflict: `The tension between ${idea.wants.slice(0, 60)} and ${idea.avoid.slice(0, 60)}`,
    metaphor: idea.randomImages.split(',')[0]?.trim() || 'Visual metaphor TBD',
    tension: `${hook} — but at what cost?`,
    whyItWorks: `Because it makes visible what is normally invisible: ${idea.excitement.slice(0, 100)}`,
    risks: idea.fears || 'Not defined yet',
    oneSentenceSummary: `${project.title}: ${hook || idea.messyIdea.slice(0, 80)}`,
  };
}

export function generateMindMapFromIdea(project: Project): MindMapNode[] {
  const base: Omit<MindMapNode, 'id'>[] = [
    {
      label: 'Core Idea',
      type: 'core_idea',
      content: project.idea.messyIdea.slice(0, 150),
      strength: 'high',
      isWeird: false,
      connectedTo: [],
    },
    {
      label: 'Main Emotion',
      type: 'emotion',
      content: project.mainEmotion || 'To be defined',
      strength: 'high',
      isWeird: false,
      connectedTo: [],
    },
    {
      label: 'Visual World',
      type: 'visual_metaphor',
      content: project.idea.randomImages || 'Images TBD',
      strength: 'medium',
      isWeird: false,
      connectedTo: [],
    },
    {
      label: 'What to Avoid',
      type: 'production_note',
      content: project.idea.avoid || 'Nothing defined yet',
      strength: 'low',
      isWeird: false,
      connectedTo: [],
    },
    {
      label: 'What Excites Me',
      type: 'crazy_idea',
      content: project.idea.excitement || 'To be defined',
      strength: 'high',
      isWeird: true,
      connectedTo: [],
    },
  ];
  return base.map((n) => ({ ...n, id: generateId('node') }));
}

export function generateConceptOptions(project: Project): Concept[] {
  const title = project.title;
  const loglineBase = project.insight.oneSentenceSummary || project.idea.messyIdea.slice(0, 80);

  return [
    {
      id: generateId('concept'),
      title: `${title} — Clean & Clear`,
      directionType: 'safe',
      logline: `${loglineBase} Told simply and directly.`,
      whyItWorks: 'Accessible, clear emotional arc, strong visual payoff.',
      character: project.concepts[0]?.character || 'Main character TBD',
      conflict: project.insight.conflict || 'Conflict TBD',
      visualWorld: project.visualPromise || 'Visual world TBD',
      beginning: 'Establish the world and character.',
      middle: 'The tension arrives. The character is drawn in.',
      end: 'The consequence lands. The meaning is felt.',
      punch: 'One final image that stays.',
      risks: 'May feel too safe. Too expected.',
      productionDifficulty: 'Low',
      selected: false,
    },
    {
      id: generateId('concept'),
      title: `${title} — Cinematic & Emotional`,
      directionType: 'cinematic',
      logline: `${loglineBase} Told with cinematic scale and emotional weight.`,
      whyItWorks: 'Creates genuine wonder. The emotional arc hits hard. Cinematic scale justifies the format.',
      character: project.concepts[0]?.character || 'Main character TBD',
      conflict: project.insight.conflict || 'Conflict TBD',
      visualWorld: `${project.visualPromise} — Epic scale, intimate emotional core.`,
      beginning: 'Open with scale. Establish the world\'s beauty.',
      middle: 'The character is tested. Something is at stake.',
      end: 'The transformation. What is gained and what is lost.',
      punch: 'Silence after the impact.',
      risks: 'Too slow for short-form. May lose viewers before the payoff.',
      productionDifficulty: 'High',
      selected: false,
    },
    {
      id: generateId('concept'),
      title: `${title} — Weird & Memorable`,
      directionType: 'weird',
      logline: `What if everything we assumed about this story was wrong? ${loglineBase}`,
      whyItWorks: 'Unpredictable. Subverts expectation. The weird reversal makes people rewatch.',
      character: 'The character is not who we think they are.',
      conflict: 'The conflict is not what it seems.',
      visualWorld: `${project.visualPromise} — With a hidden layer that changes everything.`,
      beginning: 'Appears to follow the expected path.',
      middle: 'Something is off. The logic shifts.',
      end: 'The reversal. The viewer rewatches immediately.',
      punch: 'The moment they realize they were the point all along.',
      risks: 'Too conceptual. May not land without perfect execution.',
      productionDifficulty: 'Very High',
      selected: false,
    },
  ];
}

export function generateBeatSheetFromSelectedConcept(project: Project): Beat[] {
  const concept = project.concepts.find((c) => c.selected) ?? project.concepts[0];
  if (!concept) return [];

  const roles: Beat['role'][] = ['hook', 'setup', 'escalation', 'transformation', 'reveal', 'punch'];
  const durations = ['0:00–0:08', '0:08–0:18', '0:18–0:30', '0:30–0:40', '0:40–0:52', '0:52–1:00'];
  const sections = [
    { see: concept.beginning, change: 'World established', purpose: 'Hook the viewer. Establish scale.' },
    { see: `Developing: ${concept.beginning}`, change: 'Character introduced', purpose: 'Set up the stakes.' },
    { see: concept.middle, change: 'Tension builds', purpose: 'The pull becomes unavoidable.' },
    { see: `Transformation begins: ${concept.conflict}`, change: 'Point of no return', purpose: 'The viewer realizes what this is about.' },
    { see: concept.end, change: 'The meaning lands', purpose: 'The visual metaphor becomes clear.' },
    { see: concept.punch, change: 'Final emotional state', purpose: 'The viewer is left with a feeling.' },
  ];

  return roles.map((role, i) => ({
    id: generateId('beat'),
    beatNumber: i + 1,
    duration: durations[i],
    role,
    whatWeSee: sections[i].see,
    whatWeHear: `Sound design supports the ${role} beat`,
    whatChanges: sections[i].change,
    emotion: project.mainEmotion || 'Emotional arc TBD',
    storyPurpose: sections[i].purpose,
    visualStyle: project.visualPromise || 'Visual style TBD',
  }));
}

export function generateStoryboardFromBeats(project: Project): Shot[] {
  return project.beats.map((beat, i) => ({
    id: generateId('shot'),
    shotNumber: i + 1,
    duration: '4s',
    shotType: i === 0 ? 'Wide' : i === project.beats.length - 1 ? 'Wide' : 'Medium',
    cameraAngle: 'Eye level',
    cameraMovement: 'Slow push in',
    location: project.visualPromise || 'Location TBD',
    character: project.concepts.find((c) => c.selected)?.character || '',
    action: beat.whatChanges,
    whatWeSee: beat.whatWeSee,
    whatWeHear: beat.whatWeHear,
    voiceOver: '',
    dialogue: '',
    soundEffects: '',
    musicNote: '',
    visualStyle: beat.visualStyle,
    lighting: 'Natural cinematic',
    color: 'Match project palette',
    composition: 'Rule of thirds',
    imagePrompt: `${beat.whatWeSee} — cinematic, ${project.format}, ${beat.visualStyle}`,
    videoPrompt: `${beat.whatWeSee} — ${beat.whatWeHear} — ${beat.emotion}`,
    negativePrompt: 'distorted anatomy, text, logos, low quality, cartoon',
    tool: 'Midjourney + Runway',
    status: 'idea',
    notes: `Beat ${beat.beatNumber}: ${beat.storyPurpose}`,
  }));
}

export function generatePromptsForShot(project: Project, shot: Shot): Project['prompts'] {
  return [
    {
      id: generateId('prompt'),
      shotId: shot.id,
      type: 'image',
      toolTarget: 'Midjourney',
      version: 1,
      text: `${shot.whatWeSee} — ${shot.visualStyle} — ${shot.lighting} — ${shot.color} — ${project.format} --ar 9:16 --style raw --v 6`,
      notes: `Generated from Shot ${shot.shotNumber}`,
    },
    {
      id: generateId('prompt'),
      shotId: shot.id,
      type: 'text_to_video',
      toolTarget: 'Runway',
      version: 1,
      text: `${shot.action}. ${shot.cameraMovement}. ${shot.duration}. ${shot.visualStyle}. What stays stable: character identity, lighting. What changes: ${shot.action}.`,
      notes: `Generated from Shot ${shot.shotNumber}`,
    },
    {
      id: generateId('prompt'),
      shotId: shot.id,
      type: 'negative',
      toolTarget: 'General',
      version: 1,
      text: shot.negativePrompt || 'distorted anatomy, extra limbs, text, logos, low quality, flickering, warped face',
      notes: `Generated from Shot ${shot.shotNumber}`,
    },
  ];
}

export function generateAssetsFromStoryboard(project: Project): Asset[] {
  const assets: Asset[] = [];
  for (const shot of project.shots) {
    assets.push({
      id: generateId('asset'),
      shotId: shot.id,
      assetType: 'image',
      tool: 'Midjourney',
      promptVersion: 1,
      fileName: '',
      status: 'not_started',
      problem: '',
      nextAction: 'Begin prompting',
      approvedVersion: '',
      notes: `Image asset for Shot ${shot.shotNumber}`,
    });
    assets.push({
      id: generateId('asset'),
      shotId: shot.id,
      assetType: 'video',
      tool: 'Runway',
      promptVersion: 1,
      fileName: '',
      status: 'not_started',
      problem: '',
      nextAction: 'Generate after image approved',
      approvedVersion: '',
      notes: `Video asset for Shot ${shot.shotNumber}`,
    });
  }
  return assets;
}
