import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, confirmDelete } from "@/lib/alerts";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";

export default function PrintPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase.from("print_types").select("*").order("display_order");
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    if (editing?.id) await supabase.from("print_types").update(form).eq("id", editing.id);
    else await supabase.from("print_types").insert(form);
    showSuccess("Success", t("common.save"));
    setOpen(false); setEditing(null); load();
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
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-white border-0">
          <Plus className="w-4 h-4 mr-1.5" />{t("common.new")}
        </Button>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <Card key={p.id} className="border-2 hover:shadow-elegant transition-smooth">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{p.name}</div>
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
