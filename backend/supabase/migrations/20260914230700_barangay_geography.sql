ALTER TABLE public.tagad_barangays
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD COLUMN boundary jsonb,
  ADD COLUMN geo_source text,
  ADD COLUMN geo_verified boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT tagad_barangay_latitude_range CHECK (latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT tagad_barangay_longitude_range CHECK (longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT tagad_barangay_coordinate_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
  ADD CONSTRAINT tagad_barangay_boundary_type CHECK (boundary IS NULL OR (
    jsonb_typeof(boundary) = 'object' AND boundary ? 'type' AND boundary ? 'coordinates'
    AND boundary->>'type' IN ('Polygon', 'MultiPolygon') AND jsonb_typeof(boundary->'coordinates') = 'array'));
-- Existing 25 reference rows receive NULL geometry and geo_verified=false.
-- Do not invent or overwrite coordinates: import a documented source later.
