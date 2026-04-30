import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { calculate, CalcInput } from "@/lib/calc";
import { CalculatorResult } from "@/components/calculator/CalculatorResult";
import { CalculatorFinitions } from "@/components/calculator/CalculatorFinitions";
import { Calculator, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { showSuccess } from "@/lib/alerts";
import { localName } from "@/lib/localName";

const DRAFT_KEY = "oprisma_calc_draft";

type Product = any;
type PaperType = any;
type PaperSize = any;
type PrintType = any;
type Finition = any;
type Pelliculage = any;

export default function CalculatorPage() {
  const { t } = useTranslation();

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
  const [layoutPreference, setLayoutPreference] = useState<'horizontal' | 'vertical' | 'optimal'>('optimal');
  const draftLoaded = useRef(false);

  // Auto-save draft to localStorage
  const saveDraft = useCallback(() => {
    const draft = {
      clientName, clientCompany, productId, printTypeId, paperTypeId,
      paperWeight, paperSizeId, coverPaperTypeId, coverWeight, quantity,
      bleed, rectoVerso, innerPages, useCustomSize, customW, customH,
      selectedFinitions, selectedPelliculages, addDesign, layoutPreference,
      savedAt: Date.now(),
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [clientName, clientCompany, productId, printTypeId, paperTypeId, paperWeight, paperSizeId, coverPaperTypeId, coverWeight, quantity, bleed, rectoVerso, innerPages, useCustomSize, customW, customH, selectedFinitions, selectedPelliculages, addDesign, layoutPreference]);

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
      const [p, pt, ps, prt, fi, pe, ppl, ppr, st, qt] = await Promise.all([
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
      ]);
      setProducts(p.data || []);
      setPaperTypes(pt.data || []);
      setPaperSizes(ps.data || []);
      setPrintTypes(prt.data || []);
      setFinitions(fi.data || []);
      setPelliculages(pe.data || []);
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
  }, []);

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
      setCustomW(product.default_size_w_mm || 85);
      setCustomH(product.default_size_h_mm || 55);
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
  const finishedW = useCustomSize || isLargeFormat ? customW : (product?.default_size_w_mm || customW);
  const finishedH = useCustomSize || isLargeFormat ? customH : (product?.default_size_h_mm || customH);

  const canCalc = product && (isLargeFormat ? printType : (printType && paperType && paperSize));

  const breakdown = useMemo(() => {
    if (!canCalc) return null;
    const input: CalcInput = {
      productCategory: product.category,
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
    };
    return calculate(input);
  }, [canCalc, product, finishedW, finishedH, bleed, quantity, paperSize, paperType, paperWeight, printType, rectoVerso, innerPages, coverPaperType, coverWeight, selectedFinitions, selectedPelliculages, addDesign, designPct, isLargeFormat, finitions, pelliculages, layoutPreference]);

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
        finishedW, finishedH, quantity, rectoVerso, innerPages, paperWeight,
        selectedFinitionsData: selectedFinitions.map((id) => finitions.find((f) => f.id === id)),
        selectedPelliculagesData: selectedPelliculages.map((id) => pelliculages.find((p) => p.id === id)),
        breakdown, addDesign
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

    const { error } = await supabase.from("quotes").insert(payload as any);
    if (error) toast.error("Erreur: " + error.message);
    else { localStorage.removeItem(DRAFT_KEY); showSuccess("Success", "Devis enregistré"); }
  };

  const printDevis = () => {
    if (!breakdown) return;
    sessionStorage.setItem("currentQuote", JSON.stringify({
      clientName, clientCompany, product, printType, paperType, paperSize,
      finishedW, finishedH, quantity, rectoVerso, innerPages, paperWeight,
      selectedFinitionsData: selectedFinitions.map((id) => finitions.find((f) => f.id === id)),
      selectedPelliculagesData: selectedPelliculages.map((id) => pelliculages.find((p) => p.id === id)),
      breakdown, addDesign
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
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr,450px] gap-8">
        {/* Left: form */}
        <div className="space-y-8">
          {/* Client */}
          <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-[1.5rem] overflow-hidden">
            <CardHeader className="pb-3"><CardTitle className="text-base">{t("calc.client")}</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("calc.clientName")} *</Label>
                <Input list="client-names" value={clientName} onChange={(e) => {
                  const val = e.target.value;
                  setClientName(val);
                  const found = recentClients.find(c => c.name.toLowerCase() === val.toLowerCase());
                  if (found && found.company && clientCompany !== found.company) setClientCompany(found.company);
                }} placeholder="Ahmed Benali" />
                <datalist id="client-names">
                  {recentClients.map((c, i) => <option key={i} value={c.name} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>{t("calc.clientCompany")}</Label>
                <Input list="client-companies" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="SARL ..." />
                <datalist id="client-companies">
                  {Array.from(new Set(recentClients.map(c => c.company).filter(Boolean))).map((comp, i) => <option key={i} value={comp} />)}
                </datalist>
              </div>
            </CardContent>
          </Card>

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
    </div>
  );
}

