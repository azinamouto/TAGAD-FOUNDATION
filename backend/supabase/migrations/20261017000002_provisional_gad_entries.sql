-- Additive only: no historical data mutation. Application server owns authorization.
CREATE TABLE tagad_provisional_gad_series (
 id UUID PRIMARY KEY, code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(200) NOT NULL,
 source_reference VARCHAR(1000) NOT NULL CHECK (length(trim(source_reference)) > 0),
 owning_office_id UUID NOT NULL REFERENCES tagad_offices(id) ON DELETE RESTRICT,
 creator_id UUID NOT NULL REFERENCES tagad_users(id) ON DELETE RESTRICT,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(3) NOT NULL,
 UNIQUE(id, owning_office_id)
);
CREATE TABLE tagad_provisional_gad_references (
 barangay_id UUID PRIMARY KEY REFERENCES tagad_barangays(id) ON DELETE RESTRICT,
 evidence VARCHAR(1000) NOT NULL CHECK (length(trim(evidence)) > 0),
 is_synthetic BOOLEAN NOT NULL DEFAULT false, is_active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE tagad_provisional_gad_entries (
 id UUID PRIMARY KEY, series_id UUID NOT NULL,
 barangay_id UUID NOT NULL REFERENCES tagad_barangays(id) ON DELETE RESTRICT,
 period VARCHAR(50) NOT NULL CHECK (length(trim(period)) > 0),
 male INTEGER NOT NULL CHECK (male >= 0), female INTEGER NOT NULL CHECK (female >= 0),
 owning_office_id UUID NOT NULL, creator_id UUID NOT NULL REFERENCES tagad_users(id) ON DELETE RESTRICT,
 source_reference VARCHAR(1000) NOT NULL CHECK (length(trim(source_reference)) > 0),
 source_file_name VARCHAR(255), batch_id UUID NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(3) NOT NULL,
 FOREIGN KEY(series_id, owning_office_id) REFERENCES tagad_provisional_gad_series(id, owning_office_id) ON DELETE RESTRICT,
 UNIQUE(series_id, barangay_id, period)
);
CREATE INDEX tagad_provisional_gad_entries_scope ON tagad_provisional_gad_entries(owning_office_id, series_id, period);

-- No Data API access, including if a future migration accidentally grants it.
DO $migration$
DECLARE target text;
BEGIN
 FOREACH target IN ARRAY ARRAY['tagad_provisional_gad_series', 'tagad_provisional_gad_references', 'tagad_provisional_gad_entries']
 LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target);
  EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC, anon, authenticated', target);
  EXECUTE format('CREATE POLICY tagad_deny_data_api ON %I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', target);
 END LOOP;
END
$migration$;
