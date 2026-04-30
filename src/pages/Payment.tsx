import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import { PageHeader } from "@/components/PageHeader";
import { Search, Wallet, CheckCircle2, AlertCircle, Clock, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function PaymentPage() {
  const { t } = useTranslation();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    setQuotes(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = quotes.filter((q) => {
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
    const { error } = await supabase
      .from("quotes")
      .update({ details: updatedDetails } as any)
      .eq("id", payDialog.id);

    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }

    toast.success(`Paiement de ${formatDZD(amount)} enregistré`);
    setPayDialog(null);
    setPayAmount("");
    load();
  };

  const resetPayment = async (q: any) => {
    const updatedDetails = { ...(q.details || {}), paidAmount: 0 };
    const { error } = await supabase
      .from("quotes")
      .update({ details: updatedDetails } as any)
      .eq("id", q.id);

    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }

    toast.success("Paiement réinitialisé");
    load();
  };

  // Stats
  const totalRevenue = quotes.reduce((sum, q) => sum + getTotal(q), 0);
  const totalPaid = quotes.reduce((sum, q) => sum + getPaid(q), 0);
  const totalRemaining = quotes.reduce((sum, q) => sum + getRemaining(q), 0);
  const paidCount = quotes.filter((q) => getStatus(q) === "paid").length;

  return (
    <div className="space-y-6">
      <PageHeader icon={Wallet} title={t("payment.title")} action={null} />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 overflow-hidden">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("payment.totalRevenue")}</div>
            <div className="text-xl font-bold mt-1 tabular-nums">{formatDZD(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card className="border-2 overflow-hidden">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("payment.totalPaid")}</div>
            <div className="text-xl font-bold mt-1 tabular-nums text-emerald-600">{formatDZD(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card className="border-2 overflow-hidden">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("payment.totalRemaining")}</div>
            <div className="text-xl font-bold mt-1 tabular-nums text-amber-600">{formatDZD(totalRemaining)}</div>
          </CardContent>
        </Card>
        <Card className="border-2 overflow-hidden">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("payment.paidQuotes")}</div>
            <div className="text-xl font-bold mt-1">{paidCount} <span className="text-sm font-normal text-muted-foreground">/ {quotes.length}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {quotes.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("payment.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Quotes list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            {quotes.length === 0 ? t("payment.empty") : t("payment.noResults")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const status = getStatus(q);
            const paid = getPaid(q);
            const total = getTotal(q);
            const remaining = getRemaining(q);
            const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

            return (
              <Card key={q.id} className="border-2 hover:shadow-md transition-smooth overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 flex items-start gap-4">
                    {/* Status icon */}
                    <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      status === "paid"
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : status === "partial"
                        ? "bg-amber-100 dark:bg-amber-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}>
                      {status === "paid" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : status === "partial" ? (
                        <Clock className="w-5 h-5 text-amber-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{q.client_name}</span>
                        {q.client_company && (
                          <span className="text-sm text-muted-foreground">· {q.client_company}</span>
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
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {q.product_name} · {q.quantity} {t("calc.units")} · {new Date(q.created_at).toLocaleDateString()}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">{t("payment.paid")}: <span className="font-semibold text-foreground">{formatDZD(paid)}</span></span>
                          <span className="text-muted-foreground">{t("payment.remaining")}: <span className="font-semibold text-foreground">{formatDZD(remaining)}</span></span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
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
                        <div className="text-right text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                          {pct.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Total + actions */}
                    <div className="text-right shrink-0 space-y-2">
                      <div className="text-lg font-bold tabular-nums">{formatDZD(total)}</div>
                      <div className="flex gap-1.5">
                        {status !== "paid" && (
                          <Button
                            size="sm"
                            className="gradient-brand text-white border-0 text-xs h-8"
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
                            className="h-8 w-8"
                            onClick={() => resetPayment(q)}
                            title={t("payment.reset")}
                          >
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
