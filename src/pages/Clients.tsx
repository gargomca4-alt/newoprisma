import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import { PageHeader } from "@/components/PageHeader";
import {
  Users, Plus, Search, Phone, Mail, MapPin, FileText,
  ChevronDown, ChevronUp, Trash2, Pencil, Download, Calendar, Filter, X, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { showSuccess, confirmDelete } from "@/lib/alerts";
import { exportClientsToCSV } from "@/lib/exportCSV";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { useRole } from "@/lib/useRole";
import { logAction } from "@/lib/logger";
import { getUserClientsKey, isQuoteOwnedByUser } from "@/lib/userPricing";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

type Client = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at: string;
};

type QuoteRow = {
  id: string;
  client_name: string;
  client_company: string | null;
  product_name: string | null;
  quantity: number | null;
  total: number | null;
  created_at: string;
  details: any;
};

type ClientAgg = {
  client: Client;
  quotes: QuoteRow[];
  totalOrders: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
};

export default function ClientsPage() {
  const { t } = useTranslation();
  const { email, role, userId, isAdmin } = useRole();
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", address: "", notes: "" });
  const [monthFilter, setMonthFilter] = useState<string>("all"); // "all" or "YYYY-MM"

  const clientKey = getUserClientsKey(userId, email, isAdmin);

  const loadClients = async () => {
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("key", clientKey)
      .maybeSingle();
    if (data?.value) {
      try {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setClients(Array.isArray(parsed) ? parsed : []);
      } catch { setClients([]); }
    } else {
      setClients([]);
    }
  };

  const loadQuotes = async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    const allQuotes: QuoteRow[] = (data as QuoteRow[]) || [];
    const myQuotes = !isAdmin ? allQuotes.filter((q) => isQuoteOwnedByUser(q, userId, email)) : allQuotes;
    setQuotes(myQuotes);
  };

  useEffect(() => {
    loadClients();
    loadQuotes();
  }, [clientKey, userId, email, isAdmin]);

  const saveClients = async (updated: Client[]) => {
    await supabase.from("settings").upsert({ key: clientKey, value: JSON.stringify(updated) as any });
    setClients(updated);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t("clients.nameRequired")); return; }

    if (editing) {
      const updated = clients.map(c => c.id === editing.id ? { ...c, ...form } : c);
      await saveClients(updated);
      showSuccess("Success", t("clients.updated"));
      await logAction(email, role, "Modification Client", `Client: ${form.name}`);
    } else {
      const newClient: Client = {
        id: crypto.randomUUID(),
        ...form,
        created_at: new Date().toISOString(),
      };
      await saveClients([...clients, newClient]);
      showSuccess("Success", t("clients.added"));
      await logAction(email, role, "Ajout Client", `Client: ${form.name}`);
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: "", company: "", phone: "", email: "", address: "", notes: "" });
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete())) return;
    const client = clients.find(c => c.id === id);
    const updated = clients.filter(c => c.id !== id);
    await saveClients(updated);
    toast.success(t("clients.deleted"));
    if (client) await logAction(email, role, "Suppression Client", `Client: ${client.name}`);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, company: c.company, phone: c.phone, email: c.email, address: c.address, notes: c.notes });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", company: "", phone: "", email: "", address: "", notes: "" });
    setDialogOpen(true);
  };

  // Build unique month options from all quotes
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    quotes.forEach(q => {
      if (q.created_at) {
        const d = new Date(q.created_at);
        set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [quotes]);

  const filterByMonth = (list: QuoteRow[]) => {
    if (monthFilter === "all") return list;
    const [y, m] = monthFilter.split("-").map(Number);
    return list.filter(q => {
      const d = new Date(q.created_at);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
  };

  // Merge explicitly registered clients with any clients found in quotes
  const allDistinctClients: Client[] = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach(c => {
      if (c.name?.trim()) {
        map.set(c.name.trim().toLowerCase(), c);
      }
    });

    quotes.forEach(q => {
      if (q.client_name?.trim()) {
        const key = q.client_name.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: `quote-client-${key}`,
            name: q.client_name.trim(),
            company: q.client_company || "",
            phone: q.details?.clientPhone || q.details?.client?.phone || "",
            email: q.details?.clientEmail || q.details?.client?.email || "",
            address: q.details?.clientAddress || "",
            notes: "",
            created_at: q.created_at,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, quotes]);

  // Aggregate: match quotes to clients by name (case-insensitive)
  const aggregated: ClientAgg[] = allDistinctClients.map(client => {
    const allMatched = quotes.filter(q =>
      q.client_name?.toLowerCase().trim() === client.name.toLowerCase().trim()
    );
    const matched = filterByMonth(allMatched);
    const totalAmount = matched.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const totalPaid = matched.reduce((s, q) => s + (Number(q.details?.paidAmount) || 0), 0);
    return {
      client,
      quotes: matched,
      totalOrders: matched.length,
      totalAmount,
      totalPaid,
      totalRemaining: Math.max(0, totalAmount - totalPaid),
    };
  });

  const filtered = aggregated.filter(a => {
    const s = search.toLowerCase();
    return (
      a.client.name.toLowerCase().includes(s) ||
      a.client.company.toLowerCase().includes(s) ||
      a.client.phone.includes(s)
    );
  });

  // Stats
  const totalClients = clients.length;
  const activeClients = aggregated.filter(a => a.totalOrders > 0).length;
  const totalBusiness = aggregated.reduce((s, a) => s + a.totalAmount, 0);

  const formatMonthLabel = (val: string) => {
    const [y, m] = val.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} title={t("clients.title")} action={
        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportClientsToCSV(
                  aggregated.map(a => ({
                    ...a.client,
                    quoteCount: a.totalOrders,
                    totalSpent: a.totalPaid,
                    totalDebt: a.totalRemaining
                  }))
                )
              }
              className="gap-1.5"
            >
              <Download className="w-4 h-4" /> Exporter CSV
            </Button>
          )}
          <Button onClick={openNew} className="gradient-brand text-white border-0">
            <Plus className="w-4 h-4 mr-1.5" />{t("clients.addClient")}
          </Button>
        </div>
      } />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="border-2 rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate">{t("clients.totalClients")}</div>
            <div className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1">{totalClients}</div>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate">{t("clients.activeClients")}</div>
            <div className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-emerald-600">{activeClients}</div>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate">{t("clients.totalBusiness")}</div>
            <div className="text-base sm:text-xl font-bold mt-0.5 sm:mt-1 tabular-nums truncate">{formatDZD(totalBusiness)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Month Filter */}
      {clients.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="relative w-full sm:max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("clients.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm"
            />
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full sm:w-auto h-8 sm:h-9 pl-7 pr-7 rounded-lg border border-input bg-background text-xs sm:text-sm appearance-none cursor-pointer hover:bg-accent/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Tous les mois</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthLabel(m)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
            {monthFilter !== "all" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setMonthFilter("all")}
                title="Effacer le filtre"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Active filter badge */}
      {monthFilter !== "all" && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs">
            <Filter className="w-3.5 h-3.5" />
            Filtré par : {formatMonthLabel(monthFilter)}
          </Badge>
        </div>
      )}

      {/* Client list */}
      {filtered.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-8 sm:p-12 text-center text-xs sm:text-sm text-muted-foreground">
            {clients.length === 0 ? t("clients.empty") : t("clients.noResults")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {filtered.map(({ client, quotes: clientQuotes, totalOrders, totalAmount, totalPaid, totalRemaining }) => {
            const isExpanded = expandedId === client.id;
            return (
              <Card key={client.id} className="border-2 hover:shadow-md transition-smooth overflow-hidden rounded-xl">
                <CardContent className="p-0">
                  {/* Main row */}
                  <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0 shadow-brand">
                      {client.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-semibold text-sm sm:text-base">{client.name}</span>
                        {client.company && <span className="text-xs sm:text-sm text-muted-foreground truncate">· {client.company}</span>}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                        {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                        {client.email && <span className="flex items-center gap-1 hidden md:flex"><Mail className="w-3 h-3" />{client.email}</span>}
                        {client.address && <span className="flex items-center gap-1 hidden lg:flex"><MapPin className="w-3 h-3" />{client.address}</span>}
                      </div>
                    </div>

                    {/* Stats (Desktop/Tablet) */}
                    <div className="hidden sm:flex items-center gap-3 lg:gap-4 shrink-0">
                      <div className="text-center">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{t("clients.orders")}</div>
                        <div className="font-bold text-base sm:text-lg">{totalOrders}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">Total</div>
                        <div className="font-bold text-xs sm:text-sm tabular-nums">{formatDZD(totalAmount)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{t("clients.paid")}</div>
                        <div className="font-bold text-xs sm:text-sm tabular-nums text-emerald-600">{formatDZD(totalPaid)}</div>
                      </div>
                      {totalRemaining > 0 && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                          {t("clients.remaining")}: {formatDZD(totalRemaining)}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      {totalOrders > 0 && (
                        <>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 sm:h-8 text-xs gap-1.5 hidden sm:inline-flex px-2 sm:px-3"
                          >
                            <Link to={`/quotes?client=${encodeURIComponent(client.name)}`}>
                              <ExternalLink className="w-3.5 h-3.5 text-primary" />
                              <span>Devis</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => setExpandedId(isExpanded ? null : client.id)}
                            title={isExpanded ? "Réduire" : "Voir l'historique ici"}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => openEdit(client)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleDelete(client.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="sm:hidden px-3 pb-2.5 pt-1.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span><strong>{totalOrders}</strong> cmd</span>
                      <span>Total: <strong>{formatDZD(totalAmount)}</strong></span>
                      <span className="text-emerald-600 font-semibold">{formatDZD(totalPaid)}</span>
                    </div>
                    {totalOrders > 0 && (
                      <Button asChild variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2">
                        <Link to={`/quotes?client=${encodeURIComponent(client.name)}`}>
                          <ExternalLink className="w-3 h-3 text-primary" /> Devis
                        </Link>
                      </Button>
                    )}
                  </div>

                  {/* Expanded: quote history */}
                  {isExpanded && clientQuotes.length > 0 && (
                    <div className="border-t bg-muted/30">
                      <div className="p-3 pb-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          {t("clients.quoteHistory")} ({clientQuotes.length})
                        </div>
                      </div>
                      <div className="divide-y max-h-64 overflow-y-auto">
                        {clientQuotes.map(q => {
                          const paid = Number(q.details?.paidAmount) || 0;
                          const total = Number(q.total) || 0;
                          return (
                            <div key={q.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/50 transition-colors">
                              <div className="min-w-0">
                                <div className="font-medium">{q.product_name || "—"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {q.quantity} {t("calc.units")} · {new Date(q.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <div className="font-semibold tabular-nums">{formatDZD(total)}</div>
                                  {paid > 0 && (
                                    <div className="text-[10px] text-emerald-600 tabular-nums">{t("clients.paid")}: {formatDZD(paid)}</div>
                                  )}
                                </div>
                                <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                                  <Link to={`/devis?id=${q.id}`}><FileText className="w-3.5 h-3.5" /></Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {editing ? t("clients.editClient") : t("clients.addClient")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("clients.clientName")} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ahmed Benali"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("clients.company")}</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="SARL ..."
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("clients.phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0555 00 00 00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("clients.email")}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("clients.address")}</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alger, Algérie"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("clients.notes")}</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("clients.notesPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDialogOpen(false); setEditing(null); }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} className="gradient-brand text-white border-0">
              {editing ? t("common.save") : t("clients.addClient")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
