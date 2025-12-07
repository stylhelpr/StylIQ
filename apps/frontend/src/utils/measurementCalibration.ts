// StylIQ — measurementCalibration.ts
// ✅ Final calibration constants for 5'10" / 42R baseline (107 cm chest, 46 cm shoulders)

export const CALIBRATION_MULTIPLIERS = {
  shoulders: 1.0, // already accurate from normalized data
  chest: 2.05, // converts half-width (~52 cm) to full circumference (~107 cm)
  waist: 2.0, // proportional to average taper
  hips: 2.1, // aligns with 42R–44R lower body proportions
  inseam: 1.0, // ARKit vertical scale already normalized
};

/**
 * Apply calibration to raw computed results.
 * Pass this the object from useMeasurementStore.computedResults.
 */
export function applyCalibration(
  results: Record<string, number> | null,
): Record<string, number> | null {
  if (!results) return null;

  const scaled: Record<string, number> = {};
  for (const key of Object.keys(results)) {
    const multiplier =
      CALIBRATION_MULTIPLIERS[key as keyof typeof CALIBRATION_MULTIPLIERS] ?? 1;
    scaled[key] = results[key] * multiplier;
  }

  console.log('✅ Calibrated results:', scaled);
  return scaled;
}
