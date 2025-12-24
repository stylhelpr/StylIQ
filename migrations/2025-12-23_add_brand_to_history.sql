-- Add brand column to browser_history table
ALTER TABLE browser_history ADD COLUMN IF NOT EXISTS brand TEXT;
