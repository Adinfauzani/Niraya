"use client";

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Logo } from "@/components/ui/logo";

function ForgotPasswordClient() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <Logo size="md" />
        </div>

        <div className="max-w-md space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight">
              Lupa kata sandi?
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Masukkan email akun Anda, kami akan mengirim tautan untuk
              mereset kata sandi.
            </p>
          </div>
        </div>

        <p className="max-w-sm text-xs leading-relaxed text-sidebar-foreground/50">
          Niraya POS oleh Rynex.
        </p>
      </aside>

      <main className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size="sm" />
          </div>

          <ForgotPasswordForm />
        </div>
      </main>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar p-10 text-sidebar-foreground lg:flex">
          <div className="flex items-center gap-3">
            <Logo size="md" />
          </div>
          <div className="max-w-md space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl leading-tight font-semibold tracking-tight">
                Lupa kata sandi?
              </h1>
              <p className="text-sm leading-relaxed text-sidebar-foreground/70">
                Memuat...
              </p>
            </div>
          </div>
        </aside>
        <main className="relative flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            <div className="space-y-2 mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">Lupa kata sandi?</h1>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <ForgotPasswordClient />;
}