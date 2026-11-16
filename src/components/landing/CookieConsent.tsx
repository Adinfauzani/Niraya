"use client"

import { Cookie, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

type Prefs = {
  essential: true
  analytics: boolean
  preferences: boolean
  marketing: boolean
}

const ESSENTIAL_ONLY: Prefs = {
  essential: true,
  analytics: false,
  preferences: false,
  marketing: false,
}

const OPTIONAL_PREFS = [
  {
    key: "analytics" as const,
    title: "Analytics",
    desc: "Mengumpulkan data anonim untuk memahami penggunaan situs.",
  },
  {
    key: "preferences" as const,
    title: "Preferences",
    desc: "Mengingat tema, bahasa, dan pengaturan pengguna.",
  },
  {
    key: "marketing" as const,
    title: "Marketing",
    desc: "Menampilkan konten relevan berdasarkan minat.",
  },
]

export function CookieConsent() {
  const [accepted, setAccepted] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(ESSENTIAL_ONLY)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cookie-accepted")
      if (stored) {
        const raw = localStorage.getItem("cookie-prefs")
        if (raw) setPrefs({ ...ESSENTIAL_ONLY, ...JSON.parse(raw) })
        return
      }
    } catch {
      /* ignore */
    }
    setAccepted(false)
  }, [])

  const persist = (next: Prefs, message: string, tone: "success" | "info") => {
    try {
      localStorage.setItem("cookie-accepted", "true")
      localStorage.setItem("cookie-prefs", JSON.stringify(next))
    } catch {
      /* ignore */
    }
    setPrefs(next)
    setAccepted(true)
    setShowSettings(false)
    if (tone === "success") toast.success(message)
    else toast.info(message)
  }

  const toggle = (key: keyof Prefs) => {
    if (key === "essential") return
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (accepted) return null

  return (
    <>
      <div
        role="dialog"
        aria-label="Persetujuan cookie"
        className="fixed bottom-20 left-1/2 z-50 w-[92%] max-w-4xl -translate-x-1/2 animate-in slide-in-from-bottom-2 lg:bottom-6"
      >
        <div className="flex w-full flex-col gap-3 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:rounded-full">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4 sm:overflow-hidden sm:pl-1">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-foreground sm:size-11">
              <Cookie className="size-5" aria-hidden="true" />
            </span>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:line-clamp-none sm:text-sm">
              Kami menggunakan cookie untuk meningkatkan pengalaman menjelajah,
              menyesuaikan konten, dan menganalisis lalu lintas.
            </p>
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:gap-3 sm:pr-1">
            <button
              type="button"
              aria-label="Pengaturan cookie"
              onClick={() => setShowSettings(true)}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-10"
            >
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                />
              </svg>
            </button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => persist(ESSENTIAL_ONLY, "Hanya cookie esensial", "info")}
              className="h-9 flex-1 rounded-full px-4 text-sm sm:flex-none"
            >
              Tolak
            </Button>
            <Button
              type="button"
              onClick={() => persist(prefs, "Preferensi cookie disimpan", "success")}
              className="h-9 flex-1 rounded-full px-5 text-sm sm:flex-none"
            >
              Terima
            </Button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed bottom-36 left-1/2 z-50 w-[92%] max-w-4xl -translate-x-1/2 animate-in slide-in-from-bottom-2 lg:bottom-20">
          <Card className="w-full overflow-hidden rounded-2xl shadow-xl">
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Pengaturan cookie</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(false)}
                  aria-label="Tutup"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-accent/60 px-2 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Essential</p>
                    <p className="text-xs text-muted-foreground">
                      Diperlukan untuk fungsi dasar situs (autentikasi,
                      keamanan, preferensi).
                    </p>
                  </div>
                  <Switch checked disabled aria-label="Essential" />
                </div>

                {OPTIONAL_PREFS.map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between rounded-xl bg-accent/60 px-2 py-2"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={prefs[item.key]}
                      onCheckedChange={() => toggle(item.key)}
                      aria-label={item.title}
                    />
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2 border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  className="h-8 flex-1 rounded-md"
                >
                  Kembali
                </Button>
                <Button
                  size="sm"
                  onClick={() => persist(prefs, "Preferensi cookie disimpan", "success")}
                  className="h-8 flex-1 rounded-md"
                >
                  Simpan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}