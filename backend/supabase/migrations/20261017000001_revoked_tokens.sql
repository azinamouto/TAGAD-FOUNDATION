-- Add the durable revocation store required by TokenRevocationService.
-- Intentionally fail if an unledgered table already exists: inspect/reconcile it
-- explicitly before deployment; never discard existing revocations.
CREATE TABLE public.tagad_revoked_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jti varchar(255) UNIQUE,
  token_hash varchar(64) NOT NULL UNIQUE,
  user_id uuid REFERENCES public.tagad_users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  reason varchar(255),
  expires_at timestamp(3) NOT NULL,
  revoked_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX tagad_revoked_tokens_token_hash_idx ON public.tagad_revoked_tokens(token_hash);
CREATE INDEX tagad_revoked_tokens_jti_idx ON public.tagad_revoked_tokens(jti);
CREATE INDEX tagad_revoked_tokens_expires_at_idx ON public.tagad_revoked_tokens(expires_at);
CREATE INDEX tagad_revoked_tokens_user_id_idx ON public.tagad_revoked_tokens(user_id);
ALTER TABLE public.tagad_revoked_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tagad_revoked_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tagad_revoked_tokens TO service_role;
CREATE POLICY tagad_deny_data_api ON public.tagad_revoked_tokens AS RESTRICTIVE
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
