export type SpatialTelemetry = {
  mode: 'viewer' | 'recorder';
  locationLock: boolean;
  recordingActive: boolean;
  lat: number | null;
  lon: number | null;
  altitude: number | null;
  accuracy: number | null;
  altitudeAccuracy: number | null;
  gpsHeading: number | null;
  speed: number | null;
  compassHeading: number | null;
  compassSource: string;
  compassAbsolute: boolean;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  accelerationX: number | null;
  accelerationY: number | null;
  accelerationZ: number | null;
  accelerationGravityX: number | null;
  accelerationGravityY: number | null;
  accelerationGravityZ: number | null;
  rotationAlpha: number | null;
  rotationBeta: number | null;
  rotationGamma: number | null;
  motionInterval: number | null;
  targetKind: 'ground' | 'sky' | 'none';
  targetX: number | null;
  targetY: number | null;
  targetZ: number | null;
  likelyIndoors: boolean;
  likelyOutdoors: boolean;
};

export type PerFrameTelemetry = {
  frameIndex: number;
  unixMs: number;
  performanceMs: number;
  geolocation: {
    lat: number | null;
    lon: number | null;
    altitude: number | null;
    accuracy: number | null;
    altitudeAccuracy: number | null;
    gpsHeading: number | null;
    speed: number | null;
  };
  orientation: {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    compassHeading: number | null;
    compassSource: string;
    compassAbsolute: boolean;
  };
  motion: {
    accelerationX: number | null;
    accelerationY: number | null;
    accelerationZ: number | null;
    accelerationGravityX: number | null;
    accelerationGravityY: number | null;
    accelerationGravityZ: number | null;
    rotationAlpha: number | null;
    rotationBeta: number | null;
    rotationGamma: number | null;
    motionInterval: number | null;
  };
  environment: {
    likelyIndoors: boolean;
    likelyOutdoors: boolean;
  };
  cesiumDerived: {
    observerEcef: [number, number, number] | null;
    directionEcef: [number, number, number] | null;
    upEcef: [number, number, number] | null;
    targetKind: 'ground' | 'sky' | 'none';
    targetEcef: [number, number, number] | null;
  };
};
