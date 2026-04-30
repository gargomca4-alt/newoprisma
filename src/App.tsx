import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppShell } from "@/components/AppShell";

import { AuthGuard } from "@/components/AuthGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Lazy-loaded page components for code-splitting
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calculator = lazy(() => import("./pages/Calculator"));
const Products = lazy(() => import("./pages/Products"));
const Paper = lazy(() => import("./pages/Paper"));
const Print = lazy(() => import("./pages/Print"));
const Finitions = lazy(() => import("./pages/Finitions"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Settings = lazy(() => import("./pages/Settings"));
const Payment = lazy(() => import("./pages/Payment"));
const Clients = lazy(() => import("./pages/Clients"));
const Devis = lazy(() => import("./pages/Devis"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function OfflineSyncManager() {
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const queueStr = localStorage.getItem("offline_quotes_queue");
        if (!queueStr) return;
        const queue = JSON.parse(queueStr);
        if (!Array.isArray(queue) || queue.length === 0) return;

        toast.info(`Synchronisation de ${queue.length} devis hors ligne...`);
        let successCount = 0;
        
        for (const q of queue) {
          const { _id, ...payload } = q;
          const { error } = await supabase.from("quotes").insert(payload);
          if (!error) successCount++;
        }

        if (successCount > 0) {
          toast.success(`${successCount} devis synchronisés avec succès !`);
        }
        
        localStorage.removeItem("offline_quotes_queue");
      } catch (e) {
        console.error("Erreur de synchronisation hors ligne", e);
      }
    };

    window.addEventListener("online", handleOnline);
    if (navigator.onLine) handleOnline();

    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return null;
}

function ShellRoutes() {
  const location = useLocation();
  // Devis page renders fullscreen for printing
  if (location.pathname === "/devis") {
    return (
      <AuthGuard>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/devis" element={<Devis />} />
          </Routes>
        </Suspense>
      </AuthGuard>
    );
  }
  
  if (location.pathname === "/auth") {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <AuthGuard>
      <AppShell>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/products" element={<Products />} />
            <Route path="/paper" element={<Paper />} />
            <Route path="/print" element={<Print />} />
            <Route path="/finitions" element={<Finitions />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppShell>
    </AuthGuard>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <OfflineSyncManager />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ShellRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
