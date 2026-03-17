-- ═══════════════════════════════════════════════════════
-- Clever Service — Phase 4 Migration
-- Table: orders
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT        NOT NULL,
  customer_id     UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name   TEXT        NOT NULL,  -- Denormalized for fast reporting
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  items           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- items format: [{ product_id, product_name, sku, quantity, unit_price, line_total }]
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_tenant      ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer    ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON public.orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON public.orders(tenant_id, created_at DESC);

-- RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on orders"
  ON public.orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── Seed Data ───────────────────────────────────────
-- Get customer IDs (using subqueries keyed to the seed names)
DO $$
DECLARE
  c_ahmet   UUID;
  c_fatma   UUID;
  c_mehmet  UUID;
  c_zeynep  UUID;
  c_ayse    UUID;
  c_elif    UUID;
BEGIN
  SELECT id INTO c_ahmet  FROM public.customers WHERE name = 'Ahmet Yılmaz'  AND tenant_id = 'dev_tenant_123';
  SELECT id INTO c_fatma  FROM public.customers WHERE name = 'Fatma Kaya'    AND tenant_id = 'dev_tenant_123';
  SELECT id INTO c_mehmet FROM public.customers WHERE name = 'Mehmet Demir'  AND tenant_id = 'dev_tenant_123';
  SELECT id INTO c_zeynep FROM public.customers WHERE name = 'Zeynep Çelik' AND tenant_id = 'dev_tenant_123';
  SELECT id INTO c_ayse   FROM public.customers WHERE name = 'Ayşe Şahin'  AND tenant_id = 'dev_tenant_123';
  SELECT id INTO c_elif   FROM public.customers WHERE name = 'Elif Doğan'  AND tenant_id = 'dev_tenant_123';

  INSERT INTO public.orders (tenant_id, customer_id, customer_name, status, total_amount, items, created_at) VALUES
  (
    'dev_tenant_123', c_ahmet, 'Ahmet Yılmaz', 'delivered', 26298.00,
    '[{"product_name":"Laptop Pro X1","sku":"LPX-001","quantity":1,"unit_price":24999,"line_total":24999},{"product_name":"USB-C Hub 7-Port","sku":"USB-700","quantity":1,"unit_price":849,"line_total":849},{"product_name":"Mousepad XL","sku":"MPS-XL1","quantity":2,"unit_price":249,"line_total":498}]'::jsonb,
    now() - interval '5 days'
  ),
  (
    'dev_tenant_123', c_zeynep, 'Zeynep Çelik', 'delivered', 14748.00,
    '[{"product_name":"Monitör 27\"","sku":"MNT-027","quantity":1,"unit_price":12500,"line_total":12500},{"product_name":"Kablosuz Klavye","sku":"KBR-007","quantity":1,"unit_price":1299,"line_total":1299},{"product_name":"Webcam HD 1080p","sku":"CAM-H01","quantity":0.5,"unit_price":2199,"line_total":1099}]'::jsonb,
    now() - interval '3 days'
  ),
  (
    'dev_tenant_123', c_fatma, 'Fatma Kaya', 'shipped', 9349.00,
    '[{"product_name":"Ofis Koltuğu Ergo","sku":"FRN-E01","quantity":1,"unit_price":8750,"line_total":8750},{"product_name":"Masaüstü Lambası","sku":"LMP-D01","quantity":1,"unit_price":599,"line_total":599}]'::jsonb,
    now() - interval '2 days'
  ),
  (
    'dev_tenant_123', c_elif, 'Elif Doğan', 'confirmed', 5747.00,
    '[{"product_name":"SSD 1TB","sku":"SSD-1TB","quantity":1,"unit_price":3299,"line_total":3299},{"product_name":"Webcam HD 1080p","sku":"CAM-H01","quantity":1,"unit_price":2199,"line_total":2199},{"product_name":"Mousepad XL","sku":"MPS-XL1","quantity":1,"unit_price":249,"line_total":249}]'::jsonb,
    now() - interval '1 day'
  ),
  (
    'dev_tenant_123', c_mehmet, 'Mehmet Demir', 'pending', 3548.00,
    '[{"product_name":"SSD 1TB","sku":"SSD-1TB","quantity":1,"unit_price":3299,"line_total":3299},{"product_name":"Mousepad XL","sku":"MPS-XL1","quantity":1,"unit_price":249,"line_total":249}]'::jsonb,
    now() - interval '4 hours'
  ),
  (
    'dev_tenant_123', c_ayse, 'Ayşe Şahin', 'cancelled', 12500.00,
    '[{"product_name":"Monitör 27\"","sku":"MNT-027","quantity":1,"unit_price":12500,"line_total":12500}]'::jsonb,
    now() - interval '7 days'
  );
END $$;
