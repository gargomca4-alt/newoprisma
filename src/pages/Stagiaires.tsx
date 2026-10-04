import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import {
  Users, CheckCircle2, XCircle, Clock, ShieldCheck, ShieldAlert,
  Search, Plus, Trash2, UserCheck, RefreshCw, FileText, Phone, Mail,
  ExternalLink, UserX, Award
} from "lucide-react";
import { toast } from "sonner";
import { showSuccess, confirmDelete, showError } from "@/lib/alerts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole, StagiaireAccount, getStagiairesList, approveStagiaire, rejectStagiaire, updateStagiaireRole, deleteStagiaire, createStagiaireManual } from "@/lib/useRole";
import { formatDZD } from "@/lib/calc";
import { isQuoteOwnedByUser } from "@/lib/userPricing";
import { logAction } from "@/lib/logger";

export default function StagiairesPage() {
  const { t } = useTranslation();
  const { email: adminEmail, isAdmin, role: currentRole } = useRole();
  const [stagiaires, setStagiaires] = useState<StagiaireAccount[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "stagiaire" as "admin" | "stagiaire",
    status: "approved" as "pending" | "approved",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, quotesRes] = await Promise.all([
        getStagiairesList(),
        supabase.from("quotes").select("*").order("created_at", { ascending: false }),
      ]);
      setStagiaires(list);
      setQuotes(quotesRes.data || []);
    } catch (err) {
      console.error("Error loading stagiaires:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered lists
  const pendingList = useMemo(() => {
    return stagiaires.filter((s) => s.status === "pending" && s.role !== "admin");
  }, [stagiaires]);

  const approvedList = useMemo(() => {
    return stagiaires.filter((s) => s.status === "approved" || s.role === "admin");
  }, [stagiaires]);

  const rejectedList = useMemo(() => {
    return stagiaires.filter((s) => s.status === "rejected");
  }, [stagiaires]);

  // Search filter
  const matchesSearch = (item: StagiaireAccount) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      (item.phone || "").toLowerCase().includes(q)
    );
  };

  // Stats calculation per stagiaire
  const getStagiaireStats = (stagiaire: StagiaireAccount) => {
    const userQuotes = quotes.filter((q) => isQuoteOwnedByUser(q, stagiaire.id, stagiaire.email));
    const totalAmount = userQuotes.reduce((sum, q) => sum + Number(q.total || 0), 0);
    const acceptedCount = userQuotes.filter((q) => q.status === "accepted").length;
    return {
      quoteCount: userQuotes.length,
      totalAmount,
      acceptedCount,
    };
  };

  // Actions
  const handleApprove = async (stagiaire: StagiaireAccount) => {
    const ok = await approveStagiaire(stagiaire.id, adminEmail);
    if (ok) {
      showSuccess("Stagiaire accepté !", `L'accès de ${stagiaire.name || stagiaire.email} est désormais activé.`);
      await logAction(adminEmail, currentRole, "Validation Stagiaire", `Approbation de ${stagiaire.email}`);
      loadData();
    } else {
      showError("Erreur", "Impossible de valider le stagiaire.");
    }
  };

  const handleReject = async (stagiaire: StagiaireAccount) => {
    const ok = await rejectStagiaire(stagiaire.id);
    if (ok) {
      toast.info(`Accès de ${stagiaire.name || stagiaire.email} refusé/suspendu.`);
      await logAction(adminEmail, currentRole, "Refus Stagiaire", `Refus de ${stagiaire.email}`);
      loadData();
    }
  };

  const handleToggleRole = async (stagiaire: StagiaireAccount) => {
    const newRole = stagiaire.role === "admin" ? "stagiaire" : "admin";
    const ok = await updateStagiaireRole(stagiaire.id, newRole);
    if (ok) {
      showSuccess("Rôle mis à jour", `${stagiaire.name} est maintenant ${newRole === "admin" ? "Administrateur" : "Stagiaire"}.`);
      await logAction(adminEmail, currentRole, "Modification Rôle", `${stagiaire.email} -> ${newRole}`);
      loadData();
    }
  };

  const handleDelete = async (stagiaire: StagiaireAccount) => {
    const confirmed = await confirmDelete(
      `Supprimer ${stagiaire.name || stagiaire.email} ?`,
      "Cette action retirera ce compte de la liste d'accès."
    );
    if (confirmed) {
      const ok = await deleteStagiaire(stagiaire.id);
      if (ok) {
        toast.success("Compte retiré avec succès.");
        await logAction(adminEmail, currentRole, "Suppression Stagiaire", `Supprimé: ${stagiaire.email}`);
        loadData();
      }
    }
  };

  const handleManualAdd = async () => {
    if (!form.email.trim()) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }
    const ok = await createStagiaireManual({
      email: form.email.trim(),
      name: form.name.trim() || form.email.split("@")[0],
      phone: form.phone.trim(),
      role: form.role,
      status: form.status,
      notes: form.notes,
      approvedBy: adminEmail,
    });
    if (ok) {
      showSuccess("Stagiaire ajouté", "Le compte a été enregistré avec succès.");
      setDialogOpen(false);
      setForm({ name: "", email: "", phone: "", role: "stagiaire", status: "approved", notes: "" });
      loadData();
    } else {
      showError("Erreur", "Une erreur est survenue lors de l'ajout.");
    }
  };

  return (
    <div className="space-y-6 pb-12 selection:bg-accent/30 selection:text-foreground">
      {/* Header */}
      <PageHeader
        icon={Users}
        title="Gestion des Stagiaires & Accès"
        description="Contrôlez les demandes d'accès, validez les nouveaux stagiaires et suivez l'activité de votre équipe."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl border-border h-9 gap-1.5 shadow-xs text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Actualiser</span>
            </Button>
            <Button
              onClick={() => setDialogOpen(true)}
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl h-9 shadow-xs text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un Stagiaire</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="rounded-xl sm:rounded-2xl border border-border shadow-xs bg-card">
          <CardContent className="p-3 sm:p-5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Total Comptes
              </p>
              <h3 className="text-lg sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{stagiaires.length}</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">Enregistrés</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className={`rounded-xl sm:rounded-2xl border shadow-xs bg-card transition-all ${pendingList.length > 0 ? "border-accent ring-1 ring-accent/30" : "border-border"}`}>
          <CardContent className="p-3 sm:p-5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] sm:text-xs font-semibold text-accent uppercase tracking-wider truncate">
                  En Attente
                </p>
                {pendingList.length > 0 && (
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent animate-ping" />
                )}
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{pendingList.length}</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">À valider</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl sm:rounded-2xl border border-border shadow-xs bg-card">
          <CardContent className="p-3 sm:p-5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-emerald-500 uppercase tracking-wider truncate">
                Actifs
              </p>
              <h3 className="text-lg sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{approvedList.length}</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">Autorisés</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl sm:rounded-2xl border border-border shadow-xs bg-card">
          <CardContent className="p-3 sm:p-5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Devis Créés
              </p>
              <h3 className="text-lg sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{quotes.length}</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">Par l'équipe</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou téléphone..."
            className="pl-9 h-10 rounded-xl bg-card border-border shadow-xs"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-3 rounded-xl bg-muted/60 p-1 border border-border">
            <TabsTrigger value="pending" className="rounded-lg text-xs font-semibold relative">
              En attente
              {pendingList.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-accent text-accent-foreground text-[10px] font-black">
                  {pendingList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg text-xs font-semibold">
              Actifs ({approvedList.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg text-xs font-semibold">
              Tous ({stagiaires.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab: Pending Approval */}
      {activeTab === "pending" && (
        <div className="space-y-3">
          {pendingList.filter(matchesSearch).length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-border bg-card/50">
              <CardContent className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-foreground">Aucune demande en attente</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Tous les stagiaires enregistrés ont été traités. Dès qu'un nouveau stagiaire crée un compte, sa demande apparaîtra ici.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingList.filter(matchesSearch).map((stagiaire) => (
              <Card key={stagiaire.id} className="rounded-2xl border border-accent/40 shadow-xs bg-card hover:border-accent transition-all overflow-hidden">
                <div className="h-1 w-full bg-accent" />
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent font-black text-base flex items-center justify-center shrink-0">
                      {stagiaire.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-foreground">{stagiaire.name}</h4>
                        <Badge variant="outline" className="bg-accent/15 text-accent border-accent/30 text-[10px] font-bold">
                          Nouveau compte
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {stagiaire.email}
                        </span>
                        {stagiaire.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {stagiaire.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Inscrit le {new Date(stagiaire.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    <Button
                      onClick={() => handleApprove(stagiaire)}
                      size="sm"
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 shadow-xs gap-1.5 text-xs px-4"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accepter l'accès</span>
                    </Button>
                    <Button
                      onClick={() => handleReject(stagiaire)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-10 border-border text-destructive hover:bg-destructive/10 text-xs px-3"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Refuser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab: Approved Active Stagiaires */}
      {activeTab === "approved" && (
        <div className="space-y-3">
          {approvedList.filter(matchesSearch).length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-border bg-card/50">
              <CardContent className="p-12 text-center text-muted-foreground text-xs">
                Aucun stagiaire trouvé.
              </CardContent>
            </Card>
          ) : (
            approvedList.filter(matchesSearch).map((stagiaire) => {
              const stats = getStagiaireStats(stagiaire);
              const isCurrent = stagiaire.email.toLowerCase() === adminEmail.toLowerCase();
              return (
                <Card key={stagiaire.id} className="rounded-2xl border border-border shadow-xs bg-card hover:border-primary/40 transition-all">
                  <CardContent className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 ${
                        stagiaire.role === "admin"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted text-foreground border border-border"
                      }`}>
                        {stagiaire.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-foreground">{stagiaire.name}</h4>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              (Vous)
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              stagiaire.role === "admin"
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {stagiaire.role === "admin" ? "Administrateur" : "Stagiaire"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" /> {stagiaire.email}
                          </span>
                          {stagiaire.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> {stagiaire.phone}
                            </span>
                          )}
                          <span>
                            Actif depuis le {new Date(stagiaire.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stagiaire Performance Metrics */}
                    <div className="flex items-center gap-4 py-2 px-3 rounded-xl bg-muted/30 border border-border/50 text-xs w-full lg:w-auto justify-between lg:justify-start">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Devis créés</div>
                        <div className="font-bold text-foreground">{stats.quoteCount} devis</div>
                      </div>
                      <div className="h-6 w-px bg-border" />
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Volume CA</div>
                        <div className="font-bold text-primary">{formatDZD(stats.totalAmount)}</div>
                      </div>
                    </div>

                    {/* Control Actions */}
                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                      {!isCurrent && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRole(stagiaire)}
                            className="rounded-xl h-9 border-border text-xs gap-1.5"
                          >
                            <Award className="w-3.5 h-3.5 text-primary" />
                            <span>{stagiaire.role === "admin" ? "Rétrograder Stagiaire" : "Promouvoir Admin"}</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(stagiaire)}
                            className="rounded-xl h-9 border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
                            title="Bloquer l'accès"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(stagiaire)}
                            className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Tab: All Accounts (including rejected) */}
      {activeTab === "all" && (
        <div className="space-y-3">
          {stagiaires.filter(matchesSearch).map((stagiaire) => (
            <Card key={stagiaire.id} className="rounded-2xl border border-border shadow-xs bg-card">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-sm">
                    {stagiaire.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{stagiaire.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          stagiaire.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : stagiaire.status === "pending"
                            ? "bg-accent/15 text-accent border-accent/30"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        }`}
                      >
                        {stagiaire.status === "approved" ? "Approuvé" : stagiaire.status === "pending" ? "En attente" : "Refusé"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{stagiaire.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {stagiaire.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(stagiaire)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 text-xs font-bold"
                    >
                      Accepter
                    </Button>
                  )}
                  {stagiaire.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(stagiaire)}
                      className="rounded-xl h-8 text-xs border-border"
                    >
                      Réactiver
                    </Button>
                  )}
                  {stagiaire.email.toLowerCase() !== adminEmail.toLowerCase() && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(stagiaire)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Ajouter un Stagiaire manuellement */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Ajouter un Stagiaire ou Utilisateur</DialogTitle>
            <CardDescription className="text-xs">
              Pré-approuvez un stagiaire pour qu'il puisse se connecter directement sans attendre.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom & Prénom</Label>
              <Input
                placeholder="Ex: Yacine Benali"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                placeholder="stagiaire@oprisma.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-10 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Numéro de téléphone (optionnel)</Label>
              <Input
                placeholder="0550..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Rôle</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as any })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stagiaire">Stagiaire</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Statut immédiat</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as any })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approuvé direct</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes / Remarques</Label>
              <Input
                placeholder="Ex: Stage PFE 2026..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl h-10 border-border"
            >
              Annuler
            </Button>
            <Button
              onClick={handleManualAdd}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl h-10 shadow-xs"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
