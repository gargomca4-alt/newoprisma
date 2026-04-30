import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppShell } from "@/components/AppShell";

// Lazy-loaded page components for code-splitting
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

function ShellRoutes() {
  const location = useLocation();
  // Devis page renders fullscreen for printing
  if (location.pathname === "/devis") {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/devis" element={<Devis />} />
        </Routes>
      </Suspense>
    );
  }
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Calculator />} />
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
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
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
