import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VALID_ROLES = ["admin", "karyawan", "pelanggan"] as const;
type UserRole = (typeof VALID_ROLES)[number];

router.patch("/users/:id/role", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body as { role: string };

  if (!VALID_ROLES.includes(role as UserRole)) {
    return res.status(400).json({ error: "Role tidak valid" });
  }

  const { error } = await adminSupabase
    .from("profiles")
    .update({ role })
    .eq("id", id);

  if (error) {
    console.error("Update role error:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  const { error: profileError } = await adminSupabase
    .from("profiles")
    .delete()
    .eq("id", id);

  if (profileError) {
    console.error("Delete profile error:", profileError);
    return res.status(500).json({ error: profileError.message });
  }

  const { error: authError } = await adminSupabase.auth.admin.deleteUser(id);

  if (authError) {
    console.error("Delete auth user error:", authError);
  }

  res.json({ success: true });
});

export default router;
