-- Convert measurement columns from INTEGER to NUMERIC to support decimal values
ALTER TABLE style_profiles
ALTER COLUMN chest TYPE NUMERIC(10, 2) USING ROUND(chest::numeric, 2),
ALTER COLUMN waist TYPE NUMERIC(10, 2) USING ROUND(waist::numeric, 2),
ALTER COLUMN hip TYPE NUMERIC(10, 2) USING ROUND(hip::numeric, 2),
ALTER COLUMN shoulder_width TYPE NUMERIC(10, 2) USING ROUND(shoulder_width::numeric, 2),
ALTER COLUMN inseam TYPE NUMERIC(10, 2) USING ROUND(inseam::numeric, 2);
