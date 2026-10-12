// Convert incoming values to each metric's canonical unit.

type Converter = (v: number) => number;

const conversions: Record<string, Record<string, Converter>> = {
  kg: { lb: (v) => v * 0.45359237, lbs: (v) => v * 0.45359237, g: (v) => v / 1000 },
  cm: { in: (v) => v * 2.54, m: (v) => v * 100 },
  h: { min: (v) => v / 60, s: (v) => v / 3600 },
  min: { h: (v) => v * 60, s: (v) => v / 60 },
  kcal: { kj: (v) => v / 4.184, cal: (v) => v / 1000 },
  L: { ml: (v) => v / 1000, mL: (v) => v / 1000, 'fl oz': (v) => v * 0.0295735, floz: (v) => v * 0.0295735 },
  '%': { fraction: (v) => v * 100 },
  'ng/dL': { 'nmol/L': (v) => v * 28.85 },
  'mg/dL': { 'mmol/L': (v) => v * 18.0 }, // glucose factor; lipids use a different one
  'ng/mL': { 'nmol/L': (v) => v / 2.496 }, // vitamin D
};

export function toCanonical(value: number, from: string | undefined, to: string): number {
  if (!from || from === to) return value;
  const fn = conversions[to]?.[from] ?? conversions[to]?.[from.toLowerCase()];
  if (!fn) throw new Error(`Cannot convert ${from} to ${to}`);
  return fn(value);
}
