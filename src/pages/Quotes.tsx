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
  XCircle, MessageCircle, Download, MessageSquare, Share2, Receipt, AlertTriangle,
  Calendar, Users, Filter, X, ChevronDown, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">("all");
  const [clientFilter, setClientFilter] = useState(() => searchParams.get("client") || "all");
  const [monthFilter, setMonthFilter] = useState(() => searchParams.get("month") || "all");

  useEffect(() => {
    const c = searchParams.get("client");
    if (c) setClientFilter(c);
    const m = searchParams.get("month");
    if (m) setMonthFilter(m);
  }, [searchParams]);

  const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

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

  // Build unique client names from scoped items
  const availableClients = useMemo(() => {
    const map = new Map<string, string>();
    scopedItems.forEach(q => {
      if (q.client_name?.trim()) {
        const key = q.client_name.trim().toLowerCase();
        if (!map.has(key)) map.set(key, q.client_name.trim());
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [scopedItems]);

  // Build unique month options
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    scopedItems.forEach(q => {
      if (q.created_at) {
        const d = new Date(q.created_at);
        set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [scopedItems]);

  const formatMonthLabel = (val: string) => {
    const [y, m] = val.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  };

  const filteredItems = scopedItems.filter((q) => {
    const matchSearch =
      (q.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.client_company || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.product_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    const matchClient = clientFilter === "all" || q.client_name?.trim().toLowerCase() === clientFilter.toLowerCase();
    const matchMonth = (() => {
      if (monthFilter === "all") return true;
      const [y, m] = monthFilter.split("-").map(Number);
      const d = new Date(q.created_at);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    })();
    return matchSearch && matchStatus && matchClient && matchMonth;
  });

  const myQuotesCount = useMemo(() => {
    return items.filter((q) => isQuoteOwnedByUser(q, userId, email)).length;
  }, [items, userId, email]);

  const statusCounts = useMemo(() => {
    const base = scopedItems.filter((q) => {
      const matchClient = clientFilter === "all" || q.client_name?.trim().toLowerCase() === clientFilter.toLowerCase();
      const matchMonth = (() => {
        if (monthFilter === "all") return true;
        const [y, m] = monthFilter.split("-").map(Number);
        const d = new Date(q.created_at);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      })();
      return matchClient && matchMonth;
    });
    return {
      all: base.length,
      pending: base.filter((q) => q.status === "pending").length,
      accepted: base.filter((q) => q.status === "accepted").length,
      rejected: base.filter((q) => q.status === "rejected").length,
    };
  }, [scopedItems, clientFilter, monthFilter]);

  // Compute detailed financial summary (turnover, paid, remaining, all-time vs filtered)
  const financialSummary = useMemo(() => {
    const totalAmount = filteredItems.reduce((acc, q) => acc + (Number(q.total) || 0), 0);
    const totalPaid = filteredItems.reduce((acc, q) => acc + (Number(q.details?.paidAmount) || 0), 0);
    const totalRemaining = Math.max(0, totalAmount - totalPaid);
    const count = filteredItems.length;

    let clientAllTime: { totalAmount: number; totalPaid: number; totalRemaining: number; count: number; company?: string } | null = null;
    if (clientFilter !== "all") {
      const allForClient = scopedItems.filter(q => q.client_name?.trim().toLowerCase() === clientFilter.toLowerCase());
      const cTotal = allForClient.reduce((acc, q) => acc + (Number(q.total) || 0), 0);
      const cPaid = allForClient.reduce((acc, q) => acc + (Number(q.details?.paidAmount) || 0), 0);
      const found = allForClient.find(q => q.client_company);
      clientAllTime = {
        totalAmount: cTotal,
        totalPaid: cPaid,
        totalRemaining: Math.max(0, cTotal - cPaid),
        count: allForClient.length,
        company: found?.client_company || "",
      };
    }

    return {
      totalAmount,
      totalPaid,
      totalRemaining,
      count,
      clientAllTime,
    };
  }, [filteredItems, scopedItems, clientFilter]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-xl bg-muted/40 border">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground ml-1">Affichage :</span>
            <div className="flex gap-1 bg-background p-0.5 sm:p-1 rounded-lg border shadow-sm">
              <Button
                variant={scopeFilter === "all" ? "default" : "ghost"}
                size="sm"
                className="h-6 sm:h-7 text-[11px] sm:text-xs px-2 sm:px-3 rounded-md"
                onClick={() => setScopeFilter("all")}
              >
                Tous ({items.length})
              </Button>
              <Button
                variant={scopeFilter === "mine" ? "default" : "ghost"}
                size="sm"
                className="h-6 sm:h-7 text-[11px] sm:text-xs px-2 sm:px-3 rounded-md"
                onClick={() => setScopeFilter("mine")}
              >
                Mes devis ({myQuotesCount})
              </Button>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs text-muted-foreground hidden sm:inline mr-2">
            Connecté en tant qu'administrateur
          </span>
        </div>
      )}

      {/* Status tabs */}
      {scopedItems.length > 0 && (
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10 rounded-xl">
            <TabsTrigger value="all" className="text-xs gap-1 sm:gap-1.5 rounded-lg">
              Tous <Badge variant="secondary" className="text-[10px] ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0">{statusCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs gap-1 sm:gap-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Attente</span> <Badge variant="secondary" className="text-[10px] px-1 sm:px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{statusCounts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs gap-1 sm:gap-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Accepté</span> <Badge variant="secondary" className="text-[10px] px-1 sm:px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{statusCounts.accepted}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Search + Filters */}
      {items.length > 0 && (
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="relative w-full sm:max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher client, produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm"
              />
            </div>

            {/* Bulk Selection Actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border bg-card text-xs">
                <Checkbox
                  id="select-all"
                  checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="select-all" className="cursor-pointer font-medium select-none text-[11px] sm:text-xs">
                  Tout ({filteredItems.length})
                </label>
              </div>

              {selectedIds.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 rounded-xl shadow-sm text-xs font-semibold animate-in fade-in h-8"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>

          {/* Client + Month filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Client filter */}
            <div className="relative flex-1 sm:flex-none min-w-[140px]">
              <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full h-8 sm:h-9 pl-7 pr-7 rounded-lg border border-input bg-background text-xs sm:text-sm appearance-none cursor-pointer hover:bg-accent/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Tous les clients</option>
                {availableClients.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Month filter */}
            <div className="relative flex-1 sm:flex-none min-w-[130px]">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full h-8 sm:h-9 pl-7 pr-7 rounded-lg border border-input bg-background text-xs sm:text-sm appearance-none cursor-pointer hover:bg-accent/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Tous les mois</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthLabel(m)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Clear filters */}
            {(clientFilter !== "all" || monthFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1 px-2"
                onClick={() => { setClientFilter("all"); setMonthFilter("all"); }}
              >
                <X className="w-3.5 h-3.5" />
                Effacer
              </Button>
            )}
          </div>

          {/* Active filters badges */}
          {(clientFilter !== "all" || monthFilter !== "all") && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {clientFilter !== "all" && (
                <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs">
                  <Users className="w-3 h-3" />
                  {clientFilter}
                  <button onClick={() => setClientFilter("all")} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                </Badge>
              )}
              {monthFilter !== "all" && (
                <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs">
                  <Calendar className="w-3 h-3" />
                  {formatMonthLabel(monthFilter)}
                  <button onClick={() => setMonthFilter("all")} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground">
                {filteredItems.length} résultat{filteredItems.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Financial Summary KPI / Client Turnover Card */}
      {scopedItems.length > 0 && (
        clientFilter !== "all" ? (
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/[0.05] via-background to-amber-500/[0.04] shadow-md overflow-hidden rounded-xl sm:rounded-2xl animate-in fade-in slide-in-from-top-2">
            <div className="p-3.5 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl gradient-brand flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-brand shrink-0">
                    {clientFilter.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">{clientFilter}</h2>
                      {financialSummary.clientAllTime?.company && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-normal">
                          {financialSummary.clientAllTime.company}
                        </Badge>
                      )}
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] sm:text-xs">
                        Fiche Client
                      </Badge>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      Historique complet et chiffre d'affaires total
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportQuotesToCSV(filteredItems)}
                    className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs shadow-xs px-2 sm:px-3"
                  >
                    <Download className="w-3 h-3" /> Exporter
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClientFilter("all")}
                    className="h-7 sm:h-8 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground px-2"
                  >
                    Tous les clients
                  </Button>
                </div>
              </div>

              {/* Financial KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-3 sm:pt-4">
                {/* Total Chiffre d'Affaires */}
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-background border shadow-xs">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-primary truncate">
                    <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>CA Total</span>
                  </div>
                  <div className="text-base sm:text-xl lg:text-2xl font-extrabold tracking-tight mt-1 text-primary tabular-nums truncate">
                    {formatDZD(financialSummary.clientAllTime?.totalAmount || 0)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                    {financialSummary.clientAllTime?.count || 0} devis
                  </div>
                </div>

                {/* Total Encaissé / Payé */}
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-background border shadow-xs">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Total Encaissé</span>
                  </div>
                  <div className="text-base sm:text-xl lg:text-2xl font-extrabold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                    {formatDZD(financialSummary.clientAllTime?.totalPaid || 0)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                    Total versé
                  </div>
                </div>

                {/* Reste à Payer / Crédit */}
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-background border shadow-xs">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 truncate">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Reste à Payer</span>
                  </div>
                  <div className={`text-base sm:text-xl lg:text-2xl font-extrabold tracking-tight mt-1 tabular-nums truncate ${(financialSummary.clientAllTime?.totalRemaining || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {formatDZD(financialSummary.clientAllTime?.totalRemaining || 0)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                    {(financialSummary.clientAllTime?.totalRemaining || 0) > 0 ? "Solde non réglé" : "Réglé"}
                  </div>
                </div>

                {/* Devis Travaillés */}
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-background border shadow-xs">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-foreground truncate">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Nombre de Devis</span>
                  </div>
                  <div className="text-base sm:text-xl lg:text-2xl font-extrabold tracking-tight mt-1 text-foreground tabular-nums truncate">
                    {financialSummary.clientAllTime?.count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                    Commandes
                  </div>
                </div>
              </div>

              {/* Month-specific breakdown banner if month filter is also active */}
              {monthFilter !== "all" && (
                <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Sous-total <strong>{formatMonthLabel(monthFilter)}</strong> : <strong>{formatDZD(financialSummary.totalAmount)}</strong> ({financialSummary.count} devis)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-muted/40 border">
            <div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {monthFilter !== "all" || search ? "Chiffre Sélection" : "CA Global"}
              </div>
              <div className="text-sm sm:text-lg font-bold text-primary mt-0.5 tabular-nums truncate">
                {formatDZD(financialSummary.totalAmount)}
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Total Encaissé</div>
              <div className="text-sm sm:text-lg font-bold text-emerald-600 mt-0.5 tabular-nums truncate">
                {formatDZD(financialSummary.totalPaid)}
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Reste à Payer</div>
              <div className={`text-sm sm:text-lg font-bold mt-0.5 tabular-nums truncate ${financialSummary.totalRemaining > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                {formatDZD(financialSummary.totalRemaining)}
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Nombre de Devis</div>
              <div className="text-sm sm:text-lg font-bold text-foreground mt-0.5 tabular-nums truncate">
                {financialSummary.count}
              </div>
            </div>
          </div>
        )
      )}

      {filteredItems.length === 0 ? (
        <Card><CardContent className="p-8 sm:p-12 text-center text-xs sm:text-sm text-muted-foreground">{items.length === 0 ? t("quotes.empty") : "Aucun résultat trouvé."}</CardContent></Card>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {filteredItems.map((q) => {
            const hasNote = Boolean(q.details?.notes);
            const isSelected = selectedIds.includes(q.id);
            return (
              <Card
                key={q.id}
                className={`border-2 hover:shadow-md transition-smooth rounded-xl ${isSelected ? "border-primary/50 bg-primary/[0.02]" : ""}`}
              >
                <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: Checkbox + Client info */}
                  <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0 w-full">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectOne(q.id)}
                      className="mt-1"
                      aria-label={`Sélectionner devis ${q.client_name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setClientFilter(q.client_name)}
                          className="font-semibold text-sm sm:text-base hover:text-primary transition-colors text-left flex items-center gap-1.5 group cursor-pointer"
                          title={`Filtrer tous les devis de ${q.client_name}`}
                        >
                          <span className="group-hover:underline underline-offset-2">{q.client_name}</span>
                          {q.client_company ? <span className="text-xs sm:text-sm text-muted-foreground font-normal">· {q.client_company}</span> : null}
                        </button>
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
                          <Badge variant="outline" className={`text-[10px] px-1.5 sm:px-2 py-0.5 border ${isQuoteOwnedByUser(q, userId, email) ? "border-primary/40 text-primary bg-primary/5" : "border-muted text-muted-foreground"}`}>
                            {isQuoteOwnedByUser(q, userId, email) ? "Mon devis" : `Par: ${q.details.createdBy}`}
                          </Badge>
                        ) : null}

                        {hasNote && (
                          <button
                            onClick={() => openNoteDialog(q)}
                            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-secondary-soft text-primary dark:bg-secondary/20 dark:text-primary-foreground hover:opacity-80 transition-opacity"
                            title="Voir la note"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span className="max-w-[120px] sm:max-w-[140px] truncate">{q.details.notes}</span>
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
                        {q.product_name} · {q.quantity} {t("calc.units")} · {new Date(q.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Right: Total + Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0">
                    <Badge className="gradient-brand text-white border-0 text-xs sm:text-sm tabular-nums font-bold px-2 sm:px-2.5 py-0.5 sm:py-1">
                      {formatDZD(Number(q.total))}
                    </Badge>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openNoteDialog(q)}
                        title="Ajouter/Modifier une note"
                      >
                        <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary"
                        onClick={() => copyClientPortalLink(q.id)}
                        title="Copier lien portail client"
                      >
                        <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 hover:text-emerald-700"
                        onClick={() => shareWhatsApp(q)}
                        title="Partager via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-7 sm:h-8 px-2 sm:px-3 text-xs">
                        <Link to={`/devis?id=${q.id}`} title="Voir devis / imprimer">
                          <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                          <span className="hidden sm:inline">Ouvrir</span>
                        </Link>
                      </Button>
                      <Button asChild variant="secondary" size="sm" className="h-7 sm:h-8 text-xs gap-1 px-2 hidden sm:inline-flex">
                        <Link to={`/invoices?quoteId=${q.id}`}>
                          <Receipt className="w-3.5 h-3.5 text-primary" />
                          <span>Facture</span>
                        </Link>
                      </Button>

                      {/* Single Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => setQuoteToDelete(q)}
                        title="Supprimer ce devis"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
