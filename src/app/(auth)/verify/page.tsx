"use client"

import Link from "next/link"
import { MailIcon, Loader2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { supabaseClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function CheckEmailPage() {
  const [email, setEmail] = useState("")
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("pending_email")
    if (stored) setEmail(stored)
  }, [])

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResending(false)
    if (error) {
      alert("Gagal kirim ulang: " + error.message)
    } else {
      alert("Email verifikasi dikirim ulang. Cek inbox Anda.")
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center space-y-6">
        <MailIcon className="mx-auto size-16 text-muted-foreground" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Cek email Anda</h1>
          <p className="text-muted-foreground">
            Kami telah mengirim link verifikasi ke <strong>{email || "email Anda"}</strong>
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 text-left space-y-4">
          <p className="text-sm">
            Buka inbox email Anda dan klik tautan verifikasi untuk mengaktifkan akun.
          </p>
          <p className="text-sm text-muted-foreground">
            Tidak menemukan email? Cek folder <strong>Spam/Junk</strong> atau tunggu beberapa menit.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={resending || !email}
            className={cn("w-full", !email && "opacity-50 cursor-not-allowed")}
          >
            {resending ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Mengirim ulang...
              </>
            ) : (
              "Kirim ulang email verifikasi"
            )}
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Sudah verifikasi? Masuk di sini</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}