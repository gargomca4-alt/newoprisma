import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Trash2, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import { PageHeader } from "@/components/PageHeader";

export default function QuotesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const filteredItems = items.filter(q => 
    (q.client_name || "").toLowerCase().includes(search.toLowerCase()) || 
    (q.client_company || "").toLowerCase().includes(search.toLowerCase())
  );

  const load = async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={FileText} title={t("quotes.title")} action={null} />
      
      {items.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un client ou entreprise..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filteredItems.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">{items.length === 0 ? t("quotes.empty") : "Aucun résultat trouvé."}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((q) => (
            <Card key={q.id} className="border-2 hover:shadow-md transition-smooth">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{q.client_name}{q.client_company ? ` · ${q.client_company}` : ""}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {q.product_name} · {q.quantity} {t("calc.units")} · {new Date(q.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge className="gradient-brand text-white border-0 text-sm tabular-nums">{formatDZD(Number(q.total))}</Badge>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/devis?id=${q.id}`}><ExternalLink className="w-4 h-4 mr-1.5" />Ouvrir</Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
