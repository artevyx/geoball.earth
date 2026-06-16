import { Cartesian3 } from 'cesium';
import {
  GEOBALL_DB_NAME,
  GEOBALL_DB_VERSION,
  RECORDING_CONFIG,
} from './app/config/recordingConfig';
import type {
  RecordingState,
  PlaybackSession,
  BufferedRecording,
} from '../types/Recording';
import type { FrameTelemetrySample } from '../types/Telemetry';

export function openGeoballDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(GEOBALL_DB_NAME, GEOBALL_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('recordings')) {
        const recordings = db.createObjectStore('recordings', { keyPath: 'id' });
        recordings.createIndex('state', 'state', { unique: false });
        recordings.createIndex('startedAtUnixMs', 'startedAtUnixMs', { unique: false });
      }

      if (!db.objectStoreNames.contains('frames')) {
        const frames = db.createObjectStore('frames', { keyPath: 'id' });
        frames.createIndex('recordingId', 'recordingId', { unique: false });
      }

      if (!db.objectStoreNames.contains('frameBlobs')) {
        const blobs = db.createObjectStore('frameBlobs', { keyPath: 'id' });
        blobs.createIndex('recordingId', 'recordingId', { unique: false });
        blobs.createIndex('frameId', 'frameId', { unique: false });
      }

      if (!db.objectStoreNames.contains('videoChunks')) {
        const chunks = db.createObjectStore('videoChunks', { keyPath: 'id' });
        chunks.createIndex('recordingId', 'recordingId', { unique: false });
        chunks.createIndex('stream', 'stream', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadLocalRecordingMarkers(): Promise<Array<{
  id: string;
  state: RecordingState;
  startLatitude: number;
  startLongitude: number;
  startAltitude: number | null;
  pinId: string | null;
}>> {
  const db = await openGeoballDb();
  try {
    const tx = db.transaction('recordings', 'readonly');
    const recordings = await idbRequest<any[]>(tx.objectStore('recordings').getAll());
    return recordings
      .filter((recording) => recording && recording.state === 'localOnly')
      .map((recording) => ({
        id: recording.id,
        state: recording.state,
        startLatitude: recording.startLatitude,
        startLongitude: recording.startLongitude,
        startAltitude: recording.startAltitude ?? null,
        pinId: recording.pinId ?? null,
      }));
  } finally {
    db.close();
  }
}

export async function loadRecordingPlayback(recordingId: string): Promise<PlaybackSession> {
  const db = await openGeoballDb();

  try {
    const tx = db.transaction(['recordings', 'frames', 'videoChunks'], 'readonly');
    const recording = await idbRequest<any>(tx.objectStore('recordings').get(recordingId));
    const storedFrames = await idbRequest<any[]>(tx.objectStore('frames').index('recordingId').getAll(recordingId));
    const storedChunks = await idbRequest<any[]>(tx.objectStore('videoChunks').index('recordingId').getAll(recordingId));

    storedFrames.sort((a, b) => a.frameIndex - b.frameIndex);
    storedChunks.sort((a, b) => a.sequence - b.sequence);

    const hardwareChunks = storedChunks.filter((chunk) => chunk.stream === 'hardware');
    const spatialChunks = storedChunks.filter((chunk) => chunk.stream === 'spatial');

    if (!hardwareChunks.length || !spatialChunks.length) {
      throw new Error('Recording does not contain both video streams');
    }

    const hardwareMimeType = hardwareChunks[0]?.mimeType || 'video/webm';
    const spatialMimeType = spatialChunks[0]?.mimeType || 'video/webm';

    const hardwareBlob = new Blob(hardwareChunks.map((chunk) => chunk.blob), { type: hardwareMimeType });
    const spatialBlob = new Blob(spatialChunks.map((chunk) => chunk.blob), { type: spatialMimeType });

    return {
      recordingId,
      hardwareUrl: URL.createObjectURL(hardwareBlob),
      spatialUrl: URL.createObjectURL(spatialBlob),
      telemetryFrames: storedFrames.map((frame) => frame.telemetry as FrameTelemetrySample),
      durationMs: recording?.durationMs ?? 0,
    };
  } finally {
    db.close();
  }
}

export function revokePlaybackSession(session: PlaybackSession | null): void {
  if (!session) return;
  URL.revokeObjectURL(session.hardwareUrl);
  URL.revokeObjectURL(session.spatialUrl);
}

export async function saveBufferedRecordingToIndexedDb(recording: BufferedRecording): Promise<void> {
  const db = await openGeoballDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['recordings', 'frames', 'videoChunks'], 'readwrite');
      const recordings = tx.objectStore('recordings');
      const frames = tx.objectStore('frames');
      const videoChunks = tx.objectStore('videoChunks');
      const endedAtUnixMs = Date.now();

      recordings.put({
        id: recording.id,
        state: 'localOnly' satisfies RecordingState,
        pinId: null,
        startedAtUnixMs: recording.startedAtUnixMs,
        endedAtUnixMs,
        durationMs: endedAtUnixMs - recording.startedAtUnixMs,
        startLatitude: recording.firstGeo.lat,
        startLongitude: recording.firstGeo.lon,
        startAltitude: recording.firstGeo.altitude,
        frameIds: recording.telemetryFrames.map((frame) => `${recording.id}_telemetry_${frame.frameIndex}`),
        requestedHardwareFps: RECORDING_CONFIG.requestedHardwareFps,
        requestedSpatialFps: RECORDING_CONFIG.requestedSpatialFps,
        hardwareMimeType: recording.hardwareMimeType,
        spatialMimeType: recording.spatialMimeType,
        evaluationState: 'notQueued',
        propagatedDeviceCount: 0,
        redlistReason: null,
      });

      for (const telemetry of recording.telemetryFrames) {
        frames.put({
          id: `${recording.id}_telemetry_${telemetry.frameIndex}`,
          recordingId: recording.id,
          frameIndex: telemetry.frameIndex,
          unixMs: telemetry.unixMs,
          performanceMs: telemetry.performanceMs,
          telemetry,
        });
      }

      recording.hardwareChunks.forEach((blob, sequence) => {
        videoChunks.put({
          id: `${recording.id}_hardware_${sequence}`,
          recordingId: recording.id,
          stream: 'hardware',
          sequence,
          mimeType: recording.hardwareMimeType,
          blob,
        });
      });

      recording.spatialChunks.forEach((blob, sequence) => {
        videoChunks.put({
          id: `${recording.id}_spatial_${sequence}`,
          recordingId: recording.id,
          stream: 'spatial',
          sequence,
          mimeType: recording.spatialMimeType,
          blob,
        });
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}


export async function deleteOrRedlistRecordingInIndexedDb(
  recordingId: string,
): Promise<'deleted' | 'redlisted' | 'missing'> {
  const db = await openGeoballDb();

  try {
    const readTx = db.transaction('recordings', 'readonly');
    const recording = await idbRequest<any>(readTx.objectStore('recordings').get(recordingId));

    if (!recording) return 'missing';

    if (recording.state !== 'localOnly') {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('recordings', 'readwrite');
        tx.objectStore('recordings').put({
          ...recording,
          state: 'redlisted' satisfies RecordingState,
          redlistReason: recording.redlistReason ?? 'user-redlisted',
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      return 'redlisted';
    }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ['recordings', 'frames', 'frameBlobs', 'videoChunks'],
        'readwrite',
      );

      tx.objectStore('recordings').delete(recordingId);

      const deleteIndexedRecords = (storeName: 'frames' | 'frameBlobs' | 'videoChunks') => {
        const store = tx.objectStore(storeName);
        const request = store.index('recordingId').getAllKeys(recordingId);
        request.onsuccess = () => {
          for (const key of request.result) store.delete(key);
        };
      };

      deleteIndexedRecords('frames');
      deleteIndexedRecords('frameBlobs');
      deleteIndexedRecords('videoChunks');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return 'deleted';
  } finally {
    db.close();
  }
}

