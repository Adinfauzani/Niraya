"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRightIcon, ArrowLeftIcon, CheckIcon, Loader2Icon, Building2Icon, StoreIcon, SettingsIcon, CreditCardIcon, BellIcon, UserCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout"

const STEPS = [
  { id: 1, title: "One", icon: Building2Icon, description: "Nama, alamat, kontak, kategori usaha" },
  { id: 2, title: "Two", icon: StoreIcon, description: "Nama toko, kode, alamat outlet" },
  { id: 3, title: "Three", icon: SettingsIcon, description: "Mata uang, pajak, diskon, stok" },
  { id: 4, title: "Four", icon: CreditCardIcon, description: "Metode bayar, transfer manual, QR" },
  { id: 5, title: "Five", icon: BellIcon, description: "Email/SMS/Push, 2FA, retensi data" },
  { id: 6, title: "Six", icon: UserCheckIcon, description: "Claim role Owner & masuk dashboard" },
]

const businessSchema = z.object({
  businessName: z.string().min(2, "Minimal 2 karakter"),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  nib: z.string().optional(),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(10, "Nomor telepon tidak valid"),
  address: z.string().min(5, "Alamat minimal 5 karakter"),
  categoryCode: z.string().optional(),
  customCategory: z.string().optional(),
  logoUrl: z.string().url("Format URL tidak valid").optional().or(z.literal("")),
  description: z.string().optional(),
  website: z.string().url("Format URL tidak valid").optional().or(z.literal("")),
  socialMedia: z.string().optional(),
})

const storeSchema = z.object({
  storeName: z.string().min(2, "Minimal 2 karakter"),
  storeCode: z.string().min(2, "Minimal 2 karakter").max(10, "Maksimal 10 karakter"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  timezone: z.string().default("Asia/Jakarta"),
})

const operationalSchema = z.object({
  currency: z.string().default("IDR"),
  timezone: z.string().default("Asia/Jakarta"),
  taxRate: z.number().min(0).max(100).default(0).transform((val) => val / 100),
  memberDiscountRate: z.number().min(0).max(100).default(0).transform((val) => val / 100),
  lowStockThreshold: z.number().min(0).default(10),
  reservationExpiryMinutes: z.number().min(1).default(30),
  autoCancelUnpaidOrders: z.boolean().default(true),
  allowSplitPayment: z.boolean().default(true),
})

const paymentSchema = z.object({
  acceptCash: z.boolean().default(true),
  acceptCard: z.boolean().default(false),
  acceptQris: z.boolean().default(false),
  acceptTransfer: z.boolean().default(true),
  qrManualTransferEnabled: z.boolean().default(false),
  manualTransferBankName: z.string().optional(),
  manualTransferAccountName: z.string().optional(),
  manualTransferAccountNumber: z.string().optional(),
  manualTransferInstructions: z.string().optional(),
})

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
  marketingSms: z.boolean().default(false),
  marketingPush: z.boolean().default(false),
  dataRetentionDays: z.number().min(1).default(365),
  sessionTimeoutMinutes: z.number().min(1).default(480),
  requireTwoFactor: z.boolean().default(false),
  allowPasswordLogin: z.boolean().default(true),
  allowMagicLink: z.boolean().default(true),
  allowSocialLogin: z.boolean().default(true),
  auditLogEnabled: z.boolean().default(true),
})

const CATEGORIES = [
  { code: "fnb", name: "Makanan & Minuman", description: "Restoran, kafe, warung makan, catering, dll" },
  { code: "retail", name: "Retail & Toko", description: "Minimarket, baju, aksesoris, elektronik, dll" },
  { code: "service", name: "Jasa & Layanan", description: "Salon, bengkel, laundry, konsultan, dll" },
  { code: "health", name: "Kesehatan & Kecantikan", description: "Klinik, apotek, spa, kecantikan, dll" },
  { code: "education", name: "Pendidikan & Pelatihan", description: "Kursus, les privat, sekolah, training, dll" },
  { code: "other", name: "Lainnya", description: "Bidang usaha lain di luar kategori di atas" },
]

export function OnboardingWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [businessId, setBusinessId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCustomCategory, setShowCustomCategory] = useState(false)

  const businessForm = useForm({ resolver: zodResolver(businessSchema), defaultValues: { categoryCode: "fnb" } })
  const storeForm = useForm({ resolver: zodResolver(storeSchema), defaultValues: { timezone: "Asia/Jakarta" } })
  const operationalForm = useForm({ resolver: zodResolver(operationalSchema) })
  const paymentForm = useForm({ resolver: zodResolver(paymentSchema) })
  const notificationForm = useForm({ resolver: zodResolver(notificationSchema) })

  const handleNext = async () => {
    if (currentStep === 1) {
      const valid = await businessForm.trigger()
      if (!valid) return
      const data = businessForm.getValues()
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/onboarding/one", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Gagal menyimpan")
        setBusinessId(json.businessId)
        setCurrentStep(2)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan profil usaha")
      } finally {
        setIsSubmitting(false)
      }
    } else if (currentStep === 2) {
      const valid = await storeForm.trigger()
      if (!valid) return
      const data = { ...storeForm.getValues(), businessId }
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/onboarding/two", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Gagal menyimpan")
        setCurrentStep(3)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan toko")
      } finally {
        setIsSubmitting(false)
      }
    } else if (currentStep === 3) {
      const valid = await operationalForm.trigger()
      if (!valid) return
      const data = { ...operationalForm.getValues(), businessId }
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/onboarding/three", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Gagal menyimpan")
        setCurrentStep(4)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan operasional")
      } finally {
        setIsSubmitting(false)
      }
    } else if (currentStep === 4) {
      const valid = await paymentForm.trigger()
      if (!valid) return
      const data = { ...paymentForm.getValues(), businessId }
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/onboarding/four", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Gagal menyimpan")
        setCurrentStep(5)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan pembayaran")
      } finally {
        setIsSubmitting(false)
      }
    } else if (currentStep === 5) {
      const valid = await notificationForm.trigger()
      if (!valid) return
      const data = { ...notificationForm.getValues(), businessId }
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/onboarding/five", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Gagal menyimpan")
        setCurrentStep(6)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan notifikasi")
      } finally {
        setIsSubmitting(false)
      }
    } else if (currentStep === 6) {
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Gagal menyelesaikan")
        toast.success("Onboarding selesai! Selamat datang sebagai Owner.")
        router.push("/dashboard")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyelesaikan onboarding")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={businessForm.handleSubmit(() => {})} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nama Usaha <span className="text-red-500">*</span></Label>
              <Input id="businessName" placeholder="Contoh: Warung Makan Bu Siti" {...businessForm.register("businessName")} />
              {businessForm.formState.errors.businessName && (
                <p className="text-sm text-red-500">{businessForm.formState.errors.businessName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legalName">Nama Legal (Opsional)</Label>
                <Input id="legalName" placeholder="Nama di akte/legalitas" {...businessForm.register("legalName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">NPWP (Opsional)</Label>
                <Input id="taxId" placeholder="00.000.000.0-000.000" {...businessForm.register("taxId")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nib">NIB (Opsional)</Label>
                <Input id="nib" placeholder="Nomor Induk Berusaha" {...businessForm.register("nib")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryCode">Kategori Usaha (Opsional)</Label>
                <Select value={businessForm.watch("categoryCode")} onValueChange={(v) => { businessForm.setValue("categoryCode", v); setShowCustomCategory(v === "other"); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showCustomCategory && (
              <div className="space-y-2">
                <Label htmlFor="customCategory">Kategori Custom *</Label>
                <Input id="customCategory" placeholder="Tulis kategori usaha Anda" {...businessForm.register("customCategory")} />
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">Email Usaha <span className="text-red-500">*</span></Label>
              <Input id="email" type="email" placeholder="usaha@email.com" {...businessForm.register("email")} />
              {businessForm.formState.errors.email && (
                <p className="text-sm text-red-500">{businessForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon <span className="text-red-500">*</span></Label>
                <Input id="phone" placeholder="0812-3456-7890" {...businessForm.register("phone")} />
                {businessForm.formState.errors.phone && (
                  <p className="text-sm text-red-500">{businessForm.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat Lengkap <span className="text-red-500">*</span></Label>
              <Textarea id="address" placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kecamatan, Kota, Provinsi, Kode Pos" rows={3} {...businessForm.register("address")} />
              {businessForm.formState.errors.address && (
                <p className="text-sm text-red-500">{businessForm.formState.errors.address.message}</p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL (Opsional)</Label>
                <Input id="logoUrl" placeholder="https://example.com/logo.png" {...businessForm.register("logoUrl")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website (Opsional)</Label>
                <Input id="website" placeholder="https://website-anda.com" {...businessForm.register("website")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="socialMedia">Media Sosial (Opsional)</Label>
              <Input id="socialMedia" placeholder="Instagram: @usaha, Facebook: fb.com/usaha" {...businessForm.register("socialMedia")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi Usaha (Opsional)</Label>
              <Textarea id="description" placeholder="Ceritakan singkat tentang usaha Anda..." rows={3} {...businessForm.register("description")} />
            </div>
          </form>
        )

      case 2:
        return (
          <form onSubmit={storeForm.handleSubmit(() => {})} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nama Toko/Outlet <span className="text-red-500">*</span></Label>
              <Input id="storeName" placeholder="Contoh: Cabang Utama / Mall Plaza" {...storeForm.register("storeName")} />
              {storeForm.formState.errors.storeName && (
                <p className="text-sm text-red-500">{storeForm.formState.errors.storeName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeCode">Kode Toko <span className="text-red-500">*</span></Label>
              <Input id="storeCode" placeholder="CT01 / UTAMA / PLZ" maxLength={10} {...storeForm.register("storeCode")} />
              <p className="text-sm text-muted-foreground">Maks 10 karakter, unik per usaha (huruf/angka)</p>
              {storeForm.formState.errors.storeCode && (
                <p className="text-sm text-red-500">{storeForm.formState.errors.storeCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat Toko (Opsional)</Label>
              <Textarea id="address" placeholder="Alamat lengkap toko" rows={2} {...storeForm.register("address")} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon Toko (Opsional)</Label>
                <Input id="phone" placeholder="021-1234567" {...storeForm.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Toko (Opsional)</Label>
                <Input id="email" type="email" placeholder="toko@email.com" {...storeForm.register("email")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Zona Waktu</Label>
              <Select value={storeForm.watch("timezone")} onValueChange={(v) => storeForm.setValue("timezone", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jakarta">WIB (Asia/Jakarta)</SelectItem>
                  <SelectItem value="Asia/Makassar">WITA (Asia/Makassar)</SelectItem>
                  <SelectItem value="Asia/Jayapura">WIT (Asia/Jayapura)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        )

      case 3:
        return (
          <form onSubmit={operationalForm.handleSubmit(() => {})} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mata Uang & Zona Waktu</CardTitle>
                <CardDescription>Default sudah cukup untuk kebanyakan usaha di Indonesia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Mata Uang</Label>
                    <Select value={operationalForm.watch("currency")} onValueChange={(v) => operationalForm.setValue("currency", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IDR">IDR (Rupiah)</SelectItem>
                        <SelectItem value="USD">USD (Dollar AS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Zona Waktu</Label>
                    <Select value={operationalForm.watch("timezone")} onValueChange={(v) => operationalForm.setValue("timezone", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Jakarta">WIB</SelectItem>
                        <SelectItem value="Asia/Makassar">WITA</SelectItem>
                        <SelectItem value="Asia/Jayapura">WIT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pajak & Diskon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="space-y-2">
  <Label htmlFor="taxRate">Pajak Default (%)</Label>
  <Input id="taxRate" type="number" step="0.01" min="0" max="100" {...operationalForm.register("taxRate", { valueAsNumber: true })} placeholder="11" />
  <p className="text-sm text-muted-foreground">Contoh: 11 untuk PPN 11%</p>
</div>
<div className="space-y-2">
  <Label htmlFor="memberDiscountRate">Diskon Member (%)</Label>
  <Input id="memberDiscountRate" type="number" step="0.01" min="0" max="100" {...operationalForm.register("memberDiscountRate", { valueAsNumber: true })} placeholder="0" />
</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stok & Reservasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">Batas Stok Minimal</Label>
                    <Input id="lowStockThreshold" type="number" min="0" {...operationalForm.register("lowStockThreshold", { valueAsNumber: true })} placeholder="10" />
                    <p className="text-sm text-muted-foreground">Notifikasi saat stok ≤ angka ini</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservationExpiryMinutes">Masa Berlaku Reservasi (menit)</Label>
                    <Input id="reservationExpiryMinutes" type="number" min="1" {...operationalForm.register("reservationExpiryMinutes", { valueAsNumber: true })} placeholder="30" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Opsi Lainnya</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Batalkan otomatis order belum bayar</Label>
                    <p className="text-sm text-muted-foreground">Order unpaid akan dibatalkan setelah kadaluarsa</p>
                  </div>
                  <Switch checked={operationalForm.watch("autoCancelUnpaidOrders")} onCheckedChange={(v) => operationalForm.setValue("autoCancelUnpaidOrders", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Izinkan pembayaran split/bagian</Label>
                    <p className="text-sm text-muted-foreground">Pelanggan bisa bayar cash + transfer sekaligus</p>
                  </div>
                  <Switch checked={operationalForm.watch("allowSplitPayment")} onCheckedChange={(v) => operationalForm.setValue("allowSplitPayment", v)} />
                </div>
              </CardContent>
            </Card>
          </form>
        )

      case 4:
        return (
          <form onSubmit={paymentForm.handleSubmit(() => {})} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Metode Pembayaran yang Diterima</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Tunai (Cash)</Label>
                      <p className="text-sm text-muted-foreground">Pembayaran langsung di kasir</p>
                    </div>
                    <Switch checked={paymentForm.watch("acceptCash")} onCheckedChange={(v) => paymentForm.setValue("acceptCash", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Kartu Debit/Kredit</Label>
                      <p className="text-sm text-muted-foreground">Via EDC terminal</p>
                    </div>
                    <Switch checked={paymentForm.watch("acceptCard")} onCheckedChange={(v) => paymentForm.setValue("acceptCard", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>QRIS</Label>
                      <p className="text-sm text-muted-foreground">Scan QR kode pembayaran</p>
                    </div>
                    <Switch checked={paymentForm.watch("acceptQris")} onCheckedChange={(v) => paymentForm.setValue("acceptQris", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Transfer Bank</Label>
                      <p className="text-sm text-muted-foreground">Manual transfer ke rekening</p>
                    </div>
                    <Switch checked={paymentForm.watch("acceptTransfer")} onCheckedChange={(v) => paymentForm.setValue("acceptTransfer", v)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transfer Manual & QR Ordering</CardTitle>
                <CardDescription>Diperlukan jika menerima transfer atau mengaktifkan QR ordering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Aktifkan QR Manual Transfer</Label>
                    <p className="text-sm text-muted-foreground">Tampilkan detail rekening di QR ordering</p>
                  </div>
                  <Switch checked={paymentForm.watch("qrManualTransferEnabled")} onCheckedChange={(v) => paymentForm.setValue("qrManualTransferEnabled", v)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualTransferBankName">Nama Bank</Label>
                  <Input id="manualTransferBankName" placeholder="Bank BCA / BRI / Mandiri" {...paymentForm.register("manualTransferBankName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manualTransferAccountName">Atas Nama</Label>
                  <Input id="manualTransferAccountName" placeholder="Nama pemilik rekening" {...paymentForm.register("manualTransferAccountName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manualTransferAccountNumber">Nomor Rekening</Label>
                  <Input id="manualTransferAccountNumber" placeholder="1234567890" {...paymentForm.register("manualTransferAccountNumber")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manualTransferInstructions">Instruksi Tambahan (Opsional)</Label>
                  <Textarea id="manualTransferInstructions" placeholder="Contoh: Berikan bukti transfer ke kasir / upload di aplikasi" rows={2} {...paymentForm.register("manualTransferInstructions")} />
                </div>
              </CardContent>
            </Card>
          </form>
        )

      case 5:
        return (
          <form onSubmit={notificationForm.handleSubmit(() => {})} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Saluran Notifikasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Email</Label>
                    <Switch checked={notificationForm.watch("emailEnabled")} onCheckedChange={(v) => notificationForm.setValue("emailEnabled", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>SMS</Label>
                    <Switch checked={notificationForm.watch("smsEnabled")} onCheckedChange={(v) => notificationForm.setValue("smsEnabled", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Push</Label>
                    <Switch checked={notificationForm.watch("pushEnabled")} onCheckedChange={(v) => notificationForm.setValue("pushEnabled", v)} />
                  </div>
                </div>
              </CardContent>
            </Card>

<Card>
                <CardHeader>
                  <CardTitle>Jenis Notifikasi</CardTitle>
                  <CardDescription>Pilih saluran untuk setiap jenis event</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Order Baru", email: "orderEmail" as const, sms: "orderSms" as const, push: "orderPush" as const },
                    { label: "Stok Menipis", email: "lowStockEmail" as const, sms: "lowStockSms" as const, push: "lowStockPush" as const },
                    { label: "Pembayaran", email: "paymentEmail" as const, sms: "paymentSms" as const, push: "paymentPush" as const },
                    { label: "Marketing/Promo", email: "marketingEmail" as const, sms: "marketingSms" as const, push: "marketingPush" as const },
                  ].map(({ label, email, sms, push }) => (
                    <div key={label} className="grid grid-cols-4 gap-4 items-center">
                      <Label className="font-medium">{label}</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <Switch checked={notificationForm.watch(email)} onCheckedChange={(v) => notificationForm.setValue(email, v)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">SMS</span>
                        <Switch checked={notificationForm.watch(sms)} onCheckedChange={(v) => notificationForm.setValue(sms, v)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Push</span>
                        <Switch checked={notificationForm.watch(push)} onCheckedChange={(v) => notificationForm.setValue(push, v)} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

            <Card>
              <CardHeader>
                <CardTitle>Keamanan & Privasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataRetentionDays">Retensi Data (hari)</Label>
                    <Input id="dataRetentionDays" type="number" min="1" {...notificationForm.register("dataRetentionDays", { valueAsNumber: true })} placeholder="365" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeoutMinutes">Timeout Session (menit)</Label>
                    <Input id="sessionTimeoutMinutes" type="number" min="1" {...notificationForm.register("sessionTimeoutMinutes", { valueAsNumber: true })} placeholder="480" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Wajib 2FA</Label>
                    <p className="text-sm text-muted-foreground">Two-factor authentication untuk semua user</p>
                  </div>
                  <Switch checked={notificationForm.watch("requireTwoFactor")} onCheckedChange={(v) => notificationForm.setValue("requireTwoFactor", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Izinkan Login Password</Label>
                  </div>
                  <Switch checked={notificationForm.watch("allowPasswordLogin")} onCheckedChange={(v) => notificationForm.setValue("allowPasswordLogin", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Izinkan Magic Link</Label>
                  </div>
                  <Switch checked={notificationForm.watch("allowMagicLink")} onCheckedChange={(v) => notificationForm.setValue("allowMagicLink", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Izinkan Social Login (Google, dll)</Label>
                  </div>
                  <Switch checked={notificationForm.watch("allowSocialLogin")} onCheckedChange={(v) => notificationForm.setValue("allowSocialLogin", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Aktifkan Audit Log</Label>
                    <p className="text-sm text-muted-foreground">Catat semua aktivitas penting</p>
                  </div>
                  <Switch checked={notificationForm.watch("auditLogEnabled")} onCheckedChange={(v) => notificationForm.setValue("auditLogEnabled", v)} />
                </div>
              </CardContent>
            </Card>
          </form>
        )

      case 6:
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <UserCheckIcon className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold">Siap Menjadi Owner!</h3>
              <p className="text-muted-foreground mt-1">Semua pengaturan sudah disiapkan. Klik tombol di bawah untuk claim role Owner dan masuk ke dashboard.</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-3 text-left max-w-md mx-auto">
                  <li className="flex items-center gap-2"><CheckIcon className="w-5 h-5 text-green-600" /> Profil usaha & toko pertama</li>
                  <li className="flex items-center gap-2"><CheckIcon className="w-5 h-5 text-green-600" /> Pengaturan operasional (pajak, diskon, stok)</li>
                  <li className="flex items-center gap-2"><CheckIcon className="w-5 h-5 text-green-600" /> Metode pembayaran & transfer manual</li>
                  <li className="flex items-center gap-2"><CheckIcon className="w-5 h-5 text-green-600" /> Notifikasi & keamanan</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={STEPS.length}>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground text-center">
          Langkah {currentStep} dari {STEPS.length}: {STEPS[currentStep - 1].title}
        </div>
        <Card>
          <CardContent className="pt-6">{renderStep()}</CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        <Button
          onClick={handleNext}
          disabled={isSubmitting}
          className="w-full md:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
              Memproses...
            </>
          ) : currentStep === STEPS.length ? (
            <>
              <UserCheckIcon className="w-4 h-4 mr-2" />
              Selesai & Masuk Dashboard
            </>
          ) : (
            <>
              Lanjutkan
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </OnboardingLayout>
  )
}