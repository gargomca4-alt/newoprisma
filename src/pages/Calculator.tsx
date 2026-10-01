import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { calculate, CalcInput, formatDZD } from "@/lib/calc";
import { CalculatorResult } from "@/components/calculator/CalculatorResult";
import { CalculatorFinitions } from "@/components/calculator/CalculatorFinitions";
import { Calculator, Plus, Sparkles, Clock, Layers, Bookmark, BookmarkPlus, Tag, Percent, MessageSquare, Trash2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { showSuccess } from "@/lib/alerts";
import { localName } from "@/lib/localName";
import { useRole } from "@/lib/useRole";
import { logAction } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadUserPrices, applyUserPricing, saveQuoteWithUser, hasCustomPrices } from "@/lib/userPricing";

const DRAFT_KEY = "oprisma_calc_draft";

export const UI_UX_MODULES = [
  { id: "wireframe", name: "Recherche UX & Wireframing", hours: 8, icon: "📐", desc: "Arborescence, personas, parcours utilisateur et zonages basse-fidélité" },
  { id: "ui_screens", name: "Maquettes UI Hautes Fidélités (Figma)", hours: 16, icon: "🎨", desc: "Design interfaces modernes, typographies, styles et composants visuels" },
  { id: "prototype", name: "Prototype Interactif & Transitions", hours: 8, icon: "⚡", desc: "Liens interactifs, smart animate et flux cliquable" },
  { id: "design_system", name: "Design System complet & Kit UI", hours: 12, icon: "🧩", desc: "Tokens (couleurs, typo), auto-layout, variantes et icônes" },
  { id: "responsive", name: "Adaptation Mobile & Tablette", hours: 10, icon: "📱", desc: "Déclinaisons responsives sur toutes les résolutions d'écran" },
  { id: "handover", name: "Handover Développeurs & Spécifications", hours: 4, icon: "🚀", desc: "Exports SVG, guides de styles CSS/Flutter, documentation" },
];

type Product = any;
type PaperType = any;
type PaperSize = any;
type PrintType = any;
type Finition = any;
type Pelliculage = any;

export default function CalculatorPage() {
  const { t } = useTranslation();
  const { email, role, userId } = useRole();
  const [hasUserPricing, setHasUserPricing] = useState(false);

  // Data from DB
  const [products, setProducts] = useState<Product[]>([]);
  const [paperTypes, setPaperTypes] = useState<PaperType[]>([]);
  const [paperSizes, setPaperSizes] = useState<PaperSize[]>([]);
  const [printTypes, setPrintTypes] = useState<PrintType[]>([]);
  const [finitions, setFinitions] = useState<Finition[]>([]);
  const [pelliculages, setPelliculages] = useState<Pelliculage[]>([]);
  const [productLinks, setProductLinks] = useState<{ paper: any[]; print: any[] }>({ paper: [], print: [] });
  const [designPct, setDesignPct] = useState(35);

  // Inputs
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [printTypeId, setPrintTypeId] = useState<string>("");
  const [paperTypeId, setPaperTypeId] = useState<string>("");
  const [paperWeight, setPaperWeight] = useState<number>(0);
  const [paperSizeId, setPaperSizeId] = useState<string>("");
  const [coverPaperTypeId, setCoverPaperTypeId] = useState<string>("");
  const [coverWeight, setCoverWeight] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1000);
  const [bleed, setBleed] = useState<number>(3);
  const [rectoVerso, setRectoVerso] = useState(true);
  const [innerPages, setInnerPages] = useState(8);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [customW, setCustomW] = useState<number>(85);
  const [customH, setCustomH] = useState<number>(55);
  const [selectedFinitions, setSelectedFinitions] = useState<string[]>([]);
  const [selectedPelliculages, setSelectedPelliculages] = useState<string[]>([]);
  const [addDesign, setAddDesign] = useState(false);
  const [newSizeOpen, setNewSizeOpen] = useState(false);
  const [newSize, setNewSize] = useState({ name: "", width_mm: "", height_mm: "" });
  const [recentClients, setRecentClients] = useState<{name: string, company: string}[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [layoutPreference, setLayoutPreference] = useState<'horizontal' | 'vertical' | 'optimal'>('optimal');

  // UI/UX states
  const [uiUxHourlyRate, setUiUxHourlyRate] = useState<number>(2500);
  const [uiUxHours, setUiUxHours] = useState<number>(20);
  const [uiUxCalcMode, setUiUxCalcMode] = useState<'hours' | 'screens'>('hours');
  const [uiUxScreenCount, setUiUxScreenCount] = useState<number>(8);
  const [uiUxHoursPerScreen, setUiUxHoursPerScreen] = useState<number>(2.5);
  const [selectedUiUxModules, setSelectedUiUxModules] = useState<string[]>([]);

  // Commercial Discount
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Quote Notes / Special Instructions
  const [quoteNotes, setQuoteNotes] = useState<string>("");

  // Devis Templates
  const [templates, setTemplates] = useState<{ id: string; name: string; data: any }[]>([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const TEMPLATES_KEY = "oprisma_devis_templates";
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_KEY);
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleSaveTemplate = () => {
    if (!templateName.trim()) { toast.error("Nom du modèle requis"); return; }
    const currentConfig = {
      productId, printTypeId, paperTypeId, paperWeight, paperSizeId,
      coverPaperTypeId, coverWeight, quantity, bleed, rectoVerso, innerPages,
      useCustomSize, customW, customH, selectedFinitions, selectedPelliculages,
      addDesign, layoutPreference, uiUxHourlyRate, uiUxHours, uiUxCalcMode,
      uiUxScreenCount, uiUxHoursPerScreen, selectedUiUxModules, discountType, discountValue
    };
    const newTemplates = [...templates.filter(t => t.name !== templateName), {
      id: Date.now().toString(),
      name: templateName.trim(),
      data: currentConfig
    }];
    setTemplates(newTemplates);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(newTemplates));
    toast.success(`Modèle "${templateName}" enregistré !`);
    setSaveTemplateOpen(false);
    setTemplateName("");
  };

  const handleApplyTemplate = (tpl: any) => {
    const d = tpl.data;
    if (d.productId) setProductId(d.productId);
    if (d.printTypeId) setPrintTypeId(d.printTypeId);
    if (d.paperTypeId) setPaperTypeId(d.paperTypeId);
    if (d.paperWeight !== undefined) setPaperWeight(d.paperWeight);
    if (d.paperSizeId) setPaperSizeId(d.paperSizeId);
    if (d.coverPaperTypeId) setCoverPaperTypeId(d.coverPaperTypeId);
    if (d.coverWeight !== undefined) setCoverWeight(d.coverWeight);
    if (d.quantity !== undefined) setQuantity(d.quantity);
    if (d.bleed !== undefined) setBleed(d.bleed);
    if (d.rectoVerso !== undefined) setRectoVerso(d.rectoVerso);
    if (d.innerPages !== undefined) setInnerPages(d.innerPages);
    if (d.useCustomSize !== undefined) setUseCustomSize(d.useCustomSize);
    if (d.customW !== undefined) setCustomW(d.customW);
    if (d.customH !== undefined) setCustomH(d.customH);
    if (d.selectedFinitions) setSelectedFinitions(d.selectedFinitions);
    if (d.selectedPelliculages) setSelectedPelliculages(d.selectedPelliculages);
    if (d.addDesign !== undefined) setAddDesign(d.addDesign);
    if (d.layoutPreference) setLayoutPreference(d.layoutPreference);
    if (d.uiUxHourlyRate) setUiUxHourlyRate(d.uiUxHourlyRate);
    if (d.uiUxHours) setUiUxHours(d.uiUxHours);
    if (d.uiUxCalcMode) setUiUxCalcMode(d.uiUxCalcMode);
    if (d.uiUxScreenCount) setUiUxScreenCount(d.uiUxScreenCount);
    if (d.uiUxHoursPerScreen) setUiUxHoursPerScreen(d.uiUxHoursPerScreen);
    if (d.selectedUiUxModules) setSelectedUiUxModules(d.selectedUiUxModules);
    if (d.discountType) setDiscountType(d.discountType);
    if (d.discountValue !== undefined) setDiscountValue(d.discountValue);
    toast.success(`Modèle "${tpl.name}" appliqué !`);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    toast.info("Modèle supprimé");
  };

  const draftLoaded = useRef(false);

  // Auto-save draft to localStorage
  const saveDraft = useCallback(() => {
    const draft = {
      clientName, clientCompany, productId, printTypeId, paperTypeId,
      paperWeight, paperSizeId, coverPaperTypeId, coverWeight, quantity,
      bleed, rectoVerso, innerPages, useCustomSize, customW, customH,
      selectedFinitions, selectedPelliculages, addDesign, layoutPreference,
      uiUxHourlyRate, uiUxHours, uiUxCalcMode, uiUxScreenCount, uiUxHoursPerScreen, selectedUiUxModules,
      discountType, discountValue, quoteNotes,
      savedAt: Date.now(),
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [clientName, clientCompany, productId, printTypeId, paperTypeId, paperWeight, paperSizeId, coverPaperTypeId, coverWeight, quantity, bleed, rectoVerso, innerPages, useCustomSize, customW, customH, selectedFinitions, selectedPelliculages, addDesign, layoutPreference, uiUxHourlyRate, uiUxHours, uiUxCalcMode, uiUxScreenCount, uiUxHoursPerScreen, selectedUiUxModules, discountType, discountValue, quoteNotes]);

  // Save draft on every change (debounced)
  useEffect(() => {
    if (!draftLoaded.current) return;
    const timer = setTimeout(saveDraft, 500);
    return () => clearTimeout(timer);
  }, [saveDraft]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) { draftLoaded.current = true; return; }
      const draft = JSON.parse(raw);
      // Only restore if saved within 24 hours
      if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        draftLoaded.current = true;
        return;
      }
      if (draft.clientName) setClientName(draft.clientName);
      if (draft.clientCompany) setClientCompany(draft.clientCompany);
      if (draft.productId) setProductId(draft.productId);
      if (draft.printTypeId) setPrintTypeId(draft.printTypeId);
      if (draft.paperTypeId) setPaperTypeId(draft.paperTypeId);
      if (draft.paperWeight) setPaperWeight(draft.paperWeight);
      if (draft.paperSizeId) setPaperSizeId(draft.paperSizeId);
      if (draft.coverPaperTypeId) setCoverPaperTypeId(draft.coverPaperTypeId);
      if (draft.coverWeight) setCoverWeight(draft.coverWeight);
      if (draft.quantity) setQuantity(draft.quantity);
      if (draft.bleed !== undefined) setBleed(draft.bleed);
      if (draft.rectoVerso !== undefined) setRectoVerso(draft.rectoVerso);
      if (draft.innerPages) setInnerPages(draft.innerPages);
      if (draft.useCustomSize !== undefined) setUseCustomSize(draft.useCustomSize);
      if (draft.customW) setCustomW(draft.customW);
      if (draft.customH) setCustomH(draft.customH);
      if (draft.selectedFinitions?.length) setSelectedFinitions(draft.selectedFinitions);
      if (draft.selectedPelliculages?.length) setSelectedPelliculages(draft.selectedPelliculages);
      if (draft.addDesign !== undefined) setAddDesign(draft.addDesign);
      if (draft.layoutPreference) setLayoutPreference(draft.layoutPreference);
      if (draft.uiUxHourlyRate) setUiUxHourlyRate(draft.uiUxHourlyRate);
      if (draft.uiUxHours) setUiUxHours(draft.uiUxHours);
      if (draft.uiUxCalcMode) setUiUxCalcMode(draft.uiUxCalcMode);
      if (draft.uiUxScreenCount) setUiUxScreenCount(draft.uiUxScreenCount);
      if (draft.uiUxHoursPerScreen) setUiUxHoursPerScreen(draft.uiUxHoursPerScreen);
      if (draft.selectedUiUxModules?.length) setSelectedUiUxModules(draft.selectedUiUxModules);
      toast.info("Brouillon restauré automatiquement", { duration: 3000 });
      draftLoaded.current = true;
    } catch { draftLoaded.current = true; }
  }, []);

  const createPaperSize = async () => {
    const w = Number(newSize.width_mm);
    const h = Number(newSize.height_mm);
    if (!newSize.name.trim() || !w || !h) {
      toast.error("Nom, largeur et hauteur requis");
      return;
    }
    const { data, error } = await supabase
      .from("paper_sizes")
      .insert({ name: newSize.name.trim(), width_mm: w, height_mm: h, category: "offset", active: true, display_order: paperSizes.length })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setPaperSizes([...paperSizes, data]);
    setPaperSizeId(data.id);
    setNewSize({ name: "", width_mm: "", height_mm: "" });
    setNewSizeOpen(false);
    toast.success("Format ajouté");
  };

  useEffect(() => {
    (async () => {
      const [p, pt, ps, prt, fi, pe, ppl, ppr, st, qt, userPrices] = await Promise.all([
        supabase.from("products").select("*").eq("active", true).order("display_order"),
        supabase.from("paper_types").select("*").eq("active", true).order("display_order"),
        supabase.from("paper_sizes").select("*").eq("active", true).order("display_order"),
        supabase.from("print_types").select("*").eq("active", true).order("display_order"),
        supabase.from("finitions").select("*").eq("active", true).order("display_order"),
        supabase.from("pelliculages").select("*").eq("active", true).order("display_order"),
        supabase.from("product_paper_types").select("*"),
        supabase.from("product_print_types").select("*"),
        supabase.from("settings").select("*").eq("key", "design_percentage").maybeSingle(),
        supabase.from("settings").select("*").eq("key", "clients_list").maybeSingle(),
        loadUserPrices(userId, email),
      ]);

      const isCustom = hasCustomPrices(userPrices);
      setHasUserPricing(isCustom);

      setProducts(p.data || []);
      setPaperTypes(applyUserPricing(pt.data || [], "paper_types", userPrices));
      setPaperSizes(ps.data || []);
      setPrintTypes(applyUserPricing(prt.data || [], "print_types", userPrices));
      setFinitions(applyUserPricing(fi.data || [], "finitions", userPrices));
      setPelliculages(applyUserPricing(pe.data || [], "pelliculages", userPrices));
      setProductLinks({ paper: ppl.data || [], print: ppr.data || [] });
      if (st.data?.value) setDesignPct(Number(st.data.value));

      if (qt.data?.value) {
        try {
          const parsed = typeof qt.data.value === "string" ? JSON.parse(qt.data.value) : qt.data.value;
          if (Array.isArray(parsed)) {
            const unique = new Map<string, string>();
            parsed.forEach((c: any) => {
              if (c.name && !unique.has(c.name.toLowerCase())) {
                unique.set(c.name.toLowerCase(), { name: c.name, company: c.company || "" } as any);
              }
            });
            setRecentClients(Array.from(unique.values()) as any);
          }
        } catch (e) {
          console.error(e);
        }
      }
    })();
  }, [userId, email]);

  const product = products.find((p) => p.id === productId);
  const printType = printTypes.find((p) => p.id === printTypeId);
  const paperType = paperTypes.find((p) => p.id === paperTypeId);
  const paperSize = paperSizes.find((p) => p.id === paperSizeId);
  const coverPaperType = paperTypes.find((p) => p.id === coverPaperTypeId);

  const allowedPrintIds = useMemo(() => new Set(productLinks.print.filter((l) => l.product_id === productId).map((l) => l.print_type_id)), [productLinks, productId]);
  const allowedPaperIds = useMemo(() => new Set(productLinks.paper.filter((l) => l.product_id === productId).map((l) => l.paper_type_id)), [productLinks, productId]);

  const filteredPrintTypes = printTypes.filter((pt) => {
    if (!productId) return true;
    if (allowedPrintIds.size > 0 && !allowedPrintIds.has(pt.id)) return false;
    return true;
  });
  const filteredPaperTypes = paperTypes.filter((pt) => {
    if (!product) return true;
    if (allowedPaperIds.size > 0 && !allowedPaperIds.has(pt.id)) return false;
    return true;
  });

  // Reset paper choice when product changes
  useEffect(() => {
    setPaperTypeId("");
    setPrintTypeId("");
    if (product) {
      if (product.category === "ui_ux") {
        setQuantity(1);
        try {
          const desc = typeof product.description === 'string' && product.description.startsWith('{')
            ? JSON.parse(product.description)
            : null;
          if (desc?.hourly_rate) setUiUxHourlyRate(Number(desc.hourly_rate));
          if (desc?.estimated_hours) setUiUxHours(Number(desc.estimated_hours));
        } catch {}
      } else {
        setCustomW(product.default_size_w_mm || 85);
        setCustomH(product.default_size_h_mm || 55);
      }
    }
  }, [productId]);

  // Reset weight when paper changes
  useEffect(() => {
    if (paperType?.weights?.length) {
      const minW = product?.min_paper_weight || 0;
      const ok = paperType.weights.find((w: number) => w >= minW) || paperType.weights[0];
      setPaperWeight(ok);
    }
  }, [paperTypeId]);

  useEffect(() => {
    if (coverPaperType?.weights?.length) setCoverWeight(coverPaperType.weights[coverPaperType.weights.length - 1]);
  }, [coverPaperTypeId]);

  // Default print sheet
  useEffect(() => {
    if (!paperSizeId && paperSizes.length) {
      const sra3 = paperSizes.find((s) => s.name === "SRA3") || paperSizes[0];
      setPaperSizeId(sra3.id);
    }
  }, [paperSizes]);

  const isLargeFormat = product?.category === "large_format";
  const isUiUx = product?.category === "ui_ux";
  const finishedW = useCustomSize || isLargeFormat ? customW : (product?.default_size_w_mm || customW);
  const finishedH = useCustomSize || isLargeFormat ? customH : (product?.default_size_h_mm || customH);

  const computedUiUxHours = uiUxCalcMode === 'screens' ? Math.round(uiUxScreenCount * uiUxHoursPerScreen) : uiUxHours;
  const activeUiUxModules = useMemo(() => {
    return selectedUiUxModules.map(id => {
      const m = UI_UX_MODULES.find(x => x.id === id);
      return m ? { name: m.name, hours: m.hours } : null;
    }).filter(Boolean) as { name: string; hours: number }[];
  }, [selectedUiUxModules]);

  const canCalc = product && (
    isUiUx ? (computedUiUxHours > 0 || activeUiUxModules.length > 0) :
    isLargeFormat ? printType :
    (printType && paperType && paperSize)
  );

  const breakdown = useMemo(() => {
    if (!canCalc) return null;
    const input: CalcInput = {
      productCategory: product.category,
      isUiUx,
      hourlyRate: uiUxHourlyRate,
      hours: computedUiUxHours,
      screenCount: uiUxCalcMode === 'screens' ? uiUxScreenCount : undefined,
      uiUxServices: activeUiUxModules,
      hasPages: !!product.has_pages,
      hasCover: !!product.has_cover,
      finishedW: Number(finishedW),
      finishedH: Number(finishedH),
      bleed,
      quantity,
      sheetW: paperSize ? Number(paperSize.width_mm) : 1000,
      sheetH: paperSize ? Number(paperSize.height_mm) : 1000,
      paperPricePerSheet: paperType ? Number((paperType as any).weight_prices?.[paperWeight] ?? paperType.price_per_sheet_sra3) : 0,
      paperWeight,
      printSetupCost: printType ? Number(printType.setup_cost) : 0,
      printCostPerSheet: printType ? Number(printType.cost_per_sheet) : 0,
      rectoVerso,
      rvMultiplier: printType ? Number(printType.recto_verso_multiplier) : 1.7,
      innerPages,
      coverPaperPricePerSheet: coverPaperType ? Number((coverPaperType as any).weight_prices?.[coverWeight] ?? coverPaperType.price_per_sheet_sra3) : 0,
      finitions: selectedFinitions.map((id) => {
        const f = finitions.find((x) => x.id === id)!;
        return { price: Number(f.price), unit: f.price_unit as 'unit' | 'sqm', name: f.name };
      }),
      pelliculages: selectedPelliculages.map((id) => {
        const p = pelliculages.find((x) => x.id === id)!;
        return { pricePerSqm: Number(p.price_per_sqm), name: p.name };
      }),
      addDesign,
      designPercentage: designPct,
      isLargeFormat,
      largeFormatPricePerSqm: isLargeFormat && printType ? Number(printType.cost_per_sheet) : undefined,
      layoutPreference,
      discountType,
      discountValue,
    };
    return calculate(input);
  }, [canCalc, product, finishedW, finishedH, bleed, quantity, paperSize, paperType, paperWeight, printType, rectoVerso, innerPages, coverPaperType, coverWeight, selectedFinitions, selectedPelliculages, addDesign, designPct, isLargeFormat, finitions, pelliculages, layoutPreference, isUiUx, uiUxHourlyRate, computedUiUxHours, uiUxCalcMode, uiUxScreenCount, activeUiUxModules, discountType, discountValue]);

  const saveQuote = async () => {
    if (!breakdown || !product) return;
    if (!clientName.trim()) { toast.error("Nom du client requis"); return; }
    
    const payload = {
      client_name: clientName,
      client_company: clientCompany || null,
      product_name: product.name,
      quantity,
      total: breakdown.total,
      status: "pending",
      details: { 
        clientName, clientCompany, product, printType, paperType, paperSize,
        finishedW, finishedH, quantity, rectoVerso, innerPages, paperWeight, coverPaperType, coverWeight,
        selectedFinitionsData: selectedFinitions.map((id) => finitions.find((f) => f.id === id)),
        selectedPelliculagesData: selectedPelliculages.map((id) => pelliculages.find((p) => p.id === id)),
        isUiUx,
        uiUxHours: computedUiUxHours,
        uiUxHourlyRate,
        uiUxScreenCount: uiUxCalcMode === 'screens' ? uiUxScreenCount : undefined,
        selectedUiUxModules: activeUiUxModules,
        breakdown, addDesign,
        discountType,
        discountValue,
        notes: quoteNotes
      },
    };

    if (!navigator.onLine) {
      // Save offline
      try {
        const queue = JSON.parse(localStorage.getItem("offline_quotes_queue") || "[]");
        queue.push({ ...payload, _id: Date.now() });
        localStorage.setItem("offline_quotes_queue", JSON.stringify(queue));
        localStorage.removeItem(DRAFT_KEY);
        showSuccess("Mode Hors Ligne", "Devis sauvegardé localement. Il sera synchronisé à la reconnexion.");
      } catch (e) {
        toast.error("Erreur de sauvegarde hors ligne");
      }
      return;
    }

    const { error } = await saveQuoteWithUser(payload, userId, email);
    if (error) toast.error("Erreur: " + error.message);
    else { 
      localStorage.removeItem(DRAFT_KEY); 
      showSuccess("Success", "Devis enregistré"); 
      await logAction(email, role, "Création Devis", `Client: ${clientName} - Total: ${formatDZD(breakdown.total)}`);
    }
  };

  const printDevis = () => {
    if (!breakdown) return;
    sessionStorage.setItem("currentQuote", JSON.stringify({
      clientName, clientCompany, product, printType, paperType, paperSize,
      finishedW, finishedH, quantity, rectoVerso, innerPages, paperWeight, coverPaperType, coverWeight,
      selectedFinitionsData: selectedFinitions.map((id) => finitions.find((f) => f.id === id)),
      selectedPelliculagesData: selectedPelliculages.map((id) => pelliculages.find((p) => p.id === id)),
      isUiUx,
      uiUxHours: computedUiUxHours,
      uiUxHourlyRate,
      uiUxScreenCount: uiUxCalcMode === 'screens' ? uiUxScreenCount : undefined,
      selectedUiUxModules: activeUiUxModules,
      breakdown, addDesign,
      discountType,
      discountValue,
      notes: quoteNotes
    }));
    window.open("/devis", "_blank");
  };
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-fade-in relative pb-10">
      {/* Luxurious Abstract Background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute top-40 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] glass-card border border-white/50 dark:border-white/10 p-8 sm:p-12 shadow-lg">
        <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full gradient-brand opacity-20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6 z-10">
          <div className="w-20 h-20 rounded-[1.5rem] gradient-brand flex items-center justify-center shadow-brand transform rotate-3 transition-transform hover:rotate-6 duration-500">
            <Calculator className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary to-secondary drop-shadow-sm pb-2">
              {t("calc.title")}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-2xl mt-1">{t("calc.subtitle")}</p>
            {hasUserPricing && (
              <Badge variant="secondary" className="mt-2 text-xs bg-primary/10 text-primary border border-primary/20 gap-1.5 py-1 px-3">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Tarifs personnalisés actifs pour votre compte
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Templates Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-white/40 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Bookmark className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modèles de Devis :</span>
          {templates.length === 0 ? (
            <span className="text-xs text-muted-foreground/80 italic">Aucun modèle enregistré pour l'instant</span>
          ) : (
            <div className="flex flex-wrap gap-1.5 items-center">
              {templates.map(tpl => (
                <div key={tpl.id} className="flex items-center gap-1.5 bg-muted/70 hover:bg-muted text-foreground text-xs px-2.5 py-1 rounded-full border border-border/50 transition-colors">
                  <button onClick={() => handleApplyTemplate(tpl)} className="font-semibold hover:text-primary">
                    {tpl.name}
                  </button>
                  <button onClick={(e) => handleDeleteTemplate(tpl.id, e)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSaveTemplateOpen(true)}
          className="gap-1.5 text-xs rounded-full h-8"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
          Enregistrer cette config en modèle
        </Button>
      </div>

      <div className="grid xl:grid-cols-[1fr,450px] gap-8">
        {/* Left: form */}
        <div className="space-y-8">
          {/* Client */}
          <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-[1.5rem] overflow-visible">
            <CardHeader className="pb-3"><CardTitle className="text-base">{t("calc.client")}</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5 relative">
                <Label>{t("calc.clientName")} *</Label>
                <Input 
                  value={clientName} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientName(val);
                    if (!val.trim()) {
                      setClientCompany("");
                    } else {
                      const found = recentClients.find(c => c.name.toLowerCase() === val.toLowerCase());
                      if (found && found.company) setClientCompany(found.company);
                    }
                  }} 
                  onFocus={() => setShowClientSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                  placeholder="Ahmed Benali" 
                />
                
                {showClientSuggestions && recentClients.filter(c => c.name.toLowerCase().includes(clientName.toLowerCase())).length > 0 && (
                  <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 p-1">
                    {recentClients
                      .filter(c => c.name.toLowerCase().includes(clientName.toLowerCase()))
                      .map((c, i) => (
                        <div 
                          key={i} 
                          className="px-3 py-2 cursor-pointer hover:bg-muted dark:hover:bg-muted/50 rounded-lg flex flex-col transition-colors"
                          onClick={() => {
                            setClientName(c.name);
                            setClientCompany(c.company || "");
                            setShowClientSuggestions(false);
                          }}
                        >
                          <span className="font-medium text-sm">{c.name}</span>
                          {c.company && <span className="text-xs text-muted-foreground">{c.company}</span>}
                        </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5 relative">
                <Label>{t("calc.clientCompany")}</Label>
                <Input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="SARL ..." />
              </div>
            </CardContent>
          </Card>

          {/* UI/UX Card OR Print Card */}
          {isUiUx ? (
            <Card className="glass-card border-violet-500/30 dark:border-violet-500/20 shadow-lg rounded-[1.5rem] overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Conception UI/UX & Design Digital</CardTitle>
                      <p className="text-xs text-muted-foreground">Facturation horaire • Maquettes Figma • Prototypes & Design System</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-sm text-xs">
                    🎨 Facturation aux Heures
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                {/* Product & Quantity */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t("calc.product")} *</Label>
                    <Select value={productId} onValueChange={setProductId}>
                      <SelectTrigger><SelectValue placeholder={t("calc.chooseProduct")} /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{localName(p)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nombre de projets / plateformes</Label>
                    <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, +e.target.value || 1))} />
                  </div>
                </div>

                {/* Hourly Rate */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-muted/30 border">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" /> Taux horaire (DA / heure)
                    </Label>
                    <span className="text-xs font-mono font-bold text-primary">{formatDZD(uiUxHourlyRate)} / h</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-3 items-center">
                    <Input
                      type="number"
                      min={100}
                      step={100}
                      value={uiUxHourlyRate}
                      onChange={(e) => setUiUxHourlyRate(Math.max(0, +e.target.value || 0))}
                      className="text-base font-semibold"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[2000, 2500, 3000, 3500, 4000].map((rate) => (
                        <Button
                          key={rate}
                          type="button"
                          variant={uiUxHourlyRate === rate ? "default" : "outline"}
                          size="sm"
                          className={`h-8 px-2.5 text-xs ${uiUxHourlyRate === rate ? "gradient-brand text-white border-0" : ""}`}
                          onClick={() => setUiUxHourlyRate(rate)}
                        >
                          {rate} DA
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Estimation Method */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Mode d'estimation du temps</Label>
                    <Tabs value={uiUxCalcMode} onValueChange={(v: any) => setUiUxCalcMode(v)} className="w-auto">
                      <TabsList className="h-8">
                        <TabsTrigger value="hours" className="text-xs h-6 px-3">Heures directes</TabsTrigger>
                        <TabsTrigger value="screens" className="text-xs h-6 px-3">Par nombre d'écrans</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {uiUxCalcMode === 'hours' ? (
                    <div className="p-4 rounded-2xl bg-muted/30 border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Volume d'heures estimées</span>
                        <span className="text-sm font-bold text-primary">{uiUxHours} heures</span>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={uiUxHours}
                        onChange={(e) => setUiUxHours(Math.max(1, +e.target.value || 1))}
                        className="text-base font-semibold"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[10, 20, 30, 40, 60, 80].map((h) => (
                          <Button
                            key={h}
                            type="button"
                            variant={uiUxHours === h ? "default" : "outline"}
                            size="sm"
                            className={`h-7 px-2.5 text-xs ${uiUxHours === h ? "gradient-brand text-white border-0" : ""}`}
                            onClick={() => setUiUxHours(h)}
                          >
                            {h}h
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-muted/30 border space-y-3">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nombre d'écrans / maquettes</Label>
                          <Input
                            type="number"
                            min={1}
                            value={uiUxScreenCount}
                            onChange={(e) => setUiUxScreenCount(Math.max(1, +e.target.value || 1))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Temps moyen par écran (heures)</Label>
                          <Input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={uiUxHoursPerScreen}
                            onChange={(e) => setUiUxHoursPerScreen(Math.max(0.5, +e.target.value || 1))}
                          />
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs flex items-center justify-between">
                        <span className="text-muted-foreground">Calcul automatique :</span>
                        <span className="font-semibold text-primary">
                          {uiUxScreenCount} écrans × {uiUxHoursPerScreen}h = {Math.round(uiUxScreenCount * uiUxHoursPerScreen)} heures
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modules & Deliverables */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary" /> Modules & Livrables additionnels
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {selectedUiUxModules.length} module(s) sélectionné(s)
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {UI_UX_MODULES.map((mod) => {
                      const isSelected = selectedUiUxModules.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedUiUxModules(selectedUiUxModules.filter((id) => id !== mod.id));
                            } else {
                              setSelectedUiUxModules([...selectedUiUxModules, mod.id]);
                            }
                          }}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 text-left flex items-start gap-3 ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border/60 hover:border-primary/40 bg-card hover:bg-muted/30"
                          }`}
                        >
                          <div className="text-xl mt-0.5">{mod.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-xs truncate">{mod.name}</span>
                              <Badge variant={isSelected ? "default" : "secondary"} className={`text-[10px] h-5 ${isSelected ? "gradient-brand text-white border-0" : ""}`}>
                                +{mod.hours}h
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{mod.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Product */}
              <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-[1.5rem] overflow-hidden">
                <CardHeader className="pb-3"><CardTitle className="text-base">{t("calc.product")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("calc.product")} *</Label>
                      <Select value={productId} onValueChange={setProductId}>
                        <SelectTrigger><SelectValue placeholder={t("calc.chooseProduct")} /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => <SelectItem key={p.id} value={p.id}>{localName(p)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("calc.printType")} *</Label>
                      <Select value={printTypeId} onValueChange={setPrintTypeId} disabled={!productId}>
                        <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                        <SelectContent>
                          {filteredPrintTypes.map((p) => <SelectItem key={p.id} value={p.id}>{localName(p)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("common.quantity")}</Label>
                      <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, +e.target.value || 1))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("calc.bleed")}</Label>
                      <Input type="number" min={0} value={bleed} onChange={(e) => setBleed(+e.target.value || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{useCustomSize ? t("calc.customSize") : t("calc.size")}</Label>
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/30">
                        <Switch checked={useCustomSize} onCheckedChange={setUseCustomSize} id="custom" />
                        <Label htmlFor="custom" className="text-xs cursor-pointer">{t("calc.customSize")}</Label>
                      </div>
                    </div>
                  </div>

                  {(useCustomSize || isLargeFormat) && (
                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border-dashed border-2">
                      <div className="space-y-1.5">
                        <Label>{t("calc.widthMm")}</Label>
                        <Input type="number" value={customW} onChange={(e) => setCustomW(+e.target.value || 0)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("calc.heightMm")}</Label>
                        <Input type="number" value={customH} onChange={(e) => setCustomH(+e.target.value || 0)} />
                      </div>
                    </div>
                  )}

                  {/* Fond perdu (Bleed) */}
                  {!isLargeFormat && (
                    <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{t("calc.bleed")}</div>
                          <div className="text-xs text-muted-foreground">
                            {finishedW > 0 && finishedH > 0
                              ? `${finishedW}×${finishedH}mm → ${finishedW + bleed * 2}×${finishedH + bleed * 2}mm`
                              : t("calc.bleed")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={bleed}
                            onChange={(e) => setBleed(+e.target.value || 0)}
                            className="w-20 h-8 text-center text-sm font-semibold"
                          />
                          <span className="text-xs text-muted-foreground font-medium">mm</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isLargeFormat && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                      <div>
                        <div className="font-medium text-sm">{t("calc.rectoVerso")}</div>
                        <div className="text-xs text-muted-foreground">{rectoVerso ? `×${printType?.recto_verso_multiplier || 1.7}` : t("calc.recto")}</div>
                      </div>
                      <Switch checked={rectoVerso} onCheckedChange={setRectoVerso} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Paper */}
              {!isLargeFormat && (
                <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-[1.5rem] overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {product?.has_cover ? "Papiers du catalogue" : t("calc.paperType")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Format feuille offset (toujours visible) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>{t("calc.offsetSheet")}</Label>
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setNewSizeOpen(true)}>
                          <Plus className="w-3 h-3" /> Ajouter
                        </Button>
                      </div>
                      <Select value={paperSizeId} onValueChange={setPaperSizeId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {paperSizes.map((s) => <SelectItem key={s.id} value={s.id}>{localName(s)} ({s.width_mm}×{s.height_mm})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {product?.has_cover ? (
                      <>
                        {/* 1) Couverture */}
                        <div className="rounded-xl gradient-brand-soft border p-4 space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-5 rounded-full gradient-brand" />
                            <h4 className="text-sm font-semibold">Couverture extérieure</h4>
                          </div>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label>{t("calc.coverPaper")}</Label>
                              <Select value={coverPaperTypeId} onValueChange={setCoverPaperTypeId}>
                                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                <SelectContent>{paperTypes.map((p) => <SelectItem key={p.id} value={p.id}>{localName(p)}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>{t("calc.coverWeight")}</Label>
                              <Select value={String(coverWeight)} onValueChange={(v) => setCoverWeight(+v)} disabled={!coverPaperType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {coverPaperType?.weights?.map((w: number) => <SelectItem key={w} value={String(w)}>{w} g/m²</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Nombre de pages intérieures</Label>
                              <Input type="number" min={4} step={4} value={innerPages} onChange={(e) => setInnerPages(+e.target.value || 4)} />
                            </div>
                          </div>
                        </div>

                        {/* 2) Pages intérieures (séparées, défilables) */}
                        <div className="rounded-xl border-2 border-dashed p-4 space-y-4 max-h-[320px] overflow-y-auto">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-5 rounded-full bg-primary/60" />
                            <h4 className="text-sm font-semibold">Pages intérieures</h4>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label>Papier des pages intérieures</Label>
                              <Select value={paperTypeId} onValueChange={setPaperTypeId} disabled={!productId}>
                                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                <SelectContent>{filteredPaperTypes.map((p) => <SelectItem key={p.id} value={p.id}>{localName(p)}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Grammage intérieur</Label>
                              <Select value={String(paperWeight)} onValueChange={(v) => setPaperWeight(+v)} disabled={!paperType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(paperType?.weights || []).filter((w: number) => !product?.min_paper_weight || w >= product.min_paper_weight).map((w: number) => (
                                    <SelectItem key={w} value={String(w)}>{w} g/m²</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>{t("calc.paperType")}</Label>
                          <Select value={paperTypeId} onValueChange={setPaperTypeId} disabled={!productId}>
                            <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                            <SelectContent>{filteredPaperTypes.map((p) => <SelectItem key={p.id} value={p.id}>{localName(p)}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t("calc.paperWeight")}</Label>
                          <Select value={String(paperWeight)} onValueChange={(v) => setPaperWeight(+v)} disabled={!paperType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(paperType?.weights || []).filter((w: number) => !product?.min_paper_weight || w >= product.min_paper_weight).map((w: number) => (
                                <SelectItem key={w} value={String(w)}>{w} g/m²</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Finitions & Pelliculages */}
              <CalculatorFinitions
                finitions={finitions}
                pelliculages={pelliculages}
                selectedFinitions={selectedFinitions}
                setSelectedFinitions={setSelectedFinitions}
                selectedPelliculages={selectedPelliculages}
                setSelectedPelliculages={setSelectedPelliculages}
                addDesign={addDesign}
                setAddDesign={setAddDesign}
              />
            </>
          )}

          {/* Remise Commerciale & Notes Card */}
          <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-[1.5rem] overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Remise Commerciale & Notes
                </span>
                {discountValue > 0 && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-semibold text-xs">
                    Remise: {discountType === 'percent' ? `${discountValue}%` : formatDZD(discountValue)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                    Type de remise
                  </Label>
                  <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant fixe (DA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valeur {discountType === 'percent' ? '(%)' : '(DA)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={discountType === 'percent' ? 100 : undefined}
                    placeholder="0"
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Math.max(0, +e.target.value || 0))}
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <Label className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                  Remarques & Notes (délai de livraison, acompte, BAT...)
                </Label>
                <Textarea
                  placeholder="Ex: Bon à tirer à valider avant production. Acompte 40%..."
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: result */}
        <CalculatorResult
          breakdown={breakdown}
          quantity={quantity}
          addDesign={addDesign}
          designPct={designPct}
          isLargeFormat={isLargeFormat}
          bleed={bleed}
          layoutPreference={layoutPreference}
          setLayoutPreference={setLayoutPreference}
          onSaveQuote={saveQuote}
          onPrintDevis={printDevis}
        />
      </div>

      <Dialog open={newSizeOpen} onOpenChange={setNewSizeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Ajouter un format de feuille offset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input placeholder="ex: SRA2, 50×70…" value={newSize.name} onChange={(e) => setNewSize({ ...newSize, name: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Largeur (mm)</Label>
                <Input type="number" value={newSize.width_mm} onChange={(e) => setNewSize({ ...newSize, width_mm: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Hauteur (mm)</Label>
                <Input type="number" value={newSize.height_mm} onChange={(e) => setNewSize({ ...newSize, height_mm: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewSizeOpen(false)}>Annuler</Button>
            <Button onClick={createPaperSize} className="gradient-brand text-white border-0">Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5 text-primary" />
              Enregistrer comme modèle de devis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Enregistrez cette configuration (produit, papier, finitions, options) pour la recharger en 1 clic lors de futurs devis.
            </p>
            <div className="space-y-1.5">
              <Label>Nom du modèle *</Label>
              <Input
                placeholder="Ex: Flyer A5 170g R/V - 1000 ex"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveTemplateOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveTemplate} className="gradient-brand text-white border-0">Enregistrer le modèle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

