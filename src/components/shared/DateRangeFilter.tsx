import * as React from "react"
import { format, isValid, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function toDate(value: string): Date | undefined {
  if (!value) return undefined
  const d = parseISO(value)
  return isValid(d) ? d : undefined
}

function toYmd(value: Date | undefined): string {
  return value ? format(value, "yyyy-MM-dd") : ""
}

function formatLabel(from: string, to: string) {
  const fromDate = toDate(from)
  const toDateValue = toDate(to)
  if (!fromDate && !toDateValue) return "Pilih tanggal"
  if (fromDate && toDateValue) {
    return `${format(fromDate, "d MMM yyyy", { locale: localeId })} - ${format(toDateValue, "d MMM yyyy", { locale: localeId })}`
  }
  if (fromDate) return `Mulai ${format(fromDate, "d MMM yyyy", { locale: localeId })}`
  return `Sampai ${format(toDateValue!, "d MMM yyyy", { locale: localeId })}`
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  className,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [today] = React.useState(() => new Date())

  const selected: DateRange | undefined = React.useMemo(() => {
    const f = toDate(from)
    const t = toDate(to)
    if (!f && !t) return undefined
    return { from: f, to: t }
  }, [from, to])

  const handleSelect = (range: DateRange | undefined) => {
    onFromChange(toYmd(range?.from))
    onToChange(toYmd(range?.to))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 min-w-[220px] justify-start gap-2 px-3 text-left font-normal",
            !from && !to && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm">{formatLabel(from, to)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          defaultMonth={selected?.from ?? selected?.to ?? today}
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={localeId}
          className="rounded-lg border-0"
        />
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">Pilih tanggal mulai dan akhir</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              onFromChange("")
              onToChange("")
            }}
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
