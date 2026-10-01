import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Layers, X, History, Package, AlertTriangle, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, confirmDelete } from "@/lib/alerts";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/lib/useRole";
import {
  getPaperStock, updatePaperStock, getPriceHistory, recordPriceChange, PriceHistoryEntry
} from "@/lib/priceHistory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PaperPage() {
  const { t } = useTranslation();
  const { email } = useRole();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // Stock management
  const [stocks, setStocks] = useState<Record<string, { stockSheets: number; minThreshold: number }>>({});
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockPaper, setStockPaper] = useState<any>(null);
  const [stockSheetsInput, setStockSheetsInput] = useState<number>(0);
  const [minThresholdInput, setMinThresholdInput] = useState<number>(200);

  // Price history
  const [historyOpen, setHistoryOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);

  const load = async () => {
    const { data } = await supabase.from("paper_types").select("*").order("display_order");
    setItems(data || []);
    const stockData = await getPaperStock();
    setStocks(stockData);
  };

  useEffect(() => {
    load();
  }, []);

  const openStockModal = (paper: any) => {
    setStockPaper(paper);
    const curr = stocks[paper.id] || { stockSheets: 0, minThreshold: 200 };
    setStockSheetsInput(curr.stockSheets);
    setMinThresholdInput(curr.minThreshold);
    setStockDialogOpen(true);
  };

  const handleSaveStock = async () => {
    if (!stockPaper) return;
    const updated = await updatePaperStock(stockPaper.id, stockSheetsInput, minThresholdInput);
    if (updated) {
      setStocks(updated);
      toast.success(`Stock mis à jour pour ${stockPaper.name}`);
    }
    setStockDialogOpen(false);
  };

  const quickAdjustStock = async (paperId: string, paperName: string, delta: number) => {
    const curr = stocks[paperId] || { stockSheets: 0, minThreshold: 200 };
    const newQty = Math.max(0, curr.stockSheets + delta);
    const updated = await updatePaperStock(paperId, newQty, curr.minThreshold);
    if (updated) {
      setStocks(updated);
      toast.success(`${paperName}: ${delta > 0 ? `+${delta}` : delta} feuilles (${newQty} au total)`);
    }
  };

  const openPriceHistory = async () => {
    const hist = await getPriceHistory();
    setPriceHistory(hist.filter(h => h.itemType === "paper"));
    setHistoryOpen(true);
  };

  const save = async (form: any) => {
    const payload = {
      name: form.name,
      weights: form.weights,
      weight_prices: form.weight_prices,
      price_per_sheet_sra3: avgPrice(form.weight_prices, form.weights) || form.price_per_sheet_sra3 || 0,
      active: form.active ?? true,
    };

    // Track price changes for history
    if (editing?.id) {
      const oldPrices = editing.weight_prices || {};
      const newPrices = form.weight_prices || {};
      Object.entries(newPrices).forEach(([w, np]) => {
        const oldP = Number(oldPrices[w]);
        const newP = Number(np);
        if (oldP !== undefined && !isNaN(oldP) && oldP !== newP) {
          recordPriceChange({
            itemType: "paper",
            itemId: editing.id,
            itemName: form.name,
            variant: `${w} g/m²`,
            oldPrice: oldP,
            newPrice: newP,
            user: email
          });
        }
      });
      await supabase.from("paper_types").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("paper_types").insert(payload);
    }

    showSuccess("Success", t("common.save"));
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!(await confirmDelete())) return;
    const { error } = await supabase.from("paper_types").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        title={t("paper.title")}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openPriceHistory} className="gap-1.5">
              <History className="w-4 h-4" /> Historique des Prix
            </Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-white border-0 gap-1.5">
              <Plus className="w-4 h-4" />{t("common.new")}
            </Button>
          </div>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => {
          const wp = p.weight_prices || {};
          const stock = stocks[p.id]?.stockSheets ?? 0;
          const minThresh = stocks[p.id]?.minThreshold ?? 200;
          const isLowStock = stock <= minThresh;

          return (
            <Card key={p.id} className="border-2 hover:shadow-md transition-smooth flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-base">{p.name}</div>
                  <button
                    onClick={() => openStockModal(p)}
                    className="cursor-pointer transition-transform hover:scale-105"
                    title="Cliquer pour gérer le stock"
                  >
                    {isLowStock ? (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-300 gap-1 text-[11px]">
                        <AlertTriangle className="w-3 h-3" /> {stock} f. (Faible)
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        <Package className="w-3 h-3" /> {stock.toLocaleString()} f.
                      </Badge>
                    )}
                  </button>
                </div>

                {/* Grammages and prices */}
                <div className="flex flex-col gap-1">
                  {(p.weights || []).map((w: number) => (
                    <div key={w} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-muted/50">
                      <span className="font-medium">{w} g/m²</span>
                      <span className="text-primary font-bold">{wp[w] ?? p.price_per_sheet_sra3 ?? 0} DA</span>
                    </div>
                  ))}
                  {(!p.weights || p.weights.length === 0) && (
                    <div className="text-xs text-muted-foreground italic">Aucun grammage configuré</div>
                  )}
                </div>

                {/* Quick Stock Controls */}
                <div className="pt-2 border-t flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Ajuster stock:</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => quickAdjustStock(p.id, p.name, 500)}
                      title="Ajouter 1 ramette (500 f.)"
                    >
                      +500 f.
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                      onClick={() => quickAdjustStock(p.id, p.name, -100)}
                      title="Retirer 100 feuilles"
                    >
                      -100 f.
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setEditing(p); setOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />{t("common.edit")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(p.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PaperDialog open={open} onOpenChange={setOpen} editing={editing} onSave={save} />

      {/* Stock Management Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Gestion du Stock Papier — {stockPaper?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre total de feuilles SRA3 en stock</Label>
              <Input
                type="number"
                min={0}
                value={stockSheetsInput}
                onChange={(e) => setStockSheetsInput(Math.max(0, +e.target.value || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Seuil d'alerte critique (feuilles)</Label>
              <Input
                type="number"
                min={10}
                value={minThresholdInput}
                onChange={(e) => setMinThresholdInput(Math.max(10, +e.target.value || 200))}
              />
              <p className="text-[11px] text-muted-foreground">
                Une alerte visuelle s'affichera dès que le stock passe sous ce seuil.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStockDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveStock} className="gradient-brand text-white border-0">Enregistrer le stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Historique des Modifications de Prix
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            {priceHistory.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Aucun historique de modification pour l'instant. Les changements futurs apparaîtront ici.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Papier</TableHead>
                    <TableHead>Grammage</TableHead>
                    <TableHead className="text-right">Ancien</TableHead>
                    <TableHead className="text-right">Nouveau</TableHead>
                    <TableHead className="text-right">Évolution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((h) => {
                    const diff = h.newPrice - h.oldPrice;
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(h.date).toLocaleDateString("fr-DZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="font-semibold text-xs">{h.itemName}</TableCell>
                        <TableCell className="text-xs">{h.variant || "Standard"}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{h.oldPrice} DA</TableCell>
                        <TableCell className="text-right text-xs tabular-nums font-bold text-foreground">{h.newPrice} DA</TableCell>
                        <TableCell className="text-right text-xs tabular-nums font-semibold">
                          <span className={diff > 0 ? "text-red-600" : "text-emerald-600"}>
                            {diff > 0 ? `+${diff} DA` : `${diff} DA`}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function avgPrice(weight_prices: Record<string, number> | undefined, weights: number[] | undefined) {
  if (!weight_prices || !weights || weights.length === 0) return 0;
  const vals = weights.map((w) => Number(weight_prices[w] ?? 0)).filter((v) => v > 0);
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function PaperDialog({ open, onOpenChange, editing, onSave }: any) {
  const { t } = useTranslation();
  const [form, setForm] = useState<any>({});
  const [newWeight, setNewWeight] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    const base = editing || { name: "", weights: [], weight_prices: {}, price_per_sheet_sra3: 0, active: true };
    setForm({ ...base, weight_prices: base.weight_prices || {} });
    setNewWeight(""); setNewPrice("");
  }, [editing, open]);

  const addWeight = () => {
    const w = parseInt(newWeight);
    const p = parseFloat(newPrice);
    if (!w || w <= 0) return;
    if (form.weights?.includes(w)) {
      toast.error("Ce grammage existe déjà");
      return;
    }
    const weights = [...(form.weights || []), w].sort((a: number, b: number) => a - b);
    const weight_prices = { ...(form.weight_prices || {}), [w]: isNaN(p) ? 0 : p };
    setForm({ ...form, weights, weight_prices });
    setNewWeight(""); setNewPrice("");
  };

  const updatePrice = (w: number, value: string) => {
    setForm({ ...form, weight_prices: { ...(form.weight_prices || {}), [w]: parseFloat(value) || 0 } });
  };

  const removeWeight = (w: number) => {
    const weights = (form.weights || []).filter((x: number) => x !== w);
    const weight_prices = { ...(form.weight_prices || {}) };
    delete weight_prices[w];
    setForm({ ...form, weights, weight_prices });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? t("common.edit") : t("common.new")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("common.name")}</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Grammages & prix (DA / feuille SRA3)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Grammage (ex: 90)"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWeight())}
              />
              <Input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Prix DA"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWeight())}
              />
              <Button type="button" onClick={addWeight} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
              {(form.weights || []).length === 0 && (
                <div className="p-3 text-xs text-muted-foreground italic text-center">
                  Ajoutez un grammage avec son prix.
                </div>
              )}
              {(form.weights || []).map((w: number) => (
                <div key={w} className="flex items-center gap-2 p-2">
                  <Badge variant="secondary" className="min-w-[70px] justify-center">{w} g/m²</Badge>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8"
                    value={form.weight_prices?.[w] ?? 0}
                    onChange={(e) => updatePrice(w, e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">DA</span>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeWeight(w)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={() => onSave(form)} className="gradient-brand text-white border-0">{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
