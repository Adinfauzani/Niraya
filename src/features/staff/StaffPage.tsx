"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MoreHorizontalIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatTile } from "@/components/shared/StatTile";
import { TablePagination } from "@/components/shared/TablePagination";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials } from "@/features/customers/CustomerDetailSheet";
import { usePagination } from "@/hooks/usePagination";
import { fetchLoginUsers, removeLoginUserProfile, updateLoginUserRole, type LoginUserRow } from "@/lib/api";
import { APP_ROLE_DESCRIPTIONS, APP_ROLE_LABELS, appRoleLabel } from "@/lib/businessLabels";
import { formatDateTime, formatNumber } from "@/lib/format";

const ROLE_OPTIONS = ["user", "cashier", "manager", "admin", "owner"] as const;
type AppRole = (typeof ROLE_OPTIONS)[number];

const ROLE_BADGE_VARIANT: Record<AppRole, "default" | "info" | "warning" | "secondary" | "outline"> = {
  owner: "default",
  admin: "info",
  manager: "warning",
  cashier: "secondary",
  user: "outline",
};

function readError(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function StaffPage() {
  const [rows, setRows] = useState<LoginUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editing, setEditing] = useState<LoginUserRow | null>(null);
  const [nextRole, setNextRole] = useState<AppRole>("user");
  const [savingRole, setSavingRole] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LoginUserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setRows(await fetchLoginUsers());
    } catch (e) {
      setError(readError(e, "Gagal memuat pengguna login."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (!q) return true;
      return (r.name || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q) || r.userId.toLowerCase().includes(q);
    });
  }, [rows, search, roleFilter]);

  const pagination = usePagination(filtered.length, 15);
  const pageRows = filtered.slice(pagination.start, pagination.end);
  const ownerCount = rows.filter((r) => r.role === "owner").length;
  const activeOpsCount = rows.filter((r) => ["cashier", "manager", "admin", "owner"].includes(r.role)).length;
  const basicUserCount = rows.filter((r) => r.role === "user").length;

  function openEdit(row: LoginUserRow) {
    setEditing(row);
    setNextRole(row.role);
  }

  async function saveRole() {
    if (!editing) return;
    setSavingRole(true);
    try {
      await updateLoginUserRole(editing.userId, nextRole);
      toast.success("Role pengguna diperbarui", { description: `${editing.name || editing.email || editing.userId} → ${appRoleLabel(nextRole)}` });
      setEditing(null);
      await load();
    } catch (e) {
      toast.error("Gagal memperbarui role", { description: readError(e, "Silakan coba lagi.") });
    } finally {
      setSavingRole(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeLoginUserProfile(deleteTarget.userId);
      toast.success("Profil akses dihapus", { description: "Akun auth tidak dihapus; jika login lagi, profil dasar dapat dibuat ulang." });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error("Gagal menghapus profil", { description: readError(e, "Silakan coba lagi.") });
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<LoginUserRow>[] = [
    {
      key: "user",
      header: "Pengguna login",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-[11px] font-semibold">{initials(row.name || row.email || "U")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.name || "Tanpa nama"}</p>
            <p className="truncate text-xs text-muted-foreground">{row.email || row.userId}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => <Badge variant={ROLE_BADGE_VARIANT[row.role]}>{appRoleLabel(row.role)}</Badge>,
    },
    {
      key: "id",
      header: "User ID",
      headerClassName: "hidden xl:table-cell",
      className: "hidden font-mono text-[11px] text-muted-foreground xl:table-cell",
      cell: (row) => <span className="block max-w-[220px] truncate" title={row.userId}>{row.userId}</span>,
    },
    {
      key: "updated",
      header: "Diperbarui",
      headerClassName: "hidden md:table-cell",
      className: "hidden text-xs text-muted-foreground md:table-cell",
      cell: (row) => (row.updatedAt ? formatDateTime(row.updatedAt) : "-"),
    },
    {
      key: "actions",
      header: <span className="sr-only">Aksi</span>,
      headerClassName: "w-10",
      className: "text-right",
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Aksi untuk ${row.name || row.email || row.userId}`}>
                <MoreHorizontalIcon aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Akses pengguna</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => openEdit(row)}>
                <UserRoundIcon aria-hidden="true" />Ubah role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(row)}>
                <Trash2Icon aria-hidden="true" />Hapus profil akses
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Staff / Akses Pengguna"
        description="Daftar akun yang pernah login (core.UserProfiles). Ubah role aplikasi dengan aman; identitas login tetap dikelola Supabase Auth."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCwIcon className={loading ? "animate-spin" : ""} aria-hidden="true" />Muat ulang
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Pengguna terdaftar" value={formatNumber(rows.length)} hint="Profil login aplikasi" icon={UsersIcon} />
        <StatTile label="Akses operasional" value={formatNumber(activeOpsCount)} hint="Owner/admin/manager/kasir" icon={ShieldCheckIcon} tone="info" />
        <StatTile label="User dasar" value={formatNumber(basicUserCount)} hint="Role default setelah login" icon={UserRoundIcon} />
        <StatTile label="Owner" value={formatNumber(ownerCount)} hint="Owner terakhir dilindungi" icon={ShieldCheckIcon} tone="warning" />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama, email, atau user ID…" className="sm:max-w-sm" />
          <div className="sm:ml-auto sm:w-[180px]">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger aria-label="Filter role"><SelectValue placeholder="Semua role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua role</SelectItem>
                {ROLE_OPTIONS.map((role) => <SelectItem key={role} value={role}>{APP_ROLE_LABELS[role]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{formatNumber(filtered.length)} pengguna</p>
        </div>

        {error ? (
          <div className="p-4"><ErrorState title="Gagal memuat pengguna" description={error} onRetry={() => void load()} /></div>
        ) : (
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowKey={(row) => row.userId}
            empty={loading ? <EmptyState icon={UsersIcon} title="Memuat pengguna…" description="Mengambil data profil login." /> : (
              <EmptyState icon={UsersIcon} title={rows.length === 0 ? "Belum ada pengguna login" : "Pengguna tidak ditemukan"} description={rows.length === 0 ? "Profil dibuat otomatis saat akun login melalui Supabase Auth." : "Coba kata kunci atau filter lain."} />
            )}
          />
        )}

        <TablePagination page={pagination.page} pageCount={pagination.pageCount} total={filtered.length} start={pagination.start} end={pagination.end} onPageChange={pagination.setPage} />
      </section>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah role pengguna</DialogTitle>
            <DialogDescription>Perubahan disimpan ke <code>core.UserProfiles</code>. Kredensial/login tetap di Supabase Auth.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
                <div className="font-medium">{editing.name || "Tanpa nama"}</div>
                <div className="text-muted-foreground">{editing.email || editing.userId}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role">Role aplikasi</Label>
                <Select value={nextRole} onValueChange={(v) => setNextRole(v as AppRole)}>
                  <SelectTrigger id="user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLE_OPTIONS.map((role) => <SelectItem key={role} value={role}>{APP_ROLE_LABELS[role]}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{APP_ROLE_DESCRIPTIONS[nextRole]}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingRole}>Batal</Button>
            <Button onClick={() => void saveRole()} disabled={savingRole || !editing || editing.role === nextRole}>{savingRole ? "Menyimpan…" : "Simpan role"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Hapus profil akses pengguna?"
        description={deleteTarget ? `Profil aplikasi untuk ${deleteTarget.name || deleteTarget.email || deleteTarget.userId} akan dihapus. Akun auth tidak dihapus; jika login lagi, sistem dapat membuat profil dasar baru.` : ""}
        confirmLabel={deleting ? "Menghapus…" : "Hapus profil"}
        destructive
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
