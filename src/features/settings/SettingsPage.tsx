"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  BellIcon, Building2Icon, CreditCardIcon, DownloadIcon, Loader2Icon,
  MonitorIcon, MoonIcon, PaletteIcon, SaveIcon, ServerIcon, Settings2Icon,
  ShieldIcon, SunIcon, UserCircle2Icon,
} from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRealUser } from "@/hooks/useRealUser";
import { BUSINESS_QUERY_KEY } from "@/hooks/useBusiness";
import { useBusinessStore } from "@/stores/businessStore";
import { queryClient } from "@/lib/queryClient";
import { appRoleLabel } from "@/lib/businessLabels";
import { initials } from "@/features/customers/CustomerDetailSheet";
import { cn } from "@/lib/utils";

type SettingsPayload = {
  profile: {
    businessName: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string | null;
    description: string | null;
    website: string | null;
    socialMedia: string | null;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    orderEmail: boolean;
    orderSms: boolean;
    orderPush: boolean;
    lowStockEmail: boolean;
    lowStockSms: boolean;
    lowStockPush: boolean;
    paymentEmail: boolean;
    paymentSms: boolean;
    paymentPush: boolean;
    marketingEmail: boolean;
  };
  privacySecurity: {
    dataRetentionDays: number;
    sessionTimeoutMinutes: number;
    requireTwoFactor: boolean;
    allowPasswordLogin: boolean;
    allowMagicLink: boolean;
    allowSocialLogin: boolean;
    auditLogEnabled: boolean;
  };
  account: {
    defaultUserRole: string;
    maxUsers: number;
    autoApproveUsers: boolean;
    requireEmailVerification: boolean;
  };
  appearance: {
    theme: string;
    primaryColor: string;
    fontFamily: string;
    language: string;
    dateFormat: string;
    timeFormat: string;
    compactMode: boolean;
  };
  operational: {
    currency: string;
    timezone: string;
    taxRate: string;
    memberDiscountRate: string;
    lowStockThreshold: number;
    reservationExpiryMinutes: number;
    autoCancelUnpaidOrders: boolean;
    allowSplitPayment: boolean;
  };
  payment: {
    paymentGatewayModuleStatus: string;
    qrManualTransferEnabled: boolean;
    manualTransferBankName: string;
    manualTransferAccountName: string;
    manualTransferAccountNumber: string;
    manualTransferInstructions: string;
    acceptCash: boolean;
    acceptCard: boolean;
    acceptQris: boolean;
    acceptTransfer: boolean;
  };
  system: {
    maintenanceMode: boolean;
    maintenanceMessage: string | null;
    debugMode: boolean;
    apiRateLimit: number;
    enableApiDocs: boolean;
    backupEnabled: boolean;
    backupFrequency: string;
  };
  receipt: { footer: string };
  capabilities: Record<string, boolean>;
  settingsState: string;
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

const profileSchema = z.object({
  businessName: z.string().trim().min(1, "Nama bisnis wajib diisi").max(200),
  address: z.string().trim().max(1000),
  phone: z.string().trim().max(60),
  email: z.union([z.literal(""), z.string().trim().email("Format email tidak valid").max(160)]),
  logoUrl: z.string().url().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  website: z.string().url().max(500).optional(),
  socialMedia: z.string().trim().max(2000).optional(),
});

const notificationSchema = z.object({
  emailEnabled: z.boolean().default(true),
  smsEnabled: z.boolean().default(false),
  pushEnabled: z.boolean().default(true),
  orderEmail: z.boolean().default(true),
  orderSms: z.boolean().default(false),
  orderPush: z.boolean().default(true),
  lowStockEmail: z.boolean().default(true),
  lowStockSms: z.boolean().default(false),
  lowStockPush: z.boolean().default(true),
  paymentEmail: z.boolean().default(true),
  paymentSms: z.boolean().default(false),
  paymentPush: z.boolean().default(true),
  marketingEmail: z.boolean().default(false),
});

const privacySecuritySchema = z.object({
  dataRetentionDays: z.number().int().min(1).max(3650).default(365),
  sessionTimeoutMinutes: z.number().int().min(5).max(10080).default(480),
  requireTwoFactor: z.boolean().default(false),
  allowPasswordLogin: z.boolean().default(true),
  allowMagicLink: z.boolean().default(true),
  allowSocialLogin: z.boolean().default(true),
  auditLogEnabled: z.boolean().default(true),
});

const accountSchema = z.object({
  defaultUserRole: z.enum(["owner", "admin", "manager", "cashier", "staff"]).default("cashier"),
  maxUsers: z.number().int().min(1).max(1000).default(50),
  autoApproveUsers: z.boolean().default(false),
  requireEmailVerification: z.boolean().default(true),
});

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb"),
  fontFamily: z.string().trim().max(100).default("system"),
  language: z.enum(["id", "en"]).default("id"),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  timeFormat: z.enum(["12h", "24h"]).default("24h"),
  compactMode: z.boolean().default(false),
});

const operationalSchema = z.object({
  currency: z.literal("IDR").default("IDR"),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]).default("Asia/Jakarta"),
  taxRatePercent: z.number().min(0).max(100),
  memberDiscountRatePercent: z.number().min(0).max(100),
  lowStockThreshold: z.number().int().min(0).max(100000),
  reservationExpiryMinutes: z.number().int().min(5).max(1440),
  autoCancelUnpaidOrders: z.boolean().default(true),
  allowSplitPayment: z.boolean().default(true),
});

const paymentSchema = z.object({
  paymentGatewayModuleStatus: z.enum(["NOT_INSTALLED", "INSTALLED", "CONFIGURED"]).default("NOT_INSTALLED"),
  qrManualTransferEnabled: z.boolean().default(false),
  manualTransferBankName: z.string().trim().max(120).default(""),
  manualTransferAccountName: z.string().trim().max(120).default(""),
  manualTransferAccountNumber: z.string().trim().max(120).default(""),
  manualTransferInstructions: z.string().trim().max(1000).default(""),
  acceptCash: z.boolean().default(true),
  acceptCard: z.boolean().default(false),
  acceptQris: z.boolean().default(false),
  acceptTransfer: z.boolean().default(true),
});

const systemSchema = z.object({
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().trim().max(1000).optional(),
  debugMode: z.boolean().default(false),
  apiRateLimit: z.number().int().min(10).max(10000).default(100),
  enableApiDocs: z.boolean().default(false),
  backupEnabled: z.boolean().default(true),
  backupFrequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

const receiptSchema = z.object({ receiptFooter: z.string().trim().max(240) });

type ProfileValues = z.input<typeof profileSchema>;
type NotificationValues = z.input<typeof notificationSchema>;
type PrivacySecurityValues = z.input<typeof privacySecuritySchema>;
type AccountValues = z.input<typeof accountSchema>;
type AppearanceValues = z.input<typeof appearanceSchema>;
type OperationalValues = z.input<typeof operationalSchema>;
type PaymentValues = z.input<typeof paymentSchema>;
type SystemValues = z.input<typeof systemSchema>;
type ReceiptValues = z.input<typeof receiptSchema>;

const TABS = [
  { value: "profil-bisnis", label: "Profil Bisnis", icon: Building2Icon, section: "profile" },
  { value: "notifikasi", label: "Notifikasi", icon: BellIcon, section: "notifications" },
  { value: "privacy-security", label: "Privacy & Security", icon: ShieldIcon, section: "privacySecurity" },
  { value: "akun", label: "Akun", icon: UserCircle2Icon, section: "account" },
  { value: "tampilan", label: "Tampilan", icon: PaletteIcon, section: "appearance" },
  { value: "operasional", label: "Operasional", icon: Settings2Icon, section: "operational" },
  { value: "pembayaran", label: "Pembayaran", icon: CreditCardIcon, section: "payment" },
  { value: "sistem", label: "Sistem", icon: ServerIcon, section: "system" },
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

function SwitchRow({ label, description, checked, onChange, disabled }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
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

  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) as any, defaultValues: { businessName: "", address: "", phone: "", email: "", logoUrl: "", description: "", website: "", socialMedia: "" } });
  const notificationForm = useForm<NotificationValues>({ resolver: zodResolver(notificationSchema) as any, defaultValues: { emailEnabled: true, smsEnabled: false, pushEnabled: true, orderEmail: true, orderSms: false, orderPush: true, lowStockEmail: true, lowStockSms: false, lowStockPush: true, paymentEmail: true, paymentSms: false, paymentPush: true, marketingEmail: false } });
  const privacySecurityForm = useForm<PrivacySecurityValues>({ resolver: zodResolver(privacySecuritySchema) as any, defaultValues: { dataRetentionDays: 365, sessionTimeoutMinutes: 480, requireTwoFactor: false, allowPasswordLogin: true, allowMagicLink: true, allowSocialLogin: true, auditLogEnabled: true } });
  const accountForm = useForm<AccountValues>({ resolver: zodResolver(accountSchema) as any, defaultValues: { defaultUserRole: "cashier", maxUsers: 50, autoApproveUsers: false, requireEmailVerification: true } });
  const appearanceForm = useForm<AppearanceValues>({ resolver: zodResolver(appearanceSchema) as any, defaultValues: { theme: "system", primaryColor: "#2563eb", fontFamily: "system", language: "id", dateFormat: "DD/MM/YYYY", timeFormat: "24h", compactMode: false } });
  const operationalForm = useForm<OperationalValues>({ resolver: zodResolver(operationalSchema) as any, defaultValues: { currency: "IDR", timezone: "Asia/Jakarta", taxRatePercent: 0, memberDiscountRatePercent: 0, lowStockThreshold: 0, reservationExpiryMinutes: 30, autoCancelUnpaidOrders: true, allowSplitPayment: true } });
  const paymentForm = useForm<PaymentValues>({ resolver: zodResolver(paymentSchema) as any, defaultValues: { paymentGatewayModuleStatus: "NOT_INSTALLED", qrManualTransferEnabled: false, manualTransferBankName: "", manualTransferAccountName: "", manualTransferAccountNumber: "", manualTransferInstructions: "", acceptCash: true, acceptCard: false, acceptQris: false, acceptTransfer: true } });
  const systemForm = useForm<SystemValues>({ resolver: zodResolver(systemSchema) as any, defaultValues: { maintenanceMode: false, maintenanceMessage: "", debugMode: false, apiRateLimit: 100, enableApiDocs: false, backupEnabled: true, backupFrequency: "daily" } });
  const receiptForm = useForm<ReceiptValues>({ resolver: zodResolver(receiptSchema) as any, defaultValues: { receiptFooter: "" } });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const d = await fetchSettings();
        if (!active) return;
        setData(d);
        profileForm.reset({ businessName: d.profile.businessName, address: d.profile.address || "", phone: d.profile.phone || "", email: d.profile.email || "", logoUrl: d.profile.logoUrl || "", description: d.profile.description || "", website: d.profile.website || "", socialMedia: d.profile.socialMedia || "" });
        notificationForm.reset(d.notifications as NotificationValues);
        privacySecurityForm.reset(d.privacySecurity as PrivacySecurityValues);
        accountForm.reset({ defaultUserRole: d.account.defaultUserRole as "owner" | "admin" | "manager" | "cashier" | "staff", maxUsers: d.account.maxUsers, autoApproveUsers: d.account.autoApproveUsers, requireEmailVerification: d.account.requireEmailVerification });
        appearanceForm.reset({ theme: d.appearance.theme as "light" | "dark" | "system", primaryColor: d.appearance.primaryColor, fontFamily: d.appearance.fontFamily, language: d.appearance.language as "id" | "en", dateFormat: d.appearance.dateFormat as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD", timeFormat: d.appearance.timeFormat as "12h" | "24h", compactMode: d.appearance.compactMode });
        operationalForm.reset({ currency: "IDR" as const, timezone: d.operational.timezone as "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura", taxRatePercent: Number(d.operational.taxRate) * 100, memberDiscountRatePercent: Number(d.operational.memberDiscountRate) * 100, lowStockThreshold: d.operational.lowStockThreshold, reservationExpiryMinutes: d.operational.reservationExpiryMinutes, autoCancelUnpaidOrders: d.operational.autoCancelUnpaidOrders, allowSplitPayment: d.operational.allowSplitPayment });
        paymentForm.reset({ paymentGatewayModuleStatus: d.payment.paymentGatewayModuleStatus as "NOT_INSTALLED" | "INSTALLED" | "CONFIGURED", qrManualTransferEnabled: d.payment.qrManualTransferEnabled, manualTransferBankName: d.payment.manualTransferBankName, manualTransferAccountName: d.payment.manualTransferAccountName, manualTransferAccountNumber: d.payment.manualTransferAccountNumber, manualTransferInstructions: d.payment.manualTransferInstructions, acceptCash: d.payment.acceptCash, acceptCard: d.payment.acceptCard, acceptQris: d.payment.acceptQris, acceptTransfer: d.payment.acceptTransfer });
        systemForm.reset({ maintenanceMode: d.system.maintenanceMode, maintenanceMessage: d.system.maintenanceMessage || undefined, debugMode: d.system.debugMode, apiRateLimit: d.system.apiRateLimit, enableApiDocs: d.system.enableApiDocs, backupEnabled: d.system.backupEnabled, backupFrequency: d.system.backupFrequency as "daily" | "weekly" | "monthly" });
        receiptForm.reset({ receiptFooter: d.receipt.footer || "" });
        setLoadError(null);
      } catch (e: any) { if (active) setLoadError(e?.message || "Gagal memuat pengaturan."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(section: string, values: unknown, form: any) {
    setSaving(section);
    try {
      await saveSection(section, values);
      const fresh = await fetchSettings();
      setData(fresh);
      form.reset(values);
      if (section === "profile") {
        // Keep the sidebar business identity (name + logo) and the business
        // switcher in sync with the profile just saved.
        void useBusinessStore.getState().loadBusinesses();
        void queryClient.invalidateQueries({ queryKey: BUSINESS_QUERY_KEY });
      }
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
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit((v) => onSave("profile", v, profileForm))}>
                    <SectionShell title="Profil Bisnis" description="Identitas yang ditampilkan kepada pelanggan." actions={saveButton("profile", !profileForm.formState.isDirty)}>
                      {readOnlyBusiness ? <p className="text-[13px] text-muted-foreground">Akun Anda memiliki akses baca. Perubahan bisnis memerlukan peran admin/manager/owner.</p> : null}
                      <FieldGrid>
                        <FormField control={profileForm.control} name="businessName" render={({ field }) => (
                          <FormItem className="sm:col-span-2"><FormLabel>Nama Bisnis</FormLabel><FormControl><Input placeholder="Nama toko" className="h-10 rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={profileForm.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel>Email bisnis</FormLabel><FormControl><Input type="email" placeholder="hello@bisnis.id" className="h-10 rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={profileForm.control} name="phone" render={({ field }) => (
                          <FormItem><FormLabel>Telepon</FormLabel><FormControl><Input placeholder="+62..." className="h-10 rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={profileForm.control} name="address" render={({ field }) => (
                          <FormItem className="sm:col-span-2"><FormLabel>Alamat</FormLabel><FormControl><Textarea rows={3} placeholder="Alamat lengkap bisnis..." className="rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </FieldGrid>
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Informasi tambahan</p>
                        <FieldGrid>
                          <FormField control={profileForm.control} name="logoUrl" render={({ field }) => (
                            <FormItem><FormLabel>Logo URL</FormLabel><FormControl><Input type="url" placeholder="https://..." className="h-10 rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormDescription>URL logo bisnis (akan ditampilkan di struk/public).</FormDescription><FormMessage /></FormItem>
                          )} />
                          <FormField control={profileForm.control} name="website" render={({ field }) => (
                            <FormItem><FormLabel>Website</FormLabel><FormControl><Input type="url" placeholder="https://bisnis.id" className="h-10 rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={profileForm.control} name="description" render={({ field }) => (
                            <FormItem className="sm:col-span-2"><FormLabel>Deskripsi</FormLabel><FormControl><Textarea rows={3} placeholder="Deskripsi singkat bisnis..." className="rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
<FormField control={profileForm.control} name="socialMedia" render={({ field }) => {
                            const placeholder = '{"instagram": "@toko", "facebook": "toko"}';
                            const description = 'Format JSON. Contoh: {"instagram": "@toko", "facebook": "toko"}';
                            return (
                              <FormItem className="sm:col-span-2"><FormLabel>Media Sosial (JSON)</FormLabel><FormControl><Textarea rows={3} placeholder={placeholder} className="rounded-xl font-mono text-[12px]" disabled={readOnlyBusiness} {...field} /></FormControl><FormDescription>{description}</FormDescription><FormMessage /></FormItem>
                            );
                          }} />
                        </FieldGrid>
                      </div>
                    </SectionShell>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="notifikasi" className="mt-0">
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit((v) => onSave("notifications", v, notificationForm))}>
                    <SectionShell title="Notifikasi" description="Preferensi channel notifikasi." actions={saveButton("notifications", !notificationForm.formState.isDirty)}>
                      {readOnlyBusiness ? <p className="text-[13px] text-muted-foreground">Akses baca. Perubahan memerlukan peran yang diizinkan.</p> : null}
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Channel Kirim</p>
                        <div className="rounded-xl border border-border/70 p-4 space-y-3">
                          <FieldGrid>
                            <FormField control={notificationForm.control} name="emailEnabled" render={({ field }) => (<FormItem className="flex items-center gap-3">{field.value ? <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnlyBusiness} aria-label="Email" /> : <span className="text-sm text-muted-foreground">Email</span>}{!field.value && <span className="text-sm text-muted-foreground">Email</span>}</FormItem>)} />
                            <FormField control={notificationForm.control} name="smsEnabled" render={({ field }) => (<FormItem className="flex items-center gap-3">{field.value ? <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnlyBusiness} aria-label="SMS" /> : <span className="text-sm text-muted-foreground">SMS</span>}{!field.value && <span className="text-sm text-muted-foreground">SMS</span>}</FormItem>)} />
                            <FormField control={notificationForm.control} name="pushEnabled" render={({ field }) => (<FormItem className="flex items-center gap-3">{field.value ? <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnlyBusiness} aria-label="Push" /> : <span className="text-sm text-muted-foreground">Push</span>}{!field.value && <span className="text-sm text-muted-foreground">Push</span>}</FormItem>)} />
                          </FieldGrid>
                        </div>
                        <p className="text-sm font-medium">Per-Event</p>
                        <div className="rounded-xl border border-border/70 p-4 space-y-3">
                          <FieldGrid>
                            <SwitchRow label="Pesanan (Email)" checked={data?.notifications.orderEmail || false} onChange={(v) => notificationForm.setValue("orderEmail", v)} disabled={readOnlyBusiness} />
                            <SwitchRow label="Pesanan (SMS)" checked={data?.notifications.orderSms || false} onChange={(v) => notificationForm.setValue("orderSms", v)} disabled={readOnlyBusiness} />
                            <SwitchRow label="Pesanan (Push)" checked={data?.notifications.orderPush || false} onChange={(v) => notificationForm.setValue("orderPush", v)} disabled={readOnlyBusiness} />
                            <SwitchRow label="Pembayaran (Email)" checked={data?.notifications.paymentEmail || false} onChange={(v) => notificationForm.setValue("paymentEmail", v)} disabled={readOnlyBusiness} />
                            <SwitchRow label="Pembayaran (SMS)" checked={data?.notifications.paymentSms || false} onChange={(v) => notificationForm.setValue("paymentSms", v)} disabled={readOnlyBusiness} />
                            <SwitchRow label="Pembayaran (Push)" checked={data?.notifications.paymentPush || false} onChange={(v) => notificationForm.setValue("paymentPush", v)} disabled={readOnlyBusiness} />
                            <SwitchRow label="Stok Menipis (Email)" checked={data?.notifications.lowStockEmail || false} onChange={(v) => notificationForm.setValue("lowStockEmail", v)} disabled={readOnlyBusiness} />
                            <SwitchRow label="Stok Menipis (SMS)" checked={data?.notifications.lowStockSms || false} onChange={(v) => notificationForm.setValue("lowStockSms", v)} disabled={readOnlyBusiness} />
                            <SwitchRow label="Stok Menipis (Push)" checked={data?.notifications.lowStockPush || false} onChange={(v) => notificationForm.setValue("lowStockPush", v)} disabled={readOnlyBusiness} />
                            <SwitchRow label="Pemasaran (Email)" checked={data?.notifications.marketingEmail || false} onChange={(v) => notificationForm.setValue("marketingEmail", v)} disabled={readOnlyBusiness} />
                          </FieldGrid>
                        </div>
                      </div>
                    </SectionShell>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="privacy-security" className="mt-0">
                <Form {...privacySecurityForm}>
                  <form onSubmit={privacySecurityForm.handleSubmit((v) => onSave("privacySecurity", v, privacySecurityForm))}>
                    <SectionShell title="Privacy & Security" description="Retensi data, sesi, dan kontrol keamanan." actions={saveButton("privacySecurity", !privacySecurityForm.formState.isDirty)}>
                      {readOnlyBusiness ? <p className="text-[13px] text-muted-foreground">Akses baca. Perubahan memerlukan peran yang diizinkan.</p> : null}
                      <div className="rounded-xl border border-border/70 p-4 space-y-4">
                        <FieldGrid>
                          <FormField control={privacySecurityForm.control} name="dataRetentionDays" render={({ field }) => (
                            <FormItem><FormLabel>Retensi Data (hari)</FormLabel><FormControl><Input type="number" min={1} max={3650} step={1} className="h-10 rounded-xl" disabled={readOnlyBusiness} value={field.value} onChange={(e) => field.onChange(e.target.value === "" ? 365 : Math.floor(Number(e.target.value)))} /></FormControl><FormDescription>Berapa lama data transaksi/log disimpan sebelum dihapus otomatis.</FormDescription><FormMessage /></FormItem>
                          )} />
                          <FormField control={privacySecurityForm.control} name="sessionTimeoutMinutes" render={({ field }) => (
                            <FormItem><FormLabel>Timeout Sesi (menit)</FormLabel><FormControl><Input type="number" min={5} max={10080} step={1} className="h-10 rounded-xl" disabled={readOnlyBusiness} value={field.value} onChange={(e) => field.onChange(e.target.value === "" ? 480 : Math.floor(Number(e.target.value)))} /></FormControl><FormDescription>Durasi tidak aktif sebelum logout otomatis.</FormDescription><FormMessage /></FormItem>
                          )} />
                        </FieldGrid>
                        <div className="space-y-3 border-t border-border/60 pt-4">
                          <SwitchRow label="Wajib 2FA" checked={data?.privacySecurity.requireTwoFactor || false} onChange={(v) => privacySecurityForm.setValue("requireTwoFactor", v)} disabled={readOnlyBusiness} description="Mengharuskan verifikasi 2-faktor untuk login staff." />
                          <SwitchRow label="Login Password" checked={data?.privacySecurity.allowPasswordLogin || true} onChange={(v) => privacySecurityForm.setValue("allowPasswordLogin", v)} disabled={readOnlyBusiness} description="Izinkan login dengan email/password." />
                          <SwitchRow label="Magic Link" checked={data?.privacySecurity.allowMagicLink || true} onChange={(v) => privacySecurityForm.setValue("allowMagicLink", v)} disabled={readOnlyBusiness} description="Izinkan login via magic link email." />
                          <SwitchRow label="Social Login" checked={data?.privacySecurity.allowSocialLogin || true} onChange={(v) => privacySecurityForm.setValue("allowSocialLogin", v)} disabled={readOnlyBusiness} description="Izinkan login via Google/GitHub/Microsoft." />
                          <SwitchRow label="Audit Log" checked={data?.privacySecurity.auditLogEnabled || true} onChange={(v) => privacySecurityForm.setValue("auditLogEnabled", v)} disabled={readOnlyBusiness} description="Catat aktivitas sensitif ke audit log." />
                        </div>
                        <p className="text-[13px] text-muted-foreground">Penegakan sesi/password/2FA bergantung pada konfigurasi Supabase Auth. UI ini menyimpan preferensi bisnis; implementasi penuh memerlukan dukungan Supabase Auth server.</p>
                      </div>
                    </SectionShell>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="akun" className="mt-0">
                <Form {...accountForm}>
                  <form onSubmit={accountForm.handleSubmit((v) => onSave("account", v, accountForm))}>
                    <SectionShell title="Akun" description="Preferensi manajemen akun pengguna." actions={saveButton("account", !accountForm.formState.isDirty)}>
                      {readOnlyBusiness ? <p className="text-[13px] text-muted-foreground">Akses baca. Perubahan memerlukan peran yang diizinkan.</p> : null}
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
                        <InfoRow label="Provider" value="Supabase Auth" />
                        <InfoRow label="Profil aplikasi" value={realUser?.createdAt ? "Tersedia" : "Aktif"} />
                      </div>
                      <div className="space-y-3 border-t border-border/60 pt-4">
                        <FieldGrid>
                          <FormField control={accountForm.control} name="defaultUserRole" render={({ field }) => (
                            <FormItem><FormLabel>Peran default user baru</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={readOnlyBusiness}><FormControl><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="owner">Owner</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="cashier">Cashier</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={accountForm.control} name="maxUsers" render={({ field }) => (
                            <FormItem><FormLabel>Maksimal user</FormLabel><FormControl><Input type="number" min={1} max={1000} step={1} className="h-10 rounded-xl" disabled={readOnlyBusiness} value={field.value} onChange={(e) => field.onChange(e.target.value === "" ? 50 : Math.floor(Number(e.target.value)))} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </FieldGrid>
                        <div className="space-y-3">
                          <SwitchRow label="Auto-approve pendaftaran" checked={data?.account.autoApproveUsers || false} onChange={(v) => accountForm.setValue("autoApproveUsers", v)} disabled={readOnlyBusiness} description="User baru langsung aktif tanpa persetujuan admin." />
                          <SwitchRow label="Wajib verifikasi email" checked={data?.account.requireEmailVerification || true} onChange={(v) => accountForm.setValue("requireEmailVerification", v)} disabled={readOnlyBusiness} description="User harus verifikasi email sebelum login." />
                        </div>
                        <p className="text-[13px] text-muted-foreground">Perubahan profil/auth sensitif tetap melalui Supabase Auth. Data akun dipisah dari data profil bisnis.</p>
                      </div>
                    </SectionShell>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="tampilan" className="mt-0">
                <Form {...appearanceForm}>
                  <form onSubmit={appearanceForm.handleSubmit((v) => onSave("appearance", v, appearanceForm))}>
                    <SectionShell title="Tampilan" description="Preferensi tampilan aplikasi pada perangkat ini." actions={saveButton("appearance", !appearanceForm.formState.isDirty)}>
                      {readOnlyBusiness ? <p className="text-[13px] text-muted-foreground">Akses baca. Perubahan memerlukan peran yang diizinkan.</p> : null}
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium">Tema</p>
                          <div className="grid grid-cols-3 gap-2 sm:max-w-md mt-2">
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
                          <p className="mt-2 text-[13px] text-muted-foreground">Tema disimpan oleh theme provider aplikasi pada perangkat/browser ini.</p>
                        </div>
                        <div className="rounded-xl border border-border/70 p-4 space-y-3">
                          <FieldGrid>
                            <FormField control={appearanceForm.control} name="primaryColor" render={({ field }) => (
                              <FormItem><FormLabel>Warna utama (Hex)</FormLabel><FormControl><Input type="color" className="h-10 w-full rounded-xl cursor-pointer" disabled={readOnlyBusiness} {...field} /></FormControl><FormDescription>Warna aksen aplikasi (format #RRGGBB).</FormDescription><FormMessage /></FormItem>
                            )} />
                            <FormField control={appearanceForm.control} name="fontFamily" render={({ field }) => (
                              <FormItem><FormLabel>Font family</FormLabel><FormControl><Input placeholder="system / Inter / ..." className="h-10 rounded-xl" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={appearanceForm.control} name="language" render={({ field }) => (
                              <FormItem><FormLabel>Bahasa</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={readOnlyBusiness}><FormControl><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="id">Indonesia</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={appearanceForm.control} name="dateFormat" render={({ field }) => (
                              <FormItem><FormLabel>Format tanggal</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={readOnlyBusiness}><FormControl><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem><SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem><SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={appearanceForm.control} name="timeFormat" render={({ field }) => (
                              <FormItem><FormLabel>Format waktu</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={readOnlyBusiness}><FormControl><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="24h">24 jam</SelectItem><SelectItem value="12h">12 jam</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={appearanceForm.control} name="compactMode" render={({ field }) => (
                              <FormItem className="flex items-center gap-3">
                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnlyBusiness} aria-label="Mode kompak" />
                                <div><p className="text-sm font-medium">Mode kompak</p><p className="text-[13px] text-muted-foreground">Mengurangi padding/spacing UI.</p></div>
                              </FormItem>
                            )} />
                          </FieldGrid>
                        </div>
                      </div>
                    </SectionShell>
                  </form>
                </Form>
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
                      <div className="space-y-3 border-t border-border/60 pt-4">
                        <SwitchRow label="Auto-cancel pesanan belum bayar" checked={data?.operational.autoCancelUnpaidOrders || true} onChange={(v) => operationalForm.setValue("autoCancelUnpaidOrders", v)} disabled={readOnlyBusiness} description="Batalkan otomatis pesanan yang tidak dibayar setelah expiry." />
                        <SwitchRow label="Izinkan split payment" checked={data?.operational.allowSplitPayment || true} onChange={(v) => operationalForm.setValue("allowSplitPayment", v)} disabled={readOnlyBusiness} description="Memungkinkan kombinasi metode pembayaran dalam satu transaksi." />
                      </div>
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
                      <div className="rounded-xl border border-border/70 p-4 space-y-3">
                        <SwitchRow label="Tunai" checked={data?.payment.acceptCash || true} onChange={(v) => paymentForm.setValue("acceptCash", v)} disabled={readOnlyBusiness} description="Terima pembayaran tunai di POS." />
                        <SwitchRow label="Kartu (EDC)" checked={data?.payment.acceptCard || false} onChange={(v) => paymentForm.setValue("acceptCard", v)} disabled={readOnlyBusiness} description="Terima pembayaran kartu via EDC." />
                        <SwitchRow label="QRIS" checked={data?.payment.acceptQris || false} onChange={(v) => paymentForm.setValue("acceptQris", v)} disabled={readOnlyBusiness} description="Terima pembayaran QRIS." />
                        <SwitchRow label="Transfer" checked={data?.payment.acceptTransfer || true} onChange={(v) => paymentForm.setValue("acceptTransfer", v)} disabled={readOnlyBusiness} description="Terima pembayaran transfer bank/e-wallet." />
                      </div>
                      <div className="space-y-3 border-t border-border/60 pt-4">
                        <SwitchRow label="Transfer manual" checked={data?.payment.qrManualTransferEnabled || false} onChange={(v) => paymentForm.setValue("qrManualTransferEnabled", v)} disabled={readOnlyBusiness} description="Aktifkan instruksi transfer manual untuk storefront. Verifikasi tetap staff." />
                        <FieldGrid>
                          <FormField control={paymentForm.control} name="manualTransferBankName" render={({ field }) => (<FormItem><FormLabel>Nama bank/e-wallet</FormLabel><FormControl><Input className="h-10 rounded-xl" placeholder="BCA / Mandiri / ..." disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={paymentForm.control} name="manualTransferAccountName" render={({ field }) => (<FormItem><FormLabel>Nama pemilik</FormLabel><FormControl><Input className="h-10 rounded-xl" placeholder="Nama rekening" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={paymentForm.control} name="manualTransferAccountNumber" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Nomor rekening/tujuan</FormLabel><FormControl><Input className="h-10 rounded-xl font-mono" placeholder="1234567890" disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={paymentForm.control} name="manualTransferInstructions" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Instruksi tambahan</FormLabel><FormControl><Textarea rows={3} className="rounded-xl" placeholder="Contoh: transfer sesuai total, lalu unggah bukti." disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </FieldGrid>
                      </div>
                      <Unavailable title="Payment gateway" description={`Status modul: ${data?.payment.paymentGatewayModuleStatus || "NOT_INSTALLED"}. Integrasi gateway tidak dibuat/diaktifkan otomatis dari halaman ini dan tidak mengubah riwayat transaksi historis.`} />
                    </SectionShell>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="sistem" className="mt-0">
                <Form {...systemForm}>
                  <form onSubmit={systemForm.handleSubmit((v) => onSave("system", v, systemForm))}>
                    <SectionShell title="Sistem" description="Konfigurasi level sistem dan maintenance." actions={saveButton("system", !systemForm.formState.isDirty)}>
                      {readOnlyBusiness ? <p className="text-[13px] text-muted-foreground">Akses baca. Perubahan memerlukan peran yang diizinkan.</p> : null}
                      <div className="rounded-xl border border-border/70 p-4 space-y-3">
                        <FieldGrid>
                          <FormField control={systemForm.control} name="maintenanceMode" render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnlyBusiness} aria-label="Maintenance mode" />
                              <div><p className="text-sm font-medium">Maintenance mode</p><p className="text-[13px] text-muted-foreground">Blokir akses publik kecuali admin.</p></div>
                            </FormItem>
                          )} />
                          <FormField control={systemForm.control} name="debugMode" render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnlyBusiness} aria-label="Debug mode" />
                              <div><p className="text-sm font-medium">Debug mode</p><p className="text-[13px] text-muted-foreground">Tampilkan error detail di client (hanya dev).</p></div>
                            </FormItem>
                          )} />
                          <FormField control={systemForm.control} name="enableApiDocs" render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnlyBusiness} aria-label="Enable API docs" />
                              <div><p className="text-sm font-medium">API docs</p><p className="text-[13px] text-muted-foreground">Ekspos dokumentasi OpenAPI.</p></div>
                            </FormItem>
                          )} />
                          <FormField control={systemForm.control} name="backupEnabled" render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnlyBusiness} aria-label="Backup enabled" />
                              <div><p className="text-sm font-medium">Backup otomatis</p><p className="text-[13px] text-muted-foreground">Aktifkan snapshot terjadwal database.</p></div>
                            </FormItem>
                          )} />
                        </FieldGrid>
                        <FormField control={systemForm.control} name="maintenanceMessage" render={({ field }) => (
                          <FormItem><FormLabel>Pesan maintenance</FormLabel><FormControl><Textarea rows={2} className="rounded-xl" placeholder="Sistem sedang maintenance..." disabled={readOnlyBusiness} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FieldGrid>
                          <FormField control={systemForm.control} name="apiRateLimit" render={({ field }) => (
                            <FormItem><FormLabel>API rate limit (req/menit)</FormLabel><FormControl><Input type="number" min={10} max={10000} step={1} className="h-10 rounded-xl" disabled={readOnlyBusiness} value={field.value} onChange={(e) => field.onChange(e.target.value === "" ? 100 : Math.floor(Number(e.target.value)))} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={systemForm.control} name="backupFrequency" render={({ field }) => (
                            <FormItem><FormLabel>Frekuensi backup</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={readOnlyBusiness}><FormControl><SelectTrigger className="h-10 w-full rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        </FieldGrid>
                      </div>
                      <div className="rounded-xl border border-border/70 px-4 py-1">
                        <InfoRow label="Aplikasi" value="Niraya POS" />
                        <InfoRow label="Framework" value="Next.js 16 / React 19" />
                        <InfoRow label="Auth" value="Supabase Auth" />
                        <InfoRow label="Database" value="Supabase Postgres / Drizzle" />
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
                  </form>
                </Form>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}