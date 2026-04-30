-- ============================================
-- Add multilingual columns to all tables
-- ============================================

-- paper_types
ALTER TABLE public.paper_types ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE public.paper_types ADD COLUMN IF NOT EXISTS name_en TEXT;

-- paper_sizes
ALTER TABLE public.paper_sizes ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE public.paper_sizes ADD COLUMN IF NOT EXISTS name_en TEXT;

-- print_types
ALTER TABLE public.print_types ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE public.print_types ADD COLUMN IF NOT EXISTS name_en TEXT;

-- finitions
ALTER TABLE public.finitions ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE public.finitions ADD COLUMN IF NOT EXISTS name_en TEXT;

-- pelliculages
ALTER TABLE public.pelliculages ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE public.pelliculages ADD COLUMN IF NOT EXISTS name_en TEXT;

-- ============================================
-- Update Products (name_ar + name_en)
-- ============================================
UPDATE public.products SET name_ar = 'بطاقة أعمال', name_en = 'Business Card' WHERE name = 'Carte de visite';
UPDATE public.products SET name_ar = 'فلاير A5', name_en = 'Flyer A5' WHERE name = 'Flyer A5';
UPDATE public.products SET name_ar = 'فلاير A4', name_en = 'Flyer A4' WHERE name = 'Flyer A4';
UPDATE public.products SET name_ar = 'فلاير A3', name_en = 'Flyer A3' WHERE name = 'Flyer A3';
UPDATE public.products SET name_ar = 'مطوية ثنائية', name_en = 'Bi-fold Brochure' WHERE name = 'Dépliant 2 volets';
UPDATE public.products SET name_ar = 'مطوية ثلاثية', name_en = 'Tri-fold Brochure' WHERE name = 'Dépliant 3 volets';
UPDATE public.products SET name_ar = 'ملصق A3', name_en = 'Poster A3' WHERE name = 'Affiche A3';
UPDATE public.products SET name_ar = 'ملصق A2', name_en = 'Poster A2' WHERE name = 'Affiche A2';
UPDATE public.products SET name_ar = 'كتالوج / كتيب', name_en = 'Catalog / Brochure' WHERE name = 'Catalogue / Brochure';
UPDATE public.products SET name_ar = 'قائمة مطعم', name_en = 'Restaurant Menu' WHERE name = 'Menu Restaurant';
UPDATE public.products SET name_ar = 'ملصق لاصق', name_en = 'Sticker' WHERE name = 'Autocollant';
UPDATE public.products SET name_ar = 'ترويسة A4', name_en = 'Letterhead A4' WHERE name = 'Tête de lettre A4';
UPDATE public.products SET name_ar = 'ظرف', name_en = 'Envelope' WHERE name = 'Enveloppe';
UPDATE public.products SET name_ar = 'لافتة / رول أب', name_en = 'Banner / Roll-up' WHERE name = 'Bâche / Roll-up';

-- ============================================
-- Update Paper Types
-- ============================================
UPDATE public.paper_types SET name_ar = 'ورق لامع', name_en = 'Glossy Coated' WHERE name = 'Couché Brillant';
UPDATE public.paper_types SET name_ar = 'ورق مطفي', name_en = 'Matte Coated' WHERE name = 'Couché Mat';
UPDATE public.paper_types SET name_ar = 'ورق عادي', name_en = 'Bond / Offset' WHERE name = 'Offset / Bond';
UPDATE public.paper_types SET name_ar = 'بريستول', name_en = 'Bristol' WHERE name = 'Bristol';
UPDATE public.paper_types SET name_ar = 'كرافت', name_en = 'Kraft' WHERE name = 'Kraft';
UPDATE public.paper_types SET name_ar = 'فينيل لاصق', name_en = 'Vinyl Sticker' WHERE name = 'Autocollant Vinyle';
UPDATE public.paper_types SET name_ar = 'ورق معاد تدويره', name_en = 'Recycled Paper' WHERE name = 'Papier Recyclé';

-- ============================================
-- Update Print Types
-- ============================================
UPDATE public.print_types SET name_ar = 'أوفست رباعي الألوان', name_en = 'Offset CMYK' WHERE name = 'Offset Quadri (CMYK)';
UPDATE public.print_types SET name_ar = 'أوفست لونين', name_en = 'Offset 2-Color' WHERE name = 'Offset Bichromie';
UPDATE public.print_types SET name_ar = 'أوفست أحادي', name_en = 'Offset Mono' WHERE name = 'Offset Monochrome';
UPDATE public.print_types SET name_ar = 'رقمي ألوان', name_en = 'Digital Color' WHERE name = 'Numérique Couleur';
UPDATE public.print_types SET name_ar = 'رقمي أبيض وأسود', name_en = 'Digital B&W' WHERE name = 'Numérique N&B';
UPDATE public.print_types SET name_ar = 'طباعة كبيرة (بانر)', name_en = 'Large Format (Banner)' WHERE name = 'Grand Format (Bâche)';

-- ============================================
-- Update Finitions
-- ============================================
UPDATE public.finitions SET name_ar = 'قص مستقيم', name_en = 'Straight Cut' WHERE name = 'Découpe droite';
UPDATE public.finitions SET name_ar = 'قص مستدير', name_en = 'Rounded Cut' WHERE name = 'Découpe arrondie';
UPDATE public.finitions SET name_ar = 'طي', name_en = 'Folding' WHERE name = 'Pliage';
UPDATE public.finitions SET name_ar = 'تخريم', name_en = 'Scoring' WHERE name = 'Rainage';
UPDATE public.finitions SET name_ar = 'تثقيب', name_en = 'Perforation' WHERE name = 'Perforation';
UPDATE public.finitions SET name_ar = 'ختم ذهبي ساخن', name_en = 'Hot Gold Stamping' WHERE name = 'Dorure à chaud';
UPDATE public.finitions SET name_ar = 'ورنيش UV انتقائي', name_en = 'Spot UV Varnish' WHERE name = 'Vernis UV sélectif';
UPDATE public.finitions SET name_ar = 'تجليد بالدبوس', name_en = 'Saddle Stitch' WHERE name = 'Reliure agrafée';
UPDATE public.finitions SET name_ar = 'تجليد حلزوني', name_en = 'Spiral Binding' WHERE name = 'Reliure spirale';
UPDATE public.finitions SET name_ar = 'تجليد لصق', name_en = 'Perfect Binding' WHERE name = 'Reliure dos carré collé';

-- ============================================
-- Update Pelliculages
-- ============================================
UPDATE public.pelliculages SET name_ar = 'تغليف لامع', name_en = 'Glossy Lamination' WHERE name = 'Pelliculage Brillant';
UPDATE public.pelliculages SET name_ar = 'تغليف مطفي', name_en = 'Matte Lamination' WHERE name = 'Pelliculage Mat';
UPDATE public.pelliculages SET name_ar = 'تغليف سوفت تاتش', name_en = 'Soft Touch Lamination' WHERE name = 'Pelliculage Soft Touch';
