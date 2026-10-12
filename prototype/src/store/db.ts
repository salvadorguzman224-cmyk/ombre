import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { METRICS } from '../core/metrics.ts';
import type { Observation } from '../core/observation.ts';

export interface StoredObservation extends Observation {
  id: number;
}

export interface DailyValue {
  date: string; // YYYY-MM-DD (UTC)
  value: number;
}

export interface Query {
  metric?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export class Store {
  private db: DatabaseSync;

  constructor(path = 'data/ombre.db') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS observations (
        id        INTEGER PRIMARY KEY,
        metric    TEXT NOT NULL,
        value     REAL NOT NULL,
        start     TEXT NOT NULL,
        end       TEXT,
        source    TEXT NOT NULL,
        source_id TEXT,
        note      TEXT,
        UNIQUE (metric, start, source)
      );
      CREATE INDEX IF NOT EXISTS obs_metric_start ON observations (metric, start);
    `);
  }

  // Insert observations, ignoring exact duplicates from the same source.
  // Returns how many new rows were written.
  add(observations: Observation[]): number {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO observations (metric, value, start, end, source, source_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    let added = 0;
    this.db.exec('BEGIN');
    try {
      for (const o of observations) {
        const r = stmt.run(o.metric, o.value, o.start, o.end ?? null, o.source, o.sourceId ?? null, o.note ?? null);
        added += Number(r.changes);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return added;
  }

  list(q: Query = {}): StoredObservation[] {
    const where: string[] = [];
    const args: string[] = [];
    if (q.metric) (where.push('metric = ?'), args.push(q.metric));
    if (q.from) (where.push('start >= ?'), args.push(q.from));
    if (q.to) (where.push('start < ?'), args.push(q.to));
    const sql = `SELECT * FROM observations ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY start DESC LIMIT ${Math.min(q.limit ?? 500, 10_000)}`;
    return this.db.prepare(sql).all(...args).map(fromRow);
  }

  remove(id: number): boolean {
    return Number(this.db.prepare('DELETE FROM observations WHERE id = ?').run(id).changes) > 0;
  }

  // Roll readings up into one value per day using the metric's aggregation rule.
  daily(metric: string, from?: string, to?: string): DailyValue[] {
    const def = METRICS.get(metric);
    if (!def) throw new Error(`Unknown metric: ${metric}`);
    const agg =
      def.daily === 'sum' ? 'SUM(value)'
      : def.daily === 'avg' ? 'AVG(value)'
      : '(SELECT o2.value FROM observations o2 WHERE o2.metric = o.metric AND substr(o2.start, 1, 10) = substr(o.start, 1, 10) ORDER BY o2.start DESC LIMIT 1)';
    const rows = this.db
      .prepare(
        `SELECT substr(start, 1, 10) AS date, ${agg} AS value
         FROM observations o
         WHERE metric = ? AND start >= ? AND start < ?
         GROUP BY date ORDER BY date`,
      )
      .all(metric, from ?? '0000', to ?? '9999') as unknown as DailyValue[];
    return rows.map((r) => ({ date: r.date, value: Math.round(r.value * 100) / 100 }));
  }

  // Most recent reading for every metric that has data.
  latest(): StoredObservation[] {
    return this.db
      .prepare(
        `SELECT * FROM observations o
         WHERE start = (SELECT MAX(start) FROM observations WHERE metric = o.metric)
         GROUP BY metric`,
      )
      .all()
      .map(fromRow);
  }

  close(): void {
    this.db.close();
  }
}

function fromRow(r: Record<string, unknown>): StoredObservation {
  return {
    id: Number(r.id),
    metric: String(r.metric),
    value: Number(r.value),
    start: String(r.start),
    ...(r.end != null && { end: String(r.end) }),
    source: String(r.source),
    ...(r.source_id != null && { sourceId: String(r.source_id) }),
    ...(r.note != null && { note: String(r.note) }),
  };
}
