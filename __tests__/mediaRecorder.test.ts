import {
  vi,
  it,
  expect,
  describe,
  afterEach,
} from 'vitest';
import {
  makeId,
  chooseVideoMimeType,
} from '../src/utils/mediaRecorder';


afterEach(() => vi.unstubAllGlobals());

describe('media recorder helpers', () => {
  it('chooses the first supported video format', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (mime: string) => mime.includes('vp8') });
    expect(chooseVideoMimeType()).toBe('video/webm;codecs=vp8');
  });

  it('creates namespaced ids', () => {
    expect(makeId('recording')).toMatch(/^recording_/);
  });
});
