import type { RecordingState } from '../types/recording';

export type RecordingGlyph = 'yellowSquare' | 'cyanTriangle' | 'limeAsterisk' | 'redCircle';
export type RecordingRemovalAction = 'delete' | 'redlist';

export function recordingGlyphForState(state: RecordingState): RecordingGlyph {
  switch (state) {
    case 'localOnly': return 'yellowSquare';
    case 'pinnedLocal': return 'cyanTriangle';
    case 'propagated': return 'limeAsterisk';
    case 'redlisted': return 'redCircle';
  }
}

export function removalActionForState(state: RecordingState): RecordingRemovalAction {
  return state === 'localOnly' ? 'delete' : 'redlist';
}

export function recordingProgress(elapsedMs: number, minimumMs: number): number {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(minimumMs) || minimumMs <= 0) return 0;
  return Math.min(1, Math.max(0, elapsedMs / minimumMs));
}

export function canPersistRecording(elapsedMs: number, minimumMs: number): boolean {
  return elapsedMs >= minimumMs;
}
