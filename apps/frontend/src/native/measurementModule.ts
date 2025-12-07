// src/native/measurementModule.ts
import {NativeModules} from 'react-native';

const {MeasurementModule} = NativeModules;

export type BodyMeasurements = {
  shoulderWidthCm: number;
  hipWidthCm: number;
  chestCircumferenceCm: number;
  waistCircumferenceCm: number;
  hipCircumferenceCm: number;
  legLengthCm: number;
  inseamCm: number;
  torsoLengthCm: number;
  shoulderToHipRatio: number;
};

type MeasureBodyParams = {
  frontPhotoPath: string;
  sidePhotoPath: string;
  userHeightCm: number;
};

export async function measureBody(
  frontPhotoPath: string,
  sidePhotoPath: string,
  userHeightCm: number,
): Promise<BodyMeasurements> {
  const params: MeasureBodyParams = {
    frontPhotoPath,
    sidePhotoPath,
    userHeightCm,
  };

  const result = await MeasurementModule.measureBody(params);
  return result as BodyMeasurements;
}
