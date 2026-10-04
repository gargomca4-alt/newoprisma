import { useEffect, useRef, useState } from "react";
import { formatDZD } from "@/lib/calc";
import logo from "@/assets/oprisma-logo.png";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export default function DevisPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState({ terms: "", watermark: "", company: "Impuls Design" });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      // Load settings
      const { data: sData } = await supabase.from("settings").select("*");
      let terms = "Le présent devis est valable 30 jours.";
      let watermark = "";
      let company = "Impuls Design";
      sData?.forEach(s => {
        if (s.key === "terms_conditions") terms = String(s.value).replace(/"/g, "");
        if (s.key === "watermark_text") {
          const w = String(s.value).replace(/"/g, "");
          watermark = w.toLowerCase().includes("oprisma") ? "" : w;
        }
        if (s.key === "company_name") {
          const c = String(s.value).replace(/"/g, "");
          company = c.toLowerCase().includes("oprisma") ? "Impuls Design" : c;
        }
      });
      setSettings({ terms, watermark: "", company: company || "Impuls Design" });

      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      // 1) If ?id= → load from DB
      if (id) {
        const { data: row } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
        if (row?.details) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const loaded = { ...(row.details as any) };
          if (!loaded.quantity) {
            loaded.quantity = row.quantity || 1;
            loaded.clientName = loaded.clientName || row.client_name;
            loaded.clientCompany = loaded.clientCompany || row.client_company;
          }
          setData(loaded);
          setLoading(false);
          return;
        }
      }
      // 2) Otherwise from sessionStorage (came from calculator)
      const raw = sessionStorage.getItem("currentQuote");
      if (raw) {
        setData(JSON.parse(raw));
        setLoading(false);
        return;
      }
      // 3) Fallback: load latest saved quote
      const { data: latest } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest?.details) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loaded = { ...(latest.details as any) };
        if (!loaded.quantity) {
          loaded.quantity = latest.quantity || 1;
          loaded.clientName = loaded.clientName || latest.client_name;
          loaded.clientCompany = loaded.clientCompany || latest.client_company;
        }
        setData(loaded);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-lg font-semibold">Aucun devis à afficher</div>
        <p className="text-sm text-muted-foreground max-w-md">
          Créez un devis depuis la calculatrice, ou ouvrez un devis enregistré depuis la liste.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/quotes"><ArrowLeft className="w-4 h-4 mr-1.5" />Mes devis</Link></Button>
          <Button asChild className="gradient-brand text-white border-0"><Link to="/">Nouveau devis</Link></Button>
        </div>
      </div>
    );
  }

  const { clientName, clientCompany, product, printType, paperType, paperSize, finishedW = 0, finishedH = 0, quantity = 1, rectoVerso, paperWeight, coverPaperType, coverWeight, selectedFinitionsData, selectedPelliculagesData, breakdown, addDesign, innerPages } = data;

  // Guard: if critical data is missing, show fallback
  if (!breakdown || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-lg font-semibold">Données du devis incomplètes</div>
        <p className="text-sm text-muted-foreground max-w-md">
          Ce devis contient des données manquantes. Veuillez le recréer depuis la calculatrice.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/quotes"><ArrowLeft className="w-4 h-4 mr-1.5" />Mes devis</Link></Button>
          <Button asChild className="gradient-brand text-white border-0"><Link to="/">Nouveau devis</Link></Button>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('fr-DZ');
  const params = new URLSearchParams(window.location.search);
  const isInvoice = params.get("type") === "facture" || Boolean(data?.invoiceNumber);
  const docTitle = isInvoice ? "FACTURE" : "DEVIS";
  const ref = data?.invoiceNumber || (isInvoice ? "FAC-" + Date.now().toString().slice(-6) : (data?.quoteNumber || "OPR-" + Date.now().toString().slice(-6)));

  const exportPDF = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      const el = sheetRef.current;
      // Temporarily force A4-width rendering for accurate capture
      const origMinWidth = el.style.minWidth;
      const origMaxWidth = el.style.maxWidth;
      const origWidth = el.style.width;
      const origPadding = el.style.padding;
      el.style.minWidth = "0";
      el.style.maxWidth = "794px";   // A4 @ 96dpi minus margins
      el.style.width = "794px";
      el.style.padding = "32px";

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: 830,
      });

      // Restore original styles
      el.style.minWidth = origMinWidth;
      el.style.maxWidth = origMaxWidth;
      el.style.width = origWidth;
      el.style.padding = origPadding;

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5; // 5mm margins
      const contentWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;
      pdf.addImage(imgData, "JPEG", margin, position, contentWidth, imgHeight, undefined, "FAST");
      heightLeft -= (pageHeight - margin * 2);
      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, contentWidth, imgHeight, undefined, "FAST");
        heightLeft -= (pageHeight - margin * 2);
      }
      const safeName = (clientName || "client").replace(/[^a-z0-9]/gi, "_");
      pdf.save(`${docTitle}_${ref}_${safeName}.pdf`);
      toast.success("PDF téléchargé");
    } catch (e: unknown) {
      toast.error("Erreur PDF: " + ((e as Error)?.message || ""));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-3 sm:p-8 print:p-0 font-sans">
      <div className="no-print mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2 max-w-4xl mx-auto">
        <Button asChild variant="ghost" size="sm">
          <Link to="/quotes" className="gap-1.5 text-xs text-gray-700 hover:text-black">
            <ArrowLeft className="w-4 h-4" /> Retour aux devis
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1.5" />Imprimer</Button>
          <Button
            variant="outline"
            size="sm"
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
            onClick={() => {
              const lines = [
                `📋 *${docTitle} Impuls Design*`,
                `👤 Client: ${clientName || "—"}${clientCompany ? ` (${clientCompany})` : ""}`,
                `📦 Produit: ${product?.name || "—"}`,
                `📊 Quantité: ${quantity}`,
                `💰 *Total: ${formatDZD(breakdown?.total || 0)}*`,
                `📅 Date: ${today}`,
                ``,
                `_Impuls Design — Designer Graphique · Print · Marketing_`,
              ];
              window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
            }}
          >
            <MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp
          </Button>
          <Button size="sm" onClick={exportPDF} disabled={exporting} className="bg-accent hover:bg-accent/90 text-accent-foreground font-extrabold border-0 shadow-glow">
            {exporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
            {exporting ? "Génération..." : "Télécharger PDF"}
          </Button>
        </div>
      </div>
      <div className="sm:hidden text-center text-[11px] text-gray-500 pb-2 no-print font-medium">
        ↔ Glissez avec le doigt pour voir toute la largeur
      </div>
      <div className="overflow-x-auto pb-8 print-sheet-wrapper">
        <div ref={sheetRef} className="print-sheet relative w-full min-w-[800px] max-w-4xl mx-auto bg-white p-6 sm:p-12 print:p-0 shadow-md print:shadow-none rounded-2xl print:rounded-none border border-gray-200 print:border-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-4 pb-6 print:pb-4 relative z-10" style={{ borderColor: "hsl(262 56% 25%)" }}>
          <div className="flex items-center gap-4">
            <img src={logo} alt="Impuls Design" className="h-20 w-auto" />
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "hsl(262 56% 25%)" }}>
                {settings.company && !settings.company.toLowerCase().includes("oprisma") ? settings.company : "Impuls Design"}
              </h1>
              <p className="text-xs text-gray-800 font-bold uppercase tracking-wider mt-0.5">DESIGNER GRAPHIQUE · PRINT · MARKETING DIGITAL</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tracking-tight" style={{ color: "hsl(262 56% 25%)" }}>{docTitle}</div>
            <div className="text-xs text-gray-800 mt-1 font-bold">N° {ref}</div>
            <div className="text-xs text-gray-800 font-semibold">Date: {today}</div>
          </div>
        </div>

        {/* Client */}
        <div className="grid grid-cols-2 gap-6 mt-8 print:mt-4 relative z-10">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-700 mb-1 font-bold">Client</div>
            <div className="font-extrabold text-lg text-gray-900">{clientName}</div>
            {clientCompany && <div className="text-sm font-medium text-gray-700">{clientCompany}</div>}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-700 mb-1 font-bold">Validité</div>
            <div className="text-sm font-semibold text-gray-800">15 jours à compter du {today}</div>
          </div>
        </div>

        {/* Détail */}
        <table className="w-full mt-8 print:mt-4 border-collapse relative z-10">
          <thead>
            <tr className="text-white text-sm bg-[#42287B]">
              <th className="text-left p-3 font-bold">Désignation</th>
              <th className="text-center p-3 font-bold w-24">Quantité</th>
              <th className="text-right p-3 font-bold w-32">P. Unitaire</th>
              <th className="text-right p-3 font-bold w-32">Total</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {(() => {
              if (data.isUiUx || product?.category === "ui_ux" || breakdown?.isUiUx) {
                const hours = breakdown.uiUxHours || data.uiUxHours || 20;
                const hourlyRate = breakdown.uiUxHourlyRate || data.uiUxHourlyRate || 2500;
                const unitPrice = breakdown.total / (quantity || 1);
                return (
                  <>
                    <tr className="border-b bg-gray-50">
                      <td className="p-3">
                        <div className="font-semibold text-base">{product.name}</div>
                        <div className="text-xs text-gray-800 mt-1 space-y-0.5">
                          <p className="font-medium text-primary">Prestation de Conception UI/UX & Design Digital</p>
                          <p>
                            Volume de travail : <span className="font-semibold">{hours} heures</span>
                            {" · "}Taux horaire : <span className="font-semibold">{formatDZD(hourlyRate)} / heure</span>
                          </p>
                          {data.uiUxScreenCount && (
                            <p>Nombre d'écrans / maquettes : {data.uiUxScreenCount} écrans</p>
                          )}
                        </div>
                      </td>
                      <td className="text-center p-3 tabular-nums">{quantity}</td>
                      <td className="text-right p-3 tabular-nums">{formatDZD(unitPrice)}</td>
                      <td className="text-right p-3 tabular-nums font-semibold">{formatDZD(breakdown.total)}</td>
                    </tr>
                    {data.selectedUiUxModules && data.selectedUiUxModules.length > 0 && (
                      <tr className="border-b">
                        <td colSpan={4} className="p-3 pl-6 text-gray-700 text-xs bg-muted/10">
                          <div className="font-semibold text-gray-900 mb-1">Livrables & Modules inclus :</div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {data.selectedUiUxModules.map((m: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="text-emerald-600 font-bold">✓</span>
                                <span>{m.name} {m.hours ? `(+${m.hours}h)` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              }

              const areaSqm = (finishedW * finishedH) / 1_000_000;
              const productTotal = breakdown.subtotal - breakdown.finitionCost - breakdown.pelliculageCost;
              const productUnit = productTotal / quantity;
              const paperTotal = (breakdown.paperCost || 0) + (breakdown.coverPaperCost || 0);
              const paperUnit = paperTotal / quantity;
              const printUnit = (breakdown.printCost || 0) / quantity;
              return (
                <>
                  <tr className="border-b bg-gray-50">
                    <td className="p-3">
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-xs text-gray-800 mt-1">
                        Format: {(finishedW / 10).toFixed(1)} × {(finishedH / 10).toFixed(1)} cm ({finishedW} × {finishedH} mm)
                        {paperSize && <> · Feuille: {paperSize.name}</>}
                        {product.has_pages && <><br />Pages intérieures: {innerPages}</>}
                      </div>
                    </td>
                    <td className="text-center p-3 tabular-nums">{quantity}</td>
                    <td className="text-right p-3 tabular-nums">{formatDZD(productUnit)}</td>
                    <td className="text-right p-3 tabular-nums font-semibold">{formatDZD(productTotal)}</td>
                  </tr>
                  {coverPaperType && (
                    <tr className="border-b">
                      <td className="p-3 pl-6 text-gray-700">↳ Papier Couverture: {coverPaperType.name} {coverWeight} g/m²</td>
                      <td className="text-center p-3 tabular-nums text-gray-700">{quantity}</td>
                      <td className="text-right p-3 tabular-nums text-gray-700">{formatDZD((breakdown.coverPaperCost || 0) / quantity)}</td>
                      <td className="text-right p-3 tabular-nums text-gray-700">{formatDZD(breakdown.coverPaperCost || 0)}</td>
                    </tr>
                  )}
                  {paperType && (
                    <tr className="border-b">
                      <td className="p-3 pl-6 text-gray-700">↳ Papier {product?.has_cover ? "Intérieur" : ""}: {paperType.name} {paperWeight} g/m²</td>
                      <td className="text-center p-3 tabular-nums text-gray-700">{quantity}</td>
                      <td className="text-right p-3 tabular-nums text-gray-700">{formatDZD((breakdown.paperCost || 0) / quantity)}</td>
                      <td className="text-right p-3 tabular-nums text-gray-700">{formatDZD(breakdown.paperCost || 0)}</td>
                    </tr>
                  )}
                  {printType && (
                    <tr className="border-b">
                      <td className="p-3 pl-6 text-gray-700">↳ Impression: {printType.name}{rectoVerso ? " (Recto-Verso)" : " (Recto)"}</td>
                      <td className="text-center p-3 tabular-nums text-gray-700">{quantity}</td>
                      <td className="text-right p-3 tabular-nums text-gray-700">{formatDZD(printUnit)}</td>
                      <td className="text-right p-3 tabular-nums text-gray-700">{formatDZD(breakdown.printCost || 0)}</td>
                    </tr>
                  )}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {selectedFinitionsData?.filter(Boolean).map((f: any) => {
                    const lineTotal = f.price_unit === "sqm" ? f.price * areaSqm * quantity : f.price * quantity;
                    const unit = lineTotal / quantity;
                    return (
                      <tr key={f.id} className="border-b">
                        <td className="p-3">
                          Finition: {f.name}
                          <span className="text-xs text-gray-700 ml-1 font-medium">({f.price_unit === "sqm" ? `${f.price} DA/m²` : `${f.price} DA/u`})</span>
                        </td>
                        <td className="text-center p-3 tabular-nums">{quantity}</td>
                        <td className="text-right p-3 tabular-nums">{formatDZD(unit)}</td>
                        <td className="text-right p-3 tabular-nums">{formatDZD(lineTotal)}</td>
                      </tr>
                    );
                  })}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {selectedPelliculagesData?.filter(Boolean).map((p: any) => {
                    const lineTotal = p.price_per_sqm * areaSqm * quantity;
                    const unit = lineTotal / quantity;
                    return (
                      <tr key={p.id} className="border-b">
                        <td className="p-3">
                          Pelliculage: {p.name}
                          <span className="text-xs text-gray-700 ml-1 font-medium">({p.price_per_sqm} DA/m²)</span>
                        </td>
                        <td className="text-center p-3 tabular-nums">{quantity}</td>
                        <td className="text-right p-3 tabular-nums">{formatDZD(unit)}</td>
                        <td className="text-right p-3 tabular-nums">{formatDZD(lineTotal)}</td>
                      </tr>
                    );
                  })}
                </>
              );
            })()}
            {addDesign && (
              <tr className="border-b">
                <td className="p-3">Conception graphique</td>
                <td className="text-center p-3">1</td>
                <td className="text-right p-3 tabular-nums">{formatDZD(breakdown.designCost)}</td>
                <td className="text-right p-3 tabular-nums">{formatDZD(breakdown.designCost)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-right p-3 font-semibold">Sous-total</td>
              <td className="text-right p-3 tabular-nums font-semibold">{formatDZD(breakdown.subtotal)}</td>
            </tr>
            {addDesign && (
              <tr>
                <td colSpan={3} className="text-right p-3">Conception (35%)</td>
                <td className="text-right p-3 tabular-nums">{formatDZD(breakdown.designCost)}</td>
              </tr>
            )}
            {breakdown.discountAmount > 0 && (
              <tr className="text-emerald-700 bg-emerald-50 font-semibold">
                <td colSpan={3} className="text-right p-3">
                  Remise commerciale {breakdown.discountType === 'percent' ? `(${breakdown.discountValue}%)` : ''}
                </td>
                <td className="text-right p-3 tabular-nums">
                  -{formatDZD(breakdown.discountAmount)}
                </td>
              </tr>
            )}
            <tr className="text-white text-lg" style={{ background: "hsl(262 56% 25%)" }}>
              <td colSpan={3} className="text-right p-3 font-black">TOTAL TTC</td>
              <td className="text-right p-3 tabular-nums font-black text-amber-300">{formatDZD(breakdown.total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Notes / Instructions client */}
        {(data.notes || data.quoteNotes) && (
          <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs">
            <div className="font-bold text-gray-900 mb-1">📝 Remarques & Instructions :</div>
            <p className="text-gray-700 whitespace-pre-wrap">{data.notes || data.quoteNotes}</p>
          </div>
        )}

        {/* Détails techniques du calcul (Caché à l'impression pour le client) */}
        <div className="mt-8 p-5 rounded-xl border-2 print:hidden" style={{ borderColor: "hsl(262 56% 25% / 0.25)", background: "hsl(262 56% 25% / 0.03)" }}>
          <div className="text-sm font-extrabold mb-3 flex items-center gap-2" style={{ color: "hsl(262 56% 25%)" }}>
            <span>📋 Détails techniques de l'atelier</span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-accent/20 text-accent">Atelier</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <DetailRow label="Format fini (cm)" value={`${(finishedW / 10).toFixed(1)} × ${(finishedH / 10).toFixed(1)} cm`} />
            <DetailRow label="Format fini (mm)" value={`${finishedW} × ${finishedH} mm`} />
            <DetailRow label="Bleed (fond perdu)" value={`${data.breakdown?.layout ? "+3 mm sur chaque côté" : "—"}`} />
            {paperSize && <DetailRow label="Format feuille" value={`${paperSize.name} (${paperSize.width_mm} × ${paperSize.height_mm} mm)`} />}
            {breakdown.layout && <DetailRow label="Disposition (montage)" value={`${breakdown.layout.cols} × ${breakdown.layout.rows}${breakdown.layout.rotated ? " (rotation 90°)" : ""}`} />}
            <DetailRow label="Poses par feuille" value={`${breakdown.upPerSheet}`} />
            <DetailRow label="Feuilles nécessaires (+5% gâche)" value={`${breakdown.sheetsNeeded}`} />
            {coverPaperType && <DetailRow label="Papier couverture" value={`${coverPaperType.name} ${coverWeight} g/m²`} />}
            {paperType && <DetailRow label={product?.has_cover ? "Papier intérieur" : "Papier"} value={`${paperType.name} ${paperWeight} g/m²`} />}
            {printType && <DetailRow label="Impression" value={`${printType.name}${rectoVerso ? " (Recto-Verso)" : " (Recto)"}`} />}
            {product?.has_pages && <DetailRow label="Pages intérieures" value={`${innerPages} pages`} />}
            <DetailRow label="Coût papier" value={formatDZD((breakdown.paperCost || 0) + (breakdown.coverPaperCost || 0))} />
            <DetailRow label="Coût impression" value={formatDZD(breakdown.printCost || 0)} />
            {breakdown.finitionCost > 0 && <DetailRow label="Coût finitions" value={formatDZD(breakdown.finitionCost)} />}
            {breakdown.pelliculageCost > 0 && <DetailRow label="Coût pelliculage" value={formatDZD(breakdown.pelliculageCost)} />}
          </div>
          {breakdown.notes?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dashed text-xs text-gray-800 space-y-0.5 font-medium">
              {breakdown.notes.map((n: string, i: number) => <div key={i}>• {n}</div>)}
            </div>
          )}
        </div>

        {/* Footer (Terms & Signature) */}
        <div className="print-footer pt-8 mt-12 border-t grid grid-cols-2 gap-8 relative z-10 break-inside-avoid">
          <div className="text-[11px] text-muted-foreground">
            <div className="font-semibold text-black mb-1">Conditions :</div>
            <p className="whitespace-pre-wrap leading-relaxed">{settings.terms}</p>
          </div>
          <div className="text-right">
            <div className="font-semibold text-[11px] text-black mb-12">Cachet et Signature</div>
            <div className="inline-block w-48 border-b border-dashed border-gray-300"></div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dotted border-gray-300 pb-1">
      <span className="text-gray-800">{label}</span>
      <span className="font-medium tabular-nums text-right text-gray-900">{value}</span>
    </div>
  );
}

