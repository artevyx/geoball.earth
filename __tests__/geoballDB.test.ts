import 'fake-indexeddb/auto';
import {
  it,
  expect,
  describe,
  afterEach,
  beforeEach,
} from 'vitest';
import {
  openGeoballDb,
  loadLocalRecordingMarkers,
  deleteOrRedlistRecordingInIndexedDb,
} from '../src/geoballDB';
import { GEOBALL_DB_NAME } from '../src/app/config/recordingConfig';


function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(GEOBALL_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

beforeEach(deleteDatabase);
afterEach(deleteDatabase);

describe('geoball IndexedDB repository', () => {
  it('loads only local-only recording markers', async () => {
    const db = await openGeoballDb();
    const tx = db.transaction('recordings', 'readwrite');
    tx.objectStore('recordings').put({ id: 'local', state: 'localOnly', startLatitude: 1, startLongitude: 2, startAltitude: 3, pinId: null });
    tx.objectStore('recordings').put({ id: 'shared', state: 'pinnedLocal', startLatitude: 4, startLongitude: 5, startAltitude: 6, pinId: 'pin' });
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
    db.close();

    const markers = await loadLocalRecordingMarkers();
    expect(markers.map((marker) => marker.id)).toEqual(['local']);
  });

  it('deletes local-only recordings and redlists pinned recordings', async () => {
    const db = await openGeoballDb();
    const tx = db.transaction('recordings', 'readwrite');
    tx.objectStore('recordings').put({ id: 'local', state: 'localOnly' });
    tx.objectStore('recordings').put({ id: 'pinned', state: 'pinnedLocal' });
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
    db.close();

    expect(await deleteOrRedlistRecordingInIndexedDb('local')).toBe('deleted');
    expect(await deleteOrRedlistRecordingInIndexedDb('pinned')).toBe('redlisted');
  });
});
