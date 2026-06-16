export type NumericCapabilityRange = { min?: number; max?: number; step?: number };

export type ExtendedMediaTrackCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: NumericCapabilityRange;
  focusDistance?: NumericCapabilityRange;
  focusMode?: string[];
};

export type ExtendedMediaTrackSettings = MediaTrackSettings & {
  zoom?: number;
  focusMode?: string;
};

export type CameraControlsState = {
  torchSupported: boolean;
  torchOn: boolean;
  zoomSupported: boolean;
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
  zoomValue: number;
  focusSupported: boolean;
  focusModes: string[];
  focusMode: string;
};
