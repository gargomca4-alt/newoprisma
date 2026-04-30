import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";
import { localName } from "@/lib/localName";

export function CalculatorFinitions({
  finitions,
  pelliculages,
  selectedFinitions,
  setSelectedFinitions,
  selectedPelliculages,
  setSelectedPelliculages,
  addDesign,
  setAddDesign
}: any) {
  const { t } = useTranslation();

  return (
    <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-[1.5rem] overflow-hidden">
      <CardHeader className="pb-3"><CardTitle className="text-base">{t("calc.finitions")} &amp; {t("calc.pelliculages")}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t("calc.finitions")}</Label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {finitions.map((f: any) => (
              <label key={f.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-smooth ${selectedFinitions.includes(f.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                <Checkbox checked={selectedFinitions.includes(f.id)} onCheckedChange={(c) => setSelectedFinitions(c ? [...selectedFinitions, f.id] : selectedFinitions.filter((id: string) => id !== f.id))} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{localName(f)}</div>
                  <div className="text-[10px] text-muted-foreground">{f.price} DA / {f.price_unit === 'sqm' ? 'm²' : 'pc'}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <Separator />
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t("calc.pelliculages")}</Label>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {pelliculages.map((p: any) => (
              <label key={p.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-smooth ${selectedPelliculages.includes(p.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                <Checkbox checked={selectedPelliculages.includes(p.id)} onCheckedChange={(c) => setSelectedPelliculages(c ? [...selectedPelliculages, p.id] : selectedPelliculages.filter((id: string) => id !== p.id))} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{localName(p)}</div>
                  <div className="text-[10px] text-muted-foreground">{p.price_per_sqm} DA / m²</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <Separator />
        <label className="flex items-center justify-between p-3 rounded-xl border-2 border-dashed cursor-pointer hover:bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-medium text-sm">{t("calc.addDesign")}</div>
              <div className="text-xs text-muted-foreground">{t("calc.designNote")}</div>
            </div>
          </div>
          <Switch checked={addDesign} onCheckedChange={setAddDesign} />
        </label>
      </CardContent>
    </Card>
  );
}
