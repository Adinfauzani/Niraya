"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  BellIcon, Building2Icon, CreditCardIcon, DownloadIcon, EyeIcon, Loader2Icon,
  MonitorIcon, MoonIcon, PaletteIcon, SaveIcon, ServerIcon, Settings2Icon,
  ShieldIcon, SunIcon, UserCircle2Icon,
} from "lucide-react";

import { useTheme } from "@/components/themeprovider";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRealUser } from "@/hooks/use-real-user";
import { appRoleLabel } from "@/lib/business-labels";
import { initials } from "@/features/customers/customer-detail-sheet";
import { cn } from "@/lib/utils";

type SettingsPayload = {
  business: { id: string; name: string; address: string; phone: string; email: string; currency: string; timezone: string; status: string };
  operational: { taxRatePercent: number; memberDiscountRatePercent: number; lowStockThreshold: number; reservationExpiryMinutes: number };
  payment: { qrManualTransferEnabled: boolean; manualTransferBankName: string; manualTransferAccountName: string; manualTransferAccountNumber: string; manualTransferInstructions: string; paymentGatewayModuleStatus: string };
  receipt: { footer: string };
  capabilities: Record<string, boolean>;
};

async function readJson<T>(res: Response): Promise<T> { return (await res.json().catch(() => ({}))) as T; }
async function fetchSettings() {
  const res = await fetch("/api/settings/business", { cache: "no-store", credentials: "include" });
  const data = await readJson<SettingsPayload & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || "Gagal memuat pengaturan.");
  return data;
}
async function saveSection(section: string, payload: unknown) {
  const res = await fetch("/api/settings/business", { method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ section, payload }) });
  const data = await readJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan.");
  return data;
}

const businessSchema = z.object({
  businessName: z.string().trim().min(1, "Nama bisnis wajib diisi").max(200),
  address: z.string().trim().max(1000),
  phone: z.string().trim().max(60),
  email: z.union([z.literal(""), z.string().trim().email("Format email tidak valid").max(160)]),
});
const operationalSchema = z.object({
  currency: z.literal("IDR"),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
  taxRatePercent: z.number().min(0).max(100),
  memberDiscountRatePercent: z.number().min(0).max(100),
  lowStockThreshold: z.number().int().min(0).max(100000),
  reservationExpiryMinutes: z.number().int().min(5).max(1440),
});
const paymentSchema = z.object({
  qrManualTransferEnabled: z.boolean(),
  manualTransferBankName: z.string().trim().max(120),
  manualTransferAccountName: z.string().trim().max(120),
  manualTransferAccountNumber: z.string().trim().max(120),
  manualTransferInstructions: z.string().trim().max(1000),
});
const receiptSchema = z.object({ receiptFooter: z.string().trim().max(240) });

type BusinessValues = z.input<typeof businessSchema>;
type OperationalValues = z.input<typeof operationalSchema>;
type PaymentValues = z.input<typeof paymentSchema>;
type ReceiptValues = z.input<typeof receiptSchema>;

const TABS = [
  { value: "profil-bisnis", label: "Profil Bisnis", icon: Building2Icon },
  { value: "notifikasi", label: "Notifikasi", icon: BellIcon },
  { value: "privacy-security", label: "Privacy & Security", icon: ShieldIcon },
  { value: "akun", label: "Akun", icon: UserCircle2Icon },
  { value: "tampilan", label: "Tampilan", icon: PaletteIcon },
  { value: "operasional", label: "Operasional", icon: Settings2Icon },
  { value: "pembayaran", label: "Pembayaran", icon: CreditCardIcon },
  { value: "sistem", label: "Sistem", icon: ServerIcon },
] as const;

function SectionShell({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function FieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 }) {
  return <div className={cn("grid gap-4", cols === 2 && "sm:grid-cols-2")}>{children}</div>;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium break-words">{value ?? "-"}</span>
    </div>
  );
}

function Unavailable({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const realUser = useRealUser(true) as any;
  const [tab, setTab] = useState<string>("profil-bisnis");
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const role = realUser?.role as string | undefined;
  const canManageBusiness = role ? ["owner", "admin", "manager"].includes(role) : false;
  const readOnlyBusiness = !canManageBusiness;

  const businessForm = useForm<BusinessValues>({ resolver: zodResolver(businessSchema) as any, defaultValues: { businessName: "", address: "", phone: "", email: "" } });
  const operationalForm = useForm<OperationalValues>({ resolver: zodResolver(operationalSchema) as any, defaultValues: { currency: "IDR", timezone: "Asia/Jakarta", taxRatePercent: 0, memberDiscountRatePercent: 0, lowStockThreshold: 0, reservationExpiryMinutes: 30 } });
  const paymentForm = useForm<PaymentValues>({ resolver: zodResolver(paymentSchema) as any, defaultValues: { qrManualTransferEnabled: false, manualTransferBankName: "", manualTransferAccountName: "", manualTransferAccountNumber: "", manualTransferInstructions: "" } });
  const receiptForm = useForm<ReceiptValues>({ resolver: zodResolver(receiptSchema) as any, defaultValues: { receiptFooter: "" } });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const d = await fetchSettings();
        if (!active) return;
        setData(d);
        businessForm.reset({ businessName: d.business.name, address: d.business.address || "", phone: d.business.phone || "", email: d.business.email || "" });
        operationalForm.reset({ currency: "IDR", timezone: (d.business.timezone as OperationalValues["timezone"]) || "Asia/Jakarta", taxRatePercent: d.operational.taxRatePercent, memberDiscountRatePercent: d.operational.memberDiscountRatePercent, lowStockThreshold: d.operational.lowStockThreshold, reservationExpiryMinutes: d.operational.reservationExpiryMinutes });
        paymentForm.reset({ qrManualTransferEnabled: d.payment.qrManualTransferEnabled, manualTransferBankName: d.payment.manualTransferBankName || "", manualTransferAccountName: d.payment.manualTransferAccountName || "", manualTransferAccountNumber: d.payment.manualTransferAccountNumber || "", manualTransferInstructions: d.payment.manualTransferInstructions || "" });
        receiptForm.reset({ receiptFooter: d.receipt.footer || "" });
        setLoadError(null);
      } catch (e: any) { if (active) setLoadError(e?.message || "Gagal memuat pengaturan."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(section: "business" | "operational" | "payment" | "receipt", values: unknown, form: any) {
    setSaving(section);
    try {
      await saveSection(section, values);
      const fresh = await fetchSettings();
      setData(fresh);
      form.reset(values);
      toast.success("Pengaturan disimpan", { description: "Perubahan tersimpan di server." });
    } catch (e: any) {
      toast.error("Gagal menyimpan", { description: e?.message || "Silakan coba lagi." });
    } finally { setSaving(null); }
  }

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/business", { cache: "no-store", credentials: "include" });
      const payload = await readJson<any>(res);
      if (!res.ok) throw new Error(payload?.error || "Gagal mengekspor data.");
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...payload }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `niraya-settings-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Data diekspor", { description: "File JSON berisi data bisnis aktual." });
    } catch (e: any) { toast.error("Ekspor gagal", { description: e?.message }); }
    finally { setExporting(false); }
  }

  const saveButton = (section: string, disabled: boolean, label = "Simpan perubahan") => (
    <Button type="submit" disabled={disabled || saving === section || readOnlyBusiness} className="h-9 rounded-xl">
      {saving === section ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : <SaveIcon className="size-4" aria-hidden />}{label}
    </Button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader title="Pengaturan" description="Kelola profil bisnis, akun, keamanan, dan preferensi aplikasi." />

      <Tabs value={tab} onValueChange={setTab} defaultValue="profil-bisnis" className="min-w-0 gap-7 pt-2">
        <div className="mt-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsList variant="line" className="h-auto w-max justify-start gap-1.5 rounded-[2rem] border border-border/70 bg-card p-1.5 shadow-sm sm:w-full sm:flex-wrap">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.value} value={t.value} className="h-9 shrink-0 justify-start gap-2 rounded-full px-4 text-[13px] after:hidden hover:bg-muted/50 data-[state=active]:border data-[state=active]:border-border/70 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  <Icon className="size-4" aria-hidden />{t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="min-w-0 rounded-2xl border border-border/50 bg-background/40 p-4 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/30 sm:p-5 dark:border-white/10 dark:bg-background/20">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground"><Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />Memuat pengaturan...</div>
          ) : loadError ? (
            <div className="space-y-3"><p className="text-sm text-destructive">{loadError}</p><Button variant="outline" className="rounded-xl" onClick={() => window.location.reload()}>Muat ulang</Button></div>
          ) : (
            <>
              <TabsContent value="profil-bisnis" className="mt-0">
                <Form {...businessForm}>
                  <form onSubmit={businessForm.handleSubmit((v) => onSave("business", v, businessForm))}>
                    <SectionShell title="Profil Bisnis" description="Identitas yang ditampilkan kepada pelanggan." actions={saveButton("business", !businessForm.formState.isDirty)}>
                      {readOnlyBusiness ? <p className="text-[13px] text-muted-foreground">Akun Anda memiliki akses baca. Perubahan bisnis memerlukan peran admin/manager/owner.</p> : null}
                      <FieldGrid>
                        <FormField control={businessForm.control} name="businessName" render={({ field }) => (
                          <FormItem className="sm:col-span-2"><FormLabel>Nama Bisnis</FormLabel><FormControl><Input placeholder="Nama toko" className="h-10 rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={businessForm.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel>Email bisnis</FormLabel><FormControl><Input type="email" placeholder="hello@bisnis.id" className="h-10 rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={businessForm.control} name="phone" render={({ field }) => (
                          <FormItem><FormLabel>Telepon</FormLabel><FormControl><Input placeholder="+62..." className="h-10 rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={businessForm.control} name="address" render={({ field }) => (
                          <FormItem className="sm:col-span-2"><FormLabel>Alamat</FormLabel><FormControl><Textarea rows={3} placeholder="Alamat lengkap bisnis..." className="rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </FieldGrid>
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Informasi tambahan</p>
                        <Unavailable title="Logo, deskripsi, website, dan media sosial" description="Belum ada kolom persistensi terverifikasi di schema pengaturan bisnis saat ini. Bagian ini tidak menyimpan data palsu; perlu penambahan field additive terpisah bila disetujui." />
                      </div>
                    </SectionShell>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="notifikasi" className="mt-0">
                <SectionShell title="Notifikasi" description="Preferensi notifikasi yang didukung aplikasi.">
                  <Unavailable title="Channel notifikasi belum terintegrasi" description="Email, WhatsApp, SMS, dan push notification belum memiliki integrasi pengiriman terverifikasi di codebase ini. Tab ini tidak mensimulasikan pengiriman." />
                  <div className="rounded-xl border border-border/70">
                    {[
                      ["Notifikasi pesanan", "Belum tersedia — memerlukan event/worker dan channel terintegrasi."],
                      ["Notifikasi pembayaran", "Belum tersedia — verifikasi pembayaran manual saat ini dikelola staff."],
                      ["Notifikasi stok menipis", "Ambang stok tersedia di Operasional; pengiriman notifikasi otomatis belum terintegrasi."],
                      ["Notifikasi sistem", "Belum tersedia."],
                    ].map(([k, v]) => <InfoRow key={k} label={k} value={<span className="text-muted-foreground font-normal">{v}</span>} />)}
                  </div>
                </SectionShell>
              </TabsContent>

              <TabsContent value="privacy-security" className="mt-0">
                <SectionShell title="Privacy & Security" description="Informasi keamanan akun dan batasan yang berlaku.">
                  <div className="rounded-xl border border-border/70 px-4 py-1">
                    <InfoRow label="Autentikasi" value="Neon Auth" />
                    <InfoRow label="Akun aktif" value={realUser?.email || "-"} />
                    <InfoRow label="Peran aplikasi" value={appRoleLabel(realUser?.role)} />
                    <InfoRow label="Token/kredensial" value={<span className="text-muted-foreground font-normal">Tidak ditampilkan di UI</span>} />
                  </div>
                  <Unavailable title="Manajemen sesi & perubahan password" description="Fitur manajemen sesi/password bergantung pada kemampuan Neon Auth client/server yang terkonfigurasi dan alur verifikasi. UI ini tidak mengimplementasikan kontrol keamanan palsu atau bypass." />
                </SectionShell>
              </TabsContent>

              <TabsContent value="akun" className="mt-0">
                <SectionShell title="Akun" description="Informasi akun pengguna yang sedang login.">
                  <div className="flex items-center gap-3 rounded-xl border border-border/70 p-4">
                    <Avatar className="size-12"><AvatarFallback className="text-sm font-semibold">{initials(realUser?.name || "Akun")}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{realUser?.name || "Akun terdaftar"}</p>
                      <p className="truncate text-sm text-muted-foreground">{realUser?.email || "-"}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto rounded-full">{appRoleLabel(realUser?.role)}</Badge>
                  </div>
                  <div className="rounded-xl border border-border/70 px-4 py-1">
                    <InfoRow label="User ID" value={<span className="font-mono text-[12px]">{realUser?.id || "-"}</span>} />
                    <InfoRow label="Provider" value="Neon Auth" />
                    <InfoRow label="Profil aplikasi" value={realUser?.createdAt ? "Tersedia" : "Aktif"} />
                  </div>
                  <p className="text-[13px] text-muted-foreground">Perubahan profil/auth sensitif tetap melalui Neon Auth. Data akun dipisah dari data profil bisnis.</p>
                </SectionShell>
              </TabsContent>

              <TabsContent value="tampilan" className="mt-0">
                <SectionShell title="Tampilan" description="Preferensi tampilan aplikasi pada perangkat ini.">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Tema</p>
                    <div className="grid grid-cols-3 gap-2 sm:max-w-md">
                      {([
                        { value: "light", label: "Terang", icon: SunIcon },
                        { value: "dark", label: "Gelap", icon: MoonIcon },
                        { value: "system", label: "Sistem", icon: MonitorIcon },
                      ] as const).map((opt) => {
                        const Icon = opt.icon; const active = theme === opt.value;
                        return (
                          <button key={opt.value} type="button" aria-pressed={active} onClick={() => setTheme(opt.value)}
                            className={cn("flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "border-primary/40 bg-primary/[0.04] text-foreground" : "border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground")}>
                            <Icon className="size-4" aria-hidden />{opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[13px] text-muted-foreground">Tema disimpan oleh theme provider aplikasi pada perangkat/browser ini.</p>
                  </div>
                </SectionShell>
              </TabsContent>

              <TabsContent value="operasional" className="mt-0">
                <Form {...operationalForm}>
                  <form onSubmit={operationalForm.handleSubmit((v) => onSave("operational", v, operationalForm))}>
                    <SectionShell title="Operasional" description="Pengaturan operasional yang memengaruhi perhitungan dan alur bisnis." actions={saveButton("operational", !operationalForm.formState.isDirty)}>
                      {readOnlyBusiness ? <p className="text-[13px] text-muted-foreground">Akses baca. Perubahan memerlukan peran yang diizinkan.</p> : null}
                      <FieldGrid>
                        <FormField control={operationalForm.control} name="currency" render={({ field }) => (
                          <FormItem><FormLabel>Mata uang</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={readOnlyBusiness}><FormControl><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="IDR">IDR · Rupiah</SelectItem></SelectContent></Select><FormDescription>Multi-mata uang belum didukung.</FormDescription><FormMessage /></FormItem>
                        )} />
                        <FormField control={operationalForm.control} name="timezone" render={({ field }) => (
                          <FormItem><FormLabel>Zona waktu</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={readOnlyBusiness}><FormControl><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Asia/Jakarta">WIB · Asia/Jakarta</SelectItem><SelectItem value="Asia/Makassar">WITA · Asia/Makassar</SelectItem><SelectItem value="Asia/Jayapura">WIT · Asia/Jayapura</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={operationalForm.control} name="taxRatePercent" render={({ field }) => (
                          <FormItem><FormLabel>Pajak (%)</FormLabel><FormControl><Input type="number" min={0} max={100} step={0.01} className="h-10 rounded-xl" disabled={readOnlyBusiness} value={field.value} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} /></FormControl><FormDescription>Diterapkan sesuai logika transaksi/POS/server yang ada.</FormDescription><FormMessage /></FormItem>
                        )} />
                        <FormField control={operationalForm.control} name="memberDiscountRatePercent" render={({ field }) => (
                          <FormItem><FormLabel>Diskon pelanggan (%)</FormLabel><FormControl><Input type="number" min={0} max={100} step={0.01} className="h-10 rounded-xl" disabled={readOnlyBusiness} value={field.value} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={operationalForm.control} name="lowStockThreshold" render={({ field }) => (
                          <FormItem><FormLabel>Ambang stok menipis</FormLabel><FormControl><Input type="number" min={0} step={1} className="h-10 rounded-xl" disabled={readOnlyBusiness} value={field.value} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Math.floor(Number(e.target.value)))} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={operationalForm.control} name="reservationExpiryMinutes" render={({ field }) => (
                          <FormItem><FormLabel>Expiry reservasi (menit)</FormLabel><FormControl><Input type="number" min={5} max={1440} step={1} className="h-10 rounded-xl" disabled={readOnlyBusiness} value={field.value} onChange={(e) => field.onChange(e.target.value === "" ? 30 : Math.floor(Number(e.target.value)))} /></FormControl><FormDescription>Dipakai oleh alur reservasi storefront/pembayaran yang sudah ada.</FormDescription><FormMessage /></FormItem>
                        )} />
                      </FieldGrid>
                      <Form {...receiptForm}>
                        <div className="space-y-3 border-t border-border/60 pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <div><p className="text-sm font-medium">Struk</p><p className="text-[13px] text-muted-foreground">Teks penutup struk pelanggan.</p></div>
                            <Button type="button" size="sm" variant="outline" className="h-8 rounded-xl" disabled={readOnlyBusiness || saving === "receipt" || !receiptForm.formState.isDirty} onClick={receiptForm.handleSubmit((v) => onSave("receipt", v, receiptForm))}>
                              {saving === "receipt" ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : <SaveIcon className="size-4" aria-hidden />}Simpan
                            </Button>
                          </div>
                          <FormField control={receiptForm.control} name="receiptFooter" render={({ field }) => (
                            <FormItem><FormLabel>Pesan penutup</FormLabel><FormControl><Textarea rows={2} className="rounded-xl" placeholder="Terima kasih telah berkunjung" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </Form>
                    </SectionShell>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="pembayaran" className="mt-0">
                <Form {...paymentForm}>
                  <form onSubmit={paymentForm.handleSubmit((v) => onSave("payment", v, paymentForm))}>
                    <SectionShell title="Pembayaran" description="Metode pembayaran yang didukung dan konfigurasi transfer manual." actions={saveButton("payment", !paymentForm.formState.isDirty)}>
                      {readOnlyBusiness ? <p className="text-[13px] text-muted-foreground">Akses baca. Perubahan memerlukan peran yang diizinkan.</p> : null}
                      <div className="rounded-xl border border-border/70 p-4">
                        <FormField control={paymentForm.control} name="qrManualTransferEnabled" render={({ field }) => (
                          <FormItem className="flex items-center justify-between gap-4 space-y-0">
                            <div><FormLabel>Transfer manual</FormLabel><FormDescription>Aktifkan instruksi transfer manual untuk alur storefront/pembayaran yang mendukungnya. Verifikasi tetap dilakukan staff secara server-side.</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnlyBusiness} aria-label="Aktifkan transfer manual" /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                      <FieldGrid>
                        <FormField control={paymentForm.control} name="manualTransferBankName" render={({ field }) => (<FormItem><FormLabel>Nama bank/e-wallet</FormLabel><FormControl><Input className="h-10 rounded-xl" placeholder="BCA / Mandiri / ..." disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={paymentForm.control} name="manualTransferAccountName" render={({ field }) => (<FormItem><FormLabel>Nama pemilik</FormLabel><FormControl><Input className="h-10 rounded-xl" placeholder="Nama rekening" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={paymentForm.control} name="manualTransferAccountNumber" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Nomor rekening/tujuan</FormLabel><FormControl><Input className="h-10 rounded-xl font-mono" placeholder="1234567890" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={paymentForm.control} name="manualTransferInstructions" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Instruksi tambahan</FormLabel><FormControl><Textarea rows={3} className="rounded-xl" placeholder="Contoh: transfer sesuai total, lalu unggah bukti." disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </FieldGrid>
                      <Unavailable title="Payment gateway" description={`Status modul: ${data?.payment.paymentGatewayModuleStatus || "NOT_INSTALLED"}. Integrasi gateway tidak dibuat/diaktifkan otomatis dari halaman ini dan tidak mengubah riwayat transaksi historis.`} />
                    </SectionShell>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="sistem" className="mt-0">
                <SectionShell title="Sistem" description="Informasi konfigurasi dan integrasi yang aman ditampilkan.">
                  <div className="rounded-xl border border-border/70 px-4 py-1">
                    <InfoRow label="Aplikasi" value="Niraya POS" />
                    <InfoRow label="Framework" value="Next.js 16 / React 19" />
                    <InfoRow label="Auth" value="Neon Auth" />
                    <InfoRow label="Database" value="Neon Postgres / Drizzle" />
                    <InfoRow label="Payment gateway" value={data?.payment.paymentGatewayModuleStatus === "INSTALLED" ? "Terinstal" : "Belum terinstal"} />
                    <InfoRow label="Rahasia/credential" value={<span className="text-muted-foreground font-normal">Tidak ditampilkan</span>} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={exporting} onClick={exportData}>
                      {exporting ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : <DownloadIcon className="size-4" aria-hidden />}Ekspor data (JSON)
                    </Button>
                  </div>
                  <p className="text-[13px] text-muted-foreground">Ekspor menggunakan endpoint bisnis aktual (`/api/business`) sesuai akses sesi; tidak menampilkan secret environment.</p>
                </SectionShell>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
