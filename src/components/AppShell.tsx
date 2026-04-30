import { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calculator, Package, Layers, Printer, Sparkles, FileText, Settings, Moon, Sun, Globe, Wallet, Users, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import logo from "@/assets/oprisma-logo.png";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { to: "/", icon: Calculator, label: t("nav.calculator") },
    { to: "/products", icon: Package, label: t("nav.products") },
    { to: "/paper", icon: Layers, label: t("nav.paper") },
    { to: "/print", icon: Printer, label: t("nav.print") },
    { to: "/finitions", icon: Sparkles, label: t("nav.finitions") },
    { to: "/quotes", icon: FileText, label: t("nav.quotes") },
    { to: "/clients", icon: Users, label: t("nav.clients") },
    { to: "/payment", icon: Wallet, label: t("nav.payment") },
    { to: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  const langs = [
    { code: "fr", label: "Français" },
    { code: "ar", label: "العربية" },
    { code: "en", label: "English" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b no-print">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl gradient-brand opacity-20 blur-lg group-hover:opacity-40 transition-smooth" />
              <img src={logo} alt="Oprisma Design" className="relative h-10 w-auto" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-foreground leading-tight">Oprisma Design</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Évènementiel · Print · Marketing</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                {langs.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => i18n.changeLanguage(l.code)} className={i18n.language === l.code ? "font-semibold text-primary" : ""}>
                    {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex gap-6 py-6">
        {/* Sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 no-print">
          <div className="sticky top-24 flex flex-col h-[calc(100vh-8rem)]">
            <nav className="space-y-1 flex-1 overflow-y-auto pr-2 pb-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-smooth ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-brand"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="pt-4 mt-auto border-t">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/auth";
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-smooth"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t no-print">
          <div className="flex justify-around py-2">
            {navItems.slice(0, 5).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-0 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
