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
import { useRole } from "@/lib/useRole";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { isAdmin } = useRole();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; desc: string; link: string; type: 'warning' | 'info' }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data: quotes } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
        if (!quotes) return;

        const notifs: any[] = [];
        const now = Date.now();
        // 1. Pending quotes older than 48 hours
        const pendingOld = quotes.filter(q => q.status === "pending" && (now - new Date(q.created_at).getTime()) > 48 * 3600 * 1000);
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
        const unpaid = quotes.filter(q => {
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
  }, []);

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

  const allNavItems = [
    { to: "/", icon: BarChart3, label: t("nav.dashboard"), adminOnly: true },
    { to: "/calculator", icon: Calculator, label: t("nav.calculator"), adminOnly: false },
    { to: "/products", icon: Package, label: t("nav.products"), adminOnly: true },
    { to: "/paper", icon: Layers, label: t("nav.paper"), adminOnly: true },
    { to: "/print", icon: Printer, label: t("nav.print"), adminOnly: true },
    { to: "/finitions", icon: Sparkles, label: t("nav.finitions"), adminOnly: true },
    { to: "/quotes", icon: FileText, label: t("nav.quotes"), adminOnly: false },
    { to: "/invoices", icon: Receipt, label: "Factures", adminOnly: false },
    { to: "/clients", icon: Users, label: t("nav.clients"), adminOnly: false },
    { to: "/payment", icon: Wallet, label: t("nav.payment"), adminOnly: true },
    { to: "/logs", icon: History, label: "Logs", adminOnly: true },
    { to: "/settings", icon: Settings, label: t("nav.settings"), adminOnly: true },
  ];

  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

  const langs = [
    { code: "fr", label: "Français" },
    { code: "ar", label: "العربية" },
    { code: "en", label: "English" },
  ];

  return (
    <div className="min-h-screen bg-muted/30 selection:bg-primary/20 selection:text-primary">
      {/* Top bar */}
      <header className="sticky top-0 z-40 w-full glass-card border-x-0 border-t-0 rounded-none no-print shadow-sm">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl gradient-brand opacity-20 blur-lg group-hover:opacity-40 transition-smooth" />
              <img src={logo} alt="Oprisma Design" className="relative h-10 w-auto drop-shadow-md" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-foreground leading-tight tracking-tight">Oprisma Design</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground leading-tight mt-0.5">Évènementiel · Print · Marketing</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Notifications Center */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative rounded-full shadow-sm border-muted-foreground/20 hover:bg-muted text-muted-foreground transition-smooth">
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow animate-pulse">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl shadow-xl p-2 border-muted-foreground/15">
                <div className="flex items-center justify-between p-2 border-b border-border/50">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications & Alertes</span>
                  <button
                    onClick={requestNotificationPermission}
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    Activer alertes
                  </button>
                </div>
                <div className="py-1 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      ✨ Tout est à jour ! Aucune alerte active.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <Link
                        key={n.id}
                        to={n.link}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted/60 transition-colors text-xs"
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${n.type === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'}`}>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full border-muted-foreground/20 hover:bg-muted transition-smooth shadow-sm">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="font-medium hidden sm:inline-block">{i18n.language === "ar" ? "العربية" : i18n.language === "fr" ? "Français" : "English"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px] rounded-xl shadow-lg border-muted-foreground/10">
                {langs.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => i18n.changeLanguage(l.code)} className={i18n.language === l.code ? "font-semibold text-primary" : "font-medium"}>
                    {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" className="rounded-full shadow-sm border-muted-foreground/20 hover:bg-muted text-muted-foreground transition-smooth" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex gap-8 py-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 no-print">
          <div className="sticky top-28 flex flex-col h-[calc(100vh-9rem)] glass-card rounded-2xl p-4 shadow-sm border-white/40 dark:border-white/5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-4 px-2">Menu Principal</div>
            <nav className="space-y-1.5 flex-1 overflow-y-auto pr-2 pb-4 scrollbar-thin">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-smooth relative overflow-hidden group ${
                      isActive
                        ? "text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none border-l-4 border-primary"></div>
                      )}
                      <item.icon className={`h-4 w-4 relative z-10 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
                      <span className="relative z-10">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="pt-4 mt-auto border-t border-border/50">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/auth";
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-smooth group"
              >
                <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                Déconnexion
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t no-print">
          <div className="flex justify-around py-2 px-1">
            {navItems.slice(0, 4).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 w-16 py-1.5 rounded-lg text-[11px] transition-smooth ${
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
                  <span className="truncate w-full text-center px-1">Plus</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl flex flex-col pt-10 px-0 pb-0 no-print">
                <SheetHeader className="px-6 pb-4 border-b text-left">
                  <SheetTitle>Menu Principal</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-smooth ${
                          isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
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
        <main className="flex-1 min-w-0 pb-20 lg:pb-0 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
