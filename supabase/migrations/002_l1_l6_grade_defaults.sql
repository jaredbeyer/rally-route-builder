-- Update default project settings to L1–L6 / R1–R6 pace-note grades.
-- L1 = 180° hairpin, L3 = 90°, L6 = flat wide-open sweeper (same for right).
-- Existing project rows are left as-is; the app normalizes old sharpness names on load.

ALTER TABLE projects
  ALTER COLUMN settings SET DEFAULT '{
    "smoothWindow": 5,
    "minTurnAngle": 20,
    "thresholds": {"6": 30, "5": 55, "4": 80, "3": 115, "2": 155},
    "mileInterval": 1,
    "mileUnit": "miles"
  }'::jsonb;
