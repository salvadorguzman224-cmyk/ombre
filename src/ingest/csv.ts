import { normalize, type Observation } from '../core/observation.ts';

export interface ImportResult {
  observations: Observation[];
  errors: { line: number; message: string }[];
}

// Generic CSV import. Expected header (order doesn't matter, extra columns ignored):
//   date,metric,value[,unit][,end][,note]
// e.g. 2026-10-01,weight,182,lb
export function parseCsv(text: string, source = 'csv'): ImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const result: ImportResult = { observations: [], errors: [] };
  if (lines.length === 0) return result;

  const header = splitLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const [iDate, iMetric, iValue, iUnit, iEnd, iNote] = ['date', 'metric', 'value', 'unit', 'end', 'note'].map(col);
  if (iDate < 0 || iMetric < 0 || iValue < 0) {
    result.errors.push({ line: 1, message: 'Header must include date, metric and value columns' });
    return result;
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const get = (idx: number) => (idx >= 0 ? cells[idx]?.trim() || undefined : undefined);
    try {
      result.observations.push(
        normalize({
          metric: get(iMetric) ?? '',
          value: get(iValue) ?? '',
          unit: get(iUnit),
          start: get(iDate) ?? '',
          end: get(iEnd),
          note: get(iNote),
          source,
        }),
      );
    } catch (err) {
      result.errors.push({ line: i + 1, message: (err as Error).message });
    }
  }
  return result;
}

// Minimal CSV splitter that handles quoted fields with commas and "" escapes.
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') (cur += '"', i++);
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') (out.push(cur), (cur = ''));
    else cur += c;
  }
  out.push(cur);
  return out;
}
