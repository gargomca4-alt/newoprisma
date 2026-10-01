// Price History and Stock Tracking utilities for Oprisma Design
import { supabase } from "@/integrations/supabase/client";

export interface PriceHistoryEntry {
  id: string;
  date: string;
  itemType: "paper" | "print" | "finition" | "product";
  itemId: string;
  itemName: string;
  variant?: string; // e.g. "300g", "Recto-Verso"
  oldPrice: number;
  newPrice: number;
  user?: string;
}

export interface StockEntry {
  paperId: string;
  paperName: string;
  stockSheets: number;
  minThreshold: number;
  lastUpdated: string;
}

const PRICE_HISTORY_KEY = "oprisma_price_history";
const STOCK_KEY = "oprisma_paper_stock";

export async function recordPriceChange(entry: Omit<PriceHistoryEntry, "id" | "date">) {
  try {
    const raw = localStorage.getItem(PRICE_HISTORY_KEY);
    const history: PriceHistoryEntry[] = raw ? JSON.parse(raw) : [];

    const newRecord: PriceHistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toISOString()
    };

    history.unshift(newRecord);
    // Keep last 100 entries
    const trimmed = history.slice(0, 100);
    localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(trimmed));

    // Also persist to Supabase settings for cross-device visibility
    await supabase.from("settings").upsert({
      key: "price_history",
      value: JSON.stringify(trimmed) as any
    });
  } catch (e) {
    console.error("Erreur enregistrement historique prix:", e);
  }
}

export async function getPriceHistory(): Promise<PriceHistoryEntry[]> {
  try {
    // Try Supabase first
    const { data } = await supabase.from("settings").select("*").eq("key", "price_history").maybeSingle();
    if (data?.value) {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      if (Array.isArray(parsed)) return parsed;
    }
    // Fallback to localStorage
    const raw = localStorage.getItem(PRICE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getPaperStock(): Promise<Record<string, { stockSheets: number; minThreshold: number }>> {
  try {
    const { data } = await supabase.from("settings").select("*").eq("key", "paper_stock").maybeSingle();
    if (data?.value) {
      return typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    }
    const raw = localStorage.getItem(STOCK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function updatePaperStock(paperId: string, stockSheets: number, minThreshold = 200) {
  try {
    const current = await getPaperStock();
    const updated = {
      ...current,
      [paperId]: { stockSheets: Math.max(0, stockSheets), minThreshold }
    };
    localStorage.setItem(STOCK_KEY, JSON.stringify(updated));
    await supabase.from("settings").upsert({
      key: "paper_stock",
      value: JSON.stringify(updated) as any
    });
    return updated;
  } catch (e) {
    console.error("Erreur mise à jour stock:", e);
    return null;
  }
}
