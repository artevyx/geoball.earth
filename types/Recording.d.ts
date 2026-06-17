import type { Cartesian3 } from 'cesium';
import type { FrameTelemetrySample } from './telemetry';


export type TelemetryRecordingState = 'localOnly' | 'pinnedLocal' | 'propagated' | 'redlisted';

export type BufferedRecording = {
  id: string;
  startedAtUnixMs: number;
  startedAtPerformanceMs: number;
  firstPosition: Cartesian3 | null;
  firstGeo: {
    lat: number | null;
    lon: number | null;
    altitude: number | null;
  };
  telemetryFrames: FrameTelemetrySample[];
  hardwareChunks: Blob[];
  spatialChunks: Blob[];
  hardwareMimeType: string;
  spatialMimeType: string;
  persistenceReady: boolean;
};

export type LocalRecordingMarker = {
  id: string;
  state: TelemetryRecordingState;
  position: Cartesian3;
  pinId: string | null;
};

export type RecordingMarkerScreen = {
  id: string;
  state: TelemetryRecordingState;
  x: number;
  y: number;
  pinScreen?: { x: number; y: number } | null;
};

export type PlaybackSession = {
  recordingId: string;
  hardwareUrl: string;
  spatialUrl: string;
  telemetryFrames: FrameTelemetrySample[];
  durationMs: number;
};
