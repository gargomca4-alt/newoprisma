import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import { PageHeader } from "@/components/PageHeader";
import { Search, Wallet, CheckCircle2, AlertCircle, Clock, X, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, confirmDelete } from "@/lib/alerts";
import { useRole } from "@/lib/useRole";
import { logAction } from "@/lib/logger";
import { exportPaymentsToCSV } from "@/lib/exportCSV";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { isQuoteOwnedByUser } from "@/lib/userPricing";

export default function PaymentPage() {
  const { t } = useTranslation();
  const { email, role, userId, isAdmin } = useRole();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">("all");
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [quoteToDelete, setQuoteToDelete] = useState<any | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .neq("status", "rejected")
      .order("created_at", { ascending: false });
    setQuotes(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const scopedQuotes = useMemo(() => {
    if (!isAdmin || scopeFilter === "mine") {
      return quotes.filter((q) => isQuoteOwnedByUser(q, userId, email));
    }
    return quotes;
  }, [quotes, isAdmin, scopeFilter, userId, email]);

  const myQuotesCount = useMemo(() => {
    return quotes.filter((q) => isQuoteOwnedByUser(q, userId, email)).length;
  }, [quotes, userId, email]);

  const filtered = scopedQuotes.filter((q) => {
    const s = search.toLowerCase();
    return (
      (q.client_name || "").toLowerCase().includes(s) ||
      (q.client_company || "").toLowerCase().includes(s) ||
      (q.product_name || "").toLowerCase().includes(s)
    );
  });

  const getPaid = (q: any): number => {
    return Number(q.details?.paidAmount) || 0;
  };

  const getTotal = (q: any): number => {
    return Number(q.total) || 0;
  };

  const getRemaining = (q: any): number => {
    return Math.max(0, getTotal(q) - getPaid(q));
  };

  const getStatus = (q: any): "paid" | "partial" | "unpaid" => {
    const paid = getPaid(q);
    const total = getTotal(q);
    if (paid >= total && total > 0) return "paid";
    if (paid > 0) return "partial";
    return "unpaid";
  };

  const handlePay = async () => {
    if (!payDialog) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    const currentPaid = getPaid(payDialog);
    const newPaid = currentPaid + amount;
    const total = getTotal(payDialog);

    if (newPaid > total) {
      toast.error(`Le montant total payé (${formatDZD(newPaid)}) dépasse le total du devis (${formatDZD(total)})`);
      return;
    }

    const updatedDetails = { ...(payDialog.details || {}), paidAmount: newPaid };
    
    const updatePayload: any = { details: updatedDetails };
    // Auto-accept if fully paid
    if (newPaid >= total && total > 0 && payDialog.status !== "accepted") {
      updatePayload.status = "accepted";
    }

    const { error } = await supabase
      .from("quotes")
      .update(updatePayload)
      .eq("id", payDialog.id);

    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }

    showSuccess("Success", `Paiement de ${formatDZD(amount)} enregistré`);
    await logAction(email, role, "Ajout Paiement", `Client: ${payDialog.client_name} - Montant: ${formatDZD(amount)}`);
    setPayDialog(null);
    setPayAmount("");
    load();
  };

  const resetPayment = async (q: any) => {
    if (!(await confirmDelete("Voulez-vous vraiment réinitialiser le paiement pour ce devis ?"))) return;
    
    const updatedDetails = { ...(q.details || {}), paidAmount: 0 };
    const { error } = await supabase
      .from("quotes")
      .update({ details: updatedDetails } as any)
      .eq("id", q.id);

    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }

    toast.success("Paiement réinitialisé avec succès");
    await logAction(email, role, "Réinitialisation Paiement", `Client: ${q.client_name}`);
    load();
  };

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;
    const target = quoteToDelete;
    const { error } = await supabase.from("quotes").delete().eq("id", target.id);
    if (error) {
      toast.error("Erreur de suppression: " + error.message);
      return;
    }
    toast.success(`Dossier de ${target.client_name} supprimé avec succès`);
    await logAction(email, role, "Suppression Devis (Paiements)", `Client: ${target.client_name} - Total: ${formatDZD(Number(target.total) || 0)}`);
    setQuotes(prev => prev.filter(q => q.id !== target.id));
    setQuoteToDelete(null);
  };

  // Stats based on scoped quotes
  const acceptedOrPaid = scopedQuotes.filter(q => q.status === "accepted" || getPaid(q) > 0);
  const totalPaid = scopedQuotes.reduce((sum, q) => sum + getPaid(q), 0);
  const totalAcceptedValue = acceptedOrPaid.reduce((sum, q) => sum + getTotal(q), 0);
  
  // As requested, Chiffre d'affaires = total encaissé
  const totalRevenue = totalPaid;
  const totalRemaining = Math.max(0, totalAcceptedValue - totalPaid);
  const paidCount = scopedQuotes.filter((q) => getStatus(q) === "paid").length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title={t("payment.title")}
        action={
          quotes.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPaymentsToCSV(quotes)}
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
                Tous ({quotes.length})
              </Button>
              <Button
                variant={scopeFilter === "mine" ? "default" : "ghost"}
                size="sm"
                className="h-6 sm:h-7 text-[11px] sm:text-xs px-2 sm:px-3 rounded-md"
                onClick={() => setScopeFilter("mine")}
              >
                Mes dossiers ({myQuotesCount})
              </Button>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs text-muted-foreground hidden sm:inline mr-2">
            Connecté en tant qu'administrateur
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="border-2 rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl gradient-brand flex items-center justify-center text-white shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("payment.totalRevenue")}</div>
              <div className="text-sm sm:text-lg font-bold tabular-nums truncate">{formatDZD(totalRevenue)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("payment.totalPaid")}</div>
              <div className="text-sm sm:text-lg font-bold tabular-nums text-emerald-600 truncate">{formatDZD(totalPaid)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("payment.totalRemaining")}</div>
              <div className="text-sm sm:text-lg font-bold tabular-nums text-amber-600 truncate">{formatDZD(totalRemaining)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-xl sm:rounded-2xl">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("payment.paidQuotes")}</div>
              <div className="text-sm sm:text-lg font-bold tabular-nums truncate">{paidCount} / {quotes.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {quotes.length > 0 && (
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("payment.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm"
          />
        </div>
      )}

      {/* Quotes list */}
      {filtered.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-8 sm:p-12 text-center text-xs sm:text-sm text-muted-foreground">
            {quotes.length === 0 ? t("payment.empty") : t("payment.noResults")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {filtered.map((q) => {
            const paid = getPaid(q);
            const total = getTotal(q);
            const remaining = getRemaining(q);
            const status = getStatus(q);
            const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

            return (
              <Card key={q.id} className="border-2 hover:shadow-md transition-smooth rounded-xl">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Status icon + Info */}
                    <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          status === "paid"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : status === "partial"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                        }`}
                      >
                        {status === "paid" ? (
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : status === "partial" ? (
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base">{q.client_name}</span>
                          {q.client_company && (
                            <span className="text-xs sm:text-sm text-muted-foreground">· {q.client_company}</span>
                          )}
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              status === "paid"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : status === "partial"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {status === "paid" ? t("payment.statusPaid") : status === "partial" ? t("payment.statusPartial") : t("payment.statusUnpaid")}
                          </Badge>

                          {/* Creator / Owner Tag */}
                          {q.details?.createdBy ? (
                            <Badge variant="outline" className={`text-[10px] px-1.5 sm:px-2 py-0.5 border ${isQuoteOwnedByUser(q, userId, email) ? "border-primary/40 text-primary bg-primary/5" : "border-muted text-muted-foreground"}`}>
                              {isQuoteOwnedByUser(q, userId, email) ? "Mon dossier" : `Par: ${q.details.createdBy}`}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                          {q.product_name} · {q.quantity} {t("calc.units")} · {new Date(q.created_at).toLocaleDateString()}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2.5 sm:mt-3">
                          <div className="flex justify-between text-[11px] sm:text-xs mb-1">
                            <span className="text-muted-foreground">{t("payment.paid")}: <span className="font-semibold text-foreground">{formatDZD(paid)}</span></span>
                            <span className="text-muted-foreground">{t("payment.remaining")}: <span className="font-semibold text-foreground">{formatDZD(remaining)}</span></span>
                          </div>
                          <div className="h-1.5 sm:h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                status === "paid"
                                  ? "bg-emerald-500"
                                  : status === "partial"
                                  ? "bg-amber-500"
                                  : "bg-red-400"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-right text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                            {pct.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Total + actions */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 gap-2 shrink-0">
                      <div className="text-base sm:text-lg font-bold tabular-nums">{formatDZD(total)}</div>
                      <div className="flex gap-1 sm:gap-1.5 justify-end items-center flex-wrap">
                        {status !== "paid" && (
                          <Button
                            size="sm"
                            className="gradient-brand text-white border-0 text-xs h-7 sm:h-8 px-2 sm:px-3"
                            onClick={() => {
                              setPayDialog(q);
                              setPayAmount("");
                            }}
                          >
                            <Wallet className="w-3.5 h-3.5 mr-1" />
                            {t("payment.addPayment")}
                          </Button>
                        )}
                        {paid > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => resetPayment(q)}
                            title={t("payment.reset")}
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        )}

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => setQuoteToDelete(q)}
                          title="Supprimer ce devis"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(quoteToDelete)} onOpenChange={(open) => { if (!open) setQuoteToDelete(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5 text-destructive" />
              Supprimer le dossier / paiement
            </DialogTitle>
          </DialogHeader>
          {quoteToDelete && (
            <div className="space-y-3 pt-2 text-sm">
              <p className="text-muted-foreground">
                Êtes-vous sûr de vouloir supprimer définitivement ce devis ?
              </p>
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1">
                <div className="font-semibold text-foreground">
                  {quoteToDelete.client_name} {quoteToDelete.client_company ? `(${quoteToDelete.client_company})` : ''}
                </div>
                <div className="text-xs text-muted-foreground">{quoteToDelete.product_name}</div>
                <div className="flex justify-between text-xs pt-1 border-t border-destructive/10">
                  <span>Montant total:</span>
                  <span className="font-bold text-foreground">{formatDZD(getTotal(quoteToDelete))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Montant déjà payé:</span>
                  <span className="font-bold text-emerald-600">{formatDZD(getPaid(quoteToDelete))}</span>
                </div>
              </div>
              <p className="text-xs text-destructive font-medium">
                ⚠️ Cette action est irréversible et supprimera le devis ainsi que son suivi de paiement.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setQuoteToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuote} className="gap-1.5 shadow-sm">
              <Trash2 className="w-4 h-4" />
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(open) => { if (!open) { setPayDialog(null); setPayAmount(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {t("payment.recordPayment")}
            </DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              {/* Client info */}
              <div className="p-3 rounded-xl bg-muted/50 border">
                <div className="font-semibold">{payDialog.client_name}</div>
                {payDialog.client_company && (
                  <div className="text-sm text-muted-foreground">{payDialog.client_company}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">{payDialog.product_name}</div>
              </div>

              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total TTC</span>
                  <span className="font-semibold tabular-nums">{formatDZD(getTotal(payDialog))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("payment.alreadyPaid")}</span>
                  <span className="font-semibold tabular-nums text-emerald-600">{formatDZD(getPaid(payDialog))}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground font-medium">{t("payment.remaining")}</span>
                  <span className="font-bold tabular-nums text-amber-600">{formatDZD(getRemaining(payDialog))}</span>
                </div>
              </div>

              {/* Input */}
              <div className="space-y-1.5">
                <Label>{t("payment.paymentAmount")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={getRemaining(payDialog)}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handlePay()}
                  />
                  <span className="flex items-center text-sm font-semibold text-muted-foreground">DA</span>
                </div>
                {/* Quick buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setPayAmount(String(Math.round(getRemaining(payDialog) * 0.5)))}
                  >
                    50%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setPayAmount(String(getRemaining(payDialog)))}
                  >
                    100%
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPayDialog(null); setPayAmount(""); }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handlePay} className="gradient-brand text-white border-0">
              {t("payment.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
