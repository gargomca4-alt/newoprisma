import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Trash2, ExternalLink, Search, Clock, CheckCircle2,
  XCircle, MessageCircle, Download, MessageSquare, Share2, Receipt
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import { PageHeader } from "@/components/PageHeader";
import { confirmDelete } from "@/lib/alerts";
import { useRole } from "@/lib/useRole";
import { logAction } from "@/lib/logger";
import { exportQuotesToCSV } from "@/lib/exportCSV";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

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
  const { email, role } = useRole();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Notes dialog state
  const [noteQuote, setNoteQuote] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");

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
    const q = items.find(i => i.id === id);
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (q) await logAction(email, role, "Suppression Devis", `Client: ${q.client_name}`);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const q = items.find(i => i.id === id);
    const { error } = await supabase.from("quotes").update({ status } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems(items.map(i => i.id === id ? { ...i, status } : i));
    toast.success(`Statut modifié: ${STATUS_CONFIG[status]?.label || status}`);
    if (q) await logAction(email, role, "Modification Statut Devis", `Client: ${q.client_name} -> ${status}`);
  };

  const openNoteDialog = (q: any) => {
    setNoteQuote(q);
    setNoteText(q.details?.notes || "");
  };

  const saveNote = async () => {
    if (!noteQuote) return;
    const updatedDetails = {
      ...(noteQuote.details || {}),
      notes: noteText.trim()
    };
    const { error } = await supabase
      .from("quotes")
      .update({ details: updatedDetails } as any)
      .eq("id", noteQuote.id);

    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }

    setItems(items.map(i => i.id === noteQuote.id ? { ...i, details: updatedDetails } : i));
    toast.success("Note enregistrée avec succès");
    setNoteQuote(null);
  };

  const copyClientPortalLink = (id: string) => {
    const url = `${window.location.origin}/portal?id=${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien client copié ! Vous pouvez l'envoyer au client.");
  };

  const shareWhatsApp = (q: any) => {
    const portalUrl = `${window.location.origin}/portal?id=${q.id}`;
    const lines = [
      `📋 *Devis Oprisma Design*`,
      `👤 Client: ${q.client_name}${q.client_company ? ` (${q.client_company})` : ""}`,
      `📦 Produit: ${q.product_name || "—"}`,
      `📊 Quantité: ${q.quantity || 1}`,
      `💰 *Total: ${formatDZD(Number(q.total) || 0)}*`,
      `📅 Date: ${new Date(q.created_at).toLocaleDateString("fr-FR")}`,
      ``,
      `🔗 *Consulter et valider le devis en ligne:*`,
      portalUrl,
      ``,
      `_Oprisma Design — Évènementiel · Print · Marketing Digital_`,
    ];
    const text = encodeURIComponent(lines.join("\n"));
    
    // Check if phone number exists in details
    const phone = q.details?.clientPhone || q.details?.client?.phone || "";
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "213" + cleanPhone.substring(1);
    }
    const targetUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(targetUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title={t("quotes.title")}
        action={
          items.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportQuotesToCSV(items)}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" /> Exporter CSV
            </Button>
          ) : null
        }
      />

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
          {filteredItems.map((q) => {
            const hasNote = Boolean(q.details?.notes);
            return (
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

                      {hasNote && (
                        <button
                          onClick={() => openNoteDialog(q)}
                          className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-md hover:bg-muted/80 text-muted-foreground"
                          title="Voir / Modifier la note"
                        >
                          <MessageSquare className="w-3 h-3 text-primary" />
                          <span className="truncate max-w-[150px]">{q.details.notes}</span>
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {q.product_name} · {q.quantity} {t("calc.units")} · {new Date(q.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
                    <Badge className="gradient-brand text-white border-0 text-sm tabular-nums">{formatDZD(Number(q.total))}</Badge>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openNoteDialog(q)}
                        title="Ajouter/Modifier une note"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => copyClientPortalLink(q.id)}
                        title="Copier lien portail client"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                        onClick={() => shareWhatsApp(q)}
                        title="Partager via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-8">
                        <Link to={`/devis?id=${q.id}`} title="Voir devis / imprimer">
                          <ExternalLink className="w-4 h-4 mr-1 sm:mr-1.5" />
                          <span className="hidden sm:inline">Ouvrir</span>
                        </Link>
                      </Button>
                      <Button asChild variant="secondary" size="sm" className="h-8 text-xs gap-1 hidden sm:inline-flex">
                        <Link to={`/invoices?quoteId=${q.id}`}>
                          <Receipt className="w-3.5 h-3.5 text-primary" />
                          <span>Facture</span>
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(q.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Note dialog */}
      <Dialog open={Boolean(noteQuote)} onOpenChange={(open) => { if (!open) setNoteQuote(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Notes & Commentaires Devis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Client: <span className="font-semibold text-foreground">{noteQuote?.client_name}</span> · {noteQuote?.product_name}
            </p>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ex: Client demande livraison avant jeudi, acompte 30% versé, bon à tirer validé..."
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setNoteQuote(null)}>Annuler</Button>
            <Button onClick={saveNote} className="gradient-brand text-white border-0">Enregistrer la note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
