-- ═══════════════════════════════════════════════════════
-- Clever Service — Phase 4 Migration
-- Table: ai_conversations
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT        NOT NULL,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL DEFAULT 'Yeni Sohbet',
  messages      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant ON public.ai_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user   ON public.ai_conversations(user_id);

-- RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: users see only their own conversations
CREATE POLICY "Users can manage own conversations"
  ON public.ai_conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: service-role (Edge Functions) bypass RLS
CREATE POLICY "Service role full access"
  ON public.ai_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
