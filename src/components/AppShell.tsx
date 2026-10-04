import { ReactNode, useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3, Calculator, Package, Layers, Printer, Sparkles, FileText,
  Settings, Moon, Sun, Globe, Wallet, Users, LogOut, Menu, History,
  Receipt, Bell, AlertTriangle, ArrowRight
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import logo from "@/assets/oprisma-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useRole, getStagiairesList } from "@/lib/useRole";
import { isQuoteOwnedByUser } from "@/lib/userPricing";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { isAdmin, email, userId } = useRole();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingStagiairesCount, setPendingStagiairesCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; title: string; desc: string; link: string; type: 'warning' | 'info' }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const notifs: any[] = [];

        // If admin, check for pending stagiaires
        if (isAdmin) {
          const list = await getStagiairesList();
          const pending = list.filter((s) => s.status === "pending" && s.role !== "admin");
          setPendingStagiairesCount(pending.length);
          if (pending.length > 0) {
            notifs.push({
              id: "pending-stagiaires",
              title: `${pending.length} stagiaire(s) en attente`,
              desc: "Nouvelles demandes d'accès à valider.",
              link: "/stagiaires",
              type: "warning",
            });
          }
        }

        const { data: quotes } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
        if (!quotes) {
          setNotifications(notifs);
          return;
        }

        // Scope quotes if not admin
        const myQuotes = !isAdmin ? quotes.filter((q) => isQuoteOwnedByUser(q, userId, email)) : quotes;

        const now = Date.now();
        // 1. Pending quotes older than 48 hours
        const pendingOld = myQuotes.filter(q => q.status === "pending" && (now - new Date(q.created_at).getTime()) > 48 * 3600 * 1000);
        if (pendingOld.length > 0) {
          notifs.push({
            id: "pending-quotes",
            title: `${pendingOld.length} devis à relancer`,
            desc: "Ces devis sont en attente depuis plus de 48h.",
            link: "/quotes",
            type: "warning"
          });
        }

        // 2. Unpaid balances
        const unpaid = myQuotes.filter(q => {
          const total = Number(q.total || 0);
          const paid = Number((q.details as any)?.paidAmount || 0);
          return (q.status === "accepted" || paid > 0) && (total - paid > 0);
        });
        if (unpaid.length > 0) {
          notifs.push({
            id: "unpaid-debts",
            title: `${unpaid.length} créances à encaisser`,
            desc: "Devis ou factures avec solde restant.",
            link: "/payment",
            type: "info"
          });
        }

        setNotifications(notifs);
      } catch (e) {}
    })();
  }, [isAdmin, email, userId]);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        try {
          new Notification("Oprisma Design", {
            body: "Les notifications système sont activées !",
            icon: logo
          });
        } catch {}
        toast.success("Notifications système activées !");
      } else {
        toast.info("Notifications refusées par le navigateur.");
      }
    } else {
      toast.info("Notifications non supportées sur ce navigateur.");
    }
  };

  const navGroups = [
    {
      title: "GESTION & DEVIS",
      items: [
        { to: "/", icon: BarChart3, label: t("nav.dashboard"), adminOnly: false },
        { to: "/calculator", icon: Calculator, label: t("nav.calculator"), adminOnly: false, isCta: true },
        { to: "/quotes", icon: FileText, label: t("nav.quotes"), adminOnly: false },
        { to: "/invoices", icon: Receipt, label: "Factures", adminOnly: false },
        { to: "/payment", icon: Wallet, label: t("nav.payment"), adminOnly: false },
      ],
    },
    {
      title: "PRODUCTION & ATELIER",
      items: [
        { to: "/products", icon: Package, label: t("nav.products"), adminOnly: false },
        { to: "/paper", icon: Layers, label: t("nav.paper"), adminOnly: false },
        { to: "/print", icon: Printer, label: t("nav.print"), adminOnly: false },
        { to: "/finitions", icon: Sparkles, label: t("nav.finitions"), adminOnly: false },
      ],
    },
    {
      title: "RELATIONS & SYSTÈME",
      items: [
        { to: "/stagiaires", icon: Users, label: "Stagiaires", adminOnly: true, badgeCount: pendingStagiairesCount },
        { to: "/logs", icon: History, label: "Logs", adminOnly: true },
        { to: "/settings", icon: Settings, label: t("nav.settings"), adminOnly: true },
      ],
    },
  ];

  const flatNavItems = navGroups.flatMap(g => g.items).filter(item => !item.adminOnly || isAdmin);

  const langs = [
    { code: "fr", label: "Français" },
    { code: "ar", label: "العربية" },
    { code: "en", label: "English" },
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-accent/30 selection:text-foreground">
      {/* Top bar (Apple Translucent Header) */}
      <header className="sticky top-0 z-40 w-full bg-card/85 backdrop-blur-xl border-b border-border no-print shadow-xs">
        <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5 group shrink-0">
            <img src={logo} alt="Impuls" className="h-10 w-auto transition-transform duration-300 group-hover:scale-105 dark:hidden" />
            <img src="/logo-dark.png" alt="Impuls" className="h-10 w-auto transition-transform duration-300 group-hover:scale-105 hidden dark:block" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground leading-tight tracking-tight">Impuls Design</h1>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground font-black">
                  PRO
                </span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground leading-tight mt-0.5">Designer Graphique · Print · Marketing</p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            {/* Quick action header CTA (Solid Amber) */}
            <Button asChild size="sm" className="hidden sm:inline-flex bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-full px-4 h-9 shadow-xs text-xs gap-1.5 transition-all duration-200 hover:scale-[1.02]">
              <Link to="/calculator">
                <Calculator className="w-3.5 h-3.5" />
                <span>Nouveau Devis</span>
              </Link>
            </Button>

            {/* Notifications Center */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative rounded-full shadow-xs border-border hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-smooth">
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-black text-accent-foreground">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl shadow-xl p-2 border-border/80 glass-card">
                <div className="flex items-center justify-between p-2 border-b border-border/50">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications & Alertes</span>
                  <button
                    onClick={requestNotificationPermission}
                    className="text-[10px] text-accent font-bold hover:underline"
                  >
                    Activer alertes
                  </button>
                </div>
                <div className="py-1 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground font-medium">
                      ✨ Tout est à jour ! Aucune alerte active.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <Link
                        key={n.id}
                        to={n.link}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted/60 transition-colors text-xs"
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${n.type === 'warning' ? 'bg-accent/15 text-accent' : 'bg-primary/10 text-primary'}`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">{n.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{n.desc}</div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full border-border hover:bg-muted/80 transition-smooth shadow-xs">
                  <Globe className="h-4 w-4 text-accent" />
                  <span className="font-bold text-xs hidden sm:inline-block">{i18n.language === "ar" ? "العربية" : i18n.language === "fr" ? "Français" : "English"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px] rounded-xl shadow-lg border-border glass-card">
                {langs.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => i18n.changeLanguage(l.code)} className={i18n.language === l.code ? "font-bold text-primary dark:text-accent" : "font-medium"}>
                    {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark / Light Toggle */}
            <Button variant="outline" size="icon" className="rounded-full shadow-xs border-border hover:bg-muted/80 text-muted-foreground transition-smooth" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-4 w-4 text-accent" /> : <Moon className="h-4 w-4 text-primary" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 flex gap-6 lg:gap-8 py-4 sm:py-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 no-print">
          <div className="sticky top-28 flex flex-col h-[calc(100vh-9rem)] glass-card rounded-2xl p-3 shadow-md border-border/80">
            <nav className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin">
              {navGroups.map((group, gIdx) => {
                const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
                if (visibleItems.length === 0) return null;

                return (
                  <div key={gIdx} className="space-y-1">
                    <div className="px-3 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        {group.title}
                      </span>
                    </div>
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 relative group ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-brand"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/65"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon className={`h-4 w-4 relative z-10 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-accent' : ''}`} />
                            <span className="relative z-10 truncate">{item.label}</span>
                            {isActive ? (
                              <span className="ml-auto w-2 h-2 rounded-full bg-accent shadow-glow shrink-0 animate-pulse"></span>
                            ) : (item as any).badgeCount > 0 ? (
                              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-black animate-pulse">
                                {(item as any).badgeCount}
                              </span>
                            ) : (item as any).isCta ? (
                              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-black uppercase">
                                Calcul
                              </span>
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                );
              })}
            </nav>

            {/* Sidebar User Identity & Logout */}
            <div className="pt-3 mt-auto border-t border-border/60 space-y-2">
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-muted/40">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
                  {email ? email[0].toUpperCase() : 'O'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">{email || "Utilisateur"}</div>
                  <div className="text-[10px] font-extrabold uppercase text-accent truncate">
                    {isAdmin ? "Admin Atelier" : "Opérateur"}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/auth";
                  }}
                  title="Déconnexion"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile nav (with iOS/Android safe area support) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t no-print pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1 shadow-lg">
          <div className="flex justify-around items-center px-1">
            {flatNavItems.slice(0, 4).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 w-16 py-1.5 rounded-lg text-[11px] transition-smooth font-bold ${
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`
                }
              >
                <item.icon className="h-[22px] w-[22px] shrink-0" />
                <span className="truncate w-full text-center px-1">{item.label}</span>
              </NavLink>
            ))}
            
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className={`flex flex-col items-center gap-1 w-16 py-1.5 rounded-lg text-[11px] transition-smooth text-muted-foreground hover:text-primary ${isMobileMenuOpen ? "text-primary bg-primary/10" : ""}`}
                >
                  <Menu className="h-[22px] w-[22px] shrink-0" />
                  <span className="truncate w-full text-center px-1 font-bold">Plus</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl flex flex-col pt-10 px-0 pb-0 no-print">
                <SheetHeader className="px-6 pb-4 border-b text-left">
                  <SheetTitle className="font-black text-foreground">Menu Principal</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin">
                  {flatNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-smooth ${
                          isActive
                            ? "text-primary-foreground bg-primary shadow-brand"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                      {(item as any).badgeCount > 0 && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-black">
                          {(item as any).badgeCount}
                        </span>
                      )}
                    </NavLink>
                  ))}
                  
                  <div className="pt-4 mt-4 border-t border-border/50">
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = "/auth";
                      }}
                      className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-smooth"
                    >
                      <LogOut className="h-5 w-5" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 min-w-0 pb-28 lg:pb-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
