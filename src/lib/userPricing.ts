import { supabase } from "@/integrations/supabase/client";

export interface UserPriceOverrides {
  paper_types?: Record<string, { weight_prices?: Record<string, number>; price_per_sheet_sra3?: number }>;
  print_types?: Record<string, { cost_per_sheet?: number; setup_cost?: number; cost_per_color?: number; recto_verso_multiplier?: number }>;
  finitions?: Record<string, { price?: number }>;
  pelliculages?: Record<string, { price_per_sqm?: number }>;
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
  section: "paper_types" | "print_types" | "finitions" | "pelliculages",
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
  section?: "paper_types" | "print_types" | "finitions" | "pelliculages",
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
export function hasCustomPrices(profile: UserPriceOverrides, section?: "paper_types" | "print_types" | "finitions" | "pelliculages"): boolean {
  if (section) {
    return Boolean(profile[section] && Object.keys(profile[section] || {}).length > 0);
  }
  return (
    Boolean(profile.paper_types && Object.keys(profile.paper_types).length > 0) ||
    Boolean(profile.print_types && Object.keys(profile.print_types).length > 0) ||
    Boolean(profile.finitions && Object.keys(profile.finitions).length > 0) ||
    Boolean(profile.pelliculages && Object.keys(profile.pelliculages).length > 0)
  );
}

/**
 * Merge base items with user price overrides.
 */
export function applyUserPricing<T extends { id: string }>(
  items: T[],
  section: "paper_types" | "print_types" | "finitions" | "pelliculages",
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

  // If quote has NO ownership info attached (legacy quote), consider it owned if no user info
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
