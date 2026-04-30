
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  category TEXT NOT NULL DEFAULT 'print',
  min_paper_weight INTEGER DEFAULT 80,
  default_size_w_mm NUMERIC,
  default_size_h_mm NUMERIC,
  has_pages BOOLEAN DEFAULT false,
  has_cover BOOLEAN DEFAULT false,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paper types
CREATE TABLE public.paper_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  weights INTEGER[] NOT NULL DEFAULT '{}',
  price_per_sheet_sra3 NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paper sizes (formats of raw paper sheets)
CREATE TABLE public.paper_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  width_mm NUMERIC NOT NULL,
  height_mm NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'standard',
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Print types (offset / digital with variants)
CREATE TABLE public.print_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'offset',
  setup_cost NUMERIC NOT NULL DEFAULT 0,
  cost_per_sheet NUMERIC NOT NULL DEFAULT 0,
  cost_per_color NUMERIC NOT NULL DEFAULT 0,
  recto_verso_multiplier NUMERIC NOT NULL DEFAULT 1.8,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link products to allowed print types
CREATE TABLE public.product_print_types (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  print_type_id UUID NOT NULL REFERENCES public.print_types(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, print_type_id)
);

-- Link products to allowed paper types
CREATE TABLE public.product_paper_types (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  paper_type_id UUID NOT NULL REFERENCES public.paper_types(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, paper_type_id)
);

-- Standard product finished sizes
CREATE TABLE public.product_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width_mm NUMERIC NOT NULL,
  height_mm NUMERIC NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finitions
CREATE TABLE public.finitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  price_unit TEXT NOT NULL DEFAULT 'unit',
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pelliculages (laminations)
CREATE TABLE public.pelliculages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_per_sqm NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- General settings (key-value)
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved quotes
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_company TEXT,
  product_name TEXT,
  quantity INTEGER,
  total NUMERIC,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_print_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_paper_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelliculages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth)
CREATE POLICY "public_all_products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_paper_types" ON public.paper_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_paper_sizes" ON public.paper_sizes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_print_types" ON public.print_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_product_print_types" ON public.product_print_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_product_paper_types" ON public.product_paper_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_product_sizes" ON public.product_sizes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_finitions" ON public.finitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_pelliculages" ON public.pelliculages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_quotes" ON public.quotes FOR ALL USING (true) WITH CHECK (true);
