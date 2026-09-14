import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import express from 'express';
import publicRouter from '../server/routes/public';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
test('public GeoJSON exposes 25 explicitly unlocated barangays and uses longitude/latitude order', async () => {
  setDatabaseConnected(false);
  const app = express(); app.use(publicRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}/barangays/geo`;
  const original = prisma.barangay.findMany;
  try {
    const response = await fetch(url);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type')!, /geo\+json/);
    const collection = await response.json() as any;
    assert.equal(collection.type, 'FeatureCollection'); assert.equal(collection.features.length, 25);
    assert.ok(collection.features.every((f: any) => f.geometry === null && f.properties.geoStatus === 'NO DATA' && f.properties.barangayName));
    setDatabaseConnected(true);
    prisma.barangay.findMany = (async () => [{ id: 'test', name: 'Synthetic', code: 'TEST', latitude: 10, longitude: 124, geoVerified: false }]) as any;
    const data = await (await fetch(url)).json() as any;
    assert.deepEqual(data.features[0].geometry, { type: 'Point', coordinates: [124, 10] });
    assert.equal(data.features[0].properties.geoStatus, 'UNVERIFIED');
  } finally {
    prisma.barangay.findMany = original; setDatabaseConnected(false);
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
test('geography migration preserves missing locations and rejects invalid coordinate pairs', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE tagad_barangays(id int); INSERT INTO tagad_barangays VALUES (1);');
    const folder = new URL('../supabase/migrations/', import.meta.url);
    await db.exec(readFileSync(new URL(readdirSync(folder).find(f => f.endsWith('_barangay_geography.sql'))!, folder), 'utf8'));
    const result = await db.query<any>('SELECT latitude, longitude, geo_verified FROM tagad_barangays');
    assert.deepEqual(result.rows[0], { latitude: null, longitude: null, geo_verified: false });
    await assert.rejects(db.exec('UPDATE tagad_barangays SET latitude=91, longitude=124'), /check constraint/);
    await assert.rejects(db.exec('UPDATE tagad_barangays SET latitude=10'), /check constraint/);
    await db.exec('UPDATE tagad_barangays SET latitude=10, longitude=124');
  } finally { await db.close(); }
});
