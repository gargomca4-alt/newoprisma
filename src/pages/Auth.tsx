import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/lib/alerts";
import { Loader2, ShieldCheck, Clock, UserCheck } from "lucide-react";
import { createStagiaireManual } from "@/lib/useRole";

export default function Auth() {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        showSuccess("Connexion réussie", "Bienvenue sur votre espace Oprisma.");
        navigate("/");
      } else if (view === 'signup') {
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = fullName.trim() || cleanEmail.split("@")[0];

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
            },
          },
        });
        if (signUpError) throw signUpError;

        // Auto sign-in if session was not attached to signUpData
        let activeSession = signUpData?.session;
        if (!activeSession) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (!signInError && signInData?.session) {
            activeSession = signInData.session;
          }
        }

        // Register in stagiaires list as pending
        try {
          await createStagiaireManual({
            email: cleanEmail,
            name: cleanName,
            role: "stagiaire",
            status: "pending",
          });
        } catch (e) {
          console.warn("Pending stagiaire registration fallback:", e);
        }

        showSuccess(
          "Compte créé avec succès !",
          "Votre compte est ouvert. Il est en attente d'approbation par l'administrateur."
        );

        if (activeSession) {
          navigate("/");
        } else {
          // If session could not be established immediately, navigate or prompt login
          navigate("/");
        }
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/",
        });
        if (error) throw error;
        showSuccess("Email envoyé", "Vérifiez votre boîte mail pour réinitialiser le mot de passe.");
        setView('login');
      }
    } catch (error: any) {
      showError("Erreur d'authentification", error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background selection:bg-accent/30 selection:text-foreground">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center z-10">
        
        {/* Left Side: Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-6 p-8">
          <img src="/logo-light.png" alt="Impuls Designer Graphique" className="w-40 mb-6 dark:hidden" />
          <img src="/logo-dark.png" alt="Impuls Designer Graphique" className="w-40 mb-6 hidden dark:block" />
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Espace Atelier & Devis <br/>
            <span className="text-primary font-black">Impuls Design</span>
          </h1>
          <p className="text-base text-muted-foreground font-medium leading-relaxed">
            Plateforme complète d'estimation, calcul technique d'impression (Offset, Numérique, Finitions) et gestion d'équipe.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground">Accès Stagiaires Contrôlé</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Chaque stagiaire crée son compte et attend la validation de l'administrateur.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground">Isolation & Confidentialité</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Chaque stagiaire voit et gère uniquement ses propres devis et calculs.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <Card className="w-full max-w-md mx-auto shadow-sm border border-border rounded-2xl overflow-hidden bg-card">
          <div className="h-1.5 w-full bg-accent"></div>
          <CardHeader className="pt-5 sm:pt-8 pb-3 sm:pb-4 px-4 sm:px-6">
            <div className="md:hidden flex justify-center mb-3 sm:mb-6">
              <img src="/logo-light.png" alt="Impuls" className="h-10 sm:h-14 dark:hidden" />
              <img src="/logo-dark.png" alt="Impuls" className="h-10 sm:h-14 hidden dark:block" />
            </div>
            <CardTitle className="text-xl sm:text-2xl text-center font-bold tracking-tight">
              {view === 'login' ? "Connexion" : view === 'signup' ? "Créer un compte stagiaire" : "Mot de passe oublié"}
            </CardTitle>
            <CardDescription className="text-center text-xs">
              {view === 'login' && "Entrez vos identifiants pour accéder à votre espace"}
              {view === 'signup' && "Inscription pour stagiaires et collaborateurs d'atelier"}
              {view === 'forgot' && "Entrez votre email pour recevoir les instructions"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-5 sm:pb-6">
            <form onSubmit={handleAuth} className="space-y-4">
              {view === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullname">Nom & Prénom</Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="Ex: Mohamed Kaci"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@oprisma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              
              {view !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    {view === 'login' && (
                      <button
                        type="button"
                        onClick={() => setView('forgot')}
                        className="text-xs text-accent font-semibold hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
              )}

              {view === 'signup' && (
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent shrink-0" />
                  <span>Votre compte sera en attente d'approbation par le superviseur.</span>
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-xs font-bold mt-4"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  view === 'login' ? "Se connecter" : 
                  view === 'signup' ? "Créer mon compte stagiaire" : 
                  "Envoyer le lien"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pb-8 justify-center flex-col gap-2">
            {view === 'forgot' ? (
              <p className="text-xs text-muted-foreground">
                Vous vous souvenez de votre mot de passe ?
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="ml-1 text-accent font-bold hover:underline"
                >
                  Retour à la connexion
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {view === 'login' ? "Nouveau stagiaire ?" : "Vous avez déjà un compte ?"}
                <button
                  type="button"
                  onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                  className="ml-1 text-accent font-bold hover:underline"
                >
                  {view === 'login' ? "Créer un compte stagiaire" : "Se connecter"}
                </button>
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
