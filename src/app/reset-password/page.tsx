"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2Icon, LockKeyholeIcon, EyeIcon, EyeOffIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

const resetSchema = z
  .object({
    password: z.string().min(8, "Kata sandi minimal 8 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const load = async () => {
      const { authClient }: any = await import("@/lib/authClient");
      const token = searchParams.get("token");
      if (!token) {
        setIsValidToken(false);
        setFormError("Tautan reset tidak valid atau sudah kadaluarsa.");
      }
    };
    void load();
  }, [searchParams]);

  const onSubmit = async (values: ResetValues) => {
    if (!isValidToken) return;

    setFormError("");
    setIsLoading(true);

    try {
      const { authClient }: any = await import("@/lib/authClient");
      const token = searchParams.get("token");
      if (!token) {
        setIsValidToken(false);
        setFormError("Tautan reset tidak valid atau sudah kadaluarsa.");
        return;
      }
      const { error } = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });

      if (error) {
        setFormError(error.message || "Gagal memperbarui kata sandi.");
        return;
      }

      setFormSuccess(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 2000);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <Logo size="md" />
        </div>

        <div className="max-w-md space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight">
              Reset Kata Sandi
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Masukkan kata sandi baru Anda di bawah ini.
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

          {!isValidToken ? (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription className="flex items-center gap-2">
                <AlertCircleIcon className="size-4 shrink-0" />
                {formError || "Tautan reset tidak valid atau sudah kadaluarsa."}
              </AlertDescription>
            </Alert>
          ) : formSuccess ? (
            <Alert className="mb-6 bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
              <AlertDescription className="flex items-center gap-2">
                <CheckCircleIcon className="size-4 shrink-0" />
                Kata sandi berhasil diperbarui. Mengalihkan ke halaman masuk...
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Buat Kata Sandi Baru</h1>
                <p className="text-sm text-muted-foreground">
                  Kata sandi baru harus berbeda dari kata sandi sebelumnya.
                </p>
              </div>

              {formError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
                <FieldGroup className="gap-5">
                  <Field data-invalid={!!errors.password}>
                    <FieldLabel htmlFor="password">Kata Sandi Baru</FieldLabel>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="pr-10"
                        aria-invalid={!!errors.password}
                        {...register("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="absolute top-1/2 right-1 -translate-y-1/2"
                        aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </Button>
                    </div>
                    <FieldError errors={[errors.password]} />
                  </Field>

                  <Field data-invalid={!!errors.confirmPassword}>
                    <FieldLabel htmlFor="confirmPassword">Konfirmasi Kata Sandi</FieldLabel>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      aria-invalid={!!errors.confirmPassword}
                      {...register("confirmPassword")}
                    />
                    <FieldError errors={[errors.confirmPassword]} />
                  </Field>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <>
                        <LockKeyholeIcon className="size-4 mr-2" />
                        Simpan Kata Sandi
                      </>
                    )}
                  </Button>
                </FieldGroup>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
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
                Reset Kata Sandi
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
              <h1 className="text-2xl font-semibold tracking-tight">Buat Kata Sandi Baru</h1>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <ResetPasswordClient />;
}