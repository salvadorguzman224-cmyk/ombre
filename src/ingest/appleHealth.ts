import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { normalize, type Observation } from '../core/observation.ts';

// Maps Apple HealthKit record types to Ombre metrics.
const TYPE_MAP: Record<string, string> = {
  HKQuantityTypeIdentifierBodyMass: 'weight',
  HKQuantityTypeIdentifierBodyFatPercentage: 'body_fat',
  HKQuantityTypeIdentifierLeanBodyMass: 'lean_mass',
  HKQuantityTypeIdentifierWaistCircumference: 'waist',
  HKQuantityTypeIdentifierRestingHeartRate: 'resting_hr',
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrv',
  HKQuantityTypeIdentifierBloodPressureSystolic: 'bp_systolic',
  HKQuantityTypeIdentifierBloodPressureDiastolic: 'bp_diastolic',
  HKQuantityTypeIdentifierVO2Max: 'vo2max',
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKQuantityTypeIdentifierActiveEnergyBurned: 'active_energy',
  HKQuantityTypeIdentifierAppleExerciseTime: 'exercise_minutes',
  HKQuantityTypeIdentifierDietaryEnergyConsumed: 'calories',
  HKQuantityTypeIdentifierDietaryProtein: 'protein',
  HKQuantityTypeIdentifierDietaryWater: 'water',
  HKQuantityTypeIdentifierBloodGlucose: 'glucose_fasting',
};

// Sleep stages are category records; their value is the stage, duration is end - start.
const SLEEP_STAGES: Record<string, string[]> = {
  HKCategoryValueSleepAnalysisAsleepCore: ['sleep_duration'],
  HKCategoryValueSleepAnalysisAsleepDeep: ['sleep_duration', 'sleep_deep'],
  HKCategoryValueSleepAnalysisAsleepREM: ['sleep_duration', 'sleep_rem'],
  HKCategoryValueSleepAnalysisAsleepUnspecified: ['sleep_duration'],
  HKCategoryValueSleepAnalysisAsleep: ['sleep_duration'],
};

// Apple units that differ from what our converter expects.
const UNIT_ALIASES: Record<string, string> = { count: '', 'count/min': '', Cal: '', '%': 'fraction', 'mL/min·kg': '' };

export function parseRecord(line: string): Observation[] {
  if (!line.includes('<Record ')) return [];
  const attr = (name: string) => line.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const type = attr('type');
  const start = attr('startDate');
  const end = attr('endDate');
  if (!type || !start) return [];
  const source = 'apple_health';

  if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
    const metrics = SLEEP_STAGES[attr('value') ?? ''];
    if (!metrics || !end) return [];
    const hours = (parseDate(end).getTime() - parseDate(start).getTime()) / 3_600_000;
    return metrics.map((metric) => normalize({ metric, value: hours, start: parseDate(start), end: parseDate(end), source }));
  }

  const metric = TYPE_MAP[type];
  const value = attr('value');
  if (!metric || value === undefined) return [];
  const rawUnit = attr('unit');
  const unit = rawUnit !== undefined && rawUnit in UNIT_ALIASES ? UNIT_ALIASES[rawUnit] || undefined : rawUnit;
  return [normalize({ metric, value, unit, start: parseDate(start), end: end ? parseDate(end) : undefined, source })];
}

// Apple dates look like "2026-10-01 07:12:00 -0700".
function parseDate(s: string): Date {
  return new Date(s.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/, '$1T$2$3:$4'));
}

// Streams an Apple Health export.xml (can be several GB) and yields batches.
export async function* readAppleHealthExport(path: string, batchSize = 5000): AsyncGenerator<Observation[]> {
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  let batch: Observation[] = [];
  for await (const line of rl) {
    try {
      batch.push(...parseRecord(line));
    } catch {
      // Skip records with units or values we can't interpret.
    }
    if (batch.length >= batchSize) (yield batch, (batch = []));
  }
  if (batch.length) yield batch;
}
