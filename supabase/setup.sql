-- ============================================
-- Oprisma Design - Full Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
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
CREATE TABLE IF NOT EXISTS public.paper_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  weights INTEGER[] NOT NULL DEFAULT '{}',
  weight_prices JSONB DEFAULT '{}',
  price_per_sheet_sra3 NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paper sizes
CREATE TABLE IF NOT EXISTS public.paper_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  width_mm NUMERIC NOT NULL,
  height_mm NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'standard',
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Print types
CREATE TABLE IF NOT EXISTS public.print_types (
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

-- Product-Print links
CREATE TABLE IF NOT EXISTS public.product_print_types (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  print_type_id UUID NOT NULL REFERENCES public.print_types(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, print_type_id)
);

-- Product-Paper links
CREATE TABLE IF NOT EXISTS public.product_paper_types (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  paper_type_id UUID NOT NULL REFERENCES public.paper_types(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, paper_type_id)
);

-- Product sizes
CREATE TABLE IF NOT EXISTS public.product_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width_mm NUMERIC NOT NULL,
  height_mm NUMERIC NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finitions
CREATE TABLE IF NOT EXISTS public.finitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  price_unit TEXT NOT NULL DEFAULT 'unit',
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pelliculages
CREATE TABLE IF NOT EXISTS public.pelliculages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_per_sqm NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quotes
CREATE TABLE IF NOT EXISTS public.quotes (
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

-- Public access policies
CREATE POLICY "public_all" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.paper_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.paper_sizes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.print_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.product_print_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.product_paper_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.product_sizes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.finitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.pelliculages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.quotes FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA - بيانات أساسية
-- ============================================

-- Products (منتجات)
INSERT INTO public.products (name, category, default_size_w_mm, default_size_h_mm, min_paper_weight, has_pages, has_cover, display_order) VALUES
('Carte de visite', 'print', 85, 55, 250, false, false, 0),
('Flyer A5', 'print', 148, 210, 90, false, false, 1),
('Flyer A4', 'print', 210, 297, 90, false, false, 2),
('Flyer A3', 'print', 297, 420, 90, false, false, 3),
('Dépliant 2 volets', 'print', 210, 297, 130, false, false, 4),
('Dépliant 3 volets', 'print', 297, 210, 130, false, false, 5),
('Affiche A3', 'print', 297, 420, 130, false, false, 6),
('Affiche A2', 'print', 420, 594, 130, false, false, 7),
('Catalogue / Brochure', 'print', 210, 297, 80, true, true, 8),
('Menu Restaurant', 'print', 210, 297, 170, true, true, 9),
('Autocollant', 'print', 100, 100, 80, false, false, 10),
('Tête de lettre A4', 'print', 210, 297, 80, false, false, 11),
('Enveloppe', 'print', 220, 110, 80, false, false, 12),
('Bâche / Roll-up', 'large_format', 850, 2000, 0, false, false, 13);

-- Paper types (أنواع الورق)
INSERT INTO public.paper_types (name, weights, weight_prices, price_per_sheet_sra3, display_order) VALUES
('Couché Brillant', '{90,130,170,200,250,300,350}', '{"90":18,"130":25,"170":32,"200":38,"250":48,"300":55,"350":65}', 25, 0),
('Couché Mat', '{90,130,170,200,250,300,350}', '{"90":20,"130":27,"170":34,"200":40,"250":50,"300":58,"350":68}', 27, 1),
('Offset / Bond', '{70,80,90,100,120}', '{"70":12,"80":14,"90":16,"100":18,"120":22}', 14, 2),
('Bristol', '{160,200,250,300,350,400}', '{"160":30,"200":38,"250":48,"300":55,"350":65,"400":75}', 48, 3),
('Kraft', '{80,100,120,170}', '{"80":15,"100":18,"120":22,"170":28}', 18, 4),
('Autocollant Vinyle', '{80}', '{"80":45}', 45, 5),
('Papier Recyclé', '{80,100,120}', '{"80":16,"100":20,"120":24}', 16, 6);

-- Paper sizes (مقاسات الورق)
INSERT INTO public.paper_sizes (name, width_mm, height_mm, category, display_order) VALUES
('SRA3', 450, 320, 'offset', 0),
('A3+', 483, 329, 'offset', 1),
('50×70', 500, 700, 'offset', 2),
('70×100', 700, 1000, 'offset', 3),
('SRA4', 225, 320, 'offset', 4);

-- Print types (أنواع الطباعة)
INSERT INTO public.print_types (name, category, setup_cost, cost_per_sheet, cost_per_color, recto_verso_multiplier, display_order) VALUES
('Offset Quadri (CMYK)', 'offset', 5000, 2.5, 0, 1.7, 0),
('Offset Bichromie', 'offset', 3500, 1.8, 0, 1.7, 1),
('Offset Monochrome', 'offset', 2000, 1.2, 0, 1.7, 2),
('Numérique Couleur', 'digital', 0, 15, 0, 1.8, 3),
('Numérique N&B', 'digital', 0, 5, 0, 1.8, 4),
('Grand Format (Bâche)', 'large_format', 0, 3500, 0, 1, 5);

-- Finitions (تشطيبات)
INSERT INTO public.finitions (name, price, price_unit, display_order) VALUES
('Découpe droite', 2, 'unit', 0),
('Découpe arrondie', 4, 'unit', 1),
('Pliage', 3, 'unit', 2),
('Rainage', 2.5, 'unit', 3),
('Perforation', 3, 'unit', 4),
('Dorure à chaud', 15, 'unit', 5),
('Vernis UV sélectif', 80, 'sqm', 6),
('Reliure agrafée', 15, 'unit', 7),
('Reliure spirale', 50, 'unit', 8),
('Reliure dos carré collé', 80, 'unit', 9);

-- Pelliculages (تغليفات)
INSERT INTO public.pelliculages (name, price_per_sqm, display_order) VALUES
('Pelliculage Brillant', 120, 0),
('Pelliculage Mat', 130, 1),
('Pelliculage Soft Touch', 180, 2);

-- Settings (إعدادات)
INSERT INTO public.settings (key, value) VALUES
('design_percentage', '35'),
('company_name', '"Oprisma Design"'),
('default_bleed_mm', '3');
