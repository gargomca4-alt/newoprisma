import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import {
  CheckCircle2, XCircle, Clock, Printer, Download, MessageCircle,
  Sparkles, ShieldCheck, HelpCircle, ArrowLeft, Loader2
} from "lucide-react";
import logo from "@/assets/oprisma-logo.png";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ClientPortalPage() {
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("id");

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [clientSigner, setClientSigner] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [companySettings, setCompanySettings] = useState({ company: "Oprisma Design", phone: "0550000000" });

  useEffect(() => {
    (async () => {
      // Load company settings
      const { data: sData } = await supabase.from("settings").select("*");
      let comp = "Oprisma Design";
      let ph = "";
      sData?.forEach(s => {
        if (s.key === "company_name") comp = String(s.value).replace(/"/g, "");
        if (s.key === "company_phone") ph = String(s.value).replace(/"/g, "");
      });
      setCompanySettings({ company: comp, phone: ph });

      if (!quoteId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .maybeSingle();

      if (data) {
        setQuote(data);
        if (data.client_name) setClientSigner(data.client_name);
      }
      setLoading(false);
    })();
  }, [quoteId]);

  const handleAccept = async () => {
    if (!clientSigner.trim()) {
      toast.error("Veuillez saisir votre nom pour valider");
      return;
    }
    setSubmitting(true);
    try {
      const updatedDetails = {
        ...(quote.details || {}),
        acceptedBy: clientSigner.trim(),
        acceptedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("quotes")
        .update({
          status: "accepted",
          details: updatedDetails
        } as any)
        .eq("id", quote.id);

      if (error) throw error;

      setQuote({ ...quote, status: "accepted", details: updatedDetails });
      toast.success("Devis validé avec succès ! Merci pour votre confiance.");
      setAcceptDialogOpen(false);
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      const updatedDetails = {
        ...(quote.details || {}),
        rejectedAt: new Date().toISOString(),
        rejectReason: rejectReason.trim()
      };

      const { error } = await supabase
        .from("quotes")
        .update({
          status: "rejected",
          details: updatedDetails
        } as any)
        .eq("id", quote.id);

      if (error) throw error;

      setQuote({ ...quote, status: "rejected", details: updatedDetails });
      toast.info("Votre réponse a été enregistrée.");
      setRejectDialogOpen(false);
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Chargement de votre devis...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <Card className="max-w-md w-full p-8 space-y-4">
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-bold">Devis introuvable</h2>
          <p className="text-xs text-muted-foreground">
            Le lien de consultation est invalide ou le devis a été archivé. Veuillez contacter notre équipe.
          </p>
        </Card>
      </div>
    );
  }

  const details = quote.details || {};
  const isAccepted = quote.status === "accepted";
  const isRejected = quote.status === "rejected";
  const isPending = !isAccepted && !isRejected;
  const isUiUx = details.isUiUx;
  const breakdown = details.breakdown || {};
  const total = Number(quote.total || breakdown.total || 0);

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Top Banner */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Oprisma Design" className="h-8 w-auto" />
            <div>
              <span className="font-bold text-sm tracking-tight">{companySettings.company}</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">Portail Client</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => window.open(`/devis?id=${quote.id}`, "_blank")}
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Version Imprimable</span>
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                const text = encodeURIComponent(`Bonjour, j'ai une question concernant mon devis #${quote.quote_number || quote.id.slice(0, 8)}`);
                window.open(`https://wa.me/?text=${text}`, "_blank");
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Support WhatsApp</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {/* Status Callout */}
        {isAccepted && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">Devis validé avec succès !</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {details.acceptedBy ? `Accepté par ${details.acceptedBy}` : "Validé en ligne"}{" "}
                {details.acceptedAt && `le ${new Date(details.acceptedAt).toLocaleDateString("fr-DZ")}`}.
                Notre équipe prend en charge la production.
              </p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-red-900 dark:text-red-200">Ce devis a été refusé</h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                {details.rejectReason ? `Motif: "${details.rejectReason}"` : "Le client a décliné cette proposition."}
              </p>
            </div>
          </div>
        )}

        {/* Main Quote Card */}
        <Card className="border shadow-lg rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-semibold text-xs uppercase tracking-wide">
                    Devis #{quote.quote_number || quote.id.slice(0, 8)}
                  </Badge>
                  {isPending && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border-0 gap-1 text-xs">
                      <Clock className="w-3 h-3" /> En attente de votre validation
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-foreground">
                  {quote.product_name || "Prestation Personnalisée"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Émis pour <span className="font-semibold text-foreground">{quote.client_name}</span>
                  {quote.client_company && ` (${quote.client_company})`} · {new Date(quote.created_at).toLocaleDateString("fr-DZ")}
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total TTC</div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-primary tabular-nums mt-0.5">
                  {formatDZD(total)}
                </div>
                {quote.quantity > 1 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Soit {formatDZD(total / quote.quantity)} / unité
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Description & Specs */}
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
                Détail de la prestation
              </h3>

              {isUiUx ? (
                <div className="rounded-2xl border p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-base text-foreground">Conception UI/UX & Design Digital</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Estimation: {details.uiUxHours || 0} heures de design et prototypage interactif
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold">Digital</Badge>
                  </div>

                  {details.selectedUiUxModules && details.selectedUiUxModules.length > 0 && (
                    <div className="pt-2 border-t space-y-1.5">
                      <div className="text-xs font-semibold text-muted-foreground">Modules & Livrables inclus :</div>
                      <div className="grid sm:grid-cols-2 gap-2 text-xs">
                        {details.selectedUiUxModules.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{m.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground text-xs">Quantité commandée</span>
                    <span className="font-semibold tabular-nums">{quote.quantity} exemplaires</span>
                  </div>
                  {details.finishedW && details.finishedH && (
                    <div className="flex justify-between items-center py-1 border-b border-border/50">
                      <span className="text-muted-foreground text-xs">Format fini</span>
                      <span className="font-medium">
                        {(details.finishedW / 10).toFixed(1)} × {(details.finishedH / 10).toFixed(1)} cm
                      </span>
                    </div>
                  )}
                  {details.paperType && (
                    <div className="flex justify-between items-center py-1 border-b border-border/50">
                      <span className="text-muted-foreground text-xs">Support / Papier</span>
                      <span className="font-medium">{details.paperType.name} {details.paperWeight}g</span>
                    </div>
                  )}
                  {details.printType && (
                    <div className="flex justify-between items-center py-1 border-b border-border/50">
                      <span className="text-muted-foreground text-xs">Mode d'impression</span>
                      <span className="font-medium">
                        {details.printType.name} {details.rectoVerso ? "(Recto-Verso)" : "(Recto seul)"}
                      </span>
                    </div>
                  )}
                  {details.selectedFinitionsData?.length > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-border/50">
                      <span className="text-muted-foreground text-xs">Finitions spéciales</span>
                      <span className="font-medium">
                        {details.selectedFinitionsData.map((f: any) => f?.name).filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {details.selectedPelliculagesData?.length > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground text-xs">Pelliculage</span>
                      <span className="font-medium">
                        {details.selectedPelliculagesData.map((p: any) => p?.name).filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Price Summary */}
            <div className="rounded-2xl border p-5 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-medium tabular-nums">{formatDZD(breakdown.subtotal || total)}</span>
              </div>
              {breakdown.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                  <span>Remise commerciale {breakdown.discountType === 'percent' ? `(${breakdown.discountValue}%)` : ''}</span>
                  <span className="tabular-nums">-{formatDZD(breakdown.discountAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="font-bold text-base">Net à payer (TTC)</span>
                <span className="font-black text-xl text-primary tabular-nums">{formatDZD(total)}</span>
              </div>
            </div>

            {/* Notes if present */}
            {details.notes && (
              <div className="p-4 rounded-xl bg-muted/40 text-xs space-y-1">
                <div className="font-semibold text-foreground">Remarques & Modalités :</div>
                <p className="text-muted-foreground whitespace-pre-wrap">{details.notes}</p>
              </div>
            )}

            {/* Client Validation Action Section */}
            {isPending && (
              <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Validation sécurisée avec horodatage et confirmation immédiate.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setRejectDialogOpen(true)}
                    className="flex-1 sm:flex-none border-red-200 hover:bg-red-50 text-red-700 dark:border-red-900 dark:hover:bg-red-950/50"
                  >
                    Décliner
                  </Button>
                  <Button
                    onClick={() => setAcceptDialogOpen(true)}
                    className="flex-1 sm:flex-none gradient-brand text-white border-0 gap-1.5 shadow-md px-6"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accepter & Valider le devis
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Accept Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Confirmation de Validation du Devis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              En confirmant ci-dessous, vous acceptez les conditions tarifaires et techniques du devis #{quote.quote_number || quote.id.slice(0, 8)} d'un montant de <span className="font-bold text-foreground">{formatDZD(total)}</span>.
            </p>
            <div className="space-y-1.5">
              <Label>Nom & Prénom du signataire *</Label>
              <Input
                value={clientSigner}
                onChange={(e) => setClientSigner(e.target.value)}
                placeholder="Votre nom complet"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setAcceptDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleAccept}
              disabled={submitting}
              className="gradient-brand text-white border-0 gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmer la validation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Décliner le devis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Vous pouvez nous préciser la raison pour laquelle cette proposition ne vous convient pas afin que nous puissions adapter notre offre.
            </p>
            <div className="space-y-1.5">
              <Label>Motif du refus (facultatif)</Label>
              <Textarea
                placeholder="Ex: Budget trop élevé, projet reporté, changement de spécifications..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer le refus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
