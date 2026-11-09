"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, CalendarIcon, LayoutDashboardIcon, LogOutIcon, MailIcon, ReceiptTextIcon, ShieldCheckIcon, UserIcon, PhoneIcon, ImageIcon, SaveIcon, Edit2Icon, XIcon, Loader2Icon } from "lucide-react"

import { useRealUser } from "@/hooks/use-real-user"
import { appRoleLabel } from "@/lib/business-labels"
import { initials } from "@/features/customers/customer-detail-sheet"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { supabaseClient } from "@/lib/auth-client"
import { PublicNavigation } from "@/components/public/public-navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

type ActivityItem = {
  kind: "order" | "transaction"
  role: "customer" | "staff"
  id: string
  number: string
  status: string
  paymentStatus?: string | null
  total: number
  currency: string
  source: string
  paymentMethod?: string | null
  createdAt: string | Date
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  const s = String(status || "").toUpperCase()
  if (["COMPLETED", "PAID", "SUCCESS", "FULFILLED"].includes(s)) return "default"
  if (["CANCELLED", "VOIDED", "FAILED", "EXPIRED", "REFUNDED"].includes(s)) return "destructive"
  if (["PENDING", "UNPAID", "AWAITING_VERIFICATION", "SUBMITTED", "PROCESSING"].includes(s)) return "secondary"
  return "outline"
}

function humanStatus(value?: string | null) {
  if (!value) return "-"
  return value.replaceAll("_", " ")
}

export function ProfilePage() {
  const router = useRouter()
  const realUser = useRealUser(true) as any
  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editName, setEditName] = useState(realUser?.name || "")
  const [editPhone, setEditPhone] = useState(realUser?.phone || "")
  const [editAvatarUrl, setEditAvatarUrl] = useState(realUser?.avatarUrl || "")

  const role = realUser?.role
  const isRegularUser = !role || role === "user"
  const displayRole = appRoleLabel(role)
  const canAccessDashboard = !isRegularUser

  useEffect(() => {
    let active = true
    if (!realUser?.id && realUser !== null) return
    if (!realUser?.id) { setActivity([]); return }
    ;(async () => {
      try {
        const res = await fetch("/api/me/activity", { cache: "no-store", credentials: "include" })
        const data = await res.json().catch(() => ({}))
        if (!active) return
        if (!res.ok) { setActivity([]); setActivityError(data?.error || "Gagal memuat aktivitas."); return }
        setActivity(Array.isArray(data?.activity) ? data.activity : [])
      } catch (e: any) {
        if (active) { setActivity([]); setActivityError(e?.message || "Gagal memuat aktivitas.") }
      }
    })()
    return () => { active = false }
  }, [realUser?.id, realUser])

  // Sync edit fields when realUser changes
  useEffect(() => {
    if (realUser) {
      setEditName(realUser.name || "")
      setEditPhone(realUser.phone || "")
      setEditAvatarUrl(realUser.avatarUrl || "")
    }
  }, [realUser])

  const handleSignOut = async () => {
    try { await supabaseClient.auth.signOut() } finally { router.replace("/login"); router.refresh() }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim() || null,
          phone: editPhone.trim() || null,
          avatarUrl: editAvatarUrl.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan")
      toast.success("Profil diperbarui")
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan profil")
    } finally {
      setIsSaving(false)
    }
  }

  const summary = useMemo(() => {
    const items = activity || []
    const completed = items.filter((i) => ["COMPLETED", "PAID"].includes(String(i.status).toUpperCase()) || ["PAID"].includes(String(i.paymentStatus || "").toUpperCase())).length
    return { count: items.length, completed }
  }, [activity])

  const loadingUser = realUser === null && activity === null

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,color-mix(in_oklab,var(--muted)_24%,transparent),transparent_220px)] pb-[calc(env(safe-area-inset-bottom)+5.75rem)] dark:bg-background lg:pb-10">
      <div className="mx-auto w-full max-w-6xl px-3 pt-[max(0.75rem,env(safe-area-inset-top))] min-[400px]:px-4 sm:px-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
              <Badge variant={isRegularUser ? "secondary" : "outline"} className="rounded-full font-medium">{displayRole}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Informasi akun dan aktivitas transaksi Anda.</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Button asChild variant="outline" className="rounded-xl"><Link href="/plans">Plans</Link></Button>
            {canAccessDashboard ? <Button asChild variant="outline" className="rounded-xl"><Link href="/dashboard"><LayoutDashboardIcon className="size-4" aria-hidden />Dashboard</Link></Button> : null}
            <PublicNavigation variant="desktop" />
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="h-fit overflow-hidden rounded-2xl border-border/70 shadow-none">
            <CardHeader className="items-center border-b border-border/60 bg-card/50 pb-5 text-center">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted/40 text-xl font-semibold relative">
                {isEditing ? (
                  <>
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={editAvatarUrl || undefined} alt="Avatar" />
                      <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                        {editName ? getInitials(editName) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-0 right-0 -translate-y-1/2 -translate-x-1/2 bg-background"
                      onClick={() => setEditAvatarUrl("")}
                      disabled={isSaving}
                    >
                      <XIcon className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Hapus avatar</span>
                    </Button>
                  </>
                ) : (
                  realUser?.image ? <img src={realUser.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : initials(realUser?.name || "Akun")
                )}
              </div>
              <div className="min-w-0 pt-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nama lengkap"
                      className="text-center text-lg font-semibold"
                      disabled={isSaving}
                    />
                    <div className="space-y-2">
                      <Label htmlFor="profile-phone" className="text-xs text-muted-foreground">Telepon</Label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="profile-phone"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="0812-3456-7890"
                          className="pl-10 text-center text-sm"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-avatar" className="text-xs text-muted-foreground">Avatar URL</Label>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="profile-avatar"
                          value={editAvatarUrl}
                          onChange={(e) => setEditAvatarUrl(e.target.value)}
                          placeholder="https://example.com/avatar.png"
                          className="pl-10 text-center text-sm"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="truncate text-lg">{realUser?.name || (loadingUser ? "Memuat..." : "Akun terdaftar")}</CardTitle>
                    <CardDescription className="truncate">{realUser?.email || "-"}</CardDescription>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/70 bg-muted/15 p-3"><p className="text-[11px] text-muted-foreground">Aktivitas</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{activity ? summary.count : "—"}</p></div>
                <div className="rounded-xl border border-border/70 bg-muted/15 p-3"><p className="text-[11px] text-muted-foreground">Selesai/terbayar</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{activity ? summary.completed : "—"}</p></div>
              </div>
              {canAccessDashboard ? <Button asChild variant="outline" className="w-full justify-between rounded-xl sm:hidden"><Link href="/dashboard">Buka dashboard <ArrowRightIcon className="size-4" aria-hidden /></Link></Button> : null}
              {isEditing ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <XIcon className="w-4 h-4 mr-2" />
                    Batal
                  </Button>
                  <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-4 h-4 mr-2" />
                        Simpan
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full justify-center" onClick={() => setIsEditing(true)}>
                  <Edit2Icon className="w-4 h-4 mr-2" />
                  Edit Profil
                </Button>
              )}
              <Button variant="ghost" className="w-full justify-start rounded-xl text-muted-foreground hover:text-destructive" onClick={handleSignOut} disabled={isEditing}><LogOutIcon className="size-4" aria-hidden />Keluar</Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-2xl border-border/70 shadow-none">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Informasi akun</CardTitle>
                  <CardDescription>Data akun terhubung ke autentikasi Niraya.</CardDescription>
                </div>
                {!isEditing && <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Edit2Icon className="h-4 w-4" /></Button>}
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: UserIcon, label: "Nama", value: isEditing ? editName : (realUser?.name || "-") },
                  { icon: MailIcon, label: "Email", value: realUser?.email || "-" },
                  { icon: PhoneIcon, label: "Telepon", value: isEditing ? editPhone : (realUser?.phone || "-") },
                  { icon: ShieldCheckIcon, label: "Peran", value: displayRole },
                  { icon: CalendarIcon, label: "Terdaftar", value: realUser?.createdAt ? formatDate(realUser.createdAt) : "Aktif" },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/25"><Icon className="size-4 text-muted-foreground" aria-hidden /></span>
                      <div className="min-w-0"><p className="text-[12px] text-muted-foreground">{item.label}</p><p className="truncate text-sm font-medium">{item.value}</p></div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Aktivitas transaksi</CardTitle>
                    <CardDescription>Riwayat pesanan/transaksi yang terhubung ke akun ini.</CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-full">{summary.count}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {activity === null ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
                ) : activity.length === 0 ? (
                  <EmptyState icon={ReceiptTextIcon} title="Belum ada aktivitas" description={activityError || "Transaksi storefront yang dibuat saat login, atau transaksi POS yang ditangani akun ini, akan muncul di sini."} className="border-border/60 py-10" />
                ) : (
                  <ul className="space-y-2">
                    {activity.map((item) => (
                      <li key={`${item.role}-${item.kind}-${item.id}`} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">{item.number}</p>
                            <Badge variant={statusVariant(item.status)} className="rounded-full px-2 py-0 text-[10px] font-medium">{humanStatus(item.status)}</Badge>
                            {item.paymentStatus && item.paymentStatus !== item.status ? <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium">Bayar: {humanStatus(item.paymentStatus)}</Badge> : null}
                          </div>
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            {formatDateTime(item.createdAt)} · {item.source}{item.role === "staff" ? " · Ditangani" : " · Pesanan Anda"}{item.paymentMethod ? ` · ${item.paymentMethod}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <p className="text-sm font-semibold tabular-nums">{formatCurrency(Number(item.total || 0), item.currency || "IDR")}</p>
                          {item.kind === "order" && item.role === "customer" ? (
                            <Button asChild variant="outline" size="sm" className="rounded-xl"><Link href={`/menu/order/${encodeURIComponent(item.id)}`}>Detail</Link></Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PublicNavigation variant="mobile" />
    </div>
  )
}