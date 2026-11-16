"use client"

import * as React from "react"
import { id as localeId } from "date-fns/locale"
import { CalendarDays, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function NavbarCalendar() {
  const [date, setDate] = React.useState<Date | undefined>(() => new Date())
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Buka kalender" title="Kalender">
          <CalendarDays className="size-5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(value) => {
            setDate(value)
          }}
          locale={localeId}
          defaultMonth={date}
          className="rounded-lg border-0"
        />
      </PopoverContent>
    </Popover>
  )
}

export function AppHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className={collapsed ? "md:hidden" : undefined}
        onClick={() => onToggle(!collapsed)}
        aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
        title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-5" />
        ) : (
          <PanelLeftClose className="size-5" />
        )}
      </Button>
      <div className="flex min-w-0 items-center">
        <AppBreadcrumb />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <NavbarCalendar />
        <ThemeToggle />
      </div>
    </header>
  )
}
