import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/lib/alerts";
import { Loader2, Sparkles, ArrowRight, Eye, EyeOff, CheckCircle2, Clock } from "lucide-react";
import { createStagiaireManual } from "@/lib/useRole";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/",
        });
        if (error) throw error;
        showSuccess("Email envoyé", "Vérifiez votre boîte mail pour réinitialiser le mot de passe.");
        setIsForgot(false);
      } else if (!isSignUp) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        showSuccess("Connexion réussie", "Bienvenue sur votre espace Impuls Design.");
        navigate("/");
      } else {
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

        // Register the stagiaire as auto-approved so they can access the app immediately
        try {
          await createStagiaireManual({
            email: cleanEmail,
            name: cleanName,
            role: "stagiaire",
            status: "approved",
          });
        } catch (err) {
          console.warn("Stagiaire auto-registration fallback:", err);
        }

        showSuccess(
          "Compte créé avec succès !",
          "Bienvenue ! Votre compte est activé et vous pouvez commencer à utiliser la plateforme."
        );

        // Small delay to let the session propagate before navigating
        await new Promise((r) => setTimeout(r, 300));
        navigate("/");
      }
    } catch (error: any) {
      showError("Erreur d'authentification", error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 bg-slate-100/90 dark:bg-slate-950 relative overflow-hidden select-none selection:bg-accent/30 selection:text-foreground">
      
      {/* Background ambient brand lights (Deep Purple & Warm Gold) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 dark:bg-primary/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/20 dark:bg-accent/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 dark:bg-primary/15 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-card border border-border/80 rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10">
        
        {/* DESKTOP / TABLET SLIDING LAYOUT (Hidden on mobile) */}
        <div className="hidden md:grid md:grid-cols-2 relative min-h-[580px]">
          
          {/* LEFT PANEL: Form when Sign Up, or Overlay when Sign In */}
          <div className="p-8 lg:p-12 flex flex-col justify-center relative z-10 transition-all duration-700 ease-in-out">
            {!isSignUp ? (
              /* Overlay Content for Sign In state (Left side) */
              <div className="h-full flex flex-col justify-between py-4 text-white z-20">
                <div className="flex items-center gap-2.5">
                  <img src="/logo-dark.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
                  <span className="font-extrabold tracking-wider text-sm uppercase text-white">Impuls Design</span>
                </div>

                <div className="space-y-4 my-auto py-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-sm border border-white/15">
                    <Sparkles className="w-3.5 h-3.5 text-accent" /> Espace Studio & Atelier
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
                    Welcome Back !
                  </h2>
                  <p className="text-sm text-purple-100/90 leading-relaxed max-w-xs font-medium">
                    Pour rester connecté avec l'atelier, connectez-vous avec vos identifiants personnels.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(true); setIsForgot(false); }}
                      className="px-8 py-3 rounded-full border-2 border-white text-white font-black text-xs tracking-wider uppercase hover:bg-accent hover:border-accent hover:text-accent-foreground transition-all duration-300 shadow-lg hover:shadow-glow hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      S'INSCRIRE
                    </button>
                  </div>
                </div>

                {/* Micro details */}
                <div className="text-[11px] text-purple-200/70 font-medium">
                  © {new Date().getFullYear()} Impuls Design · Atelier Print & Digital
                </div>
              </div>
            ) : (
              /* Sign Up Form (Left side when isSignUp is true) */
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">
                    Créer un compte
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Inscription réservée aux stagiaires et membres de l'équipe
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nom complet</Label>
                    <Input
                      type="text"
                      placeholder="Ex: Mohamed Kaci"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-10 rounded-xl bg-muted/40 border-border"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Adresse email</Label>
                    <Input
                      type="email"
                      placeholder="nom@impuls.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 rounded-xl bg-muted/40 border-border"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-10 rounded-xl pr-10 bg-muted/40 border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>Votre compte sera activé immédiatement après l'inscription.</span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-xl shadow-glow transition-all hover:scale-[1.01]"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                    <span>Créer mon compte</span>
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Form when Sign In, or Overlay when Sign Up */}
          <div className="p-8 lg:p-12 flex flex-col justify-center relative z-10 transition-all duration-700 ease-in-out">
            {!isSignUp ? (
              /* Sign In Form (Right side when isSignUp is false) */
              <div className="space-y-5 animate-fade-in max-w-sm mx-auto w-full">
                <div>
                  <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">
                    {isForgot ? "Mot de passe oublié" : "Connexion"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {isForgot
                      ? "Saisissez votre email pour recevoir les instructions"
                      : "Accédez à votre plateforme d'estimation & devis"}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Adresse email</Label>
                    <Input
                      type="email"
                      placeholder="nom@impuls.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 rounded-xl bg-muted/40 border-border"
                    />
                  </div>

                  {!isForgot && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Mot de passe</Label>
                        <button
                          type="button"
                          onClick={() => setIsForgot(true)}
                          className="text-[11px] text-accent font-bold hover:underline"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-10 rounded-xl pr-10 bg-muted/40 border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-xl shadow-glow transition-all hover:scale-[1.01] mt-2"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    <span>{isForgot ? "Envoyer le lien" : "Se connecter"}</span>
                  </Button>

                  {isForgot && (
                    <button
                      type="button"
                      onClick={() => setIsForgot(false)}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-semibold pt-1 cursor-pointer"
                    >
                      ← Retour à la connexion
                    </button>
                  )}
                </form>
              </div>
            ) : (
              /* Overlay Content for Sign Up state (Right side) */
              <div className="h-full flex flex-col justify-between py-4 text-white z-20">
                <div className="flex items-center justify-end gap-2.5">
                  <span className="font-extrabold tracking-wider text-sm uppercase text-white">Impuls Design</span>
                  <img src="/logo-dark.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
                </div>

                <div className="space-y-4 my-auto py-6 text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-sm border border-white/15">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Déjà membre de l'atelier ?
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
                    Ravi de vous revoir !
                  </h2>
                  <p className="text-sm text-purple-100/90 leading-relaxed max-w-xs font-medium ml-auto">
                    Connectez-vous directement pour accéder à vos devis récents et calculs d'imprimerie.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(false); setIsForgot(false); }}
                      className="px-8 py-3 rounded-full border-2 border-white text-white font-black text-xs tracking-wider uppercase hover:bg-accent hover:border-accent hover:text-accent-foreground transition-all duration-300 shadow-lg hover:shadow-glow hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      SE CONNECTER
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-purple-200/70 font-medium text-right">
                  Impuls Design · Évènementiel & Print
                </div>
              </div>
            )}
          </div>

          {/* THE SLIDING COLORED OVERLAY WITH ORGANIC WAVY EDGE & ANIMATED ILLUSTRATION (Deep Purple Brand Gradient) */}
          <div
            className={`absolute top-0 bottom-0 w-1/2 bg-gradient-to-br from-[#42287B] via-[#331C61] to-[#211042] transition-transform duration-700 ease-in-out z-0 pointer-events-none overflow-hidden ${
              isSignUp ? "translate-x-full" : "translate-x-0"
            }`}
          >
            {/* Organic geometric bubbles in background */}
            <div className="absolute top-6 left-6 w-20 h-20 rounded-2xl border-4 border-white/10 rotate-12 animate-float-slow pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-28 h-28 rounded-full border-4 border-accent/20 animate-float-reverse pointer-events-none" />
            <div className="absolute top-1/3 right-8 w-14 h-14 rounded-xl bg-accent/10 rotate-45 pointer-events-none" />

            {/* Organic Wavy Edge Divider */}
            {!isSignUp ? (
              /* Right Wavy Edge */
              <svg
                viewBox="0 0 100 500"
                preserveAspectRatio="none"
                className="absolute top-0 -right-1 h-full w-14 lg:w-20 text-card fill-current z-10 pointer-events-none"
              >
                <path d="M 100,0 L 0,0 C 45,45 65,95 40,145 C 15,195 80,240 70,290 C 60,340 15,385 45,435 C 65,470 30,490 0,500 L 100,500 Z" />
              </svg>
            ) : (
              /* Left Wavy Edge */
              <svg
                viewBox="0 0 100 500"
                preserveAspectRatio="none"
                className="absolute top-0 -left-1 h-full w-14 lg:w-20 text-card fill-current z-10 pointer-events-none"
              >
                <path d="M 0,0 L 100,0 C 55,45 35,95 60,145 C 85,195 20,240 30,290 C 40,340 85,385 55,435 C 35,470 70,490 100,500 L 0,500 Z" />
              </svg>
            )}

            {/* CENTERED LOGO */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <img 
                src="/logo-dark.png" 
                alt="Impuls Design" 
                className="w-48 h-48 lg:w-56 lg:h-56 object-contain animate-float-slow drop-shadow-2xl opacity-80"
              />
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT (< 768px): Seamless Adaptive View with Brand Purple Banner */}
        <div className="md:hidden flex flex-col">
          
          {/* Animated Wavy Header Banner (Deep Royal Purple & Warm Gold) */}
          <div className="relative bg-gradient-to-br from-[#42287B] via-[#331C61] to-[#211042] text-white pt-8 pb-12 px-6 overflow-hidden">
            {/* Ambient micro-shapes */}
            <div className="absolute top-3 left-3 w-12 h-12 rounded-xl border-2 border-white/15 rotate-12 animate-float-slow pointer-events-none" />
            <div className="absolute top-6 right-6 w-8 h-8 rounded-lg border-2 border-accent/25 rotate-45 animate-float-reverse pointer-events-none" />
            <div className="absolute bottom-6 right-16 w-16 h-16 border-2 border-dashed border-accent/25 rounded-full animate-spin-slow pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-2">
              <img src="/logo-dark.png" alt="Impuls Design" className="w-16 h-16 object-contain drop-shadow-lg mb-1" />
              <h2 className="text-2xl font-black tracking-tight text-white">
                {isSignUp ? "Rejoignez l'Atelier" : "Welcome Back !"}
              </h2>
              <p className="text-xs text-purple-100/90 max-w-xs font-medium">
                {isSignUp
                  ? "Créez votre compte stagiaire pour commencer"
                  : "Connectez-vous à votre espace Impuls Design"}
              </p>
            </div>

            {/* Bottom organic wavy divider into card body */}
            <svg
              viewBox="0 0 500 50"
              preserveAspectRatio="none"
              className="absolute -bottom-1 left-0 right-0 w-full h-8 text-card fill-current pointer-events-none"
            >
              <path d="M 0,50 L 0,15 C 75,35 150,0 250,25 C 350,45 425,10 500,30 L 500,50 Z" />
            </svg>
          </div>

          {/* Form Card Content */}
          <div className="p-5 sm:p-6 space-y-5">
            
            {/* Segmented Pill Switcher with Brand Styling */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-muted/60 border border-border">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setIsForgot(false); }}
                className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
                  !isSignUp
                    ? "bg-primary text-primary-foreground shadow-brand"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setIsForgot(false); }}
                className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
                  isSignUp
                    ? "bg-primary text-primary-foreground shadow-brand"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Inscription
              </button>
            </div>

            {/* Mobile Form */}
            <form onSubmit={handleAuth} className="space-y-3.5">
              {isSignUp && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nom complet</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Mohamed Kaci"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-10 rounded-xl bg-muted/40 border-border"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Adresse email</Label>
                <Input
                  type="email"
                  placeholder="nom@impuls.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 rounded-xl bg-muted/40 border-border"
                />
              </div>

              {!isForgot && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Mot de passe</Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setIsForgot(true)}
                        className="text-[11px] text-accent font-bold hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 rounded-xl pr-10 bg-muted/40 border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {isSignUp && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>Accès immédiat après inscription — commencez à travailler directement.</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-xl shadow-glow transition-all"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                <span>
                  {isForgot
                    ? "Envoyer le lien"
                    : isSignUp
                    ? "Créer mon compte stagiaire"
                    : "Se connecter"}
                </span>
              </Button>

              {isForgot && (
                <button
                  type="button"
                  onClick={() => setIsForgot(false)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-semibold pt-1 cursor-pointer"
                >
                  ← Retour à la connexion
                </button>
              )}
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
