import { Cartesian3, Math as CesiumMath, Quaternion } from 'cesium';
import { SENSOR_CONFIG } from '../app/config/globeConfig';

export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function formatNumber(value: number | null, digits = 3): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

export function formatDegrees(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value.toFixed(2)}°`;
}

export function isFiniteCartesian3(value: Cartesian3 | null | undefined): value is Cartesian3 {
  return !!value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

export function getCompassAlpha(event: DeviceOrientationEvent): {
  alpha: number | null;
  absolute: boolean;
  source: 'webkitCompassHeading' | 'absolute-alpha' | 'relative-alpha';
} {
  const iosHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;

  if (typeof iosHeading === 'number' && Number.isFinite(iosHeading)) {
    return { alpha: normalizeDegrees(iosHeading), absolute: true, source: 'webkitCompassHeading' };
  }

  if (event.absolute === true && typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
    return { alpha: normalizeDegrees(event.alpha), absolute: true, source: 'absolute-alpha' };
  }

  return {
    alpha: typeof event.alpha === 'number' && Number.isFinite(event.alpha) ? normalizeDegrees(event.alpha) : null,
    absolute: false,
    source: 'relative-alpha',
  };
}

export function eulerYXZToQuaternion(x: number, y: number, z: number): Quaternion {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);

  return new Quaternion(
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 - s1 * s2 * c3,
    c1 * c2 * c3 + s1 * s2 * s3,
  );
}

export function threeWorldToCesiumEnu(v: Cartesian3): Cartesian3 {
  return new Cartesian3(v.x, -v.z, v.y);
}

export function getDeviceCameraQuaternion(alphaDeg: number, betaDeg: number, gammaDeg: number): Quaternion {
  const alpha = CesiumMath.toRadians(SENSOR_CONFIG.alphaSign * alphaDeg + SENSOR_CONFIG.headingOffsetDeg);
  const beta = CesiumMath.toRadians(SENSOR_CONFIG.betaSign * betaDeg);
  const gamma = CesiumMath.toRadians(SENSOR_CONFIG.gammaSign * gammaDeg);
  const orient = CesiumMath.toRadians(SENSOR_CONFIG.screenOrientationDeg);

  const q = eulerYXZToQuaternion(beta, alpha, -gamma);
  const rearCameraCorrection = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -Math.PI / 2);
  Quaternion.multiply(q, rearCameraCorrection, q);

  if (orient !== 0) {
    const screenCorrection = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -orient);
    Quaternion.multiply(q, screenCorrection, q);
  }

  return q;
}
