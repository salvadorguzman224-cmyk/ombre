// Usage:
//   npm run import -- apple path/to/export.xml
//   npm run import -- csv path/to/readings.csv
import { readFileSync } from 'node:fs';
import { Store } from '../store/db.ts';
import { parseCsv } from '../ingest/csv.ts';
import { readAppleHealthExport } from '../ingest/appleHealth.ts';

const [kind, path] = process.argv.slice(2);
if (!kind || !path) {
  console.error('Usage: npm run import -- <apple|csv> <file>');
  process.exit(1);
}

const store = new Store(process.env.OMBRE_DB);
let added = 0;

if (kind === 'apple') {
  let seen = 0;
  for await (const batch of readAppleHealthExport(path)) {
    seen += batch.length;
    added += store.add(batch);
    process.stdout.write(`\r${seen} readings processed, ${added} new`);
  }
  process.stdout.write('\n');
} else if (kind === 'csv') {
  const { observations, errors } = parseCsv(readFileSync(path, 'utf8'));
  added = store.add(observations);
  for (const e of errors) console.warn(`line ${e.line}: ${e.message}`);
  console.log(`${observations.length} readings parsed, ${added} new, ${errors.length} errors`);
} else {
  console.error(`Unknown import type: ${kind}`);
  process.exit(1);
}
store.close();
