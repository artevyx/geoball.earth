import {
  it,
  expect,
  describe,
} from 'vitest';
import {
  recordingProgress,
  canPersistRecording,
  removalActionForState,
  recordingGlyphForState,
} from '../src/recordingState';


describe('recording state domain', () => {
  it('maps states to the language-agnostic marker glyphs', () => {
    expect(recordingGlyphForState('localOnly')).toBe('yellowSquare');
    expect(recordingGlyphForState('pinnedLocal')).toBe('cyanTriangle');
    expect(recordingGlyphForState('propagated')).toBe('limeAsterisk');
    expect(recordingGlyphForState('redlisted')).toBe('redCircle');
  });

  it('deletes local-only recordings but redlists shared states', () => {
    expect(removalActionForState('localOnly')).toBe('delete');
    expect(removalActionForState('pinnedLocal')).toBe('redlist');
    expect(removalActionForState('propagated')).toBe('redlist');
  });

  it('clamps the 46-second progress ring', () => {
    expect(recordingProgress(-1, 46_000)).toBe(0);
    expect(recordingProgress(23_000, 46_000)).toBe(0.5);
    expect(recordingProgress(92_000, 46_000)).toBe(1);
    expect(canPersistRecording(45_999, 46_000)).toBe(false);
    expect(canPersistRecording(46_000, 46_000)).toBe(true);
  });
});
