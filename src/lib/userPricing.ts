import { supabase } from "@/integrations/supabase/client";

export interface UserPriceOverrides {
  paper_types?: Record<string, { weight_prices?: Record<string, number>; price_per_sheet_sra3?: number }>;
  print_types?: Record<string, { cost_per_sheet?: number; setup_cost?: number; cost_per_color?: number; recto_verso_multiplier?: number }>;
  finitions?: Record<string, { price?: number }>;
  pelliculages?: Record<string, { price_per_sqm?: number }>;
  products?: Record<string, { base_price?: number; default_markup?: number }>;
  updated_at?: string;
}

const LOCAL_STORAGE_PREFIX = "oprisma_user_prices_";

/**
 * Get the storage key for a user's pricing profile.
 */
export function getUserPricingKey(userId?: string, email?: string): string {
  if (userId) return `user_prices_${userId}`;
  if (email) return `user_prices_${email.replace(/[@.]/g, "_")}`;
  return "user_prices_default";
}

/**
 * Get the storage key for a user's isolated client suggestions.
 * Non-admins have their own isolated client key so they never see admin/other users' clients!
 */
export function getUserClientsKey(userId?: string, email?: string, isAdmin?: boolean): string {
  if (isAdmin) return "clients_list";
  if (userId) return `user_clients_${userId}`;
  if (email) return `user_clients_${email.replace(/[@.]/g, "_")}`;
  return "user_clients_guest";
}

/**
 * Load user price overrides from cache (localStorage) and Supabase settings.
 */
export async function loadUserPrices(userId?: string, email?: string): Promise<UserPriceOverrides> {
  const key = getUserPricingKey(userId, email);
  
  // 1. Try local cache first for instant response
  let cached: UserPriceOverrides = {};
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    if (raw) cached = JSON.parse(raw);
  } catch {}

  // 2. Fetch from Supabase settings
  try {
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(parsed));
      return parsed;
    }
  } catch (err) {
    console.error("Error loading user pricing:", err);
  }

  return cached;
}

/**
 * Save price overrides for a specific user without affecting others.
 */
export async function saveUserPriceOverride(
  section: "paper_types" | "print_types" | "finitions" | "pelliculages" | "products",
  itemId: string,
  overrides: Record<string, any>,
  userId?: string,
  email?: string
): Promise<boolean> {
  const key = getUserPricingKey(userId, email);
  const current = await loadUserPrices(userId, email);

  const updatedSection = {
    ...(current[section] || {}),
    [itemId]: {
      ...((current[section] as any)?.[itemId] || {}),
      ...overrides,
    },
  };

  const updatedProfile: UserPriceOverrides = {
    ...current,
    [section]: updatedSection,
    updated_at: new Date().toISOString(),
  };

  // Save to local cache
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(updatedProfile));
  } catch {}

  // Persist to Supabase settings
  const { error } = await supabase.from("settings").upsert({
    key,
    value: JSON.stringify(updatedProfile) as any,
  });

  return !error;
}

/**
 * Reset user's custom prices back to company catalog defaults.
 */
export async function resetUserPrices(
  section?: "paper_types" | "print_types" | "finitions" | "pelliculages" | "products",
  userId?: string,
  email?: string
): Promise<boolean> {
  const key = getUserPricingKey(userId, email);
  if (!section) {
    // Reset all
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    } catch {}
    const { error } = await supabase.from("settings").delete().eq("key", key);
    return !error;
  }

  // Reset only one section
  const current = await loadUserPrices(userId, email);
  delete current[section];
  current.updated_at = new Date().toISOString();

  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(current));
  } catch {}

  const { error } = await supabase.from("settings").upsert({
    key,
    value: JSON.stringify(current) as any,
  });

  return !error;
}

/**
 * Check if the user has custom prices configured.
 */
export function hasCustomPrices(
  profile: UserPriceOverrides,
  section?: "paper_types" | "print_types" | "finitions" | "pelliculages" | "products"
): boolean {
  if (section) {
    return Boolean(profile[section] && Object.keys(profile[section] || {}).length > 0);
  }
  return (
    Boolean(profile.paper_types && Object.keys(profile.paper_types).length > 0) ||
    Boolean(profile.print_types && Object.keys(profile.print_types).length > 0) ||
    Boolean(profile.finitions && Object.keys(profile.finitions).length > 0) ||
    Boolean(profile.pelliculages && Object.keys(profile.pelliculages).length > 0) ||
    Boolean(profile.products && Object.keys(profile.products).length > 0)
  );
}

/**
 * Merge base items with user price overrides.
 */
export function applyUserPricing<T extends { id: string }>(
  items: T[],
  section: "paper_types" | "print_types" | "finitions" | "pelliculages" | "products",
  profile: UserPriceOverrides
): T[] {
  const overrides = profile[section];
  if (!overrides || Object.keys(overrides).length === 0) return items;

  return items.map((item) => {
    const itemOverride = (overrides as any)[item.id];
    if (!itemOverride) return item;
    return {
      ...item,
      ...itemOverride,
      _isCustomPrice: true,
    };
  });
}

/**
 * Load isolated client list for a specific user (prevents non-admins from seeing admin clients).
 */
export async function loadUserClientsList(
  userId?: string,
  email?: string,
  isAdmin?: boolean
): Promise<{ name: string; company?: string; phone?: string }[]> {
  try {
    const key = getUserClientsKey(userId, email, isAdmin);
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error loading user clients:", err);
  }
  return [];
}

/**
 * Save a client to the user's isolated client list.
 */
export async function saveUserClientToList(
  client: { name: string; company?: string; phone?: string },
  userId?: string,
  email?: string,
  isAdmin?: boolean
): Promise<void> {
  if (!client.name?.trim()) return;
  try {
    const currentList = await loadUserClientsList(userId, email, isAdmin);
    const cleanName = client.name.trim();
    const cleanCompany = (client.company || "").trim();
    const cleanPhone = (client.phone || "").trim();

    // Check if already in list
    const exists = currentList.find(
      (c) => c.name.toLowerCase().trim() === cleanName.toLowerCase()
    );

    let updated: { name: string; company?: string; phone?: string }[];
    if (exists) {
      updated = currentList.map((c) =>
        c.name.toLowerCase().trim() === cleanName.toLowerCase()
          ? { ...c, company: cleanCompany || c.company, phone: cleanPhone || c.phone }
          : c
      );
    } else {
      updated = [{ name: cleanName, company: cleanCompany, phone: cleanPhone }, ...currentList];
    }

    const key = getUserClientsKey(userId, email, isAdmin);
    await supabase.from("settings").upsert({
      key,
      value: JSON.stringify(updated.slice(0, 100)) as any,
    });
  } catch (err) {
    console.error("Error saving user client:", err);
  }
}

/**
 * Helper to test if a quote belongs to a user.
 */
export function isQuoteOwnedByUser(quote: any, userId?: string, email?: string): boolean {
  if (!quote) return false;
  const normalizedEmail = (email || "").toLowerCase().trim();

  // Match by top-level user_id if present
  if (userId && quote.user_id && quote.user_id === userId) return true;

  // Match inside details
  const details = quote.details || {};
  if (userId && (details.userId === userId || details.user_id === userId)) return true;
  if (normalizedEmail) {
    const createdBy = (details.createdBy || details.userEmail || "").toLowerCase().trim();
    if (createdBy === normalizedEmail) return true;
  }

  return false;
}

/**
 * Safe insert for quotes that works whether the 'user_id' column exists in Supabase or not.
 */
export async function saveQuoteWithUser(payload: any, userId?: string, userEmail?: string) {
  const enrichedPayload = {
    ...payload,
    details: {
      ...(payload.details || {}),
      userId: userId || null,
      userEmail: userEmail || null,
      createdBy: userEmail || null,
    },
  };

  // Try with user_id first
  if (userId) {
    const { data, error } = await supabase
      .from("quotes")
      .insert({ ...enrichedPayload, user_id: userId } as any)
      .select();

    if (!error) return { data, error: null };

    // If column doesn't exist yet, retry without top-level user_id
    if (error.message?.includes("user_id") || error.code === "PGRST204" || error.code === "42703") {
      const fallback = await supabase
        .from("quotes")
        .insert(enrichedPayload as any)
        .select();
      return fallback;
    }

    return { data, error };
  }

  // No user ID, insert standard
  return await supabase.from("quotes").insert(enrichedPayload as any).select();
}
