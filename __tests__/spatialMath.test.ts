import {
  it,
  expect,
  describe,
} from 'vitest';
import { Cartesian3 } from 'cesium';
import {
  vectorToTuple,
  makeRectangularFrustumPositions,
} from '../src/utils/spatialMath';


describe('spatial math', () => {
  it('creates four rays and a closed rectangular perimeter', () => {
    const origin = new Cartesian3(0, 0, 0);
    const direction = new Cartesian3(0, 1, 0);
    const up = new Cartesian3(0, 0, 1);
    const lines = makeRectangularFrustumPositions(origin, direction, up, 1);
    expect(lines).toHaveLength(5);
    expect(lines.slice(0, 4).every((line) => line.length === 2)).toBe(true);
    expect(lines[4]).toHaveLength(5);
    expect(Cartesian3.equals(lines[4][0], lines[4][4])).toBe(true);
  });

  it('serializes ECEF vectors without mutating them', () => {
    const value = new Cartesian3(1, 2, 3);
    expect(vectorToTuple(value)).toEqual([1, 2, 3]);
    expect(vectorToTuple(null)).toBeNull();
  });
});
