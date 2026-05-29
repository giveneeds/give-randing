-- Migration: service detail in-page lead source tracking
--
-- Purpose:
--   Store which /service/[slug] page submitted an in-page inquiry.
--
-- Safety / pre-check:
--   Run these SELECTs before the ALTER statements and confirm no unexpected
--   existing service source columns are present.
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'leads'
--      AND column_name IN ('service_id', 'service_slug')
--    ORDER BY column_name;
--
--   SELECT count(*) AS lead_count FROM leads;
--   SELECT id, slug, title FROM services ORDER BY order_num ASC, created_at DESC LIMIT 20;
--
-- Manual backup:
--   Before running this migration against Supabase, export current leads data
--   from the dashboard or CLI to a workspace temp file, for example:
--   /tmp/giveneeds-leads-before-service-source.json
--
-- Risk:
--   This migration only adds nullable columns and an index. It does not update,
--   overwrite, or delete existing lead rows.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_slug TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'leads'::regclass
       AND conname = 'leads_service_id_fkey'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_service_id_fkey
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_service_id ON leads (service_id);
CREATE INDEX IF NOT EXISTS idx_leads_service_slug ON leads (service_slug);

-- PostgREST schema cache refresh.
NOTIFY pgrst, 'reload schema';

-- Post-check:
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'leads'
--      AND column_name IN ('service_id', 'service_slug')
--    ORDER BY column_name;
