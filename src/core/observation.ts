import { getMetric } from './metrics.ts';
import { toCanonical } from './units.ts';

// One measurement from any source. This is the single shape all data takes.
export interface Observation {
  metric: string;
  value: number; // canonical unit for the metric
  start: string; // ISO 8601
  end?: string; // ISO 8601, for durations (sleep, workouts)
  source: string; // e.g. 'manual', 'apple_health', 'csv', 'oura'
  sourceId?: string; // the source's own id, for dedupe
  note?: string;
}

export interface RawObservation {
  metric: string;
  value: number | string;
  unit?: string;
  start: string | Date;
  end?: string | Date;
  source: string;
  sourceId?: string;
  note?: string;
}

// Validate and normalise a raw reading into a canonical Observation.
export function normalize(raw: RawObservation): Observation {
  const def = getMetric(raw.metric);
  const num = typeof raw.value === 'number' ? raw.value : Number(raw.value);
  if (!Number.isFinite(num)) throw new Error(`Invalid value for ${raw.metric}: ${raw.value}`);
  const start = toIso(raw.start);
  const end = raw.end ? toIso(raw.end) : undefined;
  if (end && end < start) throw new Error(`End before start for ${raw.metric}`);
  return {
    metric: def.id,
    value: round(toCanonical(num, raw.unit, def.unit)),
    start,
    ...(end && { end }),
    source: raw.source,
    ...(raw.sourceId && { sourceId: raw.sourceId }),
    ...(raw.note && { note: raw.note }),
  };
}

function toIso(d: string | Date): string {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${d}`);
  return date.toISOString();
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
