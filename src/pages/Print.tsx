import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Printer, History } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, confirmDelete } from "@/lib/alerts";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/lib/useRole";
import { recordPriceChange, getPriceHistory, PriceHistoryEntry } from "@/lib/priceHistory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  loadUserPrices, applyUserPricing, saveUserPriceOverride, resetUserPrices, hasCustomPrices
} from "@/lib/userPricing";

export default function PrintPage() {
  const { t } = useTranslation();
  const { email, role, userId, isAdmin } = useRole();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [priceMode, setPriceMode] = useState<"personal" | "catalog">("personal");
  const [hasCustom, setHasCustom] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("print_types").select("*").order("display_order");
    const profile = await loadUserPrices(userId, email);
    setHasCustom(hasCustomPrices(profile, "print_types"));

    if (priceMode === "personal") {
      setItems(applyUserPricing(data || [], "print_types", profile));
    } else {
      setItems(data || []);
    }
  };

  useEffect(() => { load(); }, [userId, email, priceMode]);

  const openPriceHistory = async () => {
    const hist = await getPriceHistory();
    setPriceHistory(hist.filter(h => h.itemType === "print"));
    setHistoryOpen(true);
  };

  const save = async (form: any) => {
    if (editing?.id) {
      if (editing.cost_per_sheet !== form.cost_per_sheet) {
        recordPriceChange({
          itemType: "print",
          itemId: editing.id,
          itemName: form.name,
          variant: "Coût / feuille",
          oldPrice: editing.cost_per_sheet,
          newPrice: form.cost_per_sheet,
          user: email
        });
      }
      if (editing.setup_cost !== form.setup_cost) {
        recordPriceChange({
          itemType: "print",
          itemId: editing.id,
          itemName: form.name,
          variant: "Mise en route",
          oldPrice: editing.setup_cost,
          newPrice: form.setup_cost,
          user: email
        });
      }

      if (priceMode === "personal") {
        await saveUserPriceOverride("print_types", editing.id, {
          cost_per_sheet: form.cost_per_sheet,
          setup_cost: form.setup_cost,
          cost_per_color: form.cost_per_color,
          recto_verso_multiplier: form.recto_verso_multiplier,
        }, userId, email);
        toast.success(`Tarifs d'impression personnalisés enregistrés pour "${form.name}"`);
      } else {
        await supabase.from("print_types").update(form).eq("id", editing.id);
        toast.success(`Catalogue général mis à jour pour "${form.name}"`);
      }
    } else {
      await supabase.from("print_types").insert(form);
      toast.success(t("common.save"));
    }

    setOpen(false);
    setEditing(null);
    load();
  };

  const handleResetMyPrices = async () => {
    if (!(await confirmDelete("Voulez-vous réinitialiser vos tarifs d'impression aux valeurs par défaut du catalogue ?"))) return;
    await resetUserPrices("print_types", userId, email);
    toast.success("Vos tarifs d'impression ont été réinitialisés");
    load();
  };

  const remove = async (id: string) => {
    if (!(await confirmDelete())) return;
    const { error } = await supabase.from("print_types").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    showSuccess("Success", t("common.save"));
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Printer} title={t("print.title")} action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openPriceHistory} className="gap-1.5">
            <History className="w-4 h-4" /> Historique des Prix
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-white border-0 gap-1.5">
            <Plus className="w-4 h-4" />{t("common.new")}
          </Button>
        </div>
      } />

      {/* Pricing Mode Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/40 border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
            💼
          </div>
          <div>
            <div className="text-xs font-semibold flex items-center gap-2">
              <span>Tarification d'Impression</span>
              {hasCustom && (
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  Tarifs personnalisés actifs
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {priceMode === "personal" 
                ? `Vos tarifs d'impression s'appliquent à votre compte (${email || "utilisateur actuel"})`
                : "Attention : vous modifiez le catalogue général pour tous les utilisateurs"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {hasCustom && (
            <Button variant="ghost" size="sm" onClick={handleResetMyPrices} className="text-xs text-muted-foreground hover:text-destructive h-8">
              Réinitialiser
            </Button>
          )}
          {isAdmin && (
            <div className="flex bg-background p-1 rounded-lg border shadow-sm">
              <Button
                variant={priceMode === "personal" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-md"
                onClick={() => setPriceMode("personal")}
              >
                Mes tarifs
              </Button>
              <Button
                variant={priceMode === "catalog" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-md"
                onClick={() => setPriceMode("catalog")}
              >
                Catalogue général
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <Card key={p.id} className="border-2 hover:shadow-elegant transition-smooth">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold">{p.name}</div>
                  {p._isCustomPrice && (
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5">
                      Personnalisé
                    </Badge>
                  )}
                </div>
                <Badge variant="outline">{p.category}</Badge>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("print.setupCost")}</span><span className="font-medium tabular-nums">{p.setup_cost} DA</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("print.costPerSheet")}</span><span className="font-medium tabular-nums">{p.cost_per_sheet} DA</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("print.rvMultiplier")}</span><span className="font-medium tabular-nums">×{p.recto_verso_multiplier}</span></div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="w-3.5 h-3.5 mr-1" />{t("common.edit")}</Button>
                <Button variant="outline" size="sm" onClick={() => remove(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t("common.edit") : t("common.new")}</DialogTitle></DialogHeader>
          <PrintForm editing={editing} onSave={save} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Historique des Tarifs d'Impression
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            {priceHistory.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Aucun historique de modification pour l'impression pour l'instant. Les changements futurs apparaîtront ici.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type Impression</TableHead>
                    <TableHead>Paramètre</TableHead>
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
                        <TableCell className="text-xs">{h.variant || "Coût"}</TableCell>
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

function PrintForm({ editing, onSave, onCancel }: any) {
  const { t } = useTranslation();
  const [form, setForm] = useState<any>(editing || { name: "", category: "offset", setup_cost: 0, cost_per_sheet: 0, recto_verso_multiplier: 1.7, active: true });
  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>{t("common.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Catégorie</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="offset">Offset</SelectItem>
              <SelectItem value="digital">Numérique</SelectItem>
              <SelectItem value="large_format">Grand Format</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">{t("print.setupCost")}</Label><Input type="number" value={form.setup_cost} onChange={(e) => setForm({ ...form, setup_cost: +e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">{t("print.costPerSheet")}</Label><Input type="number" step="0.1" value={form.cost_per_sheet} onChange={(e) => setForm({ ...form, cost_per_sheet: +e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">×R/V</Label><Input type="number" step="0.1" value={form.recto_verso_multiplier} onChange={(e) => setForm({ ...form, recto_verso_multiplier: +e.target.value })} /></div>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button onClick={() => onSave(form)} className="gradient-brand text-white border-0">{t("common.save")}</Button>
      </DialogFooter>
    </>
  );
}
