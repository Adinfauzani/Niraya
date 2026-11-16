'use client'

import { useCallback, useState } from 'react'
import {
  Ban,
  CheckCircle2,
  ChefHat,
  Clock,
  Inbox,
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
import { Skeleton } from '@/components/ui/skeleton'
import { useOrders } from '@/hooks/useOrders'
import { mutateBusiness } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  Order,
  OrderSource,
  OrderStatus,
} from '@/types/business'

type StatusFilter = OrderStatus | 'all'

type StatusMeta = {
  label: string
  variant: 'secondary' | 'warning' | 'info' | 'success' | 'destructive' | 'outline'
}

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
    { status: 'PREPARING', label: 'Mulai Proses', variant: 'default' },
    { status: 'CANCELLED', label: 'Batalkan', variant: 'destructive' },
  ],
  PREPARING: [
    { status: 'READY', label: 'Siap Diambil', variant: 'default' },
    { status: 'CANCELLED', label: 'Batalkan', variant: 'destructive' },
  ],
  READY: [{ status: 'COMPLETED', label: 'Selesai', variant: 'default' }],
  COMPLETED: [],
  CANCELLED: [],
}

export function OrdersPage() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { orders, counts, loading, error, refresh } = useOrders(filter)

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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal memperbarui pesanan.')
      } finally {
        setUpdatingId(null)
      }
    },
    [refresh],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesanan"
        description="Pesanan masuk dari storefront dan QR. Terima, proses, lalu tandai selesai."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="size-4" />
            Muat ulang
          </Button>
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
              busy={updatingId === order.id}
              onChangeStatus={changeStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({
  order,
  busy,
  onChangeStatus,
}: {
  order: Order
  busy: boolean
  onChangeStatus: (order: Order, status: OrderStatus) => void
}) {
  const status = STATUS_META[order.status]
  const source = SOURCE_META[order.source] ?? SOURCE_META.POS
  const SourceIcon = source.icon
  const actions = NEXT_ACTIONS[order.status] ?? []

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
              {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
            </span>
            <span>·</span>
            <span>{order.orderType === 'dine-in' ? 'Dine-in' : 'Takeaway'}</span>
          </div>

          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.status}
                  size="sm"
                  variant={action.variant}
                  disabled={busy}
                  onClick={() => onChangeStatus(order, action.status)}
                >
                  {action.status === 'CANCELLED' ? (
                    <Ban className="size-3.5" />
                  ) : null}
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: 'Belum bayar',
  PENDING: 'Menunggu bayar',
  PAID: 'Lunas',
  FAILED: 'Gagal',
  EXPIRED: 'Kedaluwarsa',
  PARTIALLY_REFUNDED: 'Refund sebagian',
  REFUNDED: 'Refund',
}