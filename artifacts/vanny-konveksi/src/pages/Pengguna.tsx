import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Loader2, RefreshCw, ShieldCheck, Users, UserCog, MoreVertical, Trash2, Crown, Briefcase, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth, UserRole } from "@/lib/auth";

interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  created_at: string;
}

const roleStyles: Record<UserRole, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  admin:     { label: "Admin",     bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", icon: Crown },
  karyawan:  { label: "Karyawan",  bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   icon: Briefcase },
  pelanggan: { label: "Pelanggan", bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: UserIcon },
};

const avatarColors = [
  "bg-teal-100 text-teal-700", "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700", "bg-blue-100 text-blue-700",
  "bg-rose-100 text-rose-700", "bg-emerald-100 text-emerald-700",
];

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "-"; }
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

export default function Pengguna() {
  const { toast } = useToast();
  const { profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Gagal memuat data", description: error.message, variant: "destructive" });
    } else if (data) {
      setProfiles(data as ProfileRow[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = profiles.filter((p) => {
    const matchSearch = !search ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleChangeRole = async (target: ProfileRow, newRole: UserRole) => {
    if (target.role === newRole) return;
    setSavingId(target.id);
    try {
      const res = await fetch(`/api/users/${target.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal mengubah peran");
      toast({ title: "Peran diperbarui", description: `${target.full_name} sekarang ${roleStyles[newRole].label}` });
      setProfiles((prev) => prev.map((p) => (p.id === target.id ? { ...p, role: newRole } : p)));
    } catch (err: any) {
      toast({ title: "Gagal mengubah peran", description: err.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus pengguna");
      toast({ title: "Pengguna dihapus", description: `${deleteTarget.full_name} sudah dihapus dari sistem.` });
      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Gagal menghapus", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: profiles.length,
    admin: profiles.filter((p) => p.role === "admin").length,
    karyawan: profiles.filter((p) => p.role === "karyawan").length,
    pelanggan: profiles.filter((p) => p.role === "pelanggan").length,
  };

  const statCards = [
    { label: "Total Pengguna", value: stats.total,     icon: Users,       color: "from-teal-500 to-teal-600" },
    { label: "Admin",          value: stats.admin,     icon: Crown,       color: "from-violet-500 to-violet-600" },
    { label: "Karyawan",       value: stats.karyawan,  icon: Briefcase,   color: "from-blue-500 to-blue-600" },
    { label: "Pelanggan",      value: stats.pelanggan, icon: UserIcon,    color: "from-amber-500 to-amber-600" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Manajemen Pengguna</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Kelola akun dan hak akses semua pengguna sistem.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="border-gray-200 h-9 rounded-lg gap-1.5">
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">{card.label}</span>
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <card.icon className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <div className="text-2xl font-display font-bold text-gray-900">{card.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau email..."
                className="h-9 pl-9 border-gray-200 text-sm"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {(["all", "admin", "karyawan", "pelanggan"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 h-9 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                    roleFilter === r
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {r === "all" ? "Semua" : roleStyles[r].label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <ShieldCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Tidak ada pengguna yang cocok.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="text-xs font-semibold">Pengguna</TableHead>
                      <TableHead className="text-xs font-semibold">Email</TableHead>
                      <TableHead className="text-xs font-semibold">Peran</TableHead>
                      <TableHead className="text-xs font-semibold">Bergabung</TableHead>
                      <TableHead className="text-xs font-semibold w-12 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p, idx) => {
                      const RoleIcon = roleStyles[p.role].icon;
                      const isSelf = currentProfile?.id === p.id;
                      const isSaving = savingId === p.id;
                      return (
                        <TableRow key={p.id} className="hover:bg-gray-50/40">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className={`text-xs font-semibold ${avatarColors[idx % avatarColors.length]}`}>
                                  {getInitials(p.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                  {p.full_name}
                                  {isSelf && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-teal-200 text-teal-700 bg-teal-50">Anda</Badge>}
                                </div>
                                <div className="text-[11px] text-gray-400 font-mono">{p.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{p.email || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1 ${roleStyles[p.role].bg} ${roleStyles[p.role].text} ${roleStyles[p.role].border}`}>
                              <RoleIcon className="h-3 w-3" />
                              {roleStyles[p.role].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDate(p.created_at)}</TableCell>
                          <TableCell className="text-right">
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin text-teal-600 ml-auto" />
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSelf}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuLabel className="text-xs">Ubah Peran</DropdownMenuLabel>
                                  {(["admin", "karyawan", "pelanggan"] as UserRole[]).map((r) => (
                                    <DropdownMenuItem
                                      key={r}
                                      disabled={p.role === r}
                                      onClick={() => handleChangeRole(p, r)}
                                      className="text-sm gap-2"
                                    >
                                      <UserCog className="h-3.5 w-3.5" />
                                      Jadikan {roleStyles[r].label}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget(p)}
                                    className="text-sm gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Hapus Profil
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map((p, idx) => {
                  const RoleIcon = roleStyles[p.role].icon;
                  const isSelf = currentProfile?.id === p.id;
                  const isSaving = savingId === p.id;
                  return (
                    <div key={p.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className={`text-xs font-semibold ${avatarColors[idx % avatarColors.length]}`}>
                            {getInitials(p.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                {p.full_name}
                                {isSelf && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-teal-200 text-teal-700 bg-teal-50">Anda</Badge>}
                              </div>
                              <div className="text-xs text-gray-500 truncate mt-0.5">{p.email || "Tanpa email"}</div>
                            </div>
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 shrink-0" disabled={isSelf}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuLabel className="text-xs">Ubah Peran</DropdownMenuLabel>
                                  {(["admin", "karyawan", "pelanggan"] as UserRole[]).map((r) => (
                                    <DropdownMenuItem
                                      key={r}
                                      disabled={p.role === r}
                                      onClick={() => handleChangeRole(p, r)}
                                      className="text-sm gap-2"
                                    >
                                      <UserCog className="h-3.5 w-3.5" />
                                      Jadikan {roleStyles[r].label}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget(p)}
                                    className="text-sm gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Hapus Profil
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className={`gap-1 text-[10px] ${roleStyles[p.role].bg} ${roleStyles[p.role].text} ${roleStyles[p.role].border}`}>
                              <RoleIcon className="h-2.5 w-2.5" />
                              {roleStyles[p.role].label}
                            </Badge>
                            <span className="text-[11px] text-gray-400">{formatDate(p.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus profil pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Profil <span className="font-semibold">{deleteTarget?.full_name}</span> akan dihapus dari sistem
              dan kehilangan akses. Akun login mungkin masih ada di sistem autentikasi (perlu dihapus manual dari Supabase). Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
