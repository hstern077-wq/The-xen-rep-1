import { Shot, Project } from './types';

export function generateImagePromptFromShot(shot: Shot, project: Project): string {
  return `Cinematic frame for AI-assisted short video.

Project: ${project.title}
Format: ${project.format}
Emotion: ${project.mainEmotion}

Shot ${shot.shotNumber} — ${shot.shotType}:
Character: ${shot.character || 'none'}
Action: ${shot.action}
Location: ${shot.location}
Camera: ${shot.cameraAngle}, ${shot.cameraMovement}
Lighting: ${shot.lighting}
Style: ${shot.visualStyle}
Composition: ${shot.composition}
Color: ${shot.color}

Photorealistic, cinematic, ${project.format}, ${shot.visualStyle || 'cinematic style'}`;
}

export function generateTextToVideoPromptFromShot(shot: Shot, project: Project): string {
  return `Short cinematic video shot.

Duration: ${shot.duration}
Camera: ${shot.cameraMovement}
Subject: ${shot.character || 'scene'} — ${shot.action}
Environment: ${shot.location}
Atmosphere: ${project.mainEmotion}
Pacing: cinematic, deliberate
Lighting: ${shot.lighting}
Style: ${shot.visualStyle}
What must stay stable: character identity, lighting direction, color palette
What changes: ${shot.action || 'subtle atmosphere shift'}`;
}

export function generateImageToVideoPromptFromShot(shot: Shot, _project: Project): string {
  return `Animate the provided image.

What should move: ${shot.action}
What stays stable: background, character identity, lighting
Camera motion: ${shot.cameraMovement}
Subject motion: subtle, motivated
Atmosphere: ${shot.visualStyle}
Pacing: slow, cinematic
Avoid: identity drift, object deformation, flickering, warped faces`;
}

export function generateNegativePromptFromShot(_shot: Shot, _project: Project): string {
  return `distorted anatomy, extra limbs, unreadable text, random logos, inconsistent character identity, messy object logic, broken camera perspective, low resolution, overcomplicated composition, plastic toy look, flickering, warped face, inconsistent lighting, watermarks, blurry foreground`;
}

export function generateCharacterConsistencyPrompt(shot: Shot, project: Project): string {
  const concept = project.concepts.find((c) => c.selected) ?? project.concepts[0];
  return `Character consistency prompt for: ${shot.character || project.title}

Reference: ${concept?.character ?? 'Giant fluffy round green bird monster'}
Key features to preserve:
- Color palette: ${shot.color}
- Body type: round, soft, large
- Expression range: furious but adorable
- Texture: fluffy feathers, soft edges
- Scale reference: much larger than surrounding environment

Ensure: same beak shape, same eye style, same feather texture in every shot.`;
}

export function generateSoundDesignPrompt(shot: Shot, project: Project): string {
  return `Sound design for Shot ${shot.shotNumber} — ${project.title}

Ambience: ${shot.location} — ${shot.visualStyle}
Main sound events: ${shot.soundEffects || 'ambient environment'}
Emotional sound layer: ${project.mainEmotion}
Music note: ${shot.musicNote || 'match cinematic tone'}
Transitions: smooth, motivated
Silence moments: use before key impacts
Punchline sound: land on the cut
Mix note: keep dialogue intelligible, let sound design carry emotion`;
}

export function generateVoiceOverPrompt(shot: Shot, _project: Project): string {
  if (!shot.voiceOver) {
    return `No voice over for Shot ${shot.shotNumber}. This is a visual/sound-only moment.`;
  }
  return `Voice over for Shot ${shot.shotNumber}:

Script: "${shot.voiceOver}"

Tone: warm, slightly detached, observational
Pace: slow, deliberate pauses
Emotional direction: curious turning to recognition
Pauses: breathe before key words
Pronunciation: natural, not announcer-style`;
}

export function generateLipSyncPrompt(shot: Shot, _project: Project): string {
  if (!shot.dialogue) {
    return `No dialogue in Shot ${shot.shotNumber}. No lip sync needed.`;
  }
  return `Lip sync for Shot ${shot.shotNumber}:

Character: ${shot.character}
Dialogue: "${shot.dialogue}"
Reference frame: use approved character image
Mouth shape: match phonemes precisely
Head movement: subtle, motivated by speech
Preserve: character identity, feather texture, eye expression
Avoid: uncanny valley, plastic skin, expression overemphasis`;
}

export function generateEditingNote(shot: Shot, project: Project): string {
  return `Editing note — Shot ${shot.shotNumber} (${shot.duration}):

Cut in on: ${shot.action}
Cut out on: end of movement — do not linger
Transition: ${shot.shotNumber === 1 ? 'fade in from black' : shot.shotNumber === project.shots.length ? 'slow fade to black' : 'hard cut or match cut'}
Pacing: ${shot.visualStyle?.toLowerCase().includes('slow') ? 'slow, held frames' : 'cinematic tempo'}
Sound edit: lead with sound into this cut
Color grade: match to ${shot.color} palette
VFX note: ${shot.notes || 'no special VFX noted'}`;
}
