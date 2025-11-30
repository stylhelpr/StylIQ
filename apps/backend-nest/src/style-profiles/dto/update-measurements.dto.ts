export class UpdateMeasurementsDto {
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder_width?: number;
  inseam?: number;
  height?: number;
  weight?: number;
  shoe_size?: number;
  // All measurements from ARKit capture (core + extended + secondary)
  all_measurements?: Record<string, number>;
}
