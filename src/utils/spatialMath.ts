import { Cartesian3, Math as CesiumMath } from 'cesium';
import { FRUSTUM_CONFIG } from '../app/config/globeConfig';


export function makeRectangularFrustumPositions(
  origin: Cartesian3,
  direction: Cartesian3,
  up: Cartesian3,
  aspect: number,
): Cartesian3[][] {
  const dir = Cartesian3.normalize(direction, new Cartesian3());
  const cameraUp = Cartesian3.normalize(up, new Cartesian3());

  const right = Cartesian3.normalize(
    Cartesian3.cross(dir, cameraUp, new Cartesian3()),
    new Cartesian3(),
  );

  const correctedUp = Cartesian3.normalize(
    Cartesian3.cross(right, dir, new Cartesian3()),
    new Cartesian3(),
  );

  const distance = FRUSTUM_CONFIG.distanceMeters;

  const center = Cartesian3.add(
    origin,
    Cartesian3.multiplyByScalar(dir, distance, new Cartesian3()),
    new Cartesian3(),
  );

  const halfHeight =
    Math.tan(CesiumMath.toRadians(FRUSTUM_CONFIG.fovDegrees) / 2) * distance;

  const halfWidth = halfHeight * Math.max(aspect, 0.1);

  const upOffset = Cartesian3.multiplyByScalar(
    correctedUp,
    halfHeight,
    new Cartesian3(),
  );

  const rightOffset = Cartesian3.multiplyByScalar(
    right,
    halfWidth,
    new Cartesian3(),
  );

  const topLeft = Cartesian3.add(
    Cartesian3.subtract(center, rightOffset, new Cartesian3()),
    upOffset,
    new Cartesian3(),
  );

  const topRight = Cartesian3.add(
    Cartesian3.add(center, rightOffset, new Cartesian3()),
    upOffset,
    new Cartesian3(),
  );

  const bottomRight = Cartesian3.subtract(
    Cartesian3.add(center, rightOffset, new Cartesian3()),
    upOffset,
    new Cartesian3(),
  );

  const bottomLeft = Cartesian3.subtract(
    Cartesian3.subtract(center, rightOffset, new Cartesian3()),
    upOffset,
    new Cartesian3(),
  );

  return [
    [origin, topLeft],
    [origin, topRight],
    [origin, bottomRight],
    [origin, bottomLeft],
    [topLeft, topRight, bottomRight, bottomLeft, topLeft],
  ];
}

export function vectorToTuple(value: Cartesian3 | null): [number, number, number] | null {
  if (!value) return null;
  return [value.x, value.y, value.z];
}

