import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";

export default function FinitionsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader icon={Sparkles} title={t("finitions.title")} action={null} />
      <Tabs defaultValue="finitions">
        <TabsList>
          <TabsTrigger value="finitions">{t("finitions.title")}</TabsTrigger>
          <TabsTrigger value="pelliculages">{t("finitions.pelliculages")}</TabsTrigger>
        </TabsList>
        <TabsContent value="finitions" className="mt-6"><FinitionList table="finitions" /></TabsContent>
        <TabsContent value="pelliculages" className="mt-6"><FinitionList table="pelliculages" /></TabsContent>
      </Tabs>
    </div>
  );
}

function FinitionList({ table }: { table: "finitions" | "pelliculages" }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const isPellic = table === "pelliculages";

  const load = async () => {
    const { data } = await supabase.from(table).select("*").order("display_order");
    setItems(data || []);
  };
  useEffect(() => { load(); }, [table]);

  const save = async (form: any) => {
    if (editing?.id) await supabase.from(table).update(form).eq("id", editing.id);
    else await supabase.from(table).insert(form);
    toast.success(t("common.save"));
    setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-white border-0">
        <Plus className="w-4 h-4 mr-1.5" />{t("common.new")}
      </Button>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((f) => (
          <Card key={f.id} className="border-2 hover:shadow-md transition-smooth">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm">{f.name}</div>
                <Badge className="gradient-brand text-white border-0 text-[10px]">
                  {isPellic ? `${f.price_per_sqm} DA/m²` : `${f.price} DA / ${f.price_unit === "sqm" ? "m²" : "pc"}`}
                </Badge>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="w-3 h-3 mr-1" />{t("common.edit")}</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => remove(f.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t("common.edit") : t("common.new")}</DialogTitle></DialogHeader>
          <FinitionForm editing={editing} isPellic={isPellic} onSave={save} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinitionForm({ editing, isPellic, onSave, onCancel }: any) {
  const { t } = useTranslation();
  const defaultForm = isPellic
    ? { name: "", price_per_sqm: 0, active: true }
    : { name: "", price: 0, price_unit: "unit", active: true };
  const [form, setForm] = useState<any>(editing || defaultForm);
  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>{t("common.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        {isPellic ? (
          <div className="space-y-1.5"><Label>Prix / m² (DA)</Label><Input type="number" value={form.price_per_sqm} onChange={(e) => setForm({ ...form, price_per_sqm: +e.target.value })} /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("common.price")} (DA)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("finitions.priceUnit")}</Label>
              <Select value={form.price_unit} onValueChange={(v) => setForm({ ...form, price_unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit">{t("finitions.perUnit")}</SelectItem>
                  <SelectItem value="sqm">{t("finitions.perSqm")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button onClick={() => onSave(form)} className="gradient-brand text-white border-0">{t("common.save")}</Button>
      </DialogFooter>
    </>
  );
}
