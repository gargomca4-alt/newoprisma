import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/calc";
import {
  BarChart3, TrendingUp, FileText, Users, DollarSign,
  ArrowUpRight, ArrowDownRight, Package, Clock, CheckCircle2, XCircle, AlertTriangle
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
import { Button } from "@/components/ui/button";

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
  const { isAdmin, loading: roleLoading } = useRole();
  const [quotes, setQuotes] = useState<Quote[]>([]);
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

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = quotes.filter(q => {
      const d = new Date(q.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = quotes.filter(q => {
      const d = new Date(q.created_at);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const acceptedOrPaid = quotes.filter(q => q.status === "accepted" || Number(q.details?.paidAmount) > 0);

    // Revenue = only what has actually been paid (paidAmount)
    const totalPaid = quotes.reduce((s, q) => s + (Number(q.details?.paidAmount) || 0), 0);
    const monthPaid = thisMonth.reduce((s, q) => s + (Number(q.details?.paidAmount) || 0), 0);
    const lastMonthPaid = lastMonth.reduce((s, q) => s + (Number(q.details?.paidAmount) || 0), 0);
    const revenueGrowth = lastMonthPaid > 0 ? ((monthPaid - lastMonthPaid) / lastMonthPaid * 100) : 0;

    // Outstanding = accepted/paid quotes total minus what's been paid
    const totalAcceptedValue = acceptedOrPaid.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const totalRemaining = Math.max(0, totalAcceptedValue - totalPaid);

    const pending = quotes.filter(q => q.status === "pending").length;
    const accepted = quotes.filter(q => q.status === "accepted").length;

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
      // Don't show if rejected
      if (q.status === "rejected") return false;
      const remaining = Math.max(0, (Number(q.total) || 0) - (Number(q.details?.paidAmount) || 0));
      if (remaining <= 0) return false;
      const diffTime = Math.abs(now.getTime() - new Date(q.created_at).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays > 15;
    });

    return {
      totalRevenue: totalPaid, monthRevenue: monthPaid, lastMonthRevenue: lastMonthPaid, revenueGrowth,
      totalPaid, totalRemaining,
      totalQuotes: quotes.length, monthQuotes: thisMonth.length,
      pending, accepted,
      topProducts, uniqueClients, recent, chartData, outstandingDebts
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
        <div className="relative flex flex-col md:flex-row md:items-center gap-6 z-10">
          <div className="w-20 h-20 rounded-[1.5rem] gradient-brand flex items-center justify-center shadow-brand transform -rotate-3 transition-transform hover:rotate-3 duration-500">
            <BarChart3 className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary to-secondary drop-shadow-sm pb-2">
              {t("dashboard.title")}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground font-medium max-w-2xl mt-1">{t("dashboard.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Outstanding Debts Alert */}
      {stats.outstandingDebts.length > 0 && (
        <Card className="border-2 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-red-800 dark:text-red-400 text-lg">Dettes en retard ({stats.outstandingDebts.length})</h3>
              <p className="text-sm text-red-700/80 dark:text-red-300/80 mb-4">Ces devis ont un reste à payer et datent de plus de 15 jours.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.outstandingDebts.slice(0, 6).map(q => {
                  const remaining = Math.max(0, (Number(q.total) || 0) - (Number(q.details?.paidAmount) || 0));
                  return (
                    <Link to="/payment" key={q.id} className="bg-white dark:bg-background border border-red-100 dark:border-red-900/50 p-3 rounded-xl hover:shadow-md transition-smooth">
                      <div className="font-semibold text-sm truncate">{q.client_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{new Date(q.created_at).toLocaleDateString("fr-FR")}</div>
                      <div className="mt-2 text-red-600 dark:text-red-400 font-bold tabular-nums text-sm">
                        Reste : {formatDZD(remaining)}
                      </div>
                    </Link>
                  );
                })}
              </div>
              {stats.outstandingDebts.length > 6 && (
                <div className="mt-3 text-sm text-red-700 dark:text-red-400 font-medium">
                  <Link to="/payment" className="hover:underline">+ {stats.outstandingDebts.length - 6} autres dettes à recouvrir</Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden group hover:shadow-lg transition-smooth">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              {stats.revenueGrowth !== 0 && (
                <Badge variant="secondary" className={`text-[10px] gap-1 ${stats.revenueGrowth > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                  {stats.revenueGrowth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(stats.revenueGrowth).toFixed(0)}%
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{t("dashboard.monthRevenue")}</div>
            <div className="text-xl md:text-2xl font-bold mt-1 tabular-nums">{formatDZD(stats.monthRevenue)}</div>
          </CardContent>
        </Card>

        {/* Total Quotes */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden group hover:shadow-lg transition-smooth">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {stats.monthQuotes} {t("dashboard.thisMonth")}
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{t("dashboard.totalQuotes")}</div>
            <div className="text-xl md:text-2xl font-bold mt-1">{stats.totalQuotes}</div>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden group hover:shadow-lg transition-smooth">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-500" />
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{t("dashboard.uniqueClients")}</div>
            <div className="text-xl md:text-2xl font-bold mt-1">{stats.uniqueClients}</div>
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden group hover:shadow-lg transition-smooth">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{t("dashboard.outstanding")}</div>
            <div className="text-xl md:text-2xl font-bold mt-1 tabular-nums text-amber-600 dark:text-amber-400">{formatDZD(stats.totalRemaining)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr,380px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Monthly Revenue Chart */}
          <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="font-bold text-sm">{t("dashboard.revenueChart")}</h3>
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
              <div className="flex gap-3 h-40 overflow-x-auto pb-2 scrollbar-none">
                {stats.chartData.map((m, i) => {
                  const h = Math.max(8, (m.revenue / maxChartRevenue) * 100);
                  return (
                    <div key={i} className="flex-1 min-w-[30px] flex flex-col items-center justify-end gap-2 h-full">
                      <div className="text-[9px] tabular-nums font-medium text-muted-foreground">{m.count > 0 ? m.count : ""}</div>
                      <div className="w-full rounded-t-lg gradient-brand transition-all duration-500 relative group cursor-default"
                        style={{ height: `${h}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[9px] px-2 py-1 rounded-md whitespace-nowrap tabular-nums font-medium pointer-events-none z-20">
                          {formatDZD(m.revenue)}
                        </div>
                      </div>
                      <div className="text-[9px] font-medium text-muted-foreground capitalize whitespace-nowrap">{m.label}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quote Status Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-amber-200 dark:border-amber-800/30 rounded-2xl">
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.pending}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">{t("dashboard.pending")}</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-emerald-200 dark:border-emerald-800/30 rounded-2xl col-span-1.5 md:col-span-1">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-600">{stats.accepted}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">{t("dashboard.accepted")}</div>
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
                  <Link to={`/devis?id=${q.id}`} key={q.id} className="flex items-center justify-between py-3 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{q.client_name}</div>
                      <div className="text-xs text-muted-foreground">{q.product_name} · {new Date(q.created_at).toLocaleDateString("fr-FR")}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={q.status} />
                      <span className="font-semibold tabular-nums text-sm">{formatDZD(Number(q.total) || 0)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Top Products */}
          <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> {t("dashboard.topProducts")}
              </h3>
              <div className="space-y-3">
                {stats.topProducts.map((p, i) => {
                  const pct = stats.totalRevenue > 0 ? (p.revenue / stats.totalRevenue * 100) : 0;
                  return (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md gradient-brand text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          <span className="font-medium truncate">{p.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{p.count} devis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
                          <div className="h-full gradient-brand rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold tabular-nums whitespace-nowrap">{formatDZD(p.revenue)}</span>
                      </div>
                    </div>
                  );
                })}
                {stats.topProducts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.noData")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Financial Summary */}
          <Card className="glass-card border-white/50 dark:border-white/10 shadow-md rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> {t("dashboard.financialSummary")}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40">
                  <span className="text-muted-foreground">{t("dashboard.allTimeRevenue")}</span>
                  <span className="font-bold tabular-nums">{formatDZD(stats.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                  <span className="text-emerald-700 dark:text-emerald-400">{t("dashboard.totalCollected")}</span>
                  <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatDZD(stats.totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <span className="text-amber-700 dark:text-amber-400">{t("dashboard.outstanding")}</span>
                  <span className="font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatDZD(stats.totalRemaining)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "En attente" },
    accepted: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Accepté" },
    rejected: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Refusé" },
  };
  const c = config[status] || config.pending;
  return <Badge variant="secondary" className={`text-[10px] ${c.color}`}>{c.label}</Badge>;
}
