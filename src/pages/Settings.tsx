import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Save, Users, Plus, Trash2, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, confirmDelete } from "@/lib/alerts";
import { PageHeader } from "@/components/PageHeader";
import { useRole, UserRole } from "@/lib/useRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RoleEntry = { email: string; role: UserRole };

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isAdmin, email: currentEmail } = useRole();
  const [designPct, setDesignPct] = useState(35);
  const [companyName, setCompanyName] = useState("Oprisma Design");
  const [bleed, setBleed] = useState(3);
  const [terms, setTerms] = useState("Le présent devis est valable 30 jours. Un acompte de 50% est exigé à la commande.");
  const [watermark, setWatermark] = useState("OPRISMA DESIGN");

  // Role management
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("agent");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*");
      data?.forEach((s) => {
        if (s.key === "design_percentage") setDesignPct(Number(s.value));
        if (s.key === "company_name") setCompanyName(String(s.value).replace(/"/g, ""));
        if (s.key === "default_bleed_mm") setBleed(Number(s.value));
        if (s.key === "terms_conditions") setTerms(String(s.value).replace(/"/g, ""));
        if (s.key === "watermark_text") setWatermark(String(s.value).replace(/"/g, ""));
        if (s.key === "user_roles") {
          try {
            const map = typeof s.value === "string" ? JSON.parse(s.value) : s.value;
            const entries: RoleEntry[] = Object.entries(map).map(([email, role]) => ({
              email, role: role as UserRole,
            }));
            setRoles(entries);
          } catch {}
        }
      });
    })();
  }, []);

  const save = async () => {
    await Promise.all([
      supabase.from("settings").upsert({ key: "design_percentage", value: designPct as any }),
      supabase.from("settings").upsert({ key: "company_name", value: JSON.stringify(companyName) as any }),
      supabase.from("settings").upsert({ key: "default_bleed_mm", value: bleed as any }),
      supabase.from("settings").upsert({ key: "terms_conditions", value: JSON.stringify(terms) as any }),
      supabase.from("settings").upsert({ key: "watermark_text", value: JSON.stringify(watermark) as any }),
    ]);
    showSuccess("Success", t("common.save"));
  };

  const saveRoles = async (updated: RoleEntry[]) => {
    const map: Record<string, string> = {};
    updated.forEach(r => { map[r.email.toLowerCase()] = r.role; });
    await supabase.from("settings").upsert({
      key: "user_roles",
      value: JSON.stringify(map) as any,
    });
    setRoles(updated);
  };

  const addUser = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    if (roles.find(r => r.email === email)) {
      toast.error("Cet utilisateur existe déjà");
      return;
    }
    const updated = [...roles, { email, role: newRole }];
    await saveRoles(updated);
    setNewEmail("");
    toast.success(`${email} ajouté en tant que ${newRole === "admin" ? "Administrateur" : "Agent"}`);
  };

  const changeRole = async (email: string, role: UserRole) => {
    const updated = roles.map(r => r.email === email ? { ...r, role } : r);
    await saveRoles(updated);
    toast.success(`Rôle modifié pour ${email}`);
  };

  const removeUser = async (email: string) => {
    if (email === currentEmail) {
      toast.error("Vous ne pouvez pas vous supprimer vous-même");
      return;
    }
    if (!(await confirmDelete())) return;
    const updated = roles.filter(r => r.email !== email);
    await saveRoles(updated);
    toast.success(`${email} supprimé`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader icon={SettingsIcon} title={t("settings.title")} action={null} />

      {/* General Settings */}
      <Card className="border-2 rounded-2xl">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>{t("settings.companyName")}</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("settings.designPercentage")}</Label>
              <Input type="number" min={0} max={100} value={designPct} onChange={(e) => setDesignPct(+e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bleed défaut (mm)</Label>
              <Input type="number" min={0} value={bleed} onChange={(e) => setBleed(+e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Filigrane (Watermark) PDF</Label>
            <Input value={watermark} onChange={(e) => setWatermark(e.target.value)} placeholder="OPRISMA DESIGN" />
          </div>
          <div className="space-y-1.5">
            <Label>Conditions générales (Devis)</Label>
            <Input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Ex: Acompte de 50%..." />
          </div>
          <Button onClick={save} className="gradient-brand text-white border-0">
            <Save className="w-4 h-4 mr-1.5" />{t("common.save")}
          </Button>
        </CardContent>
      </Card>

      {/* Role Management - Admin only */}
      {isAdmin && (
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base">Gestion des utilisateurs</h3>
            </div>
            <p className="text-xs text-muted-foreground -mt-3">
              Gérez les rôles : <strong>Admin</strong> a accès complet (prix, produits, paramètres). <strong>Agent</strong> peut uniquement créer des devis et gérer les clients.
            </p>

            {/* Current users */}
            <div className="space-y-2">
              {roles.map(r => (
                <div key={r.email} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-smooth">
                  <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {r.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.email}</div>
                    {r.email === currentEmail && (
                      <span className="text-[10px] text-muted-foreground">(vous)</span>
                    )}
                  </div>
                  <Select
                    value={r.role}
                    onValueChange={(v) => changeRole(r.email, v as UserRole)}
                    disabled={r.email === currentEmail}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Admin
                        </span>
                      </SelectItem>
                      <SelectItem value="agent">
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-muted-foreground" /> Agent
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={r.email === currentEmail}
                    onClick={() => removeUser(r.email)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add new user */}
            <div className="flex gap-2 pt-2 border-t">
              <Input
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addUser()}
              />
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger className="w-28 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addUser} className="gradient-brand text-white border-0 shrink-0">
                <Plus className="w-4 h-4 mr-1" />Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
