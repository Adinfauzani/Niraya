"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2Icon, MailIcon, ArrowLeftIcon } from "lucide-react";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/authClient";

const forgotSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .refine(
      (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Format email tidak valid"
    ),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotValues) => {
    setFormError("");
    setFormSuccess("");
    setIsLoading(true);

    try {
      const { error } = await (authClient as any).requestPasswordReset({
        email: values.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setFormError(error.message || "Gagal mengirim email reset.");
        return;
      }

      setFormSuccess("Email reset kata sandi telah dikirim. Periksa kotak masuk Anda.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="space-y-2 mb-8">
        <Button variant="ghost" size="sm" className="justify-start gap-1" onClick={() => router.push("/login")}>
          <ArrowLeftIcon className="size-4" />
          Kembali ke Masuk
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Lupa Kata Sandi</h1>
        <p className="text-sm text-muted-foreground">
          Masukkan email Anda, kami akan mengirim tautan reset kata sandi.
        </p>
      </div>

      {formError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {formSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
          <AlertDescription>{formSuccess}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <FieldGroup className="gap-5">
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="nama@niraya.id"
                className="pl-10"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </div>
            <FieldError errors={[errors.email]} />
          </Field>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              "Kirim Tautan Reset"
            )}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ingat kata sandi?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}