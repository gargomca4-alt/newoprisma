import { useEffect, useRef, useState } from "react";
import { formatDZD } from "@/lib/calc";
import logo from "@/assets/oprisma-logo.png";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2, ArrowLeft } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export default function DevisPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      // 1) If ?id= → load from DB
      if (id) {
        const { data: row } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
        if (row?.details) {
          const loaded = { ...row.details };
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
        const loaded = { ...latest.details };
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

  const { clientName, clientCompany, product, printType, paperType, paperSize, finishedW = 0, finishedH = 0, quantity = 1, rectoVerso, paperWeight, selectedFinitionsData, selectedPelliculagesData, breakdown, addDesign, innerPages } = data;

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
  const ref = "OPR-" + Date.now().toString().slice(-6);

  const exportPDF = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 3, // Safe high-res scale that won't crash memory
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
      const safeName = (clientName || "client").replace(/[^a-z0-9]/gi, "_");
      pdf.save(`Devis_${ref}_${safeName}.pdf`);
      toast.success("PDF téléchargé");
    } catch (e: any) {
      toast.error("Erreur PDF: " + (e?.message || ""));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-8 print:p-0 font-sans">
      <div className="no-print mb-6 flex flex-wrap justify-end gap-2 max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1.5" />Imprimer</Button>
        <Button onClick={exportPDF} disabled={exporting} className="gradient-brand text-white border-0">
          {exporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
          {exporting ? "Génération..." : "Télécharger PDF"}
        </Button>
      </div>
      <div className="overflow-x-auto pb-8 print:pb-0 print:overflow-visible">
        <div ref={sheetRef} className="w-full min-w-[800px] max-w-4xl mx-auto bg-white p-8 sm:p-12 print:p-0 shadow-sm print:shadow-none rounded-lg print:rounded-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-4 pb-6" style={{ borderColor: "hsl(220 75% 22%)" }}>
          <div className="flex items-center gap-4">
            <img src={logo} alt="Oprisma" className="h-20 w-auto" />
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "hsl(220 75% 22%)" }}>Oprisma Design</h1>
              <p className="text-xs text-gray-800 font-medium">Évènementiel · Print · Marketing Digital</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: "hsl(220 75% 22%)" }}>DEVIS</div>
            <div className="text-xs text-gray-800 mt-1 font-medium">N° {ref}</div>
            <div className="text-xs text-gray-800 font-medium">Date: {today}</div>
          </div>
        </div>

        {/* Client */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-700 mb-1 font-semibold">Client</div>
            <div className="font-semibold text-lg">{clientName}</div>
            {clientCompany && <div className="text-sm text-gray-700">{clientCompany}</div>}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-700 mb-1 font-semibold">Validité</div>
            <div className="text-sm">15 jours à compter du {today}</div>
          </div>
        </div>

        {/* Détail */}
        <table className="w-full mt-8 border-collapse">
          <thead>
            <tr className="text-white text-sm" style={{ background: "linear-gradient(135deg, hsl(220 75% 22%), hsl(145 65% 42%))" }}>
              <th className="text-left p-3 font-semibold">Désignation</th>
              <th className="text-center p-3 font-semibold w-24">Quantité</th>
              <th className="text-right p-3 font-semibold w-32">P. Unitaire</th>
              <th className="text-right p-3 font-semibold w-32">Total</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {(() => {
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
                  {paperType && (
                    <tr className="border-b">
                      <td className="p-3 pl-6 text-gray-700">↳ Papier: {paperType.name} {paperWeight} g/m²</td>
                      <td className="text-center p-3 tabular-nums text-gray-700">{quantity}</td>
                      <td className="text-right p-3 tabular-nums text-gray-700">{formatDZD(paperUnit)}</td>
                      <td className="text-right p-3 tabular-nums text-gray-700">{formatDZD(paperTotal)}</td>
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
            <tr className="text-white text-lg" style={{ background: "hsl(220 75% 22%)" }}>
              <td colSpan={3} className="text-right p-3 font-bold">TOTAL TTC</td>
              <td className="text-right p-3 tabular-nums font-bold">{formatDZD(breakdown.total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Détails techniques du calcul */}
        <div className="mt-8 p-5 rounded-lg border-2" style={{ borderColor: "hsl(220 75% 22% / 0.3)", background: "hsl(220 75% 22% / 0.03)" }}>
          <div className="text-sm font-bold mb-3" style={{ color: "hsl(220 75% 22%)" }}>📋 Détails techniques du calcul</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <DetailRow label="Format fini (cm)" value={`${(finishedW / 10).toFixed(1)} × ${(finishedH / 10).toFixed(1)} cm`} />
            <DetailRow label="Format fini (mm)" value={`${finishedW} × ${finishedH} mm`} />
            <DetailRow label="Bleed (fond perdu)" value={`${data.breakdown?.layout ? "+3 mm sur chaque côté" : "—"}`} />
            {paperSize && <DetailRow label="Format feuille" value={`${paperSize.name} (${paperSize.width_mm} × ${paperSize.height_mm} mm)`} />}
            {breakdown.layout && <DetailRow label="Disposition (montage)" value={`${breakdown.layout.cols} × ${breakdown.layout.rows}${breakdown.layout.rotated ? " (rotation 90°)" : ""}`} />}
            <DetailRow label="Poses par feuille" value={`${breakdown.upPerSheet}`} />
            <DetailRow label="Feuilles nécessaires (+5% gâche)" value={`${breakdown.sheetsNeeded}`} />
            {paperType && <DetailRow label="Papier" value={`${paperType.name} ${paperWeight} g/m²`} />}
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

        {/* Footer */}
        <div className="mt-10 pt-6 border-t-2 grid grid-cols-2 gap-6 text-xs text-gray-800">
          <div>
            <div className="font-semibold text-gray-800 mb-2">Conditions</div>
            <ul className="space-y-0.5">
              <li>• Acompte 50% à la commande</li>
              <li>• Délai: 5-10 jours ouvrables</li>
              <li>• Bon à tirer obligatoire avant impression</li>
              <li>• Devis valable 15 jours</li>
            </ul>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-800 mb-2">Signature client</div>
            <div className="h-16 border-2 border-dashed rounded" />
          </div>
        </div>
        <div className="text-center text-[10px] text-gray-400 mt-8">Oprisma Design — Évènementiel · Print · Marketing Digital</div>
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

