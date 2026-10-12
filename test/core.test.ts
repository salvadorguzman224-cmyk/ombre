import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../src/core/observation.ts';
import { flag, getMetric } from '../src/core/metrics.ts';
import { parseCsv } from '../src/ingest/csv.ts';
import { parseRecord } from '../src/ingest/appleHealth.ts';
import { Store } from '../src/store/db.ts';

test('normalize converts to canonical units', () => {
  const o = normalize({ metric: 'weight', value: '200', unit: 'lb', start: '2026-10-01', source: 'manual' });
  assert.equal(o.value, 90.718);
  assert.equal(o.start, '2026-10-01T00:00:00.000Z');
});

test('normalize rejects bad input', () => {
  assert.throws(() => normalize({ metric: 'nope', value: 1, start: '2026-10-01', source: 'x' }), /Unknown metric/);
  assert.throws(() => normalize({ metric: 'weight', value: 'abc', start: '2026-10-01', source: 'x' }), /Invalid value/);
  assert.throws(() => normalize({ metric: 'weight', value: 80, start: 'not a date', source: 'x' }), /Invalid date/);
  assert.throws(() => normalize({ metric: 'weight', value: 80, unit: 'stone', start: '2026-10-01', source: 'x' }), /Cannot convert/);
});

test('flag uses reference ranges', () => {
  assert.equal(flag(getMetric('testosterone_total'), 200), 'low');
  assert.equal(flag(getMetric('testosterone_total'), 600), null);
  assert.equal(flag(getMetric('bp_systolic'), 145), 'high');
});

test('parseCsv reads rows and reports errors per line', () => {
  const r = parseCsv('date,metric,value,unit,note\n2026-10-01,weight,180,lb,"after run, fasted"\n2026-10-01,steps,9000\n2026-10-02,bogus,1\n');
  assert.equal(r.observations.length, 2);
  assert.equal(r.observations[0].note, 'after run, fasted');
  assert.deepEqual(r.errors, [{ line: 4, message: 'Unknown metric: bogus' }]);
});

test('parseRecord maps Apple Health quantities and sleep', () => {
  const [fat] = parseRecord('<Record type="HKQuantityTypeIdentifierBodyFatPercentage" sourceName="Scale" unit="%" startDate="2026-10-01 07:00:00 -0700" endDate="2026-10-01 07:00:00 -0700" value="0.182"/>');
  assert.equal(fat.metric, 'body_fat');
  assert.equal(fat.value, 18.2);
  assert.equal(fat.start, '2026-10-01T14:00:00.000Z');

  const sleep = parseRecord('<Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-10-01 01:00:00 -0700" endDate="2026-10-01 02:30:00 -0700" value="HKCategoryValueSleepAnalysisAsleepDeep"/>');
  assert.deepEqual(sleep.map((o) => [o.metric, o.value]), [['sleep_duration', 1.5], ['sleep_deep', 1.5]]);

  assert.deepEqual(parseRecord('<Record type="HKQuantityTypeIdentifierSomethingElse" startDate="2026-10-01 07:00:00 -0700" value="1"/>'), []);
});

test('store dedupes, aggregates daily, and returns latest', () => {
  const store = new Store(':memory:');
  const obs = [
    normalize({ metric: 'steps', value: 4000, start: '2026-10-01T08:00:00Z', source: 'watch' }),
    normalize({ metric: 'steps', value: 5000, start: '2026-10-01T18:00:00Z', source: 'watch' }),
    normalize({ metric: 'steps', value: 7000, start: '2026-10-02T12:00:00Z', source: 'watch' }),
    normalize({ metric: 'weight', value: 82, start: '2026-10-01T07:00:00Z', source: 'scale' }),
    normalize({ metric: 'weight', value: 81.5, start: '2026-10-01T21:00:00Z', source: 'scale' }),
  ];
  assert.equal(store.add(obs), 5);
  assert.equal(store.add(obs), 0, 're-importing the same data adds nothing');

  assert.deepEqual(store.daily('steps'), [{ date: '2026-10-01', value: 9000 }, { date: '2026-10-02', value: 7000 }]);
  assert.deepEqual(store.daily('weight'), [{ date: '2026-10-01', value: 81.5 }]);

  const latest = Object.fromEntries(store.latest().map((o) => [o.metric, o.value]));
  assert.deepEqual(latest, { steps: 7000, weight: 81.5 });
  store.close();
});
