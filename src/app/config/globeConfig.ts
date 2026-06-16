export const SENSOR_CONFIG = {
  alphaSign: 1,
  betaSign: 1,
  gammaSign: 1,
  screenOrientationDeg: 0,
  headingOffsetDeg: 0,
};

export const CAMERA_CONFIG = {
  observerHeightMeters: 2.3,
  atmosphereReturnsAboveMeters: 120000,
  startupOrbitHeightMeters: 22000000,
  startupOrbitLatitudeDegrees: 18,
  startupOrbitLongitudeDegrees: -122,
  startupOrbitRadiansPerSecond: 0.035,
  locationLockRangeMeters: 95,
  locationLockTiltMeters: 75,
  locationIntroRangeMeters: 650,
  locationLockFlySeconds: 1.35,
};

export const OBSERVER_MODEL_CONFIG = {
  uri: '/models/OcculastrumObserverOnly.glb',
  // Sanitized GLB contains only the Observer eye subtree.
  // Keep Cesium from pixel-scaling the model into a skyline noodle.
  scale: 0.65,
  minimumPixelSize: 0,
  maximumScale: 0.65,

  // The GLB is centered on the same Observer point used by the white origin dot.
  // Keep this at 0 unless the exported model origin needs manual correction.
  pupilForwardOffsetMeters: 0,
};

export const FRUSTUM_CONFIG = {
  distanceMeters: 18,
  fovDegrees: 58,
  coneSegments: 24,
  radialEverySegments: 3,
  lineWidth: 2,
  depthFailLineWidth: 4,
  targetPixelSize: 15,
  skyMarkerDistanceMeters: 350000,
  maxUpdateHz: 30,
};

export const DEBUG_CONFIG = { updateHz: 10 };
