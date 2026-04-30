import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { History, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirmDelete, showSuccess } from "@/lib/alerts";

export default function LogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "activity_logs")
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      setLogs(Array.isArray(parsed) ? parsed : []);
    } else {
      setLogs([]);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!(await confirmDelete("Voulez-vous vraiment effacer tout l'historique ?"))) return;
    
    await supabase.from("settings").upsert({
      key: "activity_logs",
      value: JSON.stringify([]) as any
    });
    
    setLogs([]);
    showSuccess("Succès", "Historique effacé");
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        icon={History} 
        title="Journal d'activité (Logs)" 
        action={
          <Button variant="destructive" size="sm" onClick={handleClearLogs} className="rounded-xl shadow-sm gap-2">
            <Trash2 className="w-4 h-4" />
            Vider
          </Button>
        } 
      />

      <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-[1.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Date & Heure</th>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4 rounded-tr-2xl">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    Aucune activité enregistrée
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap tabular-nums text-xs font-medium">
                      {new Date(log.timestamp).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {log.user || "Inconnu"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={log.role === "admin" ? "border-primary text-primary" : "border-amber-500 text-amber-500"}>
                        {log.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground truncate max-w-xs">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
