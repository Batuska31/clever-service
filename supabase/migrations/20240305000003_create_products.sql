-- ═══════════════════════════════════════════════════════
-- Clever Service — Phase 4 Migration
-- Table: products
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.products (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT        NOT NULL,
  name                TEXT        NOT NULL,
  sku                 TEXT        NOT NULL,
  category            TEXT        NOT NULL DEFAULT 'Genel',
  price               NUMERIC(10, 2) NOT NULL DEFAULT 0,
  stock_quantity      INTEGER     NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER     NOT NULL DEFAULT 10,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku)
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_tenant   ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_products_stock    ON public.products(tenant_id, stock_quantity);

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on products"
  ON public.products FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── Seed Data ───────────────────────────────────────
INSERT INTO public.products (tenant_id, name, sku, category, price, stock_quantity, low_stock_threshold) VALUES
  ('dev_tenant_123', 'Laptop Pro X1',        'LPX-001', 'Elektronik',    24999.00,  45,  5),
  ('dev_tenant_123', 'Kablosuz Klavye',       'KBR-007', 'Aksesuar',       1299.00,   8,  10),  -- Düşük stok
  ('dev_tenant_123', 'Monitör 27"',          'MNT-027', 'Elektronik',    12500.00,  23,  5),
  ('dev_tenant_123', 'USB-C Hub 7-Port',     'USB-700', 'Aksesuar',        849.00,   3,  10),  -- Düşük stok
  ('dev_tenant_123', 'Ofis Koltuğu Ergo',    'FRN-E01', 'Mobilya',        8750.00,  12,  5),
  ('dev_tenant_123', 'Yazıcı LaserJet',      'PRN-L10', 'Elektronik',     6200.00,   0,  5),   -- Stok yok
  ('dev_tenant_123', 'Mousepad XL',          'MPS-XL1', 'Aksesuar',        249.00, 150,  20),
  ('dev_tenant_123', 'Webcam HD 1080p',      'CAM-H01', 'Elektronik',     2199.00,   6,  10),  -- Düşük stok
  ('dev_tenant_123', 'Masaüstü Lambası',     'LMP-D01', 'Mobilya',         599.00,  34,  10),
  ('dev_tenant_123', 'SSD 1TB',             'SSD-1TB', 'Depolama',       3299.00,  18,  10);
