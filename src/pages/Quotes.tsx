import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText, Trash2, ExternalLink, Search, Clock, CheckCircle2,
  XCircle, MessageCircle, Download, MessageSquare, Share2, Receipt, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/lib/useRole";
import { logAction } from "@/lib/logger";
import { exportQuotesToCSV } from "@/lib/exportCSV";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
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

import { isQuoteOwnedByUser } from "@/lib/userPricing";

export default function QuotesPage() {
  const { t } = useTranslation();
  const { email, role, userId, isAdmin } = useRole();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">("all");

  // Selection for bulk delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Single delete dialog
  const [quoteToDelete, setQuoteToDelete] = useState<any | null>(null);

  // Notes dialog state
  const [noteQuote, setNoteQuote] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");

  const scopedItems = useMemo(() => {
    if (!isAdmin || scopeFilter === "mine") {
      return items.filter((q) => isQuoteOwnedByUser(q, userId, email));
    }
    return items;
  }, [items, isAdmin, scopeFilter, userId, email]);

  const filteredItems = scopedItems.filter((q) => {
    const matchSearch =
      (q.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.client_company || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.product_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const myQuotesCount = useMemo(() => {
    return items.filter((q) => isQuoteOwnedByUser(q, userId, email)).length;
  }, [items, userId, email]);

  const statusCounts = {
    all: scopedItems.length,
    pending: scopedItems.filter((q) => q.status === "pending").length,
    accepted: scopedItems.filter((q) => q.status === "accepted").length,
    rejected: scopedItems.filter((q) => q.status === "rejected").length,
  };

  const load = async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    const mapped = (data || []).map((q: any) => ({
      ...q,
      status: (q.details as any)?.status || (Number((q.details as any)?.paidAmount) >= Number(q.total) && Number(q.total) > 0 ? "accepted" : "pending")
    }));
    setItems(mapped);
  };

  useEffect(() => { load(); }, []);

  // Single quote deletion
  const handleDeleteSingle = async () => {
    if (!quoteToDelete) return;
    const target = quoteToDelete;
    const { error } = await supabase.from("quotes").delete().eq("id", target.id);
    if (error) {
      toast.error("Erreur de suppression: " + error.message);
      return;
    }
    toast.success(`Devis de ${target.client_name} supprimé avec succès`);
    await logAction(email, role, "Suppression Devis", `Client: ${target.client_name} - Total: ${formatDZD(Number(target.total) || 0)}`);
    setItems(prev => prev.filter(i => i.id !== target.id));
    setSelectedIds(prev => prev.filter(id => id !== target.id));
    setQuoteToDelete(null);
  };

  // Bulk deletion
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const { error } = await supabase.from("quotes").delete().in("id", selectedIds);
    if (error) {
      toast.error("Erreur de suppression groupée: " + error.message);
      return;
    }
    toast.success(`${count} devis supprimés avec succès`);
    await logAction(email, role, "Suppression Groupée Devis", `${count} devis supprimés`);
    setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
    setSelectedIds([]);
    setBulkDeleteDialogOpen(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const q = items.find(i => i.id === id);
    if (!q) return;
    if (newStatus === "rejected") {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) { toast.error(error.message); return; }
      setItems(items.filter(i => i.id !== id));
      toast.success("Devis refusé et supprimé automatiquement");
      await logAction(email, role, "Suppression Devis (Refusé)", `Client: ${q.client_name}`);
    } else {
      const updatedDetails = { ...(q.details || {}), status: newStatus };
      const { error } = await supabase
        .from("quotes")
        .update({ status: newStatus, details: updatedDetails } as any)
        .eq("id", id);
      if (error) { toast.error(error.message); return; }
      setItems(items.map(i => i.id === id ? { ...i, status: newStatus, details: updatedDetails } : i));
      toast.success(`Statut modifié: ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      await logAction(email, role, "Modification Statut Devis", `Client: ${q.client_name} -> ${newStatus}`);
    }
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

      {/* Admin Scope Switcher */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-muted/40 border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground ml-1">Affichage :</span>
            <div className="flex gap-1 bg-background p-1 rounded-lg border shadow-sm">
              <Button
                variant={scopeFilter === "all" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3 rounded-md"
                onClick={() => setScopeFilter("all")}
              >
                Tous les devis ({items.length})
              </Button>
              <Button
                variant={scopeFilter === "mine" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3 rounded-md"
                onClick={() => setScopeFilter("mine")}
              >
                Mes devis uniquement ({myQuotesCount})
              </Button>
            </div>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline mr-2">
            Connecté en tant qu'administrateur
          </span>
        </div>
      )}

      {/* Status tabs */}
      {scopedItems.length > 0 && (
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10 rounded-xl">
            <TabsTrigger value="all" className="text-xs gap-1.5 rounded-lg">
              Tous <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0">{statusCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs gap-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5" /> <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{statusCounts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs gap-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{statusCounts.accepted}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Search and Bulk Action Bar */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client, entreprise, produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Bulk Selection Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-card text-xs">
              <Checkbox
                id="select-all"
                checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                onCheckedChange={toggleSelectAll}
              />
              <label htmlFor="select-all" className="cursor-pointer font-medium select-none">
                Tout sélectionner ({filteredItems.length})
              </label>
            </div>

            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 rounded-xl shadow-sm text-xs font-semibold animate-in fade-in"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Supprimer ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">{items.length === 0 ? t("quotes.empty") : "Aucun résultat trouvé."}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((q) => {
            const hasNote = Boolean(q.details?.notes);
            const isSelected = selectedIds.includes(q.id);
            return (
              <Card
                key={q.id}
                className={`border-2 hover:shadow-md transition-smooth ${isSelected ? "border-primary/50 bg-primary/[0.02]" : ""}`}
              >
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Checkbox + Client info */}
                  <div className="flex items-start md:items-center gap-3 flex-1 min-w-0 w-full">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectOne(q.id)}
                      className="mt-1 md:mt-0"
                      aria-label={`Sélectionner devis ${q.client_name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">{q.client_name}{q.client_company ? ` · ${q.client_company}` : ""}</span>
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

                        {/* Creator / Owner Tag */}
                        {q.details?.createdBy ? (
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${isQuoteOwnedByUser(q, userId, email) ? "border-primary/40 text-primary bg-primary/5" : "border-muted text-muted-foreground"}`}>
                            {isQuoteOwnedByUser(q, userId, email) ? "Mon devis" : `Par: ${q.details.createdBy}`}
                          </Badge>
                        ) : null}

                        {hasNote && (
                          <button
                            onClick={() => openNoteDialog(q)}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:opacity-80 transition-opacity"
                            title="Voir la note"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span className="max-w-[140px] truncate">{q.details.notes}</span>
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {q.product_name} · {q.quantity} {t("calc.units")} · {new Date(q.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Right: Total + Actions */}
                  <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                    <Badge className="gradient-brand text-white border-0 text-sm tabular-nums font-bold px-2.5 py-1">
                      {formatDZD(Number(q.total))}
                    </Badge>
                    <div className="flex items-center gap-1.5 flex-wrap">
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

                      {/* Prominent Single Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => setQuoteToDelete(q)}
                        title="Supprimer ce devis"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={Boolean(quoteToDelete)} onOpenChange={(open) => { if (!open) setQuoteToDelete(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5 text-destructive" />
              Supprimer le devis
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement ce devis ?
            </DialogDescription>
          </DialogHeader>
          {quoteToDelete && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1">
                <div className="font-semibold text-foreground">
                  {quoteToDelete.client_name} {quoteToDelete.client_company ? `(${quoteToDelete.client_company})` : ''}
                </div>
                <div className="text-xs text-muted-foreground">{quoteToDelete.product_name} · Quantité: {quoteToDelete.quantity}</div>
                <div className="flex justify-between text-xs pt-1 border-t border-destructive/10">
                  <span>Montant:</span>
                  <span className="font-bold text-foreground">{formatDZD(Number(quoteToDelete.total) || 0)}</span>
                </div>
              </div>
              <p className="text-xs text-destructive font-medium">
                ⚠️ Cette action est irréversible et supprimera le devis de la base de données.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setQuoteToDelete(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteSingle} className="gap-1.5 shadow-sm">
              <Trash2 className="w-4 h-4" />
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Suppression groupée de devis
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de supprimer {selectedIds.length} devis sélectionnés.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Cette opération supprimera définitivement les <span className="font-bold text-foreground">{selectedIds.length} devis</span> ainsi que leur historique. Cette action est irréversible.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setBulkDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-1.5 shadow-sm">
              <Trash2 className="w-4 h-4" />
              Supprimer les {selectedIds.length} devis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
