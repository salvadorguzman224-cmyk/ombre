import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { METRICS, flag, getMetric } from '../core/metrics.ts';
import { normalize, type RawObservation } from '../core/observation.ts';
import { parseCsv } from '../ingest/csv.ts';
import type { Store } from '../store/db.ts';

const PUBLIC_DIR = join(import.meta.dirname, '../../public');
const MAX_BODY = 20 * 1024 * 1024;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createHandler(store: Store) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      const body = await route(store, req, url);
      if (body === undefined) return serveStatic(url.pathname, res);
      send(res, 200, body);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 400;
      send(res, status, { error: (err as Error).message });
    }
  };
}

async function route(store: Store, req: IncomingMessage, url: URL): Promise<unknown> {
  const { pathname: path, searchParams: q } = url;
  const method = req.method ?? 'GET';

  if (method === 'GET' && path === '/api/metrics') return [...METRICS.values()];

  if (method === 'GET' && path === '/api/observations') {
    return store.list({
      metric: q.get('metric') ?? undefined,
      from: q.get('from') ?? undefined,
      to: q.get('to') ?? undefined,
      limit: q.has('limit') ? Number(q.get('limit')) : undefined,
    });
  }

  if (method === 'POST' && path === '/api/observations') {
    const input = JSON.parse(await readBody(req)) as RawObservation | RawObservation[];
    const list = (Array.isArray(input) ? input : [input]).map((r) => normalize({ ...r, source: r.source ?? 'manual' }));
    return { added: store.add(list) };
  }

  const del = path.match(/^\/api\/observations\/(\d+)$/);
  if (method === 'DELETE' && del) {
    if (!store.remove(Number(del[1]))) throw new HttpError(404, 'Not found');
    return { deleted: true };
  }

  const series = path.match(/^\/api\/daily\/([a-z0-9_]+)$/);
  if (method === 'GET' && series) {
    getMetric(series[1]);
    return store.daily(series[1], q.get('from') ?? undefined, q.get('to') ?? undefined);
  }

  // One snapshot across every connected source: the latest value per metric, flagged.
  if (method === 'GET' && path === '/api/summary') {
    return store.latest().map((o) => {
      const def = getMetric(o.metric);
      return { ...o, label: def.label, unit: def.unit, category: def.category, flag: flag(def, o.value) };
    });
  }

  if (method === 'POST' && path === '/api/import/csv') {
    const { observations, errors } = parseCsv(await readBody(req), q.get('source') ?? 'csv');
    return { parsed: observations.length, added: store.add(observations), errors };
  }

  if (path.startsWith('/api/')) throw new HttpError(404, 'Not found');
  return undefined;
}

async function serveStatic(path: string, res: ServerResponse) {
  const file = path === '/' ? 'index.html' : path.slice(1);
  if (file.includes('..') || !/^[\w.-]+$/.test(file)) return send(res, 404, { error: 'Not found' });
  try {
    const data = await readFile(join(PUBLIC_DIR, file));
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8` }).end(data);
  } catch {
    send(res, 404, { error: 'Not found' });
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
