'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Ban,
  Calendar,
  CheckCircle2,
  ChefHat,
  Clock,
  Eye,
  ExternalLink,
  ImageIcon,
  Inbox,
  Loader2,
  PackageCheck,
  QrCode,
  RefreshCw,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/PageHeader'
import { StatTile } from '@/components/shared/StatTile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrders } from '@/hooks/useOrders'
import { mutateBusiness } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  Order,
  OrderItem,
  OrderSource,
  OrderStatus,
} from '@/types/business'

type StatusFilter = OrderStatus | 'all'

type StatusMeta = {
  label: string
  variant: 'secondary' | 'warning' | 'info' | 'success' | 'destructive' | 'outline'
}

type OrderPaymentDetail = {
  id: string
  status: string
  method: string
  amount: number
  proofSubmittedAt: string | null
  referenceNumber: string | null
  verifiedAt: string | null
  verificationNote: string | null
  hasProof: boolean
  expiresAt: string | null
  currency: string
}

type OrderDetail = Order & { payments: OrderPaymentDetail[] }

const STATUS_META: Record<OrderStatus, StatusMeta> = {
  DRAFT: { label: 'Draf', variant: 'secondary' },
  SUBMITTED: { label: 'Baru', variant: 'warning' },
  ACCEPTED: { label: 'Diterima', variant: 'info' },
  PREPARING: { label: 'Diproses', variant: 'info' },
  READY: { label: 'Siap', variant: 'success' },
  COMPLETED: { label: 'Selesai', variant: 'success' },
  CANCELLED: { label: 'Dibatalkan', variant: 'destructive' },
}

const SOURCE_META: Record<OrderSource, { label: string; icon: typeof Store }> = {
  POS: { label: 'POS', icon: UtensilsCrossed },
  STOREFRONT: { label: 'Storefront', icon: Store },
  QR_TABLE: { label: 'QR Meja', icon: QrCode },
  QR_GENERAL: { label: 'QR Umum', icon: QrCode },
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'SUBMITTED', label: 'Baru' },
  { value: 'ACCEPTED', label: 'Diterima' },
  { value: 'PREPARING', label: 'Diproses' },
  { value: 'READY', label: 'Siap' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

const NEXT_ACTIONS: Record<
  OrderStatus,
  { status: OrderStatus; label: string; variant: 'default' | 'outline' | 'destructive' }[]
> = {
  DRAFT: [{ status: 'SUBMITTED', label: 'Kirim', variant: 'default' }],
  SUBMITTED: [
    { status: 'ACCEPTED', label: 'Terima', variant: 'default' },
    { status: 'CANCELLED', label: 'Batalkan', variant: 'destructive' },
  ],
  ACCEPTED: [
    { status: 'PREPARING', label: 'Sedang disiapkan', variant: 'default' },
    { status: 'CANCELLED', label: 'Batalkan', variant: 'destructive' },
  ],
  PREPARING: [
    { status: 'READY', label: 'Siap diambil/diantar', variant: 'default' },
    { status: 'CANCELLED', label: 'Batalkan', variant: 'destructive' },
  ],
  READY: [{ status: 'COMPLETED', label: 'Selesai', variant: 'default' }],
  COMPLETED: [],
  CANCELLED: [],
}

const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: 'Belum bayar',
  PENDING: 'Menunggu bayar',
  PAID: 'Lunas',
  FAILED: 'Gagal',
  EXPIRED: 'Kedaluwarsa',
  PARTIALLY_REFUNDED: 'Refund sebagian',
  REFUNDED: 'Refund',
  AWAITING_VERIFICATION: 'Menunggu verifikasi',
  WAITING_PROOF: 'Menunggu bukti',
  PENDING_VERIFICATION: 'Menunggu verifikasi',
  REJECTED: 'Ditolak',
  COMPLETED: 'Lunas/Terverifikasi',
}

const METHOD_LABEL: Record<string, string> = {
  manual_transfer: 'Transfer manual',
  cash: 'Tunai',
  qris: 'QRIS',
  card: 'Kartu',
}

function paymentLabel(status: string | null | undefined) {
  const key = String(status ?? '').toUpperCase()
  return PAYMENT_LABEL[key] ?? (status || '-')
}

function methodLabel(method: string | null | undefined) {
  const key = String(method ?? '').toLowerCase()
  return METHOD_LABEL[key] ?? (method || '-')
}

export function OrdersPage() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [dateFilter, setDateFilter] = useState<string>(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const { orders, counts, loading, error, refresh } = useOrders(filter, 15000, dateFilter || null)

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error((payload as any)?.error || 'Gagal memuat detail pesanan.')
      }
      setDetail((payload as any)?.order ?? null)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Gagal memuat detail pesanan.')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!detailId) {
      setDetail(null)
      setDetailError(null)
      setDetailLoading(false)
      return
    }
    void loadDetail(detailId)
  }, [detailId, loadDetail])

  const openDetail = useCallback((id: string) => {
    setDetailId(id)
  }, [])

  const changeStatus = useCallback(
    async (order: Order, status: OrderStatus) => {
      setUpdatingId(order.id)
      try {
        await mutateBusiness('order.status', {
          id: order.id,
          status,
          reason: status === 'CANCELLED' ? 'Dibatalkan oleh kasir' : undefined,
        })
        toast.success(`Pesanan #${order.number} → ${STATUS_META[status].label}`)
        await refresh()
        if (detailId === order.id) void loadDetail(order.id)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal memperbarui pesanan.')
      } finally {
        setUpdatingId(null)
      }
    },
    [detailId, loadDetail, refresh],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesanan"
        description="Pesanan masuk dari storefront dan QR. Lihat detail & bukti transfer, terima, proses, lalu tandai selesai."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2 py-1 text-xs sm:text-sm">
              <Calendar className="size-3.5 text-muted-foreground" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-7 bg-transparent border-none px-1 focus:ring-0 outline-none text-sm sm:text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              <RefreshCw className="size-4" />
              Muat ulang
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Pesanan baru"
          value={String(counts?.SUBMITTED ?? 0)}
          icon={Clock}
          tone="warning"
        />
        <StatTile
          label="Diproses"
          value={String((counts?.ACCEPTED ?? 0) + (counts?.PREPARING ?? 0))}
          icon={ChefHat}
          tone="info"
        />
        <StatTile
          label="Siap diambil"
          value={String(counts?.READY ?? 0)}
          icon={PackageCheck}
          tone="success"
        />
        <StatTile
          label="Selesai"
          value={String(counts?.COMPLETED ?? 0)}
          icon={CheckCircle2}
          tone="default"
        />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((option) => {
          const active = filter === option.value
          return (
            <Button
              key={option.value}
              size="sm"
              variant={active ? 'default' : 'outline'}
              className="shrink-0 rounded-full"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          )
        })}
      </div>

      {loading && orders.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Inbox className="size-5" />
            </span>
            <p className="text-sm font-medium">Belum ada pesanan</p>
            <p className="text-xs text-muted-foreground">
              Pesanan dari storefront atau QR akan muncul di sini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              updating={updatingId === order.id}
              onOpenDetail={openDetail}
              onChangeStatus={changeStatus}
            />
          ))}
        </div>
      )}

      <OrderDetailSheet
        orderId={detailId}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        busy={!!(detailId && updatingId === detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        onRetry={() => detailId && void loadDetail(detailId)}
        onChangeStatus={changeStatus}
      />
    </div>
  )
}

function OrderCard({
  order,
  updating,
  onOpenDetail,
  onChangeStatus,
}: {
  order: Order
  updating: boolean
  onOpenDetail: (id: string) => void
  onChangeStatus: (order: Order, status: OrderStatus) => void
}) {
  const status = STATUS_META[order.status]
  const source = SOURCE_META[order.source] ?? SOURCE_META.POS
  const SourceIcon = source.icon
  // Setelah diterima, progres fulfillment ditampilkan di kartu (detail tetap untuk verifikasi/terima-batalkan).
  const cardActions =
    order.status === 'SUBMITTED' || order.status === 'DRAFT' || order.status === 'COMPLETED' || order.status === 'CANCELLED'
      ? []
      : (NEXT_ACTIONS[order.status] ?? []).filter((a) => a.status !== 'CANCELLED')

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tabular-nums">#{order.number}</span>
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant="outline" className="gap-1">
                <SourceIcon className="size-3" />
                {source.label}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {order.customerName}
              {order.customerPhone ? ` · ${order.customerPhone}` : ''}
              {order.tableNumber ? ` · Meja ${order.tableNumber}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(order.grandTotal, order.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        {order.items.length > 0 ? (
          <ul className="space-y-1 rounded-lg bg-muted/40 p-2.5">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="tabular-nums text-muted-foreground">
                    {item.quantity}×
                  </span>{' '}
                  {item.productName}
                  {item.variantName ? (
                    <span className="text-muted-foreground"> ({item.variantName})</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatCurrency(item.subtotal, order.currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {order.notes ? (
          <p className="text-xs text-muted-foreground">Catatan: {order.notes}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                'inline-flex items-center gap-1',
                order.paymentStatus === 'PAID' && 'text-success',
                order.paymentStatus === 'PENDING' && 'text-warning',
              )}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {paymentLabel(order.paymentStatus)}
            </span>
            <span>·</span>
            <span>{order.orderType === 'dine-in' ? 'Dine-in' : 'Takeaway'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {cardActions.map((action) => (
              <Button
                key={action.status}
                size="sm"
                variant={action.variant}
                disabled={updating}
                className="gap-1.5"
                onClick={() => onChangeStatus(order, action.status)}
              >
                {updating ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {action.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => onOpenDetail(order.id)}
            >
              <Eye className="size-3.5" />
              Detail
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium break-words">{value}</span>
    </div>
  )
}

function OrderItemsList({
  items,
  currency,
}: {
  items: OrderItem[]
  currency: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada item.</p>
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="tabular-nums text-muted-foreground">{item.quantity}×</span>{' '}
            {item.productName}
            {item.variantName ? (
              <span className="text-muted-foreground"> ({item.variantName})</span>
            ) : null}
            {item.notes ? (
              <span className="block text-xs text-muted-foreground">Catatan: {item.notes}</span>
            ) : null}
          </span>
          <span className="shrink-0 tabular-nums font-medium">
            {formatCurrency(item.subtotal, currency)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function PaymentProofBlock({
  orderId,
  payment,
}: {
  orderId: string
  payment: OrderPaymentDetail
}) {
  const proofUrl = `/api/orders/${encodeURIComponent(orderId)}/proof?paymentId=${encodeURIComponent(payment.id)}`
  const statusKey = String(payment.status ?? '').toUpperCase()
  const statusVariant: 'success' | 'warning' | 'destructive' | 'secondary' =
    statusKey === 'COMPLETED' || statusKey === 'PAID'
      ? 'success'
      : statusKey === 'REJECTED' || statusKey === 'FAILED' || statusKey === 'EXPIRED'
        ? 'destructive'
        : statusKey === 'AWAITING_VERIFICATION' || statusKey === 'PENDING' || statusKey === 'PENDING_VERIFICATION' || statusKey === 'WAITING_PROOF'
          ? 'warning'
          : 'secondary'

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{methodLabel(payment.method)}</span>
          <Badge variant={statusVariant}>{paymentLabel(payment.status)}</Badge>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(payment.amount, payment.currency)}
        </span>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {payment.referenceNumber ? <p>Referensi: <span className="font-medium text-foreground">{payment.referenceNumber}</span></p> : null}
        {payment.proofSubmittedAt ? <p>Bukti diunggah: {formatDateTime(payment.proofSubmittedAt)}</p> : null}
        {payment.verifiedAt ? <p>Diverifikasi: {formatDateTime(payment.verifiedAt)}</p> : null}
        {payment.verificationNote ? <p>Catatan verifikasi: {payment.verificationNote}</p> : null}
      </div>
      {payment.hasProof ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofUrl}
              alt="Bukti transfer"
              className="max-h-80 w-full object-contain"
              loading="lazy"
            />
          </div>
          <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" />
            Buka bukti transfer
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
          <ImageIcon className="size-4 shrink-0" />
          <span>Belum ada bukti transfer diunggah.</span>
        </div>
      )}
    </div>
  )
}

function OrderDetailSheet({
  orderId,
  detail,
  loading,
  error,
  busy,
  onOpenChange,
  onRetry,
  onChangeStatus,
}: {
  orderId: string | null
  detail: OrderDetail | null
  loading: boolean
  error: string | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onRetry: () => void
  onChangeStatus: (order: Order, status: OrderStatus) => void
}) {
  const open = !!orderId
  const status = detail ? (STATUS_META[detail.status] ?? STATUS_META.SUBMITTED) : null
  const source = detail ? (SOURCE_META[detail.source] ?? SOURCE_META.POS) : null
  const SourceIcon = source?.icon ?? Store
  const actions = detail ? (NEXT_ACTIONS[detail.status] ?? []) : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pr-10">
          <SheetTitle>Detail pesanan</SheetTitle>
          <SheetDescription>
            Verifikasi data dan bukti transfer. Pesanan baru: terima atau batalkan di sini; setelah diterima, lanjutkan proses dari kartu pesanan.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-4 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Memuat detail pesanan...
            </div>
          ) : error ? (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Coba lagi
              </Button>
            </div>
          ) : detail ? (
            <>
              <div className="space-y-3 rounded-xl border border-border/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold tabular-nums">#{detail.number}</span>
                  {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
                  <Badge variant="outline" className="gap-1">
                    <SourceIcon className="size-3" />
                    {source?.label ?? detail.source}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <DetailRow label="Pelanggan" value={detail.customerName || '-'} />
                  <DetailRow label="No. telepon" value={detail.customerPhone || '-'} />
                  <DetailRow label="Tipe pesanan" value={detail.orderType === 'dine-in' ? 'Dine-in' : detail.orderType === 'takeaway' ? 'Takeaway' : detail.orderType} />
                  <DetailRow label="No. meja" value={detail.tableNumber || '-'} />
                  <DetailRow label="Status bayar" value={paymentLabel(detail.paymentStatus)} />
                  <DetailRow label="Metode bayar" value={methodLabel(detail.paymentMethod)} />
                  <DetailRow label="Dibuat" value={formatDateTime(detail.createdAt)} />
                  <DetailRow label="Diperbarui" value={formatDateTime(detail.updatedAt)} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Item pesanan</h3>
                <div className="rounded-xl border border-border/70 p-4">
                  <OrderItemsList items={detail.items} currency={detail.currency} />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 p-4">
                <h3 className="text-sm font-semibold">Ringkasan</h3>
                <div className="space-y-2">
                  <DetailRow label="Subtotal" value={formatCurrency(detail.subtotal, detail.currency)} />
                  {detail.discountTotal > 0 ? <DetailRow label="Diskon" value={`- ${formatCurrency(detail.discountTotal, detail.currency)}`} /> : null}
                  <DetailRow label="Pajak" value={formatCurrency(detail.taxTotal, detail.currency)} />
                  <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(detail.grandTotal, detail.currency)}</span>
                  </div>
                  {detail.amountPaid != null ? <DetailRow label="Dibayar" value={formatCurrency(detail.amountPaid, detail.currency)} /> : null}
                </div>
              </div>

              {detail.notes ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Catatan</h3>
                  <p className="rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">{detail.notes}</p>
                </div>
              ) : null}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Pembayaran & bukti transfer</h3>
                {detail.payments && detail.payments.length > 0 ? (
                  <div className="space-y-3">
                    {detail.payments.map((p) => (
                      <PaymentProofBlock key={p.id} orderId={detail.id} payment={p} />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    <ImageIcon className="size-4 shrink-0" />
                    <span>Belum ada data pembayaran/bukti transfer untuk pesanan ini.</span>
                  </div>
                )}
              </div>

              {actions.length > 0 ? (
                <div className="space-y-2 border-t border-border/60 pt-4">
                  <h3 className="text-sm font-semibold">Tindakan</h3>
                  <p className="text-xs text-muted-foreground">Verifikasi data dan bukti pembayaran di atas sebelum mengambil tindakan.</p>
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <Button
                        key={action.status}
                        size="sm"
                        variant={action.variant}
                        disabled={busy}
                        onClick={() => onChangeStatus(detail, action.status)}
                      >
                        {busy ? <Loader2 className="size-3.5 animate-spin" /> : action.status === 'CANCELLED' ? <Ban className="size-3.5" /> : null}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}