import { supabase } from "@/integrations/supabase/client";

export async function logAction(userEmail: string, role: string, action: string, details: string = "") {
  try {
    const { data } = await supabase.from("settings").select("*").eq("key", "activity_logs").maybeSingle();
    let logs: any[] = [];
    if (data?.value) {
      logs = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      if (!Array.isArray(logs)) logs = [];
    }
    
    // Add new log at the beginning
    logs.unshift({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: userEmail,
      role,
      action,
      details
    });

    // Keep only last 500 logs to prevent bloat
    if (logs.length > 500) logs = logs.slice(0, 500);

    await supabase.from("settings").upsert({
      key: "activity_logs",
      value: JSON.stringify(logs) as any
    });
  } catch (e) {
    console.error("Failed to log action", e);
  }
}
