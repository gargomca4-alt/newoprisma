import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/useRole";
import { Clock, ShieldAlert, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/oprisma-logo.png";
import { toast } from "sonner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    role,
    status,
    isAdmin,
    isPending,
    isRejected,
    isApproved,
    email,
    userName,
    loading: roleLoading,
    refresh,
  } = useRole();

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (!session && location.pathname !== "/auth") {
          navigate("/auth");
          setHasSession(false);
        } else if (session) {
          setHasSession(true);
        }
        setSessionLoading(false);
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (!session && location.pathname !== "/auth") {
          navigate("/auth");
          setHasSession(false);
        } else if (session) {
          setHasSession(true);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleCheckStatus = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.info("Statut actualisé");
    }, 400);
  };

  // If on /auth or /portal, bypass
  if (location.pathname === "/auth" || location.pathname === "/portal") {
    return <>{children}</>;
  }

  // Still checking session or roles
  if (sessionLoading || roleLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-center p-2">
            <img src={logo} alt="Impuls" className="h-8 w-auto animate-pulse dark:hidden" />
            <img src="/logo-dark.png" alt="Impuls" className="h-8 w-auto animate-pulse hidden dark:block" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-xs font-semibold text-muted-foreground tracking-wide">Chargement d'Impuls...</p>
      </div>
    );
  }

  // Not authenticated
  if (!hasSession) {
    return null;
  }

  // If pending approval and not an admin
  if (isPending && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background selection:bg-accent/30 selection:text-foreground">
        <Card className="w-full max-w-lg shadow-sm border border-border rounded-2xl overflow-hidden bg-card">
          <div className="h-2 w-full bg-accent" />
          <CardContent className="p-8 space-y-6 text-center">
            <div className="flex justify-center">
              <img src={logo} alt="Impuls Design" className="h-14 w-auto mb-2 dark:hidden" />
              <img src="/logo-dark.png" alt="Impuls Design" className="h-14 w-auto mb-2 hidden dark:block" />
            </div>

            <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-xs">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 text-accent font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                Compte en attente de validation
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Bienvenue, {userName || "Stagiaire"} !
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Votre compte a bien été créé. Pour des raisons d'organisation et de sécurité, 
                <strong> l'administrateur doit accepter votre accès</strong> avant que vous ne puissiez accéder à la plateforme.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/30 text-left text-xs space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Email :</span>
                <span className="font-semibold text-foreground">{email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Rôle demandé :</span>
                <span className="font-semibold text-foreground">Stagiaire</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Statut actuel :</span>
                <span className="font-bold text-accent">En attente d'approbation</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleCheckStatus}
                disabled={isRefreshing}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl h-11 shadow-xs gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Actualiser mon statut
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="rounded-xl h-11 border-border gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Contactez l'administrateur de l'atelier pour qu'il active votre profil dans l'onglet <strong>Stagiaires</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If rejected / deactivated
  if (isRejected && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md shadow-sm border border-destructive/30 rounded-2xl overflow-hidden bg-card text-center">
          <div className="h-2 w-full bg-destructive" />
          <CardContent className="p-8 space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Accès Suspendu</h2>
            <p className="text-sm text-muted-foreground">
              Votre accès à la plateforme Impuls a été désactivé ou refusé par l'administrateur. Veuillez vous rapprocher du responsable de l'atelier.
            </p>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full rounded-xl h-11 border-border gap-2"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved or Admin: render app
  return <>{children}</>;
}
