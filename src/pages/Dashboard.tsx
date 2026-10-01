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
import { Link, Navigate } from "react-router-dom";
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
    if (scopeFilter === "mine") {
      return quotes.filter((q) => isQuoteOwnedByUser(q, userId, email));
    }
    return quotes;
  }, [quotes, scopeFilter, userId, email]);

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

    const pending = quotes.filter(q => q.status === "pending").length;
    const accepted = quotes.filter(q => q.status === "accepted").length;

    // Conversion rate & Panier moyen
    const totalQuotesCount = quotes.length;
    const conversionRate = totalQuotesCount > 0 ? Math.round((accepted / totalQuotesCount) * 100) : 0;
    const avgOrderValue = accepted > 0 ? Math.round(totalAcceptedValue / accepted) : 0;

    // Invoices count & invoiced total
    const invoicedQuotes = quotes.filter(q => q.details?.invoiceNumber);
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
    quotes.forEach(q => {
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
    const uniqueClients = new Set(quotes.map(q => q.client_name?.toLowerCase().trim())).size;

    // Recent quotes
    const recent = quotes.slice(0, 8);

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
    const outstandingDebts = quotes.filter(q => {
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
  }, [quotes, chartRange, customStart, customEnd]);

  const maxChartRevenue = Math.max(...stats.chartData.map(m => m.revenue), 1);

  if (roleLoading || dataLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/calculator" replace />;
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-fade-in relative pb-10">
      {/* Background blurs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] glass-card border border-white/50 dark:border-white/10 p-8 md:p-12 shadow-lg">
        <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full gradient-brand opacity-20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[1.5rem] gradient-brand flex items-center justify-center shadow-brand transform -rotate-3 transition-transform hover:rotate-3 duration-500 shrink-0">
              <BarChart3 className="w-10 h-10 text-white drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary to-secondary drop-shadow-sm pb-2">
                {t("dashboard.title")}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground font-medium max-w-2xl mt-1">{t("dashboard.subtitle")}</p>

              {/* Scope Switcher */}
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-semibold text-muted-foreground">Données :</span>
                <div className="flex gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-xl border shadow-sm">
                  <Button
                    variant={scopeFilter === "all" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-3 rounded-lg"
                    onClick={() => setScopeFilter("all")}
                  >
                    Vue Globale ({quotes.length})
                  </Button>
                  <Button
                    variant={scopeFilter === "mine" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-3 rounded-lg"
                    onClick={() => setScopeFilter("mine")}
                  >
                    Mes Devis ({myQuotesCount})
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl shadow-sm gap-1.5">
              <Link to="/invoices">
                <Receipt className="w-4 h-4 text-primary" />
                <span>Facturation ({stats.invoicedCount})</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="gradient-brand text-white border-0 rounded-xl shadow-sm gap-1.5">
              <Link to="/calculator">
                <span>Nouveau Devis</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Outstanding Debts Alert */}
      {stats.outstandingDebts.length > 0 && (
        <Card className="border-2 border-red-500/20 bg-red-500/5 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <CardContent className="p-4 sm:p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-red-900 dark:text-red-300">
                  Dettes & Créances en Retard (+15 jours)
                </h4>
                <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold">
                  {stats.outstandingDebts.length} dossiers
                </Badge>
              </div>
              <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-1">
                Certains devis acceptés attendent leur règlement depuis plus de 2 semaines.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {stats.outstandingDebts.slice(0, 6).map(q => {
                  const rem = Math.max(0, (Number(q.total) || 0) - (Number(q.details?.paidAmount) || 0));
                  return (
                    <Link
                      key={q.id}
                      to="/payment"
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-background/80 hover:bg-background border border-red-200 dark:border-red-900/50 shadow-xs transition-colors"
                    >
                      <span className="font-medium text-foreground">{q.client_name}</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{formatDZD(rem)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards — 6-Card High-Impact Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Revenue */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              {stats.revenueGrowth !== 0 && (
                <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${stats.revenueGrowth > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"}`}>
                  {stats.revenueGrowth > 0 ? "+" : ""}{stats.revenueGrowth.toFixed(0)}%
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">CA du mois</div>
            <div className="text-lg font-bold mt-1 tabular-nums">{formatDZD(stats.monthRevenue)}</div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-600" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border-0 text-[10px] font-bold">
                {stats.conversionRate}%
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Taux Conversion</div>
            <div className="text-lg font-bold mt-1">{stats.accepted} / {stats.totalQuotes} devis</div>
          </CardContent>
        </Card>

        {/* Panier Moyen */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-violet-500" />
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Panier Moyen</div>
            <div className="text-lg font-bold mt-1 tabular-nums">{formatDZD(stats.avgOrderValue)}</div>
          </CardContent>
        </Card>

        {/* Total Quotes */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{stats.monthQuotes} ce mois
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Total Devis</div>
            <div className="text-lg font-bold mt-1">{stats.totalQuotes}</div>
          </CardContent>
        </Card>

        {/* Invoiced Total */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-indigo-500" />
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {stats.invoicedCount} factures
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Facturé</div>
            <div className="text-lg font-bold mt-1 tabular-nums text-indigo-600 dark:text-indigo-400">{formatDZD(stats.invoicedTotal)}</div>
          </CardContent>
        </Card>

        {/* Outstanding Debts */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-smooth">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Créances</div>
            <div className="text-lg font-bold mt-1 tabular-nums text-amber-600 dark:text-amber-400">{formatDZD(stats.totalRemaining)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart (2 cols) */}
        <Card className="lg:col-span-2 glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="font-bold text-sm">{t("dashboard.revenueChart")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Progression du chiffre d'affaires encaissé</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={chartRange} onValueChange={(v: any) => setChartRange(v)} className="w-auto">
                  <TabsList className="h-8 p-1 bg-muted/50 rounded-lg">
                    <TabsTrigger value="today" className="text-[10px] px-2 h-6">Aujourd'hui</TabsTrigger>
                    <TabsTrigger value="month" className="text-[10px] px-2 h-6">Mois</TabsTrigger>
                    <TabsTrigger value="6months" className="text-[10px] px-2 h-6">6 Mois</TabsTrigger>
                    <TabsTrigger value="custom" className="text-[10px] px-2 h-6">Perso</TabsTrigger>
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
            <div className="flex gap-3 h-44 items-end pt-4 overflow-x-auto pb-2 scrollbar-none">
              {stats.chartData.map((m, i) => {
                const h = Math.max(8, (m.revenue / maxChartRevenue) * 100);
                return (
                  <div key={i} className="flex-1 min-w-[32px] flex flex-col items-center justify-end gap-2 h-full">
                    <div className="text-[10px] tabular-nums font-semibold text-muted-foreground">{m.count > 0 ? `${m.count} d.` : "—"}</div>
                    <div
                      className="w-full rounded-t-xl gradient-brand transition-all duration-500 relative group cursor-default shadow-sm"
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] px-2.5 py-1 rounded-md whitespace-nowrap tabular-nums font-bold pointer-events-none shadow-lg z-20">
                        {formatDZD(m.revenue)}
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground capitalize whitespace-nowrap">{m.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution & Donut Chart (1 col) */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Répartition des Devis
              </h3>
              <Badge variant="outline" className="text-[10px]">{stats.totalQuotes} au total</Badge>
            </div>

            {/* Circular Gauge / Donut Breakdown */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path
                    className="text-muted/30 stroke-current"
                    strokeWidth="3.8"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Accepted segment */}
                  {stats.totalQuotes > 0 && stats.accepted > 0 && (
                    <path
                      className="text-emerald-500 stroke-current transition-all duration-700"
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
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Succès</span>
                </div>
              </div>
            </div>

            {/* Status list */}
            <div className="space-y-2 text-xs pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Acceptés & Validés</span>
                </span>
                <span className="font-bold tabular-nums">{stats.accepted} ({stats.conversionRate}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>En attente client</span>
                </span>
                <span className="font-bold tabular-nums">
                  {stats.pending} ({stats.totalQuotes > 0 ? Math.round((stats.pending / stats.totalQuotes) * 100) : 0}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>Refusés / Annulés</span>
                </span>
                <span className="font-bold tabular-nums">
                  {stats.rejected} ({stats.totalQuotes > 0 ? Math.round((stats.rejected / stats.totalQuotes) * 100) : 0}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards & Lists Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Clients Ranking */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Top 5 Meilleurs Clients
              </h3>
              <Link to="/clients" className="text-xs text-primary font-medium hover:underline">
                Voir tous les clients
              </Link>
            </div>

            <div className="space-y-3">
              {stats.topClients.map((c, i) => {
                const medals = ["🥇", "🥈", "🥉", "4.", "5."];
                return (
                  <div
                    key={c.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base font-bold w-6 text-center">{medals[i]}</span>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{c.name}</div>
                        {c.company && <div className="text-[11px] text-muted-foreground truncate">{c.company}</div>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm tabular-nums text-foreground">{formatDZD(c.totalSpent)}</div>
                      <div className="text-[10px] text-muted-foreground">{c.count} commandes</div>
                    </div>
                  </div>
                );
              })}

              {stats.topClients.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Aucun client avec commandes enregistrées</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                {t("dashboard.topProducts")}
              </h3>
              <Link to="/products" className="text-xs text-primary font-medium hover:underline">
                Catalogue
              </Link>
            </div>

            <div className="space-y-3">
              {stats.topProducts.map((p, i) => {
                const pct = stats.totalRevenue > 0 ? (p.revenue / stats.totalRevenue * 100) : 0;
                return (
                  <div key={p.name} className="space-y-1.5 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md gradient-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-semibold truncate">{p.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{p.count} devis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted/60 rounded-full h-2 overflow-hidden">
                        <div className="h-full gradient-brand rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(8, pct))}%` }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums whitespace-nowrap">{formatDZD(p.revenue)}</span>
                    </div>
                  </div>
                );
              })}

              {stats.topProducts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">{t("dashboard.noData")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm">{t("dashboard.recentQuotes")}</h3>
            <Link to="/quotes" className="text-xs text-primary font-medium hover:underline">{t("dashboard.viewAll")}</Link>
          </div>
          <div className="divide-y">
            {stats.recent.map(q => (
              <Link to={`/devis?id=${q.id}`} key={q.id} className="flex items-center justify-between py-3 hover:bg-muted/40 -mx-2 px-3 rounded-xl transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{q.client_name}{q.client_company ? ` · ${q.client_company}` : ""}</span>
                    {q.details?.createdBy && (
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${isQuoteOwnedByUser(q, userId, email) ? "border-primary/40 text-primary bg-primary/5" : "border-muted text-muted-foreground"}`}>
                        {isQuoteOwnedByUser(q, userId, email) ? "Mon devis" : `Par: ${q.details.createdBy}`}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{q.product_name} · {new Date(q.created_at).toLocaleDateString("fr-DZ")}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${q.status === 'accepted' ? 'border-emerald-500 text-emerald-600' : q.status === 'rejected' ? 'border-red-500 text-red-600' : 'border-amber-500 text-amber-600'}`}>
                    {q.status === 'accepted' ? 'Accepté' : q.status === 'rejected' ? 'Refusé' : 'En attente'}
                  </Badge>
                  <span className="font-bold tabular-nums text-sm text-foreground">{formatDZD(Number(q.total) || 0)}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
