import { useEffect, useState } from "react";
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
  ChevronDown, ChevronUp, Trash2, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { showSuccess, confirmDelete } from "@/lib/alerts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

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
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", address: "", notes: "" });

  const loadClients = async () => {
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "clients_list")
      .maybeSingle();
    if (data?.value) {
      try {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setClients(Array.isArray(parsed) ? parsed : []);
      } catch { setClients([]); }
    }
  };

  const loadQuotes = async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    setQuotes((data as QuoteRow[]) || []);
  };

  useEffect(() => { loadClients(); loadQuotes(); }, []);

  const saveClients = async (updated: Client[]) => {
    await supabase.from("settings").upsert({ key: "clients_list", value: JSON.stringify(updated) as any });
    setClients(updated);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t("clients.nameRequired")); return; }

    if (editing) {
      const updated = clients.map(c => c.id === editing.id ? { ...c, ...form } : c);
      await saveClients(updated);
      showSuccess("Success", t("clients.updated"));
    } else {
      const newClient: Client = {
        id: crypto.randomUUID(),
        ...form,
        created_at: new Date().toISOString(),
      };
      await saveClients([...clients, newClient]);
      showSuccess("Success", t("clients.added"));
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: "", company: "", phone: "", email: "", address: "", notes: "" });
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete())) return;
    const updated = clients.filter(c => c.id !== id);
    await saveClients(updated);
    toast.success(t("clients.deleted"));
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

  // Aggregate: match quotes to clients by name (case-insensitive)
  const aggregated: ClientAgg[] = clients.map(client => {
    const matched = quotes.filter(q =>
      q.client_name?.toLowerCase().trim() === client.name.toLowerCase().trim()
    );
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

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} title={t("clients.title")} action={
        <Button onClick={openNew} className="gradient-brand text-white border-0">
          <Plus className="w-4 h-4 mr-1.5" />{t("clients.addClient")}
        </Button>
      } />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("clients.totalClients")}</div>
            <div className="text-2xl font-bold mt-1">{totalClients}</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("clients.activeClients")}</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{activeClients}</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("clients.totalBusiness")}</div>
            <div className="text-xl font-bold mt-1 tabular-nums">{formatDZD(totalBusiness)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {clients.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("clients.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Client list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            {clients.length === 0 ? t("clients.empty") : t("clients.noResults")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ client, quotes: clientQuotes, totalOrders, totalAmount, totalPaid, totalRemaining }) => {
            const isExpanded = expandedId === client.id;
            return (
              <Card key={client.id} className="border-2 hover:shadow-md transition-smooth overflow-hidden">
                <CardContent className="p-0">
                  {/* Main row */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-brand">
                      {client.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">{client.name}</span>
                        {client.company && <span className="text-sm text-muted-foreground">· {client.company}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                        {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
                        {client.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.address}</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">{t("clients.orders")}</div>
                        <div className="font-bold text-lg">{totalOrders}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="font-bold tabular-nums">{formatDZD(totalAmount)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">{t("clients.paid")}</div>
                        <div className="font-bold tabular-nums text-emerald-600">{formatDZD(totalPaid)}</div>
                      </div>
                      {totalRemaining > 0 && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {t("clients.remaining")}: {formatDZD(totalRemaining)}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {totalOrders > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExpandedId(isExpanded ? null : client.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(client.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="sm:hidden px-4 pb-3 flex gap-3 text-xs">
                    <span><strong>{totalOrders}</strong> {t("clients.orders")}</span>
                    <span>Total: <strong>{formatDZD(totalAmount)}</strong></span>
                    <span className="text-emerald-600">{t("clients.paid")}: <strong>{formatDZD(totalPaid)}</strong></span>
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
