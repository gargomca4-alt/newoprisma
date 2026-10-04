import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import { PageHeader } from "@/components/PageHeader";
import {
  Receipt, Search, Plus, Printer, ExternalLink, Download,
  CheckCircle2, Clock, AlertCircle, MessageCircle, FileText, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { showSuccess } from "@/lib/alerts";
import { Link, useSearchParams } from "react-router-dom";
import { useRole } from "@/lib/useRole";
import { logAction } from "@/lib/logger";
import { downloadCSV } from "@/lib/exportCSV";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { isQuoteOwnedByUser } from "@/lib/userPricing";

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { email, role, userId, isAdmin } = useRole();
  const [searchParams] = useSearchParams();
  const prefillQuoteId = searchParams.get("quoteId");

  const [quotes, setQuotes] = useState<any[]>([]);
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");

  const loadData = async () => {
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    const allQuotes: any[] = data || [];
    setQuotes(allQuotes);

    // If prefill quoteId provided via URL, open create dialog with that quote
    if (prefillQuoteId) {
      const q: any = allQuotes.find((item: any) => item.id === prefillQuoteId);
      if (q && !(q.details as any)?.invoiceNumber) {
        setSelectedQuoteId(prefillQuoteId);
        setCreateDialogOpen(true);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [prefillQuoteId]);

  const scopedQuotes = useMemo(() => {
    if (!isAdmin || scopeFilter === "mine") {
      return quotes.filter((q) => isQuoteOwnedByUser(q, userId, email));
    }
    return quotes;
  }, [quotes, isAdmin, scopeFilter, userId, email]);

  const myQuotesCount = useMemo(() => {
    return quotes.filter((q) => isQuoteOwnedByUser(q, userId, email)).length;
  }, [quotes, userId, email]);

  // Quotes that have an invoice number
  const invoices = scopedQuotes.filter(q => q.details?.invoiceNumber);

  // Quotes eligible to become invoices (not yet converted)
  const uninvoicedQuotes = scopedQuotes.filter(q => !q.details?.invoiceNumber);

  const getPaid = (q: any) => Number(q.details?.paidAmount) || 0;
  const getTotal = (q: any) => Number(q.total) || 0;
  const getRemaining = (q: any) => Math.max(0, getTotal(q) - getPaid(q));

  const getInvoiceStatus = (q: any): "paid" | "partial" | "unpaid" => {
    const paid = getPaid(q);
    const total = getTotal(q);
    if (paid >= total && total > 0) return "paid";
    if (paid > 0) return "partial";
    return "unpaid";
  };

  const filteredInvoices = invoices.filter(q => {
    const s = search.toLowerCase();
    const invNum = (q.details?.invoiceNumber || "").toLowerCase();
    const client = (q.client_name || "").toLowerCase();
    const comp = (q.client_company || "").toLowerCase();
    const matchSearch = invNum.includes(s) || client.includes(s) || comp.includes(s);

    const st = getInvoiceStatus(q);
    const matchStatus = statusFilter === "all" || st === statusFilter;
    return matchSearch && matchStatus;
  });

  // Next invoice number generator
  const getNextInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const currentYearInvoices = invoices.filter(q => {
      const num = q.details?.invoiceNumber || "";
      return num.startsWith(`FAC-${year}`);
    });
    const nextSeq = currentYearInvoices.length + 1;
    return `FAC-${year}-${String(nextSeq).padStart(4, "0")}`;
  };

  const handleConvertQuoteToInvoice = async () => {
    if (!selectedQuoteId) {
      toast.error("Veuillez sélectionner un devis");
      return;
    }
    const q = quotes.find(item => item.id === selectedQuoteId);
    if (!q) return;

    const invoiceNumber = getNextInvoiceNumber();
    const invoiceDate = new Date().toISOString();

    const updatedDetails = {
      ...(q.details || {}),
      invoiceNumber,
      invoiceDate,
      isInvoiced: true,
    };

    const { error } = await supabase
      .from("quotes")
      .update({
        details: updatedDetails,
        status: "accepted" // Automatically mark accepted when invoiced
      } as any)
      .eq("id", q.id);

    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }

    showSuccess("Facture Générée !", `La facture ${invoiceNumber} a été créée avec succès.`);
    await logAction(email, role, "Génération Facture", `${invoiceNumber} pour client: ${q.client_name}`);
    setCreateDialogOpen(false);
    setSelectedQuoteId("");
    loadData();
  };

  const exportInvoicesToCSV = () => {
    const headers = [
      "Numéro Facture",
      "Date Facture",
      "Client",
      "Société",
      "Produit",
      "Total TTC (DA)",
      "Montant Réglé (DA)",
      "Reste à Payer (DA)",
      "Statut"
    ];

    const rows = invoices.map(q => {
      const paid = getPaid(q);
      const total = getTotal(q);
      const remaining = Math.max(0, total - paid);
      const st = getInvoiceStatus(q);
      const stLabel = st === "paid" ? "Payée" : st === "partial" ? "Acompte" : "Non payée";

      return [
        `"${q.details?.invoiceNumber || ""}"`,
        `"${new Date(q.details?.invoiceDate || q.created_at).toLocaleDateString("fr-DZ")}"`,
        `"${q.client_name || ""}"`,
        `"${q.client_company || ""}"`,
        `"${q.product_name || ""}"`,
        `"${total}"`,
        `"${paid}"`,
        `"${remaining}"`,
        `"${stLabel}"`
      ].join(";");
    });

    const csv = [headers.join(";"), ...rows].join("\r\n");
    downloadCSV(`oprisma_factures_${new Date().toISOString().split("T")[0]}.csv`, csv);
  };

  const shareWhatsApp = (q: any) => {
    const num = q.details?.invoiceNumber || "FAC";
    const total = getTotal(q);
    const paid = getPaid(q);
    const rest = getRemaining(q);
    const invoiceUrl = `${window.location.origin}/devis?id=${q.id}&type=facture`;

    const lines = [
      `🧾 *Facture Oprisma Design N° ${num}*`,
      `👤 Client: ${q.client_name}${q.client_company ? ` (${q.client_company})` : ""}`,
      `💰 *Total TTC: ${formatDZD(total)}*`,
      paid > 0 ? `✅ Encaissé: ${formatDZD(paid)}` : null,
      rest > 0 ? `⚠️ Reste à régler: *${formatDZD(rest)}*` : `✨ Statut: Entièrement réglée`,
      ``,
      `🔗 *Consulter et télécharger la facture:*`,
      invoiceUrl,
      ``,
      `_Oprisma Design — Évènementiel · Print · Marketing Digital_`,
    ].filter(Boolean);

    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Stats
  const totalInvoiced = invoices.reduce((acc, q) => acc + getTotal(q), 0);
  const totalCollected = invoices.reduce((acc, q) => acc + getPaid(q), 0);
  const totalPending = Math.max(0, totalInvoiced - totalCollected);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Receipt}
        title="Facturation"
        action={
          <div className="flex items-center gap-2">
            {invoices.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportInvoicesToCSV} className="gap-1.5">
                <Download className="w-4 h-4" /> Exporter CSV
              </Button>
            )}
            <Button onClick={() => setCreateDialogOpen(true)} className="gradient-brand text-white border-0 gap-1.5">
              <Plus className="w-4 h-4" /> Nouvelle Facture
            </Button>
          </div>
        }
      />

      {/* Admin Scope Switcher */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-xl bg-muted/40 border">
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <span className="text-xs font-semibold text-muted-foreground ml-1 shrink-0">Affichage :</span>
            <div className="inline-flex max-w-full overflow-x-auto gap-1 bg-background p-1 rounded-lg border shadow-sm">
              <Button
                variant={scopeFilter === "all" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-[11px] sm:text-xs px-2.5 sm:px-3 rounded-md shrink-0"
                onClick={() => setScopeFilter("all")}
              >
                Toutes ({quotes.filter(q => q.details?.invoiceNumber).length})
              </Button>
              <Button
                variant={scopeFilter === "mine" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-[11px] sm:text-xs px-2.5 sm:px-3 rounded-md shrink-0"
                onClick={() => setScopeFilter("mine")}
              >
                Mes factures ({myQuotesCount})
              </Button>
            </div>
          </div>
          <span className="text-xs text-muted-foreground hidden md:inline mr-2">
            Connecté en tant qu'administrateur
          </span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="border-2 shadow-sm rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate">Total Facturé</div>
            <div className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 tabular-nums truncate">{formatDZD(totalInvoiced)}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{invoices.length} factures émises</div>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate">Total Encaissé</div>
            <div className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 tabular-nums text-emerald-600 truncate">{formatDZD(totalCollected)}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              {totalInvoiced > 0 ? `${Math.round((totalCollected / totalInvoiced) * 100)}% de recouvrement` : "0%"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate">Reste à Recouvrer</div>
            <div className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 tabular-nums text-amber-600 truncate">{formatDZD(totalPending)}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Créances en cours</div>
          </CardContent>
        </Card>
      </div>

      {/* Status tabs */}
      {invoices.length > 0 && (
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9 sm:h-10 rounded-xl">
            <TabsTrigger value="all" className="text-[11px] sm:text-xs px-1 sm:px-3">Toutes ({invoices.length})</TabsTrigger>
            <TabsTrigger value="paid" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 text-emerald-700 px-1 sm:px-3">
              <CheckCircle2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" /> <span className="hidden xs:inline">Payées</span>
            </TabsTrigger>
            <TabsTrigger value="partial" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 text-blue-700 px-1 sm:px-3">
              <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" /> <span className="hidden xs:inline">Acomptes</span>
            </TabsTrigger>
            <TabsTrigger value="unpaid" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 text-amber-700 px-1 sm:px-3">
              <AlertCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" /> <span className="hidden xs:inline">Impayées</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Search */}
      {invoices.length > 0 && (
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par n° facture, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm"
          />
        </div>
      )}

      {filteredInvoices.length === 0 ? (
        <Card className="border-2 rounded-xl">
          <CardContent className="p-8 sm:p-12 text-center text-muted-foreground space-y-3">
            <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50" />
            <div className="font-semibold text-sm sm:text-base text-foreground">
              {invoices.length === 0 ? "Aucune facture émise pour le moment" : "Aucun résultat trouvé"}
            </div>
            <p className="text-xs sm:text-sm max-w-md mx-auto">
              Convertissez un devis existant ou validé en facture officielle avec numérotation séquentielle automatique (FAC-YYYY-0001).
            </p>
            {uninvoicedQuotes.length > 0 && (
              <Button onClick={() => setCreateDialogOpen(true)} className="gradient-brand text-white border-0 mt-2 text-xs h-8">
                Convertir un devis en facture
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {filteredInvoices.map((q) => {
            const st = getInvoiceStatus(q);
            const total = getTotal(q);
            const paid = getPaid(q);
            const remaining = getRemaining(q);
            const invNum = q.details?.invoiceNumber || "FAC-XXXX";
            const invDate = q.details?.invoiceDate ? new Date(q.details.invoiceDate).toLocaleDateString("fr-DZ") : new Date(q.created_at).toLocaleDateString("fr-DZ");

            return (
              <Card key={q.id} className="border-2 hover:shadow-md transition-smooth rounded-xl">
                <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base tracking-tight text-primary">{invNum}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-semibold text-sm sm:text-base">{q.client_name}{q.client_company ? ` (${q.client_company})` : ""}</span>

                      {st === "paid" && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 gap-1 border-0 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> Payée
                        </Badge>
                      )}
                      {st === "partial" && (
                        <Badge className="bg-secondary-soft text-primary dark:bg-secondary/20 dark:text-primary-foreground gap-1 border-0 text-[10px]">
                          <Clock className="w-3 h-3" /> Acompte
                        </Badge>
                      )}
                      {st === "unpaid" && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 gap-1 border-0 text-[10px]">
                          <AlertCircle className="w-3 h-3" /> Non payée
                        </Badge>
                      )}
                    </div>

                    <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span>Date: {invDate}</span>
                      <span>·</span>
                      <span>{q.product_name}</span>
                      <span>·</span>
                      <span>Qté: {q.quantity}</span>
                      {q.quote_number && (
                        <>
                          <span>·</span>
                          <span className="italic">Devis #{q.quote_number}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0">
                    <div className="text-left md:text-right">
                      <div className="font-bold text-sm sm:text-base tabular-nums">{formatDZD(total)}</div>
                      {paid > 0 && remaining > 0 && (
                        <div className="text-[10px] sm:text-xs text-amber-600 tabular-nums">Reste: {formatDZD(remaining)}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600"
                        onClick={() => shareWhatsApp(q)}
                        title="Envoyer Facture WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-7 sm:h-8 gap-1 sm:gap-1.5 text-xs px-2 sm:px-3 shrink-0">
                        <Link to={`/devis?id=${q.id}&type=facture`}>
                          <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span><span className="hidden sm:inline">Imprimer / </span>PDF</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Convert Quote to Invoice Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Générer une Facture Officielle
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-muted/50 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-foreground">Numérotation séquentielle automatique</div>
              <p className="text-muted-foreground">
                Prochain numéro attribué : <span className="font-bold text-primary">{getNextInvoiceNumber()}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Sélectionner le devis à facturer *</Label>
              {uninvoicedQuotes.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 border rounded-lg text-center">
                  Tous les devis existants ont déjà été facturés. Créez un nouveau devis depuis la calculatrice.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-xl p-2">
                  {uninvoicedQuotes.map(q => {
                    const isSelected = selectedQuoteId === q.id;
                    return (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuoteId(q.id)}
                        className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{q.client_name}{q.client_company ? ` · ${q.client_company}` : ""}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {q.product_name} · {q.quantity} ex · {new Date(q.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold tabular-nums">{formatDZD(Number(q.total) || 0)}</div>
                          <span className="text-[10px] text-muted-foreground uppercase">{q.status || "En attente"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleConvertQuoteToInvoice}
              disabled={!selectedQuoteId}
              className="gradient-brand text-white border-0 gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Générer la facture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
