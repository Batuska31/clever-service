-- ═══════════════════════════════════════════════════════
-- Clever Service — Phase 4 Migration
-- Table: customers
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  email           TEXT,
  phone           TEXT,
  segment         TEXT        NOT NULL DEFAULT 'standard'
                              CHECK (segment IN ('vip', 'premium', 'standard', 'inactive')),
  total_orders    INTEGER     NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_tenant   ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_segment  ON public.customers(tenant_id, segment);
CREATE INDEX IF NOT EXISTS idx_customers_email    ON public.customers(email);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on customers"
  ON public.customers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── Seed Data ───────────────────────────────────────
INSERT INTO public.customers (tenant_id, name, email, phone, segment, total_orders, total_spent) VALUES
  ('dev_tenant_123', 'Ahmet Yılmaz',    'ahmet@ornek.com',   '05301234567', 'vip',      42, 125400.00),
  ('dev_tenant_123', 'Fatma Kaya',      'fatma@sirket.com',  '05329876543', 'premium',  18,  45800.50),
  ('dev_tenant_123', 'Mehmet Demir',    'mehmet@mail.com',   '05441122334', 'standard',  7,   9200.00),
  ('dev_tenant_123', 'Zeynep Çelik',   'zeynep@email.com',  '05552233445', 'vip',      65, 210300.75),
  ('dev_tenant_123', 'Ali Öztürk',     'ali@isyeri.com',    '05673344556', 'inactive',  2,   1500.00),
  ('dev_tenant_123', 'Ayşe Şahin',    'ayse@firma.com',    '05784455667', 'premium',  31,  78900.00),
  ('dev_tenant_123', 'Mustafa Arslan', 'mustafa@work.com',  '05895566778', 'standard', 12,  22100.25),
  ('dev_tenant_123', 'Elif Doğan',    'elif@company.com',  '05906677889', 'vip',      55, 187500.00);
