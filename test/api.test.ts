import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Store } from '../src/store/db.ts';
import { createHandler } from '../src/server/app.ts';

test('API: log, import, summarise, chart, delete', async (t) => {
  const store = new Store(':memory:');
  const server = createServer(createHandler(store)).listen(0);
  t.after(() => (server.close(), store.close()));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const json = async (path: string, init?: RequestInit) => {
    const r = await fetch(base + path, init);
    return { status: r.status, body: await r.json() };
  };

  let r = await json('/api/observations', { method: 'POST', body: JSON.stringify({ metric: 'testosterone_total', value: 210, start: '2026-09-01' }) });
  assert.deepEqual(r.body, { added: 1 });

  r = await json('/api/import/csv', { method: 'POST', body: 'date,metric,value\n2026-10-01,resting_hr,58\n2026-10-02,resting_hr,56\n' });
  assert.equal(r.body.added, 2);

  r = await json('/api/summary');
  const t_ = r.body.find((s: { metric: string }) => s.metric === 'testosterone_total');
  assert.equal(t_.flag, 'low');
  assert.equal(t_.source, 'manual');

  r = await json('/api/daily/resting_hr');
  assert.equal(r.body.length, 2);

  r = await json('/api/observations', { method: 'POST', body: JSON.stringify({ metric: 'nope', value: 1, start: '2026-10-01' }) });
  assert.equal(r.status, 400);

  const [first] = (await json('/api/observations?metric=testosterone_total')).body;
  assert.equal((await json(`/api/observations/${first.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await json(`/api/observations/${first.id}`, { method: 'DELETE' })).status, 404);

  const page = await fetch(base + '/');
  assert.match(await page.text(), /OMBRE/);
});
