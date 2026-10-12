// The catalog of everything Ombre tracks. Every data source maps into these
// metric ids, and every value is stored in the metric's canonical unit.

export type Category =
  | 'body'
  | 'heart'
  | 'sleep'
  | 'activity'
  | 'nutrition'
  | 'labs'
  | 'mind';

export type Aggregation = 'sum' | 'avg' | 'last';

export interface MetricDef {
  id: string;
  label: string;
  category: Category;
  unit: string;
  // How multiple readings in one day roll up into a daily value.
  daily: Aggregation;
  // Optional reference range for adult men, used for flagging only.
  range?: { low?: number; high?: number };
}

const defs: MetricDef[] = [
  // Body
  { id: 'weight', label: 'Weight', category: 'body', unit: 'kg', daily: 'last' },
  { id: 'body_fat', label: 'Body fat', category: 'body', unit: '%', daily: 'last', range: { low: 8, high: 24 } },
  { id: 'lean_mass', label: 'Lean mass', category: 'body', unit: 'kg', daily: 'last' },
  { id: 'waist', label: 'Waist', category: 'body', unit: 'cm', daily: 'last', range: { high: 102 } },

  // Heart
  { id: 'resting_hr', label: 'Resting heart rate', category: 'heart', unit: 'bpm', daily: 'avg', range: { low: 40, high: 80 } },
  { id: 'hrv', label: 'Heart rate variability', category: 'heart', unit: 'ms', daily: 'avg' },
  { id: 'bp_systolic', label: 'Blood pressure (systolic)', category: 'heart', unit: 'mmHg', daily: 'avg', range: { high: 130 } },
  { id: 'bp_diastolic', label: 'Blood pressure (diastolic)', category: 'heart', unit: 'mmHg', daily: 'avg', range: { high: 80 } },
  { id: 'vo2max', label: 'VO2 max', category: 'heart', unit: 'mL/kg/min', daily: 'last' },

  // Sleep
  { id: 'sleep_duration', label: 'Sleep', category: 'sleep', unit: 'h', daily: 'sum', range: { low: 7, high: 9 } },
  { id: 'sleep_deep', label: 'Deep sleep', category: 'sleep', unit: 'h', daily: 'sum' },
  { id: 'sleep_rem', label: 'REM sleep', category: 'sleep', unit: 'h', daily: 'sum' },

  // Activity
  { id: 'steps', label: 'Steps', category: 'activity', unit: 'count', daily: 'sum' },
  { id: 'active_energy', label: 'Active energy', category: 'activity', unit: 'kcal', daily: 'sum' },
  { id: 'exercise_minutes', label: 'Exercise', category: 'activity', unit: 'min', daily: 'sum' },
  { id: 'strength_sessions', label: 'Strength sessions', category: 'activity', unit: 'count', daily: 'sum' },

  // Nutrition
  { id: 'calories', label: 'Calories', category: 'nutrition', unit: 'kcal', daily: 'sum' },
  { id: 'protein', label: 'Protein', category: 'nutrition', unit: 'g', daily: 'sum' },
  { id: 'alcohol', label: 'Alcohol', category: 'nutrition', unit: 'drinks', daily: 'sum', range: { high: 2 } },
  { id: 'water', label: 'Water', category: 'nutrition', unit: 'L', daily: 'sum' },

  // Labs (typical adult male reference ranges; labs vary — informational only)
  { id: 'testosterone_total', label: 'Total testosterone', category: 'labs', unit: 'ng/dL', daily: 'last', range: { low: 264, high: 916 } },
  { id: 'testosterone_free', label: 'Free testosterone', category: 'labs', unit: 'pg/mL', daily: 'last', range: { low: 46, high: 224 } },
  { id: 'psa', label: 'PSA', category: 'labs', unit: 'ng/mL', daily: 'last', range: { high: 4 } },
  { id: 'glucose_fasting', label: 'Fasting glucose', category: 'labs', unit: 'mg/dL', daily: 'avg', range: { low: 70, high: 99 } },
  { id: 'hba1c', label: 'HbA1c', category: 'labs', unit: '%', daily: 'last', range: { high: 5.7 } },
  { id: 'ldl', label: 'LDL cholesterol', category: 'labs', unit: 'mg/dL', daily: 'last', range: { high: 100 } },
  { id: 'hdl', label: 'HDL cholesterol', category: 'labs', unit: 'mg/dL', daily: 'last', range: { low: 40 } },
  { id: 'triglycerides', label: 'Triglycerides', category: 'labs', unit: 'mg/dL', daily: 'last', range: { high: 150 } },
  { id: 'vitamin_d', label: 'Vitamin D', category: 'labs', unit: 'ng/mL', daily: 'last', range: { low: 30, high: 100 } },

  // Mind
  { id: 'mood', label: 'Mood', category: 'mind', unit: 'score', daily: 'avg' }, // 1–10
  { id: 'stress', label: 'Stress', category: 'mind', unit: 'score', daily: 'avg' }, // 1–10
  { id: 'energy', label: 'Energy', category: 'mind', unit: 'score', daily: 'avg' }, // 1–10
  { id: 'libido', label: 'Libido', category: 'mind', unit: 'score', daily: 'avg' }, // 1–10
];

export const METRICS: ReadonlyMap<string, MetricDef> = new Map(defs.map((d) => [d.id, d]));

export function getMetric(id: string): MetricDef {
  const def = METRICS.get(id);
  if (!def) throw new Error(`Unknown metric: ${id}`);
  return def;
}

export function flag(def: MetricDef, value: number): 'low' | 'high' | null {
  if (def.range?.low !== undefined && value < def.range.low) return 'low';
  if (def.range?.high !== undefined && value > def.range.high) return 'high';
  return null;
}
