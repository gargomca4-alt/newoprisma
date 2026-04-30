import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "agent";

interface RoleInfo {
  role: UserRole;
  email: string;
  loading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
}

/**
 * Hook to get the current user's role.
 * Roles are stored in the `settings` table under key `user_roles`
 * as a JSON object: { "email@example.com": "admin", "agent@example.com": "agent" }
 * The first user (owner) is always admin by default.
 */
export function useRole(): RoleInfo {
  const [role, setRole] = useState<UserRole>("agent");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email?.toLowerCase() || "";

        if (mounted) setEmail(userEmail);

        // Load roles map from settings
        const { data } = await supabase
          .from("settings")
          .select("*")
          .eq("key", "user_roles")
          .maybeSingle();

        if (!mounted) return;

        if (data?.value) {
          const rolesMap = typeof data.value === "string"
            ? JSON.parse(data.value)
            : data.value;

          if (rolesMap[userEmail]) {
            setRole(rolesMap[userEmail] as UserRole);
          } else if (Object.keys(rolesMap).length === 0) {
            // No roles set yet — first user becomes admin
            setRole("admin");
            const updated = { [userEmail]: "admin" };
            await supabase.from("settings").upsert({
              key: "user_roles",
              value: JSON.stringify(updated) as any,
            });
          } else {
            // User not in roles map — default to agent
            setRole("agent");
          }
        } else {
          // No roles setting exists — first user becomes admin
          setRole("admin");
          const rolesMap = { [userEmail]: "admin" };
          await supabase.from("settings").upsert({
            key: "user_roles",
            value: JSON.stringify(rolesMap) as any,
          });
        }
      } catch {
        setRole("agent");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return {
    role,
    email,
    loading,
    isAdmin: role === "admin",
    isAgent: role === "agent",
  };
}
