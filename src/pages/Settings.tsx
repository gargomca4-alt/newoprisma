import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { showSuccess } from "@/lib/alerts";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [designPct, setDesignPct] = useState(35);
  const [companyName, setCompanyName] = useState("Oprisma Design");
  const [bleed, setBleed] = useState(3);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*");
      data?.forEach((s) => {
        if (s.key === "design_percentage") setDesignPct(Number(s.value));
        if (s.key === "company_name") setCompanyName(String(s.value).replace(/"/g, ""));
        if (s.key === "default_bleed_mm") setBleed(Number(s.value));
      });
    })();
  }, []);

  const save = async () => {
    await Promise.all([
      supabase.from("settings").upsert({ key: "design_percentage", value: designPct as any }),
      supabase.from("settings").upsert({ key: "company_name", value: JSON.stringify(companyName) as any }),
      supabase.from("settings").upsert({ key: "default_bleed_mm", value: bleed as any }),
    ]);
    showSuccess("Success", t("common.save"));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader icon={SettingsIcon} title={t("settings.title")} action={null} />
      <Card className="border-2">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>{t("settings.companyName")}</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("settings.designPercentage")}</Label>
              <Input type="number" min={0} max={100} value={designPct} onChange={(e) => setDesignPct(+e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bleed défaut (mm)</Label>
              <Input type="number" min={0} value={bleed} onChange={(e) => setBleed(+e.target.value)} />
            </div>
          </div>
          <Button onClick={save} className="gradient-brand text-white border-0">
            <Save className="w-4 h-4 mr-1.5" />{t("common.save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
