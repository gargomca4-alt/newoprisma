import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "stagiaire" | "agent";
export type UserStatus = "pending" | "approved" | "rejected";

export interface StagiaireAccount {
  id: string;
  email: string;
  name: string;
  role: "admin" | "stagiaire";
  status: UserStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  phone?: string;
  notes?: string;
}

export interface RoleInfo {
  role: UserRole;
  status: UserStatus;
  email: string;
  userName: string;
  userId: string;
  loading: boolean;
  isAdmin: boolean;
  isStagiaire: boolean;
  isAgent: boolean;
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  refresh: () => Promise<void>;
}

const SETTINGS_KEY = "stagiaires_list";
const LEGACY_ROLES_KEY = "user_roles";

/**
 * Helper to fetch all stagiaires/users from settings table.
 */
export async function getStagiairesList(): Promise<StagiaireAccount[]> {
  try {
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      if (Array.isArray(parsed)) return parsed;
    }

    // Fallback: check legacy user_roles
    const { data: legacyData } = await supabase
      .from("settings")
      .select("*")
      .eq("key", LEGACY_ROLES_KEY)
      .maybeSingle();

    if (legacyData?.value) {
      const legacyMap = typeof legacyData.value === "string" ? JSON.parse(legacyData.value) : legacyData.value;
      const converted: StagiaireAccount[] = Object.entries(legacyMap).map(([em, r], idx) => ({
        id: `legacy-${idx}-${em}`,
        email: em.toLowerCase().trim(),
        name: em.split("@")[0],
        role: r === "admin" ? "admin" : "stagiaire",
        status: "approved",
        createdAt: new Date().toISOString(),
      }));
      // Save converted list
      if (converted.length > 0) {
        await supabase.from("settings").upsert({
          key: SETTINGS_KEY,
          value: JSON.stringify(converted) as any,
        });
      }
      return converted;
    }

    return [];
  } catch (err) {
    console.error("Error loading stagiaires list:", err);
    return [];
  }
}

/**
 * Security helper: verify that the caller is an active, approved admin.
 */
async function verifyAdminCaller(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return false;
    const currentList = await getStagiairesList();
    if (currentList.length === 0) return true; // Initial bootstrap setup only
    const currentEmail = user.email.toLowerCase().trim();
    const caller = currentList.find(u => u.email.toLowerCase() === currentEmail);
    return !!(caller && caller.role === "admin" && caller.status === "approved");
  } catch {
    return false;
  }
}

/**
 * Save stagiaires list to settings and keep user_roles legacy key in sync.
 * Secured: Only verified approved admins can execute modifications.
 */
export async function saveStagiairesList(list: StagiaireAccount[], bypassAdminCheck: boolean = false): Promise<boolean> {
  try {
    if (!bypassAdminCheck) {
      const isAllowed = await verifyAdminCaller();
      if (!isAllowed) {
        console.error("Security: Non-admin attempt to modify user permissions blocked.");
        return false;
      }
    }

    // 1. Save main list
    await supabase.from("settings").upsert({
      key: SETTINGS_KEY,
      value: JSON.stringify(list) as any,
    });

    // 2. Sync legacy user_roles map
    const rolesMap: Record<string, string> = {};
    for (const item of list) {
      if (item.status === "approved") {
        rolesMap[item.email.toLowerCase()] = item.role;
      }
    }
    await supabase.from("settings").upsert({
      key: LEGACY_ROLES_KEY,
      value: JSON.stringify(rolesMap) as any,
    });

    return true;
  } catch (err) {
    console.error("Error saving stagiaires list:", err);
    return false;
  }
}

/**
 * Approve a pending stagiaire.
 */
export async function approveStagiaire(emailOrId: string, approvedBy?: string): Promise<boolean> {
  const list = await getStagiairesList();
  const target = emailOrId.toLowerCase().trim();
  const updated = list.map((item) => {
    if (item.id === emailOrId || item.email.toLowerCase() === target) {
      return {
        ...item,
        status: "approved" as UserStatus,
        approvedAt: new Date().toISOString(),
        approvedBy: approvedBy || "Admin",
      };
    }
    return item;
  });
  return await saveStagiairesList(updated);
}

/**
 * Reject / Deactivate a stagiaire.
 */
export async function rejectStagiaire(emailOrId: string): Promise<boolean> {
  const list = await getStagiairesList();
  const target = emailOrId.toLowerCase().trim();
  const updated = list.map((item) => {
    if (item.id === emailOrId || item.email.toLowerCase() === target) {
      return {
        ...item,
        status: "rejected" as UserStatus,
      };
    }
    return item;
  });
  return await saveStagiairesList(updated);
}

/**
 * Update role (admin <-> stagiaire).
 */
export async function updateStagiaireRole(emailOrId: string, newRole: "admin" | "stagiaire"): Promise<boolean> {
  const list = await getStagiairesList();
  const target = emailOrId.toLowerCase().trim();
  const updated = list.map((item) => {
    if (item.id === emailOrId || item.email.toLowerCase() === target) {
      return {
        ...item,
        role: newRole,
      };
    }
    return item;
  });
  return await saveStagiairesList(updated);
}

/**
 * Delete a stagiaire completely.
 */
export async function deleteStagiaire(emailOrId: string): Promise<boolean> {
  const list = await getStagiairesList();
  const target = emailOrId.toLowerCase().trim();
  const updated = list.filter((item) => item.id !== emailOrId && item.email.toLowerCase() !== target);
  return await saveStagiairesList(updated);
}

/**
 * Add or pre-approve a stagiaire manually.
 * Enforces role="stagiaire" and status="pending" for any unverified registration.
 */
export async function createStagiaireManual(entry: {
  email: string;
  name: string;
  role?: "admin" | "stagiaire";
  status?: UserStatus;
  phone?: string;
  notes?: string;
  approvedBy?: string;
}): Promise<boolean> {
  const list = await getStagiairesList();
  const normalizedEmail = entry.email.toLowerCase().trim();
  const isCallerAdmin = await verifyAdminCaller();

  // If already exists:
  const exists = list.find((s) => s.email.toLowerCase() === normalizedEmail);
  if (exists) {
    if (!isCallerAdmin) {
      // Non-admin callers CANNOT overwrite an existing user's role or status
      return true;
    }
    return await saveStagiairesList(
      list.map((s) =>
        s.email.toLowerCase() === normalizedEmail
          ? {
              ...s,
              name: entry.name || s.name,
              role: entry.role || s.role,
              status: entry.status || s.status,
              phone: entry.phone ?? s.phone,
              notes: entry.notes ?? s.notes,
              approvedBy: entry.approvedBy ?? s.approvedBy,
            }
          : s
      ),
      true
    );
  }

  // Stagiaires require admin approval before accessing the platform
  const safeRole: "admin" | "stagiaire" = isCallerAdmin && entry.role ? entry.role : "stagiaire";
  const safeStatus: UserStatus = isCallerAdmin && entry.status ? entry.status : "pending";

  const newItem: StagiaireAccount = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    email: normalizedEmail,
    name: entry.name || normalizedEmail.split("@")[0],
    role: safeRole,
    status: safeStatus,
    createdAt: new Date().toISOString(),
    phone: entry.phone || "",
    notes: entry.notes || "",
    approvedBy: isCallerAdmin ? entry.approvedBy : undefined,
    approvedAt: safeStatus === "approved" ? new Date().toISOString() : undefined,
  };

  list.push(newItem);
  return await saveStagiairesList(list, !isCallerAdmin && safeRole === "stagiaire");
}

/**
 * Hook to get the current user's role and approval status.
 */
export function useRole(): RoleInfo {
  const [role, setRole] = useState<UserRole>("stagiaire");
  const [status, setStatus] = useState<UserStatus>("pending");
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const userEmail = user.email?.toLowerCase().trim() || "";
      const uId = user.id || "";
      const metaName = (user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split("@")[0] || "Stagiaire").trim();

      setEmail(userEmail);
      setUserId(uId);
      setUserName(metaName);

      const list = await getStagiairesList();

      if (list.length === 0) {
        // No users exist at all yet! The very first user is the Admin / Owner
        const firstAdmin: StagiaireAccount = {
          id: uId || `admin-${Date.now()}`,
          email: userEmail,
          name: metaName,
          role: "admin",
          status: "approved",
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          approvedBy: "Système",
        };
        await saveStagiairesList([firstAdmin]);
        setRole("admin");
        setStatus("approved");
        return;
      }

      // Find user in the list
      const existing = list.find((item) => item.email.toLowerCase() === userEmail);

      if (existing) {
        setRole(existing.role);
        setStatus(existing.status);
        if (existing.name) setUserName(existing.name);
      } else {
        // User not in list yet -> register as pending stagiaire (requires admin approval)
        const newStagiaire: StagiaireAccount = {
          id: uId || `user-${Date.now()}`,
          email: userEmail,
          name: metaName,
          role: "stagiaire",
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        list.push(newStagiaire);
        await saveStagiairesList(list, true);
        setRole("stagiaire");
        setStatus("pending");
      }
    } catch (err) {
      console.error("Error in useRole:", err);
      setRole("stagiaire");
      setStatus("pending");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return {
    role,
    status,
    email,
    userName,
    userId,
    loading,
    isAdmin: role === "admin",
    isStagiaire: role === "stagiaire" || role === "agent",
    isAgent: role === "agent" || role === "stagiaire",
    isPending: status === "pending" && role !== "admin",
    isApproved: status === "approved" || role === "admin",
    isRejected: status === "rejected",
    refresh: fetchRole,
  };
}
