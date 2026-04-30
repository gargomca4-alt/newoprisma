import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Layers, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";

export default function PaperPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase.from("paper_types").select("*").order("display_order");
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    const payload = {
      name: form.name,
      weights: form.weights,
      weight_prices: form.weight_prices,
      // keep legacy field in sync with average for backward compat
      price_per_sheet_sra3: avgPrice(form.weight_prices, form.weights) || form.price_per_sheet_sra3 || 0,
      active: form.active ?? true,
    };
    if (editing?.id) await supabase.from("paper_types").update(payload).eq("id", editing.id);
    else await supabase.from("paper_types").insert(payload);
    toast.success(t("common.save"));
    setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("paper_types").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Layers} title={t("paper.title")} action={
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-white border-0">
          <Plus className="w-4 h-4 mr-1.5" />{t("common.new")}
        </Button>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => {
          const wp = p.weight_prices || {};
          return (
            <Card key={p.id} className="border-2 hover:shadow-elegant transition-smooth">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="font-semibold">{p.name}</div>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {(p.weights || []).map((w: number) => (
                    <div key={w} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/50">
                      <span className="font-medium">{w} g/m²</span>
                      <span className="text-primary font-semibold">{wp[w] ?? p.price_per_sheet_sra3 ?? 0} DA</span>
                    </div>
                  ))}
                  {(!p.weights || p.weights.length === 0) && (
                    <div className="text-xs text-muted-foreground italic">Aucun grammage</div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="w-3.5 h-3.5 mr-1" />{t("common.edit")}</Button>
                  <Button variant="outline" size="sm" onClick={() => remove(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <PaperDialog open={open} onOpenChange={setOpen} editing={editing} onSave={save} />
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
    // Make sure weight_prices is an object (jsonb may come as null)
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
