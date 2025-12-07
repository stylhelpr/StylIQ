// ✅ Safe height calibration utility
export function applyHeightCalibration(
  measurements: Record<string, number>,
  userHeightCm: number,
) {
  const currentHeight = measurements.height || 170; // fallback if missing
  const scale = userHeightCm / currentHeight;

  const scaled: Record<string, number> = {};
  for (const key in measurements) {
    scaled[key] = measurements[key] * scale;
  }
  return scaled;
}
