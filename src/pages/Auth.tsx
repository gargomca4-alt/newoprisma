import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
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
          email,
          password,
        });
        if (error) throw error;
        toast.success("Connexion réussie");
        navigate("/");
      } else if (view === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Inscription réussie. Vérifiez votre boîte mail si nécessaire.");
        if (!error) {
           const { data: { session } } = await supabase.auth.getSession();
           if (session) navigate("/");
           else setView('login');
        }
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/",
        });
        if (error) throw error;
        toast.success("Lien de réinitialisation envoyé ! Vérifiez votre boîte mail.");
        setView('login');
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[100px]"></div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center z-10">
        
        {/* Left Side: Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-6 p-8">
          <img src="/logo.png" alt="Oprisma Design" className="w-48 mb-8" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Bienvenue sur l'espace <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">Oprisma Design</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Gérez vos devis d'impression, vos produits, papiers, finitions et clients depuis une interface unique et professionnelle.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex-1 p-4 rounded-2xl bg-white border shadow-sm">
              <div className="font-semibold text-primary mb-1">Calculs précis</div>
              <div className="text-xs text-muted-foreground">Offset, numérique et grand format</div>
            </div>
            <div className="flex-1 p-4 rounded-2xl bg-white border shadow-sm">
              <div className="font-semibold text-secondary mb-1">Devis pro</div>
              <div className="text-xs text-muted-foreground">Générez des devis professionnels</div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <Card className="w-full max-w-md mx-auto shadow-2xl border-0 overflow-hidden">
          <div className="h-2 w-full gradient-brand"></div>
          <CardHeader className="pt-8 pb-4">
            <div className="md:hidden flex justify-center mb-6">
              <img src="/logo.png" alt="Oprisma Design" className="h-12" />
            </div>
            <CardTitle className="text-2xl text-center">
              {view === 'login' ? "Connexion" : view === 'signup' ? "Créer un compte" : "Mot de passe oublié"}
            </CardTitle>
            <CardDescription className="text-center">
              {view === 'login' && "Entrez vos identifiants pour accéder à votre espace"}
              {view === 'signup' && "Remplissez les champs pour créer un nouvel accès"}
              {view === 'forgot' && "Entrez votre email pour recevoir un lien de réinitialisation"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@oprisma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              
              {view !== 'forgot' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    {view === 'login' && (
                      <button type="button" onClick={() => setView('forgot')} className="text-xs text-primary hover:underline font-medium">
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              )}
              
              <Button type="submit" className="w-full h-11 gradient-brand text-white border-0 shadow-md font-semibold mt-6" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  view === 'login' ? "Se connecter" : 
                  view === 'signup' ? "S'inscrire" : 
                  "Envoyer le lien"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pb-8 justify-center flex-col gap-2">
            {view === 'forgot' ? (
              <p className="text-sm text-muted-foreground">
                Vous vous souvenez de votre mot de passe ?
                <button type="button" onClick={() => setView('login')} className="ml-1 text-primary font-semibold hover:underline">
                  Retour à la connexion
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {view === 'login' ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                <button
                  type="button"
                  onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                  className="ml-1 text-primary font-semibold hover:underline"
                >
                  {view === 'login' ? "S'inscrire" : "Se connecter"}
                </button>
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
