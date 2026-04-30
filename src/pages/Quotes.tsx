import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Trash2, ExternalLink, Search, Clock, CheckCircle2, XCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import { PageHeader } from "@/components/PageHeader";
import { confirmDelete } from "@/lib/alerts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  pending: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "En attente", icon: Clock },
  accepted: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Accepté", icon: CheckCircle2 },
  rejected: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Refusé", icon: XCircle },
};

function StatusBadge({ status, onClick }: { status: string; onClick?: () => void }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = c.icon;
  return (
    <Badge
      variant="secondary"
      className={`text-[10px] gap-1 cursor-pointer hover:opacity-80 transition-smooth ${c.color}`}
      onClick={onClick}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </Badge>
  );
}

export default function QuotesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredItems = items.filter(q => {
    const matchSearch =
      (q.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.client_company || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    all: items.length,
    pending: items.filter(q => q.status === "pending").length,
    accepted: items.filter(q => q.status === "accepted").length,
    rejected: items.filter(q => q.status === "rejected").length,
  };

  const load = async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!(await confirmDelete())) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("quotes").update({ status } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems(items.map(q => q.id === id ? { ...q, status } : q));
    toast.success(`Statut modifié: ${STATUS_CONFIG[status]?.label || status}`);
  };

  const shareWhatsApp = (q: any) => {
    const lines = [
      `📋 *Devis Oprisma Design*`,
      `👤 Client: ${q.client_name}${q.client_company ? ` (${q.client_company})` : ""}`,
      `📦 Produit: ${q.product_name || "—"}`,
      `📊 Quantité: ${q.quantity || 1}`,
      `💰 *Total: ${formatDZD(Number(q.total) || 0)}*`,
      `📅 Date: ${new Date(q.created_at).toLocaleDateString("fr-FR")}`,
      ``,
      `_Oprisma Design — Évènementiel · Print · Marketing Digital_`,
    ];
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={FileText} title={t("quotes.title")} action={null} />

      {/* Status tabs */}
      {items.length > 0 && (
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-10 rounded-xl">
            <TabsTrigger value="all" className="text-xs gap-1.5 rounded-lg">
              Tous <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0">{statusCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs gap-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5" /> <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{statusCounts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs gap-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{statusCounts.accepted}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs gap-1.5 rounded-lg">
              <XCircle className="w-3.5 h-3.5" /> <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{statusCounts.rejected}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

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
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{q.client_name}{q.client_company ? ` · ${q.client_company}` : ""}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <span><StatusBadge status={q.status || "pending"} /></span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[160px]">
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          return (
                            <DropdownMenuItem key={key} onClick={() => updateStatus(q.id, key)} className="gap-2">
                              <Icon className="w-4 h-4" /> {cfg.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {q.product_name} · {q.quantity} {t("calc.units")} · {new Date(q.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end">
                  <Badge className="gradient-brand text-white border-0 text-sm tabular-nums">{formatDZD(Number(q.total))}</Badge>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shareWhatsApp(q)} title="Partager via WhatsApp">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/devis?id=${q.id}`}><ExternalLink className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Ouvrir</span></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
