import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Package } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, confirmDelete } from "@/lib/alerts";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Field, Stat } from "@/components/PageHeader";
import { useRole } from "@/lib/useRole";

export default function ProductsPage() {
  const { t } = useTranslation();
  const { isAdmin } = useRole();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("display_order");
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    if (editing?.id) {
      await supabase.from("products").update(form).eq("id", editing.id);
      showSuccess("Success", "Mis à jour");
    } else {
      await supabase.from("products").insert(form);
      showSuccess("Success", "Ajouté");
    }
    setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!(await confirmDelete())) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    showSuccess("Success", "Supprimé"); load();
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Package} title={t("products.title")} action={
        isAdmin ? (
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-white border-0">
            <Plus className="w-4 h-4 mr-1.5" />{t("products.new")}
          </Button>
        ) : null
      } />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => {
          let uiUxData: any = null;
          if (p.category === 'ui_ux') {
            try {
              uiUxData = typeof p.description === 'string' && p.description.startsWith('{')
                ? JSON.parse(p.description)
                : null;
            } catch {}
          }
          return (
            <Card key={p.id} className="border-2 hover:shadow-elegant transition-smooth group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.name_ar} · {p.name_en}</div>
                  </div>
                  {p.category === 'ui_ux' ? (
                    <Badge className="gradient-brand text-white border-0 shadow-sm text-[11px]">
                      🎨 UI/UX Digital
                    </Badge>
                  ) : (
                    <Badge variant={p.active ? "default" : "secondary"} className={p.active ? "gradient-brand text-white border-0" : ""}>
                      {p.category === 'large_format' ? 'Grand format' : 'Impression'}
                    </Badge>
                  )}
                </div>

                {p.category === 'ui_ux' ? (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Stat label="Taux horaire" value={`${uiUxData?.hourly_rate || 2500} DA/h`} />
                      <Stat label="Estimation" value={`${uiUxData?.estimated_hours || 20} heures`} />
                    </div>
                    {uiUxData?.deliverables && (
                      <p className="text-[11px] text-muted-foreground truncate bg-muted/40 px-2 py-1 rounded">
                        {uiUxData.deliverables}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Stat label="Min g/m²" value={p.min_paper_weight || "—"} />
                      <Stat label="Format" value={p.default_size_w_mm ? `${p.default_size_w_mm}×${p.default_size_h_mm}` : "—"} />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {p.has_pages && <Badge variant="outline" className="text-[10px]">Pages</Badge>}
                      {p.has_cover && <Badge variant="outline" className="text-[10px]">Couverture</Badge>}
                    </div>
                  </>
                )}

                <div className="flex gap-2 mt-4 opacity-70 group-hover:opacity-100 transition-smooth">
                  {isAdmin && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(p); setOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5 mr-1" />{t("common.edit")}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => remove(p.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ProductDialog open={open} onOpenChange={setOpen} editing={editing} onSave={save} />
    </div>
  );
}

function ProductDialog({ open, onOpenChange, editing, onSave }: any) {
  const { t } = useTranslation();
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (editing) {
      let uiUxData: any = {};
      if (editing.category === 'ui_ux') {
        try {
          uiUxData = typeof editing.description === 'string' && editing.description.startsWith('{')
            ? JSON.parse(editing.description)
            : {};
        } catch {}
      }
      setForm({
        ...editing,
        hourly_rate: uiUxData.hourly_rate ?? 2500,
        estimated_hours: uiUxData.estimated_hours ?? 20,
        deliverables: uiUxData.deliverables ?? '',
      });
    } else {
      setForm({
        name: "",
        category: "print",
        min_paper_weight: 80,
        has_pages: false,
        has_cover: false,
        active: true,
        hourly_rate: 2500,
        estimated_hours: 20,
        deliverables: "Wireframes, Maquettes Figma, Prototypage, Design System",
      });
    }
  }, [editing, open]);

  const handleSave = () => {
    const payload = { ...form };
    if (payload.category === 'ui_ux') {
      payload.description = JSON.stringify({
        hourly_rate: Number(payload.hourly_rate) || 2500,
        estimated_hours: Number(payload.estimated_hours) || 20,
        deliverables: payload.deliverables || '',
      });
      payload.min_paper_weight = 0;
      payload.default_size_w_mm = null;
      payload.default_size_h_mm = null;
      payload.has_pages = false;
      payload.has_cover = false;
      delete payload.hourly_rate;
      delete payload.estimated_hours;
      delete payload.deliverables;
    }
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? t("common.edit") : t("products.new")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label={t("common.name")}><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nom (AR)"><Input value={form.name_ar || ""} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></Field>
            <Field label="Nom (EN)"><Input value={form.name_en || ""} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("products.category")}>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="print">Impression standard</SelectItem>
                  <SelectItem value="large_format">Grand format</SelectItem>
                  <SelectItem value="ui_ux">🎨 UI/UX & Design Digital</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.category !== 'ui_ux' && (
              <Field label={t("products.minWeight")}><Input type="number" value={form.min_paper_weight || 0} onChange={(e) => setForm({ ...form, min_paper_weight: +e.target.value })} /></Field>
            )}
          </div>

          {form.category === 'ui_ux' ? (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                Configuration Prestation UI/UX (Calcul Horaire)
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Taux horaire par défaut (DA/h)">
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={form.hourly_rate ?? 2500}
                    onChange={(e) => setForm({ ...form, hourly_rate: +e.target.value || 0 })}
                  />
                </Field>
                <Field label="Heures estimées par défaut">
                  <Input
                    type="number"
                    min={1}
                    value={form.estimated_hours ?? 20}
                    onChange={(e) => setForm({ ...form, estimated_hours: +e.target.value || 0 })}
                  />
                </Field>
              </div>
              <Field label="Livrables / Périmètre">
                <Input
                  placeholder="ex: Wireframing, Maquettes Figma, Prototypage..."
                  value={form.deliverables || ""}
                  onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
                />
              </Field>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Largeur défaut (mm)"><Input type="number" value={form.default_size_w_mm || ""} onChange={(e) => setForm({ ...form, default_size_w_mm: +e.target.value || null })} /></Field>
                <Field label="Hauteur défaut (mm)"><Input type="number" value={form.default_size_h_mm || ""} onChange={(e) => setForm({ ...form, default_size_h_mm: +e.target.value || null })} /></Field>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.has_pages} onCheckedChange={(v) => setForm({ ...form, has_pages: v })} />{t("products.hasPages")}</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.has_cover} onCheckedChange={(v) => setForm({ ...form, has_cover: v })} />{t("products.hasCover")}</label>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} className="gradient-brand text-white border-0">{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

