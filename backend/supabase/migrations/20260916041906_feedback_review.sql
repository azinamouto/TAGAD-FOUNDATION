CREATE TABLE public.tagad_citizen_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  subject varchar(255) NOT NULL,
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 10000),
  status varchar(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')),
  review_note varchar(2000),
  reviewed_by_id uuid REFERENCES public.tagad_users(id) ON DELETE SET NULL,
  reviewed_at timestamp(3),
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX tagad_citizen_feedback_status_created_at_idx ON public.tagad_citizen_feedback(status, created_at);
ALTER TABLE public.tagad_citizen_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tagad_citizen_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tagad_citizen_feedback TO service_role;
CREATE POLICY tagad_deny_data_api ON public.tagad_citizen_feedback AS RESTRICTIVE
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
