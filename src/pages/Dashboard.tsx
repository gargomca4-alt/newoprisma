import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDZD } from "@/lib/calc";
import {
  BarChart3, TrendingUp, FileText, Users, DollarSign,
  ArrowUpRight, ArrowDownRight, Package, Clock, CheckCircle2,
  XCircle, AlertTriangle, Receipt, Target, Award, PieChart
} from "lucide-react";
import { Link } from "react-router-dom";
import { useRole } from "@/lib/useRole";
import {
  startOfDay, endOfDay, subDays, subMonths, format, isSameDay, isSameMonth,
  eachDayOfInterval, eachMonthOfInterval, addHours
} from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { isQuoteOwnedByUser } from "@/lib/userPricing";

type Quote = {
  id: string;
  client_name: string;
  client_company: string | null;
  product_name: string | null;
  quantity: number | null;
  total: number | null;
  status: string;
  details: any;
  created_at: string;
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const { isAdmin, email, userId, loading: roleLoading } = useRole();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">("all");
  const [dataLoading, setDataLoading] = useState(true);
  const [chartRange, setChartRange] = useState<"today" | "month" | "6months" | "custom">("6months");
  const [customStart, setCustomStart] = useState<Date>(subDays(new Date(), 7));
  const [customEnd, setCustomEnd] = useState<Date>(new Date());

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      setQuotes((data as Quote[]) || []);
      setDataLoading(false);
    })();
  }, []);

  const scopedQuotes = useMemo(() => {
    if (!isAdmin || scopeFilter === "mine") {
      return quotes.filter((q) => isQuoteOwnedByUser(q, userId, email));
    }
    return quotes;
  }, [quotes, isAdmin, scopeFilter, userId, email]);

  const myQuotesCount = useMemo(() => {
    return quotes.filter((q) => isQuoteOwnedByUser(q, userId, email)).length;
  }, [quotes, userId, email]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = scopedQuotes.filter(q => {
      const d = new Date(q.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = scopedQuotes.filter(q => {
      const d = new Date(q.created_at);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const acceptedOrPaid = scopedQuotes.filter(q => q.status === "accepted" || Number(q.details?.paidAmount) > 0);

    // Revenue = only what has actually been paid (paidAmount)
    const totalPaid = scopedQuotes.reduce((s, q) => s + (Number(q.details?.paidAmount) || 0), 0);
    const monthPaid = thisMonth.reduce((s, q) => s + (Number(q.details?.paidAmount) || 0), 0);
    const lastMonthPaid = lastMonth.reduce((s, q) => s + (Number(q.details?.paidAmount) || 0), 0);
    const revenueGrowth = lastMonthPaid > 0 ? ((monthPaid - lastMonthPaid) / lastMonthPaid * 100) : 0;

    // Outstanding = accepted/paid quotes total minus what's been paid
    const totalAcceptedValue = acceptedOrPaid.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const totalRemaining = Math.max(0, totalAcceptedValue - totalPaid);

    const pending = scopedQuotes.filter(q => q.status === "pending").length;
    const accepted = scopedQuotes.filter(q => q.status === "accepted").length;
    const rejected = scopedQuotes.filter(q => q.status === "rejected").length;

    // Conversion rate & Panier moyen
    const totalQuotesCount = scopedQuotes.length;
    const conversionRate = totalQuotesCount > 0 ? Math.round((accepted / totalQuotesCount) * 100) : 0;
    const avgOrderValue = accepted > 0 ? Math.round(totalAcceptedValue / accepted) : 0;

    // Invoices count & invoiced total
    const invoicedQuotes = scopedQuotes.filter(q => q.details?.invoiceNumber);
    const invoicedCount = invoicedQuotes.length;
    const invoicedTotal = invoicedQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0);

    // Top products (based on accepted quotes only)
    const productMap: Record<string, { count: number; revenue: number }> = {};
    acceptedOrPaid.forEach(q => {
      const name = q.product_name || "Autre";
      if (!productMap[name]) productMap[name] = { count: 0, revenue: 0 };
      productMap[name].count++;
      productMap[name].revenue += Number(q.total) || 0;
    });
    const topProducts = Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top Clients Ranking
    const clientMap: Record<string, { name: string; company?: string; totalSpent: number; count: number }> = {};
    scopedQuotes.forEach(q => {
      const name = (q.client_name || "Client").trim();
      const paid = Number(q.details?.paidAmount) || 0;
      const total = Number(q.total) || 0;
      if (!clientMap[name]) {
        clientMap[name] = { name, company: q.client_company || undefined, totalSpent: 0, count: 0 };
      }
      clientMap[name].count++;
      clientMap[name].totalSpent += (paid > 0 ? paid : (q.status === "accepted" ? total : 0));
    });
    const topClients = Object.values(clientMap)
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Unique clients
    const uniqueClients = new Set(scopedQuotes.map(q => q.client_name?.toLowerCase().trim())).size;

    // Recent quotes
    const recent = scopedQuotes.slice(0, 8);

    // Chart data based on selected range
    const chartData: { label: string; revenue: number; count: number }[] = [];
    
    if (chartRange === "today") {
      const start = startOfDay(now);
      for (let i = 0; i < 24; i += 4) {
        const hStart = addHours(start, i);
        const hEnd = addHours(start, i + 4);
        const intervalQuotes = acceptedOrPaid.filter(q => {
          const qd = new Date(q.created_at);
          return qd >= hStart && qd < hEnd;
        });
        chartData.push({
          label: `${i}h`,
          revenue: intervalQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0),
          count: intervalQuotes.length,
        });
      }
    } else if (chartRange === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = subDays(now, i);
        const dayQuotes = acceptedOrPaid.filter(q => isSameDay(new Date(q.created_at), d));
        chartData.push({
          label: format(d, "dd/MM"),
          revenue: dayQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0),
          count: dayQuotes.length,
        });
      }
    } else if (chartRange === "6months") {
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const monthAccepted = acceptedOrPaid.filter(q => isSameMonth(new Date(q.created_at), d));
        chartData.push({
          label: format(d, "MMM", { locale: fr }),
          revenue: monthAccepted.reduce((s, q) => s + (Number(q.total) || 0), 0),
          count: monthAccepted.length,
        });
      }
    } else if (chartRange === "custom" && customStart && customEnd) {
      const daysDiff = Math.ceil(Math.abs(customEnd.getTime() - customStart.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 45) {
        const days = eachDayOfInterval({ start: customStart, end: customEnd });
        days.forEach(d => {
          const dayQuotes = acceptedOrPaid.filter(q => isSameDay(new Date(q.created_at), d));
          chartData.push({
            label: format(d, "dd/MM"),
            revenue: dayQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0),
            count: dayQuotes.length,
          });
        });
      } else {
        const months = eachMonthOfInterval({ start: customStart, end: customEnd });
        months.forEach(m => {
          const monthQuotes = acceptedOrPaid.filter(q => isSameMonth(new Date(q.created_at), m));
          chartData.push({
            label: format(m, "MMM yy", { locale: fr }),
            revenue: monthQuotes.reduce((s, q) => s + (Number(q.total) || 0), 0),
            count: monthQuotes.length,
          });
        });
      }
    }

    // Outstanding Debts (> 15 days, unpaid)
    const outstandingDebts = scopedQuotes.filter(q => {
      if (q.status === "rejected") return false;
      const remaining = Math.max(0, (Number(q.total) || 0) - (Number(q.details?.paidAmount) || 0));
      if (remaining <= 0) return false;
      const diffTime = Math.abs(now.getTime() - new Date(q.created_at).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays > 15;
    });

    return {
      totalRevenue: totalPaid,
      monthRevenue: monthPaid,
      lastMonthRevenue: lastMonthPaid,
      revenueGrowth,
      totalPaid,
      totalRemaining,
      totalQuotes: totalQuotesCount,
      monthQuotes: thisMonth.length,
      pending,
      accepted,
      rejected,
      conversionRate,
      avgOrderValue,
      invoicedCount,
      invoicedTotal,
      topProducts,
      topClients,
      uniqueClients,
      recent,
      chartData,
      monthlyData: chartData,
      outstandingDebts
    };
  }, [scopedQuotes, chartRange, customStart, customEnd]);

  const maxChartRevenue = Math.max(...stats.chartData.map(m => m.revenue), 1);

  if (roleLoading || dataLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Non-admin: show personal dashboard
  if (!isAdmin) {
    const myStats = (() => {
      const myQ = quotes.filter((q) => isQuoteOwnedByUser(q, userId, email));
      const now = new Date();
      const thisMonth = myQ.filter(q => {
        const d = new Date(q.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const accepted = myQ.filter(q => q.status === "accepted").length;
      const pending = myQ.filter(q => q.status === "pending").length;
      const totalPaid = myQ.reduce((s, q) => s + (Number(q.details?.paidAmount) || 0), 0);
      const monthPaid = thisMonth.reduce((s, q) => s + (Number(q.details?.paidAmount) || 0), 0);
      const conversionRate = myQ.length > 0 ? Math.round((accepted / myQ.length) * 100) : 0;
      const recent = myQ.slice(0, 6);
      const uniqueClients = new Set(myQ.map(q => q.client_name?.toLowerCase().trim())).size;

      // Simple 6-month chart
      const chartData: { label: string; revenue: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const monthAccepted = myQ.filter(q =>
          (q.status === "accepted" || Number(q.details?.paidAmount) > 0) && isSameMonth(new Date(q.created_at), d)
        );
        chartData.push({
          label: format(d, "MMM", { locale: fr }),
          revenue: monthAccepted.reduce((s, q) => s + (Number(q.total) || 0), 0),
          count: monthAccepted.length,
        });
      }
      const maxRevenue = Math.max(...chartData.map(m => m.revenue), 1);

      return { total: myQ.length, accepted, pending, totalPaid, monthPaid, conversionRate, recent, uniqueClients, chartData, maxRevenue, monthQuotes: thisMonth.length };
    })();

    return (
      <div className="space-y-8 max-w-[1200px] mx-auto animate-fade-in pb-10">
        {/* Personal Hero */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[1.5rem] bg-card border border-border p-5 sm:p-8 md:p-10 shadow-sm">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 z-10">
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-white shadow-sm shrink-0">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground pb-1">
                  Mon Tableau de Bord
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl mt-0.5 sm:mt-1">
                  Bienvenue, <span className="font-bold text-foreground">{email.split("@")[0]}</span> — Voici vos statistiques
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground font-extrabold border-0 rounded-xl shadow-glow gap-1.5 transition-all duration-200 hover:scale-[1.02]">
              <Link to="/calculator">
                <span>Nouveau Devis</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Personal KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary dark:text-accent" />
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold bg-muted">
                  +{myStats.monthQuotes} ce mois
                </Badge>
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold">Mes Devis</div>
              <div className="text-base sm:text-lg font-black mt-0.5 sm:mt-1 text-foreground">{myStats.total}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-accent" />
                </div>
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold">CA Encaissé</div>
              <div className="text-sm sm:text-lg font-black mt-0.5 sm:mt-1 tabular-nums text-foreground">{formatDZD(myStats.totalPaid)}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary dark:text-accent" />
                </div>
                <Badge className="bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground border-0 text-[10px] font-extrabold">
                  {myStats.conversionRate}%
                </Badge>
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold">Conversion</div>
              <div className="text-base sm:text-lg font-black mt-0.5 sm:mt-1 text-foreground">{myStats.accepted}/{myStats.total}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center">
                  <Users className="w-4 h-4 text-secondary" />
                </div>
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold">Mes Clients</div>
              <div className="text-base sm:text-lg font-black mt-0.5 sm:mt-1 text-foreground">{myStats.uniqueClients}</div>
            </CardContent>
          </Card>
        </div>

        {/* Personal Chart + Status */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2 glass-card border-border/80 shadow-md rounded-xl sm:rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h3 className="font-extrabold text-sm text-foreground">Mon CA (6 mois)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Progression de mes devis acceptés</p>
              </div>
              <div className="flex gap-2 sm:gap-3 h-36 sm:h-44 items-end pt-4 overflow-x-auto pb-2 scrollbar-none">
                {myStats.chartData.map((m, i) => {
                  const h = Math.max(8, (m.revenue / myStats.maxRevenue) * 100);
                  return (
                    <div key={i} className="flex-1 min-w-[32px] flex flex-col items-center justify-end gap-2 h-full">
                      <div className="text-[10px] tabular-nums font-bold text-muted-foreground">{m.count > 0 ? `${m.count} d.` : "—"}</div>
                      <div
                        className="w-full rounded-t-xl bg-primary hover:bg-primary/90 transition-all duration-500 relative group cursor-default shadow-xs"
                        style={{ height: `${h}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-[10px] px-2.5 py-1 rounded-lg whitespace-nowrap tabular-nums font-bold pointer-events-none shadow-brand z-20">
                          {formatDZD(m.revenue)}
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground capitalize whitespace-nowrap">{m.label}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="glass-card border-border/80 shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground">
                  <PieChart className="w-4 h-4 text-primary dark:text-accent" />
                  Mes Résultats
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold border-border">{myStats.total} devis</Badge>
              </div>

              <div className="flex items-center justify-center py-2">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-muted/40 stroke-current" strokeWidth="3.8" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    {myStats.total > 0 && myStats.accepted > 0 && (
                      <path className="text-primary dark:text-accent stroke-current transition-all duration-700" strokeDasharray={`${(myStats.accepted / myStats.total) * 100}, 100`} strokeWidth="3.8" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-black tracking-tight text-foreground">{myStats.conversionRate}%</span>
                    <span className="text-[10px] uppercase font-black text-accent tracking-wider">Succès</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="font-semibold text-foreground">Acceptés</span>
                  </span>
                  <span className="font-extrabold tabular-nums text-foreground">{myStats.accepted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                    <span className="font-semibold text-foreground">En attente</span>
                  </span>
                  <span className="font-extrabold tabular-nums text-foreground">{myStats.pending}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Recent Quotes */}
        <Card className="glass-card border-border/80 shadow-md rounded-xl sm:rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-extrabold text-sm text-foreground">Mes Devis Récents</h3>
              <Link to="/quotes" className="text-xs text-primary dark:text-accent font-bold hover:underline">Voir tout</Link>
            </div>
            <div className="divide-y divide-border/60">
              {myStats.recent.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 font-medium">Vous n'avez pas encore créé de devis</p>
              ) : (
                myStats.recent.map(q => (
                  <Link to={`/devis?id=${q.id}`} key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-3.5 hover:bg-muted/45 -mx-2 px-3 rounded-xl transition-colors gap-1.5 sm:gap-0">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm text-foreground truncate block">{q.client_name}{q.client_company ? ` · ${q.client_company}` : ""}</span>
                      <div className="text-[11px] sm:text-xs font-medium text-muted-foreground mt-0.5">{q.product_name} · {new Date(q.created_at).toLocaleDateString("fr-DZ")}</div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <Badge variant="outline" className={`text-[9px] sm:text-[10px] font-bold ${q.status === 'accepted' ? 'border-primary text-primary bg-primary/10' : q.status === 'rejected' ? 'border-destructive text-destructive bg-destructive/10' : 'border-accent text-accent bg-accent/10'}`}>
                        {q.status === 'accepted' ? 'Accepté' : q.status === 'rejected' ? 'Refusé' : 'Attente'}
                      </Badge>
                      <span className="font-black tabular-nums text-xs sm:text-sm text-foreground">{formatDZD(Number(q.total) || 0)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-[1400px] mx-auto animate-fade-in relative pb-10">
      {/* Hero Apple Style */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[1.5rem] bg-card border border-border p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div className="flex items-start sm:items-center gap-3 sm:gap-5 min-w-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-white shadow-sm shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground truncate">
                {t("dashboard.title")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate mt-0.5">{t("dashboard.subtitle")}</p>

              {/* Scope Switcher - Admin only */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5 sm:mt-3">
                  <span className="text-[11px] sm:text-xs font-bold text-muted-foreground shrink-0">Données :</span>
                  <div className="inline-flex max-w-full overflow-x-auto p-0.5 sm:p-1 bg-background/80 backdrop-blur-sm rounded-xl border border-border shadow-xs">
                    <Button
                      variant={scopeFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      className="h-6 sm:h-7 text-[11px] sm:text-xs px-2 sm:px-3 rounded-lg font-bold shrink-0"
                      onClick={() => setScopeFilter("all")}
                    >
                      Vue Globale ({quotes.length})
                    </Button>
                    <Button
                      variant={scopeFilter === "mine" ? "default" : "ghost"}
                      size="sm"
                      className="h-6 sm:h-7 text-[11px] sm:text-xs px-2 sm:px-3 rounded-lg font-bold shrink-0"
                      onClick={() => setScopeFilter("mine")}
                    >
                      Mes Devis ({myQuotesCount})
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0 pt-1 md:pt-0">
            <Button asChild variant="outline" size="sm" className="rounded-xl border-border shadow-xs gap-1.5 font-bold hover:bg-muted/80 text-xs h-8 sm:h-9">
              <Link to="/invoices">
                <Receipt className="w-3.5 h-3.5 text-primary dark:text-accent" />
                <span className="hidden sm:inline">Facturation</span> ({stats.invoicedCount})
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground font-extrabold border-0 rounded-xl shadow-glow gap-1.5 transition-all duration-200 hover:scale-[1.02] text-xs h-8 sm:h-9">
              <Link to="/calculator">
                <span>Nouveau Devis</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Outstanding Debts Alert */}
      {stats.outstandingDebts.length > 0 && (
        <Card className="border-2 border-accent/30 bg-accent/5 backdrop-blur-sm rounded-2xl shadow-xs overflow-hidden animate-fade-in">
          <CardContent className="p-3 sm:p-4 md:p-5 flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 mt-0.5 text-accent">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-xs sm:text-sm text-foreground">
                  Dettes & Créances en Retard (+15 jours)
                </h4>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold border-accent/40 text-accent bg-accent/10">
                  {stats.outstandingDebts.length} dossiers
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Certains devis acceptés attendent leur règlement depuis plus de 2 semaines.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
                {stats.outstandingDebts.slice(0, 6).map(q => {
                  const rem = Math.max(0, (Number(q.total) || 0) - (Number(q.details?.paidAmount) || 0));
                  return (
                    <Link
                      key={q.id}
                      to="/payment"
                      className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg bg-background hover:bg-muted/80 border border-border shadow-xs transition-colors max-w-full truncate"
                    >
                      <span className="font-medium text-foreground truncate">{q.client_name}</span>
                      <span className="font-extrabold text-accent shrink-0">{formatDZD(rem)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards — 6-Card High-Impact Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {/* Total Revenue */}
        <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-2.5 sm:p-4 min-w-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
              </div>
              {stats.revenueGrowth !== 0 && (
                <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 font-bold shrink-0 ${stats.revenueGrowth > 0 ? "bg-accent/20 text-accent" : "bg-destructive/15 text-destructive"}`}>
                  {stats.revenueGrowth > 0 ? "+" : ""}{stats.revenueGrowth.toFixed(0)}%
                </Badge>
              )}
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold truncate">CA du mois</div>
            <div className="text-xs min-[380px]:text-sm sm:text-lg font-black mt-0.5 sm:mt-1 tabular-nums text-foreground truncate min-w-0">{formatDZD(stats.monthRevenue)}</div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-2.5 sm:p-4 min-w-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary dark:text-accent" />
              </div>
              <Badge className="bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground border-0 text-[9px] sm:text-[10px] font-extrabold shrink-0">
                {stats.conversionRate}%
              </Badge>
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold truncate">Conversion</div>
            <div className="text-xs min-[380px]:text-sm sm:text-lg font-black mt-0.5 sm:mt-1 text-foreground truncate min-w-0">{stats.accepted}/{stats.totalQuotes}</div>
          </CardContent>
        </Card>

        {/* Panier Moyen */}
        <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-2.5 sm:p-4 min-w-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary" />
              </div>
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold truncate">Panier Moyen</div>
            <div className="text-xs min-[380px]:text-sm sm:text-lg font-black mt-0.5 sm:mt-1 tabular-nums text-foreground truncate min-w-0">{formatDZD(stats.avgOrderValue)}</div>
          </CardContent>
        </Card>

        {/* Total Quotes */}
        <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-2.5 sm:p-4 min-w-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary dark:text-accent" />
              </div>
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0 font-bold bg-muted shrink-0">
                +{stats.monthQuotes}
              </Badge>
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold truncate">Total Devis</div>
            <div className="text-xs min-[380px]:text-sm sm:text-lg font-black mt-0.5 sm:mt-1 text-foreground truncate min-w-0">{stats.totalQuotes}</div>
          </CardContent>
        </Card>

        {/* Invoiced Total */}
        <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-2.5 sm:p-4 min-w-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary" />
              </div>
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0 font-bold bg-muted shrink-0">
                {stats.invoicedCount}
              </Badge>
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold truncate">Facturé</div>
            <div className="text-xs min-[380px]:text-sm sm:text-lg font-black mt-0.5 sm:mt-1 tabular-nums text-foreground truncate min-w-0">{formatDZD(stats.invoicedTotal)}</div>
          </CardContent>
        </Card>

        {/* Outstanding Debts */}
        <Card className="glass-card border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-2.5 sm:p-4 min-w-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
              </div>
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold truncate">Créances</div>
            <div className="text-xs min-[380px]:text-sm sm:text-lg font-black mt-0.5 sm:mt-1 tabular-nums text-accent truncate min-w-0">{formatDZD(stats.totalRemaining)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Monthly Revenue Chart (2 cols) */}
        <Card className="lg:col-span-2 glass-card border-border/80 shadow-md rounded-xl sm:rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-foreground">{t("dashboard.revenueChart")}</h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Progression du CA encaissé</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={chartRange} onValueChange={(v: any) => setChartRange(v)} className="w-auto">
                  <TabsList className="h-7 sm:h-8 p-0.5 sm:p-1 bg-muted/60 rounded-lg">
                    <TabsTrigger value="today" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 h-5 sm:h-6 font-bold">Ajd</TabsTrigger>
                    <TabsTrigger value="month" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 h-5 sm:h-6 font-bold">Mois</TabsTrigger>
                    <TabsTrigger value="6months" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 h-5 sm:h-6 font-bold">6M</TabsTrigger>
                    <TabsTrigger value="custom" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 h-5 sm:h-6 font-bold">Perso</TabsTrigger>
                  </TabsList>
                </Tabs>

                {chartRange === "custom" && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("h-8 text-[10px] px-2 justify-start font-normal", !customStart && "text-muted-foreground")}>
                          <Clock className="mr-2 h-3 w-3" />
                          {customStart ? format(customStart, "dd/MM/yy") : "Début"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={customStart} onSelect={(d) => d && setCustomStart(d)} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("h-8 text-[10px] px-2 justify-start font-normal", !customEnd && "text-muted-foreground")}>
                          <Clock className="mr-2 h-3 w-3" />
                          {customEnd ? format(customEnd, "dd/MM/yy") : "Fin"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={customEnd} onSelect={(d) => d && setCustomEnd(d)} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 h-32 sm:h-44 items-end pt-4 overflow-x-auto pb-2 scrollbar-none">
              {stats.chartData.map((m, i) => {
                const h = Math.max(8, (m.revenue / maxChartRevenue) * 100);
                return (
                  <div key={i} className="flex-1 min-w-[32px] flex flex-col items-center justify-end gap-2 h-full">
                    <div className="text-[10px] tabular-nums font-bold text-muted-foreground">{m.count > 0 ? `${m.count} d.` : "—"}</div>
                    <div
                      className="w-full rounded-t-xl bg-primary hover:bg-primary/90 transition-all duration-500 relative group cursor-default shadow-xs"
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-[10px] px-2.5 py-1 rounded-lg whitespace-nowrap tabular-nums font-bold pointer-events-none shadow-brand z-20">
                        {formatDZD(m.revenue)}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground capitalize whitespace-nowrap">{m.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution & Donut Chart (1 col) */}
        <Card className="glass-card border-border/80 shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground">
                <PieChart className="w-4 h-4 text-primary dark:text-accent" />
                Répartition des Devis
              </h3>
              <Badge variant="outline" className="text-[10px] font-bold border-border">{stats.totalQuotes} au total</Badge>
            </div>

            {/* Circular Gauge / Donut Breakdown */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path
                    className="text-muted/40 stroke-current"
                    strokeWidth="3.8"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Accepted segment */}
                  {stats.totalQuotes > 0 && stats.accepted > 0 && (
                    <path
                      className="text-primary dark:text-accent stroke-current transition-all duration-700"
                      strokeDasharray={`${(stats.accepted / stats.totalQuotes) * 100}, 100`}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black tracking-tight text-foreground">{stats.conversionRate}%</span>
                  <span className="text-[10px] uppercase font-black text-accent tracking-wider">Succès</span>
                </div>
              </div>
            </div>

            {/* Status list */}
            <div className="space-y-2 text-xs pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="font-semibold text-foreground">Acceptés & Validés</span>
                </span>
                <span className="font-extrabold tabular-nums text-foreground">{stats.accepted} ({stats.conversionRate}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  <span className="font-semibold text-foreground">En attente client</span>
                </span>
                <span className="font-extrabold tabular-nums text-foreground">
                  {stats.pending} ({stats.totalQuotes > 0 ? Math.round((stats.pending / stats.totalQuotes) * 100) : 0}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                  <span className="font-semibold text-foreground">Refusés / Annulés</span>
                </span>
                <span className="font-extrabold tabular-nums text-foreground">
                  {stats.rejected} ({stats.totalQuotes > 0 ? Math.round((stats.rejected / stats.totalQuotes) * 100) : 0}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards & Lists Row */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Clients Ranking */}
        <Card className="glass-card border-border/80 shadow-md rounded-xl sm:rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-primary dark:text-accent" />
                Top 5 Meilleurs Clients
              </h3>
              <Link to="/clients" className="text-xs text-primary dark:text-accent font-bold hover:underline">
                Voir tous les clients
              </Link>
            </div>

            <div className="space-y-3">
              {stats.topClients.map((c, i) => {
                const medals = ["🥇", "🥈", "🥉", "4.", "5."];
                return (
                  <div
                    key={c.name}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-card hover:bg-muted/50 border border-border/60 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-lg w-7 text-center font-black">{medals[i]}</span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-foreground truncate">{c.name}</div>
                        {c.company && <div className="text-xs text-muted-foreground truncate">{c.company}</div>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-sm tabular-nums text-accent bg-accent/10 px-2.5 py-1 rounded-lg border border-accent/25">
                        {formatDZD(c.totalSpent)}
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground mt-0.5">{c.count} commandes</div>
                    </div>
                  </div>
                );
              })}

              {stats.topClients.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 font-medium">Aucun client avec commandes enregistrées</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="glass-card border-border/80 shadow-md rounded-xl sm:rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground">
                <Package className="w-4 h-4 text-primary dark:text-accent" />
                {t("dashboard.topProducts")}
              </h3>
              <Link to="/products" className="text-xs text-primary dark:text-accent font-bold hover:underline">
                Catalogue
              </Link>
            </div>

            <div className="space-y-3">
              {stats.topProducts.map((p, i) => {
                const pct = stats.totalRevenue > 0 ? (p.revenue / stats.totalRevenue * 100) : 0;
                return (
                  <div key={p.name} className="space-y-2 p-3 rounded-xl bg-card hover:bg-muted/40 border border-border/50 transition-colors">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-xs">
                          {i + 1}
                        </span>
                        <span className="font-bold text-foreground truncate">{p.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">{p.count} devis</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 bg-muted/70 rounded-full h-2.5 overflow-hidden border border-border/40">
                        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(8, pct))}%` }} />
                      </div>
                      <span className="text-xs font-black tabular-nums text-foreground whitespace-nowrap">{formatDZD(p.revenue)}</span>
                    </div>
                  </div>
                );
              })}

              {stats.topProducts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 font-medium">{t("dashboard.noData")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card className="glass-card border-border/80 shadow-md rounded-xl sm:rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-extrabold text-sm text-foreground">{t("dashboard.recentQuotes")}</h3>
            <Link to="/quotes" className="text-xs text-primary dark:text-accent font-bold hover:underline">{t("dashboard.viewAll")}</Link>
          </div>
          <div className="divide-y divide-border/60">
            {stats.recent.map(q => (
              <Link to={`/devis?id=${q.id}`} key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-3.5 hover:bg-muted/45 -mx-2 px-3 rounded-xl transition-colors gap-1.5 sm:gap-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground truncate">{q.client_name}{q.client_company ? ` · ${q.client_company}` : ""}</span>
                    {q.details?.createdBy && (
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-bold ${isQuoteOwnedByUser(q, userId, email) ? "border-primary/40 text-primary bg-primary/5" : "border-border text-muted-foreground"}`}>
                        {isQuoteOwnedByUser(q, userId, email) ? "Mon devis" : `Par: ${q.details.createdBy}`}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] sm:text-xs font-medium text-muted-foreground mt-0.5">{q.product_name} · {new Date(q.created_at).toLocaleDateString("fr-DZ")}</div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <Badge variant="outline" className={`text-[9px] sm:text-[10px] font-bold ${q.status === 'accepted' ? 'border-primary text-primary bg-primary/10' : q.status === 'rejected' ? 'border-destructive text-destructive bg-destructive/10' : 'border-accent text-accent bg-accent/10'}`}>
                    {q.status === 'accepted' ? 'Accepté' : q.status === 'rejected' ? 'Refusé' : 'Attente'}
                  </Badge>
                  <span className="font-black tabular-nums text-xs sm:text-sm text-foreground">{formatDZD(Number(q.total) || 0)}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
